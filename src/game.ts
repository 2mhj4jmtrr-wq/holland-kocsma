import { createDeck, shuffle } from "./cards";
import { canPlayOn, effectiveRank, isBurningCard, trailingPhysicalSameRankCount } from "./rules";
import { Card, Direction, GameEvent, GameSettings, GameState, Move, MoveResult, Player } from "./types";

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function nextPlayerId(state: GameState, fromId: string, direction = state.direction): string {
  const active = state.players.filter((p) => !p.finished);
  if (active.length === 0) throw new Error("No active players");
  const index = active.findIndex((p) => p.id === fromId);
  if (index < 0) throw new Error("Player not found");
  return active[(index + (direction === 1 ? 1 : -1) + active.length) % active.length]!.id;
}

function getPlayer(state: GameState, id: string): Player {
  const player = state.players.find((p) => p.id === id);
  if (!player) throw new Error(`Unknown player: ${id}`);
  return player;
}

function removeCards(player: Player, ids: string[]): Card[] {
  const selected: Card[] = [];
  for (const id of ids) {
    const index = player.hand.findIndex((c) => c.id === id);
    if (index < 0) throw new Error("Card is not in player's hand");
    selected.push(player.hand[index]!);
  }
  player.hand = player.hand.filter((c) => !ids.includes(c.id));
  return selected;
}

function refillHand(state: GameState, player: Player): void {
  while (player.hand.length < 3 && state.drawPile.length > 0) {
    player.hand.push(state.drawPile.pop()!);
  }
}

function burn(state: GameState, playerId: string): void {
  state.discardPile = [];
  state.challenge = null;
  state.currentPlayerId = playerId;
}

function applyDirectionFromJacks(state: GameState, count: number): GameEvent | null {
  if (count < 1) return null;
  if (count >= 4) return { type: "BURN", playerId: state.currentPlayerId };
  if (count % 2 === 1) {
    state.direction = (state.direction * -1) as Direction;
    return { type: "DIRECTION_CHANGED", direction: state.direction };
  }
  return null;
}

export function createGame(playerNames: string[], deckCount: number, settings?: Partial<GameSettings>, rng = Math.random): GameState {
  if (playerNames.length < 2) throw new Error("At least 2 players are required");
  const players: Player[] = playerNames.map((name, i) => ({
    id: `p${i + 1}`,
    name,
    hand: [],
    faceUpCards: [],
    faceDownCards: [],
    finished: false
  }));

  const deck = shuffle(createDeck(deckCount), rng);
  for (const player of players) {
    for (let i = 0; i < 3; i++) player.faceDownCards.push(deck.pop()!);
    for (let i = 0; i < 3; i++) player.faceUpCards.push(deck.pop()!);
    for (let i = 0; i < 3; i++) player.hand.push(deck.pop()!);
  }

  return {
    players,
    drawPile: deck,
    discardPile: [],
    currentPlayerId: players[0]!.id,
    direction: 1,
    phase: "setup",
    challenge: null,
    winnerOrder: [],
    settings: { firstWinnerEndsGame: false, ...settings }
  };
}

export function finishSetup(stateInput: GameState): GameState {
  const state = cloneState(stateInput);
  state.phase = "playing";
  return state;
}

export function swapStartingCards(stateInput: GameState, playerId: string, handCardId: string, faceUpCardId: string): GameState {
  if (stateInput.phase !== "setup") throw new Error("Starting swaps are only allowed during setup");
  const state = cloneState(stateInput);
  const player = getPlayer(state, playerId);
  const handIndex = player.hand.findIndex((c) => c.id === handCardId);
  const faceIndex = player.faceUpCards.findIndex((c) => c.id === faceUpCardId);
  if (handIndex < 0 || faceIndex < 0) throw new Error("Card not found");
  [player.hand[handIndex], player.faceUpCards[faceIndex]] = [player.faceUpCards[faceIndex]!, player.hand[handIndex]!];
  return state;
}

export function playCards(stateInput: GameState, playerId: string, cardIds: string[], challengeTargetId?: string): MoveResult {
  const state = cloneState(stateInput);
  if (state.phase !== "playing") throw new Error("Game is not in playing phase");
  if (state.currentPlayerId !== playerId) throw new Error("Not this player's turn");
  if (cardIds.length === 0) throw new Error("No cards selected");
  const player = getPlayer(state, playerId);

  const unique = new Set(cardIds);
  if (unique.size !== cardIds.length) throw new Error("Duplicate card id");

  const selected = cardIds.map((id) => player.hand.find((c) => c.id === id));
  if (selected.some((c) => !c)) throw new Error("Card is not in player's hand");
  const cards = selected as Card[];

  const firstRank = cards[0]!.rank;
  if (!cards.every((c) => c.rank === firstRank)) {
    throw new Error("Multiple cards must have the same physical rank");
  }

  if (!canPlayOn(cards[0]!, state.discardPile)) throw new Error("Invalid move");

  const played = removeCards(player, cardIds);
  state.discardPile.push(...played);

  const event: GameEvent = { type: "PLAYED", playerId, cards: played };

  // 10 always burns immediately.
  if (firstRank === "10") {
    burn(state, playerId);
    refillHand(state, player);
    return { state, event: { type: "BURN", playerId } };
  }

  // Four or more physical identical cards burns. A 3 never contributes to this count.
  const trailing = trailingPhysicalSameRankCount(state.discardPile);
  if (trailing >= 4) {
    burn(state, playerId);
    refillHand(state, player);
    return { state, event: { type: "BURN", playerId } };
  }

  // 2 resets the restriction but does not grant an extra turn.
  if (firstRank === "2") {
    state.challenge = null;
    refillHand(state, player);
    state.currentPlayerId = nextPlayerId(state, playerId);
    return { state, event };
  }

  // Challenge handling.
  if (state.challenge) {
    if (!["2", "3", "10", "A"].includes(firstRank)) {
      throw new Error("Only 2, 3, 10 or A can answer an Ace challenge");
    }

    if (firstRank === "A" || firstRank === "3") {
      if (!challengeTargetId) throw new Error("A challenge response must target a player");
      if (challengeTargetId === playerId) throw new Error("Cannot challenge yourself");
      state.challenge.currentPlayerId = challengeTargetId;
      state.currentPlayerId = challengeTargetId;
      refillHand(state, player);
      return { state, event };
    }

    // 2/10 were handled above; this branch is defensive.
  }

  // 3 copies the effective rank/effect of the previous card.
  if (firstRank === "3") {
    const copied = effectiveRank(state.discardPile.slice(0, -1));
    if (copied === "A") {
      if (!challengeTargetId) throw new Error("An Ace-copying 3 must target a player");
      if (challengeTargetId === playerId) throw new Error("Cannot challenge yourself");
      state.challenge = { starterId: playerId, currentPlayerId: challengeTargetId };
      state.currentPlayerId = challengeTargetId;
      refillHand(state, player);
      return { state, event: { type: "CHALLENGE_STARTED", starterId: playerId, targetId: challengeTargetId } };
    }
    if (copied === "J") {
      const directionEvent = applyDirectionFromJacks(state, played.length);
      if (directionEvent?.type === "BURN") {
        burn(state, playerId);
        refillHand(state, player);
        return { state, event: directionEvent };
      }
      if (directionEvent) {
        refillHand(state, player);
        state.currentPlayerId = nextPlayerId(state, playerId);
        return { state, event: directionEvent };
      }
    }
  }

  // Jumbó direction change.
  if (firstRank === "J") {
    const directionEvent = applyDirectionFromJacks(state, played.length);
    if (directionEvent?.type === "BURN") {
      burn(state, playerId);
      refillHand(state, player);
      return { state, event: directionEvent };
    }
    if (directionEvent) {
      refillHand(state, player);
      state.currentPlayerId = nextPlayerId(state, playerId);
      return { state, event: directionEvent };
    }
  }

  // Ace starts a challenge.
  if (firstRank === "A") {
    if (!challengeTargetId) throw new Error("Ace must target a player");
    if (challengeTargetId === playerId) throw new Error("Cannot challenge yourself");
    state.challenge = { starterId: playerId, currentPlayerId: challengeTargetId };
    state.currentPlayerId = challengeTargetId;
    refillHand(state, player);
    return { state, event: { type: "CHALLENGE_STARTED", starterId: playerId, targetId: challengeTargetId } };
  }

  refillHand(state, player);
  if (player.hand.length === 0 && player.faceUpCards.length === 0 && player.faceDownCards.length === 0) {
    player.finished = true;
    state.winnerOrder.push(player.id);
    const position = state.winnerOrder.length;
    if (state.settings.firstWinnerEndsGame) state.phase = "finished";
    if (state.phase !== "finished") state.currentPlayerId = nextPlayerId(state, playerId);
    return { state, event: { type: "FINISHED", playerId, position } };
  }

  state.currentPlayerId = nextPlayerId(state, playerId);
  return { state, event };
}

export function drawAndTry(stateInput: GameState, playerId: string): MoveResult {
  const state = cloneState(stateInput);
  if (state.phase !== "playing") throw new Error("Game is not in playing phase");
  if (state.currentPlayerId !== playerId) throw new Error("Not this player's turn");
  if (state.drawPile.length === 0) throw new Error("Draw pile is empty");
  const player = getPlayer(state, playerId);
  const card = state.drawPile.pop()!;

  if (!canPlayOn(card, state.discardPile)) {
    player.hand.push(card);
    while (state.discardPile.length > 0) player.hand.push(state.discardPile.shift()!);
    state.challenge = null;
    state.currentPlayerId = nextPlayerId(state, playerId);
    return { state, event: { type: "DRAWN", playerId, card } };
  }

  player.hand.push(card);
  return playCards(state, playerId, [card.id]);
}
