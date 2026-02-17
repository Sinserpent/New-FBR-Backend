import express from "express";
import { getSaleByInvoice, getSalesReport } from "../controllers/report.controller.js";

const router = express.Router();

router.get("/", getSalesReport);
router.get("/invoice/:invoiceNumber", getSaleByInvoice);


export default router;
