// services/email.service.js
import nodemailer from 'nodemailer';

class EmailService {
    static async sendEmail(to, subject, htmlContent) {
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || "smtp.gmail.com",
                port: parseInt(process.env.SMTP_PORT) || 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.PASSWORD,
                },
            });

            const mailOptions = {
                from: process.env.EMAIL,
                to,
                subject,
                html: htmlContent,
            };

            await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error("Email sending failed:", error);
            throw new Error("Failed to send email");
        }
    }

    static registrationTemplate(fullName, email, password) {
        return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
            <!-- Header Section -->
            <div style="background-color: #4AC0F0; color: #ffffff; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Welcome to Our Platform!</h1>
            </div>
            
            <!-- Body Section -->
            <div style="padding: 20px; color: #333; line-height: 1.6; background-color: #ffffff;">
                <p style="font-size: 16px;">Hello <strong>${fullName}</strong>,</p>
                <p style="font-size: 14px;">Congratulations! Your registration was successful. Below are your login details:</p>
                <table style="width: 100%; margin: 20px 0; border-collapse: collapse; font-size: 14px;">
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; background-color: #f1f9ff; font-weight: bold; width: 30%;">Email:</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd; background-color: #f1f9ff; font-weight: bold;">Password:</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${password}</td>
                    </tr>
                </table>
                <p style="font-size: 13px; color: #888;">* For your security, please change your password after logging in for the first time.</p>
                <p style="margin-top: 20px; font-size: 14px;">If you have any questions or need help, feel free to contact our support team. We're here to assist you.</p>
            </div>
            
            <!-- Footer Section -->
            <div style="background-color: #f4f9ff; color: #666; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #ddd;">
                <p style="margin: 0;">&copy; 2024 Team 1. All rights reserved.</p>
                <p style="margin: 0;">1234 Street, City, State, 56789</p>
            </div>
        </div>`;
    }

    static otptamplate(fullName, email, otp) {
        return `
        <div style="font-family: 'Arial', sans-serif; max-width: 700px; margin: 0 auto; border: 2px solid #f1f1f1; border-radius: 20px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #4AC0F0; color: white; padding: 30px; text-align: center; border-top-left-radius: 20px; border-top-right-radius: 20px;">
                <h1 style="margin: 0; font-size: 36px; font-weight: 700;">Reset Your Password</h1>
                <p style="font-size: 18px; font-weight: 400;">We just need to verify your identity!</p>
            </div>
            <div style="padding: 40px; color: #333; text-align: center; font-size: 18px; line-height: 1.8; border-bottom: 1px solid #ddd;">
                <p><span style="font-weight: 600;">Hello ${fullName},</span></p>
                <p>Here is your OTP to reset your password:</p>
                <div style="font-size: 36px; font-weight: 700; color: #ffffff; background-color: #4AC0F0; padding: 20px 40px; display: inline-block; border-radius: 10px;">
                    ${otp}
                </div>
                <p style="margin-top: 30px;">Use the OTP above to proceed with your password reset.</p>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9; text-align: center; border-bottom-left-radius: 20px; border-bottom-right-radius: 20px;">
                <table style="width: 100%; margin: 20px 0; border-collapse: collapse; border: none;">
                    <tr>
                        <td style="padding: 10px; font-weight: 600; color: #4AC0F0; background-color: #f1f1f1; border-top-left-radius: 10px;">Email</td>
                        <td style="padding: 10px; background-color: #f1f1f1; color: #333;">${email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: 600; color: #4AC0F0; background-color: #f1f1f1;">OTP</td>
                        <td style="padding: 10px; background-color: #f1f1f1; color: #333;">${otp}</td>
                    </tr>
                </table>
                <p style="font-size: 14px; color: #888;">If you did not request this, please ignore this message.</p>
            </div>
            <div style="background-color: #4AC0F0; color: white; text-align: center; padding: 10px; font-size: 14px; border-bottom-left-radius: 20px; border-bottom-right-radius: 20px;">
                <p>&copy; 2024 Team 1 | All Rights Reserved</p>
                <p>Contact us: 1234 Street, City, State, 56789</p>
            </div>
        </div>`;
    }

}

export default EmailService;
