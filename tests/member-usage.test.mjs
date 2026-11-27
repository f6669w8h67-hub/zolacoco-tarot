import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// 會員使用次數 (Zola 2026-11-27: 會員的使用頻率，就是會員使用的次數，我在後台也要看得到): each signed-in account's
// uses of the tools, counted on the account, the same tool within 10 minutes once; shown in the 會員後台.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const plain = (value) => JSON.parse(JSON.stringify(value));
const usage = await loadTypescript("lib/member-usage.ts");

test("the tools that count, and a member's numbers as the 會員後台 shows them", () => {
  assert.deepEqual(plain(usage.USAGE_FEATURES.map((feature) => feature.id)), ["tarot", "pendulum", "astro-dice", "awareness", "intuition", "journal", "astrology", "healing", "quizzes"]);
  assert.equal(usage.USAGE_WINDOW_MINUTES, 10);
  for (const id of ["tarot", "healing", "quizzes"]) assert.equal(usage.isUsageFeature(id), true, id);
  for (const bad of ["", "Tarot", "admin", null, 1, "tarot "]) assert.equal(usage.isUsageFeature(bad), false, String(bad));

  assert.deepEqual(plain(usage.memberUsage({ usage_total: 48, usage_30d: "12", usage_days_30d: 5, usage_last_at: "2026-11-27T12:40:00Z", usage_by_feature: { pendulum: 10, tarot: 20, healing: 3, "astro-dice": 10, odd: 0 } })), {
    total: 48, last30: 12, days30: 5, lastAt: "2026-11-27T12:40:00.000Z",
    byFeature: [{ id: "tarot", label: "塔羅", n: 20 }, { id: "astro-dice", label: "星骰", n: 10 }, { id: "pendulum", label: "靈擺", n: 10 }, { id: "healing", label: "療癒小房間", n: 3 }],
  });
  assert.deepEqual(plain(usage.memberUsage({})), { total: 0, last30: 0, days30: 0, lastAt: null, byFeature: [] }, "never used: all zero");
  assert.deepEqual(plain(usage.memberUsage({ usage_total: -3, usage_30d: "x", usage_by_feature: "nope" })), { total: 0, last30: 0, days30: 0, lastAt: null, byFeature: [] });
});

async function usageRoute({ userId = "user_1", authFails = false, member = { id: "m1", role: "member" }, counted = true, fail = false, clerk = true } = {}) {
  const queries = [];
  const route = await loadTypescript("app/api/usage/route.ts", { mocks: {
    "@clerk/nextjs/server": { auth: async () => { if (authFails) throw new Error("clerk hiccup"); return { userId }; } },
    "@/lib/membership": {
      ensureMembershipSchema: async () => {},
      getSql: () => async (strings, ...values) => {
        const text = strings.join("?");
        queries.push({ text, values });
        if (fail) throw new Error("db down");
        if (/SELECT id, role FROM members/.test(text)) return member ? [member] : [];
        return counted ? [{ n: 1 }] : [];
      },
    },
    "@/lib/membership-access": { isClerkConfigured: () => clerk },
  } });
  return { route, queries };
}
const send = (body) => ({ text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });

test("/api/usage: a signed-in member's use is counted on her account; Zola, visitors and anything odd are not", async () => {
  let { route, queries } = await usageRoute();
  let response = await route.POST(send({ feature: "pendulum" }));
  assert.deepEqual([response.status, plain(await response.json())], [200, { counted: true }]);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const upsert = queries[1];
  // the window is checked against the tool's latest counted use on any day, then the Taipei day is counted
  assert.match(upsert.text, /WITH gate AS \(\s+INSERT INTO member_usage_last \(member_id, feature, last_at\) VALUES \(\?, \?, now\(\)\)\s+ON CONFLICT \(member_id, feature\) DO UPDATE SET last_at = now\(\)\s+WHERE member_usage_last\.last_at < now\(\) - interval '10 minutes'\s+RETURNING 1\s+\)/, "the same tool within 10 minutes is one use, across midnight too");
  assert.match(upsert.text, /INSERT INTO member_usage \(member_id, feature, day, n, last_at\)\s+SELECT \?, \?, \(now\(\) AT TIME ZONE 'Asia\/Taipei'\)::date, 1, now\(\) FROM gate\s+ON CONFLICT \(member_id, feature, day\) DO UPDATE SET n = member_usage\.n \+ 1, last_at = now\(\)/, "counted on the Taipei day");
  assert.deepEqual(upsert.values, ["m1", "pendulum", "m1", "pendulum"], "only the account and the tool");

  ({ route } = await usageRoute({ counted: false }));
  assert.deepEqual(plain(await (await route.POST(send({ feature: "tarot" }))).json()), { counted: false, reason: "recent" }, "a second draw within 10 minutes");

  for (const body of [{ feature: "admin" }, {}, "not json", "", JSON.stringify({ feature: "tarot", pad: "x".repeat(300) })]) {
    ({ route, queries } = await usageRoute());
    assert.equal((await route.POST(send(body))).status, 400, String(JSON.stringify(body)).slice(0, 40));
    assert.equal(queries.length, 0, "turned away before the database");
  }

  ({ route, queries } = await usageRoute({ userId: null }));
  assert.deepEqual(plain(await (await route.POST(send({ feature: "quizzes" }))).json()), { counted: false, reason: "signed-out" });
  assert.equal(queries.length, 0);
  ({ route, queries } = await usageRoute({ member: { id: "z", role: "admin" } }));
  assert.deepEqual(plain(await (await route.POST(send({ feature: "tarot" }))).json()), { counted: false, reason: "not-member" }, "Zola's own use is not counted");
  assert.equal(queries.length, 1, "no write for Zola");
  ({ route, queries } = await usageRoute({ member: null }));
  assert.deepEqual(plain(await (await route.POST(send({ feature: "tarot" }))).json()), { counted: false, reason: "not-member" }, "an account not yet in the member list");
  ({ route, queries } = await usageRoute({ authFails: true }));
  assert.equal((await route.POST(send({ feature: "tarot" }))).status, 503, "sign-in cannot say who: nothing counted");
  assert.equal(queries.length, 0);
  ({ route } = await usageRoute({ fail: true }));
  assert.equal((await route.POST(send({ feature: "tarot" }))).status, 503);
  ({ route, queries } = await usageRoute({ clerk: false }));
  assert.deepEqual(plain(await (await route.POST(send({ feature: "tarot" }))).json()), { counted: false, reason: "signed-out" });

  const access = await loadTypescript("lib/membership-access.ts");
  assert.equal(access.isMembershipServiceRoute("/api/usage"), true, "accounts not yet activated (free trial) reach it too");
  const schema = await read("lib/membership.ts");
  assert.match(schema, /CREATE TABLE IF NOT EXISTS member_usage \(\n\s*member_id uuid NOT NULL REFERENCES members\(id\) ON DELETE CASCADE,\n\s*feature text NOT NULL CHECK \(char_length\(feature\) BETWEEN 1 AND 24\),\n\s*day date NOT NULL,/);
  assert.match(schema, /PRIMARY KEY \(member_id, feature, day\)/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS member_usage_last \(\n\s*member_id uuid NOT NULL REFERENCES members\(id\) ON DELETE CASCADE,[^]*?PRIMARY KEY \(member_id, feature\)/);
});

async function usagePage(answers, stored = new Map(), start = 1_000_000) {
  const client = await loadTypescript("app/member-usage-client.ts");
  const sent = [];
  let now = start;
  const deps = {
    storage: { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    send: async (body) => { sent.push(JSON.parse(body)); const a = answers.shift() ?? { status: 200, body: { counted: true } }; if (a === "offline") throw new Error("offline"); return { ok: a.status < 300, status: a.status, json: async () => a.body }; },
    now: () => now,
  };
  return { client, deps, sent, stored, later: (minutes) => { now += minutes * 60_000; } };
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test("on the pages: the same tool is sent at most once per 10 minutes per account; a failed send is tried on the next use", async () => {
  let page = await usagePage([]);
  const use = (feature, who = "user_A") => page.client.recordUse(feature, page.deps, who);
  use("tarot");
  use("tarot"); // the same moment
  await settle();
  use("tarot"); // a second draw a little later
  use("pendulum");
  await settle();
  page.later(11);
  use("tarot");
  await settle();
  assert.deepEqual(page.sent, [{ feature: "tarot" }, { feature: "pendulum" }, { feature: "tarot" }]);

  page = await usagePage([{ status: 503 }, "offline", { status: 200, body: { counted: true } }]);
  for (let i = 0; i < 4; i++) { page.client.recordUse("awareness", page.deps, "user_A"); await settle(); }
  assert.equal(page.sent.length, 3, "busy and offline are not remembered as sent; once through, the window holds");

  // two accounts on one phone (review #65): A's use never holds back B's
  const shared = new Map();
  page = await usagePage([], shared);
  page.client.recordUse("tarot", page.deps, "user_A");
  await settle();
  page.client.recordUse("tarot", page.deps, "user_B");
  await settle();
  page.client.recordUse("tarot", page.deps, "user_A");
  await settle();
  assert.equal(page.sent.length, 2, "A once, B once");
  assert.equal([...shared.keys()].some((key) => key.includes("user_")), false, "the account's id is not kept on the phone");

  // signed out: nothing is sent; signing in on the same page counts from then on (review #65)
  page = await usagePage([]);
  page.client.recordUse("quizzes", page.deps, "signed-out");
  page.client.recordUse("quizzes", page.deps, "unknown");
  await settle();
  assert.equal(page.sent.length, 0);
  page.client.recordUse("quizzes", page.deps, "user_C");
  await settle();
  assert.equal(page.sent.length, 1);

  // sign-in still loading: nobody's memory applies, the site decides; nothing is remembered for anyone
  const loading = new Map([["zu:any:tarot", String(1_000_000)]]);
  page = await usagePage([], loading);
  page.client.recordUse("tarot", page.deps, null);
  await settle();
  assert.equal(page.sent.length, 1);
  assert.equal(loading.size, 1);

  // the site said the account is not a member (yet), or Zola: not remembered, so a later use is sent again
  page = await usagePage([{ status: 200, body: { counted: false, reason: "not-member" } }]);
  page.client.recordUse("tarot", page.deps, "user_Z");
  await settle();
  page.client.recordUse("tarot", page.deps, "user_Z");
  await settle();
  assert.equal(page.sent.length, 2);

  // storage blocked, or a send that throws: never in the way of the page
  page = await usagePage([]);
  page.client.recordUse("healing", { ...page.deps, storage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } } }, "user_A");
  page.client.recordUse("journal", { ...page.deps, send: () => { throw new Error("no fetch here"); } }, "user_A");
  await settle();
  assert.deepEqual(page.sent, [{ feature: "healing" }]);

  const helper = await read("app/member-usage-client.ts");
  assert.match(helper, /keepalive: true/);
  assert.match(helper, /send\(JSON\.stringify\(\{ feature \}\)\)/, "only the tool is sent, never the account");
  const identity = await read("app/auth-identity.tsx");
  assert.match(identity, /useEffect\(\(\) => setUsageIdentity\(isLoaded \? userId \?\? "signed-out" : null\), \[isLoaded, userId\]\);/, "follows sign-in, sign-out and account switches");
});

test("every tool counts at the moment it has done its thing", async () => {
  const at = async (path, pattern) => assert.match(await read(path), pattern, path);
  await at("app/page.tsx", /setRevealed\(true\); if \(trial\.visitor\) trial\.spend\("tarot"\); recordUse\("tarot"\);/);
  await at("app/page.tsx", /setIntuitionChoice\(option\.text\); setIntuitionFeedback\(option\); recordUse\("intuition"\);/);
  await at("app/pendulum/page.tsx", /if\(trial\.visitor\)trial\.spend\("pendulum"\);recordUse\("pendulum"\);/);
  await at("app/astro-dice/page.tsx", /if\(trial\.visitor\)trial\.spend\("astro-dice"\);recordUse\("astro-dice"\);/);
  await at("app/awareness/page.tsx", /setAnnounce\(`妳抽到了「\$\{card\.name\}」：\$\{card\.line\}`\);\n\s*recordUse\("awareness"\);/);
  const journal = await read("app/journal/journal-tool.tsx");
  assert.equal((journal.match(/recordUse\("journal"\);/g) ?? []).length, 2, "a note saved on this phone, or saved and shared");
  assert.match(journal, /setLocalSave\("saved"\);\n\s*setResponseFor\(day\);\n\s*recordUse\("journal"\);/);
  assert.match(journal, /已儲存並同步給 Zola。" \}\);\n\s*setResponseFor\(day\);\n\s*recordUse\("journal"\);/);
  await at("app/astrology-exploration/page.tsx", /const done = await compute\(birth\);\n\s*if \(!done\) return;\n\s*recordUse\("astrology"\);/);
  await at("app/healing-room/page.tsx", /useEffect\(\(\)=>recordUse\("healing"\),\[\]\);/);
  await at("app/quizzes/[code]/abc-quiz.tsx", /countOnce\(quiz\.code, "read", choice\);\n\s*recordUse\("quizzes"\);/);
  await at("app/quizzes/[code]/first-sight-quiz.tsx", /countOnce\(quiz\.code, "read", objects\[index\]\.name\);\n\s*recordUse\("quizzes"\);/);
});

test("the 會員後台 shows each member's use, and can sort by the latest use or by how much", async () => {
  const route = await read("app/api/membership/admin/route.ts");
  assert.match(route, /u\.usage_total, u\.usage_30d, u\.usage_days_30d, u\.usage_last_at, uf\.usage_by_feature/);
  assert.match(route, /COALESCE\(sum\(n\) FILTER \(WHERE day > \(now\(\) AT TIME ZONE 'Asia\/Taipei'\)::date - 30\), 0\)::int AS usage_30d/);
  assert.match(route, /SELECT json_object_agg\(feature, total\) AS usage_by_feature/);
  const admin = await read("app/zola-admin/admin-client.tsx");
  assert.match(admin, /<MemberUsageBlock member=\{member\} \/><\/div>/);
  assert.match(admin, /<span>近 30 天 <b>\{usage\.last30\}<\/b> 次（\{usage\.days30\} 天）<\/span>\n\s*<span>總共 <b>\{usage\.total\}<\/b> 次<\/span>/);
  assert.match(admin, /還沒有使用紀錄/);
  assert.match(admin, /使用紀錄：同一個功能隔 10 分鐘以上才算下一次，是大約的使用頻率；從這次更新上線後開始記，妳自己用的不算。/);
  assert.match(admin, /<option value="recent">依最近使用（最近的在前）<\/option><option value="usage">依使用次數（近 30 天多的在前）<\/option>/);
  assert.match(admin, /if \(key === "recent"\) return \[\.\.\.list\]\.sort\(\(a, b\) => time\(b\.usage_last_at, 0\) - time\(a\.usage_last_at, 0\)\);/);
});
