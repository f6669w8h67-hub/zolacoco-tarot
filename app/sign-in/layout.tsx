import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登入｜Zolacoco Tarot",
  description: "登入 Zolacoco Tarot 會員。",
  robots: { index: false, follow: false },
};

export default function SignInLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
