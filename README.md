# TrendingCast

Decentralized marketplace on Solana where streamers buy and sell content templates using USDC micropayments via the [x402 protocol](https://x402.org). Reputation is calculated entirely on-chain.

Built for the **Dev3Pack Hackathon**.

---

## What it does

- Streamers create a profile with their content category and preferred streaming hours
- Content creators list templates (short texts, CTAs, stream openers — up to 256 chars)
- Buyers pay in USDC via x402 HTTP 402 flow; the facilitator handles settlement
- Every sale is recorded on-chain as an immutable `X402PaymentReceipt`
- Reputation scores are computed on-chain: `success_rate × total_sales + tokens_earned/1e9 + total_purchases × 2`
- Top creators earn TREND tokens distributed by the `distribute_rewards` instruction

---

## Contract Deployment

| Network | Program ID |
|---------|-----------|
| Solana Devnet | `CewXVE956fdWcnTCZYHRtfFDdueG66fGLLoedSUMwffD` |

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

| Instruction | Description |
|-------------|-------------|
| `create_profile` | Register a streamer profile (category + preferred hours) |
| `save_recommendation` | Store an AI-generated content recommendation on-chain |
| `record_template_sale` | Record an x402-verified purchase; creates receipt + bumps reputation |
| `calculate_reputation` | Recalculate on-chain reputation score |
| `distribute_rewards` | Mint TREND tokens to a streamer (requires SPL mint authority) |

---

## PDAs

| Account | Seeds |
|---------|-------|
| `StreamerProfile` | `["profile", wallet]` |
| `StreamerReputation` | `["reputation", wallet]` |
| `StreamTemplate` | `["template", creator, template_id (u32 LE)]` |
| `X402PaymentReceipt` | `["payment", buyer, template_pubkey]` |
| `Recommendation` | `["recommendation", streamer, timestamp (i64 LE)]` |

---

## License

MIT
