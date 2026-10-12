import { STYLES } from './sharecode.js';

// Rasterizes a crosshair the way CS2 1.41.8.8+ authors it: whole pixels at `screenHeight`.
// Shapes are built as a pixel mask so overlapping parts never double-blend, then the outline
// is derived from the mask and everything is written to an ImageData in one pass.

function buildMask(c, size) {
  const mask = new Uint8Array(size * size);
  const t = c.thickness;
  const g = c.gap;
  const L = c.length;
  const mid = Math.floor(size / 2);
  const o = mid - Math.floor(t / 2); // top-left of the center block (t x t)
  const shape = (STYLES[c.style] || STYLES[0]).shape;

  const rect = (x, y, w, h) => {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(size, Math.round(x + w));
    const y1 = Math.min(size, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) mask.fill(1, yy * size + x0, yy * size + Math.max(x0, x1));
  };

  if (t > 0) {
    if (shape === 'cross' && L > 0) {
      rect(o + t + g, o, L, t); // right
      rect(o - g - L, o, L, t); // left
      rect(o, o + t + g, t, L); // bottom
      if (!c.tStyleEnabled) rect(o, o - g - L, t, L); // top
    } else if (shape === 'circle') {
      // Ring whose stroke runs through the middle of where the cross arms would sit.
      const cx = o + t / 2;
      const r = Math.max(t / 2 + 1, t / 2 + g + L / 2);
      const inner = r - t / 2;
      const outer = r + t / 2;
      const lo = Math.max(0, Math.floor(cx - outer - 1));
      const hi = Math.min(size, Math.ceil(cx + outer + 1));
      for (let y = lo; y < hi; y++) {
        for (let x = lo; x < hi; x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cx);
          if (d >= inner && d < outer) mask[y * size + x] = 1;
        }
      }
    } else if (shape === 'square' || shape === 'quad') {
      // Square outline (or only its four corners) around the center, edges at gap + length / 2.
      const h = Math.max(1, g + Math.round(L / 2));
      const a = o - h - t; // outer top-left
      const side = t + 2 * (h + t);
      if (shape === 'square') {
        rect(a, a, side, t);
        rect(a, a + side - t, side, t);
        rect(a, a, t, side);
        rect(a + side - t, a, t, side);
      } else {
        const arm = Math.min(side / 2, Math.max(t + 1, t + Math.ceil(L / 2)));
        for (const [cxp, cyp, dx, dy] of [
          [a, a, 1, 1],
          [a + side, a, -1, 1],
          [a, a + side, 1, -1],
          [a + side, a + side, -1, -1],
        ]) {
          rect(dx > 0 ? cxp : cxp - arm, dy > 0 ? cyp : cyp - t, arm, t);
          rect(dx > 0 ? cxp : cxp - t, dy > 0 ? cyp : cyp - arm, t, arm);
        }
      }
    }
  }

  if (c.centerDotEnabled || shape === 'dot') rect(o, o, Math.max(t, 1), Math.max(t, 1));
  return mask;
}

function buildOutline(mask, size, mode) {
  const out = new Uint8Array(size * size);
  if (mode === 0) return out;
  const neighbors =
    mode === 1
      ? [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
      : [[-1, 0], [0, -1], [-1, -1]]; // half outline: 1px drop shadow to the bottom-right
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (mask[y * size + x]) continue;
      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < size && ny < size && mask[ny * size + nx]) {
          out[y * size + x] = 1;
          break;
        }
      }
    }
  }
  return out;
}

/** Draws the crosshair centered on `canvas`, whose width/height are the native pixel grid. */
export function drawCrosshair(canvas, c) {
  const size = canvas.width;
  const ctx = canvas.getContext('2d');
  const mask = buildMask(c, size);
  const outline = buildOutline(mask, size, c.outlineMode);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < size * size; i++) {
    const p = i * 4;
    if (mask[i]) {
      d[p] = c.red;
      d[p + 1] = c.green;
      d[p + 2] = c.blue;
      d[p + 3] = c.alpha;
    } else if (outline[i]) {
      d[p] = c.outlineRed;
      d[p + 1] = c.outlineGreen;
      d[p + 2] = c.outlineBlue;
      d[p + 3] = c.outlineAlpha;
    }
  }
  ctx.putImageData(img, 0, 0);
}
