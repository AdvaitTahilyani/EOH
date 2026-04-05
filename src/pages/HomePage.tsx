type Route = "/" | "/tutorial" | "/arcade" | "/time-trial";

export default function HomePage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  return (
    <main className="app-shell home-shell">
      <section className="hero-panel landing-panel">
        <div className="landing-copy">
          <p className="eyebrow">Interactive Exhibit</p>
          <h1>Build a tiny chip that can survive the heat.</h1>
          <p className="lede">
            Design a miniature circuit, keep the signal flowing, and stop the board from overheating.
          </p>
        </div>
        <div className="landing-actions">
          <button className="action-button primary" onClick={() => onNavigate("/tutorial")}>
            Tutorial
          </button>
          <button className="action-button secondary" onClick={() => onNavigate("/arcade")}>
            Arcade
          </button>
          <button className="action-button secondary" onClick={() => onNavigate("/time-trial")}>
            Time Trial
          </button>
        </div>
      </section>
    </main>
  );
}
