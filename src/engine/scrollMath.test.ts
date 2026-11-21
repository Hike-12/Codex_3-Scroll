import { describe, expect, it } from "vitest";
import {
  envelope,
  frameIndex,
  scrollProgress,
  spring,
  type Beat,
} from "./scrollMath";
import { reactComponent, standaloneHTML } from "../export/siteExporter";

const beat: Beat = {
  id: "one",
  start: 10,
  end: 50,
  eyebrow: "Optics",
  headline: "Precision Core",
  subtitle: "A layered assembly",
  position: "Left",
  animation: "Fade + Rise",
  pin: { x: 55, y: 40 },
};
const motion = { damping: 0.14, fit: "cover", telemetry: true } as const;
const frames = ["data:image/webp;base64,UklGRg=="];

describe("scroll mapping", () => {
  it("clamps scroll offsets and handles a zero travel area", () => {
    expect(scrollProgress(-15, 400)).toBe(0);
    expect(scrollProgress(100, 400)).toBe(0.25);
    expect(scrollProgress(600, 400)).toBe(1);
    expect(scrollProgress(5, 0)).toBe(0);
  });
  it("maps progress to inclusive zero-based frame indexes", () => {
    expect([-1, 0, 0.5, 1, 2].map((p) => frameIndex(p, 120))).toEqual([
      0, 0, 60, 119, 119,
    ]);
    expect(frameIndex(1, 0)).toBe(0);
  });
  it("converges in either direction and compensates for refresh rates", () => {
    expect(spring(0, 100, 0.14)).toBeCloseTo(14);
    expect(spring(100, 0, 0.14)).toBeCloseTo(86);
    expect(spring(spring(0, 100, 0.14, 0.5), 100, 0.14, 0.5)).toBeCloseTo(14);
    let result = 0;
    for (let i = 0; i < 90; i++) result = spring(result, 119, 0.14);
    expect(result).toBeCloseTo(119, 3);
  });
});
describe("beat envelope", () => {
  it("fades in, holds, fades out and disappears outside the range", () => {
    expect(envelope(9, beat, 120).opacity).toBe(0);
    const entry = envelope(14, beat, 120);
    expect(entry.opacity).toBeCloseTo(4 / 9.2);
    expect(parseFloat(entry.transform.slice(11))).toBeGreaterThan(0);
    expect(envelope(30, beat, 120)).toMatchObject({
      opacity: 1,
      transform: "translateY(0px)",
    });
    const exit = envelope(46, beat, 120);
    expect(exit.opacity).toBeCloseTo(entry.opacity);
    expect(parseFloat(exit.transform.slice(11))).toBeLessThan(0);
    expect(envelope(51, beat, 120).opacity).toBe(0);
  });
  it("keeps the first and last story visible at scroll endpoints", () => {
    expect(envelope(0, { ...beat, start: 0 }, 120).opacity).toBe(1);
    expect(envelope(119, { ...beat, end: 119 }, 120).opacity).toBe(1);
  });
  it("supports alternate animation styles", () => {
    expect(
      envelope(14, { ...beat, animation: "Slide Horizontal" }, 120).transform,
    ).toMatch(/^translateX/);
    expect(
      envelope(14, { ...beat, animation: "Blur Reveal" }, 120).filter,
    ).toMatch(/^blur/);
  });
});
describe("showcase exports", () => {
  it("embeds the playback engine, frames, responsive sticky stage, and callouts in complete HTML5", () => {
    const html = standaloneHTML(frames, [beat], motion);
    expect(html).toMatch(/^<!doctype html>\n<html lang="en"><head>/);
    expect(html).toContain("<canvas");
    expect(html).toMatch(/height:\s*500vh/);
    expect(html).toContain("requestAnimationFrame");
    expect(html).toContain("<h1>Precision Core</h1>");
    expect(html).toContain(frames[0]);
    expect(html).toContain("<svg");
    expect(html).toMatch(/<\/body><\/html>$/);
    const script = html.split("<script>")[1].split("</script>")[0];
    expect(() => new Function(script)).not.toThrow();
  });
  it("escapes authored HTML and emits a client React component with embedded data", () => {
    const html = standaloneHTML(
      frames,
      [{ ...beat, headline: "<script>alert(1)</script>" }],
      motion,
    );
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert");
    const react = reactComponent(frames, [beat], motion);
    expect(react).toContain('"use client"');
    expect(react).toContain("export default function ScrollShowcase");
    expect(react).toContain("requestAnimationFrame");
    expect(react).toContain(frames[0]);
  });
});
