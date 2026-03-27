import { useEffect, useRef } from "react";
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

function cellLabel(piece: string) {
  switch (piece) {
    case "power":
      return "P";
    case "wire":
      return "W";
    case "switch":
      return "S";
    case "spacing":
      return "+";
    default:
      return "";
  }
}

export default function BoardCanvas({ highlightedCells = [], canPlace, onBlockedPlacement }: BoardCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const boardRef = useRef<Container | null>(null);
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
    }

    void mount();

    return () => {
      active = false;
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

    for (const cell of cells) {
      const x = cell.col * GRID_CELL_SIZE;
      const y = cell.row * GRID_CELL_SIZE;
      const heat = liveHeatMap[cell.row][cell.col] ?? 0;
      const signalActive =
        phase === "design"
          ? liveReachable[cell.row][cell.col] && cell.piece !== "empty" && cell.piece !== "spacing"
          : frame?.activeSignals.some((signal) => signal.row === cell.row && signal.col === cell.col);
      const failure = frame?.failures.find((item) => item.row === cell.row && item.col === cell.col);
      const highlighted = highlightedCells.some((target) => target.row === cell.row && target.col === cell.col);

      const tile = new Graphics();
      const borderColor = highlighted ? 0x74f2ce : signalActive ? 0xfff4a3 : 0x365377;
      tile.roundRect(x + 3, y + 3, GRID_CELL_SIZE - 6, GRID_CELL_SIZE - 6, 12);
      tile.fill({ color: PIECE_COLORS[cell.piece], alpha: cell.piece === "empty" ? 0.25 : 0.9 });
      tile.stroke({ width: highlighted ? 4 : 2, color: borderColor, alpha: 0.95 });
      board.addChild(tile);

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
        const text = new Text({
          text: cellLabel(cell.piece),
          style: {
            fontFamily: "Avenir Next, Helvetica, sans-serif",
            fontSize: 26,
            fill: signalActive ? "#08101b" : "#f3f9ff",
            fontWeight: "700"
          }
        });
        text.anchor.set(0.5);
        text.position.set(x + GRID_CELL_SIZE / 2, y + GRID_CELL_SIZE / 2);
        board.addChild(text);
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
  }, [cells, currentFrame, highlightedCells, latestRun, phase, preview.heatMap, preview.reachable]);

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
