import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 40, height: '100%', padding: 24, textAlign: 'center',
    }}>
      <h1 style={{ fontSize: 64, margin: 0, letterSpacing: 6 }}>polarArena</h1>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/display" style={btn('#88ddaa', '#0a0a12')}>HOST</Link>
        <Link to="/play" style={btn('#55c2ff', '#0a0a12')}>JOIN</Link>
      </div>
      <div style={{ fontSize: 16, opacity: 0.6, maxWidth: 400 }}>
        Host on the big screen, join from your phones.
      </div>
    </div>
  );
}

function btn(bg: string, fg: string): React.CSSProperties {
  return {
    padding: '24px 48px', fontSize: 32, fontWeight: 800, letterSpacing: 4,
    borderRadius: 16, textDecoration: 'none', background: bg, color: fg,
    minWidth: 180, textAlign: 'center',
  };
}
