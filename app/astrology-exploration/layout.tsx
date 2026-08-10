import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "探索你的星盤｜Zolacoco Tarot",
  description: "透過四個簡單提問，看見內在需求、人生課題與適合深入解析的星盤方向。",
};

export default function AstrologyExplorationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
