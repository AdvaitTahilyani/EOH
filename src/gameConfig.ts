import type { PieceType } from "./types";

export const PIECE_LABELS: Record<Exclude<PieceType, "empty">, string> = {
  blocker: "Blocker",
  heatsink: "Heatsink",
  hotspot: "Hotspot",
  switch: "Switch",
  wire: "Wire",
  power: "Power",
  spacing: "Spacing"
};

export const PIECE_COLORS: Record<PieceType, number> = {
  empty: 0x132033,
  blocker: 0x4b5563,
  heatsink: 0x1f6f78,
  hotspot: 0x8a2e18,
  switch: 0x3ddc97,
  wire: 0x6bdcff,
  power: 0xffcf4a,
  spacing: 0x2d4b3d
};

export const GRID_CELL_SIZE = 68;
export const SIMULATION_STEP_MS = 500;
