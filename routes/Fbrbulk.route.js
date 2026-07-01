import express from "express";
import { bulkSubmitToFBR } from "../controllers/fbrBulkSubmit.controller.js"; // adjust path
import userAuth from "../middleware/userAuth.js";
const router = express.Router();

// POST /api/sale/fbr/submit-bulk
// Body: { saleIds: string[] }
// Auth: bearer token / session (verifyToken sets req.userId)
router.post("/fbr/submit-bulk", userAuth, bulkSubmitToFBR);

export default router;