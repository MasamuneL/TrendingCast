import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { getProgram } from "../solana/client";
import { findProfilePDA, findReputationPDA } from "../solana/pdas";

const router = Router();

// GET /profiles/:wallet — devuelve el perfil y reputación del streamer
router.get("/:wallet", async (req: Request, res: Response) => {
  let wallet: PublicKey;
  try {
    wallet = new PublicKey(String(req.params.wallet));
  } catch {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  try {
    const program = getProgram();
    const accs = program.account as any;
    const [profilePDA] = findProfilePDA(wallet);

    let profile: any;
    try {
      profile = await accs.streamerProfile.fetch(profilePDA);
    } catch (e: any) {
      if (e.message?.includes("Account does not exist") || e.message?.includes("has no data")) {
        res.status(404).json({ error: "Profile not found. Create one from the frontend." });
        return;
      }
      throw e;
    }

    // reputación es opcional — puede no existir aún
    let reputation = null;
    try {
      const [repPDA] = findReputationPDA(wallet);
      const rep = await accs.streamerReputation.fetch(repPDA);
      reputation = {
        totalSales: rep.totalSales,
        totalPurchases: rep.totalPurchases,
        successRate: rep.successRate,
        reputationScore: rep.reputationScore.toString(),
        tokensEarned: rep.tokensEarned.toString(),
      };
    } catch {
      // sin reputación todavía — OK
    }

    res.json({
      wallet: wallet.toBase58(),
      category: profile.category,
      hours: Array.from(profile.hours as Uint8Array),
      createdAt: profile.createdAt.toNumber(),
      profilePDA: profilePDA.toBase58(),
      reputation,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
