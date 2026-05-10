interface TwitchGame {
  id: string;
  name: string;
}

interface TrendingData {
  topics: string[];
  peakHours: number[];
}

// fallback si Twitch no está configurado o falla — pool amplio para que roten
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

function sampleTopics(pool: string[], n = 3): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

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

// cache de 1h para no hammear la API
let _cache: { data: TwitchGame[]; ts: number } | null = null;

const getTopGames = async (): Promise<TwitchGame[]> => {
  if (_cache && Date.now() - _cache.ts < 3_600_000) return _cache.data;

  const token = await getTwitchToken();
  const res = await fetch("https://api.twitch.tv/helix/games/top?first=20", {
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID ?? "",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error(`Twitch games fetch failed: ${res.status}`);

  const json = (await res.json()) as { data?: TwitchGame[] };
  if (!Array.isArray(json.data)) {
    throw new Error(`Unexpected Twitch response shape: missing data array`);
  }
  _cache = { data: json.data, ts: Date.now() };
  return json.data;
};

export const getTrendingForCategory = async (category: string): Promise<TrendingData> => {
  const key = category.toLowerCase();
  const fallback = FALLBACK_POOL[key] ?? FALLBACK_POOL.default;

  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return { topics: sampleTopics(fallback.topics), peakHours: fallback.peakHours };
  }

  try {
    const games = await getTopGames();
    // Shuffle Twitch results so no siempre son los mismos top 3
    const shuffled = [...games].sort(() => Math.random() - 0.5);
    const topics = shuffled.slice(0, 3).map((g) => g.name);
    return { topics, peakHours: fallback.peakHours };
  } catch (err) {
    console.error("[trending] Twitch API error, using fallback:", err);
    return { topics: sampleTopics(fallback.topics), peakHours: fallback.peakHours };
  }
};
