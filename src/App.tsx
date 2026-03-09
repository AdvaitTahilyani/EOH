import { useEffect, useMemo, useState } from "react";
import BoardCanvas from "./components/BoardCanvas";
import { PIECE_LABELS, SIMULATION_STEP_MS } from "./gameConfig";
import { usePreviewAnalysis, useExhibitStore } from "./store";
import type { LeaderboardEntry, PieceType } from "./types";

type TrayPiece = Exclude<PieceType, "empty">;

const trayPieces: TrayPiece[] = ["power", "wire", "switch", "spacing"];

async function loadLeaderboard() {
  const response = await fetch("/api/leaderboard");
  if (!response.ok) {
    throw new Error("Failed to load leaderboard");
  }
  return (await response.json()) as LeaderboardEntry[];
}

async function submitScore(entry: { name: string; total: number; performance: number; efficiency: number; stability: number }) {
  const response = await fetch("/api/scores", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(entry)
  });

  if (!response.ok) {
    throw new Error("Failed to save score");
  }

  return (await response.json()) as LeaderboardEntry[];
}

export default function App() {
  const preview = usePreviewAnalysis();
  const cells = useExhibitStore((state) => state.cells);
  const activePiece = useExhibitStore((state) => state.activePiece);
  const phase = useExhibitStore((state) => state.phase);
  const currentFrame = useExhibitStore((state) => state.currentFrame);
  const latestRun = useExhibitStore((state) => state.latestRun);
  const leaderboard = useExhibitStore((state) => state.leaderboard);
  const playerName = useExhibitStore((state) => state.playerName);
  const setActivePiece = useExhibitStore((state) => state.setActivePiece);
  const clearBoard = useExhibitStore((state) => state.clearBoard);
  const runSimulation = useExhibitStore((state) => state.runSimulation);
  const setCurrentFrame = useExhibitStore((state) => state.setCurrentFrame);
  const finishRun = useExhibitStore((state) => state.finishRun);
  const setLeaderboard = useExhibitStore((state) => state.setLeaderboard);
  const setPlayerName = useExhibitStore((state) => state.setPlayerName);
  const [status, setStatus] = useState("Build a cool, stable chip.");

  useEffect(() => {
    loadLeaderboard().then(setLeaderboard).catch(() => {
      setStatus("Leaderboard offline. Local play still works.");
    });
  }, [setLeaderboard]);

  useEffect(() => {
    if (phase !== "running" || !latestRun) {
      return;
    }

    setStatus("Simulation running...");
    const interval = window.setInterval(() => {
      const nextFrame = currentFrame + 1;
      if (nextFrame >= latestRun.frames.length) {
        window.clearInterval(interval);
        finishRun();
        setStatus(latestRun.succeeded ? "Chip survived. Save your score." : "Chip failed. Tune the layout and try again.");
        return;
      }
      setCurrentFrame(nextFrame);
    }, SIMULATION_STEP_MS);

    return () => window.clearInterval(interval);
  }, [currentFrame, finishRun, latestRun, phase, setCurrentFrame]);

  const occupiedCount = useMemo(() => cells.filter((cell) => cell.piece !== "empty").length, [cells]);

  const runChip = () => {
    if (occupiedCount === 0) {
      setStatus("Place some parts on the chip before running it.");
      return;
    }
    runSimulation();
  };

  const saveScore = async () => {
    if (!latestRun) {
      return;
    }
    const updated = await submitScore({
      name: playerName || "GUEST",
      ...latestRun.score
    });
    setLeaderboard(updated);
    setStatus("Score saved. Reset to build another chip.");
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Interactive Exhibit</p>
          <h1>Build a tiny chip that can survive the heat.</h1>
          <p className="lede">
            Drag parts onto the grid, watch heat and signal flow update live, then run your design and chase the
            leaderboard.
          </p>
        </div>
        <div className="hero-actions">
          <button className="action-button primary" onClick={runChip} disabled={phase === "running"}>
            Run Chip
          </button>
          <button className="action-button secondary" onClick={clearBoard}>
            Reset Board
          </button>
        </div>
      </section>

      <section className="content-grid">
        <div className="left-column">
          <div className="panel board-panel">
            <div className="panel-header">
              <div>
                <h2>Chip Grid</h2>
                <p>Drop a part on any square. Use spacing to cool hot zones.</p>
              </div>
              <div className="status-pill">{status}</div>
            </div>
            <BoardCanvas />
          </div>

          <div className="panel tray-panel">
            <div className="panel-header">
              <div>
                <h2>Parts Tray</h2>
                <p>Drag from here to the grid, or select one for repeat placement.</p>
              </div>
            </div>
            <div className="tray-grid">
              {trayPieces.map((piece) => (
                <button
                  key={piece}
                  className={`tray-card ${activePiece === piece ? "selected" : ""}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", piece);
                    setActivePiece(piece);
                  }}
                  onClick={() => setActivePiece(piece)}
                >
                  <span>{PIECE_LABELS[piece]}</span>
                  <small>{piece === "spacing" ? "Cools nearby parts" : piece === "power" ? "Starts signal flow" : piece === "switch" ? "Needs power to score" : "Carries signal"}</small>
                </button>
              ))}
              <button className="tray-card erase-card" onClick={() => setActivePiece("empty")}>
                <span>Eraser</span>
                <small>Click a square after selecting Eraser.</small>
              </button>
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className="panel metrics-panel">
            <div className="panel-header">
              <div>
                <h2>Live Readout</h2>
                <p>Colors on the board and these meters update while you design.</p>
              </div>
            </div>
            <div className="meter-list">
              <Meter label="Powered Switches" value={preview.switchCount === 0 ? 0 : Math.round((preview.poweredSwitches / preview.switchCount) * 100)} accent="signal" />
              <Meter label="Stability" value={preview.stability} accent="stability" />
              <Meter label="Heat Pressure" value={Math.min(100, preview.maxHeat * 10)} accent="heat" />
            </div>
            <div className="stats-grid">
              <Stat label="Parts placed" value={occupiedCount} />
              <Stat label="Power nodes" value={preview.powerCount} />
              <Stat label="Switches online" value={`${preview.poweredSwitches}/${preview.switchCount}`} />
              <Stat label="Crowded cells" value={preview.crowdedCells} />
            </div>
          </div>

          <div className="panel results-panel">
            <div className="panel-header">
              <div>
                <h2>Run Results</h2>
                <p>When the simulation ends, save your best score.</p>
              </div>
            </div>
            {latestRun ? (
              <>
                <div className="score-line">
                  <strong>{latestRun.score.total}</strong>
                  <span>Total score</span>
                </div>
                <div className="score-breakdown">
                  <Stat label="Performance" value={latestRun.score.performance} />
                  <Stat label="Efficiency" value={latestRun.score.efficiency} />
                  <Stat label="Stability" value={latestRun.score.stability} />
                </div>
                <div className="failure-list">
                  {latestRun.failures.length === 0 ? (
                    <p>No failures detected.</p>
                  ) : (
                    latestRun.failures.slice(0, 5).map((failure, index) => (
                      <p key={`${failure.row}-${failure.col}-${index}`}>
                        {failure.reason} at row {failure.row + 1}, col {failure.col + 1}
                      </p>
                    ))
                  )}
                </div>
                <div className="save-row">
                  <input
                    className="name-input"
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value.replace(/[^a-z0-9]/gi, ""))}
                    maxLength={10}
                    placeholder="NAME"
                  />
                  <button className="action-button primary" onClick={() => void saveScore()} disabled={phase !== "results"}>
                    Save Score
                  </button>
                </div>
              </>
            ) : (
              <p className="placeholder-copy">No run yet. Design a chip, then press Run Chip.</p>
            )}
          </div>

          <div className="panel leaderboard-panel">
            <div className="panel-header">
              <div>
                <h2>Leaderboard</h2>
                <p>Top local scores on this kiosk.</p>
              </div>
            </div>
            <div className="leaderboard-list">
              {leaderboard.length === 0 ? (
                <p className="placeholder-copy">No scores saved yet.</p>
              ) : (
                leaderboard.map((entry, index) => (
                  <div key={entry.id} className="leaderboard-row">
                    <span>#{index + 1}</span>
                    <strong>{entry.name}</strong>
                    <span>{entry.total}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Meter({ label, value, accent }: { label: string; value: number; accent: "signal" | "stability" | "heat" }) {
  return (
    <div className="meter">
      <div className="meter-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="meter-track">
        <div className={`meter-fill ${accent}`} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
