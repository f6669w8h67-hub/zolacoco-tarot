import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "註冊｜Zolacoco Tarot",
  description: "註冊 Zolacoco Tarot 會員。",
  robots: { index: false, follow: false },
};

export default function SignUpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
