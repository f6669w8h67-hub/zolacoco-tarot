import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "七日陪跑筆記｜Zolacoco Tarot",
  description: "Zola 陪跑中的七日塔羅筆記，逐天閱讀與回覆。",
  robots: { index: false, follow: false },
};

export default function JournalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
