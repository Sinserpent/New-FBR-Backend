import SaleModel from "../models/sale.model.js";
import userModel from "../models/userModel.js";
import mongoose from "mongoose";
import { Stock } from "../models/stock.model.js";
import { submitToFBR } from "../utils/fbr.service.js";

// ─── Create Sale ──────────────────────────────────────────────────────────────

export const createSale = async (req, res) => {
  console.log(JSON.stringify(req.body, null, 2))
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.userId;
    console.log("[INFO] Creating sale for userId:", userId);

    const user = await userModel.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "User not found" });
    }

    const { products, totals, paymentDetails, invoiceNumber, branchId, ...saleData } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Products array is required and cannot be empty" });
    }
    if (!totals) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Totals object is required" });
    }
    if (!paymentDetails) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Payment details are required" });
    }
    if (!branchId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Branch ID is required" });
    }
    if (!invoiceNumber || typeof invoiceNumber !== 'string' || !invoiceNumber.trim()) {
  await session.abortTransaction();
  session.endSession();
  return res.status(400).json({ message: "Invoice number is required and must be a non-empty string" });
}

    const stockUpdateResults     = [];
    const insufficientStockItems = [];
    const enrichedProducts       = [];

    // ── Phase 1: Validate all products & check stock ──────────────────────
    for (const product of products) {
      if (!product.HSCode || !product.companyName || !product.item || !product.qty || product.qty <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          message:        "Each product must have HSCode, companyName, item, and positive qty",
          invalidProduct: product,
        });
      }

      const stockDoc = await Stock.findOne({
        userId,
        HSCode:      String(product.HSCode),
        companyName: String(product.companyName),
        branchId,
      }).session(session);

      if (!stockDoc) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          message: `Stock not found for HSCode: ${product.HSCode}, companyName: ${product.companyName} in branch: ${branchId}`,
          product,
        });
      }

      const itemIndex = stockDoc.items.findIndex(
        (i) => i.itemDescription === String(product.item)
      );

      if (itemIndex === -1) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          message: `Item "${product.item}" not found in stock for HSCode: ${product.HSCode}, companyName: ${product.companyName}`,
          product,
        });
      }

      const stockItem = stockDoc.items[itemIndex];

      if (stockItem.quantity < product.qty) {
        insufficientStockItems.push({
          HSCode:          product.HSCode,
          companyName:     product.companyName,
          itemDescription: stockItem.itemDescription,
          available:       stockItem.quantity,
          requested:       product.qty,
          shortage:        product.qty - stockItem.quantity,
        });
      }

      enrichedProducts.push({
        ...product,
        itemDescription: stockItem.itemDescription,
        stockDocId:      stockDoc._id,
        itemIndex,
        currentQuantity: stockItem.quantity,
        minStockLevel:   stockItem.minStockLevel,
        fbr:             { ...stockItem.fbr, ...product.fbr },
      });
    }

    if (insufficientStockItems.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Insufficient stock for one or more items",
        insufficientStockItems,
      });
    }

    // ── Phase 2: Deduct stock ──────────────────────────────────────────────
    for (const product of enrichedProducts) {
      const updateResult = await Stock.findOneAndUpdate(
        {
          _id:                     product.stockDocId,
          "items.itemDescription": product.itemDescription,
        },
        { $inc: { "items.$.quantity": -product.qty } },
        { new: true, session }
      );

      if (!updateResult) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({
          message: `Failed to update stock for item: ${product.itemDescription}`,
          product,
        });
      }

      const updatedItem = updateResult.items.find(
        (i) => i.itemDescription === product.itemDescription
      );

      stockUpdateResults.push({
        HSCode:           product.HSCode,
        companyName:      product.companyName,
        itemDescription:  product.itemDescription,
        previousQuantity: product.currentQuantity,
        newQuantity:      updatedItem.quantity,
        deducted:         product.qty,
        belowMinStock:    updatedItem.quantity < updatedItem.minStockLevel,
      });
    }

    // ── Phase 3: Build sale products array ────────────────────────────────
    const saleProducts = enrichedProducts.map((p) => ({
      HSCode:          p.HSCode,
      companyName:     p.companyName,
      itemDescription: p.itemDescription,
      location:        p.location,
      totalAmount:            p.totalAmount,
      qty:             p.qty,
      amount:          p.amount,
      gstRate:         p.gstRate   || 0,
      gstAmount:       p.gstAmount || 0,
      discount:        p.discount  || 0,
      netAmount:       p.netAmount,
      fbr:             p.fbr,
    }));

    const preparedPaymentDetails = {
      totalNetAmount:  paymentDetails.totalNetAmount,
      amountReceived:  paymentDetails.amountReceived,
      remainingAmount: paymentDetails.remainingAmount,
      changeAmount:    paymentDetails.changeAmount || 0,
      paymentStatus:   paymentDetails.paymentStatus || "Pending",
    };

    // ── Phase 4: Save sale ────────────────────────────────────────────────
    const sale = new SaleModel({
      userId,
      branchId,
      invoiceNumber: invoiceNumber.trim(),
      ...saleData,
      products:       saleProducts,
      totals,
      paymentDetails: preparedPaymentDetails,
    });

    const savedSale = await sale.save({ session });

    await session.commitTransaction();
    session.endSession();
    console.log("[SUCCESS] Sale created:", savedSale._id);

    // ── Phase 5: Async FBR submission (non-blocking) ──────────────────────
    // submitToFBR handles QR generation + Cloudinary upload internally
    if (req.body.fbrSendStatus && user.productionApiStatus && user.productionToken) {
  submitToFBR(savedSale, user).catch((err) =>
    console.error("[FBR] Submission failed:", err.message)
  );
  } else {
  console.log("[INFO] FBR submission skipped as fbrSendStatus is false or user not set for production");
  }

    const lowStockWarnings = stockUpdateResults.filter((i) => i.belowMinStock);

    return res.status(201).json({
      success: true,
      message: "Sale created successfully",
      data:    savedSale,
      stockUpdates: stockUpdateResults,
      lowStockWarnings: lowStockWarnings.length > 0
        ? { count: lowStockWarnings.length, items: lowStockWarnings }
        : undefined,
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("[FATAL] Error creating sale:", error);

    if (error.code === 11000) {
      return res.status(409).json({ message: "Duplicate invoice number detected", error: error.message });
    }

    return res.status(500).json({ message: "Failed to create sale", error: error.message });
  }
};

// ─── Get All Sales ────────────────────────────────────────────────────────────
// Returns all FBR fields including fbrQrUrl and fbrQrCdnUrl so the
// frontend can render the QR image directly via <img src={sale.fbrQrCdnUrl} />

export const getAllSales = async (req, res) => {
  try {
    const userId = req.userId;


    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const sales = await SaleModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
      //console.log(sales);
      

    res.status(200).json({
      success: true,
      count:   sales.length,
      data:    sales,  // fbrQrUrl + fbrQrCdnUrl are included automatically via .lean()
    });

  } catch (error) {
    console.error("[ERROR] Failed to retrieve sales:", error);
    res.status(500).json({ message: "Failed to retrieve sales.", error: error.message });
  }
};

// ─── Get Sale by ID ───────────────────────────────────────────────────────────

export const getSaleById = async (req, res) => {
  try {
    const sale = await SaleModel.findOne({
      _id:    req.params.id,
      userId: req.userId,
    }).lean();

    if (!sale) {
      return res.status(404).json({ message: "Sale not found." });
    }

    res.status(200).json({ success: true, data: sale });

  } catch (error) {
    console.error("[ERROR] Failed to retrieve sale:", error);
    res.status(500).json({ message: "Failed to retrieve sale.", error: error.message });
  }
};

// ─── Update Sale ──────────────────────────────────────────────────────────────

export const updateSale = async (req, res) => {
  try {
    const restrictedFields = ['products', 'totals', 'invoiceNumber', 'userId', 'branchId'];
    const hasRestrictedField = restrictedFields.some((f) => req.body[f] !== undefined);

    if (hasRestrictedField) {
      return res.status(400).json({
        message: "Cannot update products, totals, invoice number, user, or branch after sale creation",
      });
    }

    const updateData = Object.fromEntries(
      Object.entries(req.body).filter(([_, v]) => v !== undefined && v !== null)
    );

    const updatedSale = await SaleModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedSale) {
      return res.status(404).json({ message: "Sale not found." });
    }

    res.status(200).json({ success: true, message: "Sale updated successfully", data: updatedSale });

  } catch (error) {
    console.error("[ERROR] Failed to update sale:", error);
    res.status(400).json({ message: "Failed to update sale.", error: error.message });
  }
};

// ─── Delete Sale ──────────────────────────────────────────────────────────────

export const deleteSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.userId;
    const saleId = req.params.id;

    const sale = await SaleModel.findOne({ _id: saleId, userId }).session(session);

    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Sale not found." });
    }

    const stockRestoreResults = [];

    for (const product of sale.products) {
      const updateResult = await Stock.findOneAndUpdate(
        {
          userId,
          HSCode:           String(product.HSCode),
          branchId:         sale.branchId,
          "items.location": product.location,
        },
        { $inc: { "items.$.quantity": product.qty } },
        { new: true, session }
      );

      if (updateResult) {
        const restoredItem = updateResult.items.find((i) => i.location === product.location);
        stockRestoreResults.push({
          HSCode:          product.HSCode,
          location:        product.location,
          restoredQuantity: product.qty,
          newQuantity:     restoredItem?.quantity ?? null,
        });
      }
    }

    await SaleModel.deleteOne({ _id: saleId, userId }).session(session);
    await session.commitTransaction();

    res.status(200).json({
      success:       true,
      message:       "Sale deleted permanently and stock restored.",
      stockRestored: stockRestoreResults,
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: "Failed to delete sale.", error: error.message });
  } finally {
    session.endSession();
  }
};

// ─── Get Sales by Branch ──────────────────────────────────────────────────────

export const getSalesByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      return res.status(400).json({ message: "Branch ID is required" });
    }

    const sales = await SaleModel.find({ userId: req.userId, branchId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: sales.length, data: sales });

  } catch (error) {
    console.error("[ERROR] Failed to retrieve sales by branch:", error);
    res.status(500).json({ message: "Failed to retrieve sales by branch.", error: error.message });
  }
};

// ─── Sales Summary ────────────────────────────────────────────────────────────

export const getSalesSummary = async (req, res) => {
  try {
    const userId = req.userId;
    const { startDate, endDate, branchId } = req.query;

    const query = { userId };
    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate)   query.saleDate.$lte = new Date(endDate);
    }
    if (branchId) query.branchId = branchId;

    const sales = await SaleModel.find(query).lean();

    res.status(200).json({
      success: true,
      data: {
        totalSales:          sales.length,
        totalRevenue:        sales.reduce((sum, s) => sum + (s.totals?.totalNetAmount || 0), 0),
        totalItemsSold:      sales.reduce((sum, s) => sum + (s.totals?.totalQuantity  || 0), 0),
        confirmedSales:      sales.filter((s) => s.saleStatus === 'confirm').length,
        pendingSales:        sales.filter((s) => s.saleStatus === 'pending').length,
        cancelledSales:      sales.filter((s) => s.saleStatus === 'cancelled').length,
        fullyPaidSales:      sales.filter((s) => s.paymentDetails?.paymentStatus === 'Fully Paid').length,
        partiallyPaidSales:  sales.filter((s) => s.paymentDetails?.paymentStatus === 'Partially Paid').length,
        unpaidSales:         sales.filter((s) => s.paymentDetails?.paymentStatus === 'Unpaid').length,
        fbrSubmitted:        sales.filter((s) => s.fbrStatus === 'submitted').length,
        fbrFailed:           sales.filter((s) => s.fbrStatus === 'failed').length,
        fbrPending:          sales.filter((s) => s.fbrStatus === 'pending').length,
        salesByMethod: {
          cash:   sales.filter((s) => s.saleMethod === 'cash').length,
          credit: sales.filter((s) => s.saleMethod === 'credit').length,
          card:   sales.filter((s) => s.saleMethod === 'card').length,
        },
        salesByType: {
          retail:    sales.filter((s) => s.saleType === 'retail').length,
          wholesale: sales.filter((s) => s.saleType === 'wholesale').length,
          bulk:      sales.filter((s) => s.saleType === 'bulk').length,
        },
      },
    });

  } catch (error) {
    console.error("[ERROR] Failed to retrieve sales summary:", error);
    res.status(500).json({ message: "Failed to retrieve sales summary.", error: error.message });
  }
};