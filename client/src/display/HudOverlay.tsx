interface Props {
  onResetRoom: () => void;
  phase: string;
}

export function HudOverlay({ onResetRoom, phase }: Props) {
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
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.1em',
          backdropFilter: 'blur(8px)',
        }}
      >
        × end game
      </button>

      {phase === 'paused' && <OverlayText text="PAUSED — WAITING FOR RECONNECT" />}
      {phase === 'gameover' && <GameOverOverlay onRestart={onResetRoom} />}
    </div>
  );
}

function OverlayText({ text }: { text: string }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Press Start 2P', monospace",
      fontSize: 32, color: '#e8ecff',
      letterSpacing: '0.08em', textAlign: 'center',
      padding: '0 48px',
    }}>
      {text}
    </div>
  );
}

function GameOverOverlay({ onRestart }: { onRestart: () => void }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'auto',
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', flexDirection: 'column', gap: 32,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 42,
        color: '#ef4444', letterSpacing: '0.08em',
        textShadow: '0 0 30px #ef4444, 0 0 60px #ef444488',
      }}>
        ROBOT DESTROYED
      </div>
      <button
        onClick={onRestart}
        style={{
          padding: '16px 36px', borderRadius: 10,
          border: '2px solid #22d3ee', background: '#22d3ee',
          color: '#0a0b14', fontSize: 18,
          fontFamily: "'Press Start 2P', monospace",
          letterSpacing: '0.08em', cursor: 'pointer',
          boxShadow: '0 0 24px #22d3ee88',
        }}
      >
        RESTART
      </button>
    </div>
  );
}
