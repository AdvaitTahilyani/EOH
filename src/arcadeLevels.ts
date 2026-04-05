import type { ArcadeLevel } from "./types";

export const arcadeLevels: ArcadeLevel[] = [
  {
    id: 1,
    name: "Dual Boot",
    tagline: "Wake up two corners.",
    description: "Route one chip to two fixed switches without overheating the board.",
    instructions: "Place a power source, then build paths to both locked switches while routing around the center blocker.",
    tips: [
      "You must turn on both locked switches to pass.",
      "The steel square in the middle cannot be used.",
      "Keep the layout simple so you stay under the part limit."
    ],
    goal: {
      poweredSwitches: 2,
      maxHeat: 7,
      maxParts: 14
    },
    presetCells: [
      { row: 3, col: 3, piece: "blocker", locked: true },
      { row: 1, col: 5, piece: "switch", locked: true },
      { row: 5, col: 1, piece: "switch", locked: true }
    ]
  },
  {
    id: 2,
    name: "Triple Path",
    tagline: "Branch cleanly.",
    description: "Three switches are spread out now, so a simple straight line will not cut it.",
    instructions: "Build one network that reaches all three locked switches without trying to cross through the blocked middle lane.",
    tips: [
      "You need three powered switches in one run.",
      "The two steel blockers force you to route around them.",
      "Try branching from one main path instead of making three separate lines."
    ],
    goal: {
      poweredSwitches: 3,
      maxHeat: 7,
      maxParts: 16
    },
    presetCells: [
      { row: 1, col: 1, piece: "switch", locked: true },
      { row: 1, col: 5, piece: "switch", locked: true },
      { row: 5, col: 3, piece: "switch", locked: true },
      { row: 3, col: 2, piece: "blocker", locked: true },
      { row: 3, col: 4, piece: "blocker", locked: true }
    ]
  },
  {
    id: 3,
    name: "Hot Strip",
    tagline: "Manage the middle lane.",
    description: "This layout packs targets closer together, so spacing matters if you want to pass safely.",
    instructions: "Connect the three locked switches, but keep your wiring away from the heat zone in the center unless you cool the area.",
    tips: [
      "The flame tile makes nearby cells hotter.",
      "Use the locked spacing tile to help cool one side of the board.",
      "Watch the heat cap closely on this level."
    ],
    goal: {
      poweredSwitches: 3,
      maxHeat: 6,
      maxParts: 17
    },
    presetCells: [
      { row: 2, col: 1, piece: "switch", locked: true },
      { row: 3, col: 5, piece: "switch", locked: true },
      { row: 5, col: 2, piece: "switch", locked: true },
      { row: 3, col: 3, piece: "hotspot", locked: true },
      { row: 1, col: 3, piece: "spacing", locked: true }
    ]
  },
  {
    id: 4,
    name: "Cross Current",
    tagline: "Serve four targets.",
    description: "Now you need a denser network that still stays cool enough to survive the run.",
    instructions: "Power all four locked switches by routing around the four blockers and keeping the network cool enough to survive.",
    tips: [
      "The blocked cells cut up the center, so plan your route before placing parts.",
      "You must hit all four directions from one board.",
      "Spacing can save a crowded junction."
    ],
    goal: {
      poweredSwitches: 4,
      maxHeat: 6,
      maxParts: 19
    },
    presetCells: [
      { row: 1, col: 3, piece: "switch", locked: true },
      { row: 3, col: 1, piece: "switch", locked: true },
      { row: 3, col: 5, piece: "switch", locked: true },
      { row: 5, col: 3, piece: "switch", locked: true },
      { row: 2, col: 2, piece: "blocker", locked: true },
      { row: 2, col: 4, piece: "blocker", locked: true },
      { row: 4, col: 2, piece: "blocker", locked: true },
      { row: 4, col: 4, piece: "blocker", locked: true }
    ]
  },
  {
    id: 5,
    name: "Final Mesh",
    tagline: "Maximum reach, minimal waste.",
    description: "Five switches, a strict heat cap, and a tight part budget make this the full arcade challenge.",
    instructions: "This is the final puzzle: power all five locked switches while routing around blockers and surviving the two heat zones.",
    tips: [
      "The center route is dangerous because of both blockers and heat tiles.",
      "You need one efficient network, not extra side branches.",
      "Check your part count often so you do not run out of budget."
    ],
    goal: {
      poweredSwitches: 5,
      maxHeat: 5,
      maxParts: 21
    },
    presetCells: [
      { row: 1, col: 1, piece: "switch", locked: true },
      { row: 1, col: 5, piece: "switch", locked: true },
      { row: 3, col: 3, piece: "switch", locked: true },
      { row: 5, col: 1, piece: "switch", locked: true },
      { row: 5, col: 5, piece: "switch", locked: true },
      { row: 2, col: 3, piece: "hotspot", locked: true },
      { row: 4, col: 3, piece: "hotspot", locked: true },
      { row: 3, col: 2, piece: "blocker", locked: true },
      { row: 3, col: 4, piece: "blocker", locked: true }
    ]
  }
];
