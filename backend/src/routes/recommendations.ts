import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { getProgram } from "../solana/client";
import { PROGRAM_ID } from "../solana/pdas";
import { saveRecommendationOnChain } from "../handlers/saveRecommendation";

const router = Router();

// GET /recommendations/:wallet — devuelve la recomendación más reciente on-chain
router.get("/:wallet", async (req: Request, res: Response) => {
  try {
    const streamer = new PublicKey(String(req.params.wallet));
    const program = getProgram();

    // buscar todas las recomendaciones de este streamer con getProgramAccounts
    const accounts = await program.provider.connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { memcmp: { offset: 8, bytes: streamer.toBase58() } },
      ],
    });

    if (accounts.length === 0) {
      res.status(404).json({ error: "No recommendations found for this wallet" });
      return;
    }

    // decodificar y ordenar por timestamp descendente
    const recs = accounts
      .map((a) => {
        try {
          return program.coder.accounts.decode("recommendation", a.account.data);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.timestamp.toNumber() - a.timestamp.toNumber());

    const latest: any = recs[0];
    res.json({
      topics: latest.topics,
      bestHour: latest.bestHour,
      templateText: latest.templateText,
      timestamp: latest.timestamp.toNumber(),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /recommendations/:wallet/generate — genera y guarda una nueva recomendación on-chain
router.post("/:wallet/generate", async (req: Request, res: Response) => {
  try {
    const result = await saveRecommendationOnChain(String(req.params.wallet));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
