import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    profilePicture: {
      type: String,
      default: "https://vectorified.com/images/default-user-icon-33.jpg",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    age: {
      type: Number,
      min: [0, "Age must be a positive number"],
    },
    address: {
      country: { type: String },
      state: { type: String },
      city: { type: String },
      zipCode: { type: String },
      fullAddress: { type: String },
    },
    password: {
      type: String,
      required: true,
      minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "doctor", "patient", "receptionist"],
    },
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: function () {
        return this.role !== "admin";
      },
    },
    metaData: {
      // Admin-specific fields (if needed)
      adminData: {
        countryCode: { type: String },
        twiloPhone: { type: String },
      },
      // Doctor-specific fields
      doctorData: {
        qualification: { type: String },
        speciality: { type: String },
        workingTime: { type: String },
        breakTime: { type: String },
        unavailableTimes: [
          {
            date: String,
            timeRange: {
              start: String,
              end: String,
            },
            title: String,
            reason: String,
          },
        ],
        patientCheckupTime: { type: String },
        experience: { type: Number },
        doctorAddress: { type: String },
        description: { type: String },
        onlineConsultationRate: { type: Number },
        worksiteLink: {
          type: String,
          match: [/^https?:\/\/.+$/, "Please provide a valid URL"],
        },
        emergencyContactNo: { type: String },
        signature: { type: String },
      },
      // Patient-specific fields
      patientData: {
        diseaseName: { type: String },
        appointmentId: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
          },
        ],
        height: { type: Number },
        weight: { type: Number },
        bloodGroup: {
          type: String,
          enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
        },
        dob: { type: Date },
        insurance: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Insurance",
        },
      },
      // Receptionist-specific fields
      receptionistData: {
        qualification: { type: String },
        emergencyContactNo: { type: String },
        workingTime: { type: String },
        breakTime: { type: String },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password for login
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const UserModel = mongoose.model("User", UserSchema);

export default UserModel;
