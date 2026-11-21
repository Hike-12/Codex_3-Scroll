import type { Beat, Motion } from "../engine/scrollMath";
import { mountShowcase } from "./playback";
import playbackSource from "./playback.ts?raw";
import showcaseCSS from "../showcase.css?inline";

function escape(text: string) {
  return text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
function json(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
function markup(beats: Beat[], motion: Motion) {
  const stories = beats
    .map((beat) => {
      const { pin } = beat;
      const callout = pin
        ? '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" stroke-dasharray="1" d="M ' +
          Math.max(0, pin.x - 18) +
          " " +
          Math.min(100, pin.y + 19) +
          " L " +
          pin.x +
          " " +
          pin.y +
          '"/></svg><i class="pin" style="left:' +
          pin.x +
          "%;top:" +
          pin.y +
          '%"></i>'
        : "";
      return (
        '<div class="story ' +
        escape(beat.position.toLowerCase().replaceAll(" ", "-")) +
        '" style="opacity:0" data-start="' +
        beat.start +
        '" data-end="' +
        beat.end +
        '" data-animation="' +
        escape(beat.animation) +
        '">' +
        callout +
        '<div class="story-copy"><span>' +
        escape(beat.eyebrow) +
        "</span><h1>" +
        escape(beat.headline) +
        "</h1><p>" +
        escape(beat.subtitle) +
        "</p></div></div>"
      );
    })
    .join("");
  return (
    '<div class="sticky-stage"><canvas aria-label="Scroll sequence frame"></canvas><div class="canvas-shade"></div><div class="stories">' +
    stories +
    '</div><header class="landing-nav"><strong>SCROLL FORGE</strong><span class="landing-progress">00%</span></header><footer class="landing-footer">Scroll to explore <span>↓</span></footer><div class="live-telemetry"' +
    (motion.telemetry ? "" : " hidden") +
    "></div></div>"
  );
}
export function standaloneHTML(
  frames: string[],
  beats: Beat[],
  motion: Motion,
) {
  return (
    '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' +
    escape(beats[0]?.headline || "Scroll Showcase") +
    "</title><style>body{margin:0;background:#09090d}" +
    showcaseCSS +
    '</style></head><body><main id="showcase" class="scroll-page">' +
    markup(beats, motion) +
    "</main><script>const frames=" +
    json(frames) +
    ";\n(" +
    mountShowcase.toString() +
    ')(document.getElementById("showcase"),frames,' +
    json(motion) +
    ");</script></body></html>"
  );
}
export function reactComponent(
  frames: string[],
  beats: Beat[],
  motion: Motion,
) {
  return (
    '"use client";\n\nimport { useEffect, useRef } from "react";\n\n' +
    playbackSource +
    "\nconst frames: string[] = " +
    json(frames) +
    ";\nconst css = " +
    json(showcaseCSS) +
    ";\nconst markup = " +
    json(markup(beats, motion)) +
    ";\n\nexport default function ScrollShowcase() {\n  const root = useRef<HTMLElement>(null);\n  useEffect(() => {\n    if (root.current) return mountShowcase(root.current, frames, " +
    json(motion) +
    ');\n  }, []);\n  return <>\n    <style>{css}</style>\n    <section ref={root} className="scroll-page" dangerouslySetInnerHTML={{ __html: markup }} />\n  </>;\n}\n'
  );
}
export function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
