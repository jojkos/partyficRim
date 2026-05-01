import { useEffect, useRef } from 'react';
import nipplejs, { type JoystickManager } from 'nipplejs';

interface Props {
  lockAxis: 'x' | 'y' | null;
  onMove: (dx: number, dy: number) => void;
  color: string;
}

export function Joystick({ lockAxis, onMove, color }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const manager: JoystickManager = nipplejs.create({
      zone: ref.current,
      mode: 'dynamic',     // appears wherever the user first touches inside the zone
      color,
      size: 140,
      lockX: lockAxis === 'x',
      lockY: lockAxis === 'y',
      restJoystick: true,
    });
    manager.on('move', (_e, data) => {
      const v = data.vector;
      onMove(v.x, -v.y); // nipple y is up-positive; we want down-positive
    });
    manager.on('end', () => onMove(0, 0));
    return () => manager.destroy();
  }, [lockAxis, color, onMove]);

  // Zone fills the entire left half of the screen — touch anywhere activates the stick at that point.
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%',
        touchAction: 'none', userSelect: 'none',
      }}
    />
  );
}
