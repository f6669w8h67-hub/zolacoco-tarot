import type { ComponentProps } from "react";
import type { ClerkProvider, SignIn } from "@clerk/nextjs";

// One pearl look for every Clerk screen on the site (ChatGPT step-5 spec): the /sign-in and /sign-up
// pages, the Email 登入 modal on /account and the member gate, and the 管理登入帳號 modal.
// Only colours, type and sizes are set here. Which sign-in methods show, the verification steps and
// every error or security message stay exactly as Clerk renders them.

type ProviderAppearance = NonNullable<ComponentProps<typeof ClerkProvider>["appearance"]>;
type PageAppearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

const ink = "#263449";
const muted = "#33445f";
const rose = "#843450";
const gold = "#c5a46f";
const line = "#d8dce8";
const serif = '"Noto Serif TC", "Songti TC", Georgia, serif';

const danger = "#a3324f";
const goldRing = `0 0 0 1px ${gold}`;
const focusRing = "0 0 0 4px rgba(132, 52, 80, .18)";

/** Used on <ClerkProvider>, so the modals get it too. */
export const clerkPearlAppearance = {
  variables: {
    colorPrimary: rose, // deep rose, not pale pink: Clerk uses it for links and focus, which need contrast
    colorPrimaryForeground: "#ffffff",
    colorForeground: ink,
    colorMutedForeground: muted,
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: ink,
    colorBorder: line,
    colorNeutral: muted,
    colorRing: rose,
    colorDanger: danger,
    colorModalBackdrop: "rgba(38, 52, 73, .32)",
    borderRadius: "12px",
    fontFamily: serif,
    fontFamilyButtons: serif,
    fontSize: "15px",
  },
  elements: {
    cardBox: { border: `1px solid ${gold}`, borderRadius: "24px", boxShadow: "0 22px 48px rgba(132, 52, 80, .12)" },
    card: { background: "#ffffff" },
    headerTitle: { color: rose, fontWeight: 700 },
    headerSubtitle: { color: muted },
    formFieldLabel: { color: ink, fontSize: "14px", fontWeight: 600 },
    // Clerk draws outlines with box-shadow inside [data-variant] rules, so the outlines are set on the
    // same selectors (checked against the live Clerk form, 2026-11-14). Error fields stay red.
    formFieldInput: {
      minHeight: "48px", fontSize: "16px", color: ink, background: "#ffffff", borderRadius: "12px",
      '&[data-variant="default"], &[data-variant="default"]:hover': { boxShadow: goldRing },
      '&[data-variant="default"]:focus, &[data-variant="default"]:focus-within': { boxShadow: `0 0 0 1px ${rose}, ${focusRing}` },
      '&[data-variant="default"][data-feedback="error"], &[data-variant="default"][data-feedback="error"]:hover': { boxShadow: `0 0 0 1px ${danger}` },
      '&[data-variant="default"][data-feedback="error"]:focus-within': { boxShadow: `0 0 0 1px ${danger}, 0 0 0 4px rgba(163, 50, 79, .16)` },
    },
    otpCodeFieldInput: { fontSize: "18px", color: ink },
    formButtonPrimary: {
      minHeight: "48px", fontSize: "15px", fontWeight: 700, color: rose, textTransform: "none", borderRadius: "12px",
      background: "linear-gradient(180deg, #fff2f8, #f4dfe9)",
      '&[data-variant="solid"][data-color="primary"]': { boxShadow: `${goldRing}, 0 8px 20px rgba(132, 52, 80, .10)` },
      '&[data-variant="solid"][data-color="primary"]:hover': { background: "#eecfdd", color: rose, boxShadow: `${goldRing}, 0 8px 20px rgba(132, 52, 80, .12)` },
      '&[data-variant="solid"][data-color="primary"]:focus-visible': { boxShadow: `${goldRing}, 0 0 0 4px rgba(132, 52, 80, .22)` },
      '&[data-variant="solid"]::after': { display: "none" }, // Clerk's sheen layer over the button
    },
    socialButtonsBlockButton: {
      minHeight: "48px", color: ink, background: "#ffffff", borderRadius: "12px",
      '&[data-variant="outline"], &[data-variant="bordered"]': { boxShadow: "0 0 0 1px #b9c7d8" },
      "&:hover": { background: "#f8f7ff" },
      '&[data-variant="outline"]:focus-visible, &[data-variant="bordered"]:focus-visible': { boxShadow: `0 0 0 1px #b9c7d8, ${focusRing}` },
    },
    socialButtonsBlockButtonText: { color: ink, fontSize: "15px" },
    dividerLine: { background: "#e4d6e0" },
    dividerText: { color: muted },
    footerActionText: { color: muted, fontSize: "14px" },
    footerActionLink: { color: rose, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: "3px" },
    formFieldAction: { color: rose, textDecoration: "underline", textUnderlineOffset: "3px" },
    formResendCodeLink: { color: rose },
    identityPreviewEditButton: { color: rose },
    formFieldErrorText: { color: danger, fontSize: "13px" },
    alert: { background: "#fff6fa", border: "1px solid #e9b8cb", borderRadius: "12px" },
    alertText: { color: danger },
    footer: { background: "#fbf9ff" },
  },
} satisfies ProviderAppearance;

/** The /sign-in and /sign-up pages: the form sits flat inside the pearl arch. Clerk's own heading is hidden
 *  only on the first step, where the arch already says the same (rococo-membership.css); later steps such
 *  as the Email code keep their instructions. */
export const clerkPearlPageAppearance = {
  options: { elevation: "flush" },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", border: "0", boxShadow: "none", background: "transparent" },
    card: { background: "transparent", boxShadow: "none", border: "0", padding: "0" },
    footer: { background: "transparent" },
  },
} satisfies PageAppearance;
