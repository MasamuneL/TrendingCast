import "dotenv/config";
import express from "express";
import cors from "cors";

import healthRouter from "./routes/health";
import recommendationsRouter from "./routes/recommendations";
import templatesRouter from "./routes/templates";
import buyRouter from "./routes/buy";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

// TODO: configurar @x402/express middleware aquí una vez definida la wallet address
// import { paymentMiddleware } from "@x402/express";
// app.use(paymentMiddleware(
//   process.env.WALLET_ADDRESS,
//   { "/buy/*": { price: "$0.10", network: "solana-devnet" } },
//   { url: process.env.FACILITATOR_URL }
// ));

app.use("/health", healthRouter);
app.use("/recommendations", recommendationsRouter);
app.use("/templates", templatesRouter);
app.use("/buy", buyRouter);

app.listen(PORT, () => {
  console.log(`TrendingCast backend running on port ${PORT} [${process.env.NODE_ENV}]`);
});
