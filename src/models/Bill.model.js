import mongoose from "mongoose";
import mongooseSequence from "mongoose-sequence";

const AutoIncrement = mongooseSequence(mongoose);

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: Number,
      unique: true,
      required: false,
      trim: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: [true, "Hospital ID is required"],
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: false,
    },
    description: {
      type: [
        {
          key: { type: String, required: true },
          value: { type: String, required: true },
        },
      ],
      required: false,
    },
    paymentType: {
      type: String,
      required: false,
      enum: ["Online", "Cash", "Insurance"],
    },
    date: {
      type: Date,
      required: false,
      default: Date.now,
    },
    time: {
      type: String,
      required: false,
    },
    amount: {
      type: Number,
      required: [false, "Amount is required"],
      min: [0, "Amount must be a positive number"],
    },
    discount: {
      type: Number,
      required: false,
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100%"],
      default: 0,
    },
    tax: {
      type: Number,
      required: [false, "Tax is required"],
      min: [0, "Tax cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: false,
    },
    insuranceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Insurance",
      required: false,
    },
    status: {
      type: String,
      enum: ["Unpaid", "Paid"],
      default: "Unpaid",
    },
  },
  {
    timestamps: true,
  }
);

billSchema.plugin(AutoIncrement, {
  inc_field: "billNumber",
  start_seq: 1000,
});

// billSchema.virtual("totalAmount").get(function () {
//   return (
//     this.amount -
//     this.amount * (this.discount / 100) +
//     this.amount * (this.tax / 100)
//   );
// });
billSchema.set("toJSON", { virtuals: true });

const billModel = mongoose.model("Bill", billSchema);

export default billModel;