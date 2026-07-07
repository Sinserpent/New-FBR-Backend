import mongoose from "mongoose";
import SaleModel from "../models/sale.model.POS.js";
import UserModel from "../models/userModel.js";
import { submitToFBR } from "../utils/fbr.POS.service.js";

export const bulkSubmitToFBRPOS = async (req, res) => {
  try {
    const userId = req.userId;
    const { saleIds } = req.body;

    console.log("[FBR-POS bulk] ═══════════════════════════════════════════════");
    console.log("[FBR-POS bulk] Request received by user:", userId);
    console.log("[FBR-POS bulk] saleIds:", saleIds);
    console.log("[FBR-POS bulk] saleIds count:", Array.isArray(saleIds) ? saleIds.length : "NOT AN ARRAY");

    if (!Array.isArray(saleIds) || saleIds.length === 0) {
      console.warn("[FBR-POS bulk] Invalid saleIds array");
      return res.status(400).json({ message: "saleIds must be a non-empty array" });
    }

    const invalidIds = saleIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      console.warn("[FBR-POS bulk] Found invalid IDs:", invalidIds);
      return res.status(400).json({ message: "Invalid sale ID(s)", invalidIds });
    }

    console.log("[FBR-POS bulk] Loading user from DB...");
    const user = await UserModel.findById(userId);
    if (!user) {
      console.error("[FBR-POS bulk] User not found:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("[FBR-POS bulk] User loaded:");
    console.log("[FBR-POS bulk]   POSID              :", user.POSID);
    console.log("[FBR-POS bulk]   companyName        :", user.companyName);
    console.log("[FBR-POS bulk]   PosProductionToken :", user.PosProductionToken ? "SET" : "MISSING");

    // ── POS-specific pre-flight checks — POSID + POS token, not the DI
    //    sellerNTNCNIC/productionToken pair. ──
    if (!user.POSID) {
      console.error("[FBR-POS bulk] ❌ POSID missing on user:", userId);
      return res.status(422).json({
        message:
          "POS is not configured for this account. " +
          "Please add your POS ID in profile settings before submitting to FBR.",
      });
    }

    if (!user.PosProductionToken) {
      console.error("[FBR-POS bulk] ❌ PosProductionToken missing on user:", userId);
      return res.status(422).json({
        message:
          "No POS API token found on your account. " +
          "Please add your POS production token in profile settings.",
      });
    }

    console.log("[FBR-POS bulk] ✅ Pre-flight passed. POSID:", user.POSID);

    console.log("[FBR-POS bulk] Loading sales from DB...");
    const sales = await SaleModel.find({
      _id:       { $in: saleIds },
      userId,
      fbrStatus: "pending",
    });

    console.log(`[FBR-POS bulk] Eligible sales found: ${sales.length}`);

    if (sales.length === 0) {
      console.warn("[FBR-POS bulk] No eligible pending sales for given IDs");
      return res.status(404).json({
        message: "No eligible pending sales found for the given IDs",
      });
    }

    // Log raw fields for every eligible sale
    sales.forEach((s, i) => {
      console.log(`[FBR-POS bulk] sale[${i}] raw fields:`);
      console.log(`[FBR-POS bulk]   _id             :`, s._id);
      console.log(`[FBR-POS bulk]   invoiceNumber   :`, s.invoiceNumber);
      console.log(`[FBR-POS bulk]   usin            :`, s.usin);
      console.log(`[FBR-POS bulk]   cnicOrNtn       :`, s.cnicOrNtn);
      console.log(`[FBR-POS bulk]   customerName    :`, s.customerName);
      console.log(`[FBR-POS bulk]   customerPhone   :`, s.customerPhone);
      console.log(`[FBR-POS bulk]   fbrStatus       :`, s.fbrStatus);
    });

    const results = [];

    for (const sale of sales) {
      console.log(`\n[FBR-POS bulk] ── Processing sale ${sale._id} (invoice: ${sale.invoiceNumber}) ──`);

      try {
        await submitToFBR(sale, user);

        const updated = await SaleModel.findById(sale._id).select(
          "fbrStatus fbrInvoiceNo fbrError invoiceNumber usin"
        );

        console.log(`[FBR-POS bulk] Post-submit status for ${sale._id}: ${updated.fbrStatus}`);
        console.log(`[FBR-POS bulk] Post-submit fbrInvoiceNo  : ${updated.fbrInvoiceNo}`);
        console.log(`[FBR-POS bulk] Post-submit fbrError      : ${updated.fbrError}`);

        if (updated.fbrStatus === "failed") {
          console.warn(`[FBR-POS bulk] ⚠️  submitToFBR marked as "failed" for ${sale._id} — overriding to "pending"`);
          await SaleModel.findByIdAndUpdate(sale._id, { fbrStatus: "pending" });

          results.push({
            saleId:        String(sale._id),
            invoiceNumber: sale.invoiceNumber,
            usin:          updated.usin ?? null,
            status:        "pending",
            fbrInvoiceNo:  null,
            error:         updated.fbrError ?? "Submission failed — will retry",
          });
        } else {
          console.log(`[FBR-POS bulk] ✅ Sale ${sale._id} submitted successfully`);
          results.push({
            saleId:        String(sale._id),
            invoiceNumber: sale.invoiceNumber,
            usin:          updated.usin ?? null,
            status:        updated.fbrStatus,
            fbrInvoiceNo:  updated.fbrInvoiceNo ?? null,
            error:         null,
          });
        }

      } catch (perSaleErr) {
        console.error(`[FBR-POS bulk] 🔥 Exception for sale ${sale._id}:`, perSaleErr.message);
        console.error(`[FBR-POS bulk]    Error name  :`, perSaleErr.name);
        console.error(`[FBR-POS bulk]    Error stack :`, perSaleErr.stack);

        await SaleModel.findByIdAndUpdate(sale._id, {
          fbrStatus:      "pending",
          fbrError:       perSaleErr.message,
          fbrSubmittedAt: new Date(),
        });

        const recheck = await SaleModel.findById(sale._id).select("fbrStatus");
        console.log(`[FBR-POS bulk] Status after forced pending write for ${sale._id}: ${recheck?.fbrStatus}`);

        results.push({
          saleId:        String(sale._id),
          invoiceNumber: sale.invoiceNumber,
          usin:          null,
          status:        "pending",
          fbrInvoiceNo:  null,
          error:         perSaleErr.message,
        });
      }
    }

    const succeeded    = results.filter((r) => r.status === "submitted").length;
    const stillPending = results.filter((r) => r.status === "pending").length;

    console.log(`\n[FBR-POS bulk] ═══════════════════════════════════════════════`);
    console.log(`[FBR-POS bulk] Summary: total=${results.length}, succeeded=${succeeded}, pending=${stillPending}`);
    console.log(`[FBR-POS bulk] Results:`, JSON.stringify(results, null, 2));
    console.log(`[FBR-POS bulk] ═══════════════════════════════════════════════\n`);

    return res.status(200).json({
      success:  true,
      total:    results.length,
      succeeded,
      pending:  stillPending,
      results,
    });

  } catch (err) {
    console.error("[FBR-POS bulk] 🔥 Unexpected controller error:", err.message);
    console.error("[FBR-POS bulk]    Error name  :", err.name);
    console.error("[FBR-POS bulk]    Error stack :", err.stack);
    return res.status(500).json({ message: "Bulk FBR POS submission failed", error: err.message });
  }
};