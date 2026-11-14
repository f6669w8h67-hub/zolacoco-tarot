import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "我的存檔｜Zolacoco Tarot",
  robots: { index: false, follow: false },
};

export default function ArchiveLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
