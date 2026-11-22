import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/membership-access";

/** 舊測驗要註冊: any free account opens older quizzes, no VIP months needed. Without Clerk (local preview
 *  only) everything is open, unless QUIZ_PREVIEW_SIGNED_OUT=1 shows the signed-out view. */
export async function isSignedIn() {
  if (!isClerkConfigured(process.env)) return process.env.NODE_ENV === "development" && process.env.QUIZ_PREVIEW_SIGNED_OUT !== "1";
  try {
    return Boolean((await auth()).userId);
  } catch {
    return false;
  }
}
