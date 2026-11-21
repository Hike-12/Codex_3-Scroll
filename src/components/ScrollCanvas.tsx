import { useEffect, useRef, useState } from "react";
import { ramMB, type Frame } from "../engine/frameExtractor";
import {
  clamp,
  envelope,
  frameIndex,
  scrollProgress,
  spring,
  type Beat,
  type Motion,
} from "../engine/scrollMath";

export function drawFrame(
  canvas: HTMLCanvasElement,
  image: ImageBitmap,
  fit: Motion["fit"],
) {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * ratio),
    height = Math.round(canvas.clientHeight * ratio);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const scale =
    fit === "cover"
      ? Math.max(width / image.width, height / image.height)
      : Math.min(width / image.width, height / image.height);
  const w = image.width * scale,
    h = image.height * scale;
  ctx.fillStyle = "#09090d";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}
export function StoryOverlay({
  beats,
  frame,
  count,
}: {
  beats: Beat[];
  frame: number;
  count: number;
}) {
  return (
    <div className="stories">
      {beats.map((beat) => {
        const style = envelope(frame, beat, count);
        if (!style.opacity) return null;
        return (
          <div
            key={beat.id}
            className={
              "story " + beat.position.toLowerCase().replaceAll(" ", "-")
            }
            style={{ opacity: style.opacity }}
          >
            {beat.pin && (
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - style.opacity}
                  d={
                    "M " +
                    Math.max(0, beat.pin.x - 18) +
                    " " +
                    Math.min(100, beat.pin.y + 19) +
                    " L " +
                    beat.pin.x +
                    " " +
                    beat.pin.y
                  }
                />
              </svg>
            )}
            {beat.pin && (
              <i
                className="pin"
                style={{ left: beat.pin.x + "%", top: beat.pin.y + "%" }}
              />
            )}
            <div
              className="story-copy"
              style={{ transform: style.transform, filter: style.filter }}
            >
              <span>{beat.eyebrow}</span>
              <h1>{beat.headline}</h1>
              <p>{beat.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default function ScrollCanvas({
  frames,
  beats,
  motion,
  frame = 0,
  live = false,
  onExit,
}: {
  frames: Frame[];
  beats: Beat[];
  motion: Motion;
  frame?: number;
  live?: boolean;
  onExit?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const section = useRef<HTMLElement>(null);
  const [readout, setReadout] = useState({ frame: 0, progress: 0, fps: 0 });
  const current = useRef(0);
  useEffect(() => {
    if (!frames.length) return;
    const node = canvas.current!,
      root = section.current!;
    let raf = 0,
      prev = performance.now(),
      sample = prev,
      samples = 0,
      fps = 0;
    let drawn = -1,
      width = -1,
      height = -1,
      lastFrame = -1,
      lastProgress = -1,
      lastFps = -1;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      const progress = live
        ? scrollProgress(
            -root.getBoundingClientRect().top,
            root.offsetHeight - node.clientHeight,
          )
        : clamp(frame / Math.max(1, frames.length - 1));
      const target = progress * (frames.length - 1);
      current.current =
        live && !reduced
          ? spring(
              current.current,
              target,
              motion.damping,
              Math.min(4, (now - prev) / 16.667),
            )
          : frameIndex(progress, frames.length);
      if (Math.abs(current.current - target) < 0.045) current.current = target;
      prev = now;
      const index = Math.round(current.current);
      if (
        index !== drawn ||
        width !== node.clientWidth ||
        height !== node.clientHeight
      ) {
        drawFrame(node, frames[index].bitmap, motion.fit);
        drawn = index;
        width = node.clientWidth;
        height = node.clientHeight;
      }
      samples++;
      if (now - sample > 500) {
        fps = Math.round((samples * 1000) / (now - sample));
        sample = now;
        samples = 0;
      }
      const percent = Math.round(progress * 100);
      if (
        live &&
        (index !== lastFrame || percent !== lastProgress || fps !== lastFps)
      ) {
        setReadout({ frame: index, progress: percent, fps });
        lastFrame = index;
        lastProgress = percent;
        lastFps = fps;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frames, frame, live, motion.damping, motion.fit]);
  const active = live ? readout.frame : frame;
  return (
    <section ref={section} className={live ? "scroll-page" : "editor-canvas"}>
      <div className={live ? "sticky-stage" : "canvas-stage"}>
        <canvas ref={canvas} aria-label="Scroll sequence frame" />
        <div className="canvas-shade" />
        <StoryOverlay beats={beats} frame={active} count={frames.length} />
        {live && (
          <>
            <header className="landing-nav">
              <strong>SCROLL FORGE</strong>
              <span>{String(readout.progress).padStart(2, "0")}%</span>
            </header>
            <footer className="landing-footer">
              Scroll to explore <span>↓</span>
            </footer>
            <button className="exit-preview" onClick={onExit}>
              Exit preview <kbd>Esc</kbd>
            </button>
          </>
        )}
        {live && motion.telemetry && (
          <div className="live-telemetry">
            {readout.fps} FPS / {active + 1} of {frames.length} /{" "}
            {readout.progress}% / {ramMB(frames).toFixed(0)} MB
          </div>
        )}
      </div>
    </section>
  );
}
