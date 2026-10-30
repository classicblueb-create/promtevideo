// [lainsen] CUT-PAPER KIT for the "7 เรื่องสะเทือนโลก" film. Same medium as fox.ts (cut-paper collage):
// no drawn line anywhere, every form is a piece of coloured paper; TORN pieces show the white
// core of the sheet along the edge, SCISSOR pieces are crisp; every piece lifts off the stack and
// throws a soft shadow. Pieces are LAID DOWN: held above the stack (wide shadow), lowered, pressed.
// Motion is stop-motion on twos. Contract: pure in (frame, env), rng(seed) only, no clock.
import { Gfx, PENCIL, fractal, rng, type Ctx, type Env, type P } from "./core";
import { blob, bounds, clipped, fillShape, mix, resample, smooth, trace } from "./gallery";
import { THAI_FONTS, TH, drawThai, type ThaiFamily } from "./thai";

export { THAI_FONTS };
export const W = 1080, H = 1920;
export const CORE = "#fbf5e6", SHADOW = "#3c2814";

// ---------------------------------------------------------------- shapes
export const rect = (x0: number, y0: number, x1: number, y1: number): P[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
export const poly = (...pts: number[][]): P[] => pts.map(([x, y]) => [x, y] as P);
export const circ = (cx: number, cy: number, r: number, n = 40): P[] => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r] as P);
export const ell = (cx: number, cy: number, rx: number, ry: number, n = 40, rot = 0): P[] => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)] as P; });
export const ngon = (cx: number, cy: number, r: number, n: number, rot = -Math.PI / 2): P[] => Array.from({ length: n }, (_, i) => [cx + Math.cos(rot + (i / n) * Math.PI * 2) * r, cy + Math.sin(rot + (i / n) * Math.PI * 2) * r] as P);
export const star = (cx: number, cy: number, R: number, r: number, n = 5, rot = -Math.PI / 2): P[] => Array.from({ length: n * 2 }, (_, i) => { const a = rot + (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r : R; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as P; });
export const rrect = (x0: number, y0: number, x1: number, y1: number, r: number): P[] => {
  const o: P[] = [], arc = (cx: number, cy: number, a0: number) => { for (let k = 0; k <= 5; k++) { const a = a0 + (k / 5) * (Math.PI / 2); o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(x1 - r, y0 + r, -Math.PI / 2); arc(x1 - r, y1 - r, 0); arc(x0 + r, y1 - r, Math.PI / 2); arc(x0 + r, y0 + r, Math.PI); return o;
};
export const wavy = (x0: number, x1: number, y: number, amp: number, n: number, bottom: number): P[] => {
  const top: P[] = Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y + Math.sin(i * 1.7 + n) * amp * (i % 2 ? 1 : 0.55)] as P);
  return [...smooth(top, false, 5), [x1, bottom], [x0, bottom]];
};
export const sm = (pts: number[][], per = 6): P[] => smooth(pts.map(([x, y]) => [x, y] as P), true, per);
export { blob };

// ---------------------------------------------------------------- the piece
export type Pose = { dx?: number; dy?: number; rot?: number; s?: number; sx?: number; sy?: number };
export type Pc = {
  shape: P[]; color: string; seed: number; torn?: number; fibre?: number; lift?: number;
  at?: number; dur?: number; from?: P;         // arrives: starts at local frame `at`, lasts `dur`, comes from offset `from` (default: above)
  out?: number;                                 // leaves at this local frame
  live?: (f: number) => Pose;                   // ambient motion, once settled (put such pieces in `top`)
  pivot?: P; alpha?: number; clip?: P[];       // clip: the piece is cut off by this outline (e.g. continents sliding round a globe)
};
export type Cue = { text: string; x: number; y: number; px: number; at: number; dur?: number; out?: number; weight?: number; family?: ThaiFamily; color?: string; align?: "left" | "center" | "right"; maxW?: number; wobble?: number; outline?: [string, number]; seed?: number; rot?: number; pop?: boolean };
export type Scene = { board: string; layers: Pc[][]; top?: Pc[][]; cues: Cue[]; ticker?: boolean; tint?: string };

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const easeOut = (u: number) => 1 - (1 - clamp(u)) ** 3;

const normals = (s: P[]): P[] => s.map((_, i) => { const a = s[(i - 1 + s.length) % s.length], b = s[(i + 1) % s.length], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; });
const ringLen = (s: P[]) => s.reduce((a, p, i) => a + Math.hypot(p[0] - s[(i + 1) % s.length][0], p[1] - s[(i + 1) % s.length][1]), 0);
const tear = (shape: P[], amp: number, seed: number, grow = 0): P[] => {
  const closed = [...shape, shape[0]], n = Math.max(24, Math.round(ringLen(shape) / 2.6)), s = resample(closed, n).slice(0, -1), nr = normals(s), r = rng(seed);
  return s.map(([x, y], i) => { const d = (fractal(seed, x, y, 0.09, 0.09, 3) - 0.5) * amp * 2.2 + (r() - 0.5) * amp * 0.6 + grow; return [x + nr[i][0] * d, y + nr[i][1] * d] as P; });
};
const cutEdge = (shape: P[], seed: number): P[] => { const s = resample([...shape, shape[0]], Math.max(24, Math.round(ringLen(shape) / 4))).slice(0, -1), r = rng(seed); return s.map(([x, y]) => [x + (r() - 0.5) * 0.7, y + (r() - 0.5) * 0.7] as P); };
const memo = new WeakMap<Pc, { face: P[]; core?: P[] }>();
const geom = (p: Pc) => { let m = memo.get(p); if (!m) { m = p.torn ? { face: tear(p.shape, p.torn, p.seed), core: tear(p.shape, p.torn * 0.8, p.seed + 1, p.torn * 0.7) } : { face: cutEdge(p.shape, p.seed) }; memo.set(p, m); } return m; };

const fibres = (g: Gfx, shape: P[], color: string, seed: number, density: number) => {
  const b = bounds(shape), r = rng(seed), area = (b.x1 - b.x0) * (b.y1 - b.y0), c = g.cur;
  clipped(g, shape, () => {
    for (let i = 0; i < 4; i++) fillShape(g, blob(b.x0 + r() * (b.x1 - b.x0), b.y0 + r() * (b.y1 - b.y0), 30 + r() * 90, 20 + r() * 60, seed + i, 0.4, 12, r() * 3), r() < 0.5 ? mix(color, "#ffffff", 0.18) : mix(color, "#000000", 0.12), 0.25);
    c.lineCap = "round";
    const n = Math.min(900, Math.round((area / 900) * density));
    for (let i = 0; i < n; i++) { const x = b.x0 + r() * (b.x1 - b.x0), y = b.y0 + r() * (b.y1 - b.y0), a = r() * Math.PI, l = 3 + r() * 9; c.strokeStyle = r() < 0.55 ? mix(color, "#fff8e8", 0.45) : mix(color, "#1a0e06", 0.3); c.globalAlpha = 0.25 + r() * 0.3; c.lineWidth = 0.6 + r() * 0.7; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 3, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 3, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    c.globalAlpha = 1;
  });
};

type Placed = { p: Pc; dx: number; dy: number; rot: number; sx: number; sy: number; lift: number; pivot: P };
const place = (p: Pc, f: number): Placed | null => {
  const at = p.at ?? 0, dur = p.dur ?? 10;
  if (f < at || (p.out !== undefined && f >= p.out)) return null;
  const u = clamp((f - at) / dur), e = easeOut(u), from = p.from ?? [0, -70];
  const live = u >= 1 && p.live ? p.live(f - at - dur) : {};
  const b = bounds(p.shape), pivot: P = p.pivot ?? [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
  const s = live.s ?? 1;
  return { p, dx: from[0] * (1 - e) + (live.dx ?? 0), dy: from[1] * (1 - e) + (live.dy ?? 0), rot: live.rot ?? 0, sx: (live.sx ?? 1) * s, sy: (live.sy ?? 1) * s, lift: (p.lift ?? 1) * (1 + 5 * (1 - e) * (1 - e)), pivot };
};
const settledAt = (p: Pc) => (p.at ?? 0) + (p.dur ?? 10);
const xform = (c: Ctx, q: Placed, ox = 0, oy = 0) => { c.translate(q.pivot[0] + q.dx + ox, q.pivot[1] + q.dy + oy); if (q.rot) c.rotate(q.rot); if (q.sx !== 1 || q.sy !== 1) c.scale(q.sx, q.sy); c.translate(-q.pivot[0], -q.pivot[1]); };
const touchFor = (g: Gfx, q: Placed, pad: number) => { if (q.p.clip) { const k = bounds(q.p.clip); g.touch(k.x0 - pad, k.y0 - pad, k.x1 + pad + 14, k.y1 + pad + 14); return; } const b = bounds(q.p.shape), r = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) * 0.5 * Math.max(q.sx, q.sy) + pad; g.touch(q.pivot[0] + q.dx - r, q.pivot[1] + q.dy - r, q.pivot[0] + q.dx + r + 14, q.pivot[1] + q.dy + r + 14); };

const drawLayer = (g: Gfx, pieces: Pc[], f: number) => {
  const ps = pieces.map((p) => place(p, f)).filter((q): q is Placed => !!q);
  if (!ps.length) return;
  const c = g.cur;
  g.group("plain", () => ps.forEach((q) => {
    touchFor(g, q, 30); c.save(); if (q.p.clip) { trace(c, q.p.clip); c.clip(); } xform(c, q, 3 * q.lift, 5 * q.lift); trace(c, geom(q.p).face); c.fillStyle = SHADOW; c.globalAlpha = 0.5 * (q.p.alpha ?? 1); c.fill(); c.restore(); c.globalAlpha = 1;
  }), { blur: 4, alpha: 0.55 });
  g.group("plain", () => ps.forEach((q) => {
    const m = geom(q.p); touchFor(g, q, 8); c.save(); if (q.p.clip) { trace(c, q.p.clip); c.clip(); } xform(c, q);
    c.globalAlpha = q.p.alpha ?? 1;
    if (m.core) { trace(c, m.core); c.fillStyle = CORE; c.fill(); }
    trace(c, m.face); c.fillStyle = q.p.color; c.fill();
    fibres(g, m.face, q.p.color, q.p.seed + 2, q.p.fibre ?? 1);
    c.restore(); c.globalAlpha = 1;
  }));
};

/** rolling cache of the leading layers that are done and still: a pure function of (scene, k) */
const drawStack = (ctx: Ctx, env: Env, key: string, layers: Pc[][], top: Pc[][], f: number, board: string) => {
  const DW = Math.round(env.W * env.scale), DH = Math.round(env.H * env.scale);
  let k = 0; while (k < layers.length && layers[k].every((p) => settledAt(p) <= f && p.out === undefined && !p.live)) k++;
  const ck = `cut:${key}:${DW}`; let c = env.cache.get(ck) as { k: number; L: ReturnType<Env["canvas"]> } | undefined;
  if (!c) { c = { k: -1, L: env.canvas(DW, DH) }; env.cache.set(ck, c); }
  if (c.k > k || c.k < 0) { const b = c.L.ctx; b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = "source-over"; b.fillStyle = board; b.fillRect(0, 0, DW, DH); c.k = 0; }
  if (c.k < k) { const g = new Gfx(c.L.ctx, env, 0, PENCIL); c.L.ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0); for (let i = c.k; i < k; i++) drawLayer(g, layers[i], 1e9); c.k = k; }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c.L.canvas as CanvasImageSource, 0, 0);
  const g = new Gfx(ctx, env, 0, PENCIL); ctx.setTransform(env.scale, 0, 0, env.scale, 0, 0);
  for (let i = k; i < layers.length; i++) drawLayer(g, layers[i], f);
  for (const l of top) drawLayer(g, l, f);
  return g;
};

const tickerStrip = (ctx: Ctx, env: Env, f: number, y: number) => {
  const s = env.scale; ctx.save(); ctx.setTransform(s, 0, 0, s, 0, 0); ctx.beginPath(); ctx.rect(0, y, W, 70); ctx.clip();
  const unit = "ข่าวด่วน  ★  BREAKING  ★  ", px = 40; ctx.font = TH(700, px * s, "Kanit"); const per = ctx.measureText(unit).width / s;
  const off = -((f * 7) % per);
  for (let x = off; x < W; x += per) { ctx.font = TH(700, px * s, "Kanit"); ctx.fillStyle = "#fff6e0"; ctx.textBaseline = "alphabetic"; ctx.fillText(unit, x * s, (y + 50) * s); }
  ctx.restore();
};

const cueDraw = (ctx: Ctx, env: Env, q: Cue, f: number, label: string) => {
  if (f < q.at || (q.out !== undefined && f >= q.out)) return;
  const u = q.dur === 0 ? 1 : clamp((f - q.at) / (q.dur ?? 12)), pu = clamp((f - q.at) / 10), x = q.x, y = q.y;
  ctx.save();
  const s = env.scale;
  if (q.pop || q.rot) { const bounce = q.pop ? 1 + 0.2 * Math.sin(pu * Math.PI) * (1 - pu) * 2.2 : 1; ctx.translate(x * s, y * s); ctx.rotate(q.rot ?? 0); ctx.scale(bounce, bounce); ctx.translate(-x * s, -y * s); }
  drawThai(ctx, env, q.text, x, y, { px: q.px, weight: q.weight ?? 700, family: q.family ?? "Kanit", color: q.color ?? "#2a1d14", maxW: q.maxW ?? 880, align: q.align ?? "left", reveal: u, wobble: q.wobble ?? 0, seed: q.seed ?? 7, outline: q.outline ? { color: q.outline[0], width: q.outline[1] } : undefined, label });
  ctx.restore();
};

export const drawScene = (key: string, sc: Scene, ctx: Ctx, local: number, env: Env) => {
  const f = local - (local % 2);        // stop-motion on twos
  const g = drawStack(ctx, env, key, sc.layers, sc.top ?? [], f, sc.board);
  g.paper("paper", 0.1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);            // drawThai works in device pixels
  if (sc.ticker && local >= 20) tickerStrip(ctx, env, f, 158);
  sc.cues.forEach((q, i) => cueDraw(ctx, env, q, local, `${key}:${i}`));
};
