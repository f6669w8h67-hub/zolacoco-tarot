// 陪跑筆記, the member's side: their own shared rounds, notes and Zola's replies (GET), and starting a
// shared round, saving one day, or taking a round back (POST).
// Who: reading and taking a round back — the owner (signed in, not suspended for reading). Starting
// and saving — Zola, or a member she marked 陪跑中 (not suspended), never by VIP months alone.
// The member is always the signed-in person: no member id is ever read from the request.
import { JOURNAL_PROMPT_VERSION } from "@/lib/journal-prompts";
import { MembershipError, membershipErrorResponse, syncCurrentMember } from "@/lib/membership";
import { hasCoachingAccess } from "@/lib/membership-access";
import { parseJournalBody, publicCycle, publicEntry } from "@/lib/coaching-input";
import { ensureCoachingSchema, listOwnJournal, saveEntry, startSharedCycle, stopSharingCycle } from "@/lib/coaching-store";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const member = await syncCurrentMember();
    if (member.role !== "admin" && member.status === "suspended") throw new MembershipError("SUSPENDED", 403);
    await ensureCoachingSchema();
    const journal = await listOwnJournal(member.id);
    return Response.json({
      canWrite: hasCoachingAccess(member),
      promptVersion: JOURNAL_PROMPT_VERSION,
      cycles: journal.cycles.map(publicCycle),
      entries: journal.entries.map(publicEntry),
    }, { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const member = await syncCurrentMember();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "資料格式不正確，請重新整理後再試一次。" }, { status: 400, headers: noStore });
    }
    const checked = parseJournalBody(body);
    if (!checked.ok) return Response.json({ error: checked.error }, { status: 400, headers: noStore });
    const input = checked.value;

    // Taking consent back always works for the owner, also after 陪跑 ended.
    if (input.action === "stop") {
      await ensureCoachingSchema();
      const cycle = await stopSharingCycle(member.id, input.cycleId);
      if (!cycle) return Response.json({ error: "找不到這一輪筆記。" }, { status: 404, headers: noStore });
      return Response.json({ cycle: publicCycle(cycle) }, { headers: noStore });
    }

    if (!hasCoachingAccess(member)) throw new MembershipError("NOT_COACHING", 403);
    await ensureCoachingSchema();

    if (input.action === "start") {
      const started = await startSharedCycle(member.id);
      if (!started) return Response.json({ error: "暫時無法開始新的一輪，請重新整理後再試一次。" }, { status: 409, headers: noStore });
      return Response.json({ cycle: publicCycle(started.cycle), created: started.created }, { headers: noStore });
    }

    const saved = await saveEntry(member.id, {
      cycleId: input.cycleId,
      day: input.day,
      content: input.content,
      promptVersion: JOURNAL_PROMPT_VERSION,
    }, input.expectedRevision);
    if (saved.ok) return Response.json({ entry: publicEntry(saved.entry), cycle: publicCycle(saved.cycle) }, { headers: noStore });
    if (saved.reason === "cycle") {
      return Response.json({ error: "這一輪筆記已經停止同步，沒有再傳給 Zola。" }, { status: 409, headers: noStore });
    }
    return Response.json({
      error: "這一天的筆記在另一個視窗已經更新過，已載入最新的內容，請確認後再儲存。",
      entry: saved.current ? publicEntry(saved.current) : null,
    }, { status: 409, headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
