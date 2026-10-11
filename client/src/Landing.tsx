import { useEffect } from "react";
import { audio } from "./audio/engine.js";
import { Link } from "react-router-dom";
import { Robot, EnemySprite } from "./display/Sprites.js";
import { MuteButton } from "./audio/MuteButton.js";
export function Landing() {
  useEffect(() => {
    audio.music("menu");
    return () => audio.music(null);
  }, []);
  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <Link className="wordmark" to="/">
            partyfic<span>RIM</span>
          </Link>
          <MuteButton />
        </header>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">A little robot. A whole crew.</span>
            <h1>
              Three pilots.
              <br />
              One <em>big adventure.</em>
            </h1>
            <p>
              Steer, shield, repair and blast your way through the arena. Your
              phones are the controls. Teamwork does the rest.
            </p>
            <div className="hero-actions">
              <Link className="action-card" to="/display?new=1">
                <strong>Host a game ↗</strong>
                <small>Put the arena on a big screen</small>
              </Link>
              <Link className="action-card join" to="/play">
                <strong>Join the crew ↗</strong>
                <small>Use your phone as a controller</small>
              </Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-orbit" />
            <div className="main-robot">
              <Robot size={310} />
            </div>
            <div className="hero-enemy one">
              <EnemySprite kind="slime" size={130} />
            </div>
            <div className="hero-enemy two">
              <EnemySprite kind="bat" size={115} />
            </div>
            <div className="hero-badge">Small robot. Big crew energy.</div>
          </div>
        </section>
        <footer className="how-strip">
          <span>
            <b>01</b> Open the arena on one screen
          </span>
          <span>
            <b>02</b> Connect three phones
          </span>
          <span>
            <b>03</b> Pick your stations & play
          </span>
        </footer>
      </div>
    </main>
  );
}
