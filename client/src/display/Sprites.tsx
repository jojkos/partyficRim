import type { Role } from "@partyficrim/shared";
import { artUrl, ROLE_COLOR } from "../ui/art.js";
export { ENEMY_KINDS, enemyKindFromId } from "../ui/art.js";
export function Robot({
  size = 120,
}: {
  size?: number;
  glow?: string;
  bodyColor?: string;
}) {
  return (
    <img
      className="character-art"
      src={artUrl("robot")}
      width={size}
      height={size}
      alt="Our little crew robot"
      draggable={false}
    />
  );
}
export function EnemySprite({
  kind,
  size = 64,
}: {
  kind: string;
  size?: number;
}) {
  return (
    <img
      className="character-art"
      src={artUrl(kind)}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}
export function PlayerAvatar({
  role,
  size = 28,
}: {
  role: Role;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="24"
        height="24"
        rx="10"
        fill={ROLE_COLOR[role]}
        stroke="#27243c"
        strokeWidth="2"
      />
      <rect x="7" y="11" width="18" height="10" rx="5" fill="#38384e" />
      <path
        d="M11 16h2m6 0h2"
        stroke="#fff0d9"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Obstacle({ size = 56 }: { kind: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60">
      <rect
        x="5"
        y="7"
        width="50"
        height="44"
        rx="9"
        fill="#747287"
        stroke="#353449"
        strokeWidth="3"
      />
      <path d="M12 16h35M15 40h28" stroke="#9793a5" strokeWidth="3" />
    </svg>
  );
}
