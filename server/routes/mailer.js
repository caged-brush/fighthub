import express from "express";
import {Resend} from 'resend'
const router = express.Router();

export default function mailerRoute(client) {
  router.post("/mailer", async (req, res) => {
    const { email, subject, message } = req.body;
    try {
      const result = await client.sendEmail({
        From: "your@email.com", // Replace with your sender email
        To: email,
        Subject: subject,
        HtmlBody: message,
      });
      res.status(200).json({ message: "Email sent", result });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  return router;
}
