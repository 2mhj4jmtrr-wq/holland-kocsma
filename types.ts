export const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;
export type Rank = (typeof RANKS)[number];

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

export type Direction = 1 | -1;

export type GamePhase = "setup" | "playing" | "finished";

export type Player = {
  id: string;
  name: string;
  hand: Card[];
  faceUpCards: Card[];
  faceDownCards: Card[];
  finished: boolean;
  finishPosition?: number;
};

export type ChallengeState = {
  starterId: string;
  currentPlayerId: string;
};

export type GameSettings = {
  firstWinnerEndsGame: boolean;
};

export type GameState = {
  players: Player[];
  drawPile: Card[];
  discardPile: Card[];
  currentPlayerId: string;
  direction: Direction;
  phase: GamePhase;
  challenge: ChallengeState | null;
  winnerOrder: string[];
  settings: GameSettings;
};

export type Move =
  | { type: "PLAY_CARDS"; cardIds: string[]; challengeTargetId?: string }
  | { type: "DRAW_AND_TRY" }
  | { type: "FLIP_FACE_DOWN"; cardId: string }
  | { type: "FLIP_FACE_UP"; cardId: string };

export type MoveResult = {
  state: GameState;
  event: GameEvent;
};

export type GameEvent =
  | { type: "PLAYED"; playerId: string; cards: Card[] }
  | { type: "DRAWN"; playerId: string; card: Card }
  | { type: "BURN"; playerId: string }
  | { type: "DIRECTION_CHANGED"; direction: Direction }
  | { type: "CHALLENGE_STARTED"; starterId: string; targetId: string }
  | { type: "CHALLENGE_ENDED"; reason: "RESET" | "BURN" | "FAILED_RESPONSE" }
  | { type: "FACE_DOWN_FLIPPED"; playerId: string; card: Card }
  | { type: "FINISHED"; playerId: string; position: number };
