import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { getProgram } from "../solana/client";
import { getRecommendationData } from "../handlers/saveRecommendation";

const router = Router();

// GET /recommendations/:wallet — devuelve la recomendación más reciente guardada on-chain por el frontend
router.get("/:wallet", async (req: Request, res: Response) => {
  let streamer: PublicKey;
  try {
    streamer = new PublicKey(String(req.params.wallet));
  } catch {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  try {
    const program = getProgram();
    const all = await (program.account as any).recommendation.all([
      { memcmp: { offset: 8, bytes: streamer.toBase58() } },
    ]);

    if (all.length === 0) {
      res.status(404).json({ error: "No recommendations found for this wallet" });
      return;
    }

    const sorted = all
      .map((a: any) => a.account)
      .sort((a: any, b: any) => b.timestamp.toNumber() - a.timestamp.toNumber());

    const latest = sorted[0];
    res.json({
      topics: latest.topics,
      bestHour: latest.bestHour,
      templateText: latest.templateText,
      timestamp: latest.timestamp.toNumber(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

// POST /recommendations/:wallet/generate
// Genera topics, bestHour y templateText leyendo el perfil on-chain.
// No escribe on-chain — el frontend firma y ejecuta save_recommendation con el wallet del usuario.
router.post("/:wallet/generate", async (req: Request, res: Response) => {
  let wallet: PublicKey;
  try {
    wallet = new PublicKey(String(req.params.wallet));
  } catch {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  try {
    const result = await getRecommendationData(wallet.toBase58());
    res.json(result);
  } catch (err: any) {
    if (
      err.message?.includes("Account does not exist") ||
      err.message?.includes("has no data") ||
      err.message?.includes("account not found") ||
      err.code === 3012 ||
      err.message?.includes("AnchorError")
    ) {
      res.status(404).json({
        error: "Streamer profile not found. Create a profile first from the frontend.",
      });
      return;
    }
    res.status(500).json({ error: "Failed to generate recommendation" });
  }
});

export default router;
