// [lainsen] 7 เรื่องสะเทือนโลก ใน 1 สัปดาห์ — cut-paper collage, vertical 9:16.
// STORY (3 sentences): a news montage cuts through seven headlines; one by one each lands on the
// table as a stack of cut paper (what happened, the one number, the open question); then the
// camera pulls back to say "none of this means the end of the world, but the risks sit close
// together" and ends on a slowly turning paper globe with a question for the viewer.
// TOKEN: the red "ด่วน" strip, laid first in every scene. LIGHT: flat paper, soft shadow down-right.
// SOUND: news-alert dings + paper / pop / thock effects (no score; voice-over is added separately).
// Contract: pure in (frame, env); every random from rng(seed); no clock, no ctx.filter.
import { rng, turn, type Ctx, type Env, type P } from "./core";
import type { Film, Shot } from "./film";
import { inside } from "./gallery";
import { filmSfx, type SfxPlan } from "./music";
import { THAI_FONTS, W, H, circ, drawScene, ell, poly, rect, rrect, sm, star, type Cue, type Pc, type Scene } from "./cutKit";

const FPS = 30, BPM = 120;
// scene boundaries, all on the 15-frame beat
const S = { montage: [0, 240], hook: [240, 600], s1: [600, 1050], s2: [1050, 1500], s3: [1500, 1950], s4: [1950, 2400], s5: [2400, 2850], s6: [2850, 3300], s7: [3300, 3750], risks: [3750, 3990], globe: [3990, 4320] } as const;
const N = 4320;

// ---------------------------------------------------------------- tiny builders
let SEED = 1000; const sd = () => (SEED += 7);
type O = Partial<Pick<Pc, "torn" | "fibre" | "lift" | "dur" | "from" | "out" | "live" | "pivot" | "alpha" | "clip">>;
const pc = (shape: P[], color: string, at: number, o: O = {}): Pc => ({ shape, color, seed: sd(), at, ...o });
const CREAM = "#f6ebcf", INK = "#2a1d14", RED = "#c1272d", WHITE = "#fffaf0";
const FROM_R: P = [1200, 0], FROM_L: P = [-1200, 0], FROM_B: P = [0, 400], UP: P = [0, -90];
const rot = (pts: P[], cx: number, cy: number, deg: number) => turn(pts, cx, cy, deg);
const cue = (text: string, x: number, y: number, px: number, at: number, o: Partial<Cue> = {}): Cue => ({ text, x, y, px, at, ...o });
type Part = { layers: Pc[][]; cues: Cue[] };

/** the shared frame of every story: ground sheet, lower band, red ticker strip, number badge, headline tag */
const frame = (n: number, headline: string, a: string, b: string, tag = CREAM): Part => ({
  layers: [
    [pc(rect(-20, -20, 1100, 1940), a, 0, { dur: 8, from: FROM_R, lift: 0.5, fibre: 0.5 })],
    [pc(sm([[-30, 1170], [300, 1140], [700, 1166], [1110, 1130], [1110, 1960], [-30, 1960]]), b, 6, { torn: 3.4, dur: 12, from: FROM_B, fibre: 0.8 })],
    [pc(rect(-20, 150, 1100, 236), RED, 10, { torn: 2.4, dur: 10, from: FROM_L })],
    [pc(circ(140, 372, 84), tag, 16, { lift: 1.1, torn: 1.2 }), pc(poly([250, 304], [960, 296], [968, 440], [256, 448]), tag, 20, { torn: 2.2, dur: 12, from: [300, 0] })],
  ],
  cues: [
    cue("เรื่องที่", 140, 316, 26, 24, { align: "center", dur: 0, weight: 700, color: RED }),
    cue(String(n), 140, 336, 88, 24, { align: "center", dur: 0, weight: 700, pop: true }),
    cue(headline, 280, 328, 54, 28, { dur: 16, maxW: 680 }),
  ],
});
/** two paper strips under the hero carrying the facts */
const facts = (a: [string, number], b: [string, number], pxA = 44, pxB = 38): Part => ({
  layers: [
    [pc(poly([110, 1206], [968, 1198], [974, 1396], [106, 1404]), CREAM, a[1], { torn: 2, dur: 10, from: [-300, 0] })],
    [pc(poly([100, 1426], [962, 1420], [968, 1566], [112, 1570]), "#ffe08a", b[1], { torn: 2, dur: 10, from: [300, 0] })],
  ],
  cues: [cue(a[0], 146, 1228, pxA, a[1] + 8, { dur: 28, maxW: 790 }), cue(b[0], 142, 1436, pxB, b[1] + 8, { dur: 30, maxW: 790, weight: 500 })],
});
const compose = (...parts: Part[]): Part => ({ layers: parts.flatMap((p) => p.layers), cues: parts.flatMap((p) => p.cues) });
const scene = (board: string, base: Part, top: Pc[][] = []): Scene => ({ board, layers: base.layers, top, cues: base.cues, ticker: true });
const ring = (cx: number, cy: number, rx: number, ry: number, t: number, deg: number, n = 48): P[] => { const r = (deg * Math.PI) / 180, o = ell(cx, cy, rx, ry, n, r), i = ell(cx, cy, rx - t, ry - t, n, r).reverse(); return [...o, o[0], ...i, i[0]]; };
const candle = (x: number, y0: number, y1: number, w: number, up: boolean, at: number, wick: [number, number], o: O = {}): Pc[] => [
  pc(rect(x - 3, wick[0], x + 3, wick[1]), up ? "#2f8a58" : "#8f1f26", at, { dur: 8, ...o }),
  pc(rect(x - w / 2, Math.min(y0, y1), x + w / 2, Math.max(y0, y1)), up ? "#3fae6e" : "#e04545", at, { dur: 8, torn: 1, ...o }),
];
const chipX = (i: number) => 120 + i * 130;

// ================================================================ MONTAGE (cuts every beat)
const montage = (): Scene => {
  const sheets = ["#1f3b57", "#3b2f63", "#a8643a", "#6f9a5a", "#17313a", "#1b2540", "#dce8f2"];
  const L: Pc[][] = [], cues: Cue[] = [];
  const icon = (i: number, a: number): Pc[] => {
    const c = 540, m = 880;
    switch (i) {
      case 0: return [pc(circ(c, m, 250), "#f0b90b", a + 3, { dur: 6 }), pc(circ(c, m, 190), "#d19a06", a + 3, { dur: 6 }), pc(poly([620, 640], [450, 920], [550, 920], [470, 1150], [680, 830], [580, 830], [660, 640]), "#e0561f", a + 4, { dur: 5 })];
      case 1: return [pc(rrect(340, 700, 740, 1040, 40), "#3fd0b4", a + 3, { dur: 6 }), pc(circ(440, 840, 54), CREAM, a + 4, { dur: 5 }), pc(circ(640, 840, 54), CREAM, a + 4, { dur: 5 }), pc(circ(446, 846, 24), INK, a + 5, { dur: 4 }), pc(circ(646, 846, 24), INK, a + 5, { dur: 4 }), pc(rect(440, 940, 640, 980), "#17614f", a + 5, { dur: 4 }), pc(rect(530, 600, 550, 700), "#17614f", a + 4, { dur: 4 }), pc(circ(540, 590, 30), RED, a + 5, { dur: 4 })];
      case 2: return [pc(sm([[300, 760], [520, 700], [760, 740], [800, 900], [700, 1040], [520, 1000], [360, 930]]), "#e9cf9c", a + 3, { dur: 6, torn: 3 }), pc(sm([[600, 700], [780, 680], [860, 790], [760, 880], [640, 830]]), "#c9553d", a + 4, { dur: 5, torn: 3 }), pc(star(520, 850, 80, 36, 5), "#2c4a8f", a + 5, { dur: 4 })];
      case 3: return [pc(rrect(420, 760, 660, 1100, 36), "#6fb7e0", a + 3, { dur: 6 }), pc(rect(480, 650, 600, 770), "#6fb7e0", a + 3, { dur: 6 }), pc(rrect(470, 600, 610, 660, 12), "#2d5aa0", a + 4, { dur: 5 }), pc(rect(430, 880, 650, 960), CREAM, a + 5, { dur: 4 })];
      case 4: return [pc(poly([300, 1040], [780, 1040], [840, 760], [250, 760]), "#e6b422", a + 3, { dur: 6 }), pc(poly([250, 760], [840, 760], [790, 690], [310, 690]), "#f6d768", a + 4, { dur: 5 }), pc(star(840, 700, 70, 28, 4), WHITE, a + 6, { dur: 4 })];
      case 5: return [...candle(330, 700, 790, 80, false, a + 3, [640, 840]), ...candle(540, 820, 930, 80, false, a + 4, [740, 980]), ...candle(750, 960, 1100, 80, false, a + 5, [880, 1180]), pc(poly([300, 600], [820, 900], [800, 960], [260, 650]), "#ff6b6b", a + 6, { dur: 4 })];
      default: return [pc(rect(380, 600, 700, 1120), "#7fa8c9", a + 3, { dur: 6 }), ...[0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((q) => pc(rect(410 + q * 90, 640 + r * 110, 470 + q * 90, 710 + r * 110), "#c9def0", a + 4, { dur: 4 }))), pc(poly([780, 720], [900, 720], [900, 880], [960, 880], [840, 1040], [720, 880], [780, 880]), "#d7373b", a + 6, { dur: 4 })];
    }
  };
  sheets.forEach((col, i) => {
    const a = i * 15, from: P = i % 2 ? [-1200, 0] : [1200, 0];
    L.push([pc(rect(-20, -20, 1100, 1940), col, Math.max(0, a - 4), { dur: 4, from, lift: 0.5, fibre: 0.4, out: a + 15 })]);
    L.push(icon(i, a).map((p) => ({ ...p, out: a + 15 })));
    L.push([pc(rect(-20, 150, 1100, 236), RED, a + 2, { dur: 4, from: [-900, 0], torn: 2, out: a + 15 })]);
    cues.push(cue("ข่าวด่วน", 70, 160, 60, a + 2, { dur: 0, color: WHITE, out: a + 15 }), cue(String(i + 1), 70, 250, 240, a + 3, { dur: 0, color: WHITE, weight: 700, outline: [INK, 12], pop: true, out: a + 15 }));
  });
  const T = 105;
  L.push([pc(rect(-20, -20, 1100, 1940), "#efe3c8", T, { dur: 8, from: [0, -1400], lift: 0.8 })]);
  L.push([pc(sm([[-30, 1330], [300, 1300], [700, 1325], [1110, 1290], [1110, 1960], [-30, 1960]]), "#c9a06a", T + 6, { torn: 3.4, dur: 10, from: FROM_B })]);
  L.push([pc(rect(-20, 520, 1100, 610), RED, T + 10, { torn: 2.4, dur: 10, from: FROM_L })]);
  L.push([pc(poly([90, 640], [990, 630], [998, 1010], [84, 1020]), WHITE, T + 14, { torn: 2.4, dur: 12, from: UP })]);
  L.push([0, 1, 2, 3, 4, 5, 6].map((i) => pc(circ(chipX(i), 1130, 54), sheets[i], T + 70 + i * 4, { dur: 8, from: [0, -120], lift: 1.2 })));
  cues.push(cue("ข่าวด่วน  •  สรุปสัปดาห์", 540, 532, 52, T + 12, { dur: 0, align: "center", color: WHITE }),
    cue("7 เรื่องสะเทือนโลก\nใน 1 สัปดาห์", 540, 664, 100, T + 18, { dur: 30, align: "center", maxW: 880, weight: 700, color: INK }));
  [0, 1, 2, 3, 4, 5, 6].forEach((i) => cues.push(cue(String(i + 1), chipX(i), 1096, 56, T + 72 + i * 4, { dur: 0, align: "center", color: i === 6 ? INK : WHITE, weight: 700 })));
  cues.push(cue("ไถดูให้ครบทั้ง 7 เรื่อง", 540, 1370, 48, T + 100, { dur: 20, align: "center", weight: 500 }));
  return { board: "#e9dfc9", layers: L, top: [], cues };
};

// ================================================================ HOOK (the morning phone)
const hook = (): Scene => {
  const L: Pc[][] = [], cues: Cue[] = [];
  L.push([pc(rect(-20, -20, 1100, 1940), "#26345f", 0, { dur: 12, from: FROM_R, lift: 0.5 })]);
  L.push([pc(sm([[-30, 1510], [300, 1480], [700, 1506], [1110, 1470], [1110, 1960], [-30, 1960]]), "#3d5a8c", 6, { torn: 3.4, dur: 12, from: FROM_B })]);
  L.push([pc(circ(960, 330, 150), "#ffd98a", 14, { dur: 14, lift: 0.7 }), pc(circ(960, 330, 106), "#ffeab8", 18, { dur: 10, lift: 0.4 })]);
  L.push([pc(rrect(250, 500, 830, 1250, 54), "#1a1f33", 40, { dur: 14, from: [0, 500], lift: 1.6, torn: 0.8 })]);
  L.push([pc(rrect(274, 540, 806, 1210, 36), "#f1e9d6", 48, { dur: 8, from: [0, 300] })]);
  const cards: [string, string, number][] = [["แพลตฟอร์มคริปโต\nระดับโลกถูกโจมตี", "#f0b90b", 100], ["หุ้นเทคโนโลยี\nร่วงหนัก", "#e04545", 152], ["สหรัฐ–อิหร่าน อาจมี\nปฏิบัติการทางทหาร?", "#3b7fa5", 204], ["อ้างผลิตทองคำ\nได้ในห้องทดลอง!", "#e6b422", 256]];
  cards.forEach(([t, col, at], i) => {
    const y = 566 + i * 154;
    L.push([pc(rrect(296, y, 784, y + 136, 22), WHITE, at, { dur: 10, from: [0, -240], torn: 0.8 }), pc(circ(350, y + 68, 32), col, at + 4, { dur: 8, from: [0, -240] })]);
    cues.push(cue(t, 400, y + 18, 30, at + 8, { dur: 18, maxW: 380, weight: 700, color: INK }));
  });
  cues.push(cue("สมมุติว่าคุณตื่นขึ้นมา\nในเช้าวันหนึ่ง…", 90, 262, 64, 20, { dur: 40, maxW: 780, color: WHITE, weight: 700 }));
  cues.push(cue("เกิดอะไรขึ้นกับโลกเรา…\nภายในแค่สัปดาห์เดียว?", 540, 1296, 56, 296, { dur: 40, maxW: 900, align: "center", color: WHITE, weight: 700 }));
  const rays = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return pc(poly([960 + Math.cos(a - 0.08) * 175, 330 + Math.sin(a - 0.08) * 175], [960 + Math.cos(a) * 235, 330 + Math.sin(a) * 235], [960 + Math.cos(a + 0.08) * 175, 330 + Math.sin(a + 0.08) * 175]), "#ffd98a", 30, { dur: 6, live: (t) => ({ rot: t * 0.012 }), pivot: [960, 330] }); });
  const bell = [pc(poly([120, 560], [190, 560], [215, 640], [95, 640]), "#f0b90b", 84, { dur: 8, live: (t) => ({ rot: Math.sin(t / 2.2) * 0.18 }), pivot: [155, 560] }), pc(circ(155, 656, 17), "#f0b90b", 84, { dur: 8, live: (t) => ({ rot: Math.sin(t / 2.2) * 0.18 }), pivot: [155, 560] })];
  return { board: "#1b2540", layers: L, top: [rays, bell], cues, ticker: false };
};

// ================================================================ 1 BINANCE
const s1 = (): Scene => {
  const f = frame(1, "Binance โดนโจมตีไซเบอร์", "#1f3b57", "#2f5d73"), L: Pc[][] = [];
  L.push([pc(rrect(110, 470, 970, 1140, 26), "#f1e9d6", 30, { torn: 1.2, from: [0, 200], dur: 12, lift: 1.4 })]);
  L.push([pc(rect(110, 496, 970, 552), "#27394f", 38, { from: [0, -80] }), pc(circ(158, 524, 11), "#e04545", 44, { dur: 6 }), pc(circ(194, 524, 11), "#f0b90b", 46, { dur: 6 }), pc(circ(230, 524, 11), "#3fae6e", 48, { dur: 6 }), pc(rrect(290, 508, 900, 540, 16), "#46607c", 50, { dur: 6 })]);
  L.push([1060, 950, 840, 730].map((y, i) => pc(rect(130, y, 950, y + 3), "#ddd3ba", 52 + i * 3, { dur: 6, from: [0, 0] })));
  const bodies: [number, number, boolean][] = [[960, 900, true], [920, 850, true], [860, 890, false], [880, 800, true], [820, 740, true], [760, 690, true], [700, 730, false], [720, 650, true], [670, 620, true]];
  bodies.forEach(([a, b, up], i) => L.push(candle(310 + i * 66, a, b, 38, up, 64 + i * 5, [Math.min(a, b) - 26, Math.max(a, b) + 24])));
  L.push(candle(916, 640, 1070, 44, false, 128, [600, 1090], { dur: 7, from: [0, -380] }));
  L.push([pc(poly([160, 520], [20, 840], [110, 840], [50, 1090], [300, 740], [190, 740], [270, 520]), "#e0561f", 112, { dur: 8, from: [-400, -300] })]);
  L.push([pc(poly([150, 510], [10, 830], [100, 830], [40, 1080], [290, 730], [180, 730], [260, 510]), "#ffd23f", 114, { dur: 8, from: [-400, -300] })]);
  L.push([pc(circ(880, 500, 92), "#f0b90b", 70, { dur: 10, lift: 1.4 }), pc(circ(880, 500, 70), "#d19a06", 74, { dur: 8, lift: 0.4 })]);
  L.push([pc(poly([200, 1000], [350, 1000], [350, 1090], [275, 1170], [200, 1090]), "#3a78c2", 220, { dur: 10, from: [0, -300], lift: 1.3 }), pc(poly([220, 1015], [330, 1015], [330, 1085], [275, 1145], [220, 1085]), "#6aa3e0", 226, { dur: 8, from: [0, -300] }), pc(poly([240, 1068], [268, 1098], [318, 1040], [308, 1030], [266, 1078], [248, 1058]), CREAM, 232, { dur: 6 })]);
  const bills = [0, 1, 2, 3, 4].map((i) => pc(rect(-34, -20, 34, 20), "#5aa469", 134 + i * 6, { dur: 4, torn: 0.8, from: [0, 0], pivot: [0, 0], live: (t) => { const ph = (t * 4.2 + i * 150) % 640; return { dx: 640 + i * 70 - ph * 0.25, dy: 600 + ph, rot: Math.sin(t / 9 + i) * 0.7 }; } }));
  const base = compose(f, { layers: L, cues: [cue("$", 880, 456, 84, 76, { dur: 0, align: "center", color: WHITE, weight: 700 })] }, facts(["ผลกระทบเบื้องต้น\nหลายพันล้านดอลลาร์", 150], ["อายัดสินทรัพย์ได้บางส่วนแล้ว แต่เงินดิจิทัล\nของเรา… ปลอดภัยแค่ไหน?", 250]));
  return scene("#e9dfc9", base, [bills]);
};

// ================================================================ 2 AI CYBERATTACK
const robot = (cx: number, cy: number, s: number, at: number, col = "#3fd0b4", dark = "#17614f"): Pc[] => {
  const T = (x: number, y: number): P => [cx + x * s, cy + y * s];
  const R = (x0: number, y0: number, x1: number, y1: number, r: number) => rrect(T(x0, y0)[0], T(x0, y0)[1], T(x1, y1)[0], T(x1, y1)[1], r * s);
  const C = (x: number, y: number, r: number) => circ(T(x, y)[0], T(x, y)[1], r * s);
  return [
    pc(R(-100, -130, 100, 40, 28), col, at, { lift: 1.2, from: [0, -100] }), pc(R(-90, 52, 90, 150, 20), dark, at + 2, { from: [0, -100] }),
    pc(C(-48, -48, 28), CREAM, at + 4, { dur: 6 }), pc(C(48, -48, 28), CREAM, at + 4, { dur: 6 }),
    pc(C(-44, -44, 12), INK, at + 6, { dur: 4 }), pc(C(52, -44, 12), INK, at + 6, { dur: 4 }),
    pc(R(-52, -2, 52, 22, 6), dark, at + 6, { dur: 4 }), pc(R(-5, -180, 5, -130, 2), dark, at + 3, { dur: 5 }), pc(C(0, -188, 16), RED, at + 6, { dur: 4 }),
  ];
};
const s2 = (): Scene => {
  const f = frame(2, "แฮกเกอร์เริ่มใช้ AI", "#3b2f63", "#54447f"), L: Pc[][] = [], cues: Cue[] = [];
  L.push([pc(rrect(90, 470, 990, 1150, 30), "#4b3f7a", 28, { torn: 1.4, from: [0, 220], dur: 12, lift: 1.2 })]);
  const mx = sm([[480, 640], [610, 626], [690, 656], [700, 700], [660, 716], [700, 756], [756, 796], [734, 810], [680, 790], [630, 746], [590, 710], [540, 718], [500, 694]]);
  const sa = sm([[744, 806], [850, 806], [930, 856], [922, 930], [872, 976], [846, 1050], [806, 1130], [776, 1100], [756, 1020], [726, 940], [704, 876]]);
  L.push([pc(mx, "#8fbf7a", 44, { torn: 3, from: [0, 160] }), pc(sa, "#7db36a", 50, { torn: 3, from: [0, 160] })]);
  const r = rng(77), pins: Pc[] = []; let tries = 0;
  while (pins.length < 44 && tries++ < 4000) { const x = 460 + r() * 500, y = 620 + r() * 520; if (inside(mx, x, y) || inside(sa, x, y)) pins.push(pc(circ(x, y, 9, 14), "#e0281f", 82 + pins.length * 2.4, { dur: 5, from: [0, -50], lift: 0.5 })); }
  L.push(pins);
  L.push([pc(star(600, 560, 120, 96, 14), "#e0281f", 70, { dur: 10, torn: 1.4, lift: 1.4, from: [0, -300] })]);
  cues.push(cue("400+", 600, 520, 76, 82, { dur: 0, align: "center", color: WHITE, weight: 700, pop: true }), cue("ลาตินอเมริกา", 600, 1086, 30, 150, { dur: 14, align: "center", color: WHITE, weight: 500, maxW: 300 }));
  L.push(robot(240, 650, 1, 60));
  [0, 1, 2].forEach((i) => L.push(robot(160 + i * 100, 885, 0.36, 130 + i * 10)));
  L.push([pc(poly([440, 830], [500, 830], [500, 800], [560, 860], [500, 920], [500, 890], [440, 890]), "#ff8a3d", 190, { dur: 8, from: [-200, 0] })]);
  L.push([pc(rect(130, 1096, 430, 1148), "#8c8a99", 150, { from: [0, 200] }), ...[0, 1, 2, 3].map((i) => pc(rect(158 + i * 70, 1000, 198 + i * 70, 1096), CREAM, 156 + i * 4, { dur: 8, from: [0, 160] })), pc(poly([126, 1002], [280, 946], [434, 1002]), "#d9cdb0", 176, { from: [0, -200] })]);
  L.push([pc(poly([380, 1062], [440, 1062], [410, 1004]), "#e0281f", 230, { dur: 8, from: [0, -200] })]);
  cues.push(cue("!", 410, 1022, 38, 238, { dur: 0, align: "center", color: WHITE, weight: 700 }));
  const base = compose(f, { layers: L, cues }, facts(["AI Agents ช่วยโจมตีสถาบันการเงิน\nกว่า 400 แห่ง", 150], ["จากที่แฮกเกอร์ต้องลงมือเองหลายขั้นตอน\nวันนี้ AI ทำแทนได้อัตโนมัติมากขึ้น", 260]));
  const blink = [pc(circ(240, 462, 14), "#ff4d4d", 200, { dur: 4, live: (t) => ({ s: 0.6 + 0.6 * (Math.floor(t / 8) % 2) }) })];
  return scene("#e9dfc9", base, [blink]);
};

// ================================================================ 3 US–IRAN
const curve = (t: number): P => { const a: P = [270, 900], b: P = [420, 700], c: P = [690, 740]; return [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]]; };
const s3 = (): Scene => {
  const f = frame(3, "สหรัฐ–อิหร่าน ตึงเครียด", "#a8643a", "#7a4528"), L: Pc[][] = [], cues: Cue[] = [];
  L.push([pc(rrect(90, 470, 990, 1150, 30), "#3b7fa5", 28, { torn: 1.4, from: [0, 220], dur: 12, lift: 1.2 })]);
  L.push([pc(sm([[130, 640], [330, 590], [470, 600], [540, 650], [520, 720], [400, 760], [250, 740], [150, 700]]), "#e3c58f", 40, { torn: 3, from: [-200, 0] }), pc(sm([[360, 800], [520, 770], [650, 830], [740, 930], [690, 1040], [590, 1110], [510, 1060], [470, 940], [400, 880]]), "#e9cf9c", 46, { torn: 3, from: [0, 200] })]);
  L.push([pc(sm([[580, 620], [720, 560], [870, 590], [950, 680], [920, 790], [820, 850], [740, 800], [680, 720], [570, 690]]), "#c9553d", 54, { torn: 3, from: [200, 0] })]);
  cues.push(cue("อิหร่าน", 790, 668, 46, 70, { dur: 14, align: "center", color: WHITE, weight: 700 }));
  L.push([pc(circ(200, 850, 78), "#2c4a8f", 76, { dur: 10, lift: 1.4, from: [-260, 0] }), pc(star(200, 850, 52, 22, 5), WHITE, 84, { dur: 8 })]);
  cues.push(cue("สหรัฐ", 200, 936, 36, 90, { dur: 12, align: "center", color: WHITE, weight: 700 }));
  L.push(Array.from({ length: 14 }, (_, i) => pc(circ(curve((i + 1) / 15)[0], curve((i + 1) / 15)[1], 7, 14), CREAM, 110 + i * 4, { dur: 5, from: [0, -40], lift: 0.5 })));
  L.push([pc(rect(140, 1026, 300, 1096), "#8a5a3a", 180, { from: [0, 200], lift: 1.2 }), pc(rect(180, 1042, 260, 1054), INK, 190, { dur: 4 }), pc(rect(195, 996, 245, 1048), WHITE, 192, { dur: 6, from: [0, -100] })]);
  cues.push(cue("เลือกตั้งกลางเทอม", 220, 1100, 26, 200, { dur: 18, align: "center", color: WHITE, weight: 500, maxW: 360 }));
  L.push([pc(rot(rect(590, 950, 930, 1050), 760, 1000, -8), CREAM, 270, { dur: 8, from: [0, -300], torn: 1.4, lift: 1.4 })]);
  cues.push(cue("ยังไม่มีการยืนยัน", 760, 976, 40, 280, { dur: 0, align: "center", color: RED, weight: 700, rot: -0.14, pop: true }));
  const planes = [0, 1, 2].map((i) => pc(poly([-22, -10], [24, 0], [-22, 10], [-12, 0]), WHITE, 120 + i * 12, { dur: 4, from: [0, 0], torn: 0.6, pivot: [0, 0], live: (t) => { const u = ((t + i * 30) % 90) / 90, p = curve(u), q = curve(Math.min(1, u + 0.02)); return { dx: p[0], dy: p[1], rot: Math.atan2(q[1] - p[1], q[0] - p[0]), s: 1.3 }; } }));
  const base = compose(f, { layers: L, cues }, facts(["สหรัฐแจ้งพันธมิตรให้เตรียมรับ\nความเป็นไปได้ หลังเลือกตั้งกลางเทอม", 150], ["เป็นเพียงรายงานข่าว ยังไม่มีการยืนยัน\nว่าจะเกิดการโจมตีขึ้นจริง", 270]));
  return scene("#e9dfc9", base, [planes]);
};

// ================================================================ 4 FOOD & WATER
const s4 = (): Scene => {
  const f = frame(4, "ชวนสำรองอาหารและน้ำ", "#6f9a5a", "#4f7a3f"), L: Pc[][] = [], cues: Cue[] = [];
  L.push([pc(rect(120, 480, 960, 1160), "#d9b27a", 28, { torn: 1.2, from: [0, 200], dur: 12, lift: 1.2 }), pc(rect(120, 480, 154, 1170), "#7a4f2a", 34, { from: [0, 200] }), pc(rect(926, 480, 960, 1170), "#7a4f2a", 36, { from: [0, 200] })]);
  [770, 970, 1150].forEach((y, i) => L.push([pc(rect(120, y, 960, y + 28), "#9a6a3a", 44 + i * 6, { from: [-300, 0], dur: 10 })]));
  const items: Pc[][] = [];
  items.push([pc(rrect(180, 590, 340, 770, 20), CREAM, 80, { from: [0, -300] }), pc(rect(190, 650, 330, 704), "#d7373b", 86, { dur: 6, from: [0, -300] })]);
  ["#d7373b", "#e6962f", "#3fae6e"].forEach((c, i) => items.push([pc(rrect(384 + i * 74, 670, 440 + i * 74, 770, 8), "#b9bec7", 96 + i * 8, { from: [0, -300] }), pc(rect(388 + i * 74, 700, 436 + i * 74, 740), c, 100 + i * 8, { dur: 5, from: [0, -300] })]));
  [0, 1, 2].forEach((i) => items.push([pc(poly([650 + i * 90, 770], [650 + i * 90, 700], [668 + i * 90, 676], [668 + i * 90, 640], [694 + i * 90, 640], [694 + i * 90, 676], [712 + i * 90, 700], [712 + i * 90, 770]), "#6fb7e0", 124 + i * 8, { from: [0, -300] }), pc(rect(668 + i * 90, 628, 694 + i * 90, 646), "#2d5aa0", 128 + i * 8, { dur: 5, from: [0, -300] })]));
  items.push([pc(rrect(170, 885, 330, 935, 18), "#f0c22b", 160, { from: [-300, 0] }), pc(poly([330, 875], [388, 858], [388, 962], [330, 945]), "#b9bec7", 166, { from: [-300, 0] })]);
  items.push([pc(rrect(560, 860, 740, 970, 14), WHITE, 176, { from: [0, -300] }), pc(rect(632, 878, 668, 952), RED, 182, { dur: 5 }), pc(rect(590, 896, 710, 934), RED, 182, { dur: 5 })]);
  [0, 1].forEach((i) => items.push([pc(rrect(790, 930 - i * 40, 900, 970 - i * 40, 8), i ? "#e6962f" : "#d7373b", 190 + i * 8, { from: [0, -300] })]));
  [0, 1, 2].forEach((i) => items.push([pc(rrect(190 + i * 150, 1000, 300 + i * 150, 1150, 22), "#6fb7e0", 214 + i * 8, { from: [0, -300] }), pc(rrect(214 + i * 150, 1020, 276 + i * 150, 1050, 8), CREAM, 218 + i * 8, { dur: 5 }), pc(rrect(226 + i * 150, 976, 264 + i * 150, 1004, 8), "#2d5aa0", 218 + i * 8, { dur: 5 })]));
  items.push([pc(rrect(660, 1040, 900, 1150, 14), "#c9553d", 240, { from: [0, -300] }), pc(rect(690, 1064, 870, 1096), CREAM, 246, { dur: 5 })]);
  L.push(...items);
  const beam = pc(poly([388, 868], [560, 800], [560, 1010], [388, 952]), "#fff3a8", 170, { dur: 4, alpha: 0.55, live: (t) => ({ sx: 1 + Math.sin(t / 4) * 0.04, rot: Math.sin(t / 7) * 0.02 }), pivot: [388, 910] });
  [[330, 580], [470, 640], [790, 620], [260, 860], [650, 840], [840, 900], [250, 990]].forEach(([x, y], i) => L.push([pc(circ(x, y, 26), "#3fae6e", 140 + i * 18, { dur: 6, from: [0, -60], lift: 0.8 }), pc(poly([x - 12, y], [x - 4, y + 9], [x + 14, y - 11], [x + 9, y - 16], [x - 4, y - 1], [x - 8, y - 5]), WHITE, 144 + i * 18, { dur: 4, from: [0, -60] })]));
  const base = compose(f, { layers: L, cues }, facts(["หลายประเทศแนะนำให้ประชาชน\nสำรองอาหาร น้ำ และของจำเป็น", 150], ["เผื่อเกิดเหตุที่ทำให้บริการพื้นฐาน\nหยุดชะงัก — เตรียมไว้ไม่เสียหาย", 270]));
  return scene("#e9dfc9", base, [[beam]]);
};

// ================================================================ 5 GOLD
const s5 = (): Scene => {
  const f = frame(5, "ปรอทกลายเป็นทองคำ?", "#17313a", "#0f2128"), L: Pc[][] = [], cues: Cue[] = [];
  L.push([pc(circ(560, 820, 360), "#244a58", 26, { dur: 14, from: [0, 300], lift: 0.5, fibre: 0.4 })]);
  L.push([pc(poly([200, 520], [310, 520], [310, 650], [388, 860], [408, 1000], [362, 1100], [148, 1100], [102, 1000], [122, 860], [200, 650]), "#bfe3ea", 40, { from: [-300, 0], alpha: 0.92 })]);
  L.push([pc(poly([142, 930], [366, 930], [404, 1000], [360, 1096], [150, 1096], [106, 1000]), "#c9ced6", 54, { from: [-300, 0], torn: 1.2 })]);
  cues.push(cue("Hg", 256, 962, 66, 70, { dur: 0, align: "center", color: INK, weight: 700 }), cue("ปรอท", 256, 1030, 32, 74, { dur: 10, align: "center", color: INK }));
  L.push([pc(circ(570, 810, 40), "#e0561f", 90, { dur: 8, from: [0, -300], lift: 1.4 })]);
  [0, 60, 120].forEach((d, i) => L.push([pc(ring(570, 810, 190, 74, 12, d), ["#3fd0b4", "#ffd23f", "#ff8a8a"][i], 98 + i * 8, { dur: 8, from: [0, -300] })]));
  cues.push(cue("ปฏิกิริยานิวเคลียร์", 570, 1024, 30, 128, { dur: 16, align: "center", color: WHITE, weight: 500 }));
  const bar = (x: number, y: number, w: number, h: number, at: number): Pc[] => [pc(poly([x + 16, y], [x + w - 16, y], [x + w, y + h], [x, y + h]), "#e6b422", at, { from: [0, -400], lift: 1.2 }), pc(poly([x + 16, y], [x + w - 16, y], [x + w - 8, y + 16], [x + 8, y + 16]), "#f6d768", at + 2, { from: [0, -400] })];
  L.push(bar(740, 1000, 120, 90, 170), bar(870, 1000, 90, 90, 180), bar(790, 900, 120, 90, 190));
  cues.push(cue("ทองคำ", 850, 846, 32, 196, { dur: 10, align: "center", color: WHITE }));
  L.push([pc(rot(rect(640, 560, 940, 650), 790, 605, 6), CREAM, 250, { dur: 8, from: [0, -300], torn: 1.4, lift: 1.4 })]);
  cues.push(cue("รอการตรวจสอบ", 790, 584, 40, 258, { dur: 0, align: "center", color: RED, weight: 700, rot: 0.1, pop: true }));
  const sparkle = [[760, 880, 0], [940, 960, 14], [830, 840, 28]].map(([x, y, ph]) => pc(star(x, y, 24, 7, 4), WHITE, 200, { dur: 4, live: (t) => ({ s: 0.4 + 0.9 * Math.abs(Math.sin((t + ph) / 10)), rot: t * 0.02 }) }));
  const electrons = [0, 60, 120].map((d, i) => pc(circ(0, 0, 11, 14), WHITE, 120, { dur: 4, pivot: [0, 0], live: (t) => { const a = t / 14 + i * 2.1, r = (d * Math.PI) / 180, x = Math.cos(a) * 190, y = Math.sin(a) * 74; return { dx: 570 + x * Math.cos(r) - y * Math.sin(r), dy: 810 + x * Math.sin(r) + y * Math.cos(r) }; } }));
  const bub = [0, 1, 2].map((i) => pc(circ(0, 0, 10 + i * 3, 16), "#eefafc", 80, { dur: 4, pivot: [0, 0], alpha: 0.9, live: (t) => ({ dx: 220 + i * 40 + Math.sin(t / 8 + i) * 8, dy: 1060 - ((t * 1.6 + i * 40) % 130) }) }));
  const base = compose(f, { layers: L, cues }, facts(["มีบริษัทอ้างว่าเปลี่ยนปรอทเป็นทองคำ\nด้วยกระบวนการนิวเคลียร์", 150], ["ยังเป็นเพียงคำกล่าวอ้างที่ต้องรอตรวจสอบ\nไม่ได้แปลว่าผลิตทองถูกได้จริง", 270]));
  return scene("#e9dfc9", base, [sparkle, electrons, bub]);
};

// ================================================================ 6 CHINA STAR50
const s6 = (): Scene => {
  const f = frame(6, "หุ้นเทคจีนร่วงหนัก", "#1b2540", "#12192e"), L: Pc[][] = [], cues: Cue[] = [];
  L.push([pc(rrect(110, 470, 970, 1150, 28), "#26335c", 28, { torn: 1.2, from: [0, 220], dur: 12, lift: 1.3 })]);
  L.push([pc(rot(poly([270, 730], [650, 730], [650, 685], [790, 780], [650, 875], [650, 830], [270, 830]), 520, 780, 28), "#6e2a3a", 52, { dur: 12, from: [-300, -200], lift: 0.6, alpha: 0.95 })]);
  [570, 600, 640, 640, 700, 740, 760, 830, 880, 900, 960, 1000].forEach((y, i) => L.push(candle(170 + i * 60, y, y + 70 + (i % 3) * 14, 36, i === 4 || i === 8, 64 + i * 6, [y - 28, y + 120])));
  L.push([pc(rect(130, 492, 420, 558), "#e04545", 60, { dur: 8, from: [-300, 0] })]);
  cues.push(cue("STAR50", 150, 496, 52, 70, { dur: 0, color: WHITE, weight: 700 }));
  L.push([pc(star(830, 640, 130, 104, 16), "#ffd23f", 150, { dur: 10, torn: 1.4, lift: 1.4, from: [0, -400] })]);
  cues.push(cue("-40%", 830, 598, 74, 158, { dur: 0, align: "center", color: RED, weight: 700, pop: true }));
  L.push([...[0, 1, 2, 3].flatMap((i) => [pc(rect(214 + i * 36, 904, 228 + i * 36, 934), "#d9b44a", 200 + i * 2, { dur: 5 }), pc(rect(214 + i * 36, 1066, 228 + i * 36, 1096), "#d9b44a", 200 + i * 2, { dur: 5 })]), pc(rrect(190, 930, 350, 1070, 14), "#3b3f52", 196, { from: [0, -300], lift: 1.2 })]);
  cues.push(cue("AI", 270, 962, 62, 206, { dur: 0, align: "center", color: WHITE, weight: 700 }));
  L.push([pc(rot(rect(400, 1040, 640, 1110), 520, 1075, -4), CREAM, 250, { dur: 8, from: [0, -300], torn: 1.4, lift: 1.3 })]);
  cues.push(cue("ไม่ถึง 4 เดือน", 520, 1050, 40, 258, { dur: 0, align: "center", color: INK, weight: 700, rot: -0.07, pop: true }));
  const base = compose(f, { layers: L, cues }, facts(["ดัชนี STAR50 ปรับตัวลงประมาณ 40%\nในช่วงไม่ถึง 4 เดือน", 150], ["ความหวังเรื่อง AI ของจีน…\nร้อนแรงเกินไปหรือเปล่า?", 270]));
  const pulse = [pc(circ(830, 785, 14), "#ff4d4d", 190, { dur: 4, live: (t) => ({ s: 0.7 + 0.5 * Math.abs(Math.sin(t / 8)) }) })];
  return scene("#e9dfc9", base, [pulse]);
};

// ================================================================ 7 ALPHABET
const s7 = (): Scene => {
  const f = frame(7, "Alphabet หุ้นร่วงวันเดียว", "#dce8f2", "#b8cfe0"), L: Pc[][] = [], cues: Cue[] = [];
  L.push([pc(rect(130, 470, 410, 1150), "#6f98bb", 30, { from: [0, 300], lift: 1.3, torn: 1 })]);
  L.push(Array.from({ length: 12 }, (_, i) => pc(rect(158 + (i % 3) * 82, 500 + Math.floor(i / 3) * 96, 218 + (i % 3) * 82, 566 + Math.floor(i / 3) * 96), i === 5 ? "#ffe08a" : "#c9def0", 50 + i * 3, { dur: 6, from: [0, 60] })));
  L.push([pc(rot(rect(150, 900, 400, 1010), 275, 955, -3), CREAM, 120, { dur: 8, from: [-300, 0], torn: 1.4, lift: 1.3 })]);
  (["#4285f4", "#ea4335", "#fbbc05", "#34a853"]).forEach((c, i) => L.push([pc(rect(166 + (i % 2) * 26, 912 + Math.floor(i / 2) * 26, 186 + (i % 2) * 26, 932 + Math.floor(i / 2) * 26), c, 126 + i * 3, { dur: 5 })]));
  cues.push(cue("Alphabet", 300, 928, 34, 134, { dur: 12, weight: 700, color: INK, align: "center" }));
  L.push(candle(745, 580, 1000, 120, false, 130, [500, 1100], { dur: 10, from: [0, -420], lift: 1.5 }));
  L.push([pc(poly([835, 600], [875, 600], [875, 830], [935, 830], [855, 940], [775, 830], [835, 830]), "#d7373b", 170, { dur: 10, from: [0, -400], lift: 1.2 })]);
  L.push([pc(star(545, 700, 130, 104, 14), "#d7373b", 150, { dur: 10, torn: 1.4, lift: 1.4, from: [0, -400] })]);
  cues.push(cue("-12.6%", 545, 666, 62, 160, { dur: 0, align: "center", color: WHITE, weight: 700, pop: true }));
  L.push([pc(rot(rect(400, 1030, 700, 1120), 550, 1075, -3), CREAM, 220, { dur: 8, from: [0, -300], torn: 1.4, lift: 1.4 })]);
  cues.push(cue("ในวันเดียว", 550, 1050, 44, 228, { dur: 0, align: "center", color: RED, weight: 700, rot: -0.05, pop: true }));
  const q = [[470, 520, 0], [690, 470, 10]].map(([x, y, ph]) => pc(circ(x, y, 22), "#8aa8c4", 190, { dur: 4, live: (t) => ({ dy: Math.sin((t + ph) / 8) * 10 }) }));
  cues.push(cue("?", 470, 484, 44, 200, { dur: 0, align: "center", color: WHITE, weight: 700 }), cue("?", 690, 434, 44, 206, { dur: 0, align: "center", color: WHITE, weight: 700 }));
  const base = compose(f, { layers: L, cues }, facts(["Alphabet บริษัทแม่ของ Google\nราคาหุ้นร่วงราว 12.6% ในวันเดียว", 150], ["ท่ามกลางความกังวลเรื่องการลงทุน\nและความคาดหวังในธุรกิจ AI", 270]));
  return scene("#e9dfc9", base, [q]);
};

// ================================================================ RISKS (not the end of the world)
const risks = (): Scene => {
  const L: Pc[][] = [], cues: Cue[] = [];
  L.push([pc(rect(-20, -20, 1100, 1940), "#efe3c8", 0, { dur: 12, from: FROM_R, lift: 0.5 })]);
  L.push([pc(rect(-20, 150, 1100, 236), RED, 6, { torn: 2.4, dur: 10, from: FROM_L })]);
  cues.push(cue("ไม่ได้หมายความว่า\nโลกกำลังจะล่มสลาย", 540, 290, 76, 12, { dur: 40, align: "center", maxW: 900, weight: 700, color: INK }));
  const tiles: [string, string, number, number, string][] = [["การเงิน", "#f0b90b", 130, 570, "coin"], ["เทคโนโลยี", "#3fd0b4", 560, 570, "chip"], ["สงคราม", "#c9553d", 130, 920, "pin"], ["ความมั่นคง\nในชีวิตประจำวัน", "#6f9a5a", 560, 920, "home"]];
  tiles.forEach(([label, col, x, y, kind], i) => {
    const at = 80 + i * 22, cx = x + 195, cy = y + 120;
    L.push([pc(rrect(x, y, x + 390, y + 320, 28), col, at, { dur: 10, from: [0, -500], lift: 1.5, torn: 1 })]);
    if (kind === "coin") L.push([pc(circ(cx, cy, 74), "#fff3c4", at + 6, { dur: 6 }), pc(circ(cx, cy, 52), "#e6b422", at + 8, { dur: 5 })]);
    if (kind === "chip") L.push([pc(rrect(cx - 64, cy - 64, cx + 64, cy + 64, 12), "#17614f", at + 6, { dur: 6 }), pc(rect(cx - 30, cy - 30, cx + 30, cy + 30), "#8ef0d8", at + 8, { dur: 5 })]);
    if (kind === "pin") L.push([pc(circ(cx, cy - 12, 56), "#fff3e6", at + 6, { dur: 6 }), pc(poly([cx - 50, cy + 14], [cx + 50, cy + 14], [cx, cy + 96]), "#fff3e6", at + 7, { dur: 6 }), pc(circ(cx, cy - 12, 20), "#c9553d", at + 9, { dur: 4 })]);
    if (kind === "home") L.push([pc(rect(cx - 62, cy - 10, cx + 62, cy + 80), "#fff3e6", at + 6, { dur: 6 }), pc(poly([cx - 82, cy - 6], [cx, cy - 76], [cx + 82, cy - 6]), "#d7373b", at + 7, { dur: 6 }), pc(rect(cx - 16, cy + 24, cx + 16, cy + 80), "#8a5a3a", at + 9, { dur: 4 })]);
    cues.push(cue(label, cx, y + 232, label.includes("\n") ? 36 : 44, at + 12, { dur: 12, align: "center", color: INK, weight: 700, maxW: 360 }));
  });
  cues.push(cue("แต่ความเสี่ยงหลายด้านเกิดขึ้นใกล้กัน", 540, 1300, 44, 180, { dur: 26, align: "center", maxW: 900, weight: 700, color: INK }));
  const warn = [pc(poly([540, 1420], [600, 1520], [480, 1520]), "#d7373b", 200, { dur: 6, live: (t) => ({ s: 0.85 + 0.2 * Math.abs(Math.sin(t / 9)) }) })];
  cues.push(cue("!", 540, 1466, 44, 210, { dur: 0, align: "center", color: WHITE, weight: 700 }));
  return { board: "#17313a", layers: L, top: [warn], cues, ticker: true };
};

// ================================================================ GLOBE (closing question)
const globe = (): Scene => {
  const L: Pc[][] = [], cues: Cue[] = [];
  L.push([pc(rect(-20, -20, 1100, 1940), "#101a38", 0, { dur: 12, from: FROM_R, lift: 0.5 })]);
  const r = rng(404);
  L.push(Array.from({ length: 22 }, () => pc(star(60 + r() * 960, 120 + r() * 1000, 9 + r() * 8, 3, 4), "#f2cf6e", 10 + Math.floor(r() * 60), { dur: 5, from: [0, -30], lift: 0.4 })));
  const G: P = [540, 760], R = 340, disc = circ(G[0], G[1], R, 72);
  L.push([pc(disc, "#2f6fa8", 20, { dur: 14, from: [0, 500], lift: 1.6 })]);
  // continents ride a 900-wide ribbon and slide round behind the disc's outline
  const WRAP = 900;
  const shapes: [P[], string][] = [
    [sm([[-300, -170], [-190, -230], [-80, -190], [-60, -80], [-170, -20], [-290, -70]]), "#8fbf7a"],
    [sm([[-140, 0], [-60, 40], [-30, 150], [-80, 250], [-150, 180], [-170, 80]]), "#7db36a"],
    [sm([[40, -230], [200, -240], [330, -150], [290, -50], [160, -70], [80, -110]]), "#b6c97a"],
    [sm([[120, 20], [220, 0], [300, 80], [250, 200], [150, 160]]), "#e3c58f"],
    [sm([[330, 170], [400, 150], [420, 220], [350, 240]]), "#8fbf7a"],
  ];
  const cont = shapes.flatMap(([shape, col], i) => [0, 1].map((k) => pc(shape.map(([x, y]) => [x + G[0], y + G[1]] as P), col, 40 + i * 4, { dur: 6, torn: 2.4, clip: disc, from: [0, 0], pivot: [G[0], G[1]], live: (t) => ({ dx: ((t * 0.8) % WRAP) - k * WRAP }) })));
  const shade = [pc(ell(G[0] + 120, G[1] + 60, R * 0.95, R * 1.05, 60), "#0b1530", 40, { dur: 6, alpha: 0.28, clip: disc, from: [0, 0], lift: 0.1 })];
  L.push([0, 1, 2, 3, 4, 5, 6].map((i) => pc(circ(chipX(i), 1210, 50), ["#1f3b57", "#7a5fb8", "#c9553d", "#6f9a5a", "#e6b422", "#e04545", "#7fa8c9"][i], 150 + i * 5, { dur: 8, from: [0, -120], lift: 1.2 })));
  [0, 1, 2, 3, 4, 5, 6].forEach((i) => cues.push(cue(String(i + 1), chipX(i), 1176, 52, 156 + i * 5, { dur: 0, align: "center", color: i === 4 ? INK : WHITE, weight: 700 })));
  L.push([pc(poly([70, 1290], [1010, 1282], [1016, 1560], [64, 1566]), CREAM, 190, { torn: 2, dur: 10, from: [0, 300], lift: 1.4 })]);
  cues.push(cue("แล้วถ้าเกิดวิกฤตขึ้นจริง ๆ\nคุณพร้อมรับมือกับเรื่องไหนมากที่สุด?", 540, 1316, 48, 200, { dur: 60, align: "center", maxW: 880, weight: 700, color: INK }));
  cues.push(cue("พิมพ์เลข 1–7 ไว้ในคอมเมนต์ได้เลย", 540, 1480, 34, 270, { dur: 20, align: "center", maxW: 880, weight: 500, color: RED }));
  const twinkle = [[90, 300, 0], [980, 460, 12], [200, 1000, 24], [900, 1060, 36]].map(([x, y, ph]) => pc(star(x, y, 16, 5, 4), "#fff3c4", 100, { dur: 4, live: (t) => ({ s: 0.4 + 0.8 * Math.abs(Math.sin((t + ph) / 10)) }) }));
  return { board: "#1b2540", layers: L, top: [cont, shade, twinkle], cues, ticker: false };
};

// ---------------------------------------------------------------- shots
const scenes: [keyof typeof S, Scene][] = [["montage", montage()], ["hook", hook()], ["s1", s1()], ["s2", s2()], ["s3", s3()], ["s4", s4()], ["s5", s5()], ["s6", s6()], ["s7", s7()], ["risks", risks()], ["globe", globe()]];
const shots: Shot[] = scenes.map(([id, sc]) => ({ id, start: S[id][0], end: S[id][1], draw: (c: Ctx, local: number, env: Env) => drawScene(id, sc, c, local, env) }));

// ---------------------------------------------------------------- sound: news alert dings + paper / pop / thock
const plan: SfxPlan = {
  fps: FPS, frames: N, bpm: BPM, seed: 7, snap: "none", minDb: -40,
  cues: [
    { frame: 10, kind: "impact", variant: "boom", label: "montage sting" },
    ...Array.from({ length: 6 }, (_, i) => ({ frame: (i + 1) * 15 + 4, kind: "whoosh" as const, variant: "fast" as const, dir: (i % 2 ? -1 : 1) as 1 | -1, label: `cut ${i + 2}` })),
    { frame: 126, kind: "paper", variant: "slide", label: "title sheet" }, { frame: 150, kind: "press", variant: "thock", label: "title lands" },
    { frame: 258, kind: "paper", variant: "slide" }, { frame: 340, kind: "pop", variant: "pop" }, { frame: 392, kind: "pop", variant: "pop" }, { frame: 444, kind: "pop", variant: "pop" }, { frame: 496, kind: "pop", variant: "pop" },
    ...(["s1", "s2", "s3", "s4", "s5", "s6", "s7"] as const).flatMap((k, i) => {
      const a = S[k][0];
      return [{ frame: a + 12, kind: "paper" as const, variant: "slide" as const, label: `${k} sheet` }, { frame: a + 28, kind: "pop" as const, variant: "pop" as const, label: `${k} badge` },
        { frame: a + 70 + (i % 3) * 6, kind: "press" as const, variant: "thock" as const, label: `${k} hero` }, { frame: a + 156, kind: "paper" as const, variant: "slide" as const, label: `${k} fact` },
        { frame: a + 256, kind: "paper" as const, variant: "slide" as const, label: `${k} fact 2` }, { frame: a + 164, kind: "pop" as const, variant: "pop" as const, label: `${k} burst` }];
    }),
    { frame: S.risks[0] + 12, kind: "paper", variant: "slide" }, ...[0, 1, 2, 3].map((i) => ({ frame: S.risks[0] + 90 + i * 22, kind: "press" as const, variant: "thock" as const, label: `tile ${i + 1}` })),
    { frame: S.globe[0] + 12, kind: "paper", variant: "slide" }, { frame: S.globe[0] + 40, kind: "whoosh", variant: "deep", dir: 1 }, { frame: S.globe[0] + 206, kind: "paper", variant: "slide" },
  ],
};
// the "ding-ding" of a news alert: two short bell tones, laid by hand over the effects at the open and at every story
const alertFrames = [2, 240, S.s1[0], S.s2[0], S.s3[0], S.s4[0], S.s5[0], S.s6[0], S.s7[0], S.risks[0]];
const sfx = filmSfx(null, plan);
const audio = (sr: number): [Float32Array, Float32Array] => {
  const [L, R] = sfx(sr);
  for (const fr of alertFrames) {
    const t0 = Math.round((fr / FPS) * sr);
    [[1046.5, 0], [1568, 0.13]].forEach(([hz, dt], k) => {
      const s0 = t0 + Math.round(dt * sr), n = Math.round(0.34 * sr);
      for (let i = 0; i < n && s0 + i < L.length; i++) {
        const t = i / sr, env = Math.min(1, t / 0.004) * Math.exp(-t * 11), v = 0.17 * env * (Math.sin(2 * Math.PI * hz * t) + 0.35 * Math.sin(2 * Math.PI * hz * 2.01 * t) + 0.12 * Math.sin(2 * Math.PI * hz * 3.9 * t)) * (k ? 0.9 : 1);
        L[s0 + i] += v * 0.95; R[s0 + i] += v * 1.05;
      }
    });
  }
  return [L, R];
};

const cap = (id: keyof typeof S, text: string) => ({ from: S[id][0] + 28, to: S[id][1] - 20, text });
export const news7: Film = {
  meta: {
    title: "7 เรื่องสะเทือนโลก ใน 1 สัปดาห์ (lainsen · cut paper)", W, H, fps: FPS, bpm: BPM, durationFrames: N, kind: "story", onTwos: true, poster: 330,
    captions: [cap("s1", "Binance โดนโจมตีไซเบอร์ — ผลกระทบเบื้องต้นหลายพันล้านดอลลาร์"), cap("s2", "แฮกเกอร์ใช้ AI Agents โจมตีสถาบันการเงินกว่า 400 แห่งในลาตินอเมริกา"), cap("s3", "สหรัฐ–อิหร่าน: ยังไม่มีการยืนยันการโจมตี"), cap("s4", "ชวนสำรองอาหาร น้ำ และของจำเป็นไว้ที่บ้าน"), cap("s5", "อ้างเปลี่ยนปรอทเป็นทองคำ — ยังต้องรอตรวจสอบ"), cap("s6", "STAR50 ลงราว 40% ในไม่ถึง 4 เดือน"), cap("s7", "Alphabet หุ้นร่วงราว 12.6% ในวันเดียว")],
    holds: [[S.globe[1] - 60, S.globe[1], "end card: the question is read"]],
  },
  assets: { images: {}, fonts: THAI_FONTS },
  shots, audio,
};
void H;
