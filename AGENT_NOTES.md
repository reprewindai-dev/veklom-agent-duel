# 🤖 Agent Notes — Veklom Agent Duel

> Last updated: June 22, 2026 — v0.4.0

---

## What This Is

This is **Veklom Agent Duel** — a Base Mini App + standalone web game deployed on Vercel and pointed at `veklom.com`. Routing/crash-style game where players back one of two AI agents (Vector North or Quiet Switch), watch a multiplier curve build, and eject before the round ends.

The app lives at:
- **Vercel production**: auto-assigned on first deploy (see Vercel dashboard)
- **Final domain**: `duel.veklom.com` — needs DNS CNAME record pointing to Vercel
- **veklom.com homepage**: should include a link/widget to this app

---

## v0.4.0 Change — Mobile Wallet Fix

**Problem**: The original `WalletConnect.tsx` called `window.ethereum` directly. On mobile (iOS Safari, Android Chrome), there is no injected `ethereum` object unless inside Coinbase Wallet's in-app browser. This caused the "Please install Base Wallet" alert to fire immediately on any normal mobile browser.

**Fix**: Replaced `window.ethereum` with **OnchainKit `<ConnectWallet>`** + **Coinbase Smart Wallet** via wagmi v2.
- Added `app/providers.tsx` — wraps app in `WagmiProvider` + `QueryClientProvider` + `OnchainKitProvider`
- `WalletConnect.tsx` now uses `<ConnectWallet>` from `@coinbase/onchainkit/wallet`
- `coinbaseWallet({ preference: 'smartWalletOnly' })` enables Coinbase Smart Wallet which works on mobile via deep-link/QR — no extension required
- Added `@coinbase/wallet-sdk` and `@tanstack/react-query` to `package.json`
- Added `@coinbase/onchainkit/styles.css` import to `layout.tsx`

---

## Repo Structure

```
veklom-agent-duel/
├── AGENT_NOTES.md
├── README.md
├── package.json             ← v0.4.0
├── next.config.js
├── vercel.json
├── public/
│   ├── .well-known/
│   │   └── farcaster.json   ← Base Mini App manifest (needs signing)
│   └── og.png
├── app/
│   ├── providers.tsx        ← Wagmi + OnchainKit providers (NEW v0.4.0)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       ├── session/route.ts  ← x402 payment-gated session
│       └── verify/route.ts
└── components/
    ├── AgentDuel.tsx
    └── WalletConnect.tsx     ← OnchainKit ConnectWallet (v0.4.0 rewrite)
```

---

## TODO Before Going Live

### 1. Sign the Base Manifest
- Go to https://build.base.org
- Connect the Veklom wallet/account
- Sign → get `accountAssociation.header`, `.payload`, `.signature`
- Paste into `public/.well-known/farcaster.json`
- Replace all `YOUR_DOMAIN` placeholders with the real domain

### 2. Replace Image Assets
- `public/og.png` — 1200×630
- `public/icon.png` — 1024×1024
- `public/hero.png` — 1920×1080
- `public/splash.png` — 400×300
- `public/screenshot-1.png` + `screenshot-2.png`

### 3. Environment Variables (set in Vercel dashboard)
```
NEXT_PUBLIC_CDP_API_KEY=          # Coinbase Developer Platform API key — REQUIRED for OnchainKit
NEXT_PUBLIC_APP_URL=              # Your live domain e.g. https://duel.veklom.com
NEXT_PUBLIC_BASE_CHAIN_ID=8453
X402_FACILITATOR_URL=             # https://x402.org/facilitator
X402_PAYMENT_AMOUNT_USDC=0.10
X402_RESOURCE_URL=                # Full URL of the gated resource
SESSION_SECRET=                   # Random 32-char secret
```

### 4. Connect Domain
- Vercel → Domains → Add `duel.veklom.com`
- Cloudflare DNS: CNAME `duel` → `cname.vercel-dns.com`
- Vercel auto-provisions TLS

### 5. Publish as Base Mini App
- After domain is live + manifest signed
- Base app → search your URL → follow publish flow

---

## x402 Flow

```
Client                          Server
  │── GET /api/session ────────>│
  │<── 402 Payment Required ────│
  │  [User signs in wallet]     │
  │── GET /api/session ────────>│  (with PAYMENT-SIGNATURE header)
  │<── 200 OK + session token ──│
  │  [Game proceeds]            │
```

## Legal Note

Real-money chance-based wagering requires licensing in Ontario (AGCO). The x402 flow gates **access** (session fee), not wagering. Any real-money pot mechanics require legal review.

---

## Links
- GitHub: https://github.com/reprewindai-dev/veklom-agent-duel
- CDP Docs: https://docs.cdp.coinbase.com
- Base Mini App Docs: https://docs.base.org/mini-apps
- x402 Docs: https://docs.cdp.coinbase.com/x402
- OnchainKit Docs: https://onchainkit.xyz/wallet/connect-wallet
