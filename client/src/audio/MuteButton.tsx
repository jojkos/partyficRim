import { useEffect, useRef, useState, type CSSProperties } from "react";
import { audio } from "./engine.js";
interface Props {
  style?: CSSProperties;
  size?: number;
  upward?: boolean;
}
export function MuteButton({ style, size = 44, upward = false }: Props) {
  const [, update] = useState(0),
    [open, setOpen] = useState(false),
    wrap = useRef<HTMLDivElement>(null);
  useEffect(() => audio.subscribe(() => update((n) => n + 1)), []);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const muted = audio.isMuted("master");
  return (
    <div ref={wrap} className="audio-wrap" style={style}>
      <button
        className="audio-toggle"
        style={{ width: size, height: size, minHeight: size, minWidth: size }}
        aria-label="Audio settings"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m11 4-6 5H2v6h3l6 5Z" />
          {muted ? (
            <path d="m16 9 6 6m0-6-6 6" />
          ) : (
            <>
              <path d="M15 8q4 4 0 8M18 4q8 8 0 16" />
            </>
          )}
        </svg>
      </button>
      {open && (
        <section
          className={`audio-panel ${upward ? "down-up" : ""}`}
          aria-label="Audio settings"
        >
          <b>Set the mood</b>
          {(["music", "sfx"] as const).map((bus) => (
            <label key={bus}>
              {bus === "music" ? "Music" : "Sound effects"}
              <span>{Math.round(audio.getVolume(bus) * 100)}%</span>
              <input
                aria-label={
                  bus === "music" ? "Music volume" : "Sound effects volume"
                }
                type="range"
                min="0"
                max="1"
                step=".01"
                value={audio.getVolume(bus)}
                onChange={(e) => {
                  audio.setMuted(bus, false);
                  audio.setVolume(bus, Number(e.target.value));
                  if (bus === "sfx") {
                    audio.setMuted("ui", false);
                    audio.setVolume("ui", Number(e.target.value) * 0.77);
                  }
                }}
              />
            </label>
          ))}
          <button
            className="quiet-button"
            onClick={() => audio.setMuted("master", !muted)}
          >
            {muted ? "Turn audio on" : "Mute all audio"}
          </button>
        </section>
      )}
    </div>
  );
}
