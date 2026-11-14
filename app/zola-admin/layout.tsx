import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zola 會員後台｜Zolacoco Tarot",
  robots: { index: false, follow: false },
};

export default function ZolaAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
