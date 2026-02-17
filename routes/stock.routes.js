import express from "express";
import userAuth from "../middleware/userAuth.js";
import { createStock, deleteStock, getUserStock, updateStock } from "../controllers/stock.controller.js";

const router = express.Router();

router.put("/create", userAuth, createStock);
router.put("/update", userAuth, updateStock);
router.get("/get", userAuth, getUserStock);
router.delete("/delete", userAuth, deleteStock);


export default router;
