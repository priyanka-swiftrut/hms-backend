// import twilio from 'twilio';

// // Environment variables
// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const verifySid = process.env.TWILIO_VERIFY_SID;

// // Twilio client
// const client = twilio(accountSid, authToken);

// export const sendOtp = async (phoneNumber) => {
//   try {
//     const response = await client.verify.services(verifySid).verifications.create({
//       to: phoneNumber,
//       channel: 'sms', 
//     });
//     return response;
//   } catch (error) {
//     throw new Error(`Failed to send OTP: ${error.message}`);
//   }
// };

// export const verifyOtp = async (phoneNumber, code) => {
//   try {
//     const response = await client.verify.services(verifySid).verificationChecks.create({
//       to: phoneNumber,
//       code,
//     });
//     return response;
//   } catch (error) {
//     throw new Error(`Failed to verify OTP: ${error.message}`);
//   }
// };

import twilio from "twilio";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !twilioPhoneNumber || !verifyServiceSid) {
    throw new Error("Twilio configuration is missing. Please check your environment variables.");
}

const client = twilio(accountSid, authToken);

/**
 * Sends an OTP to the provided phone number.
 * @param {string} phoneNumber - The recipient's phone number (must include country code).
 * @param {string} otp - The OTP to send. Optional if a dynamic OTP is not required.
 * @returns {Promise<object>} - The response from Twilio's message API.
 */
export const sendOtp = async (phoneNumber, otp = null) => {
  console.log(phoneNumber , otp , "wsfgsadsadfsdfsadfsffsdfsdffsdf");
  
    try {
        const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
        const otpMessage = otp || Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP if not provided

        const response = await client.messages.create({
            body: `Your OTP is ${otpMessage}`,
            from: twilioPhoneNumber,
            to: formattedNumber,
        });

        return {
            status: "success",
            message: "OTP sent successfully",
            otp: otpMessage, // Include the OTP if you want to log it for testing
            sid: response.sid,
        };
    } catch (error) {
        console.error("Error sending OTP:", error.message);
        throw new Error("Failed to send OTP");
    }
};

/**
 * Verifies the OTP for the given phone number.
 * @param {string} phoneNumber - The recipient's phone number (must include country code).
 * @param {string} otp - The OTP to verify.
 * @returns {Promise<object>} - The response from Twilio's verification API.
 */
export const verifyOtp = async (phoneNumber, otp) => {
  try {
      const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

      if (!verifyServiceSid) {
          console.log("Twilio Verify Service SID is missing");
          throw new Error("Twilio Verify Service SID is not configured correctly.");
      }

      console.log(`Attempting to verify OTP for phone: ${formattedNumber} with SID: ${verifyServiceSid}`);

      const response = await client.verify.v2.services(verifyServiceSid)
          .verificationChecks.create({ to: formattedNumber, code: otp });

      if (response.status === "approved") {
          return {
              status: "success",
              message: "OTP verified successfully",
          };
      } else {
          return {
              status: "failed",
              message: "Invalid or expired OTP",
          };
      }
  } catch (error) {
      console.error("Error verifying OTP:", error.message);
      if (error.message.includes("not found")) {
          throw new Error("Twilio service not found or incorrectly configured.");
      }
      throw new Error("Failed to verify OTP");
  }
}