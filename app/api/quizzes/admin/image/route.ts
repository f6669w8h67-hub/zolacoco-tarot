// One quiz picture (Zola only), already turned into WebP in her browser: POST form data {code, slot, file}.
// Stored in the site's Vercel Blob store; the answer is its public address.
import { put } from "@vercel/blob";
import { isQuizCode } from "@/lib/quiz";
import { membershipErrorResponse, requireAdmin } from "@/lib/membership";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const SLOTS = /^(card[1-5]|choice[ABC]|painting|blur|paper)$/;
const TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireAdmin();
    if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "網站的圖片空間還沒建立，請先在 Vercel 建立 Blob 並接到這個專案。" }, { status: 503, headers: noStore });
    let form: FormData;
    try { form = await request.formData(); } catch { return Response.json({ error: "圖片沒有傳過來，請再試一次。" }, { status: 400, headers: noStore }); }
    const code = String(form.get("code") ?? ""), slot = String(form.get("slot") ?? ""), file = form.get("file");
    if (!isQuizCode(code) || !SLOTS.test(slot)) return Response.json({ error: "代碼或圖片位置不正確。" }, { status: 400, headers: noStore });
    if (!(file instanceof File) || !TYPES.has(file.type)) return Response.json({ error: "只能上傳 WebP、JPG 或 PNG 圖片。" }, { status: 400, headers: noStore });
    if (file.size > MAX_BYTES) return Response.json({ error: "圖片太大了（上限 4 MB）。" }, { status: 400, headers: noStore });
    const extension = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const blob = await put(`quizzes/${code}/${slot}.${extension}`, file, { access: "public", addRandomSuffix: true, contentType: file.type, cacheControlMaxAge: 60 * 60 * 24 * 365 });
    return Response.json({ url: blob.url }, { headers: noStore });
  } catch (error) {
    return membershipErrorResponse(error);
  }
}
