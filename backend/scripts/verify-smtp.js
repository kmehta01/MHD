const { verifySmtpConnection } = require("../src/services/mail.service");
require("dotenv").config();

verifySmtpConnection()
  .then(() => {
    console.log("SMTP connection verified successfully.");
  })
  .catch((error) => {
    console.error("SMTP verification failed.");
    console.error(error.message);
    process.exit(1);
  });
