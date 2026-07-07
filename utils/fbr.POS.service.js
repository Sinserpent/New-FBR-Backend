import SaleModel from "../models/sale.model.POS.js";
import { decrypt } from "../utils/crypto.js";
import { uploadQRToCloudinary } from "./Uploadqrtocloudinary.js";

const FBR_URL = "https://gw.fbr.gov.pk/imsp/v1/api/Live/PostData";

// ─── Buyer ID splitter ────────────────────────────────────────────────────────

function splitBuyerId(cnicOrNtn = "") {
  const digits = String(cnicOrNtn).replace(/[^0-9]/g, "");
  if (digits.length === 13) return { BuyerCNIC: cnicOrNtn, BuyerNTN: "" };
  if (digits.length === 7 || digits.length === 8) return { BuyerNTN: cnicOrNtn, BuyerCNIC: "" };
  return { BuyerNTN: "", BuyerCNIC: "" };
}

const PAYMENT_MODE = { cash: 1, card: 2, credit: 3 };

// ─── USIN generator ────────────────────────────────────────────────────────
// FBR's POS API requires a Unique Sale Invoice Number per transaction.
// Nothing upstream generates one, so we stamp it here at submission time
// (per the schema comment: "usin: stamped at submission time") and persist
// it back onto the sale document below.
function generateUSIN(user) {
  const posId = String(user.POSID || "0");
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${posId}-${ts}-${rand}`;
}

// ─── Payload builder ──────────────────────────────────────────────────────────

function buildPOSPayload(sale, user) {
  console.log("[FBR-POS:build] ── buildPOSPayload called ──────────────────");
  console.log("[FBR-POS:build] sale._id           :", sale._id);
  console.log("[FBR-POS:build] user.POSID         :", user.POSID);
  console.log("[FBR-POS:build] sale.usin          :", sale.usin);
  console.log("[FBR-POS:build] sale.cnicOrNtn     :", sale.cnicOrNtn);
  console.log("[FBR-POS:build] sale.customerName  :", sale.customerName);
  console.log("[FBR-POS:build] sale.customerPhone :", sale.customerPhone);
  console.log("[FBR-POS:build] sale.saleMethod    :", sale.saleMethod);
  console.log("[FBR-POS:build] sale.saleDate      :", sale.saleDate);

  const { BuyerNTN, BuyerCNIC } = splitBuyerId(sale.cnicOrNtn);
  console.log("[FBR-POS:build] BuyerNTN (resolved) :", BuyerNTN);
  console.log("[FBR-POS:build] BuyerCNIC (resolved):", BuyerCNIC);

  const d = new Date(sale.saleDate || Date.now());
  const pad = (n) => String(n).padStart(2, "0");
  const dateTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
                   `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  console.log("[FBR-POS:build] dateTime            :", dateTime);

  const items = sale.products.map((p, i) => {
    // FBR's POS API rejects the dotted DI-style HSCode (e.g. "3808.9170")
    // with "Invalid PCT Code length" — it wants a plain numeric string,
    // padded/truncated to 8 digits.
    const pctCode = String(p.HSCode || "").replace(/\D/g, "").padStart(8, "0").slice(-8);

    console.log(`[FBR-POS:build] item[${i}] ItemCode :`, p.itemCode || p.HSCode);
    console.log(`[FBR-POS:build] item[${i}] PCTCode  :`, pctCode, "(from HSCode:", p.HSCode, ")");
    console.log(`[FBR-POS:build] item[${i}] qty/amt  :`, p.qty, p.amount);

    return {
      ItemCode:    p.itemCode || p.HSCode,
      ItemName:    p.itemDescription,
      Quantity:    p.qty,
      PCTCode:     pctCode,
      TaxRate:     p.gstRate || 0,
      SaleValue:   parseFloat(p.amount.toFixed(2)),
      TotalAmount: parseFloat(p.totalAmount.toFixed(2)),
      TaxCharged:  parseFloat((p.gstAmount || 0).toFixed(2)),
      Discount:    parseFloat((p.discount || 0).toFixed(2)),
      FurtherTax:  parseFloat((p.fbr?.furtherTax || 0).toFixed(2)),
      InvoiceType: 1,
      RefUSIN:     p.refUsin || null,
    };
  });

  const payload = {
    POSID:            user.POSID,
    InvoiceNumber:    "",
    USIN:             sale.usin,
    DateTime:         dateTime,
    BuyerNTN,
    BuyerCNIC,
    BuyerName:        sale.customerName  || "Walk-in Customer",
    BuyerPhoneNumber: sale.customerPhone || "",
    items,
    TotalBillAmount:  parseFloat(sale.totals.totalNetAmount.toFixed(2)),
    TotalQuantity:    sale.totals.totalQuantity,
    TotalSaleValue:   parseFloat(sale.totals.totalAmount.toFixed(2)),
    TotalTaxCharged:  parseFloat(sale.totals.totalGstAmount.toFixed(2)),
    PaymentMode:      PAYMENT_MODE[sale.saleMethod] ?? 1,
    InvoiceType:      1,
  };

  console.log("[FBR-POS:build] ── Final payload ───────────────────────────");
  console.log(JSON.stringify(payload, null, 2));
  console.log("[FBR-POS:build] ────────────────────────────────────────────");

  return payload;
}

// ─── Safe response parser ─────────────────────────────────────────────────────

async function parseResponse(res) {
  const rawText = await res.text();

  console.log("[FBR-POS] ── Raw response ──────────────────────────────");
  console.log("[FBR-POS] Status      :", res.status, res.statusText);
  console.log("[FBR-POS] Content-Type:", res.headers.get("content-type"));
  console.log("[FBR-POS] Body        :", rawText);
  console.log("[FBR-POS] ────────────────────────────────────────────────");

  try {
    return { data: JSON.parse(rawText), raw: rawText, isXml: false };
  } catch {
    const faultMsg =
      rawText.match(/<faultstring[^>]*>(.*?)<\/faultstring>/is)?.[1] ||
      rawText.match(/<am:message[^>]*>(.*?)<\/am:message>/is)?.[1]   ||
      rawText.match(/<message[^>]*>(.*?)<\/message>/is)?.[1]         ||
      rawText.match(/<description[^>]*>(.*?)<\/description>/is)?.[1] ||
      "Unknown XML fault — see raw body above";

    console.error("[FBR-POS] ⚠️  XML/SOAP fault:", faultMsg.trim());
    return { data: null, raw: rawText, isXml: true, faultMsg: faultMsg.trim() };
  }
}

// ─── Main submission ────────────────────────────────────────────────────────

export async function submitToFBR(sale, user) {
  console.log("\n[FBR-POS] ═══════════════════════════════════════════════");
  console.log("[FBR-POS] Sale ID :", sale._id);
  console.log("[FBR-POS] POSID   :", user.POSID);
  console.log("[FBR-POS] ═══════════════════════════════════════════════\n");

  try {
    const rawToken = decrypt(user.PosProductionToken);

    if (!user.POSID)  console.warn("[FBR-POS] ⚠️  POSID missing on user profile!");
    if (!rawToken)     console.warn("[FBR-POS] ⚠️  Token decryption returned empty!");

    // ── Stamp USIN if missing — FBR's POS API requires it and nothing
    //    upstream generates one. Persist it so it's stable if this sale
    //    is ever resubmitted. ──
    if (!sale.usin) {
      sale.usin = generateUSIN(user);
      console.log("[FBR-POS] Generated USIN:", sale.usin);
      await SaleModel.findByIdAndUpdate(sale._id, { usin: sale.usin });
    } else {
      console.log("[FBR-POS] Using existing USIN:", sale.usin);
    }

    const payload = buildPOSPayload(sale, user);

    console.log("[FBR-POS] ── Payload ──────────────────────────────────");
    console.log(JSON.stringify(payload, null, 2));
    console.log("[FBR-POS] ─────────────────────────────────────────────\n");
    console.log("[FBR-POS] Sending POST to:", FBR_URL);

    const res = await fetch(FBR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${rawToken}`,
      },
      body: JSON.stringify(payload),
    });

    const { data, isXml, faultMsg, raw } = await parseResponse(res);

    // ── SOAP/XML fault ──────────────────────────────────────────────────
    if (isXml) {
      await SaleModel.findByIdAndUpdate(sale._id, {
        fbrStatus:      "failed",
        fbrError:       faultMsg,
        fbrSubmittedAt: new Date(),
      });
      console.error("[FBR-POS] ❌ SOAP/XML fault:", faultMsg);
      return;
    }

    // ── POS rejection (response shape: { InvoiceNumber, Code, Response }) ──
    if (data?.Code !== "100") {
      const errMsg = data?.Response || `HTTP ${res.status}`;
      console.error("[FBR-POS] ❌ Rejected:", errMsg, "| raw:", raw);
      await SaleModel.findByIdAndUpdate(sale._id, {
        fbrStatus:      "failed",
        fbrError:       errMsg,
        fbrSubmittedAt: new Date(),
      });
      return;
    }

    // ── HTTP error (defensive, in case Code is "100" but status isn't ok) ──
    if (!res.ok) {
      const errMsg = data?.message || data?.error || `HTTP ${res.status}`;
      console.error("[FBR-POS] ❌ HTTP error:", errMsg);
      await SaleModel.findByIdAndUpdate(sale._id, {
        fbrStatus:      "failed",
        fbrError:       errMsg,
        fbrSubmittedAt: new Date(),
      });
      return;
    }

    // ── Extract invoice number ───────────────────────────────────────────
    console.log("[FBR-POS] ✅ HTTP OK — extracting invoice number...");

    const fbrInvoiceNo = data?.InvoiceNumber || null;

    console.log("[FBR-POS] FBR invoice number:", fbrInvoiceNo);

    if (!fbrInvoiceNo) {
      console.warn("[FBR-POS] ⚠️  200 OK but no invoice number in response. Full body:", raw);
      await SaleModel.findByIdAndUpdate(sale._id, {
        fbrStatus:      "failed",
        fbrError:       "Submitted but no FBR invoice number returned. Check raw logs.",
        fbrSubmittedAt: new Date(),
      });
      return;
    }

    // ── Generate QR + upload to Cloudinary ───────────────────────────────
    let fbrQrUrl    = `${fbrInvoiceNo}`;
    let fbrQrCdnUrl = null;

    try {
      console.log("[FBR-POS] Generating QR and uploading to Cloudinary...");
      ({ fbrQrUrl, fbrQrCdnUrl } = await uploadQRToCloudinary(fbrInvoiceNo));
      console.log("[FBR-POS] ✅ QR uploaded:", fbrQrCdnUrl);
    } catch (qrErr) {
      console.error("[FBR-POS] ⚠️  QR upload failed (non-fatal):", qrErr.message);
    }

    // ── Persist everything ────────────────────────────────────────────────
    await SaleModel.findByIdAndUpdate(sale._id, {
      fbrStatus:      "submitted",
      fbrInvoiceNo,
      fbrQrUrl,
      fbrQrCdnUrl,
      fbrSubmittedAt: new Date(),
      fbrError:       null,
    });

    console.log(`[FBR-POS] ✅ Done. Sale: ${sale._id} | FBR No: ${fbrInvoiceNo} | QR: ${fbrQrCdnUrl}`);

  } catch (err) {
    console.error("\n[FBR-POS] 🔥 Unexpected error");
    console.error("[FBR-POS] Name  :", err.name);
    console.error("[FBR-POS] Msg   :", err.message);
    console.error("[FBR-POS] Cause :", err.cause);
    console.error("[FBR-POS] Stack :", err.stack);

    try {
      await SaleModel.findByIdAndUpdate(sale._id, {
        fbrStatus:      "failed",
        fbrError:       err.message,
        fbrSubmittedAt: new Date(),
      });
    } catch (updateErr) {
      console.error("[FBR-POS] Failed to save error state:", updateErr.message);
    }
  }

  console.log("[FBR-POS] ═══════════════════════════════════════════════\n");
}