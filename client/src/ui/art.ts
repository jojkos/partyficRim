// Shared vector artwork: the same assets are used in menus and the canvas scene.
export const ROLE_COLOR = {
  defense: "#ff8ca4",
  repair: "#a9d87c",
  weapons: "#ffd477",
} as const;
export const ENEMY_KINDS = [
  "slime",
  "bat",
  "mushroom",
  "ghost",
  "bunny",
] as const;
const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 100 100"><g stroke="#27243c" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
const eyes = (y = 53) =>
  `<ellipse cx="39" cy="${y}" rx="5.5" ry="7" fill="#fff5dc"/><ellipse cx="61" cy="${y}" rx="5.5" ry="7" fill="#fff5dc"/><ellipse cx="40" cy="${y + 1}" rx="2.1" ry="3" fill="#27243c" stroke="none"/><ellipse cx="62" cy="${y + 1}" rx="2.1" ry="3" fill="#27243c" stroke="none"/><path d="M44 ${y + 15} Q50 ${y + 19} 57 ${y + 14}" fill="none" stroke-width="2"/>`;
export const ART: Record<string, string> = {
  robot: wrap(
    `<path d="M49 23V13" fill="none"/><circle cx="49" cy="10" r="4" fill="#ff9c80"/><rect x="26" y="67" width="18" height="23" rx="7" fill="#454660"/><rect x="56" y="67" width="18" height="23" rx="7" fill="#454660"/><path d="M30 84h10m20 0h10" stroke="#9298a9" stroke-width="2"/><rect x="13" y="49" width="13" height="25" rx="6" fill="#accb85"/><rect x="74" y="49" width="13" height="25" rx="6" fill="#accb85"/><rect x="25" y="44" width="50" height="36" rx="12" fill="#accb85"/><path d="M30 62v7q0 6 7 6h28" fill="none" stroke="#7eaa6b" stroke-width="6"/><path d="M31 52h11" stroke="#e6efc7" stroke-width="3"/><circle cx="50" cy="63" r="10" fill="#47485f"/><circle cx="50" cy="63" r="5.5" fill="#8ae4d5" stroke="none"/><circle cx="48" cy="61" r="1.8" fill="#fff8e6" stroke="none"/><rect x="24" y="22" width="52" height="32" rx="11" fill="#c7dda1"/><path d="M31 27h17" stroke="#eff4cf" stroke-width="3"/><rect x="30" y="31" width="40" height="17" rx="7" fill="#31364e" stroke-width="2"/><path d="M36 40q3-5 7 0m14 0q3-5 7 0" stroke="#a1f2e6" stroke-width="3.5" fill="none"/><path d="M46 43q4 3 8 0" stroke="#a1f2e6" stroke-width="1.3" fill="none"/><circle cx="32" cy="72" r="1.5" fill="#47485f" stroke="none"/><circle cx="68" cy="72" r="1.5" fill="#47485f" stroke="none"/>`,
  ),
  slime: wrap(
    `<path d="M19 75Q15 52 29 38Q43 24 57 33Q81 31 82 61L80 77Q75 85 66 80Q58 85 49 81Q39 86 30 81Q23 85 19 75Z" fill="#aac979"/><path d="M23 71Q45 81 76 72" stroke="#83aa63" stroke-width="5" fill="none"/><path d="M29 43q4-6 11-7" stroke="#dae8af" stroke-width="4" fill="none"/>${eyes(53)}`,
  ),
  bat: wrap(
    `<path d="M35 51Q18 31 7 40L15 51L8 59Q26 54 37 65M65 51Q82 31 93 40L85 51L92 59Q74 54 63 65" fill="#ae9bcf"/><path d="M36 41L32 21L47 33L56 32L69 21L65 44" fill="#c4ade4"/><ellipse cx="50" cy="56" rx="21" ry="27" fill="#b99fd7"/>${eyes(51)}<path d="M47 68v6l4-5" fill="#fff5dc" stroke-width="1.5"/>`,
  ),
  mushroom: wrap(
    `<path d="M35 50h31v26q-16 13-31 0Z" fill="#f3dfbd"/><path d="M17 50Q18 19 48 18Q79 19 83 50Q52 64 17 50Z" fill="#e69b96"/><ellipse cx="34" cy="35" rx="7" ry="5" fill="#fff0ca" stroke="none"/><ellipse cx="62" cy="31" rx="6" ry="4" fill="#fff0ca" stroke="none"/>${eyes(64)}`,
  ),
  ghost: wrap(
    `<path d="M22 78V46Q22 20 50 20Q78 20 78 46V79l-10-7-9 8-10-7-10 8-9-8Z" fill="#dfdbec"/><path d="M29 43q0-12 9-15" stroke="#fff5e7" stroke-width="4" fill="none"/>${eyes(49)}`,
  ),
  bunny: wrap(
    `<path d="M32 41Q19 5 31 6Q43 6 43 37M56 37Q60 4 71 9Q80 14 66 45" fill="#e5d3af"/><path d="M33 30l-3-14m34 15 4-13" stroke="#e4aaab" stroke-width="4"/><ellipse cx="50" cy="59" rx="28" ry="25" fill="#ecdcbc"/>${eyes(53)}<path d="M48 67v7h5v-7" fill="#fff5dc" stroke-width="1.3"/>`,
  ),
};
export function artUrl(kind: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(ART[kind] ?? ART.slime!)}`;
}
export function enemyKindFromId(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ENEMY_KINDS[h % ENEMY_KINDS.length]!;
}
