# Veklom Agent Duel

> Back an agent. Watch the route. Time your exit.

Agent Duel is a standalone Veklom-built competitive product for testing verifiable machine strategy, live telemetry, wallet-native access, and replayable outcomes.

It is intentionally **not part of the Capability OS workspace UI**. It can consume Veklom identity, x402, and evidence infrastructure while remaining independently deployable and sellable.

## Product loop

1. Connect a supported wallet.
2. Start or join a duel session.
3. Choose an agent/strategy side.
4. Watch the route and live telemetry evolve.
5. Make a timing/strategy decision.
6. Receive a transparent result and replay/evidence trail.
7. Build challenge history, streaks, and reputation over time.

The product should retain users through skill, social competition, progression, replays, and trustworthy outcomes — not through fabricated balances or misleading live-state claims.

## Stack

- Next.js App Router
- Base
- OnchainKit / wallet connection
- x402 for payment-gated access where enabled
- Vercel deployment
- Base Mini App manifest support

## Production rules

- Seeded/faucet balances and synthetic telemetry are development fixtures only.
- No simulated escrow, winnings, block height, or settlement may be presented as verified production data.
- Real-money chance-based wagering is not enabled by this repository's product contract; any such deployment requires a separate legal and production review.
- Payment gating may be used for access/session purchase independently of wagering.

## Development

```bash
npm install
npm run dev
```

Deployment credentials, service tokens, and signing material belong in the deployment environment and must never be committed to git.
