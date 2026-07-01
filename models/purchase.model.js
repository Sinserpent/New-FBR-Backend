//import mongoose from "mongoose";

////const purchaseSchema = new mongoose.Schema(
////  {
////    userId: {
////      type: mongoose.Schema.Types.ObjectId,
////      required: true,
////      ref: "user",
////    },
////    stockId: {
////      type: mongoose.Schema.Types.ObjectId,
////      required: true,
////      ref: "Stock",
////    },
////    branchId: {
////      type: mongoose.Schema.Types.ObjectId,
////      required: true,
////      ref: "Branch",
////    },
////    companyName: {
////      type: String,
////      required: true,
////      trim: true,
////    },
////    HSCode: {
////      type: String,
////      required: true,
////      trim: true,
////    },

////    // Seller Info
////    sellerName: {
////      type: String,
////      trim: true,
////    },
////    NTN_CNIC: {
////      type: String,
////      trim: true,
////    },
////    businessAddress: {
////      type: String,
////      trim: true,
////    },

////    // Purchase Info
////    purchaseStatus: {
////      type: String,
////      enum: ["pending", "completed", "cancelled"],
////      default: "completed",
////    },
////    purchaseMethod: {
////      type: String,
////      enum: ["cash", "credit", "payment"], 
////      default: "cash",
////    },
////    purchaseDate: {
////      type: Date,
////      default: Date.now,
////    },

////    // Financials
////    rate: {
////      type: Number,
////      required: true,
////      min: 0,
////    },
////    quantity: {
////      type: Number,
////      required: true,
////      min: 0,
////    },
////    amount: {
////      type: Number,
////      required: true,
////      min: 0,
////    },
////    gstRate: {
////      type: Number,
////      default: 0,
////      min: 0,
////    },
////    gstAmount: {
////      type: Number,
////      default: 0,
////      min: 0,
////    },
////    discount: {
////      type: Number,
////      default: 0,
////      min: 0,
////    },
////    netAmount: {
////      type: Number,
////      required: true,
////      min: 0,
////    },
////    amountPaid: {
////      type: Number,
////      default: 0,
////      min: 0,
////    },
////    remainingAmount: {
////      type: Number,
////      default: 0,
////      min: 0,
////    },
////    paymentStatus: {
////      type: String,
////      enum: ["Fully Paid", "Partially Paid", "Unpaid"],
////      default: "Fully Paid",
////    },

////    // Item reference (which item inside the stock doc this purchase is for)
////    itemDescription: {
////      type: String,
////      required: true,
////      trim: true,
////    },
////    location: {
////      type: String,
////      trim: true,
////    },
////  },
////  { timestamps: true }
////);

////export const Purchase = mongoose.model("Purchase", purchaseSchema);

//const purchaseItemSchema = new mongoose.Schema(
//  {
//    itemDescription: {
//      type: String,
//      required: true,
//      trim: true,
//    },
//    location: {
//      type: String,
//      trim: true,
//    },
//    quantity: {
//      type: Number,
//      required: true,
//      min: 0,
//    },
//    rate: {
//      type: Number,
//      min: 0,
//    },
//    amount: {
//      type: Number,
//      min: 0,
//    },
//    gstRate: {
//      type: Number,
//      default: 0,
//      min: 0,
//    },
//    gstAmount: {
//      type: Number,
//      default: 0,
//      min: 0,
//    },
//    discount: {
//      type: Number,
//      default: 0,
//      min: 0,
//    },
//    netAmount: {
//      type: Number,
//      min: 0,
//    },
//  },
//  { _id: false }
//);

//const purchaseSchema = new mongoose.Schema(
//  {
//    userId: {
//      type: mongoose.Schema.Types.ObjectId,
//      required: true,
//      ref: "user",
//    },
//    stockId: {
//      type: mongoose.Schema.Types.ObjectId,
//      required: true,
//      ref: "Stock",
//    },
//    branchId: {
//      type: mongoose.Schema.Types.ObjectId,
//      required: true,
//      ref: "Branch",
//    },
//    companyName: {
//      type: String,
//      required: true,
//      trim: true,
//    },
//    HSCode: {
//      type: String,
//      required: true,
//      trim: true,
//    },

//    // ── Invoice ───────────────────────────────────────────────────────────────
//    invoiceNumber: {           // ✅ FIX 3: was missing from schema entirely
//      type: String,
//      trim: true,
//    },

//    // ── Seller Info ───────────────────────────────────────────────────────────
//    sellerName: {
//      type: String,
//      trim: true,
//    },
//    NTN_CNIC: {
//      type: String,
//      trim: true,
//    },
//    businessAddress: {
//      type: String,
//      trim: true,
//    },

//    // ── Purchase Info ─────────────────────────────────────────────────────────
//    purchaseStatus: {
//      type: String,
//      enum: ["pending", "completed", "cancelled"],
//      default: "completed",
//    },
//    purchaseMethod: {
//      type: String,
//      enum: ["cash", "credit", "payment"],
//      default: "cash",
//    },
//    purchaseDate: {
//      type: Date,
//      default: Date.now,
//    },

//    // ── Items purchased in this invoice ──────────────────────────────────────
//    // ✅ NEW: each purchase doc now stores all its line items
//    items: {
//      type: [purchaseItemSchema],
//      default: [],
//    },

//    // ── Financials (invoice-level totals) ─────────────────────────────────────
//    rate: {
//      type: Number,
//      required: true,
//      min: 0,
//    },
//    quantity: {
//      type: Number,
//      required: true,
//      min: 0,
//    },
//    amount: {
//      type: Number,
//      required: true,
//      min: 0,
//    },
//    gstRate: {
//      type: Number,
//      default: 0,
//      min: 0,
//    },
//    gstAmount: {
//      type: Number,
//      default: 0,
//      min: 0,
//    },
//    discount: {
//      type: Number,
//      default: 0,
//      min: 0,
//    },
//    netAmount: {
//      type: Number,
//      required: true,
//      min: 0,
//    },
//    amountPaid: {
//      type: Number,
//      default: 0,
//      min: 0,
//    },
//    remainingAmount: {
//      type: Number,
//      default: 0,
//      min: 0,
//    },
//    paymentStatus: {
//      type: String,
//      enum: ["Fully Paid", "Partially Paid", "Unpaid"],
//      default: "Fully Paid",
//    },

//    // ── Item reference (which stock item this purchase belongs to) ────────────
//    itemDescription: {
//      type: String,
//      required: true,
//      trim: true,
//    },
//    location: {
//      type: String,
//      trim: true,
//    },
//  },
//  { timestamps: true }
//);

//export const Purchase = mongoose.model("Purchase", purchaseSchema);


import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema(
  {
    itemDescription: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    rate: {
      type: Number,
      min: 0,
    },
    amount: {
      type: Number,
      min: 0,
    },
    gstRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      min: 0,
    },
    // ── FBR metadata — mirrors stock.model stockItemSchema.fbr ────────────────
    fbr: {
      uoM:                             { type: String, default: "Numbers, pieces, units" },
      fbrSaleType:                     { type: String },
      sroScheduleNo:                   { type: String, default: "" },
      sroItemSerialNo:                 { type: String, default: "" },
      fixedNotifiedValueOrRetailPrice: { type: Number, default: 0 },
      extraTax:                        { type: Number, default: 0 },
      furtherTax:                      { type: Number, default: 0 },
      fedPayable:                      { type: Number, default: 0 },
      salesTaxWithheldAtSource:        { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    stockId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "Stock",
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Branch",
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    HSCode: {
      type: String,
      required: true,
      trim: true,
    },

    // ── Invoice ───────────────────────────────────────────────────────────────
    invoiceNumber: {
      type: String,
      trim: true,
    },

    // ── Seller Info ───────────────────────────────────────────────────────────
    sellerName: {
      type: String,
      trim: true,
    },
    NTN_CNIC: {
      type: String,
      trim: true,
    },
    businessAddress: {
      type: String,
      trim: true,
    },

    // ── Purchase Info ─────────────────────────────────────────────────────────
    purchaseStatus: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed",
    },
    purchaseMethod: {
      type: String,
      enum: ["cash", "credit", "payment"],
      default: "cash",
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },

    // ── Line items (each carries its own fbr block via purchaseItemSchema) ────
    items: {
      type: [purchaseItemSchema],
      default: [],
    },

    // ── Financials (invoice-level totals) ─────────────────────────────────────
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    gstRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["Fully Paid", "Partially Paid", "Unpaid"],
      default: "Fully Paid",
    },
    bulkPurchaseId: {
    type: String,
    default: null, // null = manually created purchase, set = bulk imported
    },

    // ── Primary item reference (which stock item this purchase belongs to) ────
    itemDescription: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export const Purchase = mongoose.model("Purchase", purchaseSchema);