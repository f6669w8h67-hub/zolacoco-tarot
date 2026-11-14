import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "會員中心｜Zolacoco Tarot",
  description: "查看會員狀態、存檔與 Zola 的回覆。",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
