# 交接筆記：zolacoco.com（Cloudflare Workers）

最後更新：2026-11-24

## 網站在哪裡
| 項目 | 內容 |
|---|---|
| 正式網址 | https://zolacoco.com （www、http 都會 301 轉過來，路徑和參數保留） |
| Cloudflare 帳號 | 用 **Apple 登入**的那個帳號（Email 是 Apple 隱藏地址，不寫在這裡；終端機跑 `npx wrangler@4 whoami` 可以看到） |
| 網站 Worker | `zolacoco-tarot`（這個資料夾，GitHub 分支 `cloudflare-migration`） |
| www 轉址 Worker | `zolacoco-tarot-www`（電腦上的 `../zolacoco-tarot-www` 資料夾，不在 git 裡；它只做 www → zolacoco.com） |
| 每日排程 | 每天台灣 09:00（`0 1 * * *` UTC）呼叫會員到期提醒；沒有放 `CRON_SECRET` 時會自動跳過，不寄信 |
| 測試網址 | workers.dev 已關閉（`workers_dev: false`） |

## 網域
- zolacoco.com 在 **Cloudflare** 買的，2026-11-24 註冊，**2027-11-24 到期**。
- 請到 Cloudflare 後台 → Domain Registration → zolacoco.com，確認 **Auto Renew（自動續約）是開的**。
- 如果收到「驗證 Email」（verify your email / registrant contact）的信，要在 **15 天內（2026-12-09 前）點連結**，不然網域會被停用。
- DNS 目前沒有任何信箱記錄（MX）。之後要用 hello@zolacoco.com 收信時再設。

## 放在 Cloudflare 的密鑰（只寫名稱，不寫值）
- `DATABASE_URL`：Neon 資料庫（Vercel → Storage → neon-erin-school → Quickstart → Show secret）
- `CLERK_SECRET_KEY`：Clerk 會員登入（Vercel → Integrations → Clerk → clerk-crimson-curtain → Show secret）
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`：Clerk 公開金鑰（**建置時也要有**，放在本機 `.env.local`，不進 git）
- `BLOB_READ_WRITE_TOKEN`：Vercel Blob 圖片（Vercel → Storage → zolacoco-tarot-blob → .env.local → Show secret，第 2 行）

換值的方法：在這個資料夾的終端機跑 `npx wrangler@4 secret put <名稱>`，貼上值，按 Enter。

**還沒放的（寄信功能從來沒開過）**：`GMAIL_USER`、`GMAIL_APP_PASSWORD`、`MEMBERSHIP_EMAIL_ENABLED`、`MEMBERSHIP_EMAIL_TO`、`MEMBERSHIP_ADMIN_ORIGIN`、`CRON_SECRET`。要開寄信時，先用暫時的 Worker `zolacoco-mail-test`（程式在 `work/mail-test`，不進 git）測一封寄給自己，確認 Gmail 從 Cloudflare 寄得出去，再放到正式站；測完把 `zolacoco-mail-test` 刪掉。

## 以後怎麼更新網站
1. 改檔案。
2. 建置（Mac 沒有 GNU `timeout`，所以不用 `npm run build`，用這行）：
   ```bash
   SITES_ENV_READY=1 bash scripts/sites-env.sh -- ./node_modules/.bin/vinext build
   ```
3. 本機預覽：`npx wrangler@4 dev`（沒有放 `.dev.vars` 的話，會員頁會顯示「暫時無法使用」，這是正常的）。
4. Zola 說可以 → `npx wrangler@4 deploy`。
5. 等 1～5 分鐘再打開 https://zolacoco.com 看；看到 Success 不等於完成，要實際打開。

## 出事了怎麼辦
- **新版改壞了**：`npx wrangler@4 rollback`，回到上一版。
- **整個要退回 Vercel**：舊網站 https://zolacoco-tarot.vercel.app 還在、照常運作（**2026-12-24 前不要刪 Vercel 專案**）。到 Cloudflare 後台 → Workers → zolacoco-tarot → Settings → Domains & Routes 移除 zolacoco.com，再到 Vercel 專案 Settings → Domains 加入 zolacoco.com，依 Vercel 畫面顯示的值加 DNS 記錄（灰雲）。

## 還沒做的
- [ ] **步驟 9**：確認新站穩定後，在 Vercel 加轉址，讓 zolacoco-tarot.vercel.app 301 到 zolacoco.com（用獨立分支，不混進這邊的程式碼），轉址至少留 30 天。
- [ ] Clerk 升級正式版（目前是開發版 pk_test；正式版要在 Cloudflare 加 DNS 記錄、換新金鑰，會員帳號要搬）。
- [ ] 需要時開寄信功能（見上面）。
- [ ] 舊站網址清單在 `舊站網址.txt`，以後驗收可以拿來對照。
