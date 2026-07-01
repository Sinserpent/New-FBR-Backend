
//import mongoose from "mongoose";
//import SaleModel from "../models/sale.model.js";
//import UserModel from "../models/userModel.js";
//import { submitToFBR } from "../utils/fbr.service.js";

//export const bulkSubmitToFBR = async (req, res) => {
//  try {
//    const userId = req.userId;
//    const { saleIds } = req.body;

//    console.log("[FBR bulk] Request received by user:", userId);
//    console.log("[FBR bulk] saleIds:", saleIds);

//    if (!Array.isArray(saleIds) || saleIds.length === 0) {
//      console.warn("[FBR bulk] Invalid saleIds array");
//      return res.status(400).json({ message: "saleIds must be a non-empty array" });
//    }

//    const invalidIds = saleIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
//    if (invalidIds.length > 0) {
//      console.warn("[FBR bulk] Found invalid IDs:", invalidIds);
//      return res.status(400).json({
//        message: "Invalid sale ID(s)",
//        invalidIds,
//      });
//    }

//    console.log("[FBR bulk] Loading user from DB...");
//    const user = await UserModel.findById(userId);
//    if (!user) {
//      console.error("[FBR bulk] User not found:", userId);
//      return res.status(404).json({ message: "User not found" });
//    }

//    // ── Pre-flight: NTN/CNIC must be set or FBR rejects every call with 401 ─
//    if (!user.sellerNTNCNIC || user.sellerNTNCNIC.trim() === "") {
//      console.error("[FBR bulk] sellerNTNCNIC missing on user:", userId);
//      return res.status(422).json({
//        message:
//          "Your Seller NTN/CNIC is not set on your profile. " +
//          "Please update your profile with a valid 7-digit NTN or 13-digit CNIC before submitting to FBR.",
//      });
//    }

//    // ── Pre-flight: token must exist ─────────────────────────────────────────
//    if (!user.productionToken) {
//      console.error("[FBR bulk] productionToken missing on user:", userId);
//      return res.status(422).json({
//        message:
//          "No FBR API token found on your account. " +
//          "Please add your production token in profile settings.",
//      });
//    }

//    console.log("[FBR bulk] Pre-flight passed. sellerNTNCNIC:", user.sellerNTNCNIC);

//    console.log("[FBR bulk] Loading sales from DB...");
//    const sales = await SaleModel.find({
//      _id:       { $in: saleIds },
//      userId,
//      fbrStatus: "pending",
//    });

//    console.log(`[FBR bulk] Eligible sales found: ${sales.length}`);

//    if (sales.length === 0) {
//      console.warn("[FBR bulk] No eligible pending sales for given IDs");
//      return res.status(404).json({
//        message: "No eligible pending sales found for the given IDs",
//      });
//    }

//    const results = [];
//    for (const sale of sales) {
//      console.log(`[FBR bulk] Submitting sale ${sale._id} (invoice: ${sale.invoiceNumber})`);
//      try {
//        await submitToFBR(sale, user);

//        const updated = await SaleModel.findById(sale._id).select(
//          "fbrStatus fbrInvoiceNo fbrError invoiceNumber"
//        );

//        console.log(`[FBR bulk] Sale ${sale._id} updated status: ${updated.fbrStatus}`);

//        results.push({
//          saleId:        String(sale._id),
//          invoiceNumber: sale.invoiceNumber,
//          status:        updated.fbrStatus,
//          fbrInvoiceNo:  updated.fbrInvoiceNo ?? null,
//          error:         updated.fbrError ?? null,
//        });
//      } catch (perSaleErr) {
//        console.error(`[FBR bulk] Unexpected error for sale ${sale._id}:`, perSaleErr.message);
//        results.push({
//          saleId:        String(sale._id),
//          invoiceNumber: sale.invoiceNumber,
//          status:        "failed",
//          fbrInvoiceNo:  null,
//          error:         perSaleErr.message,
//        });
//      }
//    }

//    const succeeded = results.filter((r) => r.status === "submitted").length;
//    const failed    = results.filter((r) => r.status === "failed").length;

//    console.log(`[FBR bulk] Bulk submission summary: total=${results.length}, succeeded=${succeeded}, failed=${failed}`);

//    return res.status(200).json({
//      success:   true,
//      total:     results.length,
//      succeeded,
//      failed,
//      results,
//    });

//  } catch (err) {
//    console.error("[FBR bulk] Unexpected controller error:", err);
//    return res.status(500).json({ message: "Bulk FBR submission failed", error: err.message });
//  }
//};


//ver


//import mongoose from "mongoose";
//import SaleModel from "../models/sale.model.js";
//import UserModel from "../models/userModel.js";
//import { submitToFBR } from "../utils/fbr.service.js";

//export const bulkSubmitToFBR = async (req, res) => {
//  try {
//    const userId = req.userId;
//    const { saleIds } = req.body;

//    console.log("[FBR bulk] Request received by user:", userId);
//    console.log("[FBR bulk] saleIds:", saleIds);

//    if (!Array.isArray(saleIds) || saleIds.length === 0) {
//      console.warn("[FBR bulk] Invalid saleIds array");
//      return res.status(400).json({ message: "saleIds must be a non-empty array" });
//    }

//    const invalidIds = saleIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
//    if (invalidIds.length > 0) {
//      console.warn("[FBR bulk] Found invalid IDs:", invalidIds);
//      return res.status(400).json({
//        message: "Invalid sale ID(s)",
//        invalidIds,
//      });
//    }

//    console.log("[FBR bulk] Loading user from DB...");
//    const user = await UserModel.findById(userId);
//    if (!user) {
//      console.error("[FBR bulk] User not found:", userId);
//      return res.status(404).json({ message: "User not found" });
//    }

//    // ── Pre-flight: NTN/CNIC must be set or FBR rejects every call with 401 ─
//    if (!user.sellerNTNCNIC || user.sellerNTNCNIC.trim() === "") {
//      console.error("[FBR bulk] sellerNTNCNIC missing on user:", userId);
//      return res.status(422).json({
//        message:
//          "Your Seller NTN/CNIC is not set on your profile. " +
//          "Please update your profile with a valid 7-digit NTN or 13-digit CNIC before submitting to FBR.",
//      });
//    }

//    // ── Pre-flight: token must exist ─────────────────────────────────────────
//    if (!user.productionToken) {
//      console.error("[FBR bulk] productionToken missing on user:", userId);
//      return res.status(422).json({
//        message:
//          "No FBR API token found on your account. " +
//          "Please add your production token in profile settings.",
//      });
//    }

//    console.log("[FBR bulk] Pre-flight passed. sellerNTNCNIC:", user.sellerNTNCNIC);

//    console.log("[FBR bulk] Loading sales from DB...");
//    const sales = await SaleModel.find({
//      _id:       { $in: saleIds },
//      userId,
//      fbrStatus: "pending",
//    });

//    console.log(`[FBR bulk] Eligible sales found: ${sales.length}`);

//    if (sales.length === 0) {
//      console.warn("[FBR bulk] No eligible pending sales for given IDs");
//      return res.status(404).json({
//        message: "No eligible pending sales found for the given IDs",
//      });
//    }

//    const results = [];
//    for (const sale of sales) {
//      console.log(`[FBR bulk] Submitting sale ${sale._id} (invoice: ${sale.invoiceNumber})`);
//      try {
//        await submitToFBR(sale, user);

//        const updated = await SaleModel.findById(sale._id).select(
//          "fbrStatus fbrInvoiceNo fbrError invoiceNumber"
//        );

//        console.log(`[FBR bulk] Sale ${sale._id} updated status: ${updated.fbrStatus}`);

//        results.push({
//          saleId:        String(sale._id),
//          invoiceNumber: sale.invoiceNumber,
//          status:        updated.fbrStatus,
//          fbrInvoiceNo:  updated.fbrInvoiceNo ?? null,
//          error:         updated.fbrError ?? null,
//        });
//      } catch (perSaleErr) {
//        console.error(`[FBR bulk] Unexpected error for sale ${sale._id}:`, perSaleErr.message);

//        // ←── CHANGED STATUS TO "pending" INSTEAD OF "failed"
//        await SaleModel.findByIdAndUpdate(sale._id, {
//          fbrStatus: "pending",
//          fbrError: perSaleErr.message,
//          fbrSubmittedAt: new Date(),
//        });

//        results.push({
//          saleId:        String(sale._id),
//          invoiceNumber: sale.invoiceNumber,
//          status:        "pending",
//          fbrInvoiceNo:  null,
//          error:         perSaleErr.message,
//        });
//      }
//    }

//    const succeeded = results.filter((r) => r.status === "submitted").length;
//    const failed    = results.filter((r) => r.status === "pending").length;

//    console.log(`[FBR bulk] Bulk submission summary: total=${results.length}, succeeded=${succeeded}, pending=${failed}`);

//    return res.status(200).json({
//      success:   true,
//      total:     results.length,
//      succeeded,
//      pending:   failed,
//      results,
//    });

//  } catch (err) {
//    console.error("[FBR bulk] Unexpected controller error:", err);
//    return res.status(500).json({ message: "Bulk FBR submission failed", error: err.message });
//  }
//};

import mongoose from "mongoose";
import SaleModel from "../models/sale.model.js";
import UserModel from "../models/userModel.js";
import { submitToFBR } from "../utils/fbr.service.js";

//export const bulkSubmitToFBR = async (req, res) => {
//  try {
//    const userId = req.userId;
//    const { saleIds } = req.body;

//    console.log("[FBR bulk] Request received by user:", userId);
//    console.log("[FBR bulk] saleIds:", saleIds);

//    if (!Array.isArray(saleIds) || saleIds.length === 0) {
//      console.warn("[FBR bulk] Invalid saleIds array");
//      return res.status(400).json({ message: "saleIds must be a non-empty array" });
//    }

//    const invalidIds = saleIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
//    if (invalidIds.length > 0) {
//      console.warn("[FBR bulk] Found invalid IDs:", invalidIds);
//      return res.status(400).json({ message: "Invalid sale ID(s)", invalidIds });
//    }

//    console.log("[FBR bulk] Loading user from DB...");
//    const user = await UserModel.findById(userId);
//    if (!user) {
//      console.error("[FBR bulk] User not found:", userId);
//      return res.status(404).json({ message: "User not found" });
//    }

//    if (!user.sellerNTNCNIC || user.sellerNTNCNIC.trim() === "") {
//      console.error("[FBR bulk] sellerNTNCNIC missing on user:", userId);
//      return res.status(422).json({
//        message:
//          "Your Seller NTN/CNIC is not set on your profile. " +
//          "Please update your profile with a valid 7-digit NTN or 13-digit CNIC before submitting to FBR.",
//      });
//    }

//    if (!user.productionToken) {
//      console.error("[FBR bulk] productionToken missing on user:", userId);
//      return res.status(422).json({
//        message:
//          "No FBR API token found on your account. " +
//          "Please add your production token in profile settings.",
//      });
//    }

//    console.log("[FBR bulk] Pre-flight passed. sellerNTNCNIC:", user.sellerNTNCNIC);

//    console.log("[FBR bulk] Loading sales from DB...");
//    const sales = await SaleModel.find({
//      _id:       { $in: saleIds },
//      userId,
//      fbrStatus: "pending",
//    });

//    console.log(`[FBR bulk] Eligible sales found: ${sales.length}`);
//    console.log("[FBR bulk] Sample sale raw fields:", JSON.stringify({
//  fbrBuyerRegistrationType: sales[0]?.fbrBuyerRegistrationType,
//  buyerRegistrationType:    sales[0]?.fbrBuyerRegistrationType,
//  cnicOrNtn:                sales[0]?.cnicOrNtn,
//  companyAddress:           sales[0]?.companyAddress,
//}, null, 2));

//    if (sales.length === 0) {
//      console.warn("[FBR bulk] No eligible pending sales for given IDs");
//      return res.status(404).json({
//        message: "No eligible pending sales found for the given IDs",
//      });
//    }

//    const results = [];

//    for (const sale of sales) {
//      console.log(`[FBR bulk] Submitting sale ${sale._id} (invoice: ${sale.invoiceNumber})`);
//      try {
//        await submitToFBR(sale, user);

//        // submitToFBR may have set fbrStatus to "failed" internally — re-read and check
//        const updated = await SaleModel.findById(sale._id).select(
//          "fbrStatus fbrInvoiceNo fbrError invoiceNumber"
//        );

//        console.log(`[FBR bulk] Post-submit status for ${sale._id}: ${updated.fbrStatus}`);

//        // ── If submitToFBR marked it "failed" internally, force it back to "pending" ──
//        if (updated.fbrStatus === "failed") {
//          console.warn(`[FBR bulk] submitToFBR set status to "failed" for ${sale._id} — overriding to "pending"`);
//          await SaleModel.findByIdAndUpdate(sale._id, { fbrStatus: "pending" });

//          results.push({
//            saleId:        String(sale._id),
//            invoiceNumber: sale.invoiceNumber,
//            status:        "pending",
//            fbrInvoiceNo:  null,
//            error:         updated.fbrError ?? "Submission failed — will retry",
//          });
//        } else {
//          // Successfully submitted
//          results.push({
//            saleId:        String(sale._id),
//            invoiceNumber: sale.invoiceNumber,
//            status:        updated.fbrStatus,
//            fbrInvoiceNo:  updated.fbrInvoiceNo ?? null,
//            error:         null,
//          });
//        }

//      } catch (perSaleErr) {
//        console.error(`[FBR bulk] Exception for sale ${sale._id}:`, perSaleErr.message);

//        // Force pending regardless of what submitToFBR may have written before throwing
//        await SaleModel.findByIdAndUpdate(sale._id, {
//          fbrStatus:      "pending",
//          fbrError:       perSaleErr.message,
//          fbrSubmittedAt: new Date(),
//        });

//        // Double-check it actually saved as pending
//        const recheck = await SaleModel.findById(sale._id).select("fbrStatus");
//        console.log(`[FBR bulk] Status after forced pending write for ${sale._id}: ${recheck?.fbrStatus}`);

//        results.push({
//          saleId:        String(sale._id),
//          invoiceNumber: sale.invoiceNumber,
//          status:        "pending",
//          fbrInvoiceNo:  null,
//          error:         perSaleErr.message,
//        });
//      }
//    }

//    const succeeded = results.filter((r) => r.status === "submitted").length;
//    const stillPending = results.filter((r) => r.status === "pending").length;

//    console.log(`[FBR bulk] Summary: total=${results.length}, succeeded=${succeeded}, pending=${stillPending}`);

//    return res.status(200).json({
//      success:   true,
//      total:     results.length,
//      succeeded,
//      pending:   stillPending,
//      results,
//    });

//  } catch (err) {
//    console.error("[FBR bulk] Unexpected controller error:", err);
//    return res.status(500).json({ message: "Bulk FBR submission failed", error: err.message });
//  }
//};

export const bulkSubmitToFBR = async (req, res) => {
  try {
    const userId = req.userId;
    const { saleIds } = req.body;

    console.log("[FBR bulk] ═══════════════════════════════════════════════");
    console.log("[FBR bulk] Request received by user:", userId);
    console.log("[FBR bulk] saleIds:", saleIds);
    console.log("[FBR bulk] saleIds count:", Array.isArray(saleIds) ? saleIds.length : "NOT AN ARRAY");

    if (!Array.isArray(saleIds) || saleIds.length === 0) {
      console.warn("[FBR bulk] Invalid saleIds array");
      return res.status(400).json({ message: "saleIds must be a non-empty array" });
    }

    const invalidIds = saleIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      console.warn("[FBR bulk] Found invalid IDs:", invalidIds);
      return res.status(400).json({ message: "Invalid sale ID(s)", invalidIds });
    }

    console.log("[FBR bulk] Loading user from DB...");
    const user = await UserModel.findById(userId);
    if (!user) {
      console.error("[FBR bulk] User not found:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("[FBR bulk] User loaded:");
    console.log("[FBR bulk]   sellerNTNCNIC      :", user.sellerNTNCNIC);
    console.log("[FBR bulk]   sellerProvince     :", user.sellerProvince);
    console.log("[FBR bulk]   companyName        :", user.companyName);
    console.log("[FBR bulk]   productionApiStatus:", user.productionApiStatus);
    console.log("[FBR bulk]   productionToken    :", user.productionToken ? "SET" : "MISSING");

    if (!user.sellerNTNCNIC || user.sellerNTNCNIC.trim() === "") {
      console.error("[FBR bulk] ❌ sellerNTNCNIC missing on user:", userId);
      return res.status(422).json({
        message:
          "Your Seller NTN/CNIC is not set on your profile. " +
          "Please update your profile with a valid 7-digit NTN or 13-digit CNIC before submitting to FBR.",
      });
    }

    if (!user.productionToken) {
      console.error("[FBR bulk] ❌ productionToken missing on user:", userId);
      return res.status(422).json({
        message:
          "No FBR API token found on your account. " +
          "Please add your production token in profile settings.",
      });
    }

    console.log("[FBR bulk] ✅ Pre-flight passed. sellerNTNCNIC:", user.sellerNTNCNIC);

    console.log("[FBR bulk] Loading sales from DB...");
    const sales = await SaleModel.find({
      _id:       { $in: saleIds },
      userId,
      fbrStatus: "pending",
    });

    console.log(`[FBR bulk] Eligible sales found: ${sales.length}`);

    if (sales.length === 0) {
      console.warn("[FBR bulk] No eligible pending sales for given IDs");
      return res.status(404).json({
        message: "No eligible pending sales found for the given IDs",
      });
    }

    // Log raw fields for every eligible sale
    sales.forEach((s, i) => {
      console.log(`[FBR bulk] sale[${i}] raw fields:`);
      console.log(`[FBR bulk]   _id                      :`, s._id);
      console.log(`[FBR bulk]   invoiceNumber            :`, s.invoiceNumber);
      console.log(`[FBR bulk]   fbrBuyerRegistrationType :`, s.fbrBuyerRegistrationType);
      console.log(`[FBR bulk]   buyerRegistrationType    :`, s.buyerRegistrationType);
      console.log(`[FBR bulk]   cnicOrNtn                :`, s.cnicOrNtn);
      console.log(`[FBR bulk]   companyAddress           :`, s.companyAddress);
      console.log(`[FBR bulk]   customerName             :`, s.customerName);
      console.log(`[FBR bulk]   fbrStatus                :`, s.fbrStatus);
    });

    const results = [];

    for (const sale of sales) {
      console.log(`\n[FBR bulk] ── Processing sale ${sale._id} (invoice: ${sale.invoiceNumber}) ──`);

      try {
        await submitToFBR(sale, user);

        const updated = await SaleModel.findById(sale._id).select(
          "fbrStatus fbrInvoiceNo fbrError invoiceNumber"
        );

        console.log(`[FBR bulk] Post-submit status for ${sale._id}: ${updated.fbrStatus}`);
        console.log(`[FBR bulk] Post-submit fbrInvoiceNo  : ${updated.fbrInvoiceNo}`);
        console.log(`[FBR bulk] Post-submit fbrError      : ${updated.fbrError}`);

        if (updated.fbrStatus === "failed") {
          console.warn(`[FBR bulk] ⚠️  submitToFBR marked as "failed" for ${sale._id} — overriding to "pending"`);
          await SaleModel.findByIdAndUpdate(sale._id, { fbrStatus: "pending" });

          results.push({
            saleId:        String(sale._id),
            invoiceNumber: sale.invoiceNumber,
            status:        "pending",
            fbrInvoiceNo:  null,
            error:         updated.fbrError ?? "Submission failed — will retry",
          });
        } else {
          console.log(`[FBR bulk] ✅ Sale ${sale._id} submitted successfully`);
          results.push({
            saleId:        String(sale._id),
            invoiceNumber: sale.invoiceNumber,
            status:        updated.fbrStatus,
            fbrInvoiceNo:  updated.fbrInvoiceNo ?? null,
            error:         null,
          });
        }

      } catch (perSaleErr) {
        console.error(`[FBR bulk] 🔥 Exception for sale ${sale._id}:`, perSaleErr.message);
        console.error(`[FBR bulk]    Error name  :`, perSaleErr.name);
        console.error(`[FBR bulk]    Error stack :`, perSaleErr.stack);

        await SaleModel.findByIdAndUpdate(sale._id, {
          fbrStatus:      "pending",
          fbrError:       perSaleErr.message,
          fbrSubmittedAt: new Date(),
        });

        const recheck = await SaleModel.findById(sale._id).select("fbrStatus");
        console.log(`[FBR bulk] Status after forced pending write for ${sale._id}: ${recheck?.fbrStatus}`);

        results.push({
          saleId:        String(sale._id),
          invoiceNumber: sale.invoiceNumber,
          status:        "pending",
          fbrInvoiceNo:  null,
          error:         perSaleErr.message,
        });
      }
    }

    const succeeded   = results.filter((r) => r.status === "submitted").length;
    const stillPending = results.filter((r) => r.status === "pending").length;

    console.log(`\n[FBR bulk] ═══════════════════════════════════════════════`);
    console.log(`[FBR bulk] Summary: total=${results.length}, succeeded=${succeeded}, pending=${stillPending}`);
    console.log(`[FBR bulk] Results:`, JSON.stringify(results, null, 2));
    console.log(`[FBR bulk] ═══════════════════════════════════════════════\n`);

    return res.status(200).json({
      success:     true,
      total:       results.length,
      succeeded,
      pending:     stillPending,
      results,
    });

  } catch (err) {
    console.error("[FBR bulk] 🔥 Unexpected controller error:", err.message);
    console.error("[FBR bulk]    Error name  :", err.name);
    console.error("[FBR bulk]    Error stack :", err.stack);
    return res.status(500).json({ message: "Bulk FBR submission failed", error: err.message });
  }
};