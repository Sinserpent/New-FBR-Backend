import mongoose from "mongoose";

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
    email: { type: String, required: true, unique: true },
    contactNumber: { type: String, required: true, unique: true},
    password: { type: String, required: true },
    address: { type : String, required: true },
    resetOtp: { type: String, default: "" },
    resetOtpExpiryAt: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const userModel = mongoose.models.user || mongoose.model("user", userSchema);
export default userModel;
