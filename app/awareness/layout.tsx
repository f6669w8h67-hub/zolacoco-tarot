import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zolacoco 覺察卡｜Zolacoco Tarot",
  description: "洗牌後抽一張此刻的覺察卡：一句提醒、一段解析、一個提問和一個小練習。",
};

export default function AwarenessLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
