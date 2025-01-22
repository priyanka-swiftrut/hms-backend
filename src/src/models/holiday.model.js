import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: [true, "Hospital ID is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    session: {
      type: String,
      required: [true, "Session is required"],
      enum: ["morning", "evening", "full_day"],
      default: "morning",
    },
    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
    },
  }
);

// Prevent model redefinition by checking if it already exists
const holidayModel =
  mongoose.models.Holiday || mongoose.model("Holiday", holidaySchema);

export default holidayModel;
