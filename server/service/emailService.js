import { Resend } from "resend";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY env var");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadTemplate(name) {
  const filePath = path.join(__dirname, "../emails", name);
  return fs.readFileSync(filePath, "utf8");
}

function render(template, vars) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, String(v));
  }
  return out;
}

export async function sendOtpEmail({ to, name, otp, expiryMinutes = 10 }) {
  if (!to) throw new Error("sendOtpEmail: missing 'to'");
  if (!otp) throw new Error("sendOtpEmail: missing 'otp'");

  const template = loadTemplate("auth-otp.html");

  const html = render(template, {
    user_name: name ?? "there",
    otp_code: otp,
    expiry_minutes: expiryMinutes,
  });

  const { data, error } = await resend.emails.send({
    from: "Kavyx <no-reply@kavyx.tech>",
    to: [to],
    subject: "Your Kavyx verification code",
    html,
    text: `Your Kavyx verification code is ${otp}. It expires in ${expiryMinutes} minutes.`,
  });

  if (error) throw new Error(error.message || "Failed to send email");
  return data;
}
