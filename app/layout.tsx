import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./rococo-membership.css";
import "./styles/rococo-tokens.css";
import "./styles/rococo-tarot.css";
import "./styles/zola-post.css";
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
      <head>
        {/* Post theme typefaces: heavy serif titles and italic English labels (Issue #12). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500;1,600&family=Noto+Serif+TC:wght@500;700;900&display=swap" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {authConfigured ? <ClerkProvider localization={clerkLocalization}>{content}</ClerkProvider> : content}
      </body>
    </html>
  );
}
