import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

class TwilioService {
  // Method to send OTP via SMS using Twilio Verify API
  static async sendOtp(phoneNumber, otp) {
    console.log('Sending OTP to:', phoneNumber , 'with OTP:', otp);
    
    try {
      const response = await client.verify.services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: phoneNumber,
          channel: 'sms',
        });
      console.log('OTP sent to:', phoneNumber);
      return response;
    } catch (error) {
      throw new Error('Failed to send OTP through Twilio: ' + error.message);
    }
  }

  // Method to verify OTP
  static async verifyOtp(phoneNumber, otp) {
    try {
      const verificationCheck = await client.verify.services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: phoneNumber,
          code: otp,
        });
      return verificationCheck;
    } catch (error) {
      throw new Error('Failed to verify OTP through Twilio: ' + error.message);
    }
  }
}

export default TwilioService;