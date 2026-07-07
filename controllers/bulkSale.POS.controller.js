import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import SaleModel from "../models/sale.model.POS.js";
import Branch from "../models/branch.model.js";

// ── Required CSV columns ──────────────────────────────────────────────────────
const REQUIRED_COLUMNS = [
  "saledate", "customername", "hscode", "companyname",
  "itemdescription", "location", "rate", "qty",
  "amount", "gstamount", "netamount", "discount",
  "salemethod", "customertype", "transportationtype", "saletype",
];

// ── Valid enum values ─────────────────────────────────────────────────────────
const VALID = {
  salemethod:               ["cash", "credit", "card"],
  customertype:             ["regular", "walking", "wholesale"],
  transportationtype:       ["pickup", "delivery", "courier"],
  saletype:                 ["retail", "wholesale", "bulk"],
  fbrbuyerregistrationtype: ["registered", "unregistered"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseFile = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
};

const normalizeRow = (row) => {
  const normalized = {};
  for (const key of Object.keys(row)) {
    normalized[key.trim().toLowerCase().replace(/\s+/g, "")] = row[key];
  }
  return normalized;
};

const validateRow = (row, index) => {
  const errors = [];
  const rowNum = index + 2;

  for (const field of REQUIRED_COLUMNS) {
    if (row[field] === undefined || row[field] === "")
      errors.push(`Row ${rowNum}: missing "${field}"`);
  }

  const numericFields = [
    "rate", "qty", "amount", "gstamount", "netamount", "discount",
    "gstrate", "amountreceived",
    // fbr numeric sub-fields
    "fixednotifiedvalueorretailprice", "extratax", "furthertax",
    "fedpayable", "salestaxwithheldatsource",
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

const parseAndValidate = (buffer) => {
  const rows = parseFile(buffer);
  if (rows.length === 0) throw new Error("File is empty");

  const allErrors = [];
  const normalized = rows.map((row, i) => {
    const n = normalizeRow(row);
    allErrors.push(...validateRow(n, i));
    return n;
  });

  return { normalized, errors: allErrors };
};

// ── Map normalized row → sale product ────────────────────────────────────────
// NOTE: totalAmount is required by the Product schema but has no dedicated
// column in the template. Defaulting it to `amount` — confirm this is correct.
// NOTE: "rate" is not part of the Product schema — kept here only because the
// preview step returns raw (unsaved) objects; it will be silently dropped by
// Mongoose once actually saved via confirm. Flag if you want it schema-backed.
const toProduct = (r) => ({
  itemCode:        r["itemcode"] ? String(r["itemcode"]) : "",
  HSCode:          String(r["hscode"]),
  companyName:     String(r["companyname"]),
  itemDescription: String(r["itemdescription"]),
  location:        String(r["location"]),
  rate:            Number(r["rate"]),
  totalAmount:     Number(r["amount"]), // defaulted from "amount" — confirm
  qty:             Number(r["qty"]),
  amount:          Number(r["amount"]),
  gstRate:         Number(r["gstrate"]  || 0),
  gstAmount:       Number(r["gstamount"]),
  discount:        Number(r["discount"] || 0),
  netAmount:       Number(r["netamount"]),
  refUsin:         r["refusin"] ? String(r["refusin"]) : null,
  fbr: {
    uoM:                             r["uom"]             ? String(r["uom"])             : "Numbers, pieces, units",
    fbrSaleType:                     r["fbrsaletype"]      ? String(r["fbrsaletype"])      : "Goods at standard rate (default)",
    sroScheduleNo:                   r["sroscheduleno"]    ? String(r["sroscheduleno"])    : "",
    sroItemSerialNo:                 r["sroitemserialno"]  ? String(r["sroitemserialno"])  : "",
    fixedNotifiedValueOrRetailPrice: Number(r["fixednotifiedvalueorretailprice"] || 0),
    extraTax:                        Number(r["extratax"]  || 0),
    furtherTax:                      Number(r["furthertax"] || 0),
    fedPayable:                      Number(r["fedpayable"] || 0),
    salesTaxWithheldAtSource:        Number(r["salestaxwithheldatsource"] || 0),
  },
});

// ── Group rows by saleDate + customerName → one Sale doc per group ────────────
const groupRowsIntoSales = (normalized, userId, branchId, bulkUploadId) => {
  const groups = {};

  for (const r of normalized) {
    const key = `${r["saledate"]}__${r["customername"]}`;

    if (!groups[key]) {
      const amountReceived = Number(r["amountreceived"] || 0);

      // customerPhone: prefer explicit "customerphone" column, fall back to
      // legacy "mobile" column so old templates/files still populate it.
      const customerPhone = r["customerphone"]
        ? String(r["customerphone"])
        : (r["mobile"] ? String(r["mobile"]) : undefined);

      const fbrBuyerRegistrationType = r["fbrbuyerregistrationtype"]
        ? (String(r["fbrbuyerregistrationtype"]).toLowerCase() === "registered" ? "Registered" : "Unregistered")
        : undefined;

      groups[key] = {
        userId,
        branchId,
        bulkUploadId,
        isBulkUpload:  true,
        fbrStatus:     "pending",
        saleStatus:    "confirm",

        saleMethod:         String(r["salemethod"]).toLowerCase(),
        customerType:       String(r["customertype"]).toLowerCase(),
        transportationType: String(r["transportationtype"]).toLowerCase(),
        saleType:           String(r["saletype"]).toLowerCase(),

        // POS-specific
        usin:          r["usin"] ? String(r["usin"]) : undefined,
        customerPhone,

        // customer / buyer info
        saleDate:                 new Date(r["saledate"]),
        customerName:             String(r["customername"]),
        cnicOrNtn:                r["cnicorntn"]       ? String(r["cnicorntn"])       : undefined,
        companyAddress:           r["companyaddress"]  ? String(r["companyaddress"])  : undefined,
        fbrBuyerRegistrationType,
        salesman:     r["salesman"]    ? String(r["salesman"])    : undefined,
        saleNote:     r["salenote"]    ? String(r["salenote"])    : undefined,
        bankAccount:  r["bankaccount"] ? String(r["bankaccount"]) : undefined,

        products: [],

        _totals: { totalQuantity: 0, totalAmount: 0, totalGstAmount: 0, totalDiscount: 0, totalNetAmount: 0 },
        _amountReceived: amountReceived,
      };
    }

    const product = toProduct(r);
    groups[key].products.push(product);

    groups[key]._totals.totalQuantity  += product.qty;
    groups[key]._totals.totalAmount    += product.amount;
    groups[key]._totals.totalGstAmount += product.gstAmount;
    groups[key]._totals.totalDiscount  += product.discount;
    groups[key]._totals.totalNetAmount += product.netAmount;
  }

  return Object.values(groups).map(({ _totals, _amountReceived, ...sale }) => {
    const remaining = _totals.totalNetAmount - _amountReceived;
    let paymentStatus = "Unpaid";
    if (_amountReceived >= _totals.totalNetAmount) paymentStatus = "Fully Paid";
    else if (_amountReceived > 0)                  paymentStatus = "Partially Paid";

    return {
      ...sale,
      totals: _totals,
      paymentDetails: {
        totalNetAmount:  _totals.totalNetAmount,
        amountReceived:  _amountReceived,
        remainingAmount: remaining < 0 ? 0 : remaining,
        changeAmount:    remaining < 0 ? Math.abs(remaining) : 0,
        paymentStatus,
      },
    };
  });
};

// ── POST /api/pos-sale/bulk/preview ───────────────────────────────────────────
export const posBulkSalePreview = (req, res) => {
  try {
    const { branchId } = req.body;

    if (!branchId) return res.status(400).json({ message: "branchId is required" });
    if (!req.file)  return res.status(400).json({ message: "File is required" });

    const { normalized, errors } = parseAndValidate(req.file.buffer);
    if (errors.length > 0)
      return res.status(422).json({ message: "Validation errors", errors });

    const sales = groupRowsIntoSales(normalized, null, null, null);

    return res.json({
      totalRows:  normalized.length,
      totalSales: sales.length,
      preview:    sales.slice(0, 10).map(s => ({
        saleDate:                 s.saleDate,
        customerName:             s.customerName,
        customerPhone:            s.customerPhone,
        cnicOrNtn:                s.cnicOrNtn,
        companyAddress:           s.companyAddress,
        fbrBuyerRegistrationType: s.fbrBuyerRegistrationType,
        usin:                     s.usin,
        saleMethod:               s.saleMethod,
        customerType:             s.customerType,
        transportationType:       s.transportationType,
        saleType:                 s.saleType,
        products:                 s.products,
        totals:                   s.totals,
      })),
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /api/pos-sale/bulk/confirm ───────────────────────────────────────────
export const posBulkSaleConfirm = async (req, res) => {
  try {
    const userId     = req.userId;
    const { branchId } = req.body;

    if (!branchId) return res.status(400).json({ message: "branchId is required" });
    if (!req.file)  return res.status(400).json({ message: "File is required" });

    const branch = await Branch.findOne({ _id: branchId, userId });
    if (!branch) return res.status(404).json({ message: "Branch not found" });

    const { normalized, errors } = parseAndValidate(req.file.buffer);
    if (errors.length > 0)
      return res.status(422).json({ message: "Validation errors", errors });

    const bulkUploadId = uuidv4();
    const sales = groupRowsIntoSales(normalized, userId, branchId, bulkUploadId);

    const saved = [];
    const failed = [];

    for (const saleData of sales) {
      try {
        const doc = new SaleModel(saleData);
        await doc.save();
        saved.push(doc._id);
      } catch (err) {
        failed.push({
          customerName: saleData.customerName,
          saleDate:     saleData.saleDate,
          error:        err.message,
        });
      }
    }

    return res.status(201).json({
      success:      true,
      message:      "Bulk sale uploaded successfully",
      bulkUploadId,
      totalSaved:   saved.length,
      totalFailed:  failed.length,
      ...(failed.length > 0 && { failed }),
    });

  } catch (err) {
    return res.status(500).json({ message: "Failed to save bulk sales", error: err.message });
  }
};