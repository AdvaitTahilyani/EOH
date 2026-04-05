import {
  GRID_COLS,
  GRID_ROWS,
  type Cell,
  type FailureEvent,
  type PieceType,
  type PreviewAnalysis,
  type ScoreBreakdown,
  type SimulationFrame,
  type SimulationResult
} from "./types";

const HEAT_WARNING = 5;
const HEAT_DANGER = 7;
const HEAT_LIMIT = 8;
const directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
] as const;

function createMatrix<T>(factory: (row: number, col: number) => T): T[][] {
  return Array.from({ length: GRID_ROWS }, (_, row) =>
    Array.from({ length: GRID_COLS }, (_, col) => factory(row, col))
  );
}

function inBounds(row: number, col: number) {
  return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
}

function toBoard(cells: Cell[]) {
  const board = createMatrix<PieceType>(() => "empty");
  for (const cell of cells) {
    board[cell.row][cell.col] = cell.piece;
  }
  return board;
}

function isConductive(piece: PieceType) {
  return piece === "wire" || piece === "switch" || piece === "power";
}

function signalDistances(board: PieceType[][]) {
  const distances = createMatrix<number>(() => -1);
  const queue: Array<[number, number]> = [];

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      if (board[row][col] === "power") {
        distances[row][col] = 0;
        queue.push([row, col]);
      }
    }
  }

  for (let i = 0; i < queue.length; i += 1) {
    const [row, col] = queue[i];
    for (const [dy, dx] of directions) {
      const nextRow = row + dy;
      const nextCol = col + dx;
      if (!inBounds(nextRow, nextCol)) {
        continue;
      }
      if (!isConductive(board[nextRow][nextCol]) || distances[nextRow][nextCol] !== -1) {
        continue;
      }
      distances[nextRow][nextCol] = distances[row][col] + 1;
      queue.push([nextRow, nextCol]);
    }
  }

  return distances;
}

function computeHeat(board: PieceType[][]) {
  return createMatrix<number>((row, col) => {
    const piece = board[row][col];
    if (piece === "empty" || piece === "blocker") {
      return 0;
    }

    const baseHeat = piece === "power" ? 2 : piece === "switch" ? 1 : piece === "wire" ? 1 : piece === "hotspot" ? 4 : 0;

    let adjacentConductive = 0;
    let nearbySpacing = piece === "spacing" ? 1 : 0;
    let nearbyHeatsinks = piece === "heatsink" ? 1 : 0;
    let nearbyHotspots = piece === "hotspot" ? 1 : 0;

    for (const [dy, dx] of directions) {
      const nextRow = row + dy;
      const nextCol = col + dx;
      if (!inBounds(nextRow, nextCol)) {
        continue;
      }
      const neighbor = board[nextRow][nextCol];
      if (isConductive(neighbor)) {
        adjacentConductive += 1;
      }
      if (neighbor === "spacing") {
        nearbySpacing += 1;
      }
      if (neighbor === "heatsink") {
        nearbyHeatsinks += 1;
      }
      if (neighbor === "hotspot") {
        nearbyHotspots += 1;
      }
    }

    let diagonalSpacing = 0;
    for (const [dy, dx] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ] as const) {
      const nextRow = row + dy;
      const nextCol = col + dx;
      if (!inBounds(nextRow, nextCol)) {
        continue;
      }
      if (board[nextRow][nextCol] === "spacing") {
        diagonalSpacing += 1;
      }
    }

    let localConductive = 0;
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        if (dy === 0 && dx === 0) {
          continue;
        }
        const nextRow = row + dy;
        const nextCol = col + dx;
        if (!inBounds(nextRow, nextCol)) {
          continue;
        }
        if (isConductive(board[nextRow][nextCol])) {
          localConductive += 1;
        }
      }
    }

    const crowdHeat = Math.max(0, adjacentConductive - 2) * 2;
    const junctionHeat =
      piece === "wire"
        ? adjacentConductive >= 4
          ? 3
          : adjacentConductive === 3
            ? 2
            : 0
        : piece === "power"
          ? Math.max(0, adjacentConductive - 2)
          : 0;
    const busHeat = Math.max(0, localConductive - 6);
    const hotspotHeat = piece === "hotspot" ? 1 : nearbyHotspots * 2;
    const cooling = nearbySpacing * 2 + nearbyHeatsinks * 4 + diagonalSpacing;

    return Math.max(0, baseHeat + crowdHeat + junctionHeat + busHeat + hotspotHeat - cooling);
  });
}

export function analyzeBoard(cells: Cell[]): PreviewAnalysis {
  const board = toBoard(cells);
  const heatMap = computeHeat(board);
  const distances = signalDistances(board);
  const reachable = createMatrix<boolean>((row, col) => distances[row][col] >= 0);

  let powerCount = 0;
  let switchCount = 0;
  let poweredSwitches = 0;
  let crowdedCells = 0;
  let maxHeat = 0;

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const piece = board[row][col];
      const heat = heatMap[row][col];
      maxHeat = Math.max(maxHeat, heat);
      if (heat >= HEAT_LIMIT) {
        crowdedCells += 1;
      }
      if (piece === "power") {
        powerCount += 1;
      }
      if (piece === "switch") {
        switchCount += 1;
        if (reachable[row][col]) {
          poweredSwitches += 1;
        }
      }
    }
  }

  const heatPenalty = Math.max(0, maxHeat - 4) * 10 + crowdedCells * 6;
  const unpoweredPenalty = Math.max(0, switchCount - poweredSwitches) * 18;
  const stability = Math.max(0, 100 - heatPenalty - unpoweredPenalty);

  return {
    heatMap,
    reachable,
    maxHeat,
    powerCount,
    switchCount,
    poweredSwitches,
    crowdedCells,
    stability
  };
}

function buildFailures(cells: Cell[], analysis: PreviewAnalysis) {
  const failures: FailureEvent[] = [];

  for (const cell of cells) {
    const heat = analysis.heatMap[cell.row][cell.col];
    if (heat >= HEAT_LIMIT) {
      failures.push({ row: cell.row, col: cell.col, reason: "Overheated" });
    } else if (cell.piece === "switch" && !analysis.reachable[cell.row][cell.col]) {
      failures.push({ row: cell.row, col: cell.col, reason: "No signal" });
    } else if (cell.piece === "wire" && !analysis.reachable[cell.row][cell.col]) {
      failures.push({ row: cell.row, col: cell.col, reason: "Disconnected" });
    }
  }

  return failures;
}

function buildScore(cells: Cell[], analysis: PreviewAnalysis, failures: FailureEvent[]): ScoreBreakdown {
  const occupied = cells.filter((cell) => cell.piece !== "empty").length;
  const spacingCount = cells.filter((cell) => cell.piece === "spacing").length;

  const performanceBase =
    analysis.switchCount === 0 ? 15 : Math.round((analysis.poweredSwitches / analysis.switchCount) * 100);
  const performance = Math.max(0, performanceBase - failures.filter((f) => f.reason === "No signal").length * 10);

  const layoutBonus = Math.min(20, spacingCount * 4);
  const densityPenalty = Math.max(0, occupied - 18) * 2;
  const efficiency = Math.max(0, Math.min(100, 75 + layoutBonus - densityPenalty));

  const stability = Math.max(0, analysis.stability - failures.filter((f) => f.reason === "Overheated").length * 8);
  const total = Math.round(performance * 0.4 + efficiency * 0.25 + stability * 0.35);

  return { performance, efficiency, stability, total };
}

export function simulateBoard(cells: Cell[]): SimulationResult {
  const analysis = analyzeBoard(cells);
  const failures = buildFailures(cells, analysis);
  const score = buildScore(cells, analysis, failures);
  const distances = signalDistances(toBoard(cells));
  const maxDistance = Math.max(0, ...distances.flat());
  const frames: SimulationFrame[] = [];

  for (let step = 0; step <= maxDistance + 1; step += 1) {
    const activeSignals = cells
      .filter((cell) => distances[cell.row][cell.col] >= 0 && distances[cell.row][cell.col] <= step)
      .map((cell) => ({ row: cell.row, col: cell.col }));

    const hotCells = cells
      .filter((cell) => analysis.heatMap[cell.row][cell.col] >= HEAT_WARNING)
      .map((cell) => ({ row: cell.row, col: cell.col, heat: analysis.heatMap[cell.row][cell.col] }));

    const frameFailures = failures.filter((failure) => {
      if (failure.reason === "No signal") {
        return step >= maxDistance;
      }
      return analysis.heatMap[failure.row][failure.col] - HEAT_WARNING <= step;
    });

    frames.push({
      step,
      activeSignals,
      hotCells,
      failures: frameFailures
    });
  }

  return {
    summary: analysis,
    frames,
    failures,
    score,
    succeeded: failures.length === 0 && score.total >= 75
  };
}
