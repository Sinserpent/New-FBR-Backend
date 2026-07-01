import * as XLSX from "xlsx";
import { Stock } from "../models/stock.model.js";
import Branch from "../models/branch.model.js";

// ── Helper: parse buffer → rows ───────────────────────────────────────────────
export const parseFile = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
};

// ── Helper: normalize header keys ────────────────────────────────────────────
export const normalizeRow = (row) => {
  const normalized = {};
  for (const key of Object.keys(row)) {
    normalized[key.trim().toLowerCase().replace(/\s+/g, "")] = row[key];
  }
  return normalized;
};

// ── Helper: validate a single row ────────────────────────────────────────────
export const validateRow = (row, index) => {
  const errors = [];
  const required = ["hscode", "companyname", "itemdescription", "location", "quantity", "minstocklevel"];
  for (const field of required) {
    if (row[field] === undefined || row[field] === "")
      errors.push(`Row ${index + 2}: missing "${field}"`);
  }
  if (row["quantity"] !== "" && isNaN(Number(row["quantity"])))
    errors.push(`Row ${index + 2}: quantity must be a number`);
  if (row["minstocklevel"] !== "" && isNaN(Number(row["minstocklevel"])))
    errors.push(`Row ${index + 2}: minStockLevel must be a number`);
  return errors;
};

// ── Helper: normalize + validate all rows ────────────────────────────────────
export const parseAndValidate = (buffer) => {
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

// ── POST /api/stock/bulk/preview ──────────────────────────────────────────────
export const bulkStockPreview = (req, res) => {
  try {
    const { branchId } = req.body;
    if (!branchId) return res.status(400).json({ message: "branchId is required" });
    if (!req.file)  return res.status(400).json({ message: "File is required" });

    const { normalized, errors } = parseAndValidate(req.file.buffer);

    if (errors.length > 0)
      return res.status(422).json({ message: "Validation errors", errors });

    return res.json({
      totalRows: normalized.length,
      preview: normalized.slice(0, 10).map(r => ({
        HSCode:          r["hscode"],
        companyName:     r["companyname"],
        itemDescription: r["itemdescription"],
        location:        r["location"],
        quantity:        Number(r["quantity"]),
        minStockLevel:   Number(r["minstocklevel"]),
      })),
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ── POST /api/stock/bulk/confirm ──────────────────────────────────────────────
export const bulkStockConfirm = async (req, res) => {
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

    // Group by HSCode + companyName
    const groups = {};
    for (const r of normalized) {
      const key = `${r["hscode"]}__${r["companyname"]}`;
      if (!groups[key]) {
        groups[key] = {
          HSCode:      r["hscode"],
          companyName: r["companyname"],
          items:       [],
        };
      }
      groups[key].items.push({
        itemDescription: r["itemdescription"],
        location:        r["location"],
        quantity:        Number(r["quantity"]),
        minStockLevel:   Number(r["minstocklevel"]),
      });
    }

    const results = { created: 0, updated: 0, itemsAdded: 0, itemsIncremented: 0 };

    for (const group of Object.values(groups)) {
      const existing = await Stock.findOne({
        userId,
        branchId,
        HSCode:      group.HSCode,
        companyName: group.companyName,
      });

      if (!existing) {
        await Stock.create({
          userId,
          branchId,
          HSCode:      group.HSCode,
          companyName: group.companyName,
          items:       group.items,
        });
        results.created++;
        results.itemsAdded += group.items.length;
      } else {
        for (const newItem of group.items) {
          const existingIndex = existing.items.findIndex(
            i => i.itemDescription === newItem.itemDescription
          );
          if (existingIndex > -1) {
            existing.items[existingIndex].quantity += newItem.quantity;
            results.itemsIncremented++;
          } else {
            existing.items.push(newItem);
            results.itemsAdded++;
          }
        }
        await existing.save();
        results.updated++;
      }
    }

    return res.status(201).json({
      success: true,
      message: "Bulk stock uploaded successfully",
      results,
    });

  } catch (err) {
    return res.status(500).json({ message: "Failed to save stock", error: err.message });
  }
};