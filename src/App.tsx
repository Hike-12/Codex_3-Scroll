import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Aperture,
  ArrowDownToLine,
  ArrowUpRight,
  Braces,
  ChevronRight,
  Clapperboard,
  CloudUpload,
  Crosshair,
  Film,
  Layers3,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import ScrollCanvas from "./components/ScrollCanvas";
import TimelineEditor from "./components/TimelineEditor";
import {
  beatsForDemo,
  cloneDemoBeats,
  demoSequences,
  generateDemo,
} from "./engine/demoGenerator";
import {
  dispose,
  extractFrames,
  ramMB,
  type Frame,
} from "./engine/frameExtractor";
import {
  animations,
  positions,
  type Beat,
  type Motion,
} from "./engine/scrollMath";
import {
  download,
  reactComponent,
  standaloneHTML,
} from "./export/siteExporter";

type Job = { mode: "demo" | "video"; done: number; total: number; ram: number };
const defaultMotion: Motion = { damping: 0.14, fit: "cover", telemetry: false };
const number = (n: number) => String(n).padStart(3, "0");

export default function App() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [beats, setBeats] = useState(cloneDemoBeats);
  const [selection, setSelection] = useState("origin");
  const [motion, setMotion] = useState(defaultMotion);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [preview, setPreview] = useState(false);
  const [tab, setTab] = useState<"story" | "motion">("story");
  const [dialog, setDialog] = useState<"source" | "export" | null>(null);
  const [source, setSource] = useState("Precision Core");
  const [demoId, setDemoId] = useState("precision");
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(120);
  const [width, setWidth] = useState(1280);
  const [quality, setQuality] = useState(0.85);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const nativeDialog = useRef<HTMLDialogElement>(null);
  const currentFrames = useRef<Frame[]>([]);
  const task = useRef<AbortController>();
  const demoPartial = useRef(false);
  const selected = beats.find((beat) => beat.id === selection);
  const last = Math.max(0, frames.length - 1);
  const ram = ramMB(frames);
  const ready = frames.length > 0 && !job;

  function replaceFrames(next: Frame[]) {
    const old = currentFrames.current;
    currentFrames.current = next;
    setFrames(next);
    if (old !== next) dispose(old);
  }
  async function loadDemo(id = demoId) {
    task.current?.abort();
    const controller = new AbortController();
    task.current = controller;
    setError("");
    setPlaying(false);
    setFrame(0);
    setJob({ mode: "demo", done: 0, total: 120, ram: 0 });
    try {
      const variant = Math.max(
        0,
        demoSequences.findIndex((item) => item.id === id),
      );
      const result = await generateDemo(
        controller.signal,
        (first, index) => {
          if (index === 0 && !currentFrames.current.length) {
            demoPartial.current = true;
            currentFrames.current = [first];
            setFrames(currentFrames.current);
          }
          if (index % 8 === 0)
            setJob({
              mode: "demo",
              done: index + 1,
              total: 120,
              ram:
                ((index + 1) * first.bitmap.width * first.bitmap.height * 4) /
                1048576,
            });
        },
        variant,
      );
      if (demoPartial.current) {
        currentFrames.current = [];
        demoPartial.current = false;
      }
      replaceFrames(result);
      setDemoId(id);
      setSource(
        demoSequences.find((item) => item.id === id)?.name ?? "Precision Core",
      );
      setBeats(beatsForDemo(id));
      setSelection(beatsForDemo(id)[0]?.id ?? "origin");
      setDialog(null);
    } catch (reason) {
      if (demoPartial.current) {
        currentFrames.current = [];
        setFrames([]);
        demoPartial.current = false;
      }
      if (!controller.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not render the demo.",
        );
    } finally {
      if (task.current === controller) setJob(null);
    }
  }
  useEffect(() => {
    void loadDemo();
    return () => {
      task.current?.abort();
      if (!demoPartial.current) dispose(currentFrames.current);
    };
  }, []);
  useEffect(() => {
    if (!playing || !ready || preview) return;
    const start = performance.now(),
      initial = frame;
    let raf = 0;
    const tick = (now: number) => {
      const next = Math.min(last, initial + Math.floor((now - start) * 0.03));
      setFrame(next);
      if (next === last) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // The transport captures the current frame when playback starts.
  }, [playing, ready, preview, last]);
  useEffect(() => {
    if (dialog && !nativeDialog.current?.open)
      nativeDialog.current?.showModal();
    else if (!dialog && nativeDialog.current?.open)
      nativeDialog.current.close();
  }, [dialog]);
  useEffect(() => {
    if (!preview) return;
    window.scrollTo(0, 0);
    const exit = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreview(false);
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("keydown", exit);
    return () => window.removeEventListener("keydown", exit);
  }, [preview]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timeout);
  }, [notice]);

  function chooseFile(next?: File) {
    if (!next || job) return;
    setDialog("source");
    setError("");
    if (!/\.(mp4|webm|mov)$/i.test(next.name)) {
      setFile(null);
      setError("Choose an MP4, WebM, or MOV video.");
      return;
    }
    setFile(next);
  }
  async function importVideo(event: FormEvent) {
    event.preventDefault();
    if (!file || job) return;
    const controller = new AbortController();
    task.current = controller;
    setPlaying(false);
    setError("");
    setJob({ mode: "video", done: 0, total: count, ram: 0 });
    try {
      const next = await extractFrames(
        file,
        { count, width, quality },
        (done, ram) => setJob({ mode: "video", done, total: count, ram }),
        controller.signal,
      );
      replaceFrames(next);
      setSource(file.name);
      setFrame(0);
      setBeats([]);
      setSelection("");
      setDialog(null);
      setFile(null);
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(
          reason instanceof Error ? reason.message : "Extraction failed.",
        );
    } finally {
      if (task.current === controller) setJob(null);
    }
  }
  function scrub(index: number) {
    setPlaying(false);
    setFrame(index);
  }
  function addBeat() {
    const beat: Beat = {
      id: crypto.randomUUID(),
      start: frame,
      end: Math.min(last, frame + 24),
      eyebrow: "",
      headline: "New story beat",
      subtitle: "",
      position: "Left",
      animation: "Fade + Rise",
    };
    setBeats((previous) => [...previous, beat]);
    setSelection(beat.id);
    setTab("story");
  }
  function updateBeat(change: Partial<Beat>) {
    setBeats((previous) =>
      previous.map((beat) =>
        beat.id === selection ? { ...beat, ...change } : beat,
      ),
    );
  }
  function selectBeat(beat: Beat) {
    if (!ready) return;
    setSelection(beat.id);
    setTab("story");
    scrub(Math.round((beat.start + beat.end) / 2));
  }
  async function copyReact() {
    const body = reactComponent(
      frames.map((item) => item.url),
      beats,
      motion,
    );
    try {
      await navigator.clipboard.writeText(body);
      setNotice("React component copied");
    } catch {
      download("ScrollShowcase.tsx", body, "text/plain");
      setNotice("React component downloaded");
    }
  }
  if (preview)
    return (
      <ScrollCanvas
        frames={frames}
        beats={beats}
        motion={motion}
        live
        onExit={() => {
          setPreview(false);
          window.scrollTo(0, 0);
        }}
      />
    );

  return (
    <main
      className="studio"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        chooseFile(e.dataTransfer.files[0]);
      }}
    >
      <header className="topbar">
        <div className="identity">
          <div className="brand-mark">
            <Aperture size={21} />
          </div>
          <span>
            scroll<span className="brand-accent">forge</span>
            <small>SCROLLYTELLING STUDIO</small>
          </span>
        </div>
        <div className="mode-switch" aria-label="Workspace mode">
          <button className="mode-active">
            <SlidersHorizontal size={14} /> Studio
          </button>
          <button
            disabled={!ready}
            onClick={() => {
              setPlaying(false);
              setPreview(true);
            }}
          >
            <ArrowUpRight size={15} /> Live Preview
          </button>
        </div>
        <div className="top-actions">
          <button
            className="button upload"
            onClick={() => {
              setError("");
              setDialog("source");
            }}
          >
            <CloudUpload size={16} /> Import video
          </button>
          <button
            className="button accent"
            disabled={!ready}
            onClick={() => setDialog("export")}
          >
            <ArrowDownToLine size={15} /> Export
          </button>
        </div>
      </header>
      <div className="workspace">
        <div className="work-head">
          <div>
            <h1>Sequence editor</h1>
            <label className="demo-picker">
              DEMO
              <select
                value={demoId}
                disabled={!!job}
                onChange={(e) => void loadDemo(e.target.value)}
              >
                {demoSequences.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="source-tag">
            <span className="status-dot" />
            {source}
          </div>
        </div>
        <div className="layout">
          <div className="left-stack">
            <section className="panel viewer">
              <div className="panel-title">
                <strong>
                  <Clapperboard size={16} /> Canvas preview
                </strong>
                <span className="mono subdued">
                  {motion.fit.toUpperCase()}{" "}
                  <span className="separator">/</span>{" "}
                  {frames[0]
                    ? frames[0].bitmap.width + " × " + frames[0].bitmap.height
                    : "Rendering"}
                </span>
              </div>
              <ScrollCanvas
                frames={frames}
                beats={beats}
                motion={motion}
                frame={frame}
              />
              <div className="viewer-footer">
                <span>
                  <i className="status-dot" />{" "}
                  {job ? "Preparing sequence" : "Ready"}
                </span>
                <span>
                  FRAME <b>{number(frame)}</b> / {number(last)}{" "}
                  <i className="separator">·</i>{" "}
                  {Math.round((frame / Math.max(1, last)) * 100)}%{" "}
                  <i className="separator">·</i> {ram.toFixed(0)} MB
                </span>
              </div>
            </section>
            <TimelineEditor
              frames={frames}
              beats={beats}
              frame={frame}
              selected={selection}
              playing={playing}
              onScrub={scrub}
              onSelect={selectBeat}
              onAdd={addBeat}
              onPlay={() => {
                if (!ready) return;
                if (frame === last) setFrame(0);
                setPlaying(!playing);
              }}
            />
          </div>
          <aside className="panel inspector">
            <div className="inspector-tabs">
              <button
                className={tab === "story" ? "active" : ""}
                onClick={() => setTab("story")}
              >
                <Layers3 size={15} /> Story beats
              </button>
              <button
                className={tab === "motion" ? "active" : ""}
                onClick={() => setTab("motion")}
              >
                <SlidersHorizontal size={15} /> Motion
              </button>
            </div>
            {tab === "story" ? (
              <>
                <div className="beat-list">
                  {beats.map((beat, index) => (
                    <button
                      key={beat.id}
                      className={
                        "beat-row " + (selection === beat.id ? "active" : "")
                      }
                      onClick={() => selectBeat(beat)}
                    >
                      <span className={"beat-icon beat-color-" + (index % 4)}>
                        <Layers3 size={13} />
                      </span>
                      <span>
                        <strong>{beat.headline || "Untitled beat"}</strong>
                        <small>
                          {number(beat.start)} — {number(beat.end)}
                        </small>
                      </span>
                      <ChevronRight size={14} />
                    </button>
                  ))}
                  {!beats.length && (
                    <p className="empty">
                      Add a story beat to place text or a callout on the canvas.
                    </p>
                  )}
                  <button
                    className="add-outline"
                    onClick={addBeat}
                    disabled={!ready}
                  >
                    <Plus size={15} /> Add beat at frame {number(frame)}
                  </button>
                </div>
                {selected && (
                  <div className="properties">
                    <div className="property-heading">
                      <strong>Beat properties</strong>
                      <button
                        className="icon-button"
                        aria-label="Delete selected beat"
                        onClick={() => {
                          setBeats(
                            beats.filter((beat) => beat.id !== selection),
                          );
                          setSelection("");
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="two">
                      <label>
                        Start frame
                        <input
                          type="number"
                          min="0"
                          max={selected.end}
                          value={selected.start}
                          onChange={(e) =>
                            updateBeat({
                              start: Math.max(
                                0,
                                Math.min(
                                  selected.end,
                                  Math.round(+e.target.value),
                                ),
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        End frame
                        <input
                          type="number"
                          min={selected.start}
                          max={last}
                          value={selected.end}
                          onChange={(e) =>
                            updateBeat({
                              end: Math.max(
                                selected.start,
                                Math.min(last, Math.round(+e.target.value)),
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                    <label>
                      Eyebrow
                      <input
                        value={selected.eyebrow}
                        onChange={(e) =>
                          updateBeat({ eyebrow: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Headline
                      <input
                        value={selected.headline}
                        onChange={(e) =>
                          updateBeat({ headline: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Subtitle
                      <textarea
                        rows={2}
                        value={selected.subtitle}
                        onChange={(e) =>
                          updateBeat({ subtitle: e.target.value })
                        }
                      />
                    </label>
                    <div className="two">
                      <label>
                        Position
                        <select
                          value={selected.position}
                          onChange={(e) =>
                            updateBeat({
                              position: e.target.value as Beat["position"],
                            })
                          }
                        >
                          {positions.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Animation
                        <select
                          value={selected.animation}
                          onChange={(e) =>
                            updateBeat({
                              animation: e.target.value as Beat["animation"],
                            })
                          }
                        >
                          {animations.map((a) => (
                            <option key={a}>{a}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="check">
                      <Crosshair size={15} /> Callout pin
                      <input
                        type="checkbox"
                        checked={!!selected.pin}
                        onChange={(e) =>
                          updateBeat({
                            pin: e.target.checked
                              ? { x: 67, y: 47 }
                              : undefined,
                          })
                        }
                      />
                    </label>
                    {selected.pin && (
                      <div className="two">
                        {(["x", "y"] as const).map((axis) => (
                          <label key={axis}>
                            {axis.toUpperCase()} (%)
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={selected.pin![axis]}
                              onChange={(e) =>
                                updateBeat({
                                  pin: {
                                    ...selected.pin!,
                                    [axis]: Math.max(
                                      0,
                                      Math.min(100, +e.target.value),
                                    ),
                                  },
                                })
                              }
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="properties motion-properties">
                <div className="property-heading">
                  <strong>Scroll physics</strong>
                </div>
                <label>
                  Damping <output>{motion.damping.toFixed(2)}</output>
                  <input
                    type="range"
                    min=".02"
                    max=".5"
                    step=".01"
                    value={motion.damping}
                    onChange={(e) =>
                      setMotion({ ...motion, damping: +e.target.value })
                    }
                  />
                </label>
                <label>
                  Canvas fit
                  <select
                    value={motion.fit}
                    onChange={(e) =>
                      setMotion({
                        ...motion,
                        fit: e.target.value as Motion["fit"],
                      })
                    }
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                  </select>
                </label>
                <label className="check">
                  Performance telemetry
                  <input
                    type="checkbox"
                    checked={motion.telemetry}
                    onChange={(e) =>
                      setMotion({ ...motion, telemetry: e.target.checked })
                    }
                  />
                </label>
              </div>
            )}
          </aside>
        </div>
        <footer className="studio-footer">
          <span>
            <Film size={13} /> {frames.length} frames <i>·</i> {beats.length}{" "}
            story beats
          </span>
          <span>Processing stays on this device</span>
        </footer>
      </div>
      <input
        hidden
        ref={fileInput}
        type="file"
        accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
        onChange={(e) => {
          chooseFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {job?.mode === "demo" && (
        <div className="toast" role="status">
          Rendering demo · {job.done} / {job.total}
        </div>
      )}
      {!dialog && error && (
        <div className="toast" role="alert">
          {error}
        </div>
      )}
      <dialog
        ref={nativeDialog}
        onCancel={(e) => {
          if (job) {
            e.preventDefault();
            return;
          }
          setDialog(null);
        }}
      >
        <div className="dialog-head">
          <div>
            <h2>{dialog === "export" ? "Export showcase" : "Import video"}</h2>
            <p>
              {dialog === "export"
                ? "Take your frames, story beats, and scroll settings with you."
                : "Choose a video to turn into a scroll sequence."}
            </p>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            disabled={!!job}
            onClick={() => setDialog(null)}
          >
            <X size={19} />
          </button>
        </div>
        {dialog === "source" && (
          <form className="import-form" onSubmit={importVideo}>
            <button
              type="button"
              className="drop-zone"
              disabled={!!job}
              onClick={() => fileInput.current?.click()}
            >
              <CloudUpload size={25} />
              <strong>{file?.name || "Drop a video or browse files"}</strong>
              <span>MP4, WebM, MOV · Browser supported codecs</span>
            </button>
            <div className="three">
              <label>
                Target frames
                <select
                  value={count}
                  disabled={!!job}
                  onChange={(e) => setCount(+e.target.value)}
                >
                  {[40, 60, 90, 120, 180].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label>
                Max width
                <select
                  value={width}
                  disabled={!!job}
                  onChange={(e) => setWidth(+e.target.value)}
                >
                  {[960, 1280, 1920].map((n) => (
                    <option key={n} value={n}>
                      {n} px
                    </option>
                  ))}
                </select>
              </label>
              <label>
                WebP quality <output>{quality.toFixed(2)}</output>
                <input
                  type="range"
                  min=".75"
                  max=".95"
                  step=".01"
                  disabled={!!job}
                  value={quality}
                  onChange={(e) => setQuality(+e.target.value)}
                />
              </label>
            </div>
            {job?.mode === "video" && (
              <div className="job" role="status">
                Frame {job.done} / {job.total} · {job.ram.toFixed(0)} MB decoded
                <progress max={job.total} value={job.done} />
              </div>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="button"
                disabled={!!job}
                onClick={() => void loadDemo()}
              >
                {demoSequences.length} demos
              </button>
              {job?.mode === "video" ? (
                <button
                  type="button"
                  className="button"
                  onClick={() => task.current?.abort()}
                >
                  Cancel extraction
                </button>
              ) : (
                <button className="button accent" disabled={!file || !!job}>
                  Extract frames
                </button>
              )}
            </div>
          </form>
        )}
        {dialog === "export" && (
          <div className="export-options">
            <button
              onClick={() => {
                download(
                  "index.html",
                  standaloneHTML(
                    frames.map((item) => item.url),
                    beats,
                    motion,
                  ),
                  "text/html",
                );
                setNotice("Standalone HTML downloaded");
              }}
            >
              <ArrowDownToLine size={21} />
              <span>
                <strong>Download standalone HTML</strong>
                <small>Single file · index.html</small>
              </span>
              <ChevronRight size={16} />
            </button>
            <button onClick={() => void copyReact()}>
              <Braces size={21} />
              <span>
                <strong>Copy React + TypeScript</strong>
                <small>Embedded assets · ScrollShowcase.tsx</small>
              </span>
              <ChevronRight size={16} />
            </button>
            {notice && (
              <p role="status" className="export-notice">
                {notice}
              </p>
            )}
          </div>
        )}
      </dialog>
    </main>
  );
}
