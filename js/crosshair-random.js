import { STYLES } from './sharecode.js';

const int = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const chance = (p) => Math.random() < p;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
// Fractions are stored by CS2 in 0.01 steps, so random fractions are drawn on that grid.
const hundredths = (min, max) => int(Math.round(min * 100), Math.round(max * 100)) / 100;

// The five classic CS crosshair colors plus a few popular community picks.
export const PRESET_COLORS = [
  [255, 0, 0],
  [0, 255, 0],
  [255, 255, 0],
  [0, 0, 255],
  [0, 255, 255],
  [255, 0, 255],
  [255, 255, 255],
  [255, 105, 180],
  [255, 140, 0],
  [160, 32, 240],
  [57, 255, 20],
];

function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

function randomColor(vivid) {
  if (vivid) return chance(0.5) ? pick(PRESET_COLORS) : hslToRgb(int(0, 359), int(75, 100) / 100, int(45, 60) / 100);
  return [int(0, 255), int(0, 255), int(0, 255)];
}

function weighted(entries) {
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  let r = Math.random() * total;
  for (const [value, w] of entries) {
    if ((r -= w) < 0) return value;
  }
  return entries[entries.length - 1][0];
}

/**
 * Generates a random CS2 crosshair.
 * @param {object} opts
 * @param {'sane'|'chaos'} opts.mode   sane = playable values, chaos = (almost) anything the game accepts
 * @param {number[]} [opts.styles]     style ids allowed in the draw
 * @param {number} opts.screenHeight   resolution the pixel sizes are authored for
 */
export function randomCrosshair({ mode = 'sane', styles, screenHeight = 1080 } = {}) {
  const sane = mode === 'sane';
  const pool = styles && styles.length ? styles : STYLES.map((s) => s.id);
  const [red, green, blue] = randomColor(sane);
  const outlineMode = sane ? weighted([[0, 45], [1, 40], [2, 15]]) : int(0, 2);
  const [outlineRed, outlineGreen, outlineBlue] =
    sane ? (chance(0.85) ? [0, 0, 0] : [int(0, 40), int(0, 40), int(0, 40)]) : randomColor(false);

  return {
    style: pick(pool),
    followRecoil: chance(sane ? 0.2 : 0.5),
    centerDotEnabled: chance(sane ? 0.25 : 0.5),
    tStyleEnabled: chance(sane ? 0.1 : 0.4),
    outlineMode,
    red,
    green,
    blue,
    alpha: sane ? int(200, 255) : int(80, 255),
    outlineRed,
    outlineGreen,
    outlineBlue,
    outlineAlpha: sane ? int(200, 255) : int(80, 255),
    gap: sane ? int(-2, 8) : int(-10, 40),
    length: sane ? int(2, 14) : int(0, 64),
    thickness: sane ? weighted([[1, 35], [2, 35], [3, 20], [4, 10]]) : int(1, 16),
    dynamicSpreadLimit: int(0, 255),
    splitDistance: sane ? int(0, 12) : int(0, 127),
    innerSplitAlpha: hundredths(0, 1),
    outerSplitAlpha: hundredths(0.3, 1),
    splitSizeRatio: hundredths(0, 1),
    screenHeight,
    scopeDotScale: sane ? hundredths(0.5, 1.5) : hundredths(0.1, 2),
    scopeDotUseCrosshairColor: chance(0.5),
  };
}
