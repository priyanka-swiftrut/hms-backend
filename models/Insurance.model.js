import mongoose from "mongoose";

// Create the Insurance Schema
const insuranceSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    insuranceCompany: {
      type: String,
      trim: true,
      required: true,
    },
    insurancePlan: {
      type: String,
      trim: true,
      required: true,
    },
    claimAmount: {
      type: Number,
      min: [0],
    },
    claimedAmount: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const insuranceModel = mongoose.model("Insurance", insuranceSchema);

export default insuranceModel;
