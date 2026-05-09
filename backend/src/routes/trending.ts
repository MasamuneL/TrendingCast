import { Router, Request, Response } from "express";
import { getTrendingForCategory } from "../services/trending";

const router = Router();

const CATEGORIES = ["gaming", "irl", "music", "art", "tech", "sports", "education"];

// GET /trending?category=Gaming  — returns TrendingTopic[] for the frontend
router.get("/", async (req: Request, res: Response) => {
  const cat = (req.query.category as string | undefined)?.toLowerCase();
  const cats = cat && CATEGORIES.includes(cat) ? [cat] : CATEGORIES;

  try {
    const results = await Promise.all(
      cats.map(async (c) => {
        const data = await getTrendingForCategory(c);
        return data.topics.map((topic, i) => ({
          id: `${c}-${i}`,
          title: topic,
          category: c,
          score: 100 - i * 15,
          bestStreamHour: data.peakHours[0] ?? 20,
          tags: data.peakHours.map((h: number) => `${h}:00`),
        }));
      })
    );
    res.json(results.flat());
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch trending topics" });
  }
});

export default router;
