import "dotenv/config";
import express from "express";
import cors from "cors";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";

import healthRouter from "./routes/health";
import recommendationsRouter from "./routes/recommendations";
import templatesRouter from "./routes/templates";
import buyRouter from "./routes/buy";
import profilesRouter from "./routes/profiles";
import trendingRouter from "./routes/trending";

const app = express();
const PORT = process.env.PORT ?? 3000;

const corsOrigin = process.env.NODE_ENV === "development"
  ? (origin: string | undefined, cb: (e: Error | null, ok?: boolean) => void) => cb(null, true)
  : (process.env.FRONTEND_URL ?? "http://localhost:5173");
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "50kb" }));

// x402 paywall — solo activo fuera de development
if (process.env.NODE_ENV !== "development") {
  const payTo = process.env.WALLET_ADDRESS;
  if (!payTo) {
    console.error("[FATAL] WALLET_ADDRESS not set — refusing to start in production without paywall");
    process.exit(1);
  } else {
    const facilitator = new HTTPFacilitatorClient({
      url: process.env.FACILITATOR_URL ?? "https://x402.org/facilitator",
    });

    app.use(
      paymentMiddlewareFromConfig(
        {
          "/buy": {
            accepts: {
              scheme: "exact",
              network: "solana:devnet",
              payTo,
              price: "100000", // $0.10 USDC en unidades atómicas (6 decimales)
              maxTimeoutSeconds: 120,
            },
          },
        },
        facilitator
      )
    );
    console.log(`[x402] paywall activo → payTo=${payTo}`);
  }
} else {
  console.log("[x402] paywall desactivado (development) — usar x-bypass-payment: true");
}

app.use("/health", healthRouter);
app.use("/trending", trendingRouter);
app.use("/recommendations", recommendationsRouter);
app.use("/templates", templatesRouter);
app.use("/buy", buyRouter);
app.use("/profiles", profilesRouter);

app.listen(PORT, () => {
  console.log(`TrendingCast backend running on port ${PORT} [${process.env.NODE_ENV}]`);
});
