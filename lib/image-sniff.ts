// What an uploaded picture really is, read from its own bytes instead of the label the browser gave it:
// PNG, JPEG or WebP, and its size in pixels. The whole file is walked block by block, so it has to hold
// together from the first byte to the last and carry actual picture data — not only a header with a size.
// An empty file, any other kind of file, a file that was cut off or has something stuck on the end, and a
// header with no picture after it all come back as null. Pixels are not decoded. Used by the quiz picture
// upload (app/api/quizzes/admin/image/route.ts), whose files are public.

export type SniffedImage = { type: "image/png" | "image/jpeg" | "image/webp"; width: number; height: number };
type Size = { width: number; height: number };

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

/* ---------- PNG: IHDR first, every chunk's checksum right, picture data in IDAT, IEND last ---------- */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// Bit depths each colour type allows.
const PNG_DEPTHS: Record<number, number[]> = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };

function sniffPng(bytes: Uint8Array): Size | null {
  if (!startsWith(bytes, PNG_SIGNATURE)) return null;
  let at = 8, size: Size | null = null, pictureBytes = 0;
  while (at + 12 <= bytes.length) {
    const length = u32be(bytes, at), type = ascii(bytes, at + 4, 4);
    if (length > bytes.length - at - 12) return null;
    const crcAt = at + 8 + length;
    if (crc32(bytes.subarray(at + 4, crcAt)) !== u32be(bytes, crcAt)) return null;
    if (!size) {
      if (type !== "IHDR" || length !== 13) return null;
      const depth = bytes[at + 16], colour = bytes[at + 17];
      if (!PNG_DEPTHS[colour]?.includes(depth) || bytes[at + 18] !== 0 || bytes[at + 19] !== 0 || bytes[at + 20] > 1) return null;
      size = { width: u32be(bytes, at + 8), height: u32be(bytes, at + 12) };
    } else if (type === "IHDR") {
      return null;
    } else if (type === "IDAT") {
      pictureBytes += length;
    } else if (type === "IEND") {
      // The end: nothing after it, and the picture data must have come before it.
      return length === 0 && crcAt + 4 === bytes.length && pictureBytes > 0 ? size : null;
    }
    at = crcAt + 4;
  }
  return null;
}

/* ---------- JPEG: tables, one frame header, scans that hold data, and the end marker last ---------- */

const SOF_HUFFMAN = new Set([0xc0, 0xc1, 0xc2]); // baseline, extended and progressive: what browsers and cameras make

function sniffJpeg(bytes: Uint8Array): Size | null {
  if (!startsWith(bytes, [0xff, 0xd8, 0xff]) || !endsWith(bytes, [0xff, 0xd9])) return null;
  let at = 2, size: Size | null = null, quantTables = false, huffmanTables = false, scans = 0;
  while (at < bytes.length) {
    if (bytes[at] !== 0xff) return null;
    while (at < bytes.length && bytes[at] === 0xff) at++; // the marker's FF and any fill bytes
    if (at >= bytes.length) return null;
    const marker = bytes[at++];
    if (marker === 0xd9) return at === bytes.length && size && scans > 0 ? size : null; // the end, and only at the end
    if (marker === 0x00 || marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) return null;
    if (at + 2 > bytes.length) return null;
    const length = u16be(bytes, at);
    if (length < 2 || at + length > bytes.length) return null;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      // A frame header. Only one, of a kind browsers can show, with 1 to 4 colour components.
      const components = bytes[at + 7];
      if (size || !SOF_HUFFMAN.has(marker) || components < 1 || components > 4 || length !== 8 + 3 * components) return null;
      size = { width: u16be(bytes, at + 5), height: u16be(bytes, at + 3) };
    } else if (marker === 0xdb) {
      quantTables = true;
    } else if (marker === 0xc4) {
      huffmanTables = true;
    } else if (marker === 0xda) {
      // A scan: its header, then compressed picture data up to the next marker.
      const components = bytes[at + 2];
      if (!size || !quantTables || !huffmanTables || components < 1 || components > 4 || length !== 6 + 2 * components) return null;
      let end = at + length;
      const dataStart = end;
      // Inside the data an FF is followed by 00 (an escaped FF) or a restart marker; anything else ends the scan.
      while (end + 1 < bytes.length && !(bytes[end] === 0xff && bytes[end + 1] !== 0x00 && (bytes[end + 1] < 0xd0 || bytes[end + 1] > 0xd7))) end++;
      if (end + 1 >= bytes.length || end === dataStart) return null;
      scans++;
      at = end;
      continue;
    }
    at += length;
  }
  return null;
}

/* ---------- WebP: RIFF chunks that add up, one still picture with its data ---------- */

type Chunk = { fourcc: string; at: number; size: number };

function webpPicture(bytes: Uint8Array, chunk: Chunk): Size | null {
  const at = chunk.at;
  if (chunk.fourcc === "VP8 ") {
    // Lossy: a 3-byte frame tag, the start code 9D 01 2A, 14-bit width and height, then the first partition
    // (its length is in the tag) and the picture data after it.
    if (chunk.size < 11) return null;
    const tag = bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
    const keyFrame = (tag & 1) === 0, version = (tag >> 1) & 7, shown = ((tag >> 4) & 1) === 1, firstPartition = tag >>> 5;
    if (!keyFrame || version > 3 || !shown || bytes[at + 3] !== 0x9d || bytes[at + 4] !== 0x01 || bytes[at + 5] !== 0x2a) return null;
    if (firstPartition === 0 || 10 + firstPartition >= chunk.size) return null;
    return { width: u16le(bytes, at + 6) & 0x3fff, height: u16le(bytes, at + 8) & 0x3fff };
  }
  if (chunk.fourcc === "VP8L") {
    // Lossless: signature 2F, width-1 and height-1 in 14 bits each, a 3-bit version that is 0, then the data.
    if (chunk.size < 6 || bytes[at] !== 0x2f) return null;
    const bits = u32le(bytes, at + 1);
    if (bits >>> 29 !== 0) return null;
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  return null;
}

const WEBP_EXTRAS = new Set(["VP8X", "ALPH", "ICCP", "EXIF", "XMP "]);

function sniffWebp(bytes: Uint8Array): Size | null {
  if (bytes.length < 20 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  // The RIFF size counts every byte after the first eight, so a cut-off file (or one with extra bytes) shows.
  if (u32le(bytes, 4) + 8 !== bytes.length) return null;
  const chunks: Chunk[] = [];
  let at = 12;
  while (at < bytes.length) {
    if (at + 8 > bytes.length) return null;
    const size = u32le(bytes, at + 4);
    if (size > bytes.length - at - 8) return null;
    chunks.push({ fourcc: ascii(bytes, at, 4), at: at + 8, size });
    at += 8 + size + (size & 1); // chunks are padded to an even length
  }
  if (at !== bytes.length || !chunks.length) return null;

  const [first] = chunks;
  if (first.fourcc === "VP8 " || first.fourcc === "VP8L") return chunks.length === 1 ? webpPicture(bytes, first) : null;
  // The extended form: a VP8X header, then exactly one still picture (no animation) and only known extras.
  if (first.fourcc !== "VP8X" || first.size !== 10 || (bytes[first.at] & 0x02) !== 0) return null;
  const canvas = { width: u24le(bytes, first.at + 4) + 1, height: u24le(bytes, first.at + 7) + 1 };
  const pictures = chunks.filter((chunk) => chunk.fourcc === "VP8 " || chunk.fourcc === "VP8L");
  if (pictures.length !== 1 || chunks.slice(1).some((chunk) => chunk !== pictures[0] && !WEBP_EXTRAS.has(chunk.fourcc))) return null;
  const picture = webpPicture(bytes, pictures[0]);
  return picture && picture.width === canvas.width && picture.height === canvas.height ? canvas : null;
}

export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  const png = sniffPng(bytes);
  if (png) return { type: "image/png", ...png };
  const jpeg = sniffJpeg(bytes);
  if (jpeg) return { type: "image/jpeg", ...jpeg };
  const webp = sniffWebp(bytes);
  if (webp) return { type: "image/webp", ...webp };
  return null;
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
