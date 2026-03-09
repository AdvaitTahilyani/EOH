import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { GRID_CELL_SIZE, PIECE_COLORS } from "../gameConfig";
import { useExhibitStore } from "../store";
import { GRID_COLS, GRID_ROWS } from "../types";

const BOARD_WIDTH = GRID_COLS * GRID_CELL_SIZE;
const BOARD_HEIGHT = GRID_ROWS * GRID_CELL_SIZE;

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

export default function BoardCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const boardRef = useRef<Container | null>(null);
  const cells = useExhibitStore((state) => state.cells);
  const activePiece = useExhibitStore((state) => state.activePiece);
  const latestRun = useExhibitStore((state) => state.latestRun);
  const currentFrame = useExhibitStore((state) => state.currentFrame);
  const phase = useExhibitStore((state) => state.phase);
  const placePiece = useExhibitStore((state) => state.placePiece);

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

    for (const cell of cells) {
      const x = cell.col * GRID_CELL_SIZE;
      const y = cell.row * GRID_CELL_SIZE;
      const heat = latestRun?.summary.heatMap[cell.row][cell.col] ?? 0;
      const signalActive = frame?.activeSignals.some((signal) => signal.row === cell.row && signal.col === cell.col);
      const failure = frame?.failures.find((item) => item.row === cell.row && item.col === cell.col);

      const tile = new Graphics();
      const borderColor = signalActive ? 0xfff4a3 : 0x365377;
      tile.roundRect(x + 3, y + 3, GRID_CELL_SIZE - 6, GRID_CELL_SIZE - 6, 12);
      tile.fill({ color: PIECE_COLORS[cell.piece], alpha: cell.piece === "empty" ? 0.25 : 0.9 });
      tile.stroke({ width: 2, color: borderColor, alpha: 0.9 });
      board.addChild(tile);

      if (heat > 0) {
        const overlay = new Graphics();
        const alpha = Math.min(0.6, heat / 14);
        overlay.roundRect(x + 8, y + 8, GRID_CELL_SIZE - 16, GRID_CELL_SIZE - 16, 10);
        overlay.fill({ color: 0xff5f45, alpha });
        board.addChild(overlay);
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

    if (phase === "design" && latestRun?.failures.length) {
      board.alpha = 1;
    }
  }, [cells, currentFrame, latestRun, phase]);

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
          placePiece(row, col, activePiece);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        const piece = event.dataTransfer.getData("text/plain");
        const rect = event.currentTarget.getBoundingClientRect();
        const col = Math.floor((event.clientX - rect.left) / GRID_CELL_SIZE);
        const row = Math.floor((event.clientY - rect.top) / GRID_CELL_SIZE);
        if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
          placePiece(row, col, piece as "empty" | "switch" | "wire" | "power" | "spacing");
        }
      }}
    />
  );
}
