type Sql = (strings: TemplateStringsArray, ...values: string[]) => Promise<Record<string, unknown>[]>;

let schemaReady: Promise<unknown> | undefined;

export async function notifyPendingMember(sql: Sql, memberId: string) {
  if (process.env.MEMBERSHIP_EMAIL_ENABLED !== "true") return;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MEMBERSHIP_EMAIL_FROM?.trim();
  const to = process.env.MEMBERSHIP_EMAIL_TO?.trim();
  const origin = process.env.MEMBERSHIP_ADMIN_ORIGIN?.trim();
  // Enabled but incomplete: say which names are missing (never their values), so it is not silent.
  if (!apiKey || !from || !to || !origin) {
    const missing = [
      !apiKey && "RESEND_API_KEY",
      !from && "MEMBERSHIP_EMAIL_FROM",
      !to && "MEMBERSHIP_EMAIL_TO",
      !origin && "MEMBERSHIP_ADMIN_ORIGIN",
    ].filter(Boolean);
    console.error("member_activation_email_misconfigured", { missing });
    return;
  }

  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" || url.username || url.password || url.href !== url.origin + "/") {
      throw new Error("Invalid membership admin origin");
    }
    const adminUrl = new URL("/zola-admin", url).href;

    schemaReady ??= sql`
      CREATE TABLE IF NOT EXISTS member_activation_notifications (
        member_id uuid PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
        status text NOT NULL CHECK (status IN ('sending', 'sent', 'failed', 'unknown')),
        attempted_at timestamptz NOT NULL DEFAULT now(),
        finished_at timestamptz,
        provider_status integer
      )
    `.catch((error) => {
      schemaReady = undefined;
      throw error;
    });
    await schemaReady;

    const [member] = await sql`
      WITH eligible AS (
        SELECT id, full_name, email FROM members
        WHERE id = ${memberId} AND role = 'member' AND status = 'pending'
          AND btrim(full_name) <> '' AND btrim(line_id) <> '' AND birthday IS NOT NULL
        FOR UPDATE
      ), claimed AS (
        INSERT INTO member_activation_notifications (member_id, status)
        SELECT id, 'sending' FROM eligible
        ON CONFLICT (member_id) DO NOTHING
        RETURNING member_id
      )
      SELECT eligible.full_name, eligible.email
      FROM eligible JOIN claimed ON eligible.id = claimed.member_id
    `;
    if (!member) return;

    let status = "unknown";
    let providerStatus = "";
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `member-activation/${memberId}`,
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: "Zolacoco Tarot｜有新會員待開通",
          text: `姓名：${member.full_name}\nEmail：${member.email}\n\n請至會員管理後台確認並開通權限：\n${adminUrl}`,
        }),
        signal: AbortSignal.timeout(4000),
        redirect: "error",
      });
      providerStatus = String(response.status);
      if (response.ok) status = "sent";
      else if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 409) {
        status = "failed";
      }
    } catch {
      // A timeout or connection error can occur after the provider accepts the email.
    }

    await sql`
      UPDATE member_activation_notifications
      SET status = ${status}, finished_at = now(), provider_status = NULLIF(${providerStatus}, '')::integer
      WHERE member_id = ${memberId}
    `;
    if (status !== "sent") console.error("member_activation_email_unsent", { status, providerStatus });
  } catch {
    console.error("member_activation_email_error");
  }
}
