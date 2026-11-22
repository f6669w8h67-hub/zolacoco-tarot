import type { Metadata } from "next";
import "./quizzes.css";

export const metadata: Metadata = {
  title: "心理測驗｜Zolacoco Tarot",
  description: "翻閱此刻與妳有共鳴的心理測驗：選一張最有感覺的牌，或說出妳第一眼看到的東西，在網站上就能看完整解析。",
};

export default function QuizzesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
