import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <main className="auth-page"><section className="auth-setup"><h1>登入服務設定中</h1><p>會員資料庫已完成，Email 登入服務尚待正式連接。</p></section></main>;
  }
  return <main className="auth-page"><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/account" /></main>;
}
