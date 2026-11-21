export const positions = [
  "Center Hero",
  "Left",
  "Right",
  "Bottom-Left",
  "Bottom-Right",
] as const;
export const animations = [
  "Fade + Rise",
  "Blur Reveal",
  "Slide Horizontal",
] as const;
export interface Beat {
  id: string;
  start: number;
  end: number;
  eyebrow: string;
  headline: string;
  subtitle: string;
  position: (typeof positions)[number];
  animation: (typeof animations)[number];
  pin?: { x: number; y: number };
}
export interface Motion {
  damping: number;
  fit: "cover" | "contain";
  telemetry: boolean;
}
export function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
export function scrollProgress(offset: number, travel: number) {
  return travel > 0 ? clamp(offset / travel) : 0;
}
export function frameIndex(progress: number, count: number) {
  return Math.round(clamp(progress) * Math.max(0, count - 1));
}
export function spring(
  current: number,
  target: number,
  damping: number,
  ticks = 1,
) {
  return (
    current + (target - current) * (1 - Math.pow(1 - clamp(damping), ticks))
  );
}
export function envelope(frame: number, beat: Beat, count: number) {
  const fade = Math.max(1, (beat.end - beat.start) * 0.23);
  const enter = beat.start === 0 ? 1 : clamp((frame - beat.start) / fade);
  const leave = beat.end === count - 1 ? 1 : clamp((beat.end - frame) / fade);
  const opacity =
    frame < beat.start || frame > beat.end ? 0 : Math.min(enter, leave);
  const offset = (1 - enter) * 24 - (1 - leave) * 18;
  return {
    opacity,
    transform:
      beat.animation === "Slide Horizontal"
        ? "translateX(" + offset + "px)"
        : "translateY(" + offset + "px)",
    filter:
      beat.animation === "Blur Reveal"
        ? "blur(" + (1 - opacity) * 10 + "px)"
        : "none",
  };
}
