# TrendSurge

AI-powered trending topic recommendation system for emerging streamers — built on Solana. TrendSurge analyzes what's trending across platforms and delivers personalized content recommendations on-chain, so streamers know exactly what to stream, when, and with what template.

As a plus, streamers can buy and sell content templates (CTAs, stream openers, hooks) using USDC micropayments via the [x402 protocol](https://x402.org), with reputation calculated entirely on-chain.

Built for the **Dev3Pack Hackathon**.

---

## The Problem

Emerging streamers don't know what to stream. They pick topics too late, miss trending moments, and lose potential growth. Existing tools are either too generic or locked behind expensive subscriptions.

## The Solution

TrendSurge gives every streamer a personalized, on-chain recommendation: which topics are trending in their category, the best hour to go live today, and a ready-to-use content template — all verifiable and immutable on Solana devnet.

---

## What it does

1. **Recommendation engine** — Backend fetches trending topics per category, determines the optimal streaming hour, and stores the recommendation on-chain via `save_recommendation`
2. **Streamer profiles** — Each streamer registers their category and preferred hours; the engine uses this to personalize recommendations
3. **Template marketplace** — Creators sell proven content templates; buyers pay in USDC via x402 HTTP 402 flow; every sale is recorded as an immutable `X402PaymentReceipt`
4. **On-chain reputation** — Score computed as `success_rate × total_sales + tokens_earned/1e9 + total_purchases × 2`; top performers earn TREND tokens

---

## Contract Deployment

| Network | Program ID |
|---------|-----------|
| Solana Devnet | `7us4TNvEtKYiq55ZKfAPztkCei8PpjwLsyCtuCLBAJaR` |

USDC mint (devnet): `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Circle official)

x402 facilitator: `https://x402.org/facilitator`

---

## Stack

| Layer | Tech |
|-------|------|
| Smart contract | Rust + Anchor 1.0.2 |
| Backend | Node 20 + Express + TypeScript + `@x402/express` |
| Frontend | React 18 + Vite + Tailwind + `@solana/wallet-adapter-react` |
| Network | Solana devnet only |

---

## Architecture

```
[Frontend React] ──fetch with X-PAYMENT──> [Backend Express + @x402/express]
                       ↑                              │
                  recommendations                     ├──> Trending topics APIs
                  + templates                         ├──> AI recommendation engine
                                                      ├──> [x402.org/facilitator] (verify + settle)
                                                      └──> [Anchor program on devnet]
                                                              save_recommendation
                                                              record_template_sale
                                                              calculate_reputation
```

---

## Setup

### Prerequisites

- [Rust](https://rustup.rs/) stable
- [Solana CLI 3.1.x (Agave)](https://docs.solanalabs.com/cli/install)
- [Anchor CLI 1.0.x](https://www.anchor-lang.com/docs/installation) — install via `cargo install --git https://github.com/coral-xyz/anchor avm && avm install latest && avm use latest`
- Node 20+ — recommended via [fnm](https://github.com/Schniz/fnm): `fnm install 20 && fnm use 20`
- [Phantom](https://phantom.app) or [Solflare](https://solflare.com) browser extension (for the frontend)

### 1. Clone

```bash
git clone https://github.com/MasamuneL/TrendSurge.git
cd TrendSurge
```

### 2. Configure Solana wallet

```bash
solana config set --url devnet
# generate a wallet if you don't have one
solana-keygen new --outfile ~/.config/solana/id.json
```

Fund it with devnet SOL: https://faucet.solana.com  
Fund it with devnet USDC: https://faucet.circle.com (needed to test purchases)

### 3. Build and deploy the smart contract

```bash
anchor build
anchor deploy --provider.cluster devnet
```

> If `anchor build` generates a new Program ID, run `anchor keys sync`, then update `declare_id!` in `programs/trendsurge/src/lib.rs`, `Anchor.toml`, `backend/.env`, and `web/.env`.

### 4. Run contract tests

```bash
anchor test --skip-local-validator --provider.cluster devnet
```

### 5. Backend

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `TRENDSURGE_PROGRAM_ID` | Program ID from step 3 (default is the deployed devnet address) |
| `WALLET_ADDRESS` | Your devnet wallet address in base58 — receives USDC from purchases (production only) |
| `WALLET_KEYPAIR_PATH` | Path to your `id.json` keypair — optional, a temporary keypair is used if missing |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | Optional — enables live trending data from Twitch. Create an app at [dev.twitch.tv](https://dev.twitch.tv/console). Falls back to static data if not set. |

```bash
npm install
npm run dev        # starts on http://localhost:3000
```

> In `NODE_ENV=development` the x402 paywall is disabled. Send `x-bypass-payment: true` header to skip payment in local testing (the frontend does this automatically in dev mode).

### 6. Frontend

```bash
cd web
cp .env.example .env
```

Open `web/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `VITE_TRENDSURGE_PROGRAM_ID` | Same Program ID as the backend |
| `VITE_SOLANA_RPC` | RPC endpoint — default is `https://api.devnet.solana.com` |
| `VITE_BACKEND_URL` | Backend URL — default is `http://localhost:3000` |

```bash
npm install
npm run dev        # starts on http://localhost:5173
```

Connect Phantom or Solflare to **Solana Devnet** before using the app.

---

## Program Instructions

| Instruction | Purpose |
|-------------|---------|
| `create_profile` | Register a streamer profile (category + preferred hours) |
| `save_recommendation` | Store an AI-generated recommendation on-chain (topics, best hour, template text) |
| `record_template_sale` | Record an x402-verified purchase; creates receipt + bumps reputation |
| `calculate_reputation` | Recalculate on-chain reputation score |
| `distribute_rewards` | Mint TREND tokens to a streamer (requires SPL mint authority) |

---

## PDAs

| Account | Seeds | What it stores |
|---------|-------|---------------|
| `StreamerProfile` | `["profile", wallet]` | Category, preferred hours |
| `Recommendation` | `["recommendation", streamer, timestamp]` | Trending topics, best hour, template text |
| `StreamTemplate` | `["template", creator, template_id]` | Content, price, sales count |
| `X402PaymentReceipt` | `["payment", buyer, template_pubkey]` | Payment proof, x402 signature |
| `StreamerReputation` | `["reputation", wallet]` | Score, sales, purchases, tokens earned |

---

## License

MIT
