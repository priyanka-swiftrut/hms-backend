const regestration = (fullname, email, password) => {
    return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">Registration Successful</h1>
                </div>
                <div style="padding: 20px; color: #333; line-height: 1.6;">
                    <p>Dear <strong>${fullname}</strong>,</p>
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
            </div>
                    `;
}

export default regestration;