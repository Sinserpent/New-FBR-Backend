import mongoose from "mongoose";

if (mongoose.models.Buyer) delete mongoose.models.Buyer;

const BuyerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    cnicOrNtn: {
      type: String,
      required: true,
      trim: true,
    },
    companyAddress: {
      type: String,
      required: true,
      trim: true,
    },
    fbrBuyerRegistrationType: {
      type: String,
      required: true,
      enum: ["Registered", "Unregistered"],
    },
  },
  { timestamps: true }
);

BuyerSchema.index({ userId: 1, cnicOrNtn: 1 }, { unique: true });

const Buyer = mongoose.model("Buyer", BuyerSchema);

export default Buyer;
