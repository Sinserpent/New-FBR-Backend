import { Stock } from "../models/stock.model.js";
import { Purchase } from "../models/purchase.model.js";

import mongoose from "mongoose";
import counterModel from "../models/counter.model.js";

//const extractPurchaseFields = (item, vendorName) => ({
//  invoiceNumber: item.invoiceNumber ?? "Auto-generated",
//  sellerName: item.sellerName ?? "",
//  NTN_CNIC: item.NTN_CNIC ?? "",
//  businessAddress: item.businessAddress ?? "",
//  purchaseStatus: item.purchaseStatus ?? "completed",
//  purchaseMethod: item.purchaseMethod ?? "cash",
//  purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : new Date(),
//  rate: item.rate ?? 0,
//  quantity: item.quantity ?? 0,
//  amount: item.amount ?? 0,
//  gstRate: item.gstRate ?? 0,
//  gstAmount: item.gstAmount ?? 0,
//  discount: item.discount ?? 0,
//  netAmount: item.netAmount ?? 0,
//  amountPaid: item.amountPaid ?? 0,
//  remainingAmount: item.remainingAmount ?? 0,
//  paymentStatus: item.paymentStatus ?? "Fully Paid",
//  vendorName: vendorName ?? "",
//});

//const createPurchaseAndSnapshot = async ({
//  userId,
//  stockId,
//  branchId,
//  companyName,
//  HSCode,
//  itemDescription,
//  location,
//  purchaseFields,
//}) => {
//  const purchase = new Purchase({
//    userId,
//    stockId,
//    branchId,
//    companyName,
//    HSCode,
//    itemDescription,
//    location,
//    ...purchaseFields, 
//  });

//  const savedPurchase = await purchase.save();

//  // Snapshot embedded in stock item — strip vendorName, it's not needed there
//  const { vendorName: _stripped, ...snapshotFields } = purchaseFields;

//  return {
//    purchaseId: savedPurchase._id,
//    ...snapshotFields,
//  };
//};


export const extractPurchaseFields = (item, purchaseInvoiceNumber) => ({
  invoiceNumber: purchaseInvoiceNumber,   // always use the generated one
  sellerName: item.sellerName ?? "",
  NTN_CNIC: item.NTN_CNIC ?? "",
  businessAddress: item.businessAddress ?? "",
  purchaseStatus: item.purchaseStatus ?? "completed",
  purchaseMethod: item.purchaseMethod ?? "cash",
  purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : new Date(),
  rate: item.rate ?? 0,
  quantity: item.quantity ?? 0,
  amount: item.amount ?? 0,
  gstRate: item.gstRate ?? 0,
  gstAmount: item.gstAmount ?? 0,
  discount: item.discount ?? 0,
  netAmount: item.netAmount ?? 0,
  amountPaid: item.amountPaid ?? 0,
  remainingAmount: item.remainingAmount ?? 0,
  paymentStatus: item.paymentStatus ?? "Fully Paid",
  // items array: carry forward line-item breakdown if provided by client
  vendorName: item.vendorName ?? "",
  items: Array.isArray(item.items) ? item.items : [],
});

// ── createPurchaseAndSnapshot ─────────────────────────────────────────────────
// ✅ FIX 2: `session` is now accepted and passed to purchase.save({ session })
//    so this write participates in the MongoDB transaction and rolls back
//    correctly if anything fails later
export const createPurchaseAndSnapshot = async ({
  userId,
  stockId,
  branchId,
  companyName,
  HSCode,
  itemDescription,
  location,
  purchaseFields,
  session,              // ✅ was previously ignored
}) => {
  const purchase = new Purchase({
    userId,
    stockId,
    branchId,
    companyName,
    HSCode,
    itemDescription,
    location,
    ...purchaseFields,
  });

  const savedPurchase = await purchase.save({ session }); // ✅ now transactional

  // Snapshot embedded in stock item — strip `items` array, not needed there
  const { items: _stripped, ...snapshotFields } = purchaseFields;

  return {
    purchaseId: savedPurchase._id,
    ...snapshotFields,
  };
};
export const createStock = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  console.log("📦 [createStock] Transaction started");

  try {
    const userId = req.userId;
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

    // ── Generate purchase invoice number (inside transaction) ────────────────
    const purchaseCounter = await counterModel.findOneAndUpdate(
      { userId, type: "purchase" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session }
    );
    const purchaseInvoiceNumber = `PO-${String(purchaseCounter.seq).padStart(5, "0")}`;
    console.log(`🔢 [createStock] Invoice number generated: ${purchaseInvoiceNumber}`);

    const savedItems = [];
    const updatedItems = [];
    const skippedItems = [];

    // ── Step 1: validate & group ─────────────────────────────────────────────
    console.log("🔍 [createStock] Step 1: Validating and grouping items...");
    const groupedStocks = {};

    for (const item of rawItems) {
      if (!item.HSCode) {
        console.warn(`⚠️ [createStock] Skipping item "${item.itemDescription}" — missing HSCode`);
        skippedItems.push({ itemDescription: item.itemDescription, reason: "Missing HSCode" });
        continue;
      }
      if (!item.companyName) {
        console.warn(`⚠️ [createStock] Skipping item "${item.itemDescription}" (HSCode: ${item.HSCode}) — missing companyName`);
        skippedItems.push({ itemDescription: item.itemDescription, HSCode: item.HSCode, reason: "Missing companyName" });
        continue;
      }
      if (!item.branchId) {
        console.warn(`⚠️ [createStock] Skipping item "${item.itemDescription}" (HSCode: ${item.HSCode}) — missing branchId`);
        skippedItems.push({ itemDescription: item.itemDescription, HSCode: item.HSCode, companyName: item.companyName, reason: "Missing branchId" });
        continue;
      }

      const groupKey = `${item.HSCode}_${item.companyName}_${item.branchId}`;
      console.log(`🗂️  [createStock] Item "${item.itemDescription}" → group key: ${groupKey}`);

      if (!groupedStocks[groupKey]) {
        groupedStocks[groupKey] = {
          HSCode: item.HSCode,
          companyName: item.companyName,
          branchId: item.branchId,
          items: [],
        };
      }

      groupedStocks[groupKey].items.push({
        itemDescription: item.itemDescription,
        location: item.location,
        quantity: item.quantity ?? 0,
        minStockLevel: item.minStockLevel ?? 0,
        purchaseFields: extractPurchaseFields(item, purchaseInvoiceNumber),
      });
    }

    const groupKeys = Object.keys(groupedStocks);
    console.log(`📊 [createStock] ${groupKeys.length} group(s) formed: ${groupKeys.join(", ")}`);
    console.log(`🚫 [createStock] ${skippedItems.length} item(s) skipped in validation`);

    // ── Step 2: process each group ───────────────────────────────────────────
    console.log("⚙️  [createStock] Step 2: Processing groups...");

    for (const groupKey in groupedStocks) {
      const stockData = groupedStocks[groupKey];
      console.log(`\n🔄 [createStock] Processing group: ${groupKey} (${stockData.items.length} item(s))`);

      const existingStock = await Stock.findOne(
        {
          userId,
          HSCode: stockData.HSCode,
          companyName: stockData.companyName,
          branchId: stockData.branchId,
        },
        null,
        { session }
      );

      // ── 2a. Stock document exists ──────────────────────────────────────────
      if (existingStock) {
        console.log(`✅ [createStock] Existing stock found: ${existingStock._id}`);

        let stockWasModified = false;
        let newItemCount = 0;
        let repurchaseCount = 0;

        try {
          for (const incomingItem of stockData.items) {
            console.log(`   🔎 [createStock] Checking item "${incomingItem.itemDescription}" @ "${incomingItem.location}"`);

            const existingItemIndex = existingStock.items.findIndex(
              (ei) =>
                ei.itemDescription === incomingItem.itemDescription &&
                ei.location === incomingItem.location
            );

            const purchaseSnapshot = await createPurchaseAndSnapshot({
              userId,
              stockId: existingStock._id,
              branchId: stockData.branchId,
              companyName: stockData.companyName,
              HSCode: stockData.HSCode,
              itemDescription: incomingItem.itemDescription,
              location: incomingItem.location,
              purchaseFields: incomingItem.purchaseFields,
              session,
              vendorName: incomingItem.vendorName
            });
            console.log(`   💾 [createStock] Purchase doc saved: ${purchaseSnapshot.purchaseId}`);

            if (existingItemIndex === -1) {
              console.log(`    [createStock] New item variant — pushing to stock`);
              existingStock.items.push({
                itemDescription: incomingItem.itemDescription,
                location: incomingItem.location,
                quantity: incomingItem.quantity,
                minStockLevel: incomingItem.minStockLevel,
                purchaseDetails: [purchaseSnapshot],
              });
              newItemCount++;
            } else {
              const oldQty = existingStock.items[existingItemIndex].quantity;
              const newQty = oldQty + incomingItem.quantity;
              console.log(`   🔁 [createStock] Re-purchase — qty: ${oldQty} → ${newQty}`);
              existingStock.items[existingItemIndex].purchaseDetails.push(purchaseSnapshot);
              existingStock.items[existingItemIndex].quantity = newQty;
              repurchaseCount++;
            }

            stockWasModified = true;
          }

          if (stockWasModified) {
            const updated = await existingStock.save({ session });
            console.log(`💿 [createStock] Stock updated and saved: ${updated._id} | new: ${newItemCount} repurchased: ${repurchaseCount}`);
            updatedItems.push({
              stockId: updated._id,
              HSCode: stockData.HSCode,
              companyName: stockData.companyName,
              branchId: stockData.branchId,
              newItemsAdded: newItemCount,
              repurchasedItems: repurchaseCount,
            });
          }
        } catch (updateError) {
          console.error(`❌ [createStock] Failed to update group ${groupKey}:`, updateError.message);
          for (const item of stockData.items) {
            skippedItems.push({
              HSCode: stockData.HSCode,
              companyName: stockData.companyName,
              branchId: stockData.branchId,
              itemDescription: item.itemDescription,
              location: item.location,
              reason: updateError.message,
            });
          }
        }

        continue;
      }

      // ── 2b. New stock document ─────────────────────────────────────────────
      console.log(`🆕 [createStock] No existing stock — creating new document for group: ${groupKey}`);

      try {
        const stock = new Stock({
          userId,
          HSCode: stockData.HSCode,
          companyName: stockData.companyName,
          branchId: stockData.branchId,
          branchExists: true,
          items: stockData.items.map((item) => ({
            itemDescription: item.itemDescription,
            location: item.location,
            quantity: item.quantity,
            minStockLevel: item.minStockLevel,
            purchaseDetails: [],
          })),
        });

        const savedStock = await stock.save({ session });
        console.log(`💿 [createStock] Stock document saved (empty snapshots): ${savedStock._id}`);

        const snapshots = await Promise.all(
          stockData.items.map((item) =>
            createPurchaseAndSnapshot({
              userId,
              stockId: savedStock._id,
              branchId: stockData.branchId,
              companyName: stockData.companyName,
              HSCode: stockData.HSCode,
              itemDescription: item.itemDescription,
              location: item.location,
              purchaseFields: item.purchaseFields,
              session,
            })
          )
        );
        console.log(`💾 [createStock] ${snapshots.length} purchase doc(s) saved: ${snapshots.map(s => s.purchaseId).join(", ")}`);

        snapshots.forEach((snapshot, i) => {
          savedStock.items[i].purchaseDetails.push(snapshot);
        });

        await savedStock.save({ session });
        console.log(`✅ [createStock] Stock document finalized with snapshots: ${savedStock._id}`);

        savedItems.push(savedStock);
      } catch (saveError) {
        console.error(`❌ [createStock] Failed to create new stock for group ${groupKey}:`, saveError.message);
        for (const item of stockData.items) {
          skippedItems.push({
            HSCode: stockData.HSCode,
            companyName: stockData.companyName,
            itemDescription: item.itemDescription,
            branchId: stockData.branchId,
            reason: saveError.message,
          });
        }
      }
    }

    // ── Step 3: commit or abort ──────────────────────────────────────────────
    console.log(`\n📊 [createStock] Summary — saved: ${savedItems.length} | updated: ${updatedItems.length} | skipped: ${skippedItems.length}`);

    if (savedItems.length === 0 && updatedItems.length === 0) {
      console.error("❌ [createStock] Nothing saved — aborting transaction");
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: "No stock records were saved. All items had errors.",
        skippedItems,
      });
    }

    await session.commitTransaction();
    session.endSession();
    console.log("✅ [createStock] Transaction committed successfully");

    return res.status(201).json({
      message: `Stock saved. ${savedItems.length} new record(s). ${updatedItems.length} updated record(s).`,
      purchaseInvoiceNumber,
      count: savedItems.length,
      data: savedItems,
      updated: updatedItems.length > 0 ? updatedItems : undefined,
      skippedItems: skippedItems.length > 0 ? skippedItems : undefined,
      totals: payload.totals,
      timestamp: payload.timestamp,
    });

  } catch (error) {
    console.error("💥 [createStock] Unhandled error — rolling back transaction:", error.message);
    console.error(error.stack);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      message: "Failed to create stock",
      error: error.message,
    });
  }
};

export const getMyPurchases = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const purchases = await Purchase.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(purchases);
  } catch (error) {
    console.error("[getMyPurchases]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
