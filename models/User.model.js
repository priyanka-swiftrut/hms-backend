import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const combinedSchema = new mongoose.Schema(
  {
    // Common fields required for all roles
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: [6, "Password must be at least 6 characters long"],
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    country: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "doctor", "patient", "receptionist"],
    },
    avatar: {
      type: String,
      default: "https://vectorified.com/images/default-user-icon-33.jpg",
    },

    // Fields specific to roles
    roleData: {
      type: Object,
      required: false,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Role-specific fields
combinedSchema.statics.roleFields = {
  admin: {
    confirmPassword: { type: String, required: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
  },
  doctor: {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
    qualification: { type: String },
    speciality: { type: String },
    workingTime: { type: String },
    breakTime: { type: String },
    unavailableTimes: { type: Array, default: [] },
    patientCheckupTime: { type: String },
    workingOn: { type: String, enum: ["Part-time", "Full-time", "Contract"] },
    experience: { type: Number },
    age: { type: Number },
    description: { type: String },
    onlineConsultationRate: { type: Number },
    currentHospital: { type: String },
    hospitalName: { type: String },
    hospitalAddress: { type: String },
    worksiteLink: { type: String },
    emergencyContactNo: { type: String },
    signature: { type: String },
  },
  patient: {
    address: { type: String },
    diseaseName: { type: String },
    resetPasswordOtp: { type: String },
    resetPasswordExpires: { type: Date },
    age: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    dob: { type: Date },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    insurance: { type: mongoose.Schema.Types.ObjectId, ref: "Insurance" },
  },
  receptionist: {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
    qualification: { type: String },
    emergencyContactNo: { type: String },
    workingTime: { type: String },
    breakTime: { type: String },
    deviceToken: { type: String, default: "null" },
  },
};

// Middleware to validate role-specific fields
combinedSchema.pre("save", function (next) {
  const roleFields = combinedSchema.statics.roleFields[this.role];
  if (roleFields) {
    for (const field in roleFields) {
      const fieldDef = roleFields[field];
      if (fieldDef.required && !this.roleData[field]) {
        return next(new Error(`${field} is required for role ${this.role}`));
      }
    }
  }
  next();
});

// Method to compare password for login
combinedSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const CombinedModel = mongoose.model("User", combinedSchema);

export default CombinedModel;
