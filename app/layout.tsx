import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./rococo-membership.css";
import "./styles/rococo-tokens.css";
import "./styles/rococo-tarot.css";
import MembershipGate, { UnconfiguredMembershipGate } from "./membership-gate";
import { allowsMembershipPreview, isClerkConfigured } from "@/lib/membership-access";
import { clerkLocalization } from "@/lib/clerk-localization";
import SiteHeader from "./site-header";
import SiteNotice from "./site-notice";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zolacoco Tarot｜抽一張屬於你的牌",
  description: "由 Zola 陪你透過塔羅看清此刻的感情、工作、人際與今日指引。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authConfigured = isClerkConfigured(process.env);
  const content = <>
    <SiteHeader />
    <SiteNotice />
    {authConfigured ? (
      <MembershipGate>{children}</MembershipGate>
    ) : allowsMembershipPreview(process.env) ? children : (
      <UnconfiguredMembershipGate>{children}</UnconfiguredMembershipGate>
    )}
  </>;

  return (
    <html lang="zh-Hant">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {authConfigured ? <ClerkProvider localization={clerkLocalization}>{content}</ClerkProvider> : content}
      </body>
    </html>
  );
}
