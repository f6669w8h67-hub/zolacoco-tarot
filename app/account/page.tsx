import AccountClient from "./account-client";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  const configured = Boolean(
    process.env.DATABASE_URL &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );
  if (!configured) {
    return <main className="account-page"><section className="account-hero">
      <p className="eyebrow">ZOLACOCO MEMBER</p><span className="account-status"><i aria-hidden="true" />會員系統設定中</span>
      <h1>會員資料庫已完成，<br />登入服務尚待正式連接</h1>
      <p>完成登入服務授權後，會員可以使用 Email 登入；第一次註冊會等待 Zola 從後台開通。</p>
    </section></main>;
  }
  return <AccountClient />;
}
