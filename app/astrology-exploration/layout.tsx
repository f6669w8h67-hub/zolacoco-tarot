import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "探索妳的星盤｜Zolacoco Tarot",
  description: "輸入出生日期、時間與地點，排出妳的本命盤，看見太陽、月亮、上升與更多行星的白話解讀。",
};

export default function AstrologyExplorationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
