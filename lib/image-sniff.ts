// What an uploaded picture really is, read from its own bytes instead of the label the browser gave it:
// PNG, JPEG or WebP, and its size in pixels. An empty file, any other kind of file, a file that was cut off
// and a header that doesn't hold together all come back as null. Used by the quiz picture upload
// (app/api/quizzes/admin/image/route.ts), whose files are public.

export type SniffedImage = { type: "image/png" | "image/jpeg" | "image/webp"; width: number; height: number };

/** No quiz picture comes near this: the admin page shrinks them to 1080px wide before sending. */
export const MAX_IMAGE_SIDE = 4096;

const ascii = (bytes: Uint8Array, at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));
const u16be = (bytes: Uint8Array, at: number) => (bytes[at] << 8) | bytes[at + 1];
const u16le = (bytes: Uint8Array, at: number) => bytes[at] | (bytes[at + 1] << 8);
const u24le = (bytes: Uint8Array, at: number) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
const u32be = (bytes: Uint8Array, at: number) => ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
const u32le = (bytes: Uint8Array, at: number) => (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
const startsWith = (bytes: Uint8Array, head: number[]) => bytes.length >= head.length && head.every((byte, i) => bytes[i] === byte);
const endsWith = (bytes: Uint8Array, tail: number[]) => bytes.length >= tail.length && tail.every((byte, i) => bytes[bytes.length - tail.length + i] === byte);

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// The last chunk of every PNG: IEND, with no data and always the same checksum.
const PNG_END = [0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];

function sniffPng(bytes: Uint8Array): SniffedImage | null {
  if (!startsWith(bytes, PNG_SIGNATURE) || bytes.length < 8 + 25 + 12) return null;
  // The first chunk is IHDR: 13 bytes of data and a checksum over its type and data.
  if (u32be(bytes, 8) !== 13 || ascii(bytes, 12, 4) !== "IHDR") return null;
  if (crc32(bytes.subarray(12, 29)) !== u32be(bytes, 29)) return null;
  if (!endsWith(bytes, PNG_END)) return null;
  return { type: "image/png", width: u32be(bytes, 16), height: u32be(bytes, 20) };
}

// Start-of-frame markers carry the size; C4, C8 and CC share the range but are other things.
const isFrameHeader = (marker: number) => marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

function sniffJpeg(bytes: Uint8Array): SniffedImage | null {
  if (!startsWith(bytes, [0xff, 0xd8, 0xff]) || !endsWith(bytes, [0xff, 0xd9])) return null;
  let at = 2;
  while (at < bytes.length) {
    if (bytes[at] !== 0xff) return null;
    while (at < bytes.length && bytes[at] === 0xff) at++; // the marker's FF and any fill bytes
    if (at >= bytes.length) return null;
    const marker = bytes[at++];
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue; // markers without a length
    // The picture data, the end or a second start before the size was given: not a usable JPEG.
    if (marker === 0x00 || marker === 0xd8 || marker === 0xd9 || marker === 0xda) return null;
    if (at + 2 > bytes.length) return null;
    const length = u16be(bytes, at);
    if (length < 2 || at + length > bytes.length) return null;
    if (isFrameHeader(marker)) {
      if (length < 8) return null;
      return { type: "image/jpeg", width: u16be(bytes, at + 5), height: u16be(bytes, at + 3) };
    }
    at += length;
  }
  return null;
}

function sniffWebp(bytes: Uint8Array): SniffedImage | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  // The RIFF size counts every byte after the first eight, so a cut-off file (or one with extra bytes) shows.
  if (u32le(bytes, 4) + 8 !== bytes.length) return null;
  const chunk = ascii(bytes, 12, 4), size = u32le(bytes, 16);
  if (20 + size > bytes.length) return null;
  if (chunk === "VP8 ") {
    // A key frame (lowest bit of the frame tag is 0), the start code 9D 01 2A, then 14-bit width and height.
    if (size < 10 || (bytes[20] & 1) === 1 || bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return { type: "image/webp", width: u16le(bytes, 26) & 0x3fff, height: u16le(bytes, 28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    // Signature 2F, then width-1 and height-1 in 14 bits each, and a 3-bit version that is always 0.
    if (size < 5 || bytes[20] !== 0x2f) return null;
    const bits = u32le(bytes, 21);
    if (bits >>> 29 !== 0) return null;
    return { type: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    // The extended header: canvas width-1 and height-1 in 24 bits each.
    if (size < 10) return null;
    return { type: "image/webp", width: u24le(bytes, 24) + 1, height: u24le(bytes, 27) + 1 };
  }
  return null;
}

export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  return sniffPng(bytes) ?? sniffJpeg(bytes) ?? sniffWebp(bytes);
}

/** The upload's checks, in the words Zola sees on her upload page. */
export function checkUploadedImage(bytes: Uint8Array, declaredType: string): { ok: true; image: SniffedImage } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: "這個檔案是空的，請重新選一次圖片。" };
  const image = sniffImage(bytes);
  if (!image) return { ok: false, error: "這不是完整的 WebP、JPG 或 PNG 圖片，請重新選一次。" };
  if (image.type !== declaredType) return { ok: false, error: "檔案內容和它標示的格式對不上，請重新選一次圖片。" };
  if (image.width < 1 || image.height < 1 || image.width > MAX_IMAGE_SIDE || image.height > MAX_IMAGE_SIDE) {
    return { ok: false, error: `圖片尺寸不合理：長和寬都要在 ${MAX_IMAGE_SIDE} 像素以內。` };
  }
  return { ok: true, image };
}
