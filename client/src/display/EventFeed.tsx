import type { FeedEvent, Role } from '@partyficrim/shared';

const ROLE_COLOR: Record<Role, string> = {
  defense: '#ff5577',
  repair: '#55c2ff',
  weapons: '#ffe066',
};

interface Props {
  events: FeedEvent[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

export function EventFeed({ events }: Props) {
  if (events.length === 0) {
    return (
      <div style={feedFrame()}>
        <div style={feedTitle()}>EVENT FEED</div>
        <div style={{ opacity: 0.4, fontSize: 12 }}>(no input yet)</div>
      </div>
    );
  }

  return (
    <div style={feedFrame()}>
      <div style={feedTitle()}>EVENT FEED</div>
      {events.slice().reverse().map((e, i) => (
        (() => {
          const role = e.role ?? 'room';
          const color = e.role ? ROLE_COLOR[e.role] : '#aaa';
          return (
        <div key={`${e.ts}-${i}`} style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          display: 'flex', gap: 8, alignItems: 'baseline',
          padding: '2px 0',
          opacity: i === 0 ? 1 : Math.max(0.3, 1 - i * 0.06),
        }}>
          <span style={{ opacity: 0.5, color: '#aaa' }}>{formatTime(e.ts)}</span>
          <span style={{ color, fontWeight: 700 }}>[{role}]</span>
          <span>{e.detail}</span>
        </div>
          );
        })()
      ))}
    </div>
  );
}

function feedFrame(): React.CSSProperties {
  return {
    position: 'fixed', bottom: 16, left: 16,
    width: 320, maxHeight: 300, overflow: 'hidden',
    padding: 12,
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    color: '#fff',
    pointerEvents: 'none',
    zIndex: 5,
  };
}

function feedTitle(): React.CSSProperties {
  return {
    fontSize: 11, fontWeight: 800, letterSpacing: 2,
    opacity: 0.5, marginBottom: 6,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  };
}
