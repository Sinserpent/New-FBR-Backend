// models/sale.model.js
import mongoose from "mongoose"
import Counter from "./counter.model.js"

const Product = new mongoose.Schema({
  HSCode: { type: String, trim: true },
  companyName:     { type: String, trim: true },  // ✅ NEW
  itemDescription: { type: String, trim: true },
  location: { type: String, trim: true },
  rate: { type: Number, required: true },
  qty: { type: Number, required: true },
  amount: { type: Number, required: true },
  gstRate: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  netAmount: { type: Number, required: true }
}, { _id: false })

const Totals = new mongoose.Schema({
  totalQuantity: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  totalGstAmount: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  totalNetAmount: { type: Number, default: 0 }
}, { _id: false })

const PaymentDetails = new mongoose.Schema({
  totalNetAmount: { type: Number, required: true },
  amountReceived: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  changeAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ["Fully Paid", "Partially Paid", "Unpaid"],
    default: "Unpaid"
  }
}, { _id: false })

const Sale = new mongoose.Schema({
  // 🔐 OWNER
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  invoiceNumber: { type: Number },

  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
    index: true
  },

  branchExists: {
    type: Boolean,
    default: true
  },

  saleStatus: {
    type: String,
    enum: ["confirm", "pending", "cancelled"],
    default: "pending"
  },

  saleMethod: {
    type: String,
    enum: ["cash", "credit", "card"],
    required: true
  },

  customerType: {
    type: String,
    enum: ["regular", "walking", "wholesale"],
    required: true
  },

  transportationType: {
    type: String,
    enum: ["pickup", "delivery", "courier"],
    required: true
  },

  saleType: {
    type: String,
    enum: ["retail", "wholesale", "bulk"],
    required: true
  },

  saleDate: { type: Date, default: Date.now },
  saleNote: { type: String, trim: true },
  salesman: { type: String, trim: true },

  // FBR / Customer Info
  customerName: { type: String, trim: true },
  cnic: { type: String, trim: true },
  mobile: { type: String, trim: true },
  ntn: { type: String, trim: true },

  // Financials
  //cashReceived: { type: Number, default: 0 },
  bankAccount: { type: String, trim: true },

  // Invoice snapshot
  products: { type: [Product], required: true },

  totals: { type: Totals, required: true },
  paymentDetails: { type: PaymentDetails, required: true }

}, { timestamps: true })

// 🔒 Invoice number unique per user
Sale.index(
  { userId: 1, invoiceNumber: 1 },
  { unique: true }
)

// Auto-increment per user
Sale.pre("save", async function (next) {
  if (!this.isNew) return next()

  const counter = await Counter.findOneAndUpdate(
    { userId: this.userId, type: "invoice" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  console.log(counter.seq);
  this.invoiceNumber = counter.seq;

  // Padded string for display
  this.counter = String(counter.seq).padStart(6, "0");

  next()
})


export default mongoose.model("Sale", Sale)
