import nodemailer from "nodemailer";

let transporter = null;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || user;

  if (!user || !pass || !from) {
    throw new Error("SMTP_USER, SMTP_PASSWORD, and SMTP_FROM must be configured.");
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from,
  };
}

function getTransporter() {
  if (!transporter) {
    const { from, ...smtp } = getSmtpConfig();
    transporter = nodemailer.createTransport(smtp);
  }

  return transporter;
}

export async function sendOtpEmail(to, otp) {
  const { from } = getSmtpConfig();

  await getTransporter().sendMail({
    from,
    to,
    subject: "Kode Verifikasi Reset Password SeismoTrack",
    text: [
      `Kode verifikasi Anda adalah: ${otp}`,
      "",
      "Kode ini berlaku selama 10 menit.",
      "Abaikan email ini jika Anda tidak meminta reset password.",
    ].join("\n"),
    html: `
      <p>Kode verifikasi Anda adalah:</p>
      <p style="font-size:24px;font-weight:700;letter-spacing:4px">${otp}</p>
      <p>Kode ini berlaku selama 10 menit.</p>
      <p>Abaikan email ini jika Anda tidak meminta reset password.</p>
    `,
  });
}
