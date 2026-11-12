import { isClerkConfigured } from "@/lib/membership-access";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  if (!isClerkConfigured(process.env)) {
    return <main className="auth-page"><section className="auth-setup"><h1>註冊服務設定中</h1><p>會員資料庫已完成，Email 登入服務尚待正式連接。</p></section></main>;
  }
  return <main className="auth-page"><section className="rococo-shell">
    <div className="rococo-crest" aria-hidden="true">☾</div>
    <p className="rococo-brand">ZOLACOCO TAROT</p>
    <p className="rococo-kicker">MAISON DE TAROT</p>
    <div className="rococo-divider" aria-hidden="true" />
    <h1 className="rococo-title">建立會員帳號</h1>
    <p className="rococo-description">加入 Zolacoco，開啟妳的專屬塔羅旅程</p>
    <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/account"
      appearance={{elements:{rootBox:{width:"100%"},card:{boxShadow:"none",background:"transparent"},headerTitle:{display:"none"},headerSubtitle:{display:"none"}}}} />
  </section></main>;
}
