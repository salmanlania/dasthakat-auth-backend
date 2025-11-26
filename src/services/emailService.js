import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.ZOHO_HOST,
  port: Number(process.env.ZOHO_PORT || 465),
  secure: process.env.ZOHO_SECURE === 'true',
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASS,
  },
});

export const sendOtpEmail = async ({ to, otp, purpose }) => {
  const subject = purpose === 'signup' ? 'Your Signup OTP' : 'Your Verification Code';
  const html = (await import('../templates/otpEmailTemplate.js')).default(otp, purpose);
  const info = await transporter.sendMail({
    from: `"Dasthakat" <${process.env.ZOHO_USER}>`,
    to,
    subject,
    html,
  });
  return info;
};
