# TrendingCast

AI-powered trending topic recommendation system for emerging streamers — built on Solana. TrendingCast analyzes what's trending across platforms and delivers personalized content recommendations on-chain, so streamers know exactly what to stream, when, and with what template.

As a plus, streamers can buy and sell content templates (CTAs, stream openers, hooks) using USDC micropayments via the [x402 protocol](https://x402.org), with reputation calculated entirely on-chain.

Built for the **Dev3Pack Hackathon**.

---

## The Problem

Emerging streamers don't know what to stream. They pick topics too late, miss trending moments, and lose potential growth. Existing tools are either too generic or locked behind expensive subscriptions.

## The Solution

TrendingCast gives every streamer a personalized, on-chain recommendation: which topics are trending in their category, the best hour to go live today, and a ready-to-use content template — all verifiable and immutable on Solana devnet.

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
- [Anchor CLI 0.31+](https://www.anchor-lang.com/docs/installation) (`cargo install --git https://github.com/coral-xyz/anchor anchor-cli`)
- Node 20+ (use [fnm](https://github.com/Schniz/fnm): `fnm install 20 && fnm use 20`)

### 1. Clone and install

```bash
git clone https://github.com/MasamuneL/TrendingCast.git
cd TrendingCast
npm install
```

### 2. Configure Solana wallet

```bash
solana config set --url devnet
solana config set --keypair ~/.config/solana/id.json
```

Fund the wallet with devnet SOL: https://faucet.solana.com

### 3. Build the smart contract

```bash
anchor build
```

> If `anchor build` generates a new Program ID, sync it with:
> ```bash
> anchor keys sync
> ```
> Then update `declare_id!` in `programs/trendingcast/src/lib.rs` and `Anchor.toml`.

### 4. Deploy to devnet

```bash
anchor deploy --provider.cluster devnet
```

### 5. Run tests

```bash
anchor test --skip-local-validator --provider.cluster devnet
```

Expected output: **7 passing, 1 pending** (distribute_rewards skipped — requires a live TREND mint).

### 6. Backend

```bash
cd backend
cp .env.example .env   # fill in TRENDINGCAST_PROGRAM_ID and FACILITATOR_URL
npm install
npm run dev
```

### 7. Frontend

```bash
cd web
cp .env.example .env   # fill in VITE_TRENDINGCAST_PROGRAM_ID
npm install
npm run dev
```

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
