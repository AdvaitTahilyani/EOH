import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import express from "express";

const app = express();
const dataDir = path.resolve(process.cwd(), "data");
const dbPath = path.join(dataDir, "leaderboard.db");
const clientDistDir = path.resolve(process.cwd(), "dist");

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    total INTEGER NOT NULL,
    performance INTEGER NOT NULL,
    efficiency INTEGER NOT NULL,
    stability INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());

function topScores() {
  return db
    .prepare(
      `SELECT
        id,
        name,
        total,
        performance,
        efficiency,
        stability,
        created_at as createdAt
      FROM leaderboard
      ORDER BY total DESC, created_at ASC
      LIMIT 10`
    )
    .all();
}

app.get("/api/leaderboard", (_request, response) => {
  response.json(topScores());
});

app.post("/api/scores", (request, response) => {
  const { name, total, performance, efficiency, stability } = request.body as Record<string, unknown>;

  if (
    typeof name !== "string" ||
    typeof total !== "number" ||
    typeof performance !== "number" ||
    typeof efficiency !== "number" ||
    typeof stability !== "number"
  ) {
    response.status(400).json({ error: "Invalid score payload" });
    return;
  }

  db.prepare(
    "INSERT INTO leaderboard (name, total, performance, efficiency, stability) VALUES (?, ?, ?, ?, ?)"
  ).run(name.slice(0, 10).toUpperCase(), total, performance, efficiency, stability);

  response.status(201).json(topScores());
});

if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));

  app.get(/^\/(?!api).*/, (_request, response) => {
    response.sendFile(path.join(clientDistDir, "index.html"));
  });
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`Chip exhibit server running on http://localhost:${port}`);
});
