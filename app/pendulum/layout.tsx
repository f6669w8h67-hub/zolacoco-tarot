import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "靈擺直覺問答｜Zolacoco Tarot",
  description: "把問題整理成是非題，透過靈擺擺動聽見此刻的直覺。",
};

export default function PendulumLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
