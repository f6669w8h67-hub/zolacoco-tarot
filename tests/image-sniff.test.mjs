import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypescript } from "./helpers/load-typescript.mjs";

// Quiz pictures are public files, so the upload reads what each file really is instead of trusting its label
// (ChatGPT review of PR #56). Fixtures are tiny real images made with Pillow.
const sniff = await loadTypescript("lib/image-sniff.ts");
const fixtures = JSON.parse(await readFile(new URL("./fixtures/quiz-images.json", import.meta.url), "utf8"));
const bytes = (name) => new Uint8Array(Buffer.from(fixtures[name], "base64"));
const plain = (value) => JSON.parse(JSON.stringify(value));

test("real PNG, JPEG and every WebP kind are recognised with their size", () => {
  assert.deepEqual(plain(sniff.sniffImage(bytes("png"))), { type: "image/png", width: 3, height: 2 });
  assert.deepEqual(plain(sniff.sniffImage(bytes("jpeg"))), { type: "image/jpeg", width: 3, height: 2 });
  assert.deepEqual(plain(sniff.sniffImage(bytes("jpegProgressive"))), { type: "image/jpeg", width: 7, height: 6 });
  assert.deepEqual(plain(sniff.sniffImage(bytes("webpLossy"))), { type: "image/webp", width: 3, height: 2 }, "VP8, what browsers make");
  assert.deepEqual(plain(sniff.sniffImage(bytes("webpLossless"))), { type: "image/webp", width: 3, height: 2 }, "VP8L");
  assert.deepEqual(plain(sniff.sniffImage(bytes("webpAlpha"))), { type: "image/webp", width: 5, height: 4 }, "VP8X with transparency");
});

test("an empty file, a disguised file and a cut-off picture are all refused", () => {
  const text = new TextEncoder().encode("<script>alert(1)</script>");
  assert.equal(sniff.sniffImage(new Uint8Array()), null);
  assert.equal(sniff.sniffImage(text), null);
  for (const name of ["png", "jpeg", "webpLossy", "webpLossless", "webpAlpha"]) {
    const whole = bytes(name);
    assert.equal(sniff.sniffImage(whole.subarray(0, whole.length - 5)), null, `${name} cut short`);
    const padded = new Uint8Array(whole.length + text.length);
    padded.set(whole); padded.set(text, whole.length);
    assert.equal(sniff.sniffImage(padded), null, `${name} with something stuck on the end`);
  }
  const headOnly = new Uint8Array(64); headOnly.set([0xff, 0xd8, 0xff, 0xe0]); headOnly.set([0xff, 0xd9], 62);
  assert.equal(sniff.sniffImage(headOnly), null, "a JPEG start and end with nothing real between");
  const brokenHeader = bytes("png"); brokenHeader[18] ^= 0xff;
  assert.equal(sniff.sniffImage(brokenHeader), null, "a PNG whose header checksum no longer matches");
});

test("a header with a size but no picture after it is refused (ChatGPT re-review of PR #56)", () => {
  const join = (...parts) => {
    const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let at = 0;
    for (const part of parts) { out.set(part, at); at += part.length; }
    return out;
  };
  const png = bytes("png"), jpeg = bytes("jpeg");
  const iend = new Uint8Array([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  assert.equal(sniff.sniffImage(join(png.subarray(0, 33), iend)), null, "PNG with only IHDR and IEND");
  const emptyIdat = new Uint8Array([0, 0, 0, 0, 0x49, 0x44, 0x41, 0x54, 0x35, 0xaf, 0x06, 0x1e]);
  assert.equal(sniff.sniffImage(join(png.subarray(0, 33), emptyIdat, iend)), null, "PNG whose IDAT holds nothing");

  const sos = jpeg.findIndex((byte, i) => byte === 0xff && jpeg[i + 1] === 0xda);
  assert.ok(sos > 0);
  assert.equal(sniff.sniffImage(join(jpeg.subarray(0, sos), new Uint8Array([0xff, 0xd9]))), null, "JPEG with a frame header but no scan");
  const sosLength = (jpeg[sos + 2] << 8) | jpeg[sos + 3];
  assert.equal(sniff.sniffImage(join(jpeg.subarray(0, sos + 2 + sosLength), new Uint8Array([0xff, 0xd9]))), null, "JPEG scan with no data");

  const riff = (chunks) => {
    const body = join(new TextEncoder().encode("WEBP"), ...chunks);
    const head = new Uint8Array(8); head.set(new TextEncoder().encode("RIFF")); new DataView(head.buffer).setUint32(4, body.length, true);
    return join(head, body);
  };
  const chunk = (fourcc, data) => {
    const head = new Uint8Array(8); head.set(new TextEncoder().encode(fourcc)); new DataView(head.buffer).setUint32(4, data.length, true);
    return join(head, data, new Uint8Array(data.length & 1));
  };
  const vp8x = (flags) => { const d = new Uint8Array(10); d[0] = flags; d[4] = 2; d[7] = 1; return chunk("VP8X", d); }; // 3×2
  assert.equal(sniff.sniffImage(riff([vp8x(0)])), null, "WebP with only the VP8X header");
  const lossy = bytes("webpLossy"), lossyChunk = lossy.subarray(12);
  assert.ok(sniff.sniffImage(riff([vp8x(0), lossyChunk])), "the same header with the real picture after it is fine");
  assert.equal(sniff.sniffImage(riff([vp8x(0x02), lossyChunk])), null, "an animation is not a quiz picture");
  assert.equal(sniff.sniffImage(riff([vp8x(0), lossyChunk, lossyChunk])), null, "two pictures in one file");
  const headerOnly = lossy.slice(12, 12 + 8 + 10); new DataView(headerOnly.buffer).setUint32(4, 10, true);
  assert.equal(sniff.sniffImage(riff([headerOnly])), null, "a VP8 frame header with no data after it");
});

test("the upload check: right kind, matching label, sensible size, in Zola's words", () => {
  assert.equal(sniff.checkUploadedImage(bytes("webpLossy"), "image/webp").ok, true);
  assert.equal(sniff.checkUploadedImage(bytes("jpeg"), "image/jpeg").ok, true);
  assert.match(sniff.checkUploadedImage(new Uint8Array(), "image/webp").error, /空的/);
  assert.match(sniff.checkUploadedImage(new TextEncoder().encode("hello"), "image/jpeg").error, /不是完整的/);
  assert.match(sniff.checkUploadedImage(bytes("png"), "image/webp").error, /對不上/, "a PNG sent as WebP");
  assert.match(sniff.checkUploadedImage(bytes("pngHuge"), "image/png").error, /4096/, "5000px wide is not a quiz picture");
});

test("the upload route reads the bytes and stores them under the kind they really are", async () => {
  const route = await readFile(new URL("../app/api/quizzes/admin/image/route.ts", import.meta.url), "utf8");
  assert.match(route, /checkUploadedImage\(bytes, file\.type\)/);
  assert.match(route, /contentType: image\.type/);
  assert.doesNotMatch(route, /contentType: file\.type/);
  assert.ok(route.indexOf("requireAdmin()") < route.indexOf("checkUploadedImage("), "only Zola gets as far as the check");
});
