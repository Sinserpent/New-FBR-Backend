//import mongoose from "mongoose"

//const CounterSchema = new mongoose.Schema(
//  {
//    userId: {
//      type: mongoose.Schema.Types.ObjectId,
//      required: true,
//      unique: true,
//      index: true
//    },
//    type: {
//      type: String,
//      enum: ["invoice"],
//      required: true
//    },
//    seq: {
//      type: Number,
//      default: 0
//    }
//  },
//  { timestamps: true }
//)

//export default mongoose.model("Counter", CounterSchema)

import mongoose from "mongoose"

const CounterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["invoice", "purchase"],  // 👈 add purchase
      required: true
    },
    seq: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

// 👇 compound unique index instead of unique on userId alone
CounterSchema.index({ userId: 1, type: 1 }, { unique: true })

export default mongoose.model("Counter", CounterSchema) 