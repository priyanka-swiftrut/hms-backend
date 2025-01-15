import twilio from 'twilio';

// Environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

// Twilio client
const client = twilio(accountSid, authToken);

export const sendOtp = async (phoneNumber) => {
  try {
    const response = await client.verify.services(verifySid).verifications.create({
      to: phoneNumber,
      channel: 'sms', 
    });
    return response;
  } catch (error) {
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

export const verifyOtp = async (phoneNumber, code) => {
  try {
    const response = await client.verify.services(verifySid).verificationChecks.create({
      to: phoneNumber,
      code,
    });
    return response;
  } catch (error) {
    throw new Error(`Failed to verify OTP: ${error.message}`);
  }
};
