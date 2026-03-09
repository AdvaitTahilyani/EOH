export const GRID_ROWS = 7;
export const GRID_COLS = 7;

export type PieceType = "empty" | "switch" | "wire" | "power" | "spacing";
export type Phase = "design" | "running" | "results";

export interface Cell {
  row: number;
  col: number;
  piece: PieceType;
}

export interface CellAnalysis {
  heat: number;
  signal: boolean;
  overloaded: boolean;
}

export interface PreviewAnalysis {
  heatMap: number[][];
  reachable: boolean[][];
  maxHeat: number;
  powerCount: number;
  switchCount: number;
  poweredSwitches: number;
  crowdedCells: number;
  stability: number;
}

export interface ScoreBreakdown {
  performance: number;
  efficiency: number;
  stability: number;
  total: number;
}

export interface FailureEvent {
  row: number;
  col: number;
  reason: string;
}

export interface SimulationFrame {
  step: number;
  activeSignals: Array<{ row: number; col: number }>;
  hotCells: Array<{ row: number; col: number; heat: number }>;
  failures: FailureEvent[];
}

export interface SimulationResult {
  summary: PreviewAnalysis;
  frames: SimulationFrame[];
  failures: FailureEvent[];
  score: ScoreBreakdown;
  succeeded: boolean;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  total: number;
  performance: number;
  efficiency: number;
  stability: number;
  createdAt: string;
}
