// Bağımlılıksız PNG ikon üretici: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const png = (size, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

// İşaretli mesafe fonksiyonları (0..1 koordinat uzayında)
const roundBox = (x, y, cx, cy, hw, hh, r) => {
  const qx = Math.abs(x - cx) - hw + r;
  const qy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const segment = (x, y, ax, ay, bx, by, r) => {
  const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
};
const circle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const over = (dst, src, a) => {
  const outA = a + dst[3] * (1 - a);
  if (outA === 0) return [0, 0, 0, 0];
  return [
    (src[0] * a + dst[0] * dst[3] * (1 - a)) / outA,
    (src[1] * a + dst[1] * dst[3] * (1 - a)) / outA,
    (src[2] * a + dst[2] * dst[3] * (1 - a)) / outA,
    outA,
  ];
};

const INDIGO = [79, 70, 229];
const VIOLET = [147, 51, 234];
const WHITE = [255, 255, 255];
const AMBER = [251, 191, 36];

function render(size) {
  const ss = 4; // süper örnekleme
  const out = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let acc = [0, 0, 0, 0];
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = (px + (sx + 0.5) / ss) / size;
          const y = (py + (sy + 0.5) / ss) / size;
          let c = [0, 0, 0, 0];
          // arka plan: gradyanlı yuvarlak kare
          if (roundBox(x, y, 0.5, 0.5, 0.47, 0.47, 0.22) <= 0) {
            c = [...mix(INDIGO, VIOLET, (x + y) / 2), 1];
          }
          // not kağıdı
          if (roundBox(x, y, 0.47, 0.53, 0.22, 0.26, 0.06) <= 0) c = over(c, WHITE, 1);
          // satırlar
          for (const ly of [0.43, 0.53, 0.63]) {
            const end = ly === 0.63 ? 0.48 : 0.58;
            if (segment(x, y, 0.36, ly, end, ly, 0.028) <= 0) c = over(c, mix(INDIGO, VIOLET, 0.3), 1);
          }
          // hatırlatıcı noktası (beyaz halkalı amber daire)
          if (circle(x, y, 0.72, 0.29, 0.135) <= 0) c = over(c, WHITE, 1);
          if (circle(x, y, 0.72, 0.29, 0.095) <= 0) c = over(c, AMBER, 1);
          acc = acc.map((v, i) => v + (i < 3 ? c[i] * c[3] : c[3]));
        }
      }
      const n = ss * ss;
      const a = acc[3] / n;
      const i = (py * size + px) * 4;
      out[i] = a ? Math.round(acc[0] / acc[3]) : 0;
      out[i + 1] = a ? Math.round(acc[1] / acc[3]) : 0;
      out[i + 2] = a ? Math.round(acc[2] / acc[3]) : 0;
      out[i + 3] = Math.round(a * 255);
    }
  }
  return png(size, out);
}

mkdirSync('public/icons', { recursive: true });
for (const s of [16, 32, 48, 128]) writeFileSync(`public/icons/icon${s}.png`, render(s));
console.log('İkonlar oluşturuldu: public/icons');
