"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { isCoachingRoute, isPublicMembershipPage, isStudentRoute } from "@/lib/membership-access";
import { ZOLA_LINE_URL } from "@/lib/contact";
import "./styles/pearl-page.css";

type AccessState = {
  status: "loading" | "allowed" | "pending" | "suspended" | "expired" | "error";
};

export function UnconfiguredMembershipGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isPublicMembershipPage(pathname) || isStudentRoute(pathname) || isCoachingRoute(pathname)) return children;
  return <AccessScreen tone="setup" eyebrow="member access" title="會員服務設定中" message="目前無法確認會員權限，請稍後再試或聯絡 Zola。" />;
}

export default function MembershipGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [access, setAccess] = useState<AccessState>({ status: "loading" });
  // /practice and /journal show their own screens for who may use them; their data comes only from checked APIs.
  const isOpenPath = isPublicMembershipPage(pathname) || isStudentRoute(pathname) || isCoachingRoute(pathname);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || isOpenPath) return;
    const controller = new AbortController();
    fetch("/api/membership/me", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("access-check-failed");
        return response.json();
      })
      .then(({ member }) => {
        const status = member.role === "admin" || member.effective_status === "active"
          ? "allowed"
          : member.effective_status;
        setAccess({ status });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAccess({ status: "error" });
      });
    return () => controller.abort();
  }, [isLoaded, isSignedIn, isOpenPath, pathname]);

  if (isOpenPath) return children;
  if (!isLoaded || (isSignedIn && access.status === "loading")) {
    return <AccessScreen tone="loading" eyebrow="member access" title="正在確認使用權限…" message="請稍候，正在讀取妳的會員狀態。" />;
  }
  if (!isSignedIn) {
    return <AccessScreen tone="signed-out" eyebrow="zolacoco member" title="登入後，走進妳的占卜空間" message="使用 Email 登入或建立帳號；第一次申請後，請通知 Zola 為妳開通使用期限。">
      <SignInButton mode="modal"><button className="gate-primary" type="button">Email 登入</button></SignInButton>
      <Link className="gate-secondary" href="/sign-up">第一次使用，建立帳號</Link>
    </AccessScreen>;
  }
  if (access.status === "allowed") return children;

  const copyByStatus = {
    pending: ["申請已收到，等待 Zola 開通", "請先到會員中心補齊姓名、LINE 與生日，再通知 Zola。權限開通後，全部功能會一次開放。"],
    suspended: ["目前使用權限已暫停", "妳的會員資料仍會保留。若需要恢復使用，請直接聯絡 Zola。"],
    expired: ["這次的使用期限已結束", "續約方案完成後，Zola 可以從後台替妳增加月份並立即恢復。"],
    error: ["暫時無法確認會員狀態", "請重新整理頁面；若持續出現，請聯絡 Zola 協助。"],
  } as const;
  const copy = access.status in copyByStatus
    ? copyByStatus[access.status as keyof typeof copyByStatus]
    : ["會員權限尚未開放", "請聯絡 Zola 協助確認。"];

  return <AccessScreen tone={access.status} eyebrow="member access" title={copy[0]} message={copy[1]}>
    <Link className="gate-primary" href="/account">查看會員資料</Link>
    <a className="gate-secondary" href={ZOLA_LINE_URL} target="_blank" rel="noreferrer">通知 Zola</a>
  </AccessScreen>;
}

// Pearl entry card (ChatGPT step-5 spec). `tone` only picks the look; who may pass is decided above.
export function AccessScreen({ tone, eyebrow, title, message, children }: { tone: string; eyebrow: string; title: string; message: string; children?: React.ReactNode }) {
  return <main className={`membership-gate pearl-page gate-${tone}`} aria-busy={tone === "loading" || undefined}><section>
    <span className="membership-gate-mark" aria-hidden="true"><svg viewBox="0 0 64 48"><path d="M32 42 9 21c5-9 14-14 23-14s18 5 23 14Z" /><path d="M32 42 18 14M32 42V8M32 42l14-28M32 42 12 25M32 42l20-17" /><circle cx="32" cy="44" r="2.4" /></svg></span>
    <p className="eyebrow">{eyebrow}</p>
    <h1>{title}</h1><p>{message}</p>
    {tone === "loading" ? <span className="pearl-loading" aria-hidden="true"><i /><i /><i /></span> : null}
    {children ? <div className="membership-gate-actions">{children}</div> : null}
  </section></main>;
}
