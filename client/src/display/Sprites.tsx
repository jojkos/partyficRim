import type { Role } from '@partyficrim/shared';

/* ── Robot ─────────────────────────────────────────────────── */

interface RobotProps { size?: number; glow?: string; bodyColor?: string; }

export function Robot({ size = 96, glow = '#22d3ee', bodyColor = '#7fb86b' }: RobotProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100"
      style={{ filter: `drop-shadow(0 0 8px ${glow}66) drop-shadow(0 3px 0 rgba(0,0,0,0.4))`, overflow: 'visible' }}>
      <line x1="50" y1="22" x2="50" y2="14" stroke="#222" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="12" r="3" fill="#ef4444" stroke="#222" strokeWidth="2" />
      <circle cx="49" cy="11" r="1" fill="#fff" opacity="0.8" />
      <rect x="32" y="22" width="36" height="28" rx="5" fill={bodyColor} stroke="#222" strokeWidth="2.5" />
      <path d="M 34 24 Q 36 22 40 22 L 40 48 Q 36 48 34 46 Z" fill="rgba(255,255,255,0.18)" />
      <path d="M 60 22 L 66 22 Q 68 22 68 24 L 68 46 Q 68 48 66 48 L 60 48 Z" fill="rgba(0,0,0,0.18)" />
      <rect x="36" y="28" width="28" height="14" rx="2" fill="#1a1a2e" stroke="#222" strokeWidth="2" />
      <circle cx="43" cy="35" r="3" fill={glow}><animate attributeName="r" values="3;3.4;3" dur="1.5s" repeatCount="indefinite" /></circle>
      <circle cx="57" cy="35" r="3" fill={glow}><animate attributeName="r" values="3;3.4;3" dur="1.5s" repeatCount="indefinite" /></circle>
      <circle cx="43" cy="34" r="0.8" fill="#fff" />
      <circle cx="57" cy="34" r="0.8" fill="#fff" />
      <line x1="42" y1="41" x2="58" y2="41" stroke="#444" strokeWidth="1" />
      <line x1="46" y1="40" x2="46" y2="42" stroke="#444" strokeWidth="0.6" />
      <line x1="50" y1="40" x2="50" y2="42" stroke="#444" strokeWidth="0.6" />
      <line x1="54" y1="40" x2="54" y2="42" stroke="#444" strokeWidth="0.6" />
      <rect x="28" y="50" width="44" height="32" rx="6" fill={bodyColor} stroke="#222" strokeWidth="2.5" />
      <path d="M 30 52 Q 32 50 36 50 L 36 80 Q 32 80 30 78 Z" fill="rgba(255,255,255,0.18)" />
      <path d="M 64 50 L 70 50 Q 72 50 72 52 L 72 78 Q 72 80 70 80 L 64 80 Z" fill="rgba(0,0,0,0.18)" />
      <circle cx="50" cy="64" r="7" fill="#0a0c18" stroke="#222" strokeWidth="2" />
      <circle cx="50" cy="64" r="5" fill={glow} opacity="0.85"><animate attributeName="opacity" values="0.85;0.5;0.85" dur="1.8s" repeatCount="indefinite" /></circle>
      <circle cx="48" cy="62" r="1.5" fill="#fff" opacity="0.9" />
      <circle cx="32" cy="55" r="1.5" fill="#1a1a2e" />
      <circle cx="68" cy="55" r="1.5" fill="#1a1a2e" />
      <circle cx="32" cy="77" r="1.5" fill="#1a1a2e" />
      <circle cx="68" cy="77" r="1.5" fill="#1a1a2e" />
      <rect x="20" y="54" width="10" height="18" rx="3" fill={bodyColor} stroke="#222" strokeWidth="2.5" />
      <rect x="70" y="54" width="10" height="18" rx="3" fill={bodyColor} stroke="#222" strokeWidth="2.5" />
      <circle cx="25" cy="74" r="4" fill="#444" stroke="#222" strokeWidth="2" />
      <circle cx="75" cy="74" r="4" fill="#444" stroke="#222" strokeWidth="2" />
      <rect x="30" y="82" width="16" height="10" rx="2" fill="#444" stroke="#222" strokeWidth="2.5" />
      <rect x="54" y="82" width="16" height="10" rx="2" fill="#444" stroke="#222" strokeWidth="2.5" />
      <circle cx="34" cy="89" r="1.5" fill="#1a1a2e" />
      <circle cx="42" cy="89" r="1.5" fill="#1a1a2e" />
      <circle cx="58" cy="89" r="1.5" fill="#1a1a2e" />
      <circle cx="66" cy="89" r="1.5" fill="#1a1a2e" />
    </svg>
  );
}

/* ── Enemy sprites ──────────────────────────────────────────── */

const SK = '#1a0e0a';
const SW = 2.2;

function E_Slime() {
  return (
    <g>
      <path d="M 22 76 Q 18 60 26 48 Q 34 36 50 34 Q 66 36 74 48 Q 82 60 78 76 Q 75 84 66 82 Q 58 80 50 84 Q 42 80 34 82 Q 25 84 22 76 Z" fill="#22c55e" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <ellipse cx="38" cy="48" rx="8" ry="4" fill="rgba(255,255,255,0.4)" transform="rotate(-25 38 48)" />
      <circle cx="42" cy="58" r="6" fill="#fff" stroke={SK} strokeWidth="1.8" />
      <circle cx="60" cy="58" r="6" fill="#fff" stroke={SK} strokeWidth="1.8" />
      <circle cx="43" cy="60" r="3" fill={SK} /><circle cx="61" cy="60" r="3" fill={SK} />
      <circle cx="44" cy="59" r="0.8" fill="#fff" /><circle cx="62" cy="59" r="0.8" fill="#fff" />
      <path d="M 44 70 L 46 76 L 48 70 Z" fill="#fff" stroke={SK} strokeWidth="1.3" />
      <path d="M 52 70 L 54 76 L 56 70 Z" fill="#fff" stroke={SK} strokeWidth="1.3" />
      <path d="M 44 70 Q 50 72 56 70" stroke={SK} strokeWidth="1.5" fill="none" />
    </g>
  );
}

function E_Bat() {
  return (
    <g>
      <path d="M 50 50 Q 30 30 14 36 Q 18 46 22 50 Q 14 52 16 60 Q 28 56 36 56 Q 42 58 50 60 Z" fill="#7c3aed" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 50 50 Q 70 30 86 36 Q 82 46 78 50 Q 86 52 84 60 Q 72 56 64 56 Q 58 58 50 60 Z" fill="#7c3aed" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 18 38 L 30 50 M 26 36 L 36 52 M 82 38 L 70 50 M 74 36 L 64 52" stroke={SK} strokeWidth="1.2" fill="none" opacity="0.5" />
      <ellipse cx="50" cy="58" rx="14" ry="16" fill="#5b21b6" stroke={SK} strokeWidth={SW} />
      <path d="M 42 44 L 40 32 L 48 42 Z" fill="#5b21b6" stroke={SK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M 58 44 L 60 32 L 52 42 Z" fill="#5b21b6" stroke={SK} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="44" cy="54" r="4" fill="#fbbf24" stroke={SK} strokeWidth="1.5" />
      <circle cx="56" cy="54" r="4" fill="#fbbf24" stroke={SK} strokeWidth="1.5" />
      <circle cx="44" cy="55" r="1.5" fill={SK} /><circle cx="56" cy="55" r="1.5" fill={SK} />
      <path d="M 47 64 L 47 70 L 49 66 Z M 53 64 L 53 70 L 51 66 Z" fill="#fff" stroke={SK} strokeWidth="1" />
    </g>
  );
}

function E_Mushroom() {
  return (
    <g>
      <path d="M 36 60 Q 34 78 38 86 Q 50 88 62 86 Q 66 78 64 60 Z" fill="#fef3c7" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 18 56 Q 22 30 50 26 Q 78 30 82 56 Q 70 62 50 60 Q 30 62 18 56 Z" fill="#dc2626" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <ellipse cx="34" cy="42" rx="6" ry="4" fill="#fef3c7" stroke={SK} strokeWidth="1.2" />
      <ellipse cx="56" cy="36" rx="5" ry="3.5" fill="#fef3c7" stroke={SK} strokeWidth="1.2" />
      <ellipse cx="68" cy="46" rx="4" ry="3" fill="#fef3c7" stroke={SK} strokeWidth="1.2" />
      <circle cx="44" cy="72" r="2.5" fill={SK} /><circle cx="56" cy="72" r="2.5" fill={SK} />
      <circle cx="44.5" cy="71" r="0.7" fill="#fff" /><circle cx="56.5" cy="71" r="0.7" fill="#fff" />
      <path d="M 44 80 Q 50 76 56 80" stroke={SK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

function E_Skeleton() {
  return (
    <g>
      <line x1="78" y1="30" x2="92" y2="14" stroke="#cbd5e1" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="78" y1="30" x2="92" y2="14" stroke={SK} strokeWidth="1" strokeLinecap="round" />
      <line x1="74" y1="32" x2="82" y2="28" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
      <path d="M 32 40 Q 30 22 50 20 Q 70 22 68 40 Q 68 50 64 54 L 64 60 L 36 60 L 36 54 Q 32 50 32 40 Z" fill="#f1f5f9" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <ellipse cx="42" cy="38" rx="5" ry="6" fill={SK} /><ellipse cx="58" cy="38" rx="5" ry="6" fill={SK} />
      <circle cx="42" cy="38" r="1.5" fill="#dc2626"><animate attributeName="r" values="1.5;2;1.5" dur="1s" repeatCount="indefinite" /></circle>
      <circle cx="58" cy="38" r="1.5" fill="#dc2626"><animate attributeName="r" values="1.5;2;1.5" dur="1s" repeatCount="indefinite" /></circle>
      <path d="M 49 46 L 51 46 L 50 50 Z" fill={SK} />
      <rect x="40" y="52" width="20" height="6" fill="#f1f5f9" stroke={SK} strokeWidth="1.3" />
      <line x1="44" y1="52" x2="44" y2="58" stroke={SK} strokeWidth="1" /><line x1="48" y1="52" x2="48" y2="58" stroke={SK} strokeWidth="1" />
      <line x1="52" y1="52" x2="52" y2="58" stroke={SK} strokeWidth="1" /><line x1="56" y1="52" x2="56" y2="58" stroke={SK} strokeWidth="1" />
      <path d="M 38 60 Q 36 76 40 86 L 60 86 Q 64 76 62 60 Z" fill="#f1f5f9" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 50 62 L 50 84 M 42 66 Q 50 70 58 66 M 42 72 Q 50 76 58 72 M 42 78 Q 50 82 58 78" stroke={SK} strokeWidth="1.4" fill="none" />
    </g>
  );
}

function E_Ghost() {
  return (
    <g>
      <path d="M 24 40 Q 26 18 50 18 Q 74 18 76 40 L 76 84 Q 70 78 64 84 Q 58 78 52 84 Q 46 78 40 84 Q 34 78 28 84 L 24 84 Z" fill="#e0e7ff" stroke={SK} strokeWidth={SW} strokeLinejoin="round" opacity="0.95" />
      <path d="M 28 30 Q 34 24 42 24" stroke="rgba(255,255,255,0.7)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="40" cy="42" rx="4.5" ry="6" fill={SK} /><ellipse cx="60" cy="42" rx="4.5" ry="6" fill={SK} />
      <circle cx="41" cy="40" r="1.5" fill="#fff" /><circle cx="61" cy="40" r="1.5" fill="#fff" />
      <ellipse cx="50" cy="58" rx="6" ry="8" fill={SK} />
      <ellipse cx="50" cy="56" rx="2" ry="2" fill="#dc2626" />
    </g>
  );
}

function E_Goblin() {
  return (
    <g>
      <line x1="78" y1="36" x2="92" y2="20" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
      <line x1="78" y1="36" x2="92" y2="20" stroke={SK} strokeWidth="0.8" />
      <line x1="74" y1="40" x2="82" y2="34" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 30 30 Q 30 20 50 18 Q 70 20 70 30 L 70 36 L 30 36 Z" fill="#78716c" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 45 18 Q 50 8 55 18" fill="#dc2626" stroke={SK} strokeWidth="1.5" />
      <line x1="30" y1="36" x2="70" y2="36" stroke={SK} strokeWidth="1.2" />
      <ellipse cx="50" cy="46" rx="20" ry="14" fill="#65a30d" stroke={SK} strokeWidth={SW} />
      <path d="M 30 46 L 22 42 L 28 50 Z" fill="#65a30d" stroke={SK} strokeWidth="1.6" />
      <path d="M 70 46 L 78 42 L 72 50 Z" fill="#65a30d" stroke={SK} strokeWidth="1.6" />
      <path d="M 38 42 L 46 44 L 42 48 Z" fill="#fff" stroke={SK} strokeWidth="1.4" />
      <path d="M 62 42 L 54 44 L 58 48 Z" fill="#fff" stroke={SK} strokeWidth="1.4" />
      <circle cx="42" cy="46" r="1.5" fill={SK} /><circle cx="58" cy="46" r="1.5" fill={SK} />
      <path d="M 42 54 Q 50 58 58 54" stroke={SK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M 48 54 L 48 58 L 50 56 Z" fill="#fff" stroke={SK} strokeWidth="1" />
      <path d="M 36 60 Q 34 78 40 86 L 60 86 Q 66 78 64 60 Z" fill="#7c3aed" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
    </g>
  );
}

function E_Eyeball() {
  return (
    <g>
      <path d="M 30 80 Q 28 88 24 92 M 42 84 Q 42 92 38 96 M 58 84 Q 58 92 62 96 M 70 80 Q 72 88 76 92 M 50 86 Q 50 94 50 98" stroke={SK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 30 80 Q 28 88 24 92 M 42 84 Q 42 92 38 96 M 58 84 Q 58 92 62 96 M 70 80 Q 72 88 76 92 M 50 86 Q 50 94 50 98" stroke="#7c3aed" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="50" cy="50" r="28" fill="#fff" stroke={SK} strokeWidth={SW} />
      <path d="M 28 50 Q 36 46 32 38 M 72 48 Q 66 42 70 36 M 30 56 Q 38 60 36 68" stroke="#dc2626" strokeWidth="1.2" fill="none" opacity="0.7" />
      <circle cx="50" cy="50" r="14" fill="#7c3aed" stroke={SK} strokeWidth="1.5" />
      <ellipse cx="52" cy="50" rx="6" ry="9" fill={SK}><animate attributeName="cx" values="52;48;52" dur="2.5s" repeatCount="indefinite" /></ellipse>
      <circle cx="54" cy="46" r="2" fill="#fff" />
      <circle cx="48" cy="52" r="1" fill="#fff" opacity="0.7" />
    </g>
  );
}

function E_Imp() {
  return (
    <g>
      <path d="M 34 24 L 28 12 L 38 22 Z" fill="#7f1d1d" stroke={SK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M 66 24 L 72 12 L 62 22 Z" fill="#7f1d1d" stroke={SK} strokeWidth="1.6" strokeLinejoin="round" />
      <ellipse cx="50" cy="40" rx="22" ry="20" fill="#dc2626" stroke={SK} strokeWidth={SW} />
      <path d="M 32 36 Q 36 26 46 24" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="42" cy="40" rx="5" ry="6" fill="#fde047" stroke={SK} strokeWidth="1.5" />
      <ellipse cx="58" cy="40" rx="5" ry="6" fill="#fde047" stroke={SK} strokeWidth="1.5" />
      <ellipse cx="42" cy="41" rx="1.5" ry="3" fill={SK} /><ellipse cx="58" cy="41" rx="1.5" ry="3" fill={SK} />
      <path d="M 38 50 Q 50 58 62 50 L 60 54 L 56 52 L 52 56 L 48 52 L 44 54 Z" fill="#fff" stroke={SK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 38 58 Q 36 72 42 80 L 58 80 Q 64 72 62 58 Z" fill="#7f1d1d" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 62 76 Q 78 76 78 88 L 84 86 L 78 92" stroke={SK} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="22" y1="86" x2="22" y2="56" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 16 56 L 22 50 L 28 56 M 22 50 L 22 44" stroke={SK} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function E_Spider() {
  return (
    <g>
      <path d="M 34 50 Q 14 38 8 22 M 32 56 Q 12 56 4 60 M 34 64 Q 16 70 10 84 M 38 70 Q 30 84 30 96 M 66 50 Q 86 38 92 22 M 68 56 Q 88 56 96 60 M 66 64 Q 84 70 90 84 M 62 70 Q 70 84 70 96" stroke={SK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="56" rx="22" ry="18" fill="#1f1f1f" stroke={SK} strokeWidth={SW} />
      <path d="M 46 50 L 54 50 L 50 56 L 54 62 L 46 62 L 50 56 Z" fill="#dc2626" stroke={SK} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="50" cy="38" r="12" fill="#1f1f1f" stroke={SK} strokeWidth={SW} />
      <circle cx="44" cy="34" r="2" fill="#facc15" stroke={SK} strokeWidth="0.8" />
      <circle cx="50" cy="32" r="2" fill="#facc15" stroke={SK} strokeWidth="0.8" />
      <circle cx="56" cy="34" r="2" fill="#facc15" stroke={SK} strokeWidth="0.8" />
      <circle cx="46" cy="40" r="1.5" fill="#facc15" stroke={SK} strokeWidth="0.8" />
      <circle cx="54" cy="40" r="1.5" fill="#facc15" stroke={SK} strokeWidth="0.8" />
      <path d="M 46 44 L 47 50 M 54 44 L 53 50" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function E_Bunny() {
  return (
    <g>
      <line x1="78" y1="58" x2="86" y2="46" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
      <path d="M 80 44 L 96 38 L 96 50 L 86 52 Z" fill="#cbd5e1" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 80 44 L 96 38" stroke="#fff" strokeWidth="1" opacity="0.6" />
      <path d="M 92 50 Q 92 56 90 60 Q 88 56 92 50 Z" fill="#dc2626" stroke={SK} strokeWidth="1" />
      <ellipse cx="40" cy="22" rx="5" ry="14" fill="#fafafa" stroke={SK} strokeWidth={SW} />
      <ellipse cx="60" cy="22" rx="5" ry="14" fill="#fafafa" stroke={SK} strokeWidth={SW} />
      <ellipse cx="40" cy="22" rx="2" ry="9" fill="#fda4af" />
      <ellipse cx="60" cy="22" rx="2" ry="9" fill="#fda4af" />
      <circle cx="50" cy="48" r="20" fill="#fafafa" stroke={SK} strokeWidth={SW} />
      <circle cx="42" cy="46" r="4" fill={SK} /><circle cx="58" cy="46" r="4" fill={SK} />
      <circle cx="43" cy="44" r="1.4" fill="#fff" /><circle cx="59" cy="44" r="1.4" fill="#fff" />
      <path d="M 48 54 L 52 54 L 50 57 Z" fill="#fda4af" stroke={SK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M 50 57 L 50 60 M 50 60 Q 46 62 44 60 M 50 60 Q 54 62 56 60" stroke={SK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 47 60 L 47 64 L 49 62 Z M 53 60 L 53 64 L 51 62 Z" fill="#fff" stroke={SK} strokeWidth="1" />
      <ellipse cx="50" cy="78" rx="14" ry="10" fill="#fafafa" stroke={SK} strokeWidth={SW} />
    </g>
  );
}

function E_Dragon() {
  return (
    <g>
      <path d="M 26 40 Q 6 28 4 14 Q 14 22 22 26 Q 18 32 26 40 Z" fill="#b91c1c" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 74 40 Q 94 28 96 14 Q 86 22 78 26 Q 82 32 74 40 Z" fill="#b91c1c" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <ellipse cx="50" cy="58" rx="22" ry="20" fill="#dc2626" stroke={SK} strokeWidth={SW} />
      <ellipse cx="50" cy="64" rx="12" ry="10" fill="#fef3c7" stroke={SK} strokeWidth="1.2" />
      <path d="M 38 36 L 34 26 L 42 32 Z" fill="#fef3c7" stroke={SK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 62 36 L 66 26 L 58 32 Z" fill="#fef3c7" stroke={SK} strokeWidth="1.5" strokeLinejoin="round" />
      <ellipse cx="42" cy="50" rx="4.5" ry="5" fill="#fde047" stroke={SK} strokeWidth="1.5" />
      <ellipse cx="58" cy="50" rx="4.5" ry="5" fill="#fde047" stroke={SK} strokeWidth="1.5" />
      <ellipse cx="42" cy="51" rx="1.5" ry="3" fill={SK} /><ellipse cx="58" cy="51" rx="1.5" ry="3" fill={SK} />
      <circle cx="46" cy="62" r="1.2" fill={SK} /><circle cx="54" cy="62" r="1.2" fill={SK} />
      <path d="M 40 68 Q 50 74 60 68" stroke={SK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M 45 68 L 45 73 L 47 70 Z M 55 68 L 55 73 L 53 70 Z" fill="#fff" stroke={SK} strokeWidth="1" />
      <path d="M 60 70 Q 76 72 82 78 Q 76 78 70 76 Q 78 82 82 88 Q 72 84 66 80 Q 70 86 68 92 Q 64 84 62 78 Z" fill="#fb923c" stroke={SK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M 64 74 Q 72 76 76 80 Q 70 78 66 78 Q 70 82 70 86 Q 66 82 64 78 Z" fill="#fde047" />
    </g>
  );
}

function E_Plant() {
  return (
    <g>
      <path d="M 30 78 L 70 78 L 66 96 L 34 96 Z" fill="#78350f" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <line x1="32" y1="82" x2="68" y2="82" stroke={SK} strokeWidth="1.2" />
      <path d="M 46 78 Q 44 60 50 50 Q 56 60 54 78 Z" fill="#15803d" stroke={SK} strokeWidth="1.6" />
      <path d="M 46 64 Q 32 60 28 70 Q 38 72 46 68 Z" fill="#22c55e" stroke={SK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 54 64 Q 68 60 72 70 Q 62 72 54 68 Z" fill="#22c55e" stroke={SK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 24 36 Q 24 18 50 16 Q 76 18 76 36 Q 76 50 50 50 Q 24 50 24 36 Z" fill="#86efac" stroke={SK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 24 36 Q 24 18 50 16 Q 76 18 76 36 L 70 36 Q 70 24 50 22 Q 30 24 30 36 Z" fill="#16a34a" stroke={SK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M 28 36 L 30 44 L 33 36 L 36 44 L 39 36 L 42 44 L 45 36 L 48 44 L 51 36 L 54 44 L 57 36 L 60 44 L 63 36 L 66 44 L 69 36 L 72 44 L 72 36 Z" fill="#fff" stroke={SK} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="42" cy="30" r="3" fill="#fff" stroke={SK} strokeWidth="1.2" />
      <circle cx="58" cy="30" r="3" fill="#fff" stroke={SK} strokeWidth="1.2" />
      <circle cx="42" cy="30" r="1.5" fill={SK} /><circle cx="58" cy="30" r="1.5" fill={SK} />
      <ellipse cx="50" cy="42" rx="6" ry="3" fill="#dc2626" stroke={SK} strokeWidth="1" />
    </g>
  );
}

function E_Wolf() {
  return (
    <g>
      <ellipse cx="50" cy="62" rx="26" ry="18" fill="#475569" stroke={SK} strokeWidth={SW} />
      <rect x="30" y="74" width="6" height="14" rx="2" fill="#475569" stroke={SK} strokeWidth="1.6" />
      <rect x="64" y="74" width="6" height="14" rx="2" fill="#475569" stroke={SK} strokeWidth="1.6" />
      <path d="M 76 58 Q 90 50 92 38 Q 86 50 80 58 Z" fill="#475569" stroke={SK} strokeWidth="1.6" strokeLinejoin="round" />
      <ellipse cx="36" cy="48" rx="20" ry="16" fill="#64748b" stroke={SK} strokeWidth={SW} />
      <path d="M 26 38 L 22 26 L 32 34 Z" fill="#475569" stroke={SK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 44 36 L 46 24 L 52 32 Z" fill="#475569" stroke={SK} strokeWidth="1.5" strokeLinejoin="round" />
      <ellipse cx="22" cy="54" rx="10" ry="7" fill="#94a3b8" stroke={SK} strokeWidth="1.6" />
      <circle cx="14" cy="52" r="2.5" fill={SK} />
      <ellipse cx="38" cy="46" rx="3" ry="3.5" fill="#fde047" stroke={SK} strokeWidth="1.3" />
      <circle cx="38" cy="47" r="1.3" fill={SK} />
      <path d="M 18 58 L 18 64 L 20 60 Z M 24 58 L 24 64 L 22 60 Z" fill="#fff" stroke={SK} strokeWidth="0.8" />
      <path d="M 14 58 Q 22 62 30 58" stroke={SK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

const ENEMY_RENDERERS: Record<string, () => React.ReactElement> = {
  slime: E_Slime, bat: E_Bat, mushroom: E_Mushroom, skeleton: E_Skeleton,
  ghost: E_Ghost, goblin: E_Goblin, eyeball: E_Eyeball, imp: E_Imp,
  spider: E_Spider, bunny: E_Bunny, dragon: E_Dragon, plant: E_Plant, wolf: E_Wolf,
};

export const ENEMY_KINDS = Object.keys(ENEMY_RENDERERS);

export function enemyKindFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return ENEMY_KINDS[hash % ENEMY_KINDS.length] ?? 'slime';
}

const FLOAT_KINDS = new Set(['ghost', 'bat', 'dragon']);

interface EnemySpriteProps { kind: string; size?: number; }

export function EnemySprite({ kind, size = 64 }: EnemySpriteProps) {
  const Renderer = ENEMY_RENDERERS[kind] ?? E_Slime;
  const anim = FLOAT_KINDS.has(kind) ? 'pf-float' : 'pf-wobble';
  return (
    <svg width={size} height={size} viewBox="0 0 100 100"
      style={{
        animation: `${anim} ${anim === 'pf-float' ? '1.8s' : '1.4s'} ease-in-out infinite`,
        filter: 'drop-shadow(0 3px 0 rgba(0,0,0,0.35))',
        overflow: 'visible',
      }}>
      <Renderer />
    </svg>
  );
}

/* ── Player Avatar ──────────────────────────────────────────── */

const ROLE_COLORS: Record<Role, string> = {
  defense: '#ff5577',
  repair: '#55c2ff',
  weapons: '#ffe066',
};

interface PlayerAvatarProps { role: Role; size?: number; }

export function PlayerAvatar({ role, size = 26 }: PlayerAvatarProps) {
  const color = ROLE_COLORS[role];
  return (
    <svg width={size} height={size} viewBox="0 0 30 30">
      <circle cx="15" cy="14" r="9" fill={color} stroke={SK} strokeWidth="1.6" />
      <path d="M 9 14 Q 15 18 21 14 L 21 18 Q 15 22 9 18 Z" fill="#fef3c7" stroke={SK} strokeWidth="1.2" />
      <circle cx="12" cy="16" r="0.9" fill={SK} />
      <circle cx="18" cy="16" r="0.9" fill={SK} />
      {role === 'defense' && <path d="M 4 11 L 7 11 L 7 16 L 5.5 18 L 4 16 Z" fill="#fbbf24" stroke={SK} strokeWidth="0.6" strokeLinejoin="round" />}
      {role === 'repair' && <path d="M 22 9 L 26 9 L 26 13 L 22 13 Z M 24 7 L 24 15" stroke={SK} strokeWidth="0.9" fill="none" strokeLinecap="round" />}
      {role === 'weapons' && <rect x="20" y="11" width="6" height="2" fill="#1f2937" stroke={SK} strokeWidth="0.6" />}
    </svg>
  );
}

/* ── Obstacles ─────────────────────────────────────────────── */

function ObsRock({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.35))' }}>
      <path d="M 16 70 Q 12 50 26 38 Q 40 26 56 30 Q 76 34 82 54 Q 86 72 70 80 Q 50 86 32 82 Q 18 78 16 70 Z" fill="#78645a" stroke={SK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M 22 56 Q 30 46 42 44 Q 38 52 30 58 Q 24 60 22 56 Z" fill="rgba(255,255,255,0.18)" />
      <path d="M 50 50 L 58 56 L 50 60 Z M 64 64 L 70 70 L 62 70 Z" fill="rgba(0,0,0,0.18)" />
      <path d="M 30 38 Q 36 32 44 36 Q 38 40 30 38 Z" fill="#65a30d" stroke={SK} strokeWidth="1" />
    </svg>
  );
}

function ObsCrystal({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 0 10px #22d3ee88) drop-shadow(0 3px 0 rgba(0,0,0,0.3))' }}>
      <path d="M 38 80 L 30 50 L 50 14 L 70 50 L 62 80 Z" fill="#22d3ee" stroke={SK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M 50 14 L 50 80 M 30 50 L 70 50" stroke={SK} strokeWidth="1.4" />
      <path d="M 50 14 L 38 80 L 30 50 Z" fill="rgba(255,255,255,0.25)" />
    </svg>
  );
}

function ObsBarrel({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 3px 0 rgba(0,0,0,0.3))' }}>
      <ellipse cx="50" cy="22" rx="22" ry="6" fill="#a8702a" stroke={SK} strokeWidth="2.2" />
      <path d="M 28 22 L 28 80 Q 50 88 72 80 L 72 22" fill="#7c4a1f" stroke={SK} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M 28 38 Q 50 42 72 38 M 28 60 Q 50 64 72 60" stroke={SK} strokeWidth="1.4" fill="none" />
      <path d="M 32 26 L 32 78 M 50 28 L 50 84 M 68 26 L 68 78" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
    </svg>
  );
}

interface ObstacleProps { kind?: string; size?: number; }

export function Obstacle({ kind = 'rock', size = 56 }: ObstacleProps) {
  if (kind === 'crystal') return <ObsCrystal size={size} />;
  if (kind === 'barrel') return <ObsBarrel size={size} />;
  return <ObsRock size={size} />;
}
