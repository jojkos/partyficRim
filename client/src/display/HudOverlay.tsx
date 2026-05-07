import { Robot, EnemySprite } from './Sprites.js';
import { PR } from '../ui/theme.js';

interface Props {
  onResetRoom: () => void;
  phase: string;
  countdownSec?: number | null;
}

export function HudOverlay({ onResetRoom, phase, countdownSec }: Props) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      {/* end-game button */}
      <button
        onClick={onResetRoom}
        style={{
          position: 'absolute', bottom: 16, right: 16, pointerEvents: 'auto',
          padding: '8px 14px', fontSize: 12,
          background: 'rgba(0,0,0,0.55)',
          color: 'rgba(255,255,255,0.45)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 6, cursor: 'pointer',
          fontFamily: PR.font.mono,
          letterSpacing: '0.1em',
          backdropFilter: 'blur(8px)',
        }}
      >
        × end game
      </button>

      {phase === 'paused' && <OverlayText text="PAUSED — WAITING FOR RECONNECT" />}
      {phase === 'countdown' && countdownSec != null && <CountdownOverlay n={countdownSec} />}
      {phase === 'gameover' && <GameOverOverlay />}
    </div>
  );
}

function OverlayText({ text }: { text: string }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'rgba(20,8,40,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: PR.font.display,
      fontSize: 56, color: PR.color.paper,
      letterSpacing: '0.08em', textAlign: 'center',
      padding: '0 48px',
    }}>
      {text}
    </div>
  );
}

function CountdownOverlay({ n }: { n: number }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'rgba(20,8,40,0.5)',
      display: 'grid', placeItems: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div style={{
          font: `400 360px ${PR.font.display}`, color: PR.color.sun, lineHeight: 1,
          textShadow: `8px 12px 0 ${PR.color.flameDk}, 16px 22px 0 ${PR.color.ink}`,
          animation: 'pr-pulse 1s ease-in-out infinite',
        }}>{n}</div>
        <div style={{
          font: `700 24px ${PR.font.sans}`, letterSpacing: 8, color: PR.color.paper,
        }}>GET READY</div>
      </div>
    </div>
  );
}

function GameOverOverlay() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'auto',
      overflow: 'hidden',
      background: `radial-gradient(ellipse at center, ${PR.color.cherry} 0%, ${PR.color.flameDk} 55%, ${PR.color.bgDeep} 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: PR.font.sans, color: PR.color.paper,
    }}>
      {/* diagonal stripes */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.12, pointerEvents: 'none',
        backgroundImage: `repeating-linear-gradient(135deg, #fff 0 6px, transparent 6px 80px)`,
      }} />

      <div style={{
        position: 'absolute', top: '11%', left: '50%',
        transform: 'translateX(-50%) rotate(-2deg)', textAlign: 'center',
      }}>
        <div style={{
          font: `400 140px ${PR.font.display}`, color: PR.color.sun,
          textShadow: `6px 9px 0 ${PR.color.ink}`, letterSpacing: 6, lineHeight: 1,
        }}>GAME OVER</div>
        <div style={{
          font: `700 18px ${PR.font.sans}`, letterSpacing: 8,
          marginTop: 12, opacity: 0.9,
        }}>THE RIM HAS FALLEN</div>
      </div>

      <div style={{
        position: 'absolute', left: '50%', top: '44%',
        transform: 'translate(-50%, 0) rotate(-12deg)',
        animation: 'pr-shake 0.4s ease-in-out infinite',
      }}>
        <Robot size={180} glow={PR.color.cherry} />
      </div>

      <div style={{
        position: 'absolute', bottom: '18%', left: '8%',
        animation: 'pr-jiggle 1.6s ease-in-out infinite',
        transformOrigin: 'bottom center',
      }}>
        <EnemySprite kind="slime" size={110} />
      </div>
      <div style={{
        position: 'absolute', bottom: '18%', right: '8%',
        animation: 'pr-hop 1.4s ease-in-out infinite',
        transformOrigin: 'bottom center',
      }}>
        <EnemySprite kind="bunny" size={120} />
      </div>

      <div style={{
        position: 'absolute', bottom: '6%', left: '50%',
        transform: 'translateX(-50%)', textAlign: 'center',
        font: `700 12px ${PR.font.sans}`, letterSpacing: 3,
        color: PR.color.paper, opacity: 0.85,
      }}>
        PRESS <span style={{ color: PR.color.sun }}>RESTART</span> ON ANY PHONE
      </div>
    </div>
  );
}
