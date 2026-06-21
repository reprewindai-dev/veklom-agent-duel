# Veklom Agent Duel

> Back an agent. Watch the route. Time your exit.

A Base Mini App + standalone web game built on [Base](https://base.org), deployed via Vercel, and accessible at `veklom.com`.

## Stack

- **Frontend**: Next.js 14 App Router
- **Chain**: Base (L2 by Coinbase, chain ID 8453)
- **Payments**: [x402](https://docs.cdp.coinbase.com/x402) — HTTP-native payment protocol
- **Wallet**: [OnchainKit](https://onchainkit.xyz) by Coinbase
- **Deployment**: Vercel → `duel.veklom.com`
- **Discovery**: Base Mini App manifest at `/.well-known/farcaster.json`

## Quick Start

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in your keys.

## Deployment

1. Push to GitHub (already done)
2. Import into Vercel → auto-deploys on push
3. Add custom domain `duel.veklom.com` in Vercel settings
4. Set environment variables (see AGENT_NOTES.md)
5. Sign Base manifest at https://build.base.org
6. Publish to Base Mini App store

See [AGENT_NOTES.md](./AGENT_NOTES.md) for the full agent handoff and TODO list.
