import express from "express";
import {
  getSalesReport,
  getPurchasesReport,
  getStockReport,
} from "../controllers/report.controller.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

// ── Sales ─────────────────────────────────────────────────────────────────────
router.post("/sales", userAuth, getSalesReport);

// ── Purchases ─────────────────────────────────────────────────────────────────
router.post("/purchases", userAuth, getPurchasesReport);

// ── Stock ─────────────────────────────────────────────────────────────────────
router.post("/stock", userAuth, getStockReport);

export default router;