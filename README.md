# Holland Kocsma

Phase 1 starter: rule engine + tests.

## Current scope
- Card/deck model
- Game state
- Starting setup and swaps
- Normal move validation
- 2 / 3 / 7 / 10 / J / A foundations
- Burn detection
- Basic Ace challenge state
- Draw-and-try foundation
- Winner tracking foundation

## Run

```bash
npm install
npm test
npm run typecheck
```

## Important
This is **not yet the multiplayer/web UI**. It is intentionally the deterministic game-engine foundation. Before wiring Supabase/Next.js, the remaining edge cases around face-up/face-down play and challenge resolution should be expanded in tests.
