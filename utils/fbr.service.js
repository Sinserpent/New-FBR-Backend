////import SaleModel from "../models/sale.model.js";
////import { decrypt } from "../utils/crypto.js";

//////const FBR_SANDBOX_URL = "https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata_sb"; // swap to prod URL when live
////const FBR_PROD_URL    = "https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata";

////// ─── Transformer ─────────────────────────────────────────────────────────────
////// Converts your internal sale doc + user profile → FBR-compliant invoice payload

////function buildFBRPayload(sale, user) {
////  const invoiceDate = new Date(sale.saleDate)
////    .toISOString()
////    .split("T")[0]; // "YYYY-MM-DD"

////  // Buyer info — walking customers won't have a province,
////  // so we fall back to the seller's province (FBR requires the field)
////  const buyerNTNCNIC     = sale.ntn || sale.cnic || "0000000000000";
////  const buyerName        = sale.customerName    || "Walk-in Customer";
////  const buyerProvince    = sale.buyerProvince   || user.sellerProvince || "Sindh";
////  const buyerAddress     = sale.buyerAddress    || user.address        || "N/A";

////  // All products in one sale share the same buyer registration type
////  // (FBR payload is per-invoice, not per-item)
////  const buyerRegistrationType =
////    sale.products[0]?.fbrBuyerRegistrationType || "Unregistered";

////  // scenarioId — you can store this at sale level later,
////  // for now derive it from the first product's saleType
////  const scenarioId = sale.fbrScenarioId || deriveScenarioId(sale.products[0]);

////  const items = sale.products.map((p) => ({
////    hsCode:                          p.HSCode,
////    productDescription:              p.itemDescription,
////    rate:                            `${p.gstRate}%`,
////    uoM:                             p.fbr?.uoM                             || "Numbers, pieces, units",
////    quantity:                        p.qty,
////    totalValues:                     0,
////    valueSalesExcludingST:           p.amount,
////    fixedNotifiedValueOrRetailPrice: p.fbr?.fixedNotifiedValueOrRetailPrice || 0,
////    salesTaxApplicable:              p.gstAmount,
////    salesTaxWithheldAtSource:        p.fbr?.salesTaxWithheldAtSource        || 0,
////    extraTax:                        p.fbr?.extraTax                        || 0,
////    furtherTax:                      p.fbr?.furtherTax                      || 0,
////    fedPayable:                      p.fbr?.fedPayable                      || 0,
////    discount:                        p.discount                             || 0,
////    saleType:                        p.fbr?.fbrSaleType || "Goods at standard rate (default)",
////    sroScheduleNo:                   p.fbr?.sroScheduleNo                   || "",
////    sroItemSerialNo:                 p.fbr?.sroItemSerialNo                 || "",
////  }));

////  return {
////    invoiceType:          "Sale Invoice",
////    invoiceDate,
////    invoiceRefNo:         String(sale.invoiceNumber),
////    scenarioId,
////    buyerRegistrationType,

////    // Seller — from user profile
////    sellerNTNCNIC:        user.sellerNTNCNIC,
////    sellerBusinessName:   user.companyName,
////    sellerProvince:       user.sellerProvince,
////    sellerAddress:        user.address,

////    // Buyer — from sale
////    buyerNTNCNIC,
////    buyerBusinessName:    buyerName,
////    buyerProvince,
////    buyerAddress,

////    items,
////  };
////}

////// ─── Scenario deriver (fallback) ─────────────────────────────────────────────
////// Maps saleType string → FBR scenario ID
////// Ideally you store scenarioId explicitly on the sale, but this is a safe fallback

////function deriveScenarioId(product) {
////  if (!product?.fbr?.fbrSaleType) return "SN001";

////  const map = {
////    "Goods at standard rate (default)": "SN001", // registered → SN001, unregistered → SN002
////    "Steel melting and re-rolling":      "SN003",
////    "Ship breaking":                     "SN004",
////    "Goods at Reduced Rate":             "SN005",
////    "Exempt goods":                      "SN006",
////    "Goods at zero-rate":                "SN007",
////    "3rd Schedule Goods":                "SN008",
////    "Cotton ginners":                    "SN009",
////    "Telecommunication services":        "SN010",
////    "Toll Manufacturing":                "SN011",
////    "Petroleum Products":                "SN012",
////    "Electricity Supply to Retailers":   "SN013",
////    "Gas to CNG stations":               "SN014",
////    "Mobile Phones":                     "SN015",
////    "Processing/Conversion of Goods":    "SN016",
////    "Goods (FED in ST Mode)":            "SN017",
////    "Services (FED in ST Mode)":         "SN018",
////    "Services":                          "SN019",
////    "Electric Vehicle":                  "SN020",
////    "Cement /Concrete Block":            "SN021",
////    "Potassium Chlorate":                "SN022",
////    "CNG Sales":                         "SN023",
////    "Goods as per SRO.297(I)/2023":      "SN024",
////    "Non-Adjustable Supplies":           "SN025",
////  };

////  return map[product.fbr.fbrSaleType] || "SN001";
////}

////// ─── Main submission function ─────────────────────────────────────────────────

////export async function submitToFBR(sale, user) {
////  try {
////    const rawToken = decrypt(user.productionToken);
////    const isProduction = user.productionApiStatus;
////    const baseUrl = isProduction ? FBR_PROD_URL : FBR_SANDBOX_URL;

////    const payload = buildFBRPayload(sale, user);

////    console.log("[FBR] Submitting invoice:", sale.invoiceNumber);
////    console.log("[FBR] Payload:", JSON.stringify(payload, null, 2));

////    // ── Step 1: Validate ────────────────────────────────────────────────────
////    const validateRes = await fetch(`${baseUrl}invoice/validate`, {
////      method: "POST",
////      headers: {
////        "Content-Type": "application/json",
////        Authorization: `Bearer ${rawToken}`,
////      },
////      body: JSON.stringify(payload),
////    });

////    const validateData = await validateRes.json();
////    console.log("[FBR] Validation response:", JSON.stringify(validateData, null, 2));

////    if (
////      validateData?.validationResponse?.statusCode !== "00" &&
////      validateData?.validationResponse?.status !== "Valid"
////    ) {
////      console.error("[FBR] Validation failed:", validateData?.validationResponse?.error);

////      // Mark all products as failed
////      await SaleModel.findByIdAndUpdate(sale._id, {
////        fbrStatus:       "failed",
////        fbrError:        validateData?.validationResponse?.error || "Validation failed",
////        fbrSubmittedAt:  new Date(),
////      });

////      return;
////    }

////    // ── Step 2: Submit ──────────────────────────────────────────────────────
////    const submitRes = await fetch(`${baseUrl}invoice/submit`, {
////      method: "POST",
////      headers: {
////        "Content-Type": "application/json",
////        Authorization: `Bearer ${rawToken}`,
////      },
////      body: JSON.stringify(payload),
////    });

////    const submitData = await submitRes.json();
////    console.log("[FBR] Submission response:", JSON.stringify(submitData, null, 2));

////    const fbrInvoiceNo = submitData?.invoiceNumber || submitData?.InvoiceNumber || null;

////    if (submitRes.ok && fbrInvoiceNo) {
////      // ── Success: update sale-level FBR fields ──────────────────────────
////      await SaleModel.findByIdAndUpdate(sale._id, {
////        fbrStatus:      "submitted",
////        fbrInvoiceNo,
////        fbrSubmittedAt: new Date(),
////        fbrError:       null,
////      });

////      console.log(`[FBR] ✅ Invoice ${sale.invoiceNumber} submitted. FBR No: ${fbrInvoiceNo}`);
////    } else {
////      const errMsg = submitData?.message || submitData?.error || "Unknown submission error";

////      await SaleModel.findByIdAndUpdate(sale._id, {
////        fbrStatus:      "failed",
////        fbrError:       errMsg,
////        fbrSubmittedAt: new Date(),
////      });

////      console.error("[FBR] ❌ Submission failed:", errMsg);


////    }

////  } catch (err) {
////    console.error("[FBR] 🔥 Unexpected error during FBR submission:", err.message);
////    console.error("[FBR] Error name:", err.name);
////    console.error("[FBR] Error cause:", err.cause); // this is the key one
////    console.error("[FBR] Full error:", err);

////    // Don't crash — just log. The sale is already saved.
////    try {
////      await SaleModel.findByIdAndUpdate(sale._id, {
////        fbrStatus:      "failed",
////        fbrError:       err.message,
////        fbrSubmittedAt: new Date(),
////      });
////    } catch (updateErr) {
////      console.error("[FBR] Failed to update fbrStatus after error:", updateErr.message);
////    }
////  }
////}


//import SaleModel from "../models/sale.model.js";
//import { decrypt } from "../utils/crypto.js";

//const FBR_PROD_URL    = "https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata";
//const FBR_SANDBOX_URL = "https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata"; // update if sandbox has a different URL

//// ─── Transformer ─────────────────────────────────────────────────────────────

//function buildFBRPayload(sale, user) {
//  const invoiceDate = new Date(sale.saleDate)
//    .toISOString()
//    .split("T")[0]; // "YYYY-MM-DD"

//  const buyerNTNCNIC          = sale.ntn || sale.cnic || "0000000000000";
//  const buyerName             = sale.customerName  || "Walk-in Customer";
//  const buyerProvince         = sale.buyerProvince || user.sellerProvince || "Sindh";
//  const buyerAddress          = sale.buyerAddress  || user.address        || "N/A";
//  const buyerRegistrationType = sale.fbrBuyerRegistrationType 
//                           || sale.products[0]?.fbrBuyerRegistrationType 
//                           || "Unregistered";
//  const scenarioId            = sale.fbrScenarioId || deriveScenarioId(sale.products[0]);

//  const items = sale.products.map((p) => ({
//    hsCode:                          p.HSCode,
//    productDescription:              p.itemDescription,
//    rate:                            `${p.gstRate}%`,
//    uoM:                             p.fbr?.uoM                             || "Numbers, pieces, units",
//    quantity:                        p.qty,
//    totalValues:                     0,
//    valueSalesExcludingST:           p.amount,
//    fixedNotifiedValueOrRetailPrice: p.fbr?.fixedNotifiedValueOrRetailPrice || 0,
//    salesTaxApplicable:              p.gstAmount,
//    salesTaxWithheldAtSource:        p.fbr?.salesTaxWithheldAtSource        || 0,
//    extraTax:                        p.fbr?.extraTax                        || 0,
//    furtherTax:                      p.fbr?.furtherTax                      || 0,
//    fedPayable:                      p.fbr?.fedPayable                      || 0,
//    discount:                        p.discount                             || 0,
//    saleType:                        p.fbr?.fbrSaleType || "Goods at standard rate (default)",
//    sroScheduleNo:                   p.fbr?.sroScheduleNo                   || "",
//    sroItemSerialNo:                 p.fbr?.sroItemSerialNo                 || "",
//  }));

//  return {
//    invoiceType:          "Sale Invoice",
//    invoiceDate,
//    invoiceRefNo:         String(sale.invoiceNumber),
//    scenarioId,
//    buyerRegistrationType,
//    sellerNTNCNIC:        user.sellerNTNCNIC,
//    sellerBusinessName:   user.companyName,
//    sellerProvince:       user.sellerProvince,
//    sellerAddress:        user.address,
//    buyerNTNCNIC,
//    buyerBusinessName:    buyerName,
//    buyerProvince,
//    buyerAddress,
//    items,
//  };
//}

//// ─── Scenario deriver ─────────────────────────────────────────────────────────

//function deriveScenarioId(product) {
//  if (!product?.fbr?.fbrSaleType) return "SN001";

//  const map = {
//    "Goods at standard rate (default)": "SN001",
//    "Steel melting and re-rolling":      "SN003",
//    "Ship breaking":                     "SN004",
//    "Goods at Reduced Rate":             "SN005",
//    "Exempt goods":                      "SN006",
//    "Goods at zero-rate":                "SN007",
//    "3rd Schedule Goods":                "SN008",
//    "Cotton ginners":                    "SN009",
//    "Telecommunication services":        "SN010",
//    "Toll Manufacturing":                "SN011",
//    "Petroleum Products":                "SN012",
//    "Electricity Supply to Retailers":   "SN013",
//    "Gas to CNG stations":               "SN014",
//    "Mobile Phones":                     "SN015",
//    "Processing/Conversion of Goods":    "SN016",
//    "Goods (FED in ST Mode)":            "SN017",
//    "Services (FED in ST Mode)":         "SN018",
//    "Services":                          "SN019",
//    "Electric Vehicle":                  "SN020",
//    "Cement /Concrete Block":            "SN021",
//    "Potassium Chlorate":                "SN022",
//    "CNG Sales":                         "SN023",
//    "Goods as per SRO.297(I)/2023":      "SN024",
//    "Non-Adjustable Supplies":           "SN025",
//  };

//  return map[product.fbr.fbrSaleType] || "SN001";
//}

//// ─── Safe response parser ─────────────────────────────────────────────────────
//// FBR sometimes returns XML SOAP faults instead of JSON — handle both

//async function parseResponse(res) {
//  const rawText = await res.text();

//  console.log("[FBR] ── Raw response ──────────────────────────────");
//  console.log("[FBR] Status     :", res.status, res.statusText);
//  console.log("[FBR] Content-Type:", res.headers.get("content-type"));
//  console.log("[FBR] Body       :", rawText);
//  console.log("[FBR] ────────────────────────────────────────────────");

//  // Try JSON first
//  try {
//    return { data: JSON.parse(rawText), raw: rawText, isXml: false };
//  } catch {
//    // It's XML/SOAP — extract the fault message
//    const faultString = rawText.match(/<faultstring[^>]*>(.*?)<\/faultstring>/is)?.[1]
//                     || rawText.match(/<am:message[^>]*>(.*?)<\/am:message>/is)?.[1]
//                     || rawText.match(/<message[^>]*>(.*?)<\/message>/is)?.[1]
//                     || rawText.match(/<description[^>]*>(.*?)<\/description>/is)?.[1]
//                     || "Unknown XML fault — see raw body above";

//    console.error("[FBR] ⚠️  XML/SOAP fault detected:", faultString.trim());
//    return { data: null, raw: rawText, isXml: true, faultMsg: faultString.trim() };
//  }
//}

//// ─── Main submission function ─────────────────────────────────────────────────

//export async function submitToFBR(sale, user) {
//  console.log("\n[FBR] ═══════════════════════════════════════════════");
//  console.log("[FBR] Starting submission for invoice:", sale.invoiceNumber);
//  console.log("[FBR] Sale ID    :", sale._id);
//  console.log("[FBR] User ID    :", user._id);
//  console.log("[FBR] Production :", user.productionApiStatus);
//  console.log("[FBR] ═══════════════════════════════════════════════\n");

//  try {
//    const rawToken = decrypt(user.productionToken);
//    const url      = user.productionApiStatus ? FBR_PROD_URL : FBR_SANDBOX_URL;

//    console.log("[FBR] Endpoint URL:", url);
//    console.log("[FBR] Token (first 20 chars):", rawToken?.slice(0, 20) + "...");

//    // ── Build payload ──────────────────────────────────────────────────────
//    const payload = buildFBRPayload(sale, user);

//    console.log("[FBR] ── Payload ──────────────────────────────────");
//    console.log(JSON.stringify(payload, null, 2));
//    console.log("[FBR] ─────────────────────────────────────────────\n");

//    // ── Seller field sanity checks ─────────────────────────────────────────
//    if (!payload.sellerNTNCNIC)  console.warn("[FBR] ⚠️  sellerNTNCNIC is missing on user profile!");
//    if (!payload.sellerProvince) console.warn("[FBR] ⚠️  sellerProvince is missing on user profile!");
//    if (!rawToken)               console.warn("[FBR] ⚠️  Token decryption returned empty!");

//    // ── Submit ─────────────────────────────────────────────────────────────
//    console.log("[FBR] Sending POST request...");

//    const res = await fetch(url, {
//      method: "POST",
//      headers: {
//        "Content-Type": "application/json",
//        Authorization:  `Bearer ${rawToken}`,
//      },
//      body: JSON.stringify(payload),
//    });

//    const { data, isXml, faultMsg, raw } = await parseResponse(res);

//    // ── XML/SOAP fault ─────────────────────────────────────────────────────
//    if (isXml) {
//      await SaleModel.findByIdAndUpdate(sale._id, {
//        fbrStatus:      "failed",
//        fbrError:       faultMsg,
//        fbrSubmittedAt: new Date(),
//      });
//      console.error("[FBR] ❌ Failed (SOAP fault):", faultMsg);
//      return;
//    }

//    // ── JSON error response ────────────────────────────────────────────────
//    if (!res.ok) {
//      const errMsg = data?.message || data?.error || data?.description || `HTTP ${res.status}`;
//      console.error("[FBR] ❌ HTTP error response:", errMsg);
//      console.error("[FBR] Full response data:", JSON.stringify(data, null, 2));

//      await SaleModel.findByIdAndUpdate(sale._id, {
//        fbrStatus:      "failed",
//        fbrError:       errMsg,
//        fbrSubmittedAt: new Date(),
//      });
//      return;
//    }

//    // ── Success ────────────────────────────────────────────────────────────
//    console.log("[FBR] ✅ HTTP OK — parsing success response...");
//    console.log("[FBR] Response data:", JSON.stringify(data, null, 2));
//    console.log("[FBR] Response keys:", Object.keys(data || {}));

//    const fbrInvoiceNo = data?.invoiceNumber
//                      || data?.InvoiceNumber
//                      || data?.invoice_number
//                      || data?.fbr_invoice_no
//                      || data?.FBRInvoiceNumber
//                      || null;

//    console.log("[FBR] Extracted FBR invoice number:", fbrInvoiceNo);

//    if (fbrInvoiceNo) {
//      await SaleModel.findByIdAndUpdate(sale._id, {
//        fbrStatus:      "submitted",
//        fbrInvoiceNo,
//        fbrSubmittedAt: new Date(),
//        fbrError:       null,
//      });
//      console.log(`[FBR] ✅ Invoice ${sale.invoiceNumber} submitted successfully. FBR No: ${fbrInvoiceNo}`);
//    } else {
//      // 200 OK but no invoice number — log everything so we can find the right key
//      console.warn("[FBR] ⚠️  Got OK response but could not extract FBR invoice number.");
//      console.warn("[FBR] Full raw body for inspection:", raw);

//      await SaleModel.findByIdAndUpdate(sale._id, {
//        fbrStatus:      "failed",
//        fbrError:       "Submitted but no FBR invoice number returned. Check raw logs.",
//        fbrSubmittedAt: new Date(),
//      });
//    }

//  } catch (err) {
//    console.error("\n[FBR] 🔥 Unexpected error during FBR submission");
//    console.error("[FBR] Error name :", err.name);
//    console.error("[FBR] Error msg  :", err.message);
//    console.error("[FBR] Error cause:", err.cause);
//    console.error("[FBR] Stack      :", err.stack);

//    try {
//      await SaleModel.findByIdAndUpdate(sale._id, {
//        fbrStatus:      "failed",
//        fbrError:       err.message,
//        fbrSubmittedAt: new Date(),
//      });
//    } catch (updateErr) {
//      console.error("[FBR] Failed to update fbrStatus after error:", updateErr.message);
//    }
//  }

//  console.log("[FBR] ═══════════════════════════════════════════════\n");
//}



//new ver

import SaleModel from "../models/sale.model.js";
import { decrypt } from "../utils/crypto.js";
import { uploadQRToCloudinary } from "./Uploadqrtocloudinary.js";

const FBR_URL = "https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata";

// ─── Payload builder ──────────────────────────────────────────────────────────

function buildFBRPayload(sale, user) {
  const invoiceDate = new Date(sale.saleDate).toISOString().split("T")[0];

  // Strip all non-digits, then validate: 7-digit NTN or 13-digit CNIC only
  const cleanedId    = (sale.ntn || sale.cnic || "").replace(/[^0-9]/g, "");
  const buyerNTNCNIC = (cleanedId.length === 7 || cleanedId.length === 13)
    ? cleanedId
    : "1000000000000"; // FBR official anonymous buyer placeholder

  const buyerName             = sale.customerName  || "Walk-in Customer";
  const buyerProvince         = sale.buyerProvince || user.sellerProvince || "Sindh";
  const buyerAddress          = sale.buyerAddress  || user.address        || "N/A";
  const buyerRegistrationType =
    sale.fbrBuyerRegistrationType ||
    sale.products[0]?.fbrBuyerRegistrationType ||
    "Unregistered";

  // scenarioId is sandbox-only — omit entirely in production
  const scenarioId = user.productionApiStatus
    ? undefined
    : (sale.fbrScenarioId || deriveScenarioId(sale.products[0]));

  const items = sale.products.map((p) => ({
    hsCode:                          p.HSCode,
    productDescription:              p.itemDescription,
    rate:                            `${p.gstRate}%`,
    uoM:                             p.fbr?.uoM                             || "Numbers, pieces, units",
    quantity:                        p.qty,
    totalValues:                     0,
    valueSalesExcludingST:           p.amount,
    fixedNotifiedValueOrRetailPrice: p.fbr?.fixedNotifiedValueOrRetailPrice || 0,
    salesTaxApplicable:              p.gstAmount,
    salesTaxWithheldAtSource:        p.fbr?.salesTaxWithheldAtSource        || 0,
    extraTax:                        p.fbr?.extraTax                        || 0,
    furtherTax:                      p.fbr?.furtherTax                      || 0,
    fedPayable:                      p.fbr?.fedPayable                      || 0,
    discount:                        p.discount                             || 0,
    saleType:                        p.fbr?.fbrSaleType || "Goods at standard rate (default)",
    sroScheduleNo:                   p.fbr?.sroScheduleNo                   || "",
    sroItemSerialNo:                 p.fbr?.sroItemSerialNo                 || "",
  }));

  return {
    invoiceType:          "Sale Invoice",
    invoiceDate,
    invoiceRefNo:         String(sale.invoiceNumber),
    ...(scenarioId && { scenarioId }),   // only included in sandbox
    buyerRegistrationType,
    sellerNTNCNIC:        user.sellerNTNCNIC,
    sellerBusinessName:   user.companyName,
    sellerProvince:       user.sellerProvince,
    sellerAddress:        user.address,
    buyerNTNCNIC,
    buyerBusinessName:    buyerName,
    buyerProvince,
    buyerAddress,
    items,
  };
}

// ─── Scenario deriver (sandbox only) ─────────────────────────────────────────

function deriveScenarioId(product) {
  if (!product?.fbr?.fbrSaleType) return "SN001";
  const map = {
    "Goods at standard rate (default)": "SN001",
    "Steel melting and re-rolling":      "SN003",
    "Ship breaking":                     "SN004",
    "Goods at Reduced Rate":             "SN005",
    "Exempt goods":                      "SN006",
    "Goods at zero-rate":                "SN007",
    "3rd Schedule Goods":                "SN008",
    "Cotton ginners":                    "SN009",
    "Telecommunication services":        "SN010",
    "Toll Manufacturing":                "SN011",
    "Petroleum Products":                "SN012",
    "Electricity Supply to Retailers":   "SN013",
    "Gas to CNG stations":              "SN014",
    "Mobile Phones":                     "SN015",
    "Processing/Conversion of Goods":    "SN016",
    "Goods (FED in ST Mode)":            "SN017",
    "Services (FED in ST Mode)":         "SN018",
    "Services":                          "SN019",
    "Electric Vehicle":                  "SN020",
    "Cement /Concrete Block":            "SN021",
    "Potassium Chlorate":                "SN022",
    "CNG Sales":                         "SN023",
    "Goods as per SRO.297(I)/2023":      "SN024",
    "Non-Adjustable Supplies":           "SN025",
  };
  return map[product.fbr.fbrSaleType] || "SN001";
}

// ─── Safe response parser ─────────────────────────────────────────────────────

async function parseResponse(res) {
  const rawText = await res.text();

  console.log("[FBR] ── Raw response ──────────────────────────────");
  console.log("[FBR] Status      :", res.status, res.statusText);
  console.log("[FBR] Content-Type:", res.headers.get("content-type"));
  console.log("[FBR] Body        :", rawText);
  console.log("[FBR] ────────────────────────────────────────────────");

  try {
    return { data: JSON.parse(rawText), raw: rawText, isXml: false };
  } catch {
    const faultMsg =
      rawText.match(/<faultstring[^>]*>(.*?)<\/faultstring>/is)?.[1] ||
      rawText.match(/<am:message[^>]*>(.*?)<\/am:message>/is)?.[1]   ||
      rawText.match(/<message[^>]*>(.*?)<\/message>/is)?.[1]         ||
      rawText.match(/<description[^>]*>(.*?)<\/description>/is)?.[1] ||
      "Unknown XML fault — see raw body above";

    console.error("[FBR] ⚠️  XML/SOAP fault:", faultMsg.trim());
    return { data: null, raw: rawText, isXml: true, faultMsg: faultMsg.trim() };
  }
}

// ─── Main submission ──────────────────────────────────────────────────────────

export async function submitToFBR(sale, user) {
  console.log("\n[FBR] ═══════════════════════════════════════════════");
  console.log("[FBR] Invoice    :", sale.invoiceNumber);
  console.log("[FBR] Sale ID    :", sale._id);
  console.log("[FBR] Production :", user.productionApiStatus);
  console.log("[FBR] ═══════════════════════════════════════════════\n");

  try {
    const rawToken = decrypt(user.productionToken);

    if (!user.sellerNTNCNIC)  console.warn("[FBR] ⚠️  sellerNTNCNIC missing on user profile!");
    if (!user.sellerProvince) console.warn("[FBR] ⚠️  sellerProvince missing on user profile!");
    if (!rawToken)            console.warn("[FBR] ⚠️  Token decryption returned empty!");

    const payload = buildFBRPayload(sale, user);

    console.log("[FBR] ── Payload ──────────────────────────────────");
    console.log(JSON.stringify(payload, null, 2));
    console.log("[FBR] ─────────────────────────────────────────────\n");
    console.log("[FBR] Sending POST to:", FBR_URL);

    const res = await fetch(FBR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  `Bearer ${rawToken}`,
      },
      body: JSON.stringify(payload),
    });

    const { data, isXml, faultMsg, raw } = await parseResponse(res);

    // ── SOAP fault ────────────────────────────────────────────────────────
    if (isXml) {
      await SaleModel.findByIdAndUpdate(sale._id, {
        fbrStatus:      "failed",
        fbrError:       faultMsg,
        fbrSubmittedAt: new Date(),
      });
      console.error("[FBR] ❌ SOAP fault:", faultMsg);
      return;
    }

    // ── FBR validation rejection (200 OK but statusCode "01") ────────────
    if (data?.validationResponse?.statusCode === "01") {
      const errMsg = data.validationResponse.error || "FBR validation failed";
      console.error(`[FBR] ❌ Validation rejected [${data.validationResponse.errorCode}]:`, errMsg);
      await SaleModel.findByIdAndUpdate(sale._id, {
        fbrStatus:      "failed",
        fbrError:       `[${data.validationResponse.errorCode}] ${errMsg}`,
        fbrSubmittedAt: new Date(),
      });
      return;
    }

    // ── HTTP error ────────────────────────────────────────────────────────
    if (!res.ok) {
      const errMsg = data?.message || data?.error || `HTTP ${res.status}`;
      console.error("[FBR] ❌ HTTP error:", errMsg);
      await SaleModel.findByIdAndUpdate(sale._id, {
        fbrStatus:      "failed",
        fbrError:       errMsg,
        fbrSubmittedAt: new Date(),
      });
      return;
    }

    // ── Extract invoice number ────────────────────────────────────────────
    console.log("[FBR] ✅ HTTP OK — extracting invoice number...");

    const fbrInvoiceNo =
      data?.invoiceNumber    ||
      data?.InvoiceNumber    ||
      data?.invoice_number   ||
      data?.FBRInvoiceNumber ||
      null;

    console.log("[FBR] FBR invoice number:", fbrInvoiceNo);

    if (!fbrInvoiceNo) {
      console.warn("[FBR] ⚠️  200 OK but no invoice number in response. Full body:", raw);
      await SaleModel.findByIdAndUpdate(sale._id, {
        fbrStatus:      "failed",
        fbrError:       "Submitted but no FBR invoice number returned. Check raw logs.",
        fbrSubmittedAt: new Date(),
      });
      return;
    }

    // ── Generate QR + upload to Cloudinary ───────────────────────────────
    // Non-fatal: if QR upload fails the sale is still marked submitted
    let fbrQrUrl    = `${fbrInvoiceNo}`; // fallback
    let fbrQrCdnUrl = null;

    try {
      console.log("[FBR] Generating QR and uploading to Cloudinary...");
      ({ fbrQrUrl, fbrQrCdnUrl } = await uploadQRToCloudinary(fbrInvoiceNo));
      console.log("[FBR] ✅ QR uploaded:", fbrQrCdnUrl);
    } catch (qrErr) {
      console.error("[FBR] ⚠️  QR upload failed (non-fatal):", qrErr.message);
      // fbrQrUrl already set to fallback above, fbrQrCdnUrl stays null
    }

    // ── Persist everything ────────────────────────────────────────────────
    await SaleModel.findByIdAndUpdate(sale._id, {
      fbrStatus:      "submitted",
      fbrInvoiceNo,
      fbrQrUrl,       // https://invoice.fbr.gov.pk/<fbrInvoiceNo>
      fbrQrCdnUrl,    // https://res.cloudinary.com/.../qr_<fbrInvoiceNo>.png  (null if upload failed)
      fbrSubmittedAt: new Date(),
      fbrError:       null,
    });

    console.log(`[FBR] ✅ Done. Invoice: ${sale.invoiceNumber} | FBR No: ${fbrInvoiceNo} | QR: ${fbrQrCdnUrl}`);

  } catch (err) {
    console.error("\n[FBR] 🔥 Unexpected error");
    console.error("[FBR] Name  :", err.name);
    console.error("[FBR] Msg   :", err.message);
    console.error("[FBR] Cause :", err.cause);
    console.error("[FBR] Stack :", err.stack);

    try {
      await SaleModel.findByIdAndUpdate(sale._id, {
        fbrStatus:      "failed",
        fbrError:       err.message,
        fbrSubmittedAt: new Date(),
      });
    } catch (updateErr) {
      console.error("[FBR] Failed to save error state:", updateErr.message);
    }
  }

  console.log("[FBR] ═══════════════════════════════════════════════\n");
}