interface TwitchCategory {
  id: string;
  name: string;
}

interface TrendingData {
  topics: string[];
  peakHours: number[];
}

// Keywords para mapear categorías de Twitch a nuestras categorías
const TWITCH_CATEGORY_MAP: Record<string, string[]> = {
  irl:       ["Just Chatting", "IRL", "Special Events", "Talk Shows & Podcasts", "Pools, Hot Tubs & Beaches"],
  music:     ["Music", "DJ", "Karaoke", "Music & Performing Arts"],
  art:       ["Art", "Makers & Crafting", "Body Art", "Graphic Design"],
  tech:      ["Science & Technology", "Software and Game Development", "Cybersecurity"],
  sports:    ["Sports", "Football", "Basketball", "FIFA", "Racing"],
  education: ["Education", "Science & Technology", "Talk Shows & Podcasts"],
};

// Fallback cuando Twitch no está configurado o no hay resultados para la categoría
const FALLBACK_POOL: Record<string, { topics: string[]; peakHours: number[] }> = {
  gaming:    { topics: ["Minecraft", "Valorant", "Speedrun", "Fortnite", "GTA V", "Elden Ring", "League of Legends", "Apex Legends"], peakHours: [19, 20, 21, 22] },
  music:     { topics: ["Lo-fi", "Live Session", "Beat Making", "Covers", "Piano Jazz", "Hip-hop Beats", "Guitarra Acústica"], peakHours: [18, 19, 20, 22] },
  irl:       { topics: ["Street Food Tour", "City Walk", "Travel Vlog", "Mercado Local", "Sunset Walk", "Café Crawl"], peakHours: [11, 15, 18, 20] },
  art:       { topics: ["Digital Art", "Character Design", "Speed Paint", "Pixel Art", "Ilustración", "Tattoo Design"], peakHours: [16, 18, 20, 21] },
  tech:      { topics: ["Solana Dev", "Web3 Tutorial", "React en vivo", "Open Source", "AI Hacking", "CLI Tools"], peakHours: [17, 18, 20, 21] },
  sports:    { topics: ["Match Reaction", "Training Session", "Highlights", "Draft Analysis", "Fantasy Sports"], peakHours: [15, 18, 20, 21] },
  education: { topics: ["Español Rápido", "Math Live", "Historia Interactiva", "Coding 101", "Finance Basics"], peakHours: [10, 12, 17, 19] },
  default:   { topics: ["Trending Now", "Live Reaction", "Community Stream", "Q&A Session", "Chill Stream"], peakHours: [19, 20, 21, 22] },
};

let _twitchToken: string | null = null;
let _tokenExpiry = 0;

const getTwitchToken = async (): Promise<string> => {
  if (_twitchToken && Date.now() < _tokenExpiry) return _twitchToken;

  const body = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID ?? "",
    client_secret: process.env.TWITCH_CLIENT_SECRET ?? "",
    grant_type: "client_credentials",
  });
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Twitch auth failed: ${res.status}`);

  const data = (await res.json()) as { access_token: string; expires_in: number };
  _twitchToken = data.access_token;
  _tokenExpiry = Date.now() + data.expires_in * 1000 - 60_000;
  return _twitchToken;
};

// Cache de 15min — suficiente para variedad sin hammear la API
let _cache: { data: TwitchCategory[]; ts: number } | null = null;

const getTopCategories = async (): Promise<TwitchCategory[]> => {
  if (_cache && Date.now() - _cache.ts < 900_000) return _cache.data;

  const token = await getTwitchToken();
  // Traemos top 50 para tener suficiente variedad en todas las categorías
  const res = await fetch("https://api.twitch.tv/helix/games/top?first=50", {
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID ?? "",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error(`Twitch categories fetch failed: ${res.status}`);

  const json = (await res.json()) as { data?: TwitchCategory[] };
  if (!Array.isArray(json.data)) throw new Error("Unexpected Twitch response shape");

  _cache = { data: json.data, ts: Date.now() };
  return json.data;
};

function sampleTopics(pool: string[], n = 3): string[] {
  return [...pool].sort(() => Math.random() - 0.5).slice(0, n);
}

const NON_GAME_NAMES = new Set(
  Object.values(TWITCH_CATEGORY_MAP).flat().map((s) => s.toLowerCase())
);

export const getTrendingForCategory = async (category: string): Promise<TrendingData> => {
  const key = category.toLowerCase();
  const fallback = FALLBACK_POOL[key] ?? FALLBACK_POOL.default;

  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return { topics: sampleTopics(fallback.topics), peakHours: fallback.peakHours };
  }

  try {
    const all = await getTopCategories();

    let matched: string[];

    if (key === "gaming") {
      // Gaming: todo lo que NO sea una categoría IRL/Music/etc
      matched = all
        .filter((c) => !NON_GAME_NAMES.has(c.name.toLowerCase()))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((c) => c.name);
    } else {
      const keywords = TWITCH_CATEGORY_MAP[key] ?? [];
      matched = all
        .filter((c) => keywords.some((kw) => c.name.toLowerCase().includes(kw.toLowerCase())))
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((c) => c.name);
    }

    // Si Twitch no tiene nada para esta categoría, usamos el fallback
    const topics = matched.length > 0 ? matched : sampleTopics(fallback.topics);
    return { topics, peakHours: fallback.peakHours };
  } catch (err) {
    console.error("[trending] Twitch API error, using fallback:", err);
    return { topics: sampleTopics(fallback.topics), peakHours: fallback.peakHours };
  }
};
