# ChatGPT × Claude Code collaboration playbook

This document coordinates two independent assistants through GitHub. It does not grant Claude access to ChatGPT's connectors, nor enable direct agent-to-agent messaging.

## Handoff loop
1. Human describes the feature or bug to ChatGPT. ChatGPT proposes visual direction, interaction states, UX copy, acceptance criteria and edge cases.
2. Record the approved brief as a GitHub Issue. Keep user data and credentials out of the Issue.
3. Claude Code opens the repository locally, reads `CLAUDE.md`, reviews the Issue and code, posts its technical plan, and creates a dedicated branch and draft PR.
4. ChatGPT reviews PR diffs and preview URLs using its connected GitHub/Vercel tools; provide actionable comments or a revised specification.
5. Claude Code fixes findings and reports actual test output. Human approves release; merge and deploy using existing Git/Vercel integration.
6. After deployment, check production routes, auth flows and errors; roll back if critical regressions are detected.

## Ownership and approvals
- Design owner: ChatGPT; implementation owner: Claude Code; release owner: human.
- Human approval required for production deployment, database migrations, permissions, secrets, billing and destructive operations.
- Avoid parallel edits to the same files. Claude owns implementation branches; ChatGPT supplies design requirements and reviews by default.
- Use GitHub PRs rather than copying whole source files between chats.

## Priority workstream
**Technical audit before feature expansion:** login/sign-up, pending approval, active/suspended/expired membership, admin activation, notification email, API errors and test coverage.
**UI acceptance:** ivory base #fffaf2, champagne gold #c69a61, muted rose #b77c8c; Rococo ornamental framing; legible forms; no obstructive animation; reduced-motion support; accessible focus states.
**Product scenarios:** first-time registration, incomplete profile, pending approval, admin activation, expired member renewal, suspended member support, authentication failures, network failures and mobile users.

## Suggested first Claude Code message
> Please read CLAUDE.md and docs/AI_COLLABORATION.md. Audit the current Zolacoco Tarot member journey end to end without modifying production or merging anything. Create a GitHub Issue or draft PR with prioritized findings, evidence, test gaps and a proposed phased remediation plan. Keep the Rococo UI and existing member permissions intact. Wait for approval before implementing functional changes.
