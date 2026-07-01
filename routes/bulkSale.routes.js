import express from "express";
import multer from "multer";
import userAuth from "../middleware/userAuth.js";
import { bulkSalePreview, bulkSaleConfirm } from "../controllers/bulkSale.controller.js";

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

router.post("/preview", userAuth, upload.single("file"), bulkSalePreview);
router.post("/confirm", userAuth, upload.single("file"), bulkSaleConfirm);

export default router;