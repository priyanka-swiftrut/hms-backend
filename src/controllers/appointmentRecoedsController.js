import AppointmentRecord from "../models/appointmentRecord.model.js";
import AppointmentModel from "../models/Appointment.model.js";
import ResponseService from "../services/response.services.js";
import { StatusCodes } from "http-status-codes";
import cloudinary from "../config/cloudinaryConfig.js";

class AppointmentRecordController {
  // Create Appointment Record
  async createAppointmentRecord(req, res) {
    const imagePaths = [];
    try {
      const { appointmentId } = req.params;
      const { description } = req.body;

      if (!appointmentId) {
        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Appointment ID is required.", 0);
      }

      if (!req.body || !Object.keys(req.body).length) {
        const uploadedImages = req.files?.map(file => file.path) || [];
        if (uploadedImages.length) await this.deleteImages(uploadedImages);
        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Request body is empty", 0);
      }

      const appointment = await AppointmentModel.findById(appointmentId);
      if (!appointment) {
        return ResponseService.send(res, StatusCodes.NOT_FOUND, "Appointment not found.", 0);
      }

      const existingRecord = await AppointmentRecord.findOne({ appointmentId });
      if (existingRecord) {
        return ResponseService.send(res, StatusCodes.CONFLICT, "Appointment record already exists.", 0);
      }

      const images = req.files?.map(file => file.path) || [];
      imagePaths.push(...images);

      const newRecord = new AppointmentRecord({
        appointmentId,
        hospitalId: appointment.hospitalId,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        description,
        images,
        date: new Date(),
      });

      await newRecord.save();
      return ResponseService.send(res, StatusCodes.CREATED, "Appointment record created successfully.", 1, newRecord);
    } catch (error) {
      if (imagePaths.length) await this.deleteImages(imagePaths);
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
  }

  // Edit Appointment Record
  async editAppointmentRecord(req, res) {
    const imagePaths = [];
    try {
      const { recordId } = req.params;
      const { description, existingImages } = req.body;

      const record = await AppointmentRecord.findById(recordId);
      if (!record) {
        return ResponseService.send(res, StatusCodes.NOT_FOUND, "Appointment record not found.", 0);
      }

      if (description) record.description = description;

      const newImages = req.files?.map(file => file.path) || [];
      imagePaths.push(...newImages);

      if (newImages.length) {
        if (record.images.length) await this.deleteImages(record.images);
        record.images = newImages;
      } else if (existingImages?.length) {
        record.images = existingImages;
      }

      await record.save();
      return ResponseService.send(res, StatusCodes.OK, "Appointment record updated successfully.", 1, record);
    } catch (error) {
      if (imagePaths.length) await this.deleteImages(imagePaths);
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
  }

  // Delete an Image
  async deleteImages(req, res) {
    try {
      const { appointmentId } = req.params;
      const { imageUrl } = req.body;

      const record = await AppointmentRecord.findOne({ appointmentId });
      if (!record) {
        return ResponseService.send(res, StatusCodes.NOT_FOUND, "Appointment record not found.", 0);
      }

      if (!imageUrl || !record.images.includes(imageUrl)) {
        return ResponseService.send(res, StatusCodes.BAD_REQUEST, "Image not found in the record.", 0);
      }

      const publicId = this.extractPublicId(imageUrl);
      await cloudinary.uploader.destroy(publicId);

      record.images = record.images.filter(img => img !== imageUrl);
      await record.save();

      return ResponseService.send(res, StatusCodes.OK, "Image deleted successfully.", 1, record);
    } catch (error) {
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
  }

  // Utility to delete images from Cloudinary
  async deleteImages(paths) {
    if (!paths) return;

    const deletePromises = Array.isArray(paths)
      ? paths.map(path => cloudinary.uploader.destroy(this.extractPublicId(path)))
      : [cloudinary.uploader.destroy(this.extractPublicId(paths))];

    await Promise.all(deletePromises);
  }

  // Extract Public ID from Cloudinary URL
  extractPublicId(url) {
    return url.split("/").pop().split(".")[0];
  }

  // Fetch Appointment Record
  async getAppointmentRecord(req, res) {
    try {
      const { appointmentId } = req.params;

      const record = await AppointmentRecord.findOne({ appointmentId });
      if (!record) {
        return ResponseService.send(res, StatusCodes.NOT_FOUND, "Appointment record not found.", 0);
      }

      return ResponseService.send(res, StatusCodes.OK, "Appointment record fetched successfully.", 1, record);
    } catch (error) {
      return ResponseService.send(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message, 0);
    }
  }
}

export default AppointmentRecordController;