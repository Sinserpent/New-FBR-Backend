import express from "express";
import userAuth from "../middleware/userAuth.js";
import { createStock, getMyPurchases } from "../controllers/purchase.controller.js";

const router = express.Router();

router.post("/create", userAuth, createStock );
//router.put("/update", userAuth, updatePurchase);
router.get("/get", userAuth, getMyPurchases);


export default router;
