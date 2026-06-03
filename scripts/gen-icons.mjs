// Generates the PWA icons (PNG) from an inline SVG using sharp.
// Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <path d="M256 112 L382 164 V288 C382 352 328 394 256 422 C184 394 130 352 130 288 V164 Z" fill="#ffffff"/>
  <path d="M210 266 l32 32 l62 -70" fill="none" stroke="#2563eb" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const outDir = path.join(process.cwd(), "public");
await mkdir(outDir, { recursive: true });
const buf = Buffer.from(svg);

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-icon-180.png", size: 180 },
  { name: "favicon-32.png", size: 32 },
];

for (const t of targets) {
  await sharp(buf).resize(t.size, t.size).png().toFile(path.join(outDir, t.name));
  console.log("✓", t.name);
}
console.log("Icons generated in public/");
