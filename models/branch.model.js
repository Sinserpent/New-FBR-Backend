import mongoose from "mongoose";

// delete old model from cache if exists
if (mongoose.models.Branch) delete mongoose.models.Branch;

const BranchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    bankAccounts: [
      {
        accountTitle: {
          type: String,
          trim: true,
          required: true
        },
        accountNo: {
          type: String,
          trim: true,
          required: true
        }
      }
    ]
  },
  { timestamps: true }
);

// ensure uniqueness per user
BranchSchema.index({ userId: 1, name: 1 }, { unique: true });

const Branch = mongoose.model("Branch", BranchSchema);

export default Branch;
