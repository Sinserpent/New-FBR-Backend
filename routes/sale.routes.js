import express from "express";
import {
  createSale,
  getAllSales,
  getSaleById,
  updateSale,
  deleteSale
} from "../controllers/sale.controller.js";
import userAuth from "../middleware/userAuth.js";
import { bulkSubmitToFBR } from "../controllers/Fbrbulksubmit.controller.js";

const router = express.Router();

router.post("/create", userAuth ,createSale);
router.get("/getAll", userAuth ,getAllSales);
router.get("/getSaleById:id", getSaleById);
router.put("/update/:id", userAuth,updateSale);
router.delete("/delete/:id", userAuth, deleteSale);

router.post("/fbr/submit-bulk", userAuth, bulkSubmitToFBR);

export default router;
