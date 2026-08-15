import { Card, RANKS, SUITS, Rank } from "./types";

export function createDeck(deckCount = 1): Card[] {
  if (!Number.isInteger(deckCount) || deckCount < 1) {
    throw new Error("deckCount must be a positive integer");
  }

  const cards: Card[] = [];
  for (let deck = 0; deck < deckCount; deck++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ id: `${deck + 1}-${suit}-${rank}`, suit, rank });
      }
    }
  }
  return cards;
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export const numericRank: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};
