import express from "express";
import {
  createSale,
  getAllSales,
  getSaleById,
  updateSale,
  deleteSale
} from "../controllers/sale.controller.js";
import {
  getAllPosSales,
  getPosSaleById,
  updatePosSale,
  deletePosSale,
  createPosSale
} from "../controllers/sale.controller.POS.js";
import userAuth from "../middleware/userAuth.js";
import { bulkSubmitToFBR } from "../controllers/Fbrbulksubmit.controller.js";
import { bulkSubmitToFBRPOS } from "../controllers/FbrPosBulkSubmit.controller.js";

const router = express.Router();

router.post("/create", userAuth ,createSale);
router.get("/getAll", userAuth ,getAllSales);
router.get("/getSaleById:id", getSaleById);
router.put("/update/:id", userAuth,updateSale);
router.delete("/delete/:id", userAuth, deleteSale);

router.post("/Pos/create", userAuth ,createPosSale);
router.get("/Pos/getAll", userAuth ,getAllPosSales);
router.get("/Pos/getSaleById:id", getPosSaleById);
router.put("/Pos/update/:id", userAuth,updatePosSale);
router.delete("/Pos/delete/:id", userAuth, deletePosSale);

router.post("/fbr/submit-bulk", userAuth, bulkSubmitToFBR);
router.post("/fbr/Pos/submit-bulk", userAuth, bulkSubmitToFBRPOS);

export default router;
