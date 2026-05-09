import { Router, Request, Response } from "express";
import { getProgram } from "../solana/client";

const router = Router();

// GET /templates — lista todos los templates on-chain
router.get("/", async (_req: Request, res: Response) => {
  try {
    const program = getProgram();
    const templates = await (program.account as any).streamTemplate.all();

    res.json(
      templates.map((t: any) => ({
        pubkey: t.publicKey.toBase58(),
        id: t.account.id,
        creator: t.account.creator.toBase58(),
        content: t.account.content,
        category: t.account.category,
        price: t.account.priceLamports.toString(),
        totalSales: t.account.totalSales,
        rating: t.account.rating,
      }))
    );
  } catch (err: any) {
    console.error("[templates] fetch error:", err);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

export default router;
