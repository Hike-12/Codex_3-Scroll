export function mountShowcase(
  root: HTMLElement,
  frames: string[],
  config: { damping: number; fit: "cover" | "contain"; telemetry: boolean },
) {
  const canvas = root.querySelector("canvas")!;
  const stage = root.querySelector<HTMLElement>(".sticky-stage")!;
  const progressLabel = root.querySelector<HTMLElement>(".landing-progress")!;
  const telemetry = root.querySelector<HTMLElement>(".live-telemetry")!;
  const beats = Array.from(root.querySelectorAll<HTMLElement>(".story"));
  const context = canvas.getContext("2d")!;
  const images: Array<HTMLImageElement | undefined> = [];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let request = 0,
    current = 0,
    drawn = -1,
    previous = performance.now(),
    sample = previous,
    samples = 0,
    fps = 0;
  let stopped = false,
    preload = 0,
    loadedBytes = 0;
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const load = (index: number) => {
    if (index < 0 || index >= frames.length || images[index]) return;
    const image = new Image();
    image.onload = () => {
      loadedBytes += image.naturalWidth * image.naturalHeight * 4;
    };
    image.src = frames[index];
    images[index] = image;
  };
  load(0);
  function tick(now: number) {
    if (stopped) return;
    const offset = -root.getBoundingClientRect().top;
    const progress = clamp(
      offset / Math.max(1, root.offsetHeight - stage.offsetHeight),
    );
    const target = progress * Math.max(0, frames.length - 1);
    current = reduced
      ? target
      : current +
        (target - current) *
          (1 -
            Math.pow(
              1 - config.damping,
              Math.min(4, (now - previous) / 16.667),
            ));
    previous = now;
    const index = Math.round(current);
    for (let nearby = index - 2; nearby <= index + 2; nearby++) load(nearby);
    for (let i = 0; i < 2 && preload < frames.length; i++) load(preload++);
    const image = images[index];
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(canvas.clientWidth * ratio),
      height = Math.round(canvas.clientHeight * ratio);
    if (
      image?.naturalWidth &&
      (drawn !== index || canvas.width !== width || canvas.height !== height)
    ) {
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const scale = (config.fit === "cover" ? Math.max : Math.min)(
        width / image.naturalWidth,
        height / image.naturalHeight,
      );
      const w = image.naturalWidth * scale,
        h = image.naturalHeight * scale;
      context.fillStyle = "#09090d";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
      drawn = index;
    }
    for (const beat of beats) {
      const start = Number(beat.dataset.start),
        end = Number(beat.dataset.end);
      const fade = Math.max(1, (end - start) * 0.23);
      const enter = start === 0 ? 1 : clamp((index - start) / fade);
      const leave = end === frames.length - 1 ? 1 : clamp((end - index) / fade);
      const opacity = index < start || index > end ? 0 : Math.min(enter, leave);
      beat.style.opacity = String(opacity);
      const copy = beat.querySelector<HTMLElement>(".story-copy")!;
      const distance = (1 - enter) * 24 - (1 - leave) * 18;
      copy.style.transform =
        (beat.dataset.animation === "Slide Horizontal"
          ? "translateX"
          : "translateY") +
        "(" +
        distance +
        "px)";
      copy.style.filter =
        beat.dataset.animation === "Blur Reveal"
          ? "blur(" + (1 - opacity) * 10 + "px)"
          : "none";
      beat
        .querySelector("path")
        ?.setAttribute("stroke-dashoffset", String(1 - opacity));
    }
    const percent = Math.round(progress * 100);
    progressLabel.textContent = String(percent).padStart(2, "0") + "%";
    samples++;
    if (now - sample > 500) {
      fps = Math.round((samples * 1000) / (now - sample));
      sample = now;
      samples = 0;
    }
    if (config.telemetry)
      telemetry.textContent =
        fps +
        " FPS / " +
        (index + 1) +
        " of " +
        frames.length +
        " / " +
        percent +
        "% / " +
        Math.round(loadedBytes / 1048576) +
        " MB";
    request = requestAnimationFrame(tick);
  }
  request = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    cancelAnimationFrame(request);
  };
}
