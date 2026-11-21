import { Plus, SkipBack, SkipForward, Play, Pause } from "lucide-react";
import type { Frame } from "../engine/frameExtractor";
import type { Beat } from "../engine/scrollMath";

export default function TimelineEditor({
  frames,
  beats,
  frame,
  selected,
  playing,
  onScrub,
  onSelect,
  onAdd,
  onPlay,
}: {
  frames: Frame[];
  beats: Beat[];
  frame: number;
  selected?: string;
  playing: boolean;
  onScrub: (frame: number) => void;
  onSelect: (beat: Beat) => void;
  onAdd: () => void;
  onPlay: () => void;
}) {
  const last = Math.max(0, frames.length - 1);
  const percent = (index: number) => (index / Math.max(1, last)) * 100;
  const thumbs = Array.from({ length: Math.min(12, frames.length) }, (_, i) =>
    Math.round((last * i) / Math.max(1, Math.min(12, frames.length) - 1)),
  );
  return (
    <section className="timeline panel" aria-label="Timeline">
      <div className="panel-title timeline-title">
        <strong>Timeline</strong>
        <div className="transport">
          <button aria-label="First frame" onClick={() => onScrub(0)}>
            <SkipBack size={14} />
          </button>
          <button aria-label={playing ? "Pause" : "Play"} onClick={onPlay}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button aria-label="Last frame" onClick={() => onScrub(last)}>
            <SkipForward size={14} />
          </button>
        </div>
        <button
          className="small-button"
          onClick={onAdd}
          disabled={!frames.length}
        >
          <Plus size={14} /> Add story beat
        </button>
      </div>
      <div className="ruler">
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <span key={p}>{String(Math.round(last * p)).padStart(3, "0")}</span>
        ))}
      </div>
      <div className="film">
        <div className="film-images">
          {thumbs.map((i) => (
            <img key={i} src={frames[i].url} alt="" draggable={false} />
          ))}
        </div>
        <input
          type="range"
          min="0"
          max={last}
          value={frame}
          onChange={(e) => onScrub(+e.target.value)}
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onScrub(
              Math.round(
                Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) *
                  last,
              ),
            );
          }}
          aria-label="Timeline frame"
        />
        <div className="playhead" style={{ left: percent(frame) + "%" }} />
      </div>
      <div className="beat-track">
        {beats.map((beat, i) => (
          <button
            key={beat.id}
            aria-pressed={selected === beat.id}
            className={"beat-block beat-color-" + (i % 4)}
            style={{
              left: percent(beat.start) + "%",
              width: Math.max(1, percent(beat.end - beat.start)) + "%",
            }}
            onClick={() => onSelect(beat)}
            title={beat.headline}
          >
            {beat.headline || "Untitled beat"}
          </button>
        ))}
      </div>
    </section>
  );
}
