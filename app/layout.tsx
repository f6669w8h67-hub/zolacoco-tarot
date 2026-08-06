import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zolacoco Tarot｜在迷霧裡，陪你看見方向",
  description: "塔羅占卜、內在探索與療癒練習。讓答案不只是預測，而是你重新理解自己的開始。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
