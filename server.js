
import express, { Router } from "express";
import cookieParser from "cookie-parser";
import "dotenv/config";
import cors from "cors";
import connectDB from "./config/mongodb.js";
import saleRoutes from "./routes/sale.routes.js"; 
import salesReport from "./routes/report.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js"
import stockRoutes from "./routes/stock.routes.js"
import branchRouter from "./routes/branch.routes.js"

//Bulk Routes
import bulkStockRoutes from "./routes/bulkStock.routes.js";
import bulkSaleRoutes from "./routes/bulkSale.routes.js";
import posBulkSaleRoutes from "./routes/posBulkSale.Routes.js";

import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import morgan from "morgan";
import cron from "node-cron";

import debugRoute from "./routes/utilityRoutes.js";


//MOST IMP INSHALLAH WILL WORK
import fbrRouter from './routes/fbr-route.js';

//Backup
import { runBackup } from "./utils/backup.js";

// Connect to MongoDB
connectDB();
const app = express();
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_2,
  process.env.FBR_CLIENT_URL,
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.set("trust proxy", 1);

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

app.use("/api/branch", branchRouter)

app.use("/api/sale", saleRoutes);
app.use("/api/sale/bulk", bulkSaleRoutes);
app.use("/api/pos-sale/bulk", posBulkSaleRoutes);

app.use("/api/report", salesReport);

app.use("/api/purchase", purchaseRoutes)

app.use("/api/stock", stockRoutes)
app.use("/api/stock/bulk", bulkStockRoutes);



app.use('/fbr', fbrRouter);
// Base route
app.get("/", (req, res) => {
  res.send("I am alive");
});


app.use("/api/debug", debugRoute);


//keep server alive with cron job 
const url = 'https://api.invexopro.com';
cron.schedule('* * * * *', async () => {
  try {
    const res = await fetch(`${url}`);
    const text = await res.text();
    console.log(new Date().toISOString(), 'cron ping response:', text);
  } catch (err) {
    console.error(new Date().toISOString(), 'cron ping failed:', err);
  }
}, { timezone: 'Asia/Karachi' });

(async () => {
  try {
    const res = await runBackup();
    console.log(res);
  } catch (err) {
    console.error("Backup failed:", err.message);
    process.exit(1);
  }
})();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
