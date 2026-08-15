import { Card, Rank } from "./types";
import { numericRank } from "./cards";

export function isSpecial(rank: Rank): boolean {
  return rank === "2" || rank === "3" || rank === "7" || rank === "10" || rank === "J" || rank === "A";
}

export function effectiveRank(discardPile: Card[]): Rank | null {
  const last = discardPile.at(-1);
  if (!last) return null;
  if (last.rank !== "3") return last.rank;

  // A 3 copies the effective value of the card immediately before it.
  // If a 3 is the first card of a fresh pile, it remains a wildcard for validation.
  const before = discardPile.at(-2);
  return before ? effectiveRank(discardPile.slice(0, -1)) : null;
}

export function canPlayOn(card: Card, discardPile: Card[]): boolean {
  const current = effectiveRank(discardPile);

  if (!current) return true;

  // 3 is always playable.
  if (card.rank === "3") return true;

  // 2 resets the restriction.
  if (card.rank === "2") return true;

  // 10 is a burn and is allowed even on 7.
  if (card.rank === "10") return true;

  // Ace cannot be played on 7.
  if (current === "7" && card.rank === "A") return false;

  // 7 is a low-play state: 2, 3, 4, 5, 6, 7 and 10 are allowed.
  if (current === "7") {
    return ["4", "5", "6", "7"].includes(card.rank);
  }

  // Ace is a challenge card and may be played on any state except 7.
  if (card.rank === "A") return true;

  // J is the Jack/Jumbó rank in the game's order.
  return numericRank[card.rank] >= numericRank[current];
}

export function isSamePhysicalRankSequence(cards: Card[]): boolean {
  if (cards.length === 0) return false;
  const first = cards[0]!.rank;
  return cards.every((c) => c.rank === first) && first !== "3";
}

export function trailingPhysicalSameRankCount(discardPile: Card[]): number {
  if (discardPile.length === 0) return 0;
  const last = discardPile.at(-1)!;
  if (last.rank === "3") return 0;

  let count = 0;
  for (let i = discardPile.length - 1; i >= 0; i--) {
    if (discardPile[i]!.rank !== last.rank) break;
    count++;
  }
  return count;
}

export function isBurningCard(rank: Rank): boolean {
  return rank === "10";
}
