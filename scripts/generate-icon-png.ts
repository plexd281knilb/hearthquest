import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

export function generateHearthQuestPng(size = 128): Buffer {
  const width = size;
  const height = size;
  const center = size / 2;
  const radius = size / 2 - 2;

  // Unfiltered RGBA rows: each row has 1 filter byte (0) + width * 4 bytes
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) {
        // Transparent outside circular badge
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Golden Outer Ring
      if (dist >= radius - 6) {
        rawData[pxOffset] = 0xf5; // R
        rawData[pxOffset + 1] = 0x9e; // G
        rawData[pxOffset + 2] = 0x0b; // B
        rawData[pxOffset + 3] = 0xff; // A
        continue;
      }

      // Midnight Indigo Shield Field
      const shieldY = (y - center) / (size * 0.4);
      const shieldX = Math.abs(x - center) / (size * 0.35);

      // Flame Region (Center, lower-mid)
      const flameDist = Math.sqrt(dx * dx * 1.5 + (dy - size * 0.1) * (dy - size * 0.1));
      if (flameDist < size * 0.24 && y < size * 0.78 && y > size * 0.3) {
        // Core flame (Yellow to Orange)
        const flameRatio = flameDist / (size * 0.24);
        if (flameRatio < 0.4) {
          // White-yellow hot core
          rawData[pxOffset] = 0xff;
          rawData[pxOffset + 1] = 0xfb;
          rawData[pxOffset + 2] = 0xeb;
          rawData[pxOffset + 3] = 0xff;
        } else if (flameRatio < 0.7) {
          // Bright gold
          rawData[pxOffset] = 0xfb;
          rawData[pxOffset + 1] = 0xbf;
          rawData[pxOffset + 2] = 0x24;
          rawData[pxOffset + 3] = 0xff;
        } else {
          // Radiant orange
          rawData[pxOffset] = 0xea;
          rawData[pxOffset + 1] = 0x58;
          rawData[pxOffset + 2] = 0x0c;
          rawData[pxOffset + 3] = 0xff;
        }
      } else if (y >= size * 0.74 && y <= size * 0.82 && Math.abs(dx) < size * 0.28) {
        // Hearth wood logs (Warm Saddle Brown)
        rawData[pxOffset] = 0x78;
        rawData[pxOffset + 1] = 0x35;
        rawData[pxOffset + 2] = 0x0f;
        rawData[pxOffset + 3] = 0xff;
      } else if (Math.abs(dx) < 3 && y >= size * 0.2 && y <= size * 0.28) {
        // Adventure star crest
        rawData[pxOffset] = 0xfd;
        rawData[pxOffset + 1] = 0xe0;
        rawData[pxOffset + 2] = 0x47;
        rawData[pxOffset + 3] = 0xff;
      } else {
        // Deep Midnight background
        rawData[pxOffset] = 0x0f;
        rawData[pxOffset + 1] = 0x17;
        rawData[pxOffset + 2] = 0x2a;
        rawData[pxOffset + 3] = 0xff;
      }
    }
  }

  // PNG Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk("IHDR", ihdr);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk("IDAT", compressed);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const outputPath = path.resolve(__dirname, "..", "assets", "hearthquest-icon.png");
fs.writeFileSync(outputPath, generateHearthQuestPng(128));
console.log(`[ICON] Generated PNG icon at ${outputPath}`);
