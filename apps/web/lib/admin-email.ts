import "server-only";

import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim() || user;
  const fromName = process.env.SMTP_FROM_NAME?.trim() || "Fat Guy Discounts";

  if (!host || !Number.isFinite(port) || !user || !pass || !adminEmail || !fromEmail) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    adminEmail,
    fromEmail,
    fromName,
  };
}

export function hasAdminEmailConfig() {
  return Boolean(getSmtpConfig());
}

export async function sendAdminEmailNotification(input: {
  subject: string;
  text: string;
}) {
  const config = getSmtpConfig();
  if (!config) {
    return { ok: false as const, skipped: true as const, message: "Admin email settings are not configured." };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: config.adminEmail,
    subject: input.subject,
    text: input.text,
  });

  return { ok: true as const, skipped: false as const };
}
