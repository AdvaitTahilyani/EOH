import { useEffect, useRef, useState } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { GRID_CELL_SIZE, PIECE_COLORS } from "../gameConfig";
import { usePreviewAnalysis, useExhibitStore } from "../store";
import { GRID_COLS, GRID_ROWS, type PieceType } from "../types";

const BOARD_WIDTH = GRID_COLS * GRID_CELL_SIZE;
const BOARD_HEIGHT = GRID_ROWS * GRID_CELL_SIZE;

interface BoardCanvasProps {
  highlightedCells?: Array<{ row: number; col: number }>;
  canPlace?: (row: number, col: number, piece: PieceType) => boolean;
  onBlockedPlacement?: (piece: PieceType) => void;
}

function isConductive(piece: PieceType) {
  return piece === "power" || piece === "wire" || piece === "switch";
}

function drawRoundedRect(icon: Graphics, x: number, y: number, width: number, height: number, radius: number, color: number) {
  icon.roundRect(x, y, width, height, radius);
  icon.fill(color);
}

function drawPieceIcon(
  board: Container,
  piece: PieceType,
  x: number,
  y: number,
  options?: { up: boolean; right: boolean; down: boolean; left: boolean }
) {
  const icon = new Graphics();
  const centerX = x + GRID_CELL_SIZE / 2;
  const centerY = y + GRID_CELL_SIZE / 2;

  if (piece === "wire") {
    const stem = 10;
    if (options?.up) {
      drawRoundedRect(icon, centerX - stem / 2, y + 10, stem, GRID_CELL_SIZE / 2 - 10, 5, 0x08101b);
    }
    if (options?.right) {
      drawRoundedRect(icon, centerX, centerY - stem / 2, GRID_CELL_SIZE / 2 - 10, stem, 5, 0x08101b);
    }
    if (options?.down) {
      drawRoundedRect(icon, centerX - stem / 2, centerY, stem, GRID_CELL_SIZE / 2 - 10, 5, 0x08101b);
    }
    if (options?.left) {
      drawRoundedRect(icon, x + 10, centerY - stem / 2, GRID_CELL_SIZE / 2 - 10, stem, 5, 0x08101b);
    }
    if (!options?.up && !options?.right && !options?.down && !options?.left) {
      drawRoundedRect(icon, x + 16, centerY - stem / 2, GRID_CELL_SIZE - 32, stem, 5, 0x08101b);
      icon.circle(x + 18, centerY, 6);
      icon.fill(0x08101b);
      icon.circle(x + GRID_CELL_SIZE - 18, centerY, 6);
      icon.fill(0x08101b);
    }
    icon.circle(centerX, centerY, 9);
    icon.fill(0x08101b);
    board.addChild(icon);
    return;
  }

  if (piece === "power") {
    icon.circle(centerX, centerY, 18);
    icon.fill({ color: 0x08101b, alpha: 0.12 });
    icon.moveTo(centerX - 4, y + 10);
    icon.lineTo(centerX + 4, y + 10);
    icon.lineTo(centerX, y + 26);
    icon.lineTo(centerX + 10, y + 26);
    icon.lineTo(centerX - 6, y + GRID_CELL_SIZE - 10);
    icon.lineTo(centerX - 2, y + 40);
    icon.lineTo(centerX - 12, y + 40);
    icon.closePath();
    icon.fill(0x08101b);
    board.addChild(icon);
    return;
  }

  if (piece === "switch") {
    drawRoundedRect(icon, x + 16, centerY - 8, 32, 16, 8, 0x08101b);
    icon.circle(x + 26, centerY, 8);
    icon.fill(0xf3f9ff);
    board.addChild(icon);
    return;
  }

  if (piece === "spacing") {
    icon.circle(centerX, centerY, 20);
    icon.stroke({ width: 4, color: 0xf3f9ff, alpha: 0.35 });
    icon.moveTo(centerX, y + 14);
    icon.lineTo(centerX, y + GRID_CELL_SIZE - 14);
    icon.moveTo(x + 14, centerY);
    icon.lineTo(x + GRID_CELL_SIZE - 14, centerY);
    icon.stroke({ width: 8, color: 0xf3f9ff, alpha: 1, cap: "round" });
    board.addChild(icon);
    return;
  }

  if (piece === "heatsink") {
    icon.circle(centerX, centerY, 20);
    icon.fill({ color: 0xf3f9ff, alpha: 0.12 });
    icon.circle(centerX, centerY, 8);
    icon.fill(0xf3f9ff);
    for (const [dx, dy] of [
      [0, -18],
      [14, -14],
      [18, 0],
      [14, 14],
      [0, 18],
      [-14, 14],
      [-18, 0],
      [-14, -14]
    ] as const) {
      icon.moveTo(centerX, centerY);
      icon.lineTo(centerX + dx, centerY + dy);
    }
    icon.stroke({ width: 4, color: 0xf3f9ff, alpha: 1, cap: "round" });
    board.addChild(icon);
    return;
  }

  if (piece === "blocker") {
    drawRoundedRect(icon, x + 16, y + 16, GRID_CELL_SIZE - 32, GRID_CELL_SIZE - 32, 8, 0xf3f9ff);
    icon.moveTo(x + 20, y + 20);
    icon.lineTo(x + GRID_CELL_SIZE - 20, y + GRID_CELL_SIZE - 20);
    icon.moveTo(x + GRID_CELL_SIZE - 20, y + 20);
    icon.lineTo(x + 20, y + GRID_CELL_SIZE - 20);
    icon.stroke({ width: 4, color: 0x27313f, alpha: 1 });
    board.addChild(icon);
    return;
  }

  if (piece === "hotspot") {
    icon.circle(centerX, centerY, 18);
    icon.fill({ color: 0xfff1dc, alpha: 0.16 });
    icon.circle(centerX, centerY, 12);
    icon.fill({ color: 0xfff1dc, alpha: 0.28 });
    icon.moveTo(centerX, y + 16);
    icon.bezierCurveTo(centerX + 10, y + 24, centerX + 8, y + 38, centerX, y + GRID_CELL_SIZE - 14);
    icon.bezierCurveTo(centerX - 8, y + 38, centerX - 10, y + 24, centerX, y + 16);
    icon.fill(0xfff1dc);
    board.addChild(icon);
  }
}

export default function BoardCanvas({ highlightedCells = [], canPlace, onBlockedPlacement }: BoardCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const boardRef = useRef<Container | null>(null);
  const [isReady, setIsReady] = useState(false);
  const cells = useExhibitStore((state) => state.cells);
  const activePiece = useExhibitStore((state) => state.activePiece);
  const latestRun = useExhibitStore((state) => state.latestRun);
  const currentFrame = useExhibitStore((state) => state.currentFrame);
  const phase = useExhibitStore((state) => state.phase);
  const placePiece = useExhibitStore((state) => state.placePiece);
  const preview = usePreviewAnalysis();

  useEffect(() => {
    let active = true;

    async function mount() {
      const app = new Application();
      await app.init({
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
        background: "#08101b",
        antialias: true
      });
      if (!active || !hostRef.current) {
        app.destroy(true);
        return;
      }

      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(app.canvas);
      const board = new Container();
      app.stage.addChild(board);
      appRef.current = app;
      boardRef.current = board;
      setIsReady(true);
    }

    void mount();

    return () => {
      active = false;
      setIsReady(false);
      appRef.current?.destroy(true);
      appRef.current = null;
      boardRef.current = null;
    };
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) {
      return;
    }

    board.removeChildren();
    const frame = latestRun?.frames[Math.min(currentFrame, latestRun.frames.length - 1)];
    const liveHeatMap =
      phase === "running" || phase === "results" ? (latestRun?.summary.heatMap ?? preview.heatMap) : preview.heatMap;
    const liveReachable =
      phase === "running" || phase === "results" ? latestRun?.summary.reachable ?? preview.reachable : preview.reachable;

    const pieceAt = (row: number, col: number) => cells.find((cell) => cell.row === row && cell.col === col)?.piece ?? "empty";

    for (const cell of cells) {
      const x = cell.col * GRID_CELL_SIZE;
      const y = cell.row * GRID_CELL_SIZE;
      const heat = liveHeatMap[cell.row][cell.col] ?? 0;
      const signalActive =
        phase === "design"
          ? liveReachable[cell.row][cell.col] &&
            cell.piece !== "empty" &&
            cell.piece !== "spacing" &&
            cell.piece !== "heatsink"
          : frame?.activeSignals.some((signal) => signal.row === cell.row && signal.col === cell.col);
      const failure = frame?.failures.find((item) => item.row === cell.row && item.col === cell.col);
      const highlighted = highlightedCells.some((target) => target.row === cell.row && target.col === cell.col);

      const tile = new Graphics();
      const borderColor = highlighted ? 0x74f2ce : signalActive ? 0xfff4a3 : 0x365377;
      tile.roundRect(x + 3, y + 3, GRID_CELL_SIZE - 6, GRID_CELL_SIZE - 6, 12);
      tile.fill({ color: PIECE_COLORS[cell.piece], alpha: cell.piece === "empty" ? 0.25 : 0.9 });
      tile.stroke({ width: highlighted ? 4 : 2, color: borderColor, alpha: 0.95 });
      board.addChild(tile);

      if (cell.locked) {
        const lockFrame = new Graphics();
        lockFrame.roundRect(x + 8, y + 8, GRID_CELL_SIZE - 16, GRID_CELL_SIZE - 16, 10);
        lockFrame.stroke({ width: 2, color: 0xe9f6ff, alpha: 0.34 });
        board.addChild(lockFrame);
      }

      if (heat > 0) {
        const overlay = new Graphics();
        const alpha = Math.min(0.78, heat / 11);
        overlay.roundRect(x + 8, y + 8, GRID_CELL_SIZE - 16, GRID_CELL_SIZE - 16, 10);
        overlay.fill({ color: heat >= 8 ? 0xff3d2e : 0xff8a38, alpha });
        if (heat >= 6) {
          overlay.stroke({ width: heat >= 8 ? 3 : 2, color: heat >= 8 ? 0xffd3c7 : 0xffcf8a, alpha: 0.95 });
        }
        board.addChild(overlay);
      }

      if (heat >= 8) {
        const hotspotBadge = new Graphics();
        hotspotBadge.roundRect(x + 11, y + 11, 30, 18, 9);
        hotspotBadge.fill({ color: 0xfff1dc, alpha: 0.96 });
        board.addChild(hotspotBadge);

        const hotspotText = new Text({
          text: "HOT",
          style: {
            fontFamily: "Avenir Next, Helvetica, sans-serif",
            fontSize: 10,
            fill: "#7b160d",
            fontWeight: "800",
            letterSpacing: 0.8
          }
        });
        hotspotText.anchor.set(0.5);
        hotspotText.position.set(x + 26, y + 20);
        board.addChild(hotspotText);
      } else if (heat >= 6) {
        const heatText = new Text({
          text: `${heat}`,
          style: {
            fontFamily: "Avenir Next, Helvetica, sans-serif",
            fontSize: 12,
            fill: "#fff2d8",
            fontWeight: "800"
          }
        });
        heatText.anchor.set(0.5);
        heatText.position.set(x + 16, y + 15);
        board.addChild(heatText);
      }

      if (failure) {
        const failureMark = new Graphics();
        failureMark.moveTo(x + 14, y + 14);
        failureMark.lineTo(x + GRID_CELL_SIZE - 14, y + GRID_CELL_SIZE - 14);
        failureMark.moveTo(x + GRID_CELL_SIZE - 14, y + 14);
        failureMark.lineTo(x + 14, y + GRID_CELL_SIZE - 14);
        failureMark.stroke({ width: 4, color: 0xff1b52, alpha: 0.95 });
        board.addChild(failureMark);
      }

      if (highlighted) {
        const pulse = new Graphics();
        pulse.roundRect(x + 10, y + 10, GRID_CELL_SIZE - 20, GRID_CELL_SIZE - 20, 10);
        pulse.stroke({ width: 2, color: 0xc6fff0, alpha: 0.95 });
        board.addChild(pulse);
      }

      if (cell.piece !== "empty") {
        drawPieceIcon(board, cell.piece, x, y, {
          up: isConductive(pieceAt(cell.row - 1, cell.col)),
          right: isConductive(pieceAt(cell.row, cell.col + 1)),
          down: isConductive(pieceAt(cell.row + 1, cell.col)),
          left: isConductive(pieceAt(cell.row, cell.col - 1))
        });
      }

      if (cell.locked) {
        const lockBadge = new Graphics();
        lockBadge.roundRect(x + GRID_CELL_SIZE - 24, y + 10, 14, 14, 5);
        lockBadge.fill({ color: 0xe7f4ff, alpha: 0.95 });
        board.addChild(lockBadge);

        const shackle = new Graphics();
        shackle.arc(x + GRID_CELL_SIZE - 17, y + 11, 4, Math.PI, 0);
        shackle.stroke({ width: 2, color: 0x16344b, alpha: 1 });
        board.addChild(shackle);
      }
    }

    for (let row = 0; row <= GRID_ROWS; row += 1) {
      const gridLine = new Graphics();
      gridLine.moveTo(0, row * GRID_CELL_SIZE);
      gridLine.lineTo(BOARD_WIDTH, row * GRID_CELL_SIZE);
      gridLine.stroke({ width: 1, color: 0x29415e, alpha: 0.6 });
      board.addChild(gridLine);
    }

    for (let col = 0; col <= GRID_COLS; col += 1) {
      const gridLine = new Graphics();
      gridLine.moveTo(col * GRID_CELL_SIZE, 0);
      gridLine.lineTo(col * GRID_CELL_SIZE, BOARD_HEIGHT);
      gridLine.stroke({ width: 1, color: 0x29415e, alpha: 0.6 });
      board.addChild(gridLine);
    }

    board.alpha = 1;
  }, [cells, currentFrame, highlightedCells, isReady, latestRun, phase, preview.heatMap, preview.reachable]);

  const attemptPlacement = (row: number, col: number, piece: PieceType) => {
    if (canPlace && !canPlace(row, col, piece)) {
      onBlockedPlacement?.(piece);
      return;
    }
    placePiece(row, col, piece);
  };

  return (
    <div
      ref={hostRef}
      className="board-shell"
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const col = Math.floor((event.clientX - rect.left) / GRID_CELL_SIZE);
        const row = Math.floor((event.clientY - rect.top) / GRID_CELL_SIZE);
        if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
          attemptPlacement(row, col, activePiece);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        const piece = event.dataTransfer.getData("text/plain") as PieceType;
        const rect = event.currentTarget.getBoundingClientRect();
        const col = Math.floor((event.clientX - rect.left) / GRID_CELL_SIZE);
        const row = Math.floor((event.clientY - rect.top) / GRID_CELL_SIZE);
        if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
          attemptPlacement(row, col, piece);
        }
      }}
    />
  );
}
