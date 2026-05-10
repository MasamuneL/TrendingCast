import { Router, Request, Response } from "express";
import { getTrendingForCategory } from "../services/trending";

const router = Router();

const CATEGORIES = ["gaming", "irl", "music", "art", "tech", "sports", "education"];

function buildTags(title: string, category: string): string[] {
  const words = title.split(/\s+/).filter((w) => w.length > 2);
  const cat = category.charAt(0).toUpperCase() + category.slice(1);
  return [...new Set([...words, cat])].slice(0, 3);
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
          id: `${c}-${i}`,
          title: topic,
          category: c,
          score: Math.round(1000 - i * 80 - Math.random() * 30),
          bestStreamHour: data.peakHours[i % data.peakHours.length] ?? 20,
          tags: buildTags(topic, c),
        }));
      })
    );
    res.json(results.flat());
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch trending topics" });
  }
});

export default router;
