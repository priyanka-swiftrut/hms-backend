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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">Registration Successful</h1>
                </div>
                <div style="padding: 20px; color: #333; line-height: 1.6;">
                    <p>Dear <strong>${fullName}</strong>,</p>
                    <p>You've successfully registered on our platform! Below are your login details:</p>
                    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9; width: 30%;"><strong>Email:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Password:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${password}</td>
                        </tr>
                    </table>
                    <p style="color: #888; font-size: 0.9em;">* For security reasons, we recommend changing your password after your first login.</p>
                    <p>If you have any questions or need assistance, feel free to contact our support team.</p>
                </div>
                <div style="background-color: #f4f4f4; color: #666; text-align: center; padding: 15px; font-size: 0.8em;">
                    <p style="margin: 0;">&copy; 2024 Team 1. All rights reserved.</p>
                    <p style="margin: 0;">1234 Street, City, State, 56789</p>
                </div>
        </div>`;
    }

    static otptamplate(fullName, email, otp) {
        return `
        <div style="font-family: 'Arial', sans-serif; max-width: 700px; margin: 0 auto; border: 2px solid #f1f1f1; border-radius: 20px; overflow: hidden; background: linear-gradient(135deg, #6e7dff, #f084e2);">
            <div style="background-color: #333; color: white; padding: 30px; text-align: center; border-top-left-radius: 20px; border-top-right-radius: 20px;">
                <h1 style="margin: 0; font-size: 36px; font-weight: 700;">Reset Your Password</h1>
                <p style="font-size: 18px; font-weight: 400;">We just need to verify your identity!</p>
            </div>
            <div style="padding: 40px; color: #fff; text-align: center; font-size: 18px; line-height: 1.8; border-bottom: 1px solid #ddd; background-color: #444;">
                <p><span style="font-weight: 600;">Hello ${fullName},</span></p>
                <p>Here is your OTP to reset your password:</p>
                <div style="font-size: 36px; font-weight: 700; color: #f1c40f; background-color: #1c1c1c; padding: 20px 40px; display: inline-block; border-radius: 10px;">
                    ${otp}
                </div>
                <p style="margin-top: 30px;">Use the OTP above to proceed with your password reset.</p>
            </div>
            <div style="padding: 20px; background-color: #333; color: white; text-align: center; border-bottom-left-radius: 20px; border-bottom-right-radius: 20px;">
                <table style="width: 100%; margin: 20px 0; border-collapse: collapse; border: none;">
                    <tr>
                        <td style="padding: 10px; font-weight: 600; color: #ff6347; background-color: #444; border-top-left-radius: 10px;">Email</td>
                        <td style="padding: 10px; background-color: #444; color: #f1f1f1;">${email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; font-weight: 600; color: #ff6347; background-color: #444;">OTP</td>
                        <td style="padding: 10px; background-color: #444; color: #f1f1f1;">${otp}</td>
                    </tr>
                </table>
                <p style="font-size: 14px; color: #aaa;">If you did not request this, please ignore this message.</p>
            </div>
            <div style="background-color: #222; color: white; text-align: center; padding: 10px; font-size: 14px; border-bottom-left-radius: 20px; border-bottom-right-radius: 20px;">
                <p>&copy; 2024 Team 1 | All Rights Reserved</p>
                <p>Contact us: 1234 Street, City, State, 56789</p>
            </div>
        </div>`;
    }

}

export default EmailService;
