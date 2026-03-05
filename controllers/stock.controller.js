import mongoose from "mongoose";
import { Stock } from "../models/stock.model.js";

export const createStock = async (req, res) => {
  const session = await mongoose.startSession();

  session.startTransaction();
  console.log("📦 [createStock] Transaction started");
  console.log(req.body)
  try {
    const userId  = req.userId;
    const payload = req.body;
    console.log("📨 [createStock] Payload received:", JSON.stringify(payload, null, 2));

    const rawItems = payload.purchases ?? payload.items;

    if (!rawItems?.length) {
      console.warn("⚠️ [createStock] No stock items in payload — aborting");
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "No stock items provided" });
    }

    console.log(`📋 [createStock] ${rawItems.length} raw item(s) received`);

    const savedItems   = [];
    const updatedItems = [];
    const skippedItems = [];

    // ── Step 1: validate & group by HSCode + companyName + branchId ──────────
    console.log("🔍 [createStock] Step 1: Validating and grouping items...");
    const groupedStocks = {};

    for (const item of rawItems) {
      if (!item.HSCode) {
        console.warn(`⚠️ Skipping "${item.itemDescription}" — missing HSCode`);
        skippedItems.push({ itemDescription: item.itemDescription, reason: "Missing HSCode" });
        continue;
      }
      if (!item.companyName) {
        console.warn(`⚠️ Skipping "${item.itemDescription}" — missing companyName`);
        skippedItems.push({ itemDescription: item.itemDescription, HSCode: item.HSCode, reason: "Missing companyName" });
        continue;
      }
      if (!item.branchId) {
        console.warn(`⚠️ Skipping "${item.itemDescription}" — missing branchId`);
        skippedItems.push({ itemDescription: item.itemDescription, HSCode: item.HSCode, companyName: item.companyName, reason: "Missing branchId" });
        continue;
      }

      const groupKey = `${item.HSCode}_${item.companyName}_${item.branchId}`;
      console.log(`🗂️  Item "${item.itemDescription}" → group: ${groupKey}`);

      if (!groupedStocks[groupKey]) {
        groupedStocks[groupKey] = {
          HSCode:      item.HSCode,
          companyName: item.companyName,
          branchId:    item.branchId,
          items:       [],
        };
      }

      groupedStocks[groupKey].items.push({
        itemDescription: item.itemDescription,
        location:        item.location,
        quantity:        item.quantity ?? 0,
        minStockLevel:   item.minStockLevel ?? 0,
        fbr:             item.fbr ?? {}
      });
    }

    const groupKeys = Object.keys(groupedStocks);
    console.log(`📊 ${groupKeys.length} group(s): ${groupKeys.join(", ")}`);
    console.log(`🚫 ${skippedItems.length} item(s) skipped in validation`);

    // ── Step 2: process each group ───────────────────────────────────────────
    console.log("⚙️  Step 2: Processing groups...");

    for (const groupKey in groupedStocks) {
      const stockData = groupedStocks[groupKey];
      console.log(`\n🔄 Processing group: ${groupKey} (${stockData.items.length} item(s))`);

      const existingStock = await Stock.findOne(
        { userId, HSCode: stockData.HSCode, companyName: stockData.companyName, branchId: stockData.branchId },
        null,
        { session }
      );

      // ── 2a. Stock document exists ──────────────────────────────────────────
      if (existingStock) {
        console.log(`✅ Existing stock found: ${existingStock._id}`);

        let stockWasModified = false;
        let newItemCount     = 0;
        let repurchaseCount  = 0;

        try {
          for (const incomingItem of stockData.items) {
            console.log(`   🔎 Checking item "${incomingItem.itemDescription}"`);

            // Match on itemDescription only — location ignored
            const existingItemIndex = existingStock.items.findIndex(
              (ei) => ei.itemDescription === incomingItem.itemDescription
            );

            if (existingItemIndex === -1) {
              // New item — push it
              console.log(`   ➕ New item — pushing to stock`);
              existingStock.items.push({
                itemDescription: incomingItem.itemDescription,
                location:        incomingItem.location,
                quantity:        incomingItem.quantity,
                minStockLevel:   incomingItem.minStockLevel,
              });
              newItemCount++;
            } else {
              // Same item — just increment quantity
              const oldQty = existingStock.items[existingItemIndex].quantity;
              const newQty = oldQty + incomingItem.quantity;
              console.log(`   🔁 Existing item — qty: ${oldQty} → ${newQty}`);
              existingStock.items[existingItemIndex].quantity = newQty;
              repurchaseCount++;
            }

            stockWasModified = true;
          }

          if (stockWasModified) {
            const updated = await existingStock.save({ session });
            console.log(`💿 Stock updated: ${updated._id} | new: ${newItemCount} updated: ${repurchaseCount}`);
            updatedItems.push({
              stockId:      updated._id,
              HSCode:       stockData.HSCode,
              companyName:  stockData.companyName,
              branchId:     stockData.branchId,
              newItemsAdded:   newItemCount,
              updatedItems:    repurchaseCount,
            });
          }
        } catch (updateError) {
          console.error(`❌ Failed to update group ${groupKey}:`, updateError.message);
          for (const item of stockData.items) {
            skippedItems.push({
              HSCode:          stockData.HSCode,
              companyName:     stockData.companyName,
              branchId:        stockData.branchId,
              itemDescription: item.itemDescription,
              reason:          updateError.message,
            });
          }
        }

        continue;
      }

      // ── 2b. New stock document ─────────────────────────────────────────────
      console.log(`🆕 No existing stock — creating new document for group: ${groupKey}`);

      try {
        const stock = new Stock({
          userId,
          HSCode:       stockData.HSCode,
          companyName:  stockData.companyName,
          branchId:     stockData.branchId,
          branchExists: true,
          items: stockData.items.map((item) => ({
            itemDescription: item.itemDescription,
            location:        item.location,
            quantity:        item.quantity,
            minStockLevel:   item.minStockLevel,
            fbr:             item.fbr ?? {}
          })),
        });

        const savedStock = await stock.save({ session });
        console.log(`✅ New stock document saved: ${savedStock._id}`);

        savedItems.push(savedStock);
      } catch (saveError) {
        console.error(`❌ Failed to create new stock for group ${groupKey}:`, saveError.message);
        for (const item of stockData.items) {
          skippedItems.push({
            HSCode:          stockData.HSCode,
            companyName:     stockData.companyName,
            itemDescription: item.itemDescription,
            branchId:        stockData.branchId,
            reason:          saveError.message,
          });
        }
      }
    }

    // ── Step 3: commit or abort ──────────────────────────────────────────────
    console.log(`\n📊 Summary — saved: ${savedItems.length} | updated: ${updatedItems.length} | skipped: ${skippedItems.length}`);

    if (savedItems.length === 0 && updatedItems.length === 0) {
      console.error("❌ Nothing saved — aborting transaction");
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: "No stock records were saved. All items had errors.",
        skippedItems,
      });
    }

    await session.commitTransaction();
    session.endSession();
    console.log("✅ Transaction committed successfully");

    return res.status(201).json({
      message: `Stock saved. ${savedItems.length} new record(s). ${updatedItems.length} updated record(s).`,
      count:   savedItems.length,
      data:    savedItems,
      updated: updatedItems.length > 0 ? updatedItems : undefined,
      skippedItems: skippedItems.length > 0 ? skippedItems : undefined,
    });

  } catch (error) {
    console.error("💥 Unhandled error — rolling back:", error.message);
    console.error(error.stack);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      message: "Failed to create stock",
      error: error.message,
    });
  }
};

//Get User Stock
export const getUserStock = async (req, res) => {
  try {
    const userId = req.userId;

    const stock = await Stock.find({ userId })
      .populate({
        path: "branchId",
        select: "name"
      })
      .lean();

    const flattenedData = [];

    stock.forEach(stockRecord => {
      stockRecord.items.forEach(item => {
        flattenedData.push({
          _id: stockRecord._id,
          userId: stockRecord.userId,
          HSCode: stockRecord.HSCode,
          companyName: stockRecord.companyName,

          branchId: stockRecord.branchId?._id,
          branchName: stockRecord.branchId?.name ?? null,

          branchExists: stockRecord.branchExists,
          itemDescription: item.itemDescription,
          location: item.location,
          quantity: item.quantity,
          minStockLevel: item.minStockLevel,
          createdAt: stockRecord.createdAt,
          updatedAt: stockRecord.updatedAt,
          fbr: item.fbr
        });
      });
    });

    res.status(200).json({
      count: flattenedData.length,
      data: flattenedData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update stock quantity
export const updateStock = async (req, res) => {
  try {
    const { id, hscode, itemDescription, quantity } = req.body;
    const userId = req.userId;


    // Validate required fields
    if (!hscode || !itemDescription) {
      return res.status(400).json({
        message: "hscode and itemDescription are required"
      });
    }

    // Quantity must be provided
    if (quantity === undefined) {
      return res.status(400).json({
        message: "quantity must be provided"
      });
    }

    // Build the update object
    const updateFields = {};
    if (typeof quantity === "number") {
      updateFields["items.$.quantity"] = quantity;
    }


    // Find and update the specific item in the items array
    const query = id
      ? { _id: id, "items.itemDescription": itemDescription }
      : { userId, HSCode: hscode, "items.itemDescription": itemDescription };


    const updated = await Stock.findOneAndUpdate(
      query,
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Stock not found with matching criteria and itemDescription"
      });
    }



    res.status(200).json({
      message: "Stock updated successfully",
      data: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete stock by hscode and amount
export const deleteStock = async (req, res) => {
  try {
    const { hscode, itemDescription } = req.body;
    const userId = req.userId;



    if (!hscode || !itemDescription) {


      return res.status(400).json({
        message: "HSCode and itemDescription are required"
      });
    }


    // Find the stock first to check if it exists and how many items it has
    const stock = await Stock.findOne({
      userId,
      HSCode: hscode,
      "items.itemDescription": itemDescription
    });

    if (!stock) {


      return res.status(404).json({
        message: "Stock item not found with matching HSCode and itemDescription"
      });
    }



    // If this is the last item, delete the entire stock document
    if (stock.items.length === 1) {


      await Stock.findByIdAndDelete(stock._id);


      return res.status(200).json({
        message: "Stock item deleted. Stock record removed as it was the last item.",
        deletedFullRecord: true
      });
    }

    // If multiple items exist, just remove the specific item


    // FIXED: Use the specific stock document's _id to ensure we update the correct one
    const updated = await Stock.findByIdAndUpdate(
      stock._id,  // Use the exact document ID we found
      {
        $pull: {
          items: { itemDescription: itemDescription }
        }
      },
      { new: true }
    );

    if (!updated) {


      return res.status(404).json({
        message: "Failed to delete stock item"
      });
    }

    res.status(200).json({
      message: "Stock item deleted successfully",
      deletedFullRecord: false,
      remainingItems: updated.items.length,
      data: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};