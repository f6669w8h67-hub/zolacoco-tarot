// Email delivery for the membership notices. Zola chose (2026-11-15) to send from her own Gmail with an
// app password she creates in her Google account and pastes into Vercel herself; it lives only there.
//   GMAIL_USER           her Gmail address (the sender)
//   GMAIL_APP_PASSWORD   the 16-character app password (spaces allowed, they are removed)
import nodemailer from "nodemailer";
import type { GmailConfig } from "./mail-config";

export { gmailConfig, type GmailConfig } from "./mail-config";

export type MailMessage = { to: string; subject: string; text: string };
export type MailResult = "sent" | "failed";
type CreateTransport = (options: Record<string, unknown>) => { sendMail(message: Record<string, unknown>): Promise<unknown> };

export const SENDER_NAME = "Zola｜Zolacoco Tarot";

/** Sends one plain-text email through Gmail. Never throws; failures are logged by code only (no addresses). */
export async function sendGmail(config: GmailConfig, message: MailMessage, createTransport: CreateTransport = nodemailer.createTransport as unknown as CreateTransport): Promise<MailResult> {
  try {
    const transport = createTransport({
      host: "smtp.gmail.com", port: 465, secure: true,
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000,
    });
    await transport.sendMail({ from: { name: SENDER_NAME, address: config.user }, to: message.to, subject: message.subject, text: message.text });
    return "sent";
  } catch (error) {
    console.error("gmail_send_failed", { code: (error as { code?: string; responseCode?: number })?.code ?? "unknown", responseCode: (error as { responseCode?: number })?.responseCode ?? null });
    return "failed";
  }
}
