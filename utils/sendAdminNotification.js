// utils/sendAdminNotification.js
const transporter = require('../config/mailer');

const sendAdminNotification = async (user) => {
  const date = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const mailOptions = {
    from: `"Daily Learning App" <${process.env.ADMIN_EMAIL}>`,
    to: process.env.SEND_EMAIL,
    subject: '🔔 New User Approval Request',
    html: `
      <h3>🚀 New User Approval Requested</h3>
      <p><strong>User Name:</strong> ${user.name || 'Not Provided'}</p>
      <p><strong>User ID:</strong> ${user._id}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Requested At:</strong> ${date}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Admin notified for user ${user.email}`);
  } catch (err) {
    console.error('[EMAIL ERROR]', err.message);
  }
};

module.exports = sendAdminNotification;
