import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <main className="auth-page"><section className="auth-setup"><h1>登入服務設定中</h1><p>會員資料庫已完成，Email 登入服務尚待正式連接。</p></section></main>;
  }
  return <main className="auth-page"><section className="rococo-shell">
    <div className="rococo-crest" aria-hidden="true">☾</div>
    <p className="rococo-brand">ZOLACOCO TAROT</p>
    <p className="rococo-kicker">MAISON DE TAROT</p>
    <div className="rococo-divider" aria-hidden="true" />
    <h1 className="rococo-title">歡迎回到 Zolacoco</h1>
    <p className="rococo-description">妳的專屬占卜空間，正等待妳回來</p>
    <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/account"
      appearance={{elements:{rootBox:{width:"100%"},card:{boxShadow:"none",background:"transparent"},headerTitle:{display:"none"},headerSubtitle:{display:"none"}}}} />
  </section></main>;
}
