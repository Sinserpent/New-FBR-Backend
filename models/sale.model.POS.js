import mongoose from "mongoose"

const Product = new mongoose.Schema({
  itemCode:        { type: String, trim: true }, // POS: ItemCode (your SKU) — HSCode below covers PCTCode
  HSCode:          { type: String, trim: true },
  companyName:     { type: String, trim: true },
  itemDescription: { type: String, trim: true },
  location:        { type: String, trim: true },
  totalAmount:     { type: Number, required: true },
  qty:             { type: Number, required: true },
  amount:          { type: Number, required: true },
  gstRate:         { type: Number, default: 0 },
  gstAmount:       { type: Number, default: 0 },
  discount:        { type: Number, default: 0 },
  netAmount:       { type: Number, required: true },
  refUsin:         { type: String, default: null }, // POS: RefUSIN, only set on returns/refunds
  fbr: {
    uoM:                             { type: String, default: 'Numbers, pieces, units' },
    fbrSaleType:                     { type: String, default: 'Goods at standard rate (default)' },
    sroScheduleNo:                   { type: String, default: '' },
    sroItemSerialNo:                 { type: String, default: '' },
    fixedNotifiedValueOrRetailPrice: { type: Number, default: 0 },
    extraTax:                        { type: Number, default: 0 },
    furtherTax:                      { type: Number, default: 0 },
    fedPayable:                      { type: Number, default: 0 },
    salesTaxWithheldAtSource:        { type: Number, default: 0 },
  },
}, { _id: false })

const Totals = new mongoose.Schema({
  totalQuantity:  { type: Number, default: 0 },
  totalAmount:    { type: Number, default: 0 },
  totalGstAmount: { type: Number, default: 0 },
  totalDiscount:  { type: Number, default: 0 },
  totalNetAmount: { type: Number, default: 0 },
}, { _id: false })

const PaymentDetails = new mongoose.Schema({
  totalNetAmount: { type: Number, required: true },
  amountReceived: { type: Number, default: 0 },
  remainingAmount:{ type: Number, default: 0 },
  changeAmount:   { type: Number, default: 0 },
  paymentStatus:  {
    type:    String,
    enum:    ["Fully Paid", "Partially Paid", "Unpaid"],
    default: "Unpaid",
  },
}, { _id: false })

const Sale = new mongoose.Schema({
  // ── Owner ────────────────────────────────────────────────────────────────
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      "User",
    required: true,
    index:    true,
  },

  invoiceNumber: { type: String,  sparse: true },

  branchId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      "Branch",
    required: true,
    index:    true,
  },

  branchExists: { type: Boolean, default: true },

  // ── Channel ──────────────────────────────────────────────────────────────
  usin:    { type: String, trim: true }, // POS: USIN, stamped at submission time

  // ── Sale meta ─────────────────────────────────────────────────────────────
  saleStatus: {
    type:    String,
    enum:    ["confirm", "pending", "cancelled"],
    default: "pending",
  },

  saleMethod: {
    type:     String,
    enum:     ["cash", "credit", "card"],
    required: true,
  },

  customerType: {
    type:     String,
    enum:     ["regular", "walking", "wholesale"],
    required: true,
  },

  transportationType: {
    type:     String,
    enum:     ["pickup", "delivery", "courier"],
    required: true,
  },

  saleType: {
    type:     String,
    enum:     ["retail", "wholesale", "bulk"],
    required: true,
  },

  // ── FBR tracking ─────────────────────────────────────────────────────────
  fbrStatus:      { type: String, enum: ['pending', 'submitted', 'failed'], default: 'pending' },
  fbrInvoiceNo:   { type: String },       // FBR-issued invoice number (DI + POS both land here)
  fbrSubmittedAt: { type: Date },
  fbrError:       { type: String },
  fbrQrUrl:       { type: String },       // URL encoded inside the QR
  fbrQrCdnUrl:    { type: String },       // Cloudinary CDN URL of the QR image PNG

  // ── Sale details ──────────────────────────────────────────────────────────
  saleDate:    { type: Date,   default: Date.now },
  saleNote:    { type: String, trim: true },
  salesman:    { type: String, trim: true },

  // ── Customer info ─────────────────────────────────────────────────────────
  customerName:  { type: String, trim: true },
  customerPhone: { type: String, trim: true }, // POS: BuyerPhoneNumber
  cnicOrNtn: { type: String, trim:true},
  companyAddress: { type:String, trim:true },
  fbrBuyerRegistrationType: {
    type:    String,
    enum:    ['Registered', 'Unregistered']
  },

  // ── Financials ────────────────────────────────────────────────────────────
  bankAccount: { type: String, trim: true },

  // ── Line items & totals ───────────────────────────────────────────────────
  products:       { type: [Product],        required: true },
  totals:         { type: Totals,           required: true },
  paymentDetails: { type: PaymentDetails,   required: true },

  // -- Bulk Status
  bulkUploadId: { type: String, index: true },
  isBulkUpload: { type: Boolean, default: false },

}, { timestamps: true })

Sale.index({ userId: 1, invoiceNumber: 1 }, { unique: true })

export default mongoose.model("PosSale", Sale)