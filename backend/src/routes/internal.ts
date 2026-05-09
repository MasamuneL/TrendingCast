import { Router, Request, Response } from "express";
import { generateRecommendation } from "../services/recommender";

export const internalRouter = Router();

internalRouter.post("/generate", async (req: Request, res: Response) => {
  const { category, hours } = req.body as {
    category?: string;
    hours?: number[];
  };

  if (!category || typeof category !== "string") {
    res.status(400).json({ error: "category es requerido (string)" });
    return;
  }

  const streamerHours: number[] = Array.isArray(hours) ? hours : [];

  try {
    const result = await generateRecommendation(category, streamerHours);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[internal/generate] error:", message);
    res.status(500).json({ error: message });
  }
});