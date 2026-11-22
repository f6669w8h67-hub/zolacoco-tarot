import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ClerkIdentityProvider } from "./auth-identity";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./rococo-membership.css";
import "./styles/rococo-tokens.css";
import "./styles/rococo-tarot.css";
import "./styles/card-face.css";
import "./styles/site-dock.css";
import "./styles/serif-all.css";
import MembershipGate, { UnconfiguredMembershipGate } from "./membership-gate";
import { allowsMembershipPreview, isClerkConfigured } from "@/lib/membership-access";
import { clerkLocalization } from "@/lib/clerk-localization";
import { clerkPearlAppearance } from "@/lib/clerk-pearl-appearance";
import SiteHeader from "./site-header";
import SiteDock from "./site-dock";
import PearlFonts from "./pearl-fonts";
import { TrialProvider } from "./visitor-trial";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zolacoco Tarot｜抽一張屬於妳的牌",
  description: "由 Zola 陪妳透過塔羅看清此刻的感情、工作、人際與今日指引。",
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
    <PearlFonts />
    <SiteHeader />
    {authConfigured ? (
      <MembershipGate>{children}</MembershipGate>
    ) : allowsMembershipPreview(process.env) ? (
      // Development preview only (never production): MEMBERSHIP_PREVIEW_AS=signed-out or account shows the
      // 免費體驗 screens as a signed-out visitor or a registered, unactivated account would see them.
      process.env.MEMBERSHIP_PREVIEW_AS === "signed-out" || process.env.MEMBERSHIP_PREVIEW_AS === "account"
        ? <TrialProvider mode={process.env.MEMBERSHIP_PREVIEW_AS}>{children}</TrialProvider> : children
    ) : (
      <UnconfiguredMembershipGate>{children}</UnconfiguredMembershipGate>
    )}
    <SiteDock />
  </>;

  return (
    <html lang="zh-Hant">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {authConfigured ? <ClerkProvider localization={clerkLocalization} appearance={clerkPearlAppearance}><ClerkIdentityProvider>{content}</ClerkIdentityProvider></ClerkProvider> : content}
      </body>
    </html>
  );
}
