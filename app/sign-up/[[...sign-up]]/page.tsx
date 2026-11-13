import { isClerkConfigured } from "@/lib/membership-access";
import { SignUp } from "@clerk/nextjs";
import { clerkPearlPageAppearance } from "@/lib/clerk-pearl-appearance";
import "../../styles/pearl-page.css";

export default function SignUpPage() {
  if (!isClerkConfigured(process.env)) {
    return <main className="auth-page pearl-page"><section className="auth-setup"><h1>註冊服務設定中</h1><p>會員資料庫已完成，Email 登入服務尚待正式連接。</p></section></main>;
  }
  return <main className="auth-page pearl-page"><section className="rococo-shell">
    <div className="rococo-crest" aria-hidden="true"><svg viewBox="0 0 64 48"><path d="M32 42 9 21c5-9 14-14 23-14s18 5 23 14Z" /><path d="M32 42 18 14M32 42V8M32 42l14-28M32 42 12 25M32 42l20-17" /><circle cx="32" cy="44" r="2.4" /></svg></div>
    <p className="rococo-brand">ZOLACOCO TAROT</p>
    <p className="rococo-kicker">maison de tarot</p>
    <div className="rococo-divider" aria-hidden="true" />
    <h1 className="rococo-title">建立會員帳號</h1>
    <p className="rococo-description">加入 Zolacoco，開啟妳的專屬塔羅旅程</p>
    <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/account" appearance={clerkPearlPageAppearance} />
  </section></main>;
}
