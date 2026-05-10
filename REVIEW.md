# TrendSurge Backend — Code Review

**Reviewed:** 2026-05-08T00:00:00Z
**Depth:** deep (cross-file, Rust ↔ TypeScript boundary verification)
**Files Reviewed:** 18
**Status:** issues_found

---

## Summary

The backend has one BLOCKER-level security defect (the x402 paywall is entirely commented out, meaning every `/buy` endpoint is unprotected), one BLOCKER logic bug (duplicate `amountUsdc` argument passed to `recordTemplateSale` where `price_lamports` should differ), and one BLOCKER authorization failure (the backend backend signs `calculateReputation` with the backend wallet, not the creator's wallet, so the on-chain signer check will always reject it). Beyond those three, there are several HIGH-severity issues involving missing input validation, unsafe error exposure, and a wrong account field name that will cause a runtime crash.

---

## Critical Issues (BLOCKER)

### CR-01: x402 paywall middleware is commented out — every `/buy` call is unauthenticated

**File:** `backend/src/index.ts:16-22`

The `paymentMiddleware` block is entirely commented out. The comment says "once wallet address is defined." As a result, POST `/buy/:templateId` is reached with zero payment verification. The `bypassPayment` guard inside the route only skips body-parsing of the payment header; it does not reject requests that arrive without a valid proof-of-payment header. Any caller can trigger `recordSaleOnChain` — writing a `PaymentReceipt` with `status = Settled` on-chain — without paying a single cent.

**Fix:** Uncomment and complete the middleware wiring before the routes are mounted:
```typescript
import { paymentMiddleware } from "@x402/express";

app.use(
  paymentMiddleware(
    process.env.WALLET_ADDRESS!,          // payTo: must be a base58 Solana address
    { "/buy/*": { price: "$0.10", network: "solana-devnet" } },
    { url: process.env.FACILITATOR_URL ?? "https://x402.org/facilitator" }
  )
);
// routes must come AFTER this middleware
app.use("/buy", buyRouter);
```
Also validate `process.env.WALLET_ADDRESS` exists at startup and is a valid base58 Solana public key; if it is missing, refuse to start.

---

### CR-02: `recordTemplateSale` called with `amountUsdc` for BOTH `amount` and `price_lamports` — `PriceTooLow` will fire for cheap templates, and template price is set incorrectly

**File:** `backend/src/handlers/recordSale.ts:29-37`

The Rust instruction signature is:
```
record_template_sale(template_id: u32, amount: u64, x402_tx_signature: String, content: String, category: String, price_lamports: u64)
```

The handler passes:
```typescript
.recordTemplateSale(
  templateId,
  new BN(amountUsdc),   // amount        ✓ correct
  x402TxSignature,
  content,
  category,
  new BN(amountUsdc)    // price_lamports — WRONG, should come from template definition
)
```

Two separate bugs:
1. `price_lamports` is always set equal to `amountUsdc` (the buyer paid amount), not the template's listed price. When the first buyer pays $0.10 (100,000), the template is permanently recorded on-chain with `price_lamports = 100_000`, which happens to pass the `MIN_TEMPLATE_PRICE` check — but only because the happy-path amount matches. If a different amount is charged (e.g., premium tier at $0.50 = 500,000), the template is recorded with the wrong price.
2. More critically: the `require!(price_lamports >= MIN_TEMPLATE_PRICE, ...)` check in Rust (`record_template_sale.rs:69`) will reject any call where `amountUsdc < 100_000`. Since both arguments receive the same value, this is only accidentally safe for the standard $0.10 tier. Any future template priced differently will either fail the on-chain require or write incorrect pricing data.

**Fix:** Introduce a `templatePrice` parameter (sourced from the template registry or the route body) and pass it separately:
```typescript
interface RecordSaleParams {
  // ... existing fields
  templatePrice: number;  // the listed price from the template definition
}

// In the methods call:
.recordTemplateSale(
  templateId,
  new BN(amountUsdc),       // amount paid
  x402TxSignature,
  content,
  category,
  new BN(templatePrice)     // listed price for the template
)
```

---

### CR-03: `updateReputationOnChain` uses the backend wallet as signer, but `CalculateReputation` requires the streamer to sign

**File:** `backend/src/handlers/updateReputation.ts:12-15`

The Rust struct is:
```rust
pub struct CalculateReputation<'info> {
    pub reputation: Account<'info, StreamerReputation>,
    pub streamer: Signer<'info>,   // <-- must be the actual streamer
}
```

The Rust handler explicitly checks `rep.streamer == ctx.accounts.streamer.key()`.

The backend calls:
```typescript
await methods
  .calculateReputation()
  .accounts({ reputation: repPDA, streamer } as any)
  .rpc();
```

Here `streamer` is a `PublicKey` object, not a `Signer`. When `.rpc()` is called, Anchor signs the transaction with the backend wallet (from `getProgram()`). On-chain, `ctx.accounts.streamer` will be the backend wallet's pubkey. The `require!(rep.streamer == ctx.accounts.streamer.key(), ...)` check will always fail for any wallet that is not the backend wallet, returning `TrendSurgeError::Unauthorized`. Every post-sale reputation update call in `buy.ts:56-58` silently swallows this error in an empty catch block, hiding the failure completely.

**Fix (option A — architectural):** Change the Rust `CalculateReputation` instruction to accept an `authority` account that the backend can sign, rather than requiring the streamer themselves. This is appropriate because reputation recalculation is triggered by backend business logic, not by the streamer directly.

**Fix (option B — immediate workaround):** Have the streamer sign the transaction client-side and pass a signed transaction to the backend, or restructure so `calculateReputation` is only ever called directly from the frontend wallet adapter (not from the backend).

---

## High Issues (WARNING)

### WR-01: `saveRecommendationOnChain` — missing account `profile` in `.accounts()` causes on-chain error OR silent wrong signer

**File:** `backend/src/handlers/saveRecommendation.ts:28-40`

The `SaveRecommendation` Rust struct has `streamer: Signer<'info>`. In the `.accounts()` call, `streamer` is passed as a `PublicKey`. Anchor will only sign the transaction with the backend wallet. This means:

- If `streamerWallet` equals the backend wallet address, the instruction succeeds accidentally.
- If `streamerWallet` is any other address, the transaction fails with a signer mismatch at the Solana runtime level.

The same architectural issue as CR-03: the on-chain instruction requires the streamer to sign, but the backend has no way to produce that signature. Unlike CR-03 this failure is not silently swallowed — the `await methods...rpc()` will throw, which propagates back to the POST `/recommendations/:wallet/generate` route and returns HTTP 500.

**Fix:** Either redesign the instruction to accept an authority other than the streamer, or have the frontend sign and submit the transaction directly.

---

### WR-02: `recordSaleOnChain` — `templateId` passed as raw JS number to BN-expecting argument

**File:** `backend/src/handlers/recordSale.ts:30`

```typescript
.recordTemplateSale(
  templateId,    // plain number, not new BN(templateId)
  ...
)
```

The Rust instruction takes `template_id: u32`. Anchor's TypeScript client expects a `BN` or `number` for u32 fields. Passing a raw `number` works for small values but can silently lose precision or behave incorrectly for IDs above 2^31 if the Anchor version serializes them differently. All other numeric arguments in the same call use `new BN(...)` — this is inconsistent and risky.

**Fix:**
```typescript
.recordTemplateSale(
  new BN(templateId),
  new BN(amountUsdc),
  ...
)
```

---

### WR-03: `recommendations.ts` GET — `decode("recommendation", ...)` uses wrong account name casing

**File:** `backend/src/routes/recommendations.ts:31`

```typescript
return program.coder.accounts.decode("recommendation", a.account.data);
```

Anchor's account coder indexes accounts by their Rust struct name as it appears in the IDL, which for `#[account] pub struct Recommendation` becomes `"recommendation"` in the IDL (lowercase). This is correct for Anchor 1.0.2. However, the `memcmp` filter at offset 8 assumes the first 32 bytes after the discriminator are the `streamer` field. In `Recommendation`:

```rust
pub struct Recommendation {
    pub streamer: Pubkey,   // offset 8: 32 bytes ✓
    pub topics: Vec<String>,
    ...
}
```

This is correct. But there is a correctness risk: `getProgramAccounts` with this filter returns ALL program accounts (of any type) that have the streamer's pubkey at offset 8. If any other account type happens to have a pubkey at that position, it will be included. The `try/catch` around `decode` filters out non-decodable accounts, which mitigates this, but it adds unnecessary noise and latency from fetching irrelevant accounts.

**Fix:** Add a discriminator filter alongside the memcmp filter to limit results to only `Recommendation` accounts:
```typescript
// Get the discriminator for Recommendation accounts
const discriminator = program.coder.accounts.accountDiscriminator("recommendation");
filters: [
  { memcmp: { offset: 0, bytes: bs58.encode(discriminator) } },
  { memcmp: { offset: 8, bytes: streamer.toBase58() } },
]
```

---

### WR-04: `buy.ts` — `buyerWallet` from `req.body.buyer` is trusted as-is; no validation before on-chain call

**File:** `backend/src/routes/buy.ts:27,38-41`

When `bypassPayment` is true (development mode), `buyerWallet` comes directly from `req.body.buyer` with no validation:

```typescript
let buyerWallet = req.body.buyer as string;
// ...
if (!bypassPayment && paymentHeader) {
  buyerWallet = payment.payer ?? buyerWallet;
}
// buyerWallet used below with new PublicKey(buyerWallet) in recordSaleOnChain
```

If `req.body.buyer` is missing or is a malformed string in bypass mode, `new PublicKey(buyerWallet)` in `recordSaleOnChain` throws an uncaught error that leaks to the 500 handler with a raw Solana SDK error message. More importantly, in development mode there is no check that the `bypassPayment` feature is gated correctly — any client that sends the `x-bypass-payment: true` header in development can forge any buyer wallet address.

**Fix:** Validate that `buyerWallet` is a valid base58 public key before proceeding, and ensure bypass mode cannot impersonate an arbitrary wallet:
```typescript
import { PublicKey } from "@solana/web3.js";

function isValidSolanaPubkey(s: string): boolean {
  try { new PublicKey(s); return true; } catch { return false; }
}

if (!buyerWallet || !isValidSolanaPubkey(buyerWallet)) {
  res.status(400).json({ error: "Invalid or missing buyer wallet" });
  return;
}
```

---

### WR-05: `buy.ts` — x402 payment header JSON.parse without try/catch; malformed header crashes the route

**File:** `backend/src/routes/buy.ts:31`

```typescript
const payment = JSON.parse(Buffer.from(paymentHeader, "base64").toString());
```

If `paymentHeader` is not valid base64, `Buffer.from(...).toString()` produces garbage but does not throw. If the result is not valid JSON, `JSON.parse` throws a `SyntaxError`. This is inside the outer `try/catch` block, which catches it and returns HTTP 500 with `{ error: err.message }` — leaking the raw parse error including the malformed payload in the message.

The project rule from `x402-handling.md` is: "Si el `verify` del facilitator falla: devuelve 402 con razón clara, NO 500."

**Fix:**
```typescript
let payment: { signature?: string; payer?: string; amount?: number } = {};
try {
  payment = JSON.parse(Buffer.from(paymentHeader, "base64").toString());
} catch {
  res.status(402).json({ error: "Malformed payment header" });
  return;
}
```

---

### WR-06: `client.ts` — IDL and keypair read synchronously at first request; startup crash is silent

**File:** `backend/src/solana/client.ts:18,32`

Both `fs.readFileSync` calls for the keypair and the IDL are inside the lazy `getProgram()` function, which is called on the first request. If either file is missing, Node throws an uncaught error that propagates into the request handler and returns HTTP 500 to the first caller. The server appears healthy to a process monitor but is non-functional.

Additionally, the keypair path defaults to `~/.config/solana/id.json` — the developer's own wallet. In a CI/CD or container environment this file does not exist, and the error message will be cryptic.

**Fix:** Call `getProgram()` eagerly at server startup (before `app.listen`) and let the process exit with a clear message if initialization fails:
```typescript
// in index.ts, before app.listen:
try {
  getProgram(); // fail fast if IDL or keypair is missing
} catch (err) {
  console.error("FATAL: Could not initialize Anchor program:", err);
  process.exit(1);
}
```

---

### WR-07: `trending.ts` — Twitch credentials sent via URL query parameters (client_secret in URL)

**File:** `backend/src/services/trending.ts:26-29`

```typescript
const res = await fetch(
  `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
  { method: "POST" }
);
```

The `client_secret` is appended to the URL. This is the correct way Twitch's OAuth2 client_credentials endpoint works, but it means the secret will appear in:
- Node.js process logs if request URLs are logged
- Any proxy or load balancer access logs
- Network traces

**Fix:** Use a POST body instead:
```typescript
const res = await fetch("https://id.twitch.tv/oauth2/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID ?? "",
    client_secret: process.env.TWITCH_CLIENT_SECRET ?? "",
    grant_type: "client_credentials",
  }),
});
```

---

### WR-08: `recommendations.ts` GET — invalid wallet crashes with uncontrolled error message

**File:** `backend/src/routes/recommendations.ts:12`

```typescript
const streamer = new PublicKey(String(req.params.wallet));
```

This is inside the `try/catch` that returns `res.status(400).json({ error: err.message })`. A Solana SDK error from an invalid public key string will leak the raw SDK error text (e.g., "Invalid public key input") directly to callers. More importantly, any `Error` thrown in this route exposes its `.message` to untrusted clients — including internal Anchor/RPC errors from later in the function.

**Fix:** Validate the wallet address before using it, and normalize all error responses to avoid leaking internal details:
```typescript
let streamer: PublicKey;
try {
  streamer = new PublicKey(String(req.params.wallet));
} catch {
  res.status(400).json({ error: "Invalid wallet address" });
  return;
}
```

---

## Info Issues

### IN-01: `buy.ts` — empty catch swallows `updateReputationOnChain` errors silently

**File:** `backend/src/routes/buy.ts:57-59`

```typescript
try {
  await updateReputationOnChain(creator);
} catch {
  // no bloquear la respuesta si falla el recálculo
}
```

Given that `updateReputationOnChain` will always fail due to the signer mismatch (CR-03), this catch block hides every failure. At minimum the catch should log the error at `warn` level so the problem is visible in production logs. The x402 handling rules require `error`-level logging for post-settlement failures.

**Fix:**
```typescript
} catch (err) {
  console.warn("[updateReputation] failed after sale, skipping:", err);
}
```

---

### IN-02: `client.ts` — uses `@anchor-lang/core` but project rules specify `@coral-xyz/anchor`

**File:** `backend/src/solana/client.ts:1-2`, `backend/package.json`

The project's `.claude/rules/dependencies.md` rule explicitly states: "Para Solana/Anchor usa SOLO estas versiones: `@coral-xyz/anchor` (no `@project-serum/anchor`, está deprecado)". The backend uses `@anchor-lang/core` instead, which is the new name for Anchor 1.0.x. While `@anchor-lang/core` is correct for Anchor 1.0.2, this diverges from the documented project convention and could cause confusion if any contributor installs `@coral-xyz/anchor` alongside it.

**Fix:** Document the deliberate choice of `@anchor-lang/core` in `CLAUDE.md` or update the dependencies rule to reflect Anchor 1.0.x usage.

---

### IN-03: `recommender.ts` — `buildTemplateText` produces wrong output for midnight and noon

**File:** `backend/src/services/recommender.ts:10`

```typescript
const hour12 = bestHour > 12 ? `${bestHour - 12}pm` : `${bestHour}am`;
```

- `bestHour = 12` → `"12am"` (wrong, should be 12pm / noon)
- `bestHour = 0`  → `"0am"` (wrong, should be midnight / 12am)

The condition should be `>= 12` for pm, and 0 should map to 12:

**Fix:**
```typescript
const hour12 =
  bestHour === 0 ? "12am"
  : bestHour < 12 ? `${bestHour}am`
  : bestHour === 12 ? "12pm"
  : `${bestHour - 12}pm`;
```

---

### IN-04: `pdas.ts` — `PROGRAM_ID` hardcoded as fallback; silent wrong-program if env var is missing

**File:** `backend/src/solana/pdas.ts:9-11`

```typescript
export const PROGRAM_ID = new PublicKey(
  process.env.TrendSurge_PROGRAM_ID ?? "7us4TNvEtKYiq55ZKfAPztkCei8PpjwLsyCtuCLBAJaR"
);
```

The `constants.rs` rule and project conventions say to never hardcode the Program ID in client code and to read it from env vars. Silently falling back to a hardcoded ID means if the env var is missing (common in fresh dev environments), all PDA derivations silently target the wrong program. Errors will be confusing "account not found" failures instead of a clear startup error.

**Fix:** Throw at module load if the env var is missing:
```typescript
if (!process.env.TrendSurge_PROGRAM_ID) {
  throw new Error("TrendSurge_PROGRAM_ID env var is required");
}
export const PROGRAM_ID = new PublicKey(process.env.TrendSurge_PROGRAM_ID);
```

---

## Cross-File Verification Matrix

| Check | Backend | Rust | Match? |
|---|---|---|---|
| profile seed | `["profile", wallet]` | `[PROFILE_SEED, wallet]` where `PROFILE_SEED = b"profile"` | Yes |
| reputation seed | `["reputation", wallet]` | `[REPUTATION_SEED, wallet]` | Yes |
| template seed | `["template", creator, u32LE(id)]` | `[TEMPLATE_SEED, creator, &template_id.to_le_bytes()]` | Yes |
| payment seed | `["payment", buyer, templatePubkey]` | `[PAYMENT_SEED, buyer, template.key()]` | Yes |
| recommendation seed | `["recommendation", streamer, i64LE(ts)]` | `[REC_SEED, streamer, &timestamp.to_le_bytes()]` | Yes |
| `save_recommendation` arg order | `(timestamp BN, topics, bestHour, templateText)` | `(timestamp: i64, topics: Vec<String>, best_hour: u8, template_text: String)` | Yes |
| `record_template_sale` arg order | `(templateId, amountUsdc BN, sig, content, category, amountUsdc BN)` | `(template_id: u32, amount: u64, x402_tx_signature: String, content: String, category: String, price_lamports: u64)` | Partially — last arg is wrong (CR-02) |
| `calculate_reputation` args | none | none | Yes |
| `recordSale` accounts | `{template, paymentReceipt, creatorReputation, buyerReputation, buyer, creator, systemProgram}` | same field names in Rust struct | Yes |
| `saveRecommendation` accounts | `{recommendation, streamer, systemProgram}` | same | Yes |
| `calculateReputation` accounts | `{reputation, streamer}` | same | Yes |

PDA seeds all match the Rust constants. Account field names in `.accounts({})` calls all match the Rust struct field names. The arg order for `record_template_sale` has one value-level bug (CR-02) but the positional order is correct.

---

_Reviewed: 2026-05-08_
_Reviewer: Claude (adversarial code review)_
_Depth: deep_
