import { getSql, membershipErrorResponse, syncCurrentMember } from "@/lib/membership";
import { hasMemberAccess } from "@/lib/membership-access";
import { TRIAL_LIMIT, hasTrialAccess, isTrialFeature, trialRemaining } from "@/lib/visitor-trial";

// 免費體驗 (lib/visitor-trial.ts): how many of the three uses this account has left, and one more use
// when a draw, a pendulum answer or a dice result completes. Signed-in only; proxy.ts lets members who
// are not yet active reach this route, and it decides itself who may use it.
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

type TrialMember = { id: string; role?: string; status?: string; access_expires_at?: string | null; trial_used?: unknown };

function state(member: TrialMember) {
  if (hasMemberAccess(member)) return { mode: "member" as const };
  if (!hasTrialAccess(member)) return { mode: "none" as const };
  const remaining = trialRemaining(member.trial_used);
  return { mode: "trial" as const, used: TRIAL_LIMIT - remaining, remaining };
}

export async function GET() {
  try {
    const member = await syncCurrentMember() as TrialMember;
    return Response.json(state(member), { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const member = await syncCurrentMember() as TrialMember;
    let body: { feature?: unknown } | null = null;
    try { body = await request.json(); } catch { /* checked below */ }
    if (!isTrialFeature(body?.feature)) return Response.json({ error: "UNKNOWN_FEATURE" }, { status: 400, headers: noStore });
    const current = state(member);
    if (current.mode === "member") return Response.json(current, { headers: noStore });
    if (current.mode === "none") return Response.json({ error: "TRIAL_NOT_AVAILABLE" }, { status: 403, headers: noStore });
    // One statement: a use is counted only while the account is still unactivated and under the limit,
    // so two tabs finishing at once can never take it past three.
    const rows = await getSql()`
      UPDATE members SET trial_used = trial_used + 1
      WHERE id = ${member.id} AND role = 'member' AND status = 'pending' AND trial_used < ${TRIAL_LIMIT}
      RETURNING trial_used
    `;
    if (!rows[0]) return Response.json({ error: "TRIAL_USED_UP", mode: "trial", used: TRIAL_LIMIT, remaining: 0 }, { status: 409, headers: noStore });
    const remaining = trialRemaining(rows[0].trial_used);
    return Response.json({ mode: "trial", used: TRIAL_LIMIT - remaining, remaining }, { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
