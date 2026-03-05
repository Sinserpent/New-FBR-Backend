import express from "express";
import cookieParser from "cookie-parser";
import "dotenv/config";
import cors from "cors";
import connectDB from "./config/mongodb.js";
import saleRoutes from "./routes/sale.routes.js"; 
import salesReport from "./routes/report.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js"
import stockRoutes from "./routes/stock.routes.js"
import branchRouter from "./routes/branch.routes.js"

import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import morgan from "morgan";
import cron from "node-cron";


//MOST IMP INSHALLAH WILL WORK
import fbrRouter from './routes/fbr-route.js';

// Connect to MongoDB
connectDB();
const app = express();
const allowedOrigins = [
  process.env.CLIENT_URL,
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

app.use("/api/sale", saleRoutes);
app.use("/api/report", salesReport);

app.use("/api/branch", branchRouter)

app.use("/api/purchase", purchaseRoutes)
app.use("/api/stock", stockRoutes)


app.use('/fbr', fbrRouter);
// Base route
app.get("/", (req, res) => {
  res.send("I am alive");
});


//RENDER HEALTH CHECK
app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});


//keep server alive with cron job 
const url = 'https://ensures-allowed-prospect-stomach.trycloudflare.com';
cron.schedule('* * * * *', async () => {
  try {
    const res = await fetch(`${url}`);
    const text = await res.text();
    console.log(new Date().toISOString(), 'cron ping response:', text);
  } catch (err) {
    console.error(new Date().toISOString(), 'cron ping failed:', err);
  }
}, { timezone: 'Asia/Karachi' });

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
