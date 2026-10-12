// CS2 crosshair share codes (format "cs2-v1", CS2 1.41.8.8+, released 30/09/2026).
//
// A code is "CS" followed by 44 characters. Together they hold a 32-byte big-endian integer
// written in base 57, least significant character first. Byte 0 is a checksum:
// sum(bytes[1..]) % 256.
// The older "CSGO-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx" codes are no longer accepted on import by CS2.
//
// Byte layout reference: https://github.com/akiver/csgo-sharecode/blob/main/doc/code_layout.md

export const DICTIONARY = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';
const BASE = BigInt(DICTIONARY.length);
const PREFIX = 'CS';
const CHAR_COUNT = 44;
const BYTE_LENGTH = 32;
const CODE_REGEX = new RegExp(`^${PREFIX}[${DICTIONARY}]{${CHAR_COUNT}}$`);

export const STYLES = [
  { id: 0, name: 'Dynamic Cross', shape: 'cross', dynamic: true },
  { id: 1, name: 'Dynamic Circle', shape: 'circle', dynamic: true },
  { id: 2, name: 'Dynamic Cross (Legacy)', shape: 'cross', dynamic: true },
  { id: 3, name: 'Static Circle', shape: 'circle', dynamic: false },
  { id: 4, name: 'Static Cross', shape: 'cross', dynamic: false },
  { id: 5, name: 'Static Cross (Shot Feedback)', shape: 'cross', dynamic: false },
  { id: 6, name: 'Dot Only', shape: 'dot', dynamic: false },
  { id: 7, name: 'Dynamic Quad', shape: 'quad', dynamic: true },
  { id: 8, name: 'Static Square', shape: 'square', dynamic: false },
  { id: 9, name: 'Static Quad', shape: 'quad', dynamic: false },
];

export const OUTLINE_MODES = ['None', 'Full', 'Half'];

export class InvalidShareCodeError extends Error {
  constructor(message = 'Invalid crosshair share code') {
    super(message);
    this.name = 'InvalidShareCodeError';
  }
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const sum = (arr) => arr.reduce((acc, v) => acc + v, 0);

function bytesToChars(bytes) {
  let total = BigInt('0x' + bytes.map((b) => b.toString(16).padStart(2, '0')).join(''));
  let chars = '';
  for (let i = 0; i < CHAR_COUNT; i++) {
    chars += DICTIONARY[Number(total % BASE)];
    total /= BASE;
  }
  return chars;
}

function charsToBytes(chars) {
  let big = 0n;
  for (const c of Array.from(chars).reverse()) {
    big = big * BASE + BigInt(DICTIONARY.indexOf(c));
  }
  const hex = big.toString(16).padStart(BYTE_LENGTH * 2, '0');
  if (hex.length > BYTE_LENGTH * 2) throw new InvalidShareCodeError();
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
  return bytes;
}

/** Encodes a crosshair object into a CS2 share code ("CS" + 44 chars). */
export function encodeCrosshair(c) {
  // Fractions are stored as 0.01 steps; rounding absorbs floating point noise (0.29 * 100 = 28.999…).
  const innerSplitAlpha = Math.round(clamp(c.innerSplitAlpha, 0, 1) * 100);
  const outerSplitAlpha = Math.round(clamp(c.outerSplitAlpha, 0.3, 1) * 100) - 30;
  const splitSizeRatio = Math.round(clamp(c.splitSizeRatio, 0, 1) * 100);
  const bits =
    (clamp(c.splitDistance, 0, 127) |
      (innerSplitAlpha << 7) |
      (outerSplitAlpha << 14) |
      (splitSizeRatio << 21) |
      (Number(c.scopeDotUseCrosshairColor) << 28)) >>>
    0;
  const screenHeight = clamp(c.screenHeight, 240, 65535);
  const scopeDotScale = Math.round(clamp(c.scopeDotScale, 0.1, 2) * 100) - 10;
  const gap = clamp(Math.round(c.gap), -3840, 3840);

  const bytes = new Array(BYTE_LENGTH).fill(0);
  bytes[1] = 1; // version
  bytes[2] = screenHeight & 0xff;
  bytes[3] = screenHeight >> 8;
  bytes[4] =
    clamp(c.style, 0, 9) |
    (Number(c.followRecoil) << 5) |
    (Number(c.centerDotEnabled) << 6) |
    (Number(c.tStyleEnabled) << 7);
  bytes[5] = clamp(c.red, 0, 255);
  bytes[6] = clamp(c.green, 0, 255);
  bytes[7] = clamp(c.blue, 0, 255);
  bytes[8] = clamp(c.alpha, 0, 255);
  bytes[9] = clamp(c.outlineRed, 0, 255);
  bytes[10] = clamp(c.outlineGreen, 0, 255);
  bytes[11] = clamp(c.outlineBlue, 0, 255);
  bytes[12] = clamp(c.outlineAlpha, 0, 255);
  bytes[13] = clamp(c.thickness, 0, 32) | (clamp(c.outlineMode, 0, 2) << 6);
  bytes[14] = gap & 0xff;
  bytes[15] = (gap >> 8) & 0xff;
  bytes[16] = clamp(c.length, 0, 255);
  bytes[17] = clamp(c.dynamicSpreadLimit, 0, 255);
  bytes[18] = bits & 0xff;
  bytes[19] = (bits >>> 8) & 0xff;
  bytes[20] = (bits >>> 16) & 0xff;
  bytes[21] = (bits >>> 24) & 0xff;
  bytes[22] = scopeDotScale;
  bytes[0] = sum(bytes.slice(1)) & 0xff;

  return PREFIX + bytesToChars(bytes);
}

/** Decodes a CS2 share code. Values are clamped the same way CS2 does on import. */
export function decodeCrosshair(shareCode) {
  const code = String(shareCode).trim();
  if (/^CSGO(-?[A-Za-z0-9]{5}){5}$/.test(code)) {
    throw new InvalidShareCodeError(
      'This is an old CSGO-xxxxx code. CS2 no longer accepts it since the 30/09/2026 update.',
    );
  }
  if (!CODE_REGEX.test(code)) throw new InvalidShareCodeError();

  const bytes = charsToBytes(code.slice(PREFIX.length));
  if (bytes[0] !== sum(bytes.slice(1)) % 256) throw new InvalidShareCodeError('Checksum mismatch');
  if (bytes[1] !== 1) throw new InvalidShareCodeError('Unsupported crosshair code version');

  const screenHeight = bytes[2] | (bytes[3] << 8);
  if (screenHeight === 0) throw new InvalidShareCodeError();
  const bits = (bytes[18] | (bytes[19] << 8) | (bytes[20] << 16) | (bytes[21] << 24)) >>> 0;

  return {
    style: Math.min(bytes[4] & 0x1f, 9),
    followRecoil: (bytes[4] & 0x20) !== 0,
    centerDotEnabled: (bytes[4] & 0x40) !== 0,
    tStyleEnabled: (bytes[4] & 0x80) !== 0,
    outlineMode: Math.min(bytes[13] >>> 6, 2),
    red: bytes[5],
    green: bytes[6],
    blue: bytes[7],
    alpha: bytes[8],
    outlineRed: bytes[9],
    outlineGreen: bytes[10],
    outlineBlue: bytes[11],
    outlineAlpha: bytes[12],
    gap: clamp(((bytes[14] | (bytes[15] << 8)) << 16) >> 16, -3840, 3840),
    length: bytes[16],
    thickness: Math.min(bytes[13] & 0x3f, 32),
    dynamicSpreadLimit: bytes[17],
    splitDistance: bits & 0x7f,
    innerSplitAlpha: Math.min((bits >>> 7) & 0x7f, 100) / 100,
    outerSplitAlpha: (Math.min((bits >>> 14) & 0x7f, 70) + 30) / 100,
    splitSizeRatio: Math.min((bits >>> 21) & 0x7f, 100) / 100,
    screenHeight: Math.max(screenHeight, 240),
    scopeDotScale: Math.min((bytes[22] + 10) / 100, 2),
    scopeDotUseCrosshairColor: ((bits >>> 28) & 1) === 1,
  };
}

/** Console commands equivalent to the crosshair (CS2 1.41.8.8+ ConVar names). */
export function crosshairToConVars(c) {
  return [
    `cl_crosshairstyle ${c.style}`,
    `cl_crosshaircolor_r ${c.red}`,
    `cl_crosshaircolor_g ${c.green}`,
    `cl_crosshaircolor_b ${c.blue}`,
    `cl_crosshaircolor_a ${c.alpha}`,
    `cl_crosshair_thickness ${c.thickness}`,
    `cl_crosshair_length ${c.length}`,
    `cl_crosshair_gap ${c.gap}`,
    `cl_crosshairdot ${Number(c.centerDotEnabled)}`,
    `cl_crosshair_t ${Number(c.tStyleEnabled)}`,
    `cl_crosshair_recoil ${Number(c.followRecoil)}`,
    `cl_crosshair_drawoutline ${c.outlineMode}`,
    `cl_crosshairoutline_r ${c.outlineRed}`,
    `cl_crosshairoutline_g ${c.outlineGreen}`,
    `cl_crosshairoutline_b ${c.outlineBlue}`,
    `cl_crosshairoutline_a ${c.outlineAlpha}`,
    `cl_crosshair_dynamic_spread_limit ${c.dynamicSpreadLimit}`,
    `cl_crosshair_dynamic_splitdist ${c.splitDistance}`,
    `cl_crosshair_dynamic_splitalpha_innermod ${c.innerSplitAlpha}`,
    `cl_crosshair_dynamic_splitalpha_outermod ${c.outerSplitAlpha}`,
    `cl_crosshair_dynamic_maxdist_splitratio ${c.splitSizeRatio}`,
    `cl_crosshair_screen_height ${c.screenHeight}`,
    `cl_ironsight_dot_scale ${c.scopeDotScale}`,
    `cl_ironsight_usecrosshaircolor ${Number(c.scopeDotUseCrosshairColor)}`,
  ].join('; ');
}
