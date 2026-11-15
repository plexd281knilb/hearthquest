/**
 * Zero-Dependency ISO/IEC 18004 QR Code Encoder (Versions 1-10, Error Correction Level M).
 * Produces a scannable matrix for full http(s) URLs so phone cameras can open
 * HearthQuest Kid Tablet / TV rooms cleanly offline on LAN or production servers.
 */

interface QrVersionSpec {
  version: number;
  totalDataBytes: number;
  ecBytesPerBlock: number;
  blocks: Array<{ count: number; dataBytes: number }>;
  alignmentCoords: number[];
}

// ISO/IEC 18004 Table 9 capacities & RS block structures for Error Correction Level M
const QR_EC_M_SPECS: QrVersionSpec[] = [
  { version: 1, totalDataBytes: 16, ecBytesPerBlock: 10, blocks: [{ count: 1, dataBytes: 16 }], alignmentCoords: [] },
  { version: 2, totalDataBytes: 28, ecBytesPerBlock: 16, blocks: [{ count: 1, dataBytes: 28 }], alignmentCoords: [6, 18] },
  { version: 3, totalDataBytes: 44, ecBytesPerBlock: 26, blocks: [{ count: 1, dataBytes: 44 }], alignmentCoords: [6, 22] },
  { version: 4, totalDataBytes: 64, ecBytesPerBlock: 18, blocks: [{ count: 2, dataBytes: 32 }], alignmentCoords: [6, 26] },
  { version: 5, totalDataBytes: 86, ecBytesPerBlock: 24, blocks: [{ count: 2, dataBytes: 43 }], alignmentCoords: [6, 30] },
  { version: 6, totalDataBytes: 108, ecBytesPerBlock: 16, blocks: [{ count: 4, dataBytes: 27 }], alignmentCoords: [6, 34] },
  { version: 7, totalDataBytes: 124, ecBytesPerBlock: 18, blocks: [{ count: 4, dataBytes: 31 }], alignmentCoords: [6, 22, 38] },
  { version: 8, totalDataBytes: 154, ecBytesPerBlock: 22, blocks: [{ count: 2, dataBytes: 38 }, { count: 2, dataBytes: 39 }], alignmentCoords: [6, 24, 42] },
  { version: 9, totalDataBytes: 182, ecBytesPerBlock: 22, blocks: [{ count: 3, dataBytes: 36 }, { count: 2, dataBytes: 37 }], alignmentCoords: [6, 26, 46] },
  { version: 10, totalDataBytes: 216, ecBytesPerBlock: 26, blocks: [{ count: 4, dataBytes: 43 }, { count: 1, dataBytes: 44 }], alignmentCoords: [6, 28, 50] },
];

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function computeRsGenerator(degree: number): Uint8Array {
  let poly: number[] = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return Uint8Array.from(poly);
}

function computeRsParity(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = computeRsGenerator(ecLen);
  const res = new Uint8Array(ecLen);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    for (let j = 0; j < ecLen - 1; j++) {
      res[j] = res[j + 1] ^ gfMul(gen[j + 1], factor);
    }
    res[ecLen - 1] = gfMul(gen[ecLen], factor);
  }
  return res;
}

class BitBuffer {
  private bytes: number[] = [];
  private bitLength = 0;

  pushBits(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) {
      this.pushBit(((value >>> i) & 1) === 1);
    }
  }

  pushBit(bit: boolean): void {
    const byteIndex = this.bitLength >>> 3;
    if (this.bytes.length <= byteIndex) this.bytes.push(0);
    if (bit) {
      this.bytes[byteIndex] |= 0x80 >>> (this.bitLength & 7);
    }
    this.bitLength++;
  }

  toDataCodewords(capacityBytes: number): Uint8Array {
    const totalBits = capacityBytes * 8;
    const terminator = Math.min(4, totalBits - this.bitLength);
    if (terminator > 0) this.pushBits(0, terminator);
    while ((this.bitLength & 7) !== 0) this.pushBit(false);

    let padCycle = 0;
    while (this.bytes.length < capacityBytes) {
      this.bytes.push((padCycle++ & 1) === 0 ? 0xec : 0x11);
    }
    return Uint8Array.from(this.bytes.slice(0, capacityBytes));
  }
}

function buildCodewords(bytes: Uint8Array, spec: QrVersionSpec): number[] {
  const bitBuf = new BitBuffer();
  // Mode indicator 0100 = Byte Mode
  bitBuf.pushBits(0b0100, 4);
  const countBits = spec.version <= 9 ? 8 : 16;
  bitBuf.pushBits(bytes.length, countBits);
  for (let i = 0; i < bytes.length; i++) {
    bitBuf.pushBits(bytes[i], 8);
  }

  const rawData = bitBuf.toDataCodewords(spec.totalDataBytes);

  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (const grp of spec.blocks) {
    for (let b = 0; b < grp.count; b++) {
      const slice = rawData.subarray(offset, offset + grp.dataBytes);
      offset += grp.dataBytes;
      dataBlocks.push(slice);
      ecBlocks.push(computeRsParity(slice, spec.ecBytesPerBlock));
    }
  }

  const out: number[] = [];
  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const blk of dataBlocks) {
      if (i < blk.length) out.push(blk[i]);
    }
  }
  for (let i = 0; i < spec.ecBytesPerBlock; i++) {
    for (const blk of ecBlocks) {
      if (i < blk.length) out.push(blk[i]);
    }
  }
  return out;
}

function bchRemainder(val: number, poly: number, dataBits: number): number {
  let d = val << dataBits;
  const polyMsb = 31 - Math.clz32(poly);
  while (31 - Math.clz32(d) >= polyMsb) {
    d ^= poly << (31 - Math.clz32(d) - polyMsb);
  }
  return d;
}

function getFormatBits(mask: number): number {
  // Error correction M indicator = 00
  const data = (0b00 << 3) | (mask & 0b111);
  const ecc = bchRemainder(data, 0b10100110111, 10);
  return ((data << 10) | ecc) ^ 0b101010000010010;
}

function getVersionBits(version: number): number {
  const ecc = bchRemainder(version, 0b1111100100101, 12);
  return (version << 12) | ecc;
}

const MASK_FNS: Array<(r: number, c: number) => boolean> = [
  (r, c) => (r + c) % 2 === 0,
  (r, _c) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function createEmptyGrid(size: number): { modules: boolean[][]; reserved: boolean[][] } {
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  return { modules, reserved };
}

function placeFinder(
  modules: boolean[][],
  reserved: boolean[][],
  size: number,
  top: number,
  left: number
): void {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const r = top + dr;
      const c = left + dc;
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      reserved[r][c] = true;
      const inOuterRing = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (dr === 0 || dr === 6 || dc === 0 || dc === 6);
      const inInnerSquare = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      modules[r][c] = inOuterRing || inInnerSquare;
    }
  }
}

function placeAlignment(modules: boolean[][], reserved: boolean[][], centerR: number, centerC: number): void {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = centerR + dr;
      const c = centerC + dc;
      reserved[r][c] = true;
      const dist = Math.max(Math.abs(dr), Math.abs(dc));
      modules[r][c] = dist === 2 || dist === 0;
    }
  }
}

function applyFormatAndVersionInfo(
  modules: boolean[][],
  reserved: boolean[][],
  size: number,
  version: number,
  mask: number
): void {
  const fmt = getFormatBits(mask);
  for (let i = 0; i < 15; i++) {
    const bit = ((fmt >>> i) & 1) === 1;
    // Copy 1 around top-left finder
    if (i < 6) {
      modules[8][i] = bit;
      reserved[8][i] = true;
    } else if (i === 6) {
      modules[8][7] = bit;
      reserved[8][7] = true;
    } else if (i === 7) {
      modules[8][8] = bit;
      reserved[8][8] = true;
    } else if (i === 8) {
      modules[7][8] = bit;
      reserved[7][8] = true;
    } else {
      modules[14 - i][8] = bit;
      reserved[14 - i][8] = true;
    }

    // Copy 2 across bottom-left and top-right
    if (i < 7) {
      modules[size - 1 - i][8] = bit;
      reserved[size - 1 - i][8] = true;
    } else {
      modules[8][size - 15 + i] = bit;
      reserved[8][size - 15 + i] = true;
    }
  }

  if (version >= 7) {
    const vBits = getVersionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((vBits >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = size - 11 + (i % 3);
      modules[a][b] = bit;
      reserved[a][b] = true;
      modules[b][a] = bit;
      reserved[b][a] = true;
    }
  }
}

function evaluatePenalty(modules: boolean[][], size: number): number {
  let penalty = 0;

  // Rule 1: 5+ same color modules in row/col
  for (let r = 0; r < size; r++) {
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === modules[r][c - 1]) {
        runLen++;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runLen = 1;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === modules[r - 1][c]) {
        runLen++;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else {
        runLen = 1;
      }
    }
  }

  // Rule 2: 2x2 uniform blocks
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r][c];
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  // Rule 4: dark ratio balance
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) darkCount++;
    }
  }
  const percent = (darkCount * 100) / (size * size);
  const k = Math.floor(Math.abs(percent - 50) / 5);
  penalty += k * 10;

  return penalty;
}

export function encodeQrMatrix(payload: string): {
  size: number;
  version: number;
  mask: number;
  modules: boolean[][];
} {
  const utf8Bytes = Buffer.from(payload, "utf8");
  const spec = QR_EC_M_SPECS.find((s) => {
    const headerBits = 4 + (s.version <= 9 ? 8 : 16);
    const neededBytes = Math.ceil((headerBits + utf8Bytes.length * 8) / 8);
    return neededBytes <= s.totalDataBytes;
  }) || QR_EC_M_SPECS[QR_EC_M_SPECS.length - 1];

  const version = spec.version;
  const size = 17 + version * 4;
  const codewords = buildCodewords(utf8Bytes, spec);

  const { modules: baseModules, reserved } = createEmptyGrid(size);
  placeFinder(baseModules, reserved, size, 0, 0);
  placeFinder(baseModules, reserved, size, 0, size - 7);
  placeFinder(baseModules, reserved, size, size - 7, 0);

  // Timing patterns on row 6 and col 6
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    baseModules[6][i] = dark;
    reserved[6][i] = true;
    baseModules[i][6] = dark;
    reserved[i][6] = true;
  }

  // Dark module
  baseModules[size - 8][8] = true;
  reserved[size - 8][8] = true;

  // Alignment patterns
  const coords = spec.alignmentCoords;
  for (const r of coords) {
    for (const c of coords) {
      if (reserved[r][c]) continue;
      placeAlignment(baseModules, reserved, r, c);
    }
  }

  // Reserve format info & optional version info slots cleanly before placing data bits
  applyFormatAndVersionInfo(baseModules, reserved, size, version, 0);

  // Zigzag bitstream placement
  let bitIdx = 0;
  const totalBits = codewords.length * 8;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      const r = upward ? size - 1 - step : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = right - dc;
        if (!reserved[r][c]) {
          let bit = false;
          if (bitIdx < totalBits) {
            bit = ((codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          baseModules[r][c] = bit;
        }
      }
    }
    upward = !upward;
  }

  // Evaluate all 8 masks and keep minimum penalty
  let bestMask = 0;
  let bestScore = Infinity;
  let bestModules: boolean[][] = baseModules;

  for (let mask = 0; mask < 8; mask++) {
    const cand = baseModules.map((row) => [...row]);
    const maskFn = MASK_FNS[mask];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!reserved[r][c] && maskFn(r, c)) {
          cand[r][c] = !cand[r][c];
        }
      }
    }
    applyFormatAndVersionInfo(cand, reserved, size, version, mask);
    const score = evaluatePenalty(cand, size);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
      bestModules = cand;
    }
  }

  return { size, version, mask: bestMask, modules: bestModules };
}
