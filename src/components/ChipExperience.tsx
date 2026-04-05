import { useEffect, useMemo, useState } from "react";
import BoardCanvas from "./BoardCanvas";
import { arcadeLevels } from "../arcadeLevels";
import { PIECE_LABELS, SIMULATION_STEP_MS } from "../gameConfig";
import { usePreviewAnalysis, useExhibitStore } from "../store";
import type { ArcadeLevel, Cell, LeaderboardEntry, PieceType, SimulationResult } from "../types";

type TrayPiece = Exclude<PieceType, "empty">;
type TutorialTarget = { row: number; col: number; piece: PieceType };
type TutorialFocus = "board" | "tray" | "readout" | "controls";
type Route = "/" | "/tutorial" | "/arcade" | "/time-trial";
type ExperienceMode = "tutorial" | "arcade" | "time-trial";
type IntroCard = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  visual: {
    cells: TutorialTarget[];
    highlighted?: Array<{ row: number; col: number; tone: "signal" | "heat" | "cool" | "goal" }>;
    caption: string;
  };
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

const trayPieces: TrayPiece[] = ["power", "wire", "switch", "spacing", "heatsink"];
const introCards: IntroCard[] = [
  {
    id: "goal",
    eyebrow: "How To Play",
    title: "Your job is to build a circuit that works and stays cool.",
    body: "Think of the board like a tiny city for electricity. Your goal is to build a path from power to each switch without creating dangerous hot spots.",
    bullets: ["Start with a power piece.", "Use wires to build the path.", "Reach the switch to make it turn on."],
    visual: {
      cells: [
        { row: 3, col: 1, piece: "power" },
        { row: 3, col: 2, piece: "wire" },
        { row: 3, col: 3, piece: "wire" },
        { row: 3, col: 4, piece: "switch" }
      ],
      highlighted: [
        { row: 3, col: 1, tone: "signal" },
        { row: 3, col: 2, tone: "signal" },
        { row: 3, col: 3, tone: "signal" },
        { row: 3, col: 4, tone: "goal" }
      ],
      caption: "This is a working path: power travels through the wires and reaches the switch."
    }
  },
  {
    id: "signal",
    eyebrow: "How Signal Works",
    title: "Electricity needs a connected path.",
    body: "Signals only move through parts that touch. If there is a gap in the route, electricity stops there and the switch stays off.",
    bullets: ["Touching parts carry signal.", "Empty spaces break the connection.", "Lit outlines show where power can reach."],
    visual: {
      cells: [
        { row: 3, col: 1, piece: "power" },
        { row: 3, col: 2, piece: "wire" },
        { row: 3, col: 4, piece: "wire" },
        { row: 3, col: 5, piece: "switch" }
      ],
      highlighted: [
        { row: 3, col: 1, tone: "signal" },
        { row: 3, col: 2, tone: "signal" },
        { row: 3, col: 5, tone: "goal" }
      ],
      caption: "The gap breaks the route, so the switch on the right does not receive power."
    }
  },
  {
    id: "heat",
    eyebrow: "How Heat Works",
    title: "Crowded circuits get hot.",
    body: "Packing too many parts close together raises heat. Orange and red squares mean the layout is running hot, and spacing pieces help cool the area down.",
    bullets: ["Orange means heat is building.", "Red means the area is in danger.", "Spacing lowers heat around crowded parts."],
    visual: {
      cells: [
        { row: 3, col: 2, piece: "power" },
        { row: 2, col: 3, piece: "wire" },
        { row: 3, col: 3, piece: "wire" },
        { row: 4, col: 3, piece: "wire" },
        { row: 3, col: 4, piece: "switch" },
        { row: 2, col: 4, piece: "spacing" }
      ],
      highlighted: [
        { row: 2, col: 3, tone: "heat" },
        { row: 3, col: 3, tone: "heat" },
        { row: 4, col: 3, tone: "heat" },
        { row: 2, col: 4, tone: "cool" }
      ],
      caption: "The crowded center is heating up, and the spacing piece helps cool the hotspot."
    }
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
  if (maxHeat >= 7) {
    return {
      tone: "danger" as const,
      label: "Danger zone",
      message: "This area is too crowded. Spread parts out or add spacing before the board overheats."
    };
  }
  if (maxHeat >= 5) {
    return {
      tone: "warning" as const,
      label: "Crowded",
      message: "Heat is building because several active parts are packed together. Add room or place spacing nearby."
    };
  }
  return {
    tone: "safe" as const,
    label: "Comfortable",
    message: "Small or spread-out layouts stay cool. Heat only rises when active parts crowd together."
  };
}

function evaluateArcadeRun(level: ArcadeLevel, run: SimulationResult, occupiedCount: number) {
  const reasons: string[] = [];

  if (run.failures.length > 0) {
    reasons.push("Fix every disconnected or overheated part before the level can clear.");
  }
  if (run.summary.poweredSwitches < level.goal.poweredSwitches) {
    reasons.push(`Power ${level.goal.poweredSwitches} switches. You only reached ${run.summary.poweredSwitches}.`);
  }
  if (run.summary.maxHeat > level.goal.maxHeat) {
    reasons.push(`Keep peak heat at ${level.goal.maxHeat} or lower. This run peaked at ${run.summary.maxHeat}.`);
  }
  if (occupiedCount > level.goal.maxParts) {
    reasons.push(`Stay within ${level.goal.maxParts} placed parts. This run used ${occupiedCount}.`);
  }

  const efficiencyBonus = Math.max(0, level.goal.maxParts - occupiedCount) * 3;
  const levelBonus = level.id * 25;
  const objectiveBonus = run.summary.poweredSwitches * 12;
  const total = run.score.total + efficiencyBonus + levelBonus + objectiveBonus;

  return {
    passed: reasons.length === 0,
    reasons,
    total
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

export default function ChipExperience({
  mode,
  onNavigate
}: {
  mode: ExperienceMode;
  onNavigate: (route: Route) => void;
}) {
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
  const [levelIndex, setLevelIndex] = useState(0);
  const [highestUnlockedLevel, setHighestUnlockedLevel] = useState(0);
  const [tutorialActive, setTutorialActive] = useState(mode === "tutorial");
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [introCardIndex, setIntroCardIndex] = useState(0);
  const [timeRemainingMs, setTimeRemainingMs] = useState(120000);
  const [timeTrialLocked, setTimeTrialLocked] = useState(false);

  const tutorialStep = tutorialSteps[tutorialStepIndex];
  const introCard = introCards[introCardIndex];
  const showingIntro = tutorialActive && tutorialStepIndex === 0;
  const currentLevel = arcadeLevels[levelIndex];
  const isArcade = mode === "arcade";
  const isTimeTrial = mode === "time-trial";

  useEffect(() => {
    loadLeaderboard().then(setLeaderboard).catch(() => {
      setSystemStatus("Leaderboard offline. Local play still works.");
    });
  }, [setLeaderboard]);

  useEffect(() => {
    setLevelIndex(0);
    setHighestUnlockedLevel(0);
    setIntroCardIndex(0);
    setTutorialStepIndex(0);
    setTimeRemainingMs(120000);
    setTimeTrialLocked(false);

    if (mode === "tutorial") {
      clearBoard();
      setTutorialActive(true);
      setActivePiece("wire");
      setSystemStatus("Learn the basics, then start the guided build.");
      return;
    }

    clearBoard(isArcade ? arcadeLevels[0].presetCells : []);
    setTutorialActive(false);
    setActivePiece("wire");
    setSystemStatus(isArcade ? `Arcade Level 1: ${arcadeLevels[0].tagline}` : "2:00 on the clock. Build the best circuit you can.");
  }, [clearBoard, isArcade, mode, setActivePiece]);

  useEffect(() => {
    if (!isArcade) {
      return;
    }
    clearBoard(currentLevel.presetCells);
    setActivePiece("wire");
    setSystemStatus(`Arcade Level ${currentLevel.id}: ${currentLevel.tagline}`);
  }, [clearBoard, currentLevel, isArcade, setActivePiece]);

  useEffect(() => {
    if (!isTimeTrial || phase !== "design" || timeTrialLocked) {
      return;
    }

    const startedAt = Date.now();
    const initialRemaining = timeRemainingMs;
    const interval = window.setInterval(() => {
      const nextRemaining = Math.max(0, initialRemaining - (Date.now() - startedAt));
      setTimeRemainingMs(nextRemaining);
      if (nextRemaining <= 0) {
        window.clearInterval(interval);
        setTimeTrialLocked(true);
        setSystemStatus("Time is up. Running your circuit now.");
        if (cells.some((cell) => cell.piece !== "empty")) {
          runSimulation();
        }
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, [cells, isTimeTrial, phase, runSimulation, timeRemainingMs, timeTrialLocked]);

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
        if (isArcade) {
          const placedParts = cells.filter((cell) => cell.piece !== "empty" && !cell.locked).length;
          const evaluation = evaluateArcadeRun(currentLevel, latestRun, placedParts);
          if (evaluation.passed) {
            setHighestUnlockedLevel((highest) => Math.max(highest, Math.min(arcadeLevels.length - 1, levelIndex + 1)));
            setSystemStatus(
              currentLevel.id === arcadeLevels.length
                ? `Level ${currentLevel.id} cleared. Final arcade score: ${evaluation.total}.`
                : `Level ${currentLevel.id} cleared. Advance to Level ${currentLevel.id + 1}.`
            );
          } else {
            setSystemStatus(evaluation.reasons[0] ?? "Chip failed. Tune the layout and try again.");
          }
          return;
        }
        if (isTimeTrial) {
          setSystemStatus("Time trial complete. Save your score or reset to try again.");
          return;
        }
        setSystemStatus(latestRun.succeeded ? "Chip survived. Save your score." : "Chip failed. Tune the layout and try again.");
        return;
      }
      setCurrentFrame(nextFrame);
    }, SIMULATION_STEP_MS);

    return () => window.clearInterval(interval);
  }, [cells, currentFrame, currentLevel, finishRun, isArcade, isTimeTrial, latestRun, levelIndex, phase, setCurrentFrame]);

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

  const occupiedCount = useMemo(() => cells.filter((cell) => cell.piece !== "empty" && !cell.locked).length, [cells]);
  const tutorialTargets = "targets" in tutorialStep ? tutorialStep.targets : [];
  const tutorialStatus = tutorialActive ? `${tutorialStep.title} ${tutorialStep.task}` : systemStatus;
  const canRunChip = !tutorialActive || tutorialStep.id === "run-chip" || tutorialStep.id === "complete";
  const heatState = heatStage(preview.maxHeat);
  const heatMeterValue = Math.min(100, preview.maxHeat * 10);
  const poweredSwitchPercent = preview.switchCount === 0 ? 0 : Math.round((preview.poweredSwitches / preview.switchCount) * 100);
  const arcadeEvaluation = isArcade && latestRun ? evaluateArcadeRun(currentLevel, latestRun, occupiedCount) : null;
  const timeRemainingLabel = `${Math.floor(timeRemainingMs / 60000)}:${Math.floor((timeRemainingMs % 60000) / 1000)
    .toString()
    .padStart(2, "0")}`;

  const startTutorial = () => {
    clearBoard();
    setActivePiece("power");
    setTutorialActive(true);
    setTutorialStepIndex(1);
    setIntroCardIndex(0);
    setSystemStatus("Follow the tutorial cards to build your first circuit.");
  };

  const exitTutorial = () => {
    onNavigate("/arcade");
  };

  const resetBoardAction = () => {
    clearBoard(isArcade ? currentLevel.presetCells : []);
    if (isTimeTrial) {
      setTimeRemainingMs(120000);
      setTimeTrialLocked(false);
    }
    if (tutorialActive) {
      setTutorialStepIndex(0);
      setIntroCardIndex(0);
      setActivePiece("wire");
      setSystemStatus("Tutorial reset. Start again when you are ready.");
      return;
    }
    setSystemStatus(
      isArcade
        ? `Arcade Level ${currentLevel.id}: ${currentLevel.tagline}`
        : isTimeTrial
          ? "Timer reset. You have 2:00 to build again."
          : "Board reset. Build another chip."
    );
  };

  const runChip = () => {
    if (isTimeTrial && phase === "results") {
      setSystemStatus("Time trial already finished. Reset to start a new 2-minute round.");
      return;
    }
    if (isTimeTrial && !timeTrialLocked) {
      setSystemStatus(`Keep building. Your final circuit will run automatically when the clock reaches 0:00.`);
      return;
    }
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
    const total = isArcade && arcadeEvaluation ? arcadeEvaluation.total : latestRun.score.total;
    const updated = await submitScore({
      name: playerName || "GUEST",
      total,
      performance: latestRun.score.performance,
      efficiency: latestRun.score.efficiency,
      stability: latestRun.score.stability
    });
    setLeaderboard(updated);
    setSystemStatus("Score saved. Reset to build another chip.");
  };

  const goToLevel = (nextIndex: number) => {
    setLevelIndex(nextIndex);
  };

  const goToNextLevel = () => {
    if (levelIndex < arcadeLevels.length - 1) {
      goToLevel(levelIndex + 1);
    }
  };

  const handleTutorialBlockedPlacement = (piece: PieceType) => {
    if (isTimeTrial && timeTrialLocked) {
      setSystemStatus("Time trial is over. Reset to start a new 2-minute round.");
      return;
    }
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
    if (isTimeTrial && timeTrialLocked) {
      return false;
    }
    if (!tutorialActive || !tutorialTargets.length) {
      return true;
    }

    return tutorialTargets.some((target) => target.row === row && target.col === col && target.piece === piece);
  };

  if (mode === "tutorial" && showingIntro) {
    return (
      <main className="app-shell tutorial-intro-shell">
        <section className="panel tutorial-intro-panel">
          <div className="tutorial-intro-topbar">
            <div className="tutorial-kicker">
              <span>Before You Begin</span>
              <strong>{`Screen ${introCardIndex + 1}/${introCards.length}`}</strong>
            </div>
            <button className="action-button ghost" onClick={() => onNavigate("/")}>
              Home
            </button>
          </div>
          <div className="tutorial-progress tutorial-progress-intro">
            {introCards.map((card, index) => (
              <span
                key={card.id}
                className={`tutorial-dot ${index === introCardIndex ? "active" : ""} ${index < introCardIndex ? "done" : ""}`}
              />
            ))}
          </div>
          <div className="tutorial-intro-layout">
            <div className="tutorial-intro-copy">
              <p className="eyebrow">{introCard.eyebrow}</p>
              <h1>{introCard.title}</h1>
              <p className="tutorial-intro-body">{introCard.body}</p>
              <div className="tutorial-intro-points">
                {introCard.bullets.map((bullet) => (
                  <div key={bullet} className="intro-point">
                    <span className="intro-point-mark" />
                    <p>{bullet}</p>
                  </div>
                ))}
              </div>
            </div>
            <TutorialIntroBoard card={introCard} />
          </div>
          <div className="tutorial-intro-actions">
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
                Start Missions
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      {!isArcade ? (
        <section className={`hero-panel game-header ${tutorialActive && tutorialStep.focus === "controls" ? "tutorial-focus" : ""}`}>
          <div>
            <p className="eyebrow">{mode === "tutorial" ? "Tutorial" : "Time Trial"}</p>
            <h1>Build a tiny chip that can survive the heat.</h1>
            <div className="hero-facts">
              <div className="hero-fact">
                <span>{isTimeTrial ? "Timer" : "Goal"}</span>
                <strong>{isTimeTrial ? timeRemainingLabel : "Power every switch"}</strong>
              </div>
              <div className={`hero-fact hero-fact-${heatState.tone}`}>
                <span>Heat</span>
                <strong>{heatState.label}</strong>
              </div>
              <div className="hero-fact">
                <span>Mode</span>
                <strong>{tutorialActive ? tutorialStep.title : isTimeTrial ? "Timed build" : "Free build"}</strong>
              </div>
            </div>
          </div>
          <div className="hero-actions">
            <button className="action-button ghost" onClick={() => onNavigate("/")}>
              Home
            </button>
            {mode === "tutorial" ? (
              <button className="action-button secondary" onClick={() => onNavigate("/arcade")}>
                Arcade
              </button>
            ) : (
              <button className="action-button secondary" onClick={() => onNavigate("/arcade")}>
                Arcade
              </button>
            )}
            <button
              className="action-button primary"
              onClick={runChip}
              disabled={phase === "running" || !canRunChip || (isTimeTrial && !timeTrialLocked)}
            >
              {isTimeTrial && !timeTrialLocked ? "Auto Run at 0:00" : "Run Chip"}
            </button>
            <button className="action-button secondary" onClick={resetBoardAction}>
              Reset Board
            </button>
          </div>
        </section>
      ) : null}

      {isArcade ? (
        <section className="panel arcade-panel arcade-panel-hero">
          <div className="panel-header">
            <div>
              <h2>{`Level ${currentLevel.id}: ${currentLevel.name}`}</h2>
              <p>{currentLevel.description}</p>
            </div>
            <div className="status-pill">{currentLevel.tagline}</div>
          </div>
          <div className="arcade-summary-row">
            <div className="arcade-summary-main">
              <span>What To Do</span>
              <strong>{currentLevel.instructions}</strong>
            </div>
            <div className="arcade-summary-main">
              <span>Win Condition</span>
              <strong>{`Power ${currentLevel.goal.poweredSwitches} switches, stay at heat ${currentLevel.goal.maxHeat} or below, and use no more than ${currentLevel.goal.maxParts} parts.`}</strong>
            </div>
            <div className="arcade-summary-side">
              <span>Unlocked</span>
              <strong>{`${highestUnlockedLevel + 1}/${arcadeLevels.length}`}</strong>
            </div>
          </div>
          <div className="arcade-inline-layout">
            <div className="arcade-inline-column">
              <span className="arcade-inline-label">Helpful Tips</span>
              <div className="arcade-tip-list">
                {currentLevel.tips.map((tip) => (
                  <p key={tip}>{tip}</p>
                ))}
              </div>
            </div>
            <div className="arcade-inline-column">
              <span className="arcade-inline-label">Level Goals</span>
              <div className="arcade-checklist">
                <ArcadeCheck
                  label={`Power ${currentLevel.goal.poweredSwitches} switches`}
                  value={`${preview.poweredSwitches}/${currentLevel.goal.poweredSwitches}`}
                  complete={preview.poweredSwitches >= currentLevel.goal.poweredSwitches}
                />
                <ArcadeCheck
                  label={`Keep peak heat at ${currentLevel.goal.maxHeat} or lower`}
                  value={`${preview.maxHeat}`}
                  complete={preview.maxHeat <= currentLevel.goal.maxHeat}
                />
                <ArcadeCheck
                  label={`Stay within ${currentLevel.goal.maxParts} player-placed parts`}
                  value={`${occupiedCount}/${currentLevel.goal.maxParts}`}
                  complete={occupiedCount <= currentLevel.goal.maxParts}
                />
              </div>
            </div>
          </div>
          <div className="arcade-toolbar">
            <button className="action-button ghost" onClick={() => onNavigate("/")}>
              Home
            </button>
            <button className="action-button secondary" onClick={() => onNavigate("/time-trial")}>
              Time Trial
            </button>
            <button className="action-button secondary" onClick={resetBoardAction}>
              Reset Board
            </button>
          </div>
        </section>
      ) : null}

      {isTimeTrial ? (
        <section className="panel arcade-panel time-trial-panel">
          <div className="panel-header">
            <div>
              <h2>2-Minute Time Trial</h2>
              <p>Build freely for two minutes, then your circuit runs automatically and that score is final.</p>
            </div>
            <div className="status-pill">{timeTrialLocked ? "Round complete" : `${timeRemainingLabel} remaining`}</div>
          </div>
          <div className="arcade-grid">
            <div className="arcade-card">
              <span>Goal</span>
              <strong>Build the highest-scoring circuit you can</strong>
            </div>
            <div className="arcade-card">
              <span>Timer</span>
              <strong>2 minutes, one final automatic run</strong>
            </div>
            <div className="arcade-card">
              <span>Strategy</span>
              <strong>Balance powered switches, heat, and stability</strong>
            </div>
            <div className="arcade-card">
              <span>Status</span>
              <strong>{timeTrialLocked ? "Editing locked until reset" : "Board is live"}</strong>
            </div>
          </div>
        </section>
      ) : null}

      {mode === "tutorial" ? (
        <section className={`panel tutorial-panel ${tutorialActive ? "tutorial-live" : ""}`}>
          <div className="tutorial-kicker">
            <span>Guided Tutorial</span>
            <strong>
              {`Step ${tutorialStepIndex + 1}/${tutorialSteps.length}`}
            </strong>
          </div>
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
        </section>
      ) : null}

      <section className={`content-grid ${isArcade ? "arcade-content-grid" : ""}`}>
        <div className="left-column">
          <div className={`panel board-panel ${tutorialActive && tutorialStep.focus === "board" ? "tutorial-focus" : ""}`}>
            <div className="panel-header">
              <div>
                <h2>Chip Grid</h2>
                <p>{isArcade ? "Connect the locked objectives and work around hazards." : "Drop a part on any square. Use spacing to cool hot zones."}</p>
              </div>
              <div className="board-header-actions">
                <div className="status-pill">{tutorialStatus}</div>
                {isArcade ? (
                  <button className="action-button primary board-run-button" onClick={runChip} disabled={phase === "running" || !canRunChip}>
                    Run Chip
                  </button>
                ) : null}
              </div>
            </div>
            <BoardCanvas
              highlightedCells={tutorialTargets}
              canPlace={allowTutorialPlacement}
              onBlockedPlacement={handleTutorialBlockedPlacement}
            />
            <div className="board-legend">
              <LegendSwatch tone="signal" label="Lit border = signal path" />
              <LegendSwatch tone="heat" label="Orange or red glow = heat" />
              <LegendSwatch tone="target" label={mode === "tutorial" ? "Mint box = tutorial target" : "Bright frame = important board cue"} />
              {isArcade ? <LegendSwatch tone="blocker" label="Steel cell = blocked tile" /> : null}
              {isArcade ? <LegendSwatch tone="hazard" label="Flame cell = heat zone" /> : null}
            </div>
            <div className="cooling-note">
              <strong>Cooling rules</strong>
              <p>`Spacing` cools all 8 neighboring squares a little. `Heatsink` cools the 4 touching squares a lot.</p>
            </div>
          </div>

          <div className={`panel tray-panel ${tutorialActive && tutorialStep.focus === "tray" ? "tutorial-focus" : ""}`}>
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
                  <div className={`tray-badge ${piece}`}>
                    {piece === "power" ? "P" : piece === "wire" ? "W" : piece === "switch" ? "S" : piece === "spacing" ? "+" : "H"}
                  </div>
                  <span>{PIECE_LABELS[piece]}</span>
                  <small>
                    {piece === "spacing"
                      ? "Light cooling for all 8 surrounding squares"
                      : piece === "heatsink"
                        ? "Strong cooling for the 4 touching squares"
                        : piece === "power"
                          ? "Starts signal flow"
                          : piece === "switch"
                            ? "Needs power to score"
                            : "Carries signal"}
                  </small>
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
          {isArcade ? (
            <div className="panel arcade-mission-panel">
              <div className="panel-header">
                <div>
                  <h2>Levels</h2>
                  <p>Choose any unlocked stage.</p>
                </div>
              </div>
              <div className="level-selector compact-level-selector">
                {arcadeLevels.map((level, index) => (
                  <button
                    key={level.id}
                    className={`level-chip ${index === levelIndex ? "active" : ""}`}
                    onClick={() => goToLevel(index)}
                    disabled={index > highestUnlockedLevel}
                  >
                    {`L${level.id}`}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {!isArcade ? (
            <div className={`panel metrics-panel ${tutorialActive && tutorialStep.focus === "readout" ? "tutorial-focus" : ""}`}>
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
          ) : null}

          <div className="panel results-panel">
            <div className="panel-header">
              <div>
                <h2>Run Results</h2>
                <p>{isArcade ? "Run the level to see whether you cleared every goal." : "When the simulation ends, save your best score."}</p>
              </div>
            </div>
            {latestRun ? (
              <>
                <div className="score-line">
                  <strong>{isArcade && arcadeEvaluation ? arcadeEvaluation.total : latestRun.score.total}</strong>
                  <span>{isArcade ? "Arcade score" : "Total score"}</span>
                </div>
                <div className="score-breakdown">
                  <Stat label="Performance" value={latestRun.score.performance} />
                  <Stat label="Efficiency" value={latestRun.score.efficiency} />
                  <Stat label="Stability" value={latestRun.score.stability} />
                </div>
                <div className="failure-list">
                  {isArcade && arcadeEvaluation ? (
                    arcadeEvaluation.passed ? (
                      <p>{`Level ${currentLevel.id} cleared. All arcade objectives were met.`}</p>
                    ) : (
                      arcadeEvaluation.reasons.map((reason) => <p key={reason}>{reason}</p>)
                    )
                  ) : latestRun.failures.length === 0 ? (
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
                  {isArcade && arcadeEvaluation?.passed && levelIndex < arcadeLevels.length - 1 ? (
                    <button className="action-button secondary" onClick={goToNextLevel}>
                      Next Level
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="placeholder-copy">{isTimeTrial ? "Timer is running. Your circuit will run automatically at 0:00." : "No run yet. Design a chip, then press Run Chip."}</p>
            )}
          </div>

          {!isArcade ? (
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
          ) : null}
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

function ArcadeCheck({ label, value, complete }: { label: string; value: string; complete: boolean }) {
  return (
    <div className={`arcade-check ${complete ? "complete" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LegendSwatch({ tone, label }: { tone: "signal" | "heat" | "target" | "blocker" | "hazard"; label: string }) {
  return (
    <div className="legend-item">
      <span className={`legend-swatch ${tone}`} />
      <small>{label}</small>
    </div>
  );
}

function isConductive(piece: PieceType) {
  return piece === "power" || piece === "wire" || piece === "switch";
}

function PieceIcon({
  piece,
  connections
}: {
  piece: PieceType;
  connections?: { up: boolean; right: boolean; down: boolean; left: boolean };
}) {
  if (piece === "power") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="18" fill="#08101b" opacity="0.12" />
        <path d="M28 10h8l-4 16h10L26 54l4-18H20z" fill="#08101b" />
      </svg>
    );
  }

  if (piece === "wire") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        {connections?.up ? <rect x="27" y="0" width="10" height="32" rx="5" fill="#08101b" /> : null}
        {connections?.right ? <rect x="32" y="27" width="32" height="10" rx="5" fill="#08101b" /> : null}
        {connections?.down ? <rect x="27" y="32" width="10" height="32" rx="5" fill="#08101b" /> : null}
        {connections?.left ? <rect x="0" y="27" width="32" height="10" rx="5" fill="#08101b" /> : null}
        {!connections?.up && !connections?.right && !connections?.down && !connections?.left ? (
          <>
            <circle cx="18" cy="32" r="6" fill="#08101b" />
            <circle cx="46" cy="32" r="6" fill="#08101b" />
            <rect x="18" y="27" width="28" height="10" rx="5" fill="#08101b" />
          </>
        ) : null}
        <circle cx="32" cy="32" r="9" fill="#08101b" />
      </svg>
    );
  }

  if (piece === "switch") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="16" y="24" width="32" height="16" rx="8" fill="#08101b" />
        <circle cx="26" cy="32" r="8" fill="#f3f9ff" />
      </svg>
    );
  }

  if (piece === "spacing") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M32 14v36M14 32h36" stroke="#f3f9ff" strokeWidth="8" strokeLinecap="round" />
        <circle cx="32" cy="32" r="20" fill="none" stroke="#f3f9ff" strokeWidth="4" opacity="0.35" />
      </svg>
    );
  }

  if (piece === "heatsink") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="20" fill="#f3f9ff" opacity="0.12" />
        <circle cx="32" cy="32" r="8" fill="#f3f9ff" />
        <path d="M32 14v10M32 40v10M14 32h10M40 32h10M20 20l7 7M44 20l-7 7M20 44l7-7M44 44l-7-7" stroke="#f3f9ff" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  return null;
}

function TutorialIntroBoard({ card }: { card: IntroCard }) {
  const pieceAt = (row: number, col: number) =>
    card.visual.cells.find((cell) => cell.row === row && cell.col === col)?.piece ?? "empty";

  const cells = Array.from({ length: 49 }, (_, index) => {
    const row = Math.floor(index / 7);
    const col = index % 7;
    const piece = card.visual.cells.find((cell) => cell.row === row && cell.col === col)?.piece ?? "empty";
    const tone = card.visual.highlighted?.find((item) => item.row === row && item.col === col)?.tone;
    const connections =
      piece === "wire"
        ? {
            up: isConductive(pieceAt(row - 1, col)),
            right: isConductive(pieceAt(row, col + 1)),
            down: isConductive(pieceAt(row + 1, col)),
            left: isConductive(pieceAt(row, col - 1))
          }
        : undefined;
    return { row, col, piece, tone, connections };
  });

  return (
    <div className="tutorial-intro-visual">
      <div className="tutorial-board">
        {cells.map((cell) => (
          <div
            key={`${cell.row}-${cell.col}`}
            className={`tutorial-board-cell piece-${cell.piece} ${cell.tone ? `tone-${cell.tone}` : ""}`}
          >
            <PieceIcon piece={cell.piece} connections={cell.connections} />
          </div>
        ))}
      </div>
      <p className="tutorial-board-caption">{card.visual.caption}</p>
      <div className="tutorial-board-legend">
        <LegendSwatch tone="signal" label="Signal path" />
        <LegendSwatch tone="heat" label="Heat warning" />
        <LegendSwatch tone="target" label="Goal or cooling cue" />
      </div>
    </div>
  );
}
