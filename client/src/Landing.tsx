import { Link } from 'react-router-dom';
import { Robot, EnemySprite } from './display/Sprites.js';
import { PR, Starfield, Wordmark, bevelButtonStyle } from './ui/theme.js';

export function Landing() {
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: `radial-gradient(ellipse at top, #2d1b4d 0%, ${PR.color.bg} 60%, ${PR.color.bgDeep} 100%)`,
      fontFamily: PR.font.sans, color: PR.color.paper,
    }}>
      <Starfield count={36} />

      {/* title */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center', zIndex: 4, whiteSpace: 'nowrap',
      }}>
        <Wordmark size={132} />
      </div>

      {/* HOST + JOIN */}
      <div style={{
        position: 'absolute', top: '46%', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 36, zIndex: 5,
      }}>
        <BigButton to="/display?new=1" color={PR.color.flame} sub="this device becomes the arena">HOST</BigButton>
        <BigButton to="/play" color={PR.color.sun} sub="phone joins an existing room">JOIN</BigButton>
      </div>

      {/* mascots */}
      <div style={{
        position: 'absolute', left: '12%', top: '52%',
        animation: 'pr-bob-lg 2.4s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 3,
      }}>
        <Robot size={170} />
      </div>
      <div style={{
        position: 'absolute', right: '11%', top: '58%',
        animation: 'pr-jiggle 1.6s ease-in-out infinite',
        transformOrigin: 'bottom center',
        pointerEvents: 'none', zIndex: 3,
      }}>
        <EnemySprite kind="slime" size={120} />
      </div>
      <div style={{
        position: 'absolute', right: '22%', top: '66%',
        animation: 'pr-hop 1.4s ease-in-out infinite',
        transformOrigin: 'bottom center',
        pointerEvents: 'none', zIndex: 3,
      }}>
        <EnemySprite kind="bunny" size={100} />
      </div>

    </div>
  );
}

function BigButton({ to, color, sub, children }: {
  to: string; color: string; sub: string; children: React.ReactNode;
}) {
  return (
    <Link to={to} className="pr-bevel-btn" style={{
      ...bevelButtonStyle({ bg: color, size: 'lg' }),
      minWidth: 240,
    }}>
      <div style={{
        font: `400 60px ${PR.font.display}`, letterSpacing: 4, lineHeight: 1,
      }}>{children}</div>
      <div style={{
        font: `700 11px ${PR.font.sans}`, letterSpacing: 2,
        marginTop: 6, opacity: 0.7,
      }}>{sub}</div>
    </Link>
  );
}
