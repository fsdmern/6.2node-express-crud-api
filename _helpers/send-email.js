const nodemailer = require("nodemailer");
module.exports = sendEmail;

async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM }) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERID,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transporter.sendEmail({ from, to, subject, html });
}
