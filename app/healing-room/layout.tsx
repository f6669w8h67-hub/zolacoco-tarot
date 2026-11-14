import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "療癒小房間｜Zolacoco Tarot",
  description: "選一個此刻最需要的陪伴，慢慢照顧自己的情緒。",
};

export default function HealingRoomLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
