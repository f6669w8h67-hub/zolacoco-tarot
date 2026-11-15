// Zola's Gmail settings for the membership emails (see lib/mailer.ts). No dependencies, so pages and
// tests can check whether email is set up without loading the mail library.
export type GmailConfig = { user: string; pass: string };

export function gmailConfig(env: Record<string, string | undefined> = process.env): GmailConfig | null {
  const user = env.GMAIL_USER?.trim();
  const pass = env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  return user && pass ? { user, pass } : null;
}
