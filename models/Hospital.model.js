import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Hospital name is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    zipcode: {
      type: String,
      required: [true, "Zip code is required"],
    },
    emergencyContactNo: {
      type: String,
    },
    worksiteLink: {
      type: String,
    },
    hospitalLogo: {
        type: String,
        default: "https://vectorified.com/images/default-user-icon-33.jpg",
    },
  },
  {
    timestamps: true,
  }
);

const hospitalModel = mongoose.model("Hospital", hospitalSchema);
export default hospitalModel;
