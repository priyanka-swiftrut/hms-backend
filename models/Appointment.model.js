import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: [true, "Patient ID is required"],
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Doctor ID is required"],
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: [true, "Hospital ID is required"],
    },
    insuranceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Insurance",
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    appointmentTime: {
      type: String,
      required: [true, "Appointment time is required"],
      // match: [
      //   /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      //   "Please enter a valid time in HH:MM format",
      // ],
    },
    type: {
      type: String,
      enum: ["onsite", "online"],
      required: [true, "Appointment type is required"],
    },
    patient_issue: {
      type: String,
      trim: true,
    },
    dieseas_name: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "canceled", "pending", "completed"],
      default: "scheduled",
    },
    paymentId: {
      type: String,
      sparse: true,
    },
    orderId: {
      type: String,
      sparse: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    prescriptionId: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      // required: true
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const appointmentModel = mongoose.model("Appointment", appointmentSchema);

export default appointmentModel;
