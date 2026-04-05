import { useMemo } from "react";
import { create } from "zustand";
import { analyzeBoard, simulateBoard } from "./simulation";
import { GRID_COLS, GRID_ROWS, type Cell, type LeaderboardEntry, type Phase, type PieceType, type SimulationResult } from "./types";

function createInitialCells(presetCells: Cell[] = []) {
  const cells: Cell[] = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const preset = presetCells.find((cell) => cell.row === row && cell.col === col);
      cells.push(preset ? { ...preset } : { row, col, piece: "empty" });
    }
  }
  return cells;
}

interface ExhibitState {
  cells: Cell[];
  activePiece: PieceType;
  phase: Phase;
  currentFrame: number;
  latestRun: SimulationResult | null;
  leaderboard: LeaderboardEntry[];
  playerName: string;
  setActivePiece: (piece: PieceType) => void;
  placePiece: (row: number, col: number, piece?: PieceType) => void;
  clearBoard: (presetCells?: Cell[]) => void;
  runSimulation: () => SimulationResult;
  setCurrentFrame: (frame: number) => void;
  finishRun: () => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  setPlayerName: (name: string) => void;
}

export const useExhibitStore = create<ExhibitState>((set, get) => ({
  cells: createInitialCells(),
  activePiece: "wire",
  phase: "design",
  currentFrame: 0,
  latestRun: null,
  leaderboard: [],
  playerName: "GUEST",
  setActivePiece: (piece) => set({ activePiece: piece }),
  placePiece: (row, col, piece) =>
    set((state) => ({
      cells: state.cells.map((cell) =>
        cell.row === row && cell.col === col && !cell.locked ? { ...cell, piece: piece ?? state.activePiece } : cell
      )
    })),
  clearBoard: (presetCells = []) =>
    set({
      cells: createInitialCells(presetCells),
      phase: "design",
      currentFrame: 0,
      latestRun: null
    }),
  runSimulation: () => {
    const latestRun = simulateBoard(get().cells);
    set({ latestRun, phase: "running", currentFrame: 0 });
    return latestRun;
  },
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  finishRun: () => set({ phase: "results" }),
  setLeaderboard: (entries) => set({ leaderboard: entries }),
  setPlayerName: (name) => set({ playerName: name.slice(0, 10).toUpperCase() })
}));

export function usePreviewAnalysis() {
  const cells = useExhibitStore((state) => state.cells);
  return useMemo(() => analyzeBoard(cells), [cells]);
}
