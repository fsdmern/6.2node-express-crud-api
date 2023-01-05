const nodemailer = require("nodemailer");
const config = require("config.json");

module.exports = sendEmail;

async function sendEmail({ to, subject, html, from = config.emaiFrom }) {
  const transporter = nodemailer.createTransport(config.smtpOptions);
  await transporter.sendEmail({ from, to, subject, html });
}
