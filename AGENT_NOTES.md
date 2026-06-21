# 🤖 Agent Notes — Veklom Agent Duel

> Last updated: June 21, 2026 — Written for any AI agent picking this up.

---

## What This Is

This is **Veklom Agent Duel** — a Base Mini App + standalone web game deployed on Vercel and pointed at `veklom.com`. It is a routing/crash-style game where players back one of two AI agents (Vector North or Quiet Switch), watch a multiplier curve build, and eject before the round ends.

The app lives at:
- **Vercel production**: auto-assigned on first deploy (see Vercel dashboard)
- **Final domain**: `duel.veklom.com` or `play.veklom.com` — needs DNS A/CNAME record pointing to Vercel
- **veklom.com homepage**: should include a link/widget to this app

---

## Repo Structure

```
veklom-agent-duel/
├── AGENT_NOTES.md           ← You are here
├── README.md
├── package.json
├── next.config.js
├── vercel.json
├── public/
│   ├── .well-known/
│   │   └── farcaster.json   ← Base Mini App manifest (needs signing)
│   └── og.png               ← OG/share image (replace with real asset)
├── app/
│   ├── layout.tsx           ← Root layout with Base/OG meta tags
│   ├── page.tsx             ← Main game page
│   ├── api/
│   │   ├── session/
│   │   │   └── route.ts     ← x402 payment-gated session endpoint
│   │   └── verify/
│   │       └── route.ts     ← x402 payment verification endpoint
└── components/
    ├── AgentDuel.tsx        ← Full game component (crash loop, nodes, canvas)
    └── WalletConnect.tsx    ← Base/OnchainKit wallet connect button
```

---

## TODO Before Going Live

### 1. Sign the Base Manifest
- Go to https://build.base.org
- Connect the Veklom wallet/account
- Sign and get `accountAssociation.header`, `.payload`, `.signature`
- Paste into `public/.well-known/farcaster.json`
- Replace all `YOUR_DOMAIN` placeholders with the real Vercel/custom domain

### 2. Replace Image Assets
- `public/og.png` — 1200×630 OG share image
- `public/icon.png` — 1024×1024 PNG app icon (no text, high contrast)
- `public/hero.png` — 1920×1080 hero image for Base discovery
- `public/splash.png` — 400×300 splash/loading image
- `public/screenshot-1.png` and `screenshot-2.png` — gameplay screenshots

### 3. Environment Variables (set in Vercel dashboard)
```
NEXT_PUBLIC_CDP_API_KEY=          # Coinbase Developer Platform API key
NEXT_PUBLIC_WALLET_CONNECT_ID=    # WalletConnect project ID (optional)
NEXT_PUBLIC_BASE_CHAIN_ID=8453    # Base mainnet chain ID
X402_FACILITATOR_URL=             # Coinbase x402 facilitator endpoint
X402_PAYMENT_AMOUNT_USDC=         # Amount in USDC for session access e.g. 0.10
X402_RESOURCE_URL=                # Full URL of the gated resource/endpoint
SESSION_SECRET=                   # Random 32-char secret for session signing
```

### 4. Connect Domain
- In Vercel project settings → Domains → Add `duel.veklom.com`
- In Cloudflare (or wherever veklom.com DNS lives): add CNAME `duel` → `cname.vercel-dns.com`
- Vercel auto-provisions TLS
- Add a link on `veklom.com` homepage pointing to `https://duel.veklom.com`

### 5. Publish as Base Mini App
- After domain is live and manifest is signed and accessible at `https://duel.veklom.com/.well-known/farcaster.json`
- Open Base app → search your app URL → follow publish flow

---

## x402 Flow Summary

```
Client                          Server (Next.js API route)
  │                                 │
  │── GET /api/session ────────────>│
  │<── 402 Payment Required ────────│  (with PAYMENT-REQUIRED header)
  │                                 │
  │  [User signs payment in wallet] │
  │                                 │
  │── GET /api/session ────────────>│  (with PAYMENT-SIGNATURE header)
  │                 [Server verifies via x402 facilitator]
  │<── 200 OK + session token ──────│
  │                                 │
  │  [Client stores session token]  │
  │  [Game proceeds]                │
```

## Legal Note

Real-money chance-based wagering requires licensing in Ontario (AGCO) and most jurisdictions. The x402 flow implemented here gates **access** (like a session fee), not pari-mutuel/pool wagering. Any real-money pot mechanics require legal review before launch. This scaffold is built for access-gated gameplay, not regulated gambling.

---

## Contacts
- GitHub: https://github.com/reprewindai-dev/veklom-agent-duel
- Brand: Veklom — https://veklom.com
- CDP Docs: https://docs.cdp.coinbase.com
- Base Mini App Docs: https://docs.base.org/mini-apps
- x402 Docs: https://docs.cdp.coinbase.com/x402
