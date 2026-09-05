import express from "express";
import {
  createBuyer,
  getBuyers,
  getBuyerById,
  updateBuyer,
  deleteBuyer,
} from "../controllers/buyer.controller.js";
import userAuth from "../middleware/userAuth.js";

const router = express.Router();

router.post("/create", userAuth, createBuyer);
router.get("/get", userAuth, getBuyers);
router.get("/getById/:id", userAuth, getBuyerById);
router.put("/update/:id", userAuth, updateBuyer);
router.delete("/delete/:id", userAuth, deleteBuyer);

export default router;
