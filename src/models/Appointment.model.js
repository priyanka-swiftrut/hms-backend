import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient ID is required"],
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      enum: ["scheduled", "canceled", "pending", "completed","checkin", "checkout"],
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
    amount: {
      type: Number,
      required: false,
    },
    city: {
      type: String,
      required: [false, "City is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [false, "State is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [false, "Country is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const appointmentModel = mongoose.model("Appointment", appointmentSchema);

export default appointmentModel;
