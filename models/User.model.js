import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
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
        trim: true,
        match: [/^\+\d{1,3}\d{10}$/, "Please provide a valid phone number with country code"],
    },
    profilePicture: {
        type: String,
        default: "https://vectorified.com/images/default-user-icon-33.jpg",
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: true,
    },
    age: {
        type: Number,
        min: [0, "Age must be a positive number"],
        required: true,
    },
    address: {
        country: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        zipCode: {
            type: String,
            required: true
        },
        fullAddress: {
            type: String,
            required: true
        },
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
            return this.role !== "patient";
        },
    },
    metaData: {
        doctorData: {
            qualification: {
                type: String,
                required: function () {
                    return this.role === "doctor";
                },
            },
            speciality: {
                type: String,
                required: function () {
                    return this.role === "doctor";
                },
            },
            morningSession: {
                type: String,
                required: function () {
                    return this.role === "doctor";
                },
            },
            eveningSession: {
                type: String,
                required: function () {
                    return this.role === "doctor";
                },
            },
            duration: {
                type: String,
                required: function () {
                    return this.role === "doctor";
                },
            },
            experience: {
                type: Number,
                required: function () {
                    return this.role === "doctor";
                },
            },
            description: {
                type: String,
                required: function () {
                    return this.role === "doctor";
                },
            },
            onlineConsultationRate: {
                type: Number,
                required: function () {
                    return this.role === "doctor";
                },
            },
            worksiteLink: {
                type: String,
                match: [/^https?:\/\/.+$/, "Please provide a valid URL"],
                required: function () {
                    return this.role === "doctor";
                },
            },
            workon: {
                type: String,
                enum: ["Online", "Onsite", "Both"],
                default: "Both",
                required: function () {
                    return this.role === "doctor";
                },
            },
            emergencyContactNo: {
                type: String,
                required: function () {
                    return this.role === "doctor";
                },
            },
            signature: {
                type: String,
                required: function () {
                    return this.role === "doctor";
                },
            },
        },
        patientData: {
            height: {
                type: Number,
                required: function () {
                    return this.role === "patient";
                },
            },
            weight: {
                type: Number,
                required: function () {
                    return this.role === "patient";
                },
            },
            bloodGroup: {
                type: String,
                enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
                required: function () {
                    return this.role === "patient";
                },
            },
            dob: {
                type: String,
                required: function () {
                    return this.role === "patient";
                },
            },
        },
        receptionistData: {
            qualification: {
                type: String,
                required: function () {
                    return this.role === "receptionist";
                },
            },
            emergencyContactNo: {
                type: String,
                required: function () {
                    return this.role === "receptionist";
                },
            },
            workingTime: {
                type: String,
                required: function () {
                    return this.role === "receptionist";
                },
            },
            breakTime: {
                type: String,
                required: function () {
                    return this.role === "receptionist";
                },
            },
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
},);

const UserModel = mongoose.model("User", UserSchema);

export default UserModel;
