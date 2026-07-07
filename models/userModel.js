import mongoose from "mongoose";
import { encrypt, decrypt } from "../utils/crypto.js";

const userSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    companyProfile: {
      type: String,
      default: "",
      validate: {
        validator: function (v) {
          // Optional: validate if it's a valid URL when provided
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: "Please provide a valid logo URL",
      },
    },
    businessType:{ type:String, enum:["Manufacturer","Retailer"] }, 
    email: { type: String, required: true, unique: true },
    contactNumber: { type: String, required: true, unique: true},
    password: { type: String, required: true },
    address: { type : String, required: true },
    resetOtp: { type: String, default: "" },
    resetOtpExpiryAt: { type: Number, default: 0 },
    productionApiStatus: { type:Boolean, default:false },
    productionToken: { type:String },
    POSID: { type:Number },
    PosProductionToken: { type:String },
    fbrApprovedScenarios: {
      type: [String],      // array of strings
      default: [],
},
    fbrSandboxPassedAt: { type: Date },
    sellerNTNCNIC:      { type: String, trim: true },
    sellerProvince:     { type: String, trim: true },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  if (!this.isModified("productionToken") || !this.productionToken)
    return next();

  this.productionToken = encrypt(this.productionToken);
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("PosProductionToken") || !this.PosProductionToken)
    return next();

  this.PosProductionToken = encrypt(this.PosProductionToken);
  next();
});

const userModel = mongoose.models.user || mongoose.model("user", userSchema);
export default userModel;
