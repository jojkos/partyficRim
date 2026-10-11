import type { DisplaySnapshot } from "@partyficrim/shared";
import { ROLE_COLOR } from "../ui/art.js";
import { PlayerAvatar } from "./Sprites.js";
import { STATIONS } from "../ui/stations.js";
export function HudBar({ snap }: { snap: DisplaySnapshot }) {
  const seconds = Math.floor(snap.elapsedMs / 1000),
    time = `${Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
  return (
    <header className="hud">
      <div className="hud-title">
        <div>
          <div className="wordmark">
            partyfic<span>RIM</span>
          </div>
          <small>Crew {snap.roomCode} · One robot, three pilots</small>
        </div>
      </div>
      <div className="hud-crew">
        {STATIONS.map((r) => (
          <span
            key={r}
            className={!snap.roleClaims[r] ? "missing" : ""}
            style={{ color: ROLE_COLOR[r] }}
          >
            <PlayerAvatar role={r} size={23} />
            {r[0]!.toUpperCase() + r.slice(1)}
            {!snap.roleClaims[r] ? " · Away" : ""}
          </span>
        ))}
      </div>
      <div className="hud-health" aria-label="Quadrant health">
        {([0, 1, 2, 3] as const).map((q) => (
          <div className="health-chip" key={q}>
            <span>{["NW", "NE", "SW", "SE"][q]}</span>
            <strong>{snap.quadrantHp[q]}%</strong>
            <div className="health-track">
              <i
                style={{
                  width: `${snap.quadrantHp[q]}%`,
                  background:
                    snap.quadrantHp[q] < 30 ? "var(--pink)" : "var(--green)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="hud-stat">
        <small>Enemies</small>
        <strong>{snap.enemies.length}</strong>
      </div>
      <div className="hud-stat">
        <small>Survived</small>
        <strong data-testid="survival-time">{time}</strong>
      </div>
    </header>
  );
}
