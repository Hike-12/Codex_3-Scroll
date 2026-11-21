import type { Beat } from "./scrollMath";

export const demoBeats: Beat[] = [
  {
    id: "origin",
    start: 0,
    end: 29,
    eyebrow: "01 / THE PRECISION CORE",
    headline: "Form follows motion.",
    subtitle: "A study in light, material, and mechanical precision.",
    position: "Left",
    animation: "Fade + Rise",
  },
  {
    id: "aperture",
    start: 30,
    end: 59,
    eyebrow: "02 / APERTURE SYSTEM",
    headline: "Precision in every layer.",
    subtitle: "Concentric titanium rings control the path of light.",
    position: "Bottom-Left",
    animation: "Blur Reveal",
    pin: { x: 68, y: 42 },
  },
  {
    id: "assembly",
    start: 60,
    end: 89,
    eyebrow: "03 / INTERNAL ASSEMBLY",
    headline: "Nothing left to chance.",
    subtitle: "An exploded view reveals the architecture beneath the surface.",
    position: "Left",
    animation: "Slide Horizontal",
    pin: { x: 70, y: 56 },
  },
  {
    id: "finish",
    start: 90,
    end: 119,
    eyebrow: "04 / ANODIZED TITANIUM",
    headline: "Built to be seen.",
    subtitle: "Every surface catches the light a little differently.",
    position: "Bottom-Left",
    animation: "Fade + Rise",
  },
];
export const cloneDemoBeats = () => structuredClone(demoBeats);

const demoCopy = [
  [
    "A precision instrument.",
    "Quiet geometry, balanced in motion.",
    "01 / OBJECT STUDY",
    "Materials reveal their character.",
  ],
  [
    "Time finds its orbit.",
    "A mechanical study of light and shadow.",
    "01 / ORBITAL CHRONOGRAPH",
    "Every second, considered.",
  ],
  [
    "Sound takes shape.",
    "An acoustic object tuned for the room.",
    "01 / SONIC FORM",
    "Nothing between you and the music.",
  ],
  [
    "Keep the light moving.",
    "A compact optical system made for discovery.",
    "01 / PRISM CAMERA",
    "Every detail held in focus.",
  ],
  [
    "Built around the flow.",
    "A turbine engineered for the next horizon.",
    "01 / AEROSPACE ENGINEERING",
    "Performance in every rotation.",
  ],
];
const details = [
  [],
  ["THE DIAL", "Count every second.", "A rotating hand tracks the outer minute scale.", "THE CASE", "A polished edge.", "The case catches the light as the dial turns."],
  ["THE DRIVER", "Air in motion.", "The cone flexes around the center cap.", "THE SURROUND", "Made to move.", "The ridged surround supports the diaphragm as it pulses."],
  ["THE LENS", "Bring it into focus.", "The lens advances through its focus travel.", "THE BODY", "Built around the glass.", "A compact housing keeps the controls within reach."],
  ["THE FAN", "Eleven blades, one rotor.", "The fan draws air through the inlet.", "THE HUB", "Rotation starts here.", "The hub joins the blades to a single rotating assembly."],
];
export const demoSequences = demoCopy.map((copy, index) => ({
  id: ["precision", "orbit", "sonic", "prism", "aero"][index],
  name: [
    "Precision Core",
    "Orbit Chronograph",
    "Sonic Form",
    "Prism Camera",
    "Aero Engine",
  ][index],
  code: ["SF–01", "OR–02", "AU–03", "PX–04", "AE–05"][index],
  beats: demoBeats.map((beat, i) => ({
    ...beat,
    eyebrow: i === 0 ? copy[2] : i === 3 ? "04 / FINAL VIEW" : details[index][(i - 1) * 3] ?? beat.eyebrow,
    headline: i === 0 ? copy[0] : i === 3 ? copy[3] : details[index][(i - 1) * 3 + 1] ?? beat.headline,
    subtitle: i === 0 || i === 3 ? copy[1] : details[index][(i - 1) * 3 + 2] ?? beat.subtitle,
  })),
}));
export const beatsForDemo = (id: string) =>
  structuredClone(
    demoSequences.find((item) => item.id === id)?.beats ?? demoBeats,
  );

const width = 960,
  height = 540;
type Point = [number, number];
const tau = Math.PI * 2;
const layers = [
  { radius: 115, hole: 37, depth: 19, z: -53 },
  { radius: 119, hole: 69, depth: 13, z: -27 },
  { radius: 125, hole: 79, depth: 25, z: 0 },
  { radius: 120, hole: 93, depth: 13, z: 27 },
  { radius: 111, hole: 78, depth: 19, z: 45 },
  { radius: 83, hole: 58, depth: 12, z: 61 },
];

export function drawDemo(
  ctx: CanvasRenderingContext2D,
  t: number,
  variant = 0,
) {
  const backgrounds = ["#30313a", "#32302b", "#34252b", "#21343a", "#293346"];
  const background = ctx.createRadialGradient(650, 235, 25, 640, 260, 580);
  background.addColorStop(0, backgrounds[variant] ?? backgrounds[0]);
  background.addColorStop(0.55, "#12131a");
  background.addColorStop(1, "#08090d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#c1c8e811";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < width; x += 32) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 0; y < height; y += 32) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();
  const sweep = ctx.createLinearGradient(190 + t * 230, 540, 650 + t * 230, 0);
  sweep.addColorStop(0.37, "#a9b6df00");
  sweep.addColorStop(0.52, "#a9b6df14");
  sweep.addColorStop(0.63, "#a9b6df00");
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, width, height);
  if (variant === 0) drawCore(ctx, t);
  else drawHardware(ctx, t, variant);
  const demo = demoSequences[variant] ?? demoSequences[0];
  ctx.fillStyle = "#b1bad698";
  ctx.font = "10px monospace";
  ctx.fillText(demo.code + "   /   " + demo.name.toUpperCase(), 728, 474);
}

function drawCore(ctx: CanvasRenderingContext2D, t: number) {
  const spread = Math.pow(Math.sin(t * Math.PI), 3);
  const yaw = -0.48 + Math.sin(t * tau) * 0.45 - spread * 0.33;
  const tilt = -0.28 + Math.sin(t * tau + 0.3) * 0.19;
  const cosY = Math.cos(yaw),
    sinY = Math.sin(yaw),
    cosX = Math.cos(tilt),
    sinX = Math.sin(tilt);
  const project = (r: number, a: number, z: number): Point => {
    const x = r * Math.cos(a),
      y = r * Math.sin(a);
    const yy = y * cosX - z * sinX,
      zz = y * sinX + z * cosX;
    const scale = 680 / (670 - (zz * cosY - x * sinY));
    return [627 + (x * cosY + zz * sinY) * scale, 263 + yy * scale];
  };
  const polygon = (points: Point[], paint: string | CanvasGradient) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = paint;
    ctx.fill();
  };
  const outline = (r: number, z: number, color: string) => {
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const [x, y] = project(r, (i / 96) * tau, z);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.stroke();
  };
  outline(166, 0, "#adb9d33b");
  outline(185, 0, "#adb9d321");
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * tau;
    ctx.beginPath();
    ctx.moveTo(...project(178, a, 0));
    ctx.lineTo(...project(i % 8 === 0 ? 192 : 183, a, 0));
    ctx.strokeStyle = i % 8 === 0 ? "#bbc7e47e" : "#bbc7e438";
    ctx.stroke();
  }
  layers.forEach((layer, index) => {
    const z = layer.z * (1 + spread * 1.75);
    const front = z + layer.depth / 2,
      rear = z - layer.depth / 2;
    const rotation = t * tau * (1 + index * 0.16);
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < 96; i++) {
        const a = (i / 96) * tau,
          b = ((i + 1.015) / 96) * tau;
        if (pass === 0 && Math.cos(a) * sinY - Math.sin(a) * sinX < 0) continue;
        const light = 0.5 + 0.5 * Math.cos(a + 0.8 + t * 2);
        const grain = Math.sin(i * 13.23) * 5;
        const shade = Math.round(
          pass === 0
            ? 23 + light * 80 + grain
            : 43 + Math.pow(light, 3) * 151 + grain,
        );
        const [r, inner] = [layer.radius, layer.hole];
        const points =
          pass === 0
            ? [
                project(r, a, rear),
                project(r, b, rear),
                project(r, b, front),
                project(r, a, front),
              ]
            : [
                project(r, a, front),
                project(r, b, front),
                project(inner, b, front),
                project(inner, a, front),
              ];
        polygon(
          points,
          "rgb(" + shade + "," + (shade + 4) + "," + (shade + 11) + ")",
        );
      }
    outline(layer.radius, front, "#e2e8ff80");
    outline(layer.radius - 4, front, "#05061288");
    outline(layer.hole, front, "#c2c9dc91");
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * tau + rotation;
      polygon(
        [
          project(layer.radius - 7, a, front + 0.3),
          project(layer.radius - 7, a + 0.019, front + 0.3),
          project(layer.hole + 4, a + 0.019, front + 0.3),
          project(layer.hole + 4, a, front + 0.3),
        ],
        i % 9 === 0 ? "#dddfea9e" : "#16182146",
      );
    }
  });
  const [x, y] = project(0, 0, 72);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 65);
  glow.addColorStop(0, "#d0ddffc0");
  glow.addColorStop(0.12, "#738cca80");
  glow.addColorStop(0.5, "#718cfb16");
  glow.addColorStop(1, "#718cfb00");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 65, y - 65, 130, 130);
  outline(51, 73, "#a1b9ff61");
  outline(39, 73, "#b8c9ff33");
}

function drawHardware(ctx: CanvasRenderingContext2D, t: number, variant: number) {
  ctx.save();
  ctx.translate(627, 263);
  ctx.rotate((variant === 1 ? -0.22 : 0.06) * Math.cos(t * Math.PI));
  const push = 0.92 + Math.sin(t * Math.PI) * 0.13;
  ctx.scale(push, push);
  ctx.translate(-627, -263);
  if (variant === 1) {
    const cx = 627, cy = 263, radius = 104;
    const caseMetal = ctx.createRadialGradient(cx - 35, cy - 44, 8, cx, cy, 150);
    caseMetal.addColorStop(0, "#8b909b");
    caseMetal.addColorStop(0.38, "#292c34");
    caseMetal.addColorStop(0.72, "#111319");
    caseMetal.addColorStop(1, "#777d89");
    for (let y = cy - 194; y < cy + 190; y += 19) {
      ctx.beginPath();
      ctx.roundRect(cx - 71, y, 142, 17, 5);
      ctx.fillStyle = caseMetal;
      ctx.fill();
      ctx.strokeStyle = "#999da855";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.beginPath(); ctx.roundRect(cx - 139, cy - 118, 278, 236, 42); ctx.fillStyle = caseMetal; ctx.fill();
    ctx.strokeStyle = "#d5d9e65b"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, tau); ctx.fillStyle = "#10131a"; ctx.fill();
    ctx.strokeStyle = "#d9dce4"; ctx.lineWidth = 4; ctx.stroke();
    for (let i = 0; i < 60; i++) {
      const angle = i / 60 * tau - Math.PI / 2;
      const outer = radius - 8, inner = radius - (i % 5 === 0 ? 21 : 14);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.strokeStyle = i % 5 === 0 ? "#e8eaf1" : "#777e8c"; ctx.lineWidth = i % 5 === 0 ? 2 : 1; ctx.stroke();
    }
    const hand = t * tau;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(hand - Math.PI / 2) * 66, cy + Math.sin(hand - Math.PI / 2) * 66);
    ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(hand * 0.083 - Math.PI / 2) * 48, cy + Math.sin(hand * 0.083 - Math.PI / 2) * 48);
    ctx.strokeStyle = "#e3eee9"; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, tau); ctx.fillStyle = "#9be8cf"; ctx.fill();
  } else if (variant === 2) {
    const cx = 627, cy = 263, radius = 145;
    ctx.beginPath();
    ctx.roundRect(cx - 167, cy - 163, 334, 326, 28);
    ctx.fillStyle = "#27242a";
    ctx.fill();
    ctx.strokeStyle = "#a98e8f";
    ctx.lineWidth = 2;
    ctx.stroke();
    const cone = ctx.createRadialGradient(cx - 40, cy - 50, 6, cx, cy, radius);
    cone.addColorStop(0, "#242730"); cone.addColorStop(0.28, "#8b8d94"); cone.addColorStop(0.34, "#30333c");
    cone.addColorStop(0.75, "#555a64"); cone.addColorStop(1, "#111319");
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, tau); ctx.fillStyle = cone; ctx.fill();
    ctx.strokeStyle = "#dfe2ebc0"; ctx.lineWidth = 4; ctx.stroke();
    for (let ring = 0; ring < 5; ring++) {
      ctx.beginPath(); ctx.arc(cx, cy, 116 - ring * 13 + Math.sin(t * tau + ring) * 2, 0, tau);
      ctx.strokeStyle = ring % 2 ? "#13161d99" : "#e5e8ef74"; ctx.lineWidth = 2; ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * tau;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 129, cy + Math.sin(a) * 129, 3.5, 0, tau);
      ctx.fillStyle = "#d8dbe3"; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx, cy, 32 + Math.sin(t * tau) * 3, 0, tau); ctx.fillStyle = "#11141b"; ctx.fill();
    ctx.strokeStyle = "#c7ccd8"; ctx.lineWidth = 3; ctx.stroke();
  } else if (variant === 3) {
    const x = 437, y = 192, w = 380, h = 148;
    const body = ctx.createLinearGradient(x, y, x + w, y + h);
    body.addColorStop(0, "#7f858e"); body.addColorStop(0.22, "#3c414a"); body.addColorStop(0.7, "#191c23"); body.addColorStop(1, "#696e78");
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 24); ctx.fillStyle = body; ctx.fill();
    ctx.strokeStyle = "#d2d7e187"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#11141a"; ctx.beginPath(); ctx.roundRect(x + 28, y + 19, 44, 15, 4); ctx.fill();
    ctx.fillStyle = "#8fa5c8"; ctx.beginPath(); ctx.arc(x + 309, y + 32, 8, 0, tau); ctx.fill();
    const focus = 8 * Math.sin(t * Math.PI);
    const lens = ctx.createRadialGradient(590 + 45 * t, 235, 5, 627, 263, 93 + focus);
    lens.addColorStop(0, "#a7d4ea"); lens.addColorStop(0.11, "#172b3c"); lens.addColorStop(0.34, "#0b111a"); lens.addColorStop(0.72, "#626c7a"); lens.addColorStop(1, "#151920");
    ctx.beginPath(); ctx.arc(627, 263, 88 + focus, 0, tau); ctx.fillStyle = lens; ctx.fill();
    ctx.strokeStyle = "#dfe5ee"; ctx.lineWidth = 6; ctx.stroke();
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(627, 263, 76 - i * 12, 0, tau); ctx.strokeStyle = i % 2 ? "#747d8b" : "#d5dbe4"; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(627, 263, 16, 0, tau); ctx.fillStyle = "#88aacf"; ctx.fill();
  } else if (variant >= 4) {
    const cx = 627, cy = 263, spin = (t + t * t) * tau * 1.8;
    ctx.beginPath(); ctx.arc(cx, cy, 149, 0, tau); ctx.fillStyle = "#171a21"; ctx.fill();
    ctx.strokeStyle = "#d8dde7"; ctx.lineWidth = 9; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 130, 0, tau); ctx.strokeStyle = "#555c68"; ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 11; i++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(spin + i / 11 * tau);
      ctx.beginPath(); ctx.moveTo(22, -12); ctx.bezierCurveTo(65, -48, 125, -32, 131, -10);
      ctx.bezierCurveTo(98, 6, 57, 19, 22, 12); ctx.closePath();
      const blade = ctx.createLinearGradient(20, 0, 132, 0);
      blade.addColorStop(0, "#242832"); blade.addColorStop(0.72, "#b7bdc8"); blade.addColorStop(1, "#454a55");
      ctx.fillStyle = blade; ctx.fill(); ctx.strokeStyle = "#e6e8ee5c"; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    }
    const hub = ctx.createRadialGradient(cx - 8, cy - 9, 2, cx, cy, 31);
    hub.addColorStop(0, "#e1e5eb"); hub.addColorStop(0.58, "#858c98"); hub.addColorStop(1, "#262a32");
    ctx.beginPath(); ctx.arc(cx, cy, 31, 0, tau); ctx.fillStyle = hub; ctx.fill();
    ctx.strokeStyle = "#e6e9ef"; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.restore();
}
