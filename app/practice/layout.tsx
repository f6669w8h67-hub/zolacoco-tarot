import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "學員練習室｜Zolacoco Tarot",
  description: "Zola 學員專屬的牌面練習與回饋。",
  robots: { index: false, follow: false },
};

export default function PracticeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
