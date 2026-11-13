import { isClerkConfigured } from "@/lib/membership-access";
import { SignIn } from "@clerk/nextjs";
import { clerkPearlPageAppearance } from "@/lib/clerk-pearl-appearance";
import "../../styles/pearl-page.css";

export default function SignInPage() {
  if (!isClerkConfigured(process.env)) {
    return <main className="auth-page pearl-page"><section className="auth-setup"><h1>登入服務設定中</h1><p>會員資料庫已完成，Email 登入服務尚待正式連接。</p></section></main>;
  }
  return <main className="auth-page pearl-page"><section className="rococo-shell">
    <div className="rococo-crest" aria-hidden="true"><svg viewBox="0 0 64 48"><path d="M32 42 9 21c5-9 14-14 23-14s18 5 23 14Z" /><path d="M32 42 18 14M32 42V8M32 42l14-28M32 42 12 25M32 42l20-17" /><circle cx="32" cy="44" r="2.4" /></svg></div>
    <p className="rococo-brand">ZOLACOCO TAROT</p>
    <p className="rococo-kicker">maison de tarot</p>
    <div className="rococo-divider" aria-hidden="true" />
    <h1 className="rococo-title">歡迎回到 Zolacoco</h1>
    <p className="rococo-description">妳的專屬占卜空間，正等待妳回來</p>
    <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/account" appearance={clerkPearlPageAppearance} />
  </section></main>;
}
