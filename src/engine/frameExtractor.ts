export interface Frame {
  bitmap: ImageBitmap;
  url: string;
}
export interface ExtractionOptions {
  count: number;
  width: number;
  quality: number;
}
export const dispose = (frames: Frame[]) =>
  frames.forEach((frame) => frame.bitmap.close());
export function ramMB(frames: Frame[]) {
  return (
    frames.reduce(
      (bytes, { bitmap }) => bytes + bitmap.width * bitmap.height * 4,
      0,
    ) / 1048576
  );
}
export async function capture(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Frame> {
  const url = canvas.toDataURL("image/webp", quality);
  return { url, bitmap: await createImageBitmap(canvas) };
}
function waitFor(
  video: HTMLVideoElement,
  event: string,
  signal: AbortSignal,
  begin: () => void,
) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const clean = () => {
      clearTimeout(timer);
      video.removeEventListener(event, ready);
      video.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
    };
    const ready = () => {
      clean();
      resolve();
    };
    const failed = () => {
      clean();
      reject(
        new Error(
          "The browser could not decode this video. Try an H.264 MP4 or a VP8/VP9 WebM.",
        ),
      );
    };
    const aborted = () => {
      clean();
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      clean();
      reject(
        new Error(
          event === "loadeddata"
            ? "Timed out loading the first video frame."
            : "Timed out seeking to a video frame.",
        ),
      );
    }, 12000);
    video.addEventListener(event, ready, { once: true });
    video.addEventListener("error", failed, { once: true });
    signal.addEventListener("abort", aborted, { once: true });
    try {
      begin();
    } catch (error) {
      clean();
      reject(error);
    }
  });
}
export async function extractFrames(
  file: File | string,
  options: ExtractionOptions,
  onFrame: (count: number, ram: number, frame: Frame) => void,
  signal: AbortSignal,
) {
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  const source = typeof file === "string" ? file : URL.createObjectURL(file);
  const frames: Frame[] = [];
  try {
    await waitFor(video, "loadeddata", signal, () => {
      video.src = source;
    });
    if (video.duration === Infinity) {
      // Some local WebM recordings omit duration metadata. A seek to the
      // end lets the browser read the final timestamp before sampling.
      await waitFor(video, "seeked", signal, () => {
        video.currentTime = 1e10;
      });
    }
    if (
      !Number.isFinite(video.duration) ||
      video.duration <= 0 ||
      !video.videoWidth
    )
      throw new Error("This video has no readable duration or dimensions.");
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      options.width / Math.max(video.videoWidth, video.videoHeight),
    );
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d")!;
    for (let index = 0; index < options.count; index++) {
      signal.throwIfAborted();
      const time =
        (index / (options.count - 1)) *
        Math.max(
          0,
          video.duration - Math.min(0.01, video.duration / options.count),
        );
      if (Math.abs(video.currentTime - time) > 0.00001) {
        await waitFor(video, "seeked", signal, () => {
          video.currentTime = time;
        });
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = await capture(canvas, options.quality);
      frames.push(frame);
      onFrame(
        frames.length,
        (frames.length * canvas.width * canvas.height * 4) / 1048576,
        frame,
      );
    }
    signal.throwIfAborted();
    return frames;
  } catch (error) {
    dispose(frames);
    throw error;
  } finally {
    video.removeAttribute("src");
    video.load();
    if (typeof file !== "string") URL.revokeObjectURL(source);
  }
}
