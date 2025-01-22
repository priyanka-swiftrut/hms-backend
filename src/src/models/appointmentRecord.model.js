import mongoose from "mongoose";

const appointmentRecordSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hospital",
            required: true,
        },
        appointmentId:{
            type : mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        description: {
            type: String,
            trim: true,
          },
        images: [
            {
              type: String,
              trim: true,
            },
          ],


    },
    {
        timestamps: true,
      }

)

const appointmentRecordModel = mongoose.model("AppointmentRecord", appointmentRecordSchema);

export default appointmentRecordModel;
