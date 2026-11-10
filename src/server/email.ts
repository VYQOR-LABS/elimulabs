import nodemailer from "nodemailer";

export function emailIsConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function getTransport() {
  if (!emailIsConfigured()) {
    throw new Error("Email delivery is not configured. Set SMTP_HOST and SMTP_FROM.");
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
  });
}

export async function sendAccountEmail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  await getTransport().sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
