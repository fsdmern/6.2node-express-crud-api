const nodemailer = require("nodemailer");
module.exports = sendEmail;

async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM }) {
  // let testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USERID,
      pass: process.env.EMAIL_PASS,
    },
  });
  const mailOptions = {
    from: from,
    to: to,
    subject: subject,
    text: "Test Message",
    html: html,
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}
