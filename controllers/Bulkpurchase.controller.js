import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import { Purchase } from "../models/purchase.model.js";
import Branch from "../models/branch.model.js";
import Counter from "../models/counter.model.js";

// ── Required columns ──────────────────────────────────────────────────────────
const REQUIRED_COLUMNS = [
  "invoicenumber", "purchasedate", "sellername", "ntn_cnic",
  "businessaddress", "companyname", "hscode", "purchasestatus",
  "purchasemethod", "paymentstatus", "itemdescription", "location",
  "quantity", "rate", "amount", "gstrate", "gstamount",
  "discount", "netamount", "amountpaid", "remainingamount",
];

// ── Valid enum values ─────────────────────────────────────────────────────────
const VALID = {
  purchasestatus: ["pending", "completed", "cancelled"],
  purchasemethod: ["cash", "credit", "payment"],
  paymentstatus:  ["fully paid", "partially paid", "unpaid"],
};

// ── Helper: get next PO number for this user → "PO-00001" ────────────────────
const getNextPONumber = async (userId) => {
  console.log(`[getNextPONumber] userId: ${userId}, type: "purchase"`);
  const counter = await Counter.findOneAndUpdate(
    { userId, type: "purchase" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const poNumber = `PO-${String(counter.seq).padStart(5, "0")}`;
  console.log(`[getNextPONumber] Generated: ${poNumber} (seq: ${counter.seq})`);
  return poNumber;
};

// ── Helper: parse buffer → rows ───────────────────────────────────────────────
const parseFile = (buffer) => {
  console.log("[parseFile] Reading workbook from buffer...");
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  console.log("[parseFile] Sheet names:", workbook.SheetNames);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  console.log(`[parseFile] Parsed ${rows.length} raw rows`);
  return rows;
};

// ── Helper: normalize header keys (lowercase, no spaces) ─────────────────────
const normalizeRow = (row) => {
  const out = {};
  for (const key of Object.keys(row)) {
    out[key.trim().toLowerCase().replace(/\s+/g, "")] = row[key];
  }
  return out;
};

// ── Helper: validate a single row ────────────────────────────────────────────
const validateRow = (row, index) => {
  const errors = [];
  const rowNum  = index + 2;

  for (const field of REQUIRED_COLUMNS) {
    if (row[field] === undefined || row[field] === "")
      errors.push(`Row ${rowNum}: missing "${field}"`);
  }

  const numericFields = [
    "quantity", "rate", "amount", "gstrate", "gstamount",
    "discount", "netamount", "amountpaid", "remainingamount",
  ];
  for (const field of numericFields) {
    if (row[field] !== undefined && row[field] !== "" && isNaN(Number(row[field])))
      errors.push(`Row ${rowNum}: "${field}" must be a number`);
  }

  for (const [field, allowed] of Object.entries(VALID)) {
    if (row[field] && !allowed.includes(String(row[field]).toLowerCase()))
      errors.push(`Row ${rowNum}: "${field}" must be one of: ${allowed.join(", ")}`);
  }

  return errors;
};

// ── Helper: normalize + validate all rows ────────────────────────────────────
const parseAndValidate = (buffer) => {
  const rows = parseFile(buffer);
  if (rows.length === 0) throw new Error("File is empty");

  console.log("[parseAndValidate] Sample raw row[0] keys:", Object.keys(rows[0]));

  const allErrors  = [];
  const normalized = rows.map((row, i) => {
    const n         = normalizeRow(row);
    const rowErrors = validateRow(n, i);
    if (rowErrors.length > 0) console.warn(`[validateRow] Row ${i + 2} errors:`, rowErrors);
    allErrors.push(...rowErrors);
    return n;
  });

  console.log(`[parseAndValidate] ${normalized.length} rows, ${allErrors.length} error(s)`);
  return { normalized, errors: allErrors };
};

// ── Helper: normalize paymentStatus casing ───────────────────────────────────
const normalizePaymentStatus = (val) => {
  const map = {
    "fully paid":     "Fully Paid",
    "partially paid": "Partially Paid",
    "unpaid":         "Unpaid",
  };
  return map[String(val).toLowerCase()] || "Fully Paid";
};

// ── Helper: parse date safely ─────────────────────────────────────────────────
const parseDate = (val) => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
};

// ── Helper: map a row into a purchaseItem sub-doc ─────────────────────────────
const toItem = (r) => ({
  itemDescription: String(r["itemdescription"]).trim(),
  location:        String(r["location"]).trim(),
  quantity:        Number(r["quantity"])  || 0,
  rate:            Number(r["rate"])      || 0,
  amount:          Number(r["amount"])    || 0,
  gstRate:         Number(r["gstrate"])   || 0,
  gstAmount:       Number(r["gstamount"]) || 0,
  discount:        Number(r["discount"])  || 0,
  netAmount:       Number(r["netamount"]) || 0,
});

// ── Helper: group rows by Excel invoiceNumber → one purchase doc per group ────
// Invoice-level fields come from the FIRST row of each group.
// financials (rate, quantity, amount, etc.) are SUMMED across all items so the
// top-level totals match the schema requirement.
const groupRowsIntoInvoices = (normalized, userId, branchId, bulkPurchaseId) => {
  const map = new Map(); // key = excel invoiceNumber (used only for grouping)

  for (const r of normalized) {
    const key = String(r["invoicenumber"]).trim();

    if (!map.has(key)) {
      map.set(key, {
        userId,
        branchId,
        bulkPurchaseId,
        // invoiceNumber will be replaced with PO-XXXXX during confirm
        _excelInvoiceNo: key,

        // Invoice-level fields from first row
        purchaseDate:    parseDate(r["purchasedate"]),
        sellerName:      String(r["sellername"]).trim(),
        NTN_CNIC:        String(r["ntn_cnic"]).trim(),
        businessAddress: String(r["businessaddress"]).trim(),
        companyName:     String(r["companyname"]).trim(),
        HSCode:          String(r["hscode"]).trim(),
        purchaseStatus:  String(r["purchasestatus"]).toLowerCase(),
        purchaseMethod:  String(r["purchasemethod"]).toLowerCase(),
        paymentStatus:   normalizePaymentStatus(r["paymentstatus"]),

        // Primary item ref (first item's description/location — schema requires these)
        itemDescription: String(r["itemdescription"]).trim(),
        location:        String(r["location"]).trim(),

        // Payment totals from first row (these are invoice-level in the Excel)
        amountPaid:      Number(r["amountpaid"])      || 0,
        remainingAmount: Number(r["remainingamount"]) || 0,

        items: [],

        // Running totals — summed across all items
        _qty:       0,
        _rate:      0,  // will use first item's rate as the "primary" rate
        _amount:    0,
        _gstRate:   Number(r["gstrate"]) || 0,  // take from first row
        _gstAmount: 0,
        _discount:  0,
        _netAmount: 0,
        _firstRate: Number(r["rate"]) || 0,
      });
    }

    const group = map.get(key);
    const item  = toItem(r);
    group.items.push(item);

    // Accumulate totals
    group._qty       += item.quantity;
    group._amount    += item.amount;
    group._gstAmount += item.gstAmount;
    group._discount  += item.discount;
    group._netAmount += item.netAmount;
  }

  return Array.from(map.values()).map(({ _qty, _rate, _amount, _gstRate, _gstAmount, _discount, _netAmount, _firstRate, _excelInvoiceNo, ...purchase }) => ({
    ...purchase,
    _excelInvoiceNo,  // keep so we can log it
    // Top-level financial totals (schema required fields)
    quantity:  _qty,
    rate:      _firstRate,   // primary rate = first item's rate
    amount:    _amount,
    gstRate:   _gstRate,
    gstAmount: _gstAmount,
    discount:  _discount,
    netAmount: _netAmount,
  }));
};

// ── POST /api/purchase/bulk/preview ──────────────────────────────────────────
export const bulkPurchasePreview = (req, res) => {
  console.log("\n[bulkPurchasePreview] ── START ──────────────────────────────");
  console.log("[bulkPurchasePreview] Body:", req.body);
  console.log("[bulkPurchasePreview] File:", req.file
    ? { name: req.file.originalname, size: req.file.size }
    : "MISSING");

  try {
    const { branchId } = req.body;

    if (!branchId) {
      console.warn("[bulkPurchasePreview] REJECTED — branchId missing");
      return res.status(400).json({ message: "branchId is required" });
    }
    if (!req.file) {
      console.warn("[bulkPurchasePreview] REJECTED — file missing");
      return res.status(400).json({ message: "File is required" });
    }

    const { normalized, errors } = parseAndValidate(req.file.buffer);
    if (errors.length > 0) {
      console.warn(`[bulkPurchasePreview] REJECTED — ${errors.length} validation error(s)`);
      return res.status(422).json({ message: "Validation errors", errors });
    }

    // Group for preview (no userId/branchId needed yet)
    const invoices = groupRowsIntoInvoices(normalized, null, null, null);
    console.log(`[bulkPurchasePreview] Grouped into ${invoices.length} invoices from ${normalized.length} rows`);

    return res.json({
      totalRows:    normalized.length,
      invoiceCount: invoices.length,
      preview:      invoices.slice(0, 10).map(inv => ({
        invoiceNumber:   "PO-XXXXX (auto-assigned)",
        purchaseDate:    inv.purchaseDate,
        sellerName:      inv.sellerName,
        NTN_CNIC:        inv.NTN_CNIC,
        companyName:     inv.companyName,
        HSCode:          inv.HSCode,
        purchaseStatus:  inv.purchaseStatus,
        purchaseMethod:  inv.purchaseMethod,
        paymentStatus:   inv.paymentStatus,
        itemCount:       inv.items.length,
        items:           inv.items,
        quantity:        inv.quantity,
        amount:          inv.amount,
        gstAmount:       inv.gstAmount,
        discount:        inv.discount,
        netAmount:       inv.netAmount,
        amountPaid:      inv.amountPaid,
        remainingAmount: inv.remainingAmount,
      })),
    });

  } catch (err) {
    console.error("[bulkPurchasePreview] FATAL ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /api/purchase/bulk/confirm ──────────────────────────────────────────
// Uses .save() loop (not insertMany) so each doc gets its own PO number from
// the counter — mirrors the bulkSaleConfirm pattern exactly.
export const bulkPurchaseConfirm = async (req, res) => {
  console.log("\n[bulkPurchaseConfirm] ── START ──────────────────────────────");
  console.log("[bulkPurchaseConfirm] Body:", req.body);
  console.log("[bulkPurchaseConfirm] UserId:", req.userId);
  console.log("[bulkPurchaseConfirm] File:", req.file
    ? { name: req.file.originalname, size: req.file.size }
    : "MISSING");

  try {
    const userId       = req.userId;
    const { branchId } = req.body;

    if (!branchId) {
      console.warn("[bulkPurchaseConfirm] REJECTED — branchId missing");
      return res.status(400).json({ message: "branchId is required" });
    }
    if (!req.file) {
      console.warn("[bulkPurchaseConfirm] REJECTED — file missing");
      return res.status(400).json({ message: "File is required" });
    }

    console.log(`[bulkPurchaseConfirm] Looking up branch: ${branchId} for user: ${userId}`);
    const branch = await Branch.findOne({ _id: branchId, userId });
    if (!branch) {
      console.warn("[bulkPurchaseConfirm] REJECTED — branch not found");
      return res.status(404).json({ message: "Branch not found" });
    }
    console.log(`[bulkPurchaseConfirm] Branch found: "${branch.name}"`);

    const { normalized, errors } = parseAndValidate(req.file.buffer);
    if (errors.length > 0) {
      console.warn(`[bulkPurchaseConfirm] REJECTED — ${errors.length} validation error(s):`, errors);
      return res.status(422).json({ message: "Validation errors", errors });
    }

    const bulkPurchaseId = uuidv4();
    console.log(`[bulkPurchaseConfirm] bulkPurchaseId: ${bulkPurchaseId}`);

    const invoices = groupRowsIntoInvoices(normalized, userId, branchId, bulkPurchaseId);
    console.log(`[bulkPurchaseConfirm] ${normalized.length} rows grouped into ${invoices.length} invoices`);

    const saved  = [];
    const failed = [];

    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];

      // Generate our own PO number — ignore Excel's invoiceNumber entirely
      const poNumber = await getNextPONumber(userId);
      console.log(`[bulkPurchaseConfirm] Invoice ${i + 1}/${invoices.length} — Excel: "${invoice._excelInvoiceNo}" → assigned: "${poNumber}" (${invoice.items.length} item(s))`);

      const docData = {
        ...invoice,
        invoiceNumber: poNumber,
      };

      // Remove internal grouping key before saving
      delete docData._excelInvoiceNo;

      console.log(`[bulkPurchaseConfirm] Saving doc:`, {
        invoiceNumber:   docData.invoiceNumber,
        companyName:     docData.companyName,
        HSCode:          docData.HSCode,
        sellerName:      docData.sellerName,
        itemCount:       docData.items.length,
        quantity:        docData.quantity,
        netAmount:       docData.netAmount,
        purchaseMethod:  docData.purchaseMethod,
        paymentStatus:   docData.paymentStatus,
        bulkPurchaseId:  docData.bulkPurchaseId,
      });

      try {
        const doc = new Purchase(docData);
        await doc.save();
        console.log(`[bulkPurchaseConfirm] ✓ Saved _id: ${doc._id} → ${poNumber}`);
        saved.push({ id: doc._id, invoiceNumber: poNumber });
      } catch (saveErr) {
        console.error(`[bulkPurchaseConfirm] ✗ Failed to save invoice ${i + 1} (${poNumber}):`, saveErr.message);
        console.error("[bulkPurchaseConfirm] Full Mongoose error:", saveErr);
        failed.push({
          excelInvoiceNo: invoice._excelInvoiceNo,
          assignedPO:     poNumber,
          error:          saveErr.message,
        });
      }
    }

    console.log("[bulkPurchaseConfirm] ── DONE ─────────────────────────────");
    console.log(`[bulkPurchaseConfirm] Saved: ${saved.length}, Failed: ${failed.length}`);

    return res.status(201).json({
      success:      true,
      message:      "Bulk purchases uploaded successfully",
      bulkPurchaseId,
      totalSaved:   saved.length,
      totalFailed:  failed.length,
      ...(failed.length > 0 && { failed }),
    });

  } catch (err) {
    console.error("[bulkPurchaseConfirm] FATAL ERROR:", err);
    return res.status(500).json({ message: "Failed to save purchases", error: err.message });
  }
};

// ── DELETE /api/purchase/bulk/:bulkPurchaseId ─────────────────────────────────
export const deleteBulkPurchase = async (req, res) => {
  console.log("\n[deleteBulkPurchase] ── START ───────────────────────────────");
  const userId             = req.userId;
  const { bulkPurchaseId } = req.params;
  console.log(`[deleteBulkPurchase] userId: ${userId}, bulkPurchaseId: ${bulkPurchaseId}`);

  try {
    const result = await Purchase.deleteMany({ userId, bulkPurchaseId });
    console.log(`[deleteBulkPurchase] Deleted ${result.deletedCount} document(s)`);

    if (result.deletedCount === 0) {
      console.warn("[deleteBulkPurchase] No documents matched — returning 404");
      return res.status(404).json({ message: "No purchases found for this bulk upload ID" });
    }

    return res.json({
      success:      true,
      message:      `Deleted ${result.deletedCount} purchase(s) from bulk upload`,
      deletedCount: result.deletedCount,
    });

  } catch (err) {
    console.error("[deleteBulkPurchase] FATAL ERROR:", err);
    return res.status(500).json({ message: "Failed to delete bulk purchases", error: err.message });
  }
};