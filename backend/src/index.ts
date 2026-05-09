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

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

// x402 paywall — solo activo fuera de development
if (process.env.NODE_ENV !== "development") {
  const payTo = process.env.WALLET_ADDRESS ?? "";
  if (!payTo) {
    console.warn("[x402] WALLET_ADDRESS no configurado — paywall desactivado");
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
app.use("/recommendations", recommendationsRouter);
app.use("/templates", templatesRouter);
app.use("/buy", buyRouter);
app.use("/profiles", profilesRouter);

app.listen(PORT, () => {
  console.log(`TrendingCast backend running on port ${PORT} [${process.env.NODE_ENV}]`);
});
