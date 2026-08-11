"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AccessState = {
  status: "loading" | "allowed" | "pending" | "suspended" | "expired" | "error";
};

const openPaths = ["/sign-in", "/sign-up", "/account"];

export default function MembershipGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [access, setAccess] = useState<AccessState>({ status: "loading" });
  const isOpenPath = openPaths.some((path) => pathname.startsWith(path));

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
    return <AccessScreen eyebrow="MEMBER ACCESS" title="正在確認使用權限…" message="請稍候，我們正在讀取你的會員狀態。" />;
  }
  if (!isSignedIn) {
    return <AccessScreen eyebrow="ZOLACOCO VIP" title="登入後，走進你的占卜空間" message="使用 Email 登入或建立帳號；第一次申請後，請通知 Zola 為你開通使用期限。">
      <SignInButton mode="modal"><button type="button">Email 登入</button></SignInButton>
      <Link href="/sign-up">第一次使用，建立帳號</Link>
    </AccessScreen>;
  }
  if (access.status === "allowed") return children;

  const copyByStatus = {
    pending: ["申請已收到，等待 Zola 開通", "請先到會員中心補齊姓名、LINE 與生日，再通知 Zola。權限開通後，全部功能會一次開放。"],
    suspended: ["目前使用權限已暫停", "你的會員資料仍會保留。若需要恢復使用，請直接聯絡 Zola。"],
    expired: ["這次的使用期限已結束", "續約方案完成後，Zola 可以從後台替你增加月份並立即恢復。"],
    error: ["暫時無法確認會員狀態", "請重新整理頁面；若持續出現，請聯絡 Zola 協助。"],
  } as const;
  const copy = access.status in copyByStatus
    ? copyByStatus[access.status as keyof typeof copyByStatus]
    : ["會員權限尚未開放", "請聯絡 Zola 協助確認。"];

  return <AccessScreen eyebrow="MEMBER ACCESS" title={copy[0]} message={copy[1]}>
    <Link href="/account">查看會員資料</Link>
    <a href="https://lin.ee/XIi2Nam" target="_blank" rel="noreferrer">通知 Zola</a>
  </AccessScreen>;
}

function AccessScreen({ eyebrow, title, message, children }: { eyebrow: string; title: string; message: string; children?: React.ReactNode }) {
  return <main className="membership-gate"><section>
    <p className="eyebrow">{eyebrow}</p><span className="membership-gate-mark" aria-hidden="true">Z</span>
    <h1>{title}</h1><p>{message}</p>
    {children ? <div className="membership-gate-actions">{children}</div> : null}
  </section></main>;
}
