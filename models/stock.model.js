import mongoose from "mongoose";

// Embedded snapshot of purchase info stored directly on the stock item.
// The full Purchase document (with stockId ref) lives in the Purchase collection.
const purchaseDetailsSchema = new mongoose.Schema(
  {
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
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
  },
  { _id: false }
);

const stockItemSchema = new mongoose.Schema(
  {
    itemDescription: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    minStockLevel: {
      type: Number,
      required: true,
      min: 0,
    },
    // All purchase-related fields live here, nested
    purchaseDetails: {
      type: [purchaseDetailsSchema],
      default: [],
    },
  },
  { _id: false }
);

const stockSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    HSCode: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: true, 
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    branchExists: {
      type: Boolean,
      default: true,
    },
    items: {
      type: [stockItemSchema],
      required: true,
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "At least one item is required",
      },
    },
  },
  { timestamps: true }
);

export const Stock = mongoose.model("Stock", stockSchema);