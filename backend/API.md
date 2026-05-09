# TrendingCast Backend API

Base URL (dev): `http://localhost:3000`

All endpoints return JSON. Errors follow `{ "error": "<message>" }`.

---

## GET /health

Liveness check.

**Response 200**
```json
{ "status": "ok", "ts": 1715200000000 }
```

---

## GET /profiles/:wallet

Fetches an on-chain `StreamerProfile` + optional `StreamerReputation` for a wallet.

**Path params**
| Param | Type | Description |
|-------|------|-------------|
| wallet | string | Solana base58 pubkey |

**Response 200**
```json
{
  "wallet": "HGew6wKAQ5...",
  "category": "gaming",
  "hours": [20, 21, 22],
  "createdAt": 1715100000,
  "profilePDA": "2StWdZFv...",
  "reputation": {
    "totalSales": 3,
    "totalPurchases": 1,
    "successRate": 100,
    "reputationScore": "305",
    "tokensEarned": "0"
  }
}
```

`reputation` is `null` if no sales/purchases have been recorded yet.

**Errors**
| Status | Meaning |
|--------|---------|
| 400 | Invalid wallet address |
| 404 | Profile not found — user must call `createProfile` from the frontend first |
| 500 | RPC error |

---

## GET /recommendations/:wallet

Returns the most recent recommendation saved on-chain for this wallet.

**Path params**
| Param | Type | Description |
|-------|------|-------------|
| wallet | string | Solana base58 pubkey |

**Response 200**
```json
{
  "topics": ["Minecraft", "Speedrun", "PvP"],
  "bestHour": 20,
  "templateText": "Going live at 8pm! Today we're doing a Minecraft speedrun — come hang!",
  "timestamp": 1715100000
}
```

**Errors**
| Status | Meaning |
|--------|---------|
| 400 | Invalid wallet address |
| 404 | No recommendations found for this wallet |
| 500 | RPC error |

---

## POST /recommendations/:wallet/generate

Calls Twitch Trending API, runs the recommender, saves result on-chain, and returns it.
Requires a `StreamerProfile` to exist for this wallet (create it from the frontend).

**Path params**
| Param | Type | Description |
|-------|------|-------------|
| wallet | string | Solana base58 pubkey |

**Response 200** — same shape as `GET /recommendations/:wallet`

**Errors**
| Status | Meaning |
|--------|---------|
| 400 | Invalid wallet address |
| 404 | StreamerProfile not found |
| 500 | Failed to generate recommendation |

---

## GET /templates

Lists all `StreamTemplate` accounts on-chain.

**Response 200**
```json
[
  {
    "pubkey": "HNWWbUrwJ...",
    "id": 1,
    "creator": "HGew6wKAQ5...",
    "content": "Going live at 8pm with Minecraft speedrun!",
    "category": "gaming",
    "price": "100000",
    "totalSales": 3,
    "rating": 0
  }
]
```

`price` is in USDC atomic units (6 decimals). `100000` = $0.10.

---

## POST /buy/:templateId

Purchase a template. In production, requires a valid x402 payment header (the client SDK handles this automatically). In development, pass `x-bypass-payment: true`.

**Path params**
| Param | Type | Description |
|-------|------|-------------|
| templateId | number | On-chain template ID (integer) |

**Headers (production)**
| Header | Value |
|--------|-------|
| X-PAYMENT | Base64-encoded x402 payment proof (set by `x402-solana` client SDK) |

**Headers (development bypass)**
| Header | Value |
|--------|-------|
| x-bypass-payment | `true` |

**Body**
```json
{
  "buyer": "HGew6wKAQ5...",
  "creator": "HGew6wKAQ5...",
  "content": "Going live at 8pm with Minecraft speedrun!",
  "category": "gaming",
  "price": 100000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| buyer | string | yes | Buyer's base58 pubkey |
| creator | string | yes | Template creator's base58 pubkey |
| content | string | yes | Template text content |
| category | string | yes | Stream category |
| price | number | no | Listed price in USDC atomic units (defaults to paid amount) |

**Response 200**
```json
{
  "receipt": "2StWdZFvSpNF...",
  "template": "HNWWbUrwJaYH..."
}
```

`receipt` = `PaymentReceipt` PDA address. `template` = `StreamTemplate` PDA address.

**Errors**
| Status | Meaning |
|--------|---------|
| 400 | Invalid templateId or buyer wallet, or missing required fields |
| 402 | Payment required / malformed payment header |
| 500 | On-chain transaction failed |

---

## x402 Payment Flow (frontend integration)

```
1. Client calls POST /buy/:templateId  (no payment header)
2. Backend returns HTTP 402 with payment requirements in WWW-Authenticate header
3. x402-solana client reads the requirements, builds payment proof
4. Client retries POST /buy/:templateId with X-PAYMENT header
5. Middleware verifies proof with x402.org/facilitator
6. Handler runs → records sale on-chain
7. Facilitator settles USDC transfer
```

Use the `x402-solana` SDK (`fetchWithPayment` or `wrapFetch`) to handle steps 2-4 automatically.

**Example (frontend)**
```typescript
import { wrapFetch } from "x402-solana";
import { useWallet } from "@solana/wallet-adapter-react";

const { signTransaction, publicKey } = useWallet();
const fetchWithX402 = wrapFetch(fetch, { wallet: { signTransaction, publicKey } });

const res = await fetchWithX402(`${API_URL}/buy/${templateId}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ buyer: publicKey.toBase58(), creator, content, category }),
});
```

---

## PDAs (for frontend verification)

All PDAs use the program `7us4TNvEtKYiq55ZKfAPztkCei8PpjwLsyCtuCLBAJaR`.

| Account | Seeds |
|---------|-------|
| StreamerProfile | `["profile", walletPubkey]` |
| StreamerReputation | `["reputation", walletPubkey]` |
| StreamTemplate | `["template", creatorPubkey, u32LE(templateId)]` |
| PaymentReceipt | `["payment", buyerPubkey, templatePubkey]` |
| Recommendation | `["recommendation", streamerPubkey, i64LE(timestamp)]` |

Mirror implementation: `backend/src/solana/pdas.ts` → copy to `web/src/lib/pdas.ts`.
