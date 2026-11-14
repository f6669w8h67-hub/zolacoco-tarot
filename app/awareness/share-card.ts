import { breakLines, cardArt, themeLabel, type AwarenessCard } from "./awareness-data";

// The IG-story image (1080×1920) a visitor can save after drawing a card. Drawn on a canvas in the
// browser from public information only: the card art, its ACT line, its name, the date and the brand.

export const SHARE_WIDTH = 1080;
export const SHARE_HEIGHT = 1920;
export const BRAND_HANDLE = "@zolacoco_tarot";

const SERIF = "\"Noto Serif TC\", \"Songti TC\", serif";
const ITALIC = "\"Cormorant Garamond\", Georgia, serif";

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`image ${src}`));
    image.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function renderShareCard(card: AwarenessCard, dateLabel: string): Promise<Blob> {
  if (document.fonts?.load) {
    await Promise.allSettled([document.fonts.load(`600 48px ${SERIF}`), document.fonts.load(`italic 500 40px ${ITALIC}`)]);
  }
  const art = await loadImage(cardArt(card));
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_WIDTH;
  canvas.height = SHARE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  // Pearl ground with a pink and a porcelain-blue glow.
  ctx.fillStyle = "#F8F7FF";
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
  for (const [x, y, r, color] of [[900, 260, 760, "rgba(252,234,243,.9)"], [140, 1500, 820, "rgba(232,242,252,.9)"]] as const) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(248,247,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#843450";
  ctx.font = `italic 600 44px ${ITALIC}`;
  ctx.fillText("Zolacoco Tarot", SHARE_WIDTH / 2, 150);
  ctx.fillStyle = "#33445F";
  ctx.font = `500 34px ${SERIF}`;
  ctx.fillText("覺察卡", SHARE_WIDTH / 2, 206);

  // The card: 640×1024 art scaled to 760 wide, rounded, with a thin gold edge and a soft shadow.
  const w = 760;
  const h = Math.round((w * art.naturalHeight) / art.naturalWidth);
  const x = (SHARE_WIDTH - w) / 2;
  const y = 290;
  ctx.save();
  ctx.shadowColor = "rgba(132,52,80,.18)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 22;
  roundRect(ctx, x, y, w, h, 36);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, w, h, 36);
  ctx.clip();
  ctx.drawImage(art, x, y, w, h);
  // The ACT line sits on the quiet lower part of the art, as on the page.
  const ribbon = ctx.createLinearGradient(0, y + h * 0.76, 0, y + h);
  ribbon.addColorStop(0, "rgba(255,253,250,0)");
  ribbon.addColorStop(0.3, "rgba(255,253,250,.9)");
  ribbon.addColorStop(1, "rgba(255,253,250,.95)");
  ctx.fillStyle = ribbon;
  ctx.fillRect(x, y + h * 0.76, w, h * 0.24);
  const lines = breakLines(card.line, 13);
  ctx.fillStyle = "#843450";
  ctx.font = `600 48px ${SERIF}`;
  let ty = y + h * 0.895 - ((lines.length - 1) * 70) / 2 + 16;
  for (const line of lines) {
    ctx.fillText(line, SHARE_WIDTH / 2, ty);
    ty += 70;
  }
  ctx.restore();
  roundRect(ctx, x, y, w, h, 36);
  ctx.strokeStyle = "#C5A46F";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Card name, theme and date under the card.
  const my = y + h + 92;
  ctx.fillStyle = "#C5A46F";
  ctx.fillRect(SHARE_WIDTH / 2 - 60, my - 44, 120, 2);
  ctx.fillStyle = "#33445F";
  ctx.font = `500 36px ${SERIF}`;
  ctx.fillText(`${card.name}・${themeLabel(card.theme).split("・")[0]}・${dateLabel}`, SHARE_WIDTH / 2, my + 8);

  ctx.fillStyle = "#843450";
  ctx.font = `italic 600 40px ${ITALIC}`;
  ctx.fillText(BRAND_HANDLE, SHARE_WIDTH / 2, SHARE_HEIGHT - 110);

  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("blob"))), "image/png"));
}
