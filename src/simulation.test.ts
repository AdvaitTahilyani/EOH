import test from "node:test";
import assert from "node:assert/strict";
import { analyzeBoard, simulateBoard } from "./simulation";
import type { Cell } from "./types";

function emptyBoard(): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      cells.push({ row, col, piece: "empty" });
    }
  }
  return cells;
}

test("analysis counts powered switches through connected wires", () => {
  const board = emptyBoard();
  board.find((cell) => cell.row === 3 && cell.col === 1)!.piece = "power";
  board.find((cell) => cell.row === 3 && cell.col === 2)!.piece = "wire";
  board.find((cell) => cell.row === 3 && cell.col === 3)!.piece = "switch";

  const analysis = analyzeBoard(board);

  assert.equal(analysis.powerCount, 1);
  assert.equal(analysis.switchCount, 1);
  assert.equal(analysis.poweredSwitches, 1);
});

test("simulation reports failures for disconnected switches", () => {
  const board = emptyBoard();
  board.find((cell) => cell.row === 0 && cell.col === 0)!.piece = "power";
  board.find((cell) => cell.row === 4 && cell.col === 4)!.piece = "switch";

  const result = simulateBoard(board);

  assert.equal(result.succeeded, false);
  assert.equal(result.failures.some((failure) => failure.reason === "No signal"), true);
});

test("spacing reduces overheating in dense areas", () => {
  const crowded = emptyBoard();
  crowded.find((cell) => cell.row === 3 && cell.col === 3)!.piece = "power";
  crowded.find((cell) => cell.row === 3 && cell.col === 2)!.piece = "wire";
  crowded.find((cell) => cell.row === 3 && cell.col === 4)!.piece = "wire";
  crowded.find((cell) => cell.row === 2 && cell.col === 3)!.piece = "switch";
  crowded.find((cell) => cell.row === 4 && cell.col === 3)!.piece = "switch";

  const cooled = crowded.map((cell) => ({ ...cell }));
  cooled.find((cell) => cell.row === 2 && cell.col === 2)!.piece = "spacing";
  cooled.find((cell) => cell.row === 4 && cell.col === 4)!.piece = "spacing";

  const hotResult = analyzeBoard(crowded);
  const coolResult = analyzeBoard(cooled);

  assert.ok(coolResult.maxHeat <= hotResult.maxHeat);
});
