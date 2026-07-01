import express from "express";
import userAuth from "../middleware/userAuth.js";
import { createStock, getMyPurchases } from "../controllers/purchase.controller.js";
import { bulkPurchaseConfirm, bulkPurchasePreview, deleteBulkPurchase } from "../controllers/Bulkpurchase.controller.js";
import multer from "multer";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only .xlsx, .xls, or .csv files are allowed"));
  },
});

router.post("/create", userAuth, createStock );
//router.put("/update", userAuth, updatePurchase);
router.get("/get", userAuth, getMyPurchases);
router.post("/bulk/preview", userAuth, upload.single("file"), bulkPurchasePreview);
router.post("/bulk/confirm", userAuth, upload.single("file"), bulkPurchaseConfirm);
router.delete("/bulk/:bulkPurchaseId",userAuth, deleteBulkPurchase);


export default router;
