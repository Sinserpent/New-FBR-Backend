// routes/debug.route.js
import express from "express";
const router = express.Router();

router.get("/my-ip", async (req, res) => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    res.json({
      vpsIp: data.ip,
      requestIp: req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;