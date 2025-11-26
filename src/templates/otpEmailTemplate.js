export default (otp, purpose = 'verification') => {
  return `
    <div style="font-family: Arial, sans-serif; color: #111">
      <h2>Your ${purpose} code</h2>
      <p>Use the following code to continue:</p>
      <h1 style="letter-spacing:4px">${otp}</h1>
      <p>This code will expire in ${process.env.OTP_TTL_MINUTES || 10} minutes.</p>
      <p>If you didn't request this, ignore this email.</p>
      <hr />
      <small>Dasthakat · ${new Date().getFullYear()}</small>
    </div>
  `;
};
