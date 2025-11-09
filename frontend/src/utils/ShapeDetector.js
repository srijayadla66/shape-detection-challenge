// frontend/src/utils/ShapeDetector.js
// Full ShapeDetector class: grayscale -> binary -> connected components -> contour tracing
// -> Douglas-Peucker approx -> convex hull & colinear cleanup -> robust classification
// Exports: default class ShapeDetector with async detectShapes(imageData) method.

class ShapeDetector {
  constructor() {
    this.threshold = 128;
    this.minArea = 28;
    this.morphKernel = 3;   // closing kernel (3 = mild, 5 = stronger). 3 works well to avoid merging separate shapes.
    this.mergeGap = 4;  // ignore tiny blobs
  }

  async detectShapes(imageData) {
    const t0 = performance.now();
    const { width, height, data } = imageData;

    // 1) convert to grayscale + binary mask (0/1)
    const mask = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const l = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
      mask[p] = l < this.threshold ? 1 : 0; // foreground=1 for dark shapes
    }

    // 2) connected components (4-neighbor flood fill)
    const seen = new Uint8Array(width * height);
    const shapes = [];
    const stack = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (mask[idx] === 1 && !seen[idx]) {
          // flood fill
          let area = 0;
          let minX = x, minY = y, maxX = x, maxY = y;
          stack.push(idx);
          seen[idx] = 1;
          const pixels = [];
          while (stack.length) {
            const cur = stack.pop();
            const cx = cur % width;
            const cy = (cur / width) | 0;
            pixels.push({ x: cx, y: cy });
            area++;
            if (cx < minX) minX = cx;
            if (cy < minY) minY = cy;
            if (cx > maxX) maxX = cx;
            if (cy > maxY) maxY = cy;

            // neighbors 4-connectivity
            const n1 = cur - 1, n2 = cur + 1, n3 = cur - width, n4 = cur + width;
            if (cx > 0) {
              if (!seen[n1] && mask[n1] === 1) { seen[n1] = 1; stack.push(n1); }
            }
            if (cx < width - 1) {
              if (!seen[n2] && mask[n2] === 1) { seen[n2] = 1; stack.push(n2); }
            }
            if (cy > 0) {
              if (!seen[n3] && mask[n3] === 1) { seen[n3] = 1; stack.push(n3); }
            }
            if (cy < height - 1) {
              if (!seen[n4] && mask[n4] === 1) { seen[n4] = 1; stack.push(n4); }
            }
          } // end flood

          if (area >= this.minArea) {
            // trace contour (boundary pixels)
            const contour = this._traceBoundary(mask, width, height, minX, minY, maxX, maxY);
            shapes.push({
              pixels,
              contour,
              area,
              boundingBox: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
            });
          }
        }
      }
    }

    // 3) analyze each shape: approx -> hull -> classify -> compute center & confidence
    const outShapes = [];
    for (const s of shapes) {
      if (!s.contour || s.contour.length < 6) {
        // tiny or degenerate, skip
        continue;
      }

      const perimeter = polygonPerimeter(s.contour);
      const eps = Math.max(4, 0.02 * perimeter);

      const approx = douglasPeucker(s.contour, eps);
      const approxClean = removeColinear(approx, 6);
      const hull = convexHull(approxClean);
      const hullClean = removeColinear(hull, 6);

      const area = s.area;
      const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;

      let type = 'polygon';
      if (hullClean.length === 3) {
        type = 'triangle';
      } else if (hullClean.length === 4) {
        // aspect ratio test
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        hullClean.forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        });
        const w = maxX - minX || 1;
        const h = maxY - minY || 1;
        const ar = w / h;
        type = Math.abs(ar - 1) < 0.12 ? 'square' : 'rectangle';
      } else if (circularity > 0.7) {
        type = 'circle';
      } else {
        type = 'polygon';
      }

      const center = centroidFromPixels(s.pixels);
      const bbox = s.boundingBox;
      const confidence = computeConfidence(type, hullClean.length, circularity, area, perimeter);

      outShapes.push({
        type,
        vertices: hullClean,
        rawVertices: approx,
        center,
        area,
        boundingBox: bbox,
        confidence,
      });
    } // end for shapes

    const t1 = performance.now();
    return {
      shapes: outShapes,
      processingTime: t1 - t0,
    };
  } // end detectShapes


  // ----- helper methods below -----

  // trace boundary using simple neighbor search inside bounding box
  _traceBoundary(mask, width, height, minX, minY, maxX, maxY) {
    const boundary = [];
    // iterate bounding box and collect pixels that have at least one 4-neighbor background
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * width + x;
        if (mask[idx] !== 1) continue;
        const left = x > 0 ? mask[idx - 1] : 0;
        const right = x < width - 1 ? mask[idx + 1] : 0;
        const up = y > 0 ? mask[idx - width] : 0;
        const down = y < height - 1 ? mask[idx + width] : 0;
        if (left === 0 || right === 0 || up === 0 || down === 0) {
          boundary.push({ x, y });
        }
      }
    }
    // order boundary points to form a path (nearest-neighbor greedy)
    return orderBoundary(boundary);
  }
}


// ---------- Utility functions (inside file) ----------

function orderBoundary(points) {
  if (!points || points.length === 0) return [];
  const used = new Array(points.length).fill(false);
  const out = [];
  let idx = 0;
  out.push(points[idx]);
  used[idx] = true;
  for (let step = 1; step < points.length; step++) {
    let best = -1;
    let bestDist = Infinity;
    const cur = out[out.length - 1];
    for (let i = 0; i < points.length; i++) {
      if (used[i]) continue;
      const dx = points[i].x - cur.x;
      const dy = points[i].y - cur.y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    if (best === -1) break;
    used[best] = true;
    out.push(points[best]);
  }
  return out;
}

function polygonPerimeter(points) {
  let p = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = a.x - b.x, dy = a.y - b.y;
    p += Math.hypot(dx, dy);
  }
  return p;
}

// centroid by pixels
function centroidFromPixels(pixels) {
  if (!pixels || pixels.length === 0) return { x: 0, y: 0 };
  let sx = 0, sy = 0;
  for (let i = 0; i < pixels.length; i++) {
    sx += pixels[i].x;
    sy += pixels[i].y;
  }
  return { x: Math.round(sx / pixels.length), y: Math.round(sy / pixels.length) };
}

function computeConfidence(type, vCount, circularity, area, perimeter) {
  let base = 0.5;
  if (type === 'triangle') base = 0.9;
  if (type === 'square' || type === 'rectangle') base = 0.88;
  if (type === 'circle') base = 0.93;
  if (type === 'polygon') base = 0.65;
  // bump by circularity and polygon compactness
  const circBoost = Math.min(0.15, Math.max(0, (circularity - 0.4) * 0.5));
  const sizeBoost = Math.min(0.2, Math.log10(Math.max(10, area)) * 0.03);
  return Math.max(0.12, Math.min(0.99, base + circBoost + sizeBoost));
}

// --- Douglas-Peucker (recursive) ---
// input: points = [{x,y}, ...], epsilon in pixels
function douglasPeucker(points, epsilon) {
  if (!points || points.length < 3) return points.slice();
  const first = 0, last = points.length - 1;
  const stack = [[first, last]];
  const keep = new Array(points.length).fill(false);
  keep[first] = true;
  keep[last] = true;

  function perpendicularDistance(pt, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) {
      return Math.hypot(pt.x - a.x, pt.y - a.y);
    }
    const t = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / (dx * dx + dy * dy);
    const projx = a.x + t * dx;
    const projy = a.y + t * dy;
    return Math.hypot(pt.x - projx, pt.y - projy);
  }

  while (stack.length > 0) {
    const [i, j] = stack.pop();
    let maxDist = 0;
    let index = -1;
    for (let k = i + 1; k < j; k++) {
      const d = perpendicularDistance(points[k], points[i], points[j]);
      if (d > maxDist) { maxDist = d; index = k; }
    }
    if (maxDist > epsilon) {
      keep[index] = true;
      stack.push([i, index]);
      stack.push([index, j]);
    }
  }

  const res = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) res.push(points[i]);
  return res;
}

// --- convex hull (Monotone chain) ---
function cross(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}
function convexHull(points) {
  if (!points || points.length <= 1) return points.slice();
  const pts = points.slice().sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// remove near-colinear consecutive points (closed polygon)
function removeColinear(points, angleTolDeg = 6) {
  if (!points || points.length <= 3) return points.slice();
  const res = [];
  const tol = (angleTolDeg * Math.PI) / 180;
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length];
    const cur = points[i];
    const next = points[(i + 1) % points.length];

    const v1x = prev.x - cur.x, v1y = prev.y - cur.y;
    const v2x = next.x - cur.x, v2y = next.y - cur.y;
    const n1 = Math.hypot(v1x, v1y) || 1;
    const n2 = Math.hypot(v2x, v2y) || 1;
    const dot = (v1x * v2x + v1y * v2y) / (n1 * n2);
    // clamp
    const ang = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (Math.abs(Math.PI - ang) > tol) {
      res.push(cur);
    }
  }
  return res.length >= 3 ? res : points.slice();
}

export default ShapeDetector; 