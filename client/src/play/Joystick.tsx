import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
interface Props {
  lockAxis: "x" | "y" | null;
  onMove: (dx: number, dy: number) => void;
  color: string;
  disabled?: boolean;
}
export function Joystick({ lockAxis, onMove, color, disabled = false }: Props) {
  const root = useRef<HTMLDivElement>(null),
    pointer = useRef<number | null>(null),
    keys = useRef(new Set<string>()),
    [offset, setOffset] = useState({ x: 0, y: 0 });
  const move = useCallback(
    (x: number, y: number) => {
      if (lockAxis === "x") y = 0;
      if (lockAxis === "y") x = 0;
      const length = Math.hypot(x, y);
      if (length > 1) {
        x /= length;
        y /= length;
      }
      setOffset({ x: x * 33, y: y * 33 });
      onMove(length < 0.12 ? 0 : x, length < 0.12 ? 0 : y);
    },
    [lockAxis, onMove],
  );
  const reset = useCallback(() => {
    pointer.current = null;
    keys.current.clear();
    setOffset({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);
  useEffect(() => {
    window.addEventListener("blur", reset);
    const hidden = () => {
      if (document.hidden) reset();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      reset();
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [reset, lockAxis, disabled]);
  const point = (e: React.PointerEvent) => {
    const r = root.current!.getBoundingClientRect();
    move(
      (e.clientX - r.left - r.width / 2) / 42,
      (e.clientY - r.top - r.height / 2) / 42,
    );
  };
  return (
    <div
      ref={root}
      className="joystick"
      role="application"
      aria-label={
        lockAxis === "x"
          ? "Horizontal movement. Drag or use left and right arrow keys."
          : lockAxis === "y"
            ? "Vertical movement. Drag or use up and down arrow keys."
            : "Movement. Drag or use arrow keys."
      }
      tabIndex={disabled ? -1 : 0}
      style={{ "--station": color } as CSSProperties}
      onPointerDown={(e) => {
        if (disabled || pointer.current !== null) return;
        e.preventDefault();
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        point(e);
      }}
      onPointerMove={(e) => {
        if (pointer.current === e.pointerId) point(e);
      }}
      onPointerUp={(e) => {
        if (pointer.current === e.pointerId) reset();
      }}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
      onBlur={reset}
      onKeyDown={(e) => {
        if (disabled || !e.key.startsWith("Arrow")) return;
        e.preventDefault();
        keys.current.add(e.key);
        move(
          Number(keys.current.has("ArrowRight")) -
            Number(keys.current.has("ArrowLeft")),
          Number(keys.current.has("ArrowDown")) -
            Number(keys.current.has("ArrowUp")),
        );
      }}
      onKeyUp={(e) => {
        if (!e.key.startsWith("Arrow")) return;
        e.preventDefault();
        keys.current.delete(e.key);
        move(
          Number(keys.current.has("ArrowRight")) -
            Number(keys.current.has("ArrowLeft")),
          Number(keys.current.has("ArrowDown")) -
            Number(keys.current.has("ArrowUp")),
        );
      }}
    >
      <div className="joystick-base">
        <div className="joystick-cross" />
        <div
          className="joystick-knob"
          style={{ transform: `translate(${offset.x}px,${offset.y}px)` }}
        />
      </div>
    </div>
  );
}
