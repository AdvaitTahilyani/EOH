import { useEffect, useMemo, useState } from "react";
import BoardCanvas from "./components/BoardCanvas";
import { PIECE_LABELS, SIMULATION_STEP_MS } from "./gameConfig";
import { usePreviewAnalysis, useExhibitStore } from "./store";
import type { Cell, LeaderboardEntry, PieceType } from "./types";

type TrayPiece = Exclude<PieceType, "empty">;
type TutorialTarget = { row: number; col: number; piece: PieceType };
type TutorialFocus = "board" | "tray" | "readout" | "controls";
type IntroCard = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
};
type TutorialStep =
  | {
      id: "intro";
      title: string;
      body: string;
      task: string;
      hint: string;
      focus: TutorialFocus;
      ctaLabel: string;
    }
  | {
      id: "place-power" | "place-wires" | "place-switch" | "crowd-board" | "add-spacing";
      title: string;
      body: string;
      task: string;
      hint: string;
      focus: TutorialFocus;
      targets: TutorialTarget[];
    }
  | {
      id: "run-chip";
      title: string;
      body: string;
      task: string;
      hint: string;
      focus: TutorialFocus;
    }
  | {
      id: "complete";
      title: string;
      body: string;
      task: string;
      hint: string;
      focus: TutorialFocus;
      ctaLabel: string;
    };

const trayPieces: TrayPiece[] = ["power", "wire", "switch", "spacing"];
const introCards: IntroCard[] = [
  {
    id: "goal",
    eyebrow: "How To Play",
    title: "Your job is to build a circuit that works and stays cool.",
    body: "You are designing a tiny chip. To win, electricity needs to reach the switches without the board getting too hot.",
    bullets: ["Power starts the signal.", "Wires carry it.", "Switches are your targets."]
  },
  {
    id: "signal",
    eyebrow: "How Signal Works",
    title: "Electricity needs a connected path.",
    body: "Signals only move through touching parts. If a switch cannot connect back to a power piece, it will not turn on.",
    bullets: ["Empty spaces break the path.", "Lit borders show where signal can reach.", "More powered switches means a better score."]
  },
  {
    id: "heat",
    eyebrow: "How Heat Works",
    title: "Crowded circuits get hot.",
    body: "Packing too many parts together creates heat. Orange and red glow on the board means the layout is running hot.",
    bullets: ["Red glow means danger.", "The Hot Zone card warns you when heat is rising.", "Spacing pieces cool nearby parts."]
  }
];
const tutorialSteps: TutorialStep[] = [
  {
    id: "intro",
    title: "Mission 1: Wake up the board",
    body:
      "This board is like a tiny city for electricity. First you will make power, then guide the signal, then keep the whole circuit from overheating.",
    task: "Press Start Tutorial to begin the guided build.",
    hint: "You only learn one new idea at a time, so nothing rushes ahead.",
    focus: "controls",
    ctaLabel: "Start Tutorial"
  },
  {
    id: "place-power",
    title: "Mission 2: Add a power source",
    body:
      "Every circuit needs a place where energy starts. Power pieces are the batteries of this game. They send the signal into the board.",
    task: "Pick Power, then place it on the glowing square.",
    hint: "Power is the yellow part.",
    focus: "tray",
    targets: [{ row: 3, col: 1, piece: "power" }]
  },
  {
    id: "place-wires",
    title: "Mission 3: Build a path",
    body:
      "Signals cannot jump across empty space. Wires act like roads, carrying the signal from one part to the next.",
    task: "Place wires on the next two glowing squares.",
    hint: "A wire only helps when it touches the path.",
    focus: "board",
    targets: [
      { row: 3, col: 2, piece: "wire" },
      { row: 3, col: 3, piece: "wire" }
    ]
  },
  {
    id: "place-switch",
    title: "Mission 4: Turn something on",
    body:
      "A switch is the goal piece. If a switch can connect back to power through wires, it lights up and counts as working.",
    task: "Place a switch on the glowing square and watch Powered Switches update.",
    hint: "The live readout should show 1 powered switch when the path is complete.",
    focus: "readout",
    targets: [{ row: 3, col: 4, piece: "switch" }]
  },
  {
    id: "crowd-board",
    title: "Mission 5: See the heat problem",
    body:
      "Real circuits can get too hot when too many parts are packed together. In this game, crowding raises heat and makes your design less stable. Watch for red glow on the board and the Hot Zone warning on the right.",
    task: "Add wires to the three glowing squares until the crowded area starts glowing hot.",
    hint: "Red board glow plus a Danger Zone warning means the heat problem is real.",
    focus: "board",
    targets: [
      { row: 2, col: 3, piece: "wire" },
      { row: 4, col: 3, piece: "wire" },
      { row: 3, col: 5, piece: "wire" }
    ]
  },
  {
    id: "add-spacing",
    title: "Mission 6: Cool the hotspot",
    body:
      "Spacing pieces are like giving your parts room to breathe. They lower nearby heat, which helps the board stay stable. You should see the red danger signal calm down after placing one.",
    task: "Place spacing on the glowing square to cool the crowded area.",
    hint: "Watch the hot glow shrink and the Hot Zone card move away from danger.",
    focus: "board",
    targets: [{ row: 2, col: 4, piece: "spacing" }]
  },
  {
    id: "run-chip",
    title: "Mission 7: Test the circuit",
    body:
      "Now you have all the basics: power starts the signal, wires carry it, switches need a connection, and spacing helps with heat. Run the chip to watch the signal travel.",
    task: "Press Run Chip to test your first working circuit.",
    hint: "If the design stays cool enough and everything is connected, it should pass.",
    focus: "controls"
  },
  {
    id: "complete",
    title: "Tutorial Complete",
    body:
      "You have built a full mini circuit and fixed a heat problem. From here, try your own layouts and aim for high performance, high stability, and fewer wasted parts.",
    task: "Press Explore Freely to keep building on your own.",
    hint: "You can restart the tutorial anytime if you want another guided run.",
    focus: "controls",
    ctaLabel: "Explore Freely"
  }
];

function cellHasPiece(cells: Cell[], row: number, col: number, piece: PieceType) {
  return cells.some((cell) => cell.row === row && cell.col === col && cell.piece === piece);
}

function targetsPlaced(cells: Cell[], targets: TutorialTarget[]) {
  return targets.every((target) => cellHasPiece(cells, target.row, target.col, target.piece));
}

function heatStage(maxHeat: number) {
  if (maxHeat >= 8) {
    return {
      tone: "danger" as const,
      label: "Danger zone",
      message: "Parts are packed too tightly. Red glow means the board is close to overheating."
    };
  }
  if (maxHeat >= 6) {
    return {
      tone: "warning" as const,
      label: "Running hot",
      message: "Orange glow means heat is building up. Add spacing before it becomes a problem."
    };
  }
  return {
    tone: "safe" as const,
    label: "Cool enough",
    message: "The layout has breathing room. Cooler circuits are more stable."
  };
}

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
  const [systemStatus, setSystemStatus] = useState("Build a cool, stable chip.");
  const [tutorialActive, setTutorialActive] = useState(true);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [introCardIndex, setIntroCardIndex] = useState(0);

  const tutorialStep = tutorialSteps[tutorialStepIndex];
  const introCard = introCards[introCardIndex];
  const showingIntro = tutorialActive && tutorialStepIndex === 0;

  useEffect(() => {
    loadLeaderboard().then(setLeaderboard).catch(() => {
      setSystemStatus("Leaderboard offline. Local play still works.");
    });
  }, [setLeaderboard]);

  useEffect(() => {
    if (phase !== "running" || !latestRun) {
      return;
    }

    setSystemStatus("Simulation running...");
    const interval = window.setInterval(() => {
      const nextFrame = currentFrame + 1;
      if (nextFrame >= latestRun.frames.length) {
        window.clearInterval(interval);
        finishRun();
        setSystemStatus(latestRun.succeeded ? "Chip survived. Save your score." : "Chip failed. Tune the layout and try again.");
        return;
      }
      setCurrentFrame(nextFrame);
    }, SIMULATION_STEP_MS);

    return () => window.clearInterval(interval);
  }, [currentFrame, finishRun, latestRun, phase, setCurrentFrame]);

  const occupiedCount = useMemo(() => cells.filter((cell) => cell.piece !== "empty").length, [cells]);
  const tutorialTargets = "targets" in tutorialStep ? tutorialStep.targets : [];
  const tutorialStatus = tutorialActive ? `${tutorialStep.title} ${tutorialStep.task}` : systemStatus;
  const canRunChip = !tutorialActive || tutorialStep.id === "run-chip" || tutorialStep.id === "complete";
  const heatState = heatStage(preview.maxHeat);
  const heatMeterValue = Math.min(100, preview.maxHeat * 10);
  const poweredSwitchPercent = preview.switchCount === 0 ? 0 : Math.round((preview.poweredSwitches / preview.switchCount) * 100);

  useEffect(() => {
    if (!tutorialActive) {
      return;
    }

    if (tutorialStep.id === "place-power" && targetsPlaced(cells, tutorialStep.targets)) {
      setTutorialStepIndex(2);
      return;
    }

    if (tutorialStep.id === "place-wires" && targetsPlaced(cells, tutorialStep.targets)) {
      setTutorialStepIndex(3);
      return;
    }

    if (
      tutorialStep.id === "place-switch" &&
      targetsPlaced(cells, tutorialStep.targets) &&
      preview.poweredSwitches >= 1
    ) {
      setTutorialStepIndex(4);
      return;
    }

    if (tutorialStep.id === "crowd-board" && targetsPlaced(cells, tutorialStep.targets) && preview.maxHeat >= 8) {
      setTutorialStepIndex(5);
      return;
    }

    if (tutorialStep.id === "add-spacing" && targetsPlaced(cells, tutorialStep.targets) && preview.maxHeat <= 7) {
      setTutorialStepIndex(6);
      return;
    }

    if (tutorialStep.id === "run-chip" && phase === "results" && latestRun?.succeeded) {
      setTutorialStepIndex(7);
    }
  }, [cells, latestRun, phase, preview.maxHeat, preview.poweredSwitches, tutorialActive, tutorialStep]);

  useEffect(() => {
    if (!tutorialActive || !("targets" in tutorialStep) || tutorialStep.targets.length === 0) {
      return;
    }
    setActivePiece(tutorialStep.targets[0].piece);
  }, [setActivePiece, tutorialActive, tutorialStep]);

  const startTutorial = () => {
    clearBoard();
    setActivePiece("power");
    setTutorialActive(true);
    setTutorialStepIndex(1);
    setIntroCardIndex(0);
    setSystemStatus("Follow the tutorial cards to build your first circuit.");
  };

  const exitTutorial = () => {
    setTutorialActive(false);
    setSystemStatus("Tutorial finished. Build any circuit you want.");
  };

  const resetBoardAction = () => {
    clearBoard();
    if (tutorialActive) {
      setTutorialStepIndex(0);
      setIntroCardIndex(0);
      setActivePiece("wire");
      setSystemStatus("Tutorial reset. Start again when you are ready.");
      return;
    }
    setSystemStatus("Board reset. Build another chip.");
  };

  const runChip = () => {
    if (!canRunChip) {
      setSystemStatus("Finish the current tutorial mission before running the chip.");
      return;
    }
    if (occupiedCount === 0) {
      setSystemStatus("Place some parts on the chip before running it.");
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
    setSystemStatus("Score saved. Reset to build another chip.");
  };

  const handleTutorialBlockedPlacement = (piece: PieceType) => {
    if (!tutorialActive || !tutorialTargets.length) {
      return;
    }

    const expectedPiece = tutorialTargets[0]?.piece;
    if (piece !== expectedPiece) {
      setSystemStatus(`This step uses ${PIECE_LABELS[expectedPiece as TrayPiece]}. ${tutorialStep.hint}`);
      return;
    }

    setSystemStatus(`Use one of the glowing squares. ${tutorialStep.hint}`);
  };

  const allowTutorialPlacement = (row: number, col: number, piece: PieceType) => {
    if (!tutorialActive || !tutorialTargets.length) {
      return true;
    }

    return tutorialTargets.some((target) => target.row === row && target.col === col && target.piece === piece);
  };

  return (
    <main className="app-shell">
      <section className={`hero-panel ${tutorialStep.focus === "controls" && tutorialActive ? "tutorial-focus" : ""}`}>
        <div>
          <p className="eyebrow">Interactive Exhibit</p>
          <h1>Build a tiny chip that can survive the heat.</h1>
          <p className="lede">
            Drag parts onto the grid, watch heat and signal flow update live, then run your design and chase the
            leaderboard.
          </p>
          <div className="hero-facts">
            <div className="hero-fact">
              <span>Goal</span>
              <strong>Power every switch</strong>
            </div>
            <div className={`hero-fact hero-fact-${heatState.tone}`}>
              <span>Heat</span>
              <strong>{heatState.label}</strong>
            </div>
            <div className="hero-fact">
              <span>Mode</span>
              <strong>{tutorialActive ? tutorialStep.title : "Free build"}</strong>
            </div>
          </div>
        </div>
        <div className="hero-actions">
          <button className="action-button primary" onClick={runChip} disabled={phase === "running" || !canRunChip}>
            Run Chip
          </button>
          <button className="action-button secondary" onClick={resetBoardAction}>
            Reset Board
          </button>
        </div>
      </section>

      <section className={`panel tutorial-panel ${tutorialActive ? "tutorial-live" : ""}`}>
        <div className="tutorial-kicker">
          <span>{showingIntro ? "Before You Begin" : "Guided Tutorial"}</span>
          <strong>
            {showingIntro ? `Screen ${introCardIndex + 1}/${introCards.length}` : `Step ${tutorialStepIndex + 1}/${tutorialSteps.length}`}
          </strong>
        </div>
        {showingIntro ? (
          <>
            <div className="tutorial-progress">
              {introCards.map((card, index) => (
                <span
                  key={card.id}
                  className={`tutorial-dot ${index === introCardIndex ? "active" : ""} ${index < introCardIndex ? "done" : ""}`}
                />
              ))}
            </div>
            <div className="intro-layout">
              <div className="intro-card">
                <p className="eyebrow">{introCard.eyebrow}</p>
                <h2>{introCard.title}</h2>
                <p>{introCard.body}</p>
              </div>
              <div className="intro-points">
                {introCard.bullets.map((bullet) => (
                  <div key={bullet} className="intro-point">
                    <span className="intro-point-mark" />
                    <p>{bullet}</p>
                  </div>
                ))}
              </div>
              <div className="tutorial-actions">
                <button
                  className="action-button secondary"
                  onClick={() => setIntroCardIndex((index) => Math.max(0, index - 1))}
                  disabled={introCardIndex === 0}
                >
                  Back
                </button>
                {introCardIndex < introCards.length - 1 ? (
                  <button className="action-button primary" onClick={() => setIntroCardIndex((index) => index + 1)}>
                    Next
                  </button>
                ) : (
                  <button className="action-button primary" onClick={startTutorial}>
                    Start Tutorial
                  </button>
                )}
                <button className="action-button ghost" onClick={exitTutorial}>
                  Skip Tutorial
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="tutorial-progress">
              {tutorialSteps.map((step, index) => (
                <span
                  key={step.id}
                  className={`tutorial-dot ${index === tutorialStepIndex ? "active" : ""} ${index < tutorialStepIndex ? "done" : ""}`}
                />
              ))}
            </div>
            <div className="tutorial-layout">
              <div className="tutorial-copy">
                <h2>{tutorialStep.title}</h2>
                <p>{tutorialStep.body}</p>
              </div>
              <div className="tutorial-task">
                <strong>What to do now</strong>
                <p>{tutorialStep.task}</p>
                <small>{tutorialStep.hint}</small>
              </div>
              <div className="tutorial-actions">
                {tutorialStep.id === "complete" ? (
                  <button className="action-button primary" onClick={exitTutorial}>
                    {tutorialStep.ctaLabel}
                  </button>
                ) : (
                  <button className="action-button secondary" onClick={startTutorial}>
                    Restart Tutorial
                  </button>
                )}
                {tutorialActive && tutorialStep.id !== "complete" ? (
                  <button className="action-button ghost" onClick={exitTutorial}>
                    Skip Tutorial
                  </button>
                ) : null}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="content-grid">
        <div className="left-column">
          <div className={`panel board-panel ${tutorialStep.focus === "board" && tutorialActive ? "tutorial-focus" : ""}`}>
            <div className="panel-header">
              <div>
                <h2>Chip Grid</h2>
                <p>Drop a part on any square. Use spacing to cool hot zones.</p>
              </div>
              <div className="status-pill">{tutorialStatus}</div>
            </div>
            <BoardCanvas
              highlightedCells={tutorialTargets}
              canPlace={allowTutorialPlacement}
              onBlockedPlacement={handleTutorialBlockedPlacement}
            />
            <div className="board-legend">
              <LegendSwatch tone="signal" label="Lit border = signal path" />
              <LegendSwatch tone="heat" label="Orange or red glow = heat" />
              <LegendSwatch tone="target" label="Mint box = tutorial target" />
            </div>
          </div>

          <div className={`panel tray-panel ${tutorialStep.focus === "tray" && tutorialActive ? "tutorial-focus" : ""}`}>
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
                  <div className={`tray-badge ${piece}`}>{piece === "power" ? "P" : piece === "wire" ? "W" : piece === "switch" ? "S" : "+"}</div>
                  <span>{PIECE_LABELS[piece]}</span>
                  <small>{piece === "spacing" ? "Cools nearby parts" : piece === "power" ? "Starts signal flow" : piece === "switch" ? "Needs power to score" : "Carries signal"}</small>
                </button>
              ))}
              <button className="tray-card erase-card" onClick={() => setActivePiece("empty")}>
                <div className="tray-badge empty">X</div>
                <span>Eraser</span>
                <small>Click a square after selecting Eraser.</small>
              </button>
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className={`panel metrics-panel ${tutorialStep.focus === "readout" && tutorialActive ? "tutorial-focus" : ""}`}>
            <div className="panel-header">
              <div>
                <h2>Live Readout</h2>
                <p>Colors on the board and these meters update while you design.</p>
              </div>
            </div>
            <div className="meter-list">
              <Meter label="Powered Switches" value={poweredSwitchPercent} accent="signal" detail={`${preview.poweredSwitches}/${preview.switchCount} online`} />
              <Meter label="Stability" value={preview.stability} accent="stability" />
              <Meter label="Heat Pressure" value={heatMeterValue} accent="heat" detail={`Peak heat ${preview.maxHeat}`} />
            </div>
            <div className={`heat-callout ${heatState.tone}`}>
              <div>
                <span className="heat-callout-label">Hot Zone</span>
                <strong>{heatState.label}</strong>
              </div>
              <p>{heatState.message}</p>
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

function Meter({
  label,
  value,
  accent,
  detail
}: {
  label: string;
  value: number;
  accent: "signal" | "stability" | "heat";
  detail?: string;
}) {
  return (
    <div className="meter">
      <div className="meter-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="meter-track">
        <div className={`meter-fill ${accent}`} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
      {detail ? <small className="meter-detail">{detail}</small> : null}
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

function LegendSwatch({ tone, label }: { tone: "signal" | "heat" | "target"; label: string }) {
  return (
    <div className="legend-item">
      <span className={`legend-swatch ${tone}`} />
      <small>{label}</small>
    </div>
  );
}
