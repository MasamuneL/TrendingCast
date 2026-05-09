interface TwitchGame {
  id: string;
  name: string;
}

interface TrendingData {
  topics: string[];
  peakHours: number[];
}

// fallback si Twitch no está configurado o falla
const FALLBACK_BY_CATEGORY: Record<string, TrendingData> = {
  gaming: { topics: ["Minecraft", "Valorant", "Speedrun"], peakHours: [20, 21, 22] },
  music: { topics: ["Lo-fi", "Live Session", "Beat Making"], peakHours: [18, 19, 20] },
  cooking: { topics: ["Quick Meals", "Street Food", "Baking"], peakHours: [11, 12, 19] },
  sports: { topics: ["Highlights", "Match Reaction", "Training"], peakHours: [15, 20, 21] },
  default: { topics: ["Trending Now", "Live Reaction", "Community Stream"], peakHours: [20, 21, 22] },
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
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return FALLBACK_BY_CATEGORY[category] ?? FALLBACK_BY_CATEGORY.default;
  }

  try {
    const games = await getTopGames();
    const topics = games.slice(0, 3).map((g) => g.name);
    const fallback = FALLBACK_BY_CATEGORY[category] ?? FALLBACK_BY_CATEGORY.default;
    return { topics, peakHours: fallback.peakHours };
  } catch (err) {
    console.error("[trending] Twitch API error, using fallback:", err);
    return FALLBACK_BY_CATEGORY[category] ?? FALLBACK_BY_CATEGORY.default;
  }
};
