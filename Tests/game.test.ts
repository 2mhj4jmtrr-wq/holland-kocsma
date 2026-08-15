import { describe, expect, it } from "vitest";
import { createGame, finishSetup, playCards, swapStartingCards } from "../src/engine/game";

describe("Game engine", () => {
  it("deals 3 face-down, 3 face-up and 3 hand cards", () => {
    const state = createGame(["A", "B"], 1, undefined, () => 0.5);
    for (const p of state.players) {
      expect(p.faceDownCards).toHaveLength(3);
      expect(p.faceUpCards).toHaveLength(3);
      expect(p.hand).toHaveLength(3);
    }
  });

  it("allows free starting swaps during setup", () => {
    const state = createGame(["A", "B"], 1, undefined, () => 0.5);
    const p = state.players[0]!;
    const hand = p.hand[0]!.id;
    const face = p.faceUpCards[0]!.id;
    const next = swapStartingCards(state, p.id, hand, face);
    expect(next.players[0]!.hand.map(c => c.id)).toContain(face);
    expect(next.players[0]!.faceUpCards.map(c => c.id)).toContain(hand);
  });

  it("moves from setup to playing", () => {
    const state = finishSetup(createGame(["A", "B"], 1));
    expect(state.phase).toBe("playing");
  });

  it("burns on a ten", () => {
    let state = finishSetup(createGame(["A", "B"], 1));
    const p = state.players[0]!;
    p.hand = [{ id: "10x", rank: "10", suit: "hearts" }, { id: "4x", rank: "4", suit: "hearts" }, { id: "5x", rank: "5", suit: "hearts" }];
    const result = playCards(state, p.id, ["10x"]);
    expect(result.event.type).toBe("BURN");
    expect(result.state.discardPile).toHaveLength(0);
    expect(result.state.currentPlayerId).toBe(p.id);
  });

  it("burns at four physical identical cards", () => {
    let state = finishSetup(createGame(["A", "B"], 1));
    const p = state.players[0]!;
    p.hand = [
      { id: "5a", rank: "5", suit: "hearts" },
      { id: "5b", rank: "5", suit: "diamonds" },
      { id: "5c", rank: "5", suit: "clubs" },
      { id: "5d", rank: "5", suit: "spades" }
    ];
    const result = playCards(state, p.id, ["5a", "5b", "5c", "5d"]);
    expect(result.event.type).toBe("BURN");
    expect(result.state.discardPile).toHaveLength(0);
  });
});
