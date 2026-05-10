import { Router, Request, Response } from "express";
import { getTrendingForCategory } from "../services/trending";

const router = Router();

const CATEGORIES = ["gaming", "irl", "music", "art", "tech", "sports", "education"];

function buildTags(topic: string, category: string): string[] {
  const words = topic.split(/[\s\-_]+/).filter((w) => w.length > 2);
  return [...new Set([category.charAt(0).toUpperCase() + category.slice(1), ...words])].slice(0, 3);
}

// GET /trending?category=Gaming  — returns TrendingTopic[] for the frontend
router.get("/", async (req: Request, res: Response) => {
  const cat = (req.query.category as string | undefined)?.toLowerCase();
  const cats = cat && CATEGORIES.includes(cat) ? [cat] : CATEGORIES;

  try {
    const results = await Promise.all(
      cats.map(async (c) => {
        const data = await getTrendingForCategory(c);
        return data.topics.map((topic, i) => ({
          id: `${c}-${topic.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}-${i}`,
          title: topic,
          category: c,
          score: Math.round(1000 - i * 80 - Math.random() * 30),
          bestStreamHour: data.peakHours[Math.floor(Math.random() * data.peakHours.length)] ?? 20,
          tags: buildTags(topic, c),
        }));
      })
    );
    res.json(results.flat());
  } catch (err: any) {
    console.error("[trending] error:", err);
    res.status(500).json({ error: "Failed to fetch trending topics" });
  }
});

export default router;
