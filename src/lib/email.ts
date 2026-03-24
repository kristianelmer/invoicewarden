import { Resend } from "resend";

export async function sendReminderEmail({
  to,
  subject,
  text,
  html,
  from,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const defaultFrom = process.env.EMAIL_FROM;
  const sender = from ?? defaultFrom;

  if (!apiKey || !sender) {
    throw new Error("Missing RESEND_API_KEY or EMAIL_FROM");
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: sender,
    to,
    subject,
    text,
    html,
  });

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}
