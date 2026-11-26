# CLAUDE.md — Zolacoco Tarot engineering collaboration

## Project
- Repository: `f6669w8h67-hub/zolacoco-tarot`; production: https://zolacoco-tarot.vercel.app
- Stack: Next.js App Router, Clerk authentication, membership APIs and admin console, Vercel deployment. Confirm the actual implementation before proposing changes.
- Product direction: refined French Rococo UI (ivory, blush pink, champagne gold), responsive, accessible, subtle motion.
- This file provides instructions to Claude Code when opened in this repository; it does **not** automatically connect Claude to ChatGPT.

## Roles
- Claude Code: technical architecture, implementation, debugging, auth/security review, tests, accessibility and performance.
- ChatGPT: product specification, visual design, copy, user flows, UX acceptance criteria and review.
- Human owner: final approval for production release, data changes, payment changes, credentials and permission changes.
- Exchange findings in GitHub Issues and PR descriptions/comments. Never claim a live AI-to-AI conversation unless one is actually connected.

## Required workflow
1. Start with `git status`, `git branch --show-current`, and `git pull` as appropriate; inspect current code and open PRs before changing anything.
2. Pick a GitHub Issue or create one with problem, user scenarios, acceptance criteria, risks and test plan.
3. Work on a dedicated `feat/`, `fix/` or `chore/` branch. Do not push directly to `main`.
4. Before implementation, document a short technical plan, alternatives, affected routes and rollback plan in the Issue or PR.
5. Make small commits and open a **draft PR**. Add test results and screenshots for visual changes.
6. Ask ChatGPT/human to review the UI and behavior via the PR; respond to feedback in the PR.
7. Run applicable tests, lint, build and smoke checks. Never claim a test passed unless it ran successfully.
8. Production deploy only after explicit human approval, successful checks and review. Do not automatically merge PRs.

## Critical invariants
- Never weaken Clerk auth, membership gating, admin authorization, or API authorization.
- A registered user is not automatically an active member; pending, active, suspended, expired and admin states remain distinct.
- Preserve account profile fields, manual approval workflow and existing LINE contact route unless explicitly approved.
- Email notification behavior must not be assumed working merely because deployment succeeded; verify environment and runtime behavior without exposing secrets.
- Keep changes backwards compatible; avoid destructive database migrations or changes to member entitlements without a separate approved plan.
- Never put secrets, tokens, user PII or production database dumps in GitHub Issues, PRs or logs.
- Use preview deployments for verification and test mobile, desktop, keyboard and reduced-motion settings.
- Do not use the current PR to change application behavior; this PR only establishes collaboration documentation.

## Initial engineering audit (no feature changes until approved)
1. Map registration → verification → account profile → pending → admin activation → active access → expiration/suspension.
2. Inspect Clerk configuration and access checks in client, server, middleware/proxy and API routes; identify fail-open paths.
3. Inspect email notifications, retries, duplicate sends and environment dependencies.
4. Review loading/error states, API validation, database permissions and data consistency.
5. Review regression test coverage and production/preview deployment status.
6. Propose prioritized P0/P1/P2 findings with evidence, minimal remediation and acceptance tests.

## Handoff format
In each PR include: **Problem / Scenarios / Technical approach / Files changed / Security implications / Tests actually run / Screenshots or preview / Rollback / Open questions for ChatGPT / Human approval required**.
