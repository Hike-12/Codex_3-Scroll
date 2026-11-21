import { capture, dispose, type Frame } from "./frameExtractor";
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
    eyebrow: i === 0 ? copy[2] : beat.eyebrow,
    headline: i === 0 ? copy[0] : i === 3 ? copy[1] : beat.headline,
    subtitle: i === 0 ? copy[3] : i === 3 ? copy[1] : beat.subtitle,
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
  const background = ctx.createRadialGradient(650, 235, 25, 640, 260, 580);
  background.addColorStop(0, "#30313a");
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
  const spread = Math.pow(Math.sin(t * Math.PI), 3);
  const yaw = -0.48 + Math.sin(t * tau) * 0.45 - spread * 0.33 + variant * 0.17;
  const tilt = -0.28 + Math.sin(t * tau + 0.3 + variant) * 0.19;
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
  ctx.fillStyle = "#b1bad698";
  ctx.font = "10px monospace";
  ctx.fillText("SF–01   /   CORE ASSEMBLY", 728, 474);
  ctx.fillText("OPTICAL AXIS   +Z", 728, 493);
}
export async function generateDemo(
  signal: AbortSignal,
  onFrame: (frame: Frame, index: number) => void,
  variant = 0,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const frames: Frame[] = [];
  try {
    for (let i = 0; i < 120; i++) {
      signal.throwIfAborted();
      drawDemo(ctx, i / 119, variant);
      frames.push(await capture(canvas, 0.84));
      onFrame(frames[i], i);
      if (i % 3 === 0)
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    signal.throwIfAborted();
    return frames;
  } catch (error) {
    dispose(frames);
    throw error;
  }
}
