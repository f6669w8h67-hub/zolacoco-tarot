import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "星骰此刻指引｜Zolacoco Tarot",
  description: "擲出行星、星座與宮位，拆解此刻的能量、表現方式與生活領域。",
};

export default function AstroDiceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
