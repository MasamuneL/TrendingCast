import { getTrendingForCategory } from "./trending";

export interface Recommendation {
  topics: string[];
  bestHour: number;
  templateText: string;
}

const TEMPLATES_BY_CATEGORY: Record<string, string[]> = {
  gaming: [
    'Hoy a las {hour}: "{topic}" está en tendencia — ¡únete! 🔴',
    '🎮 LIVE {hour} — Jugando {topic} hoy. ¿Te unes al chat?',
    'DROP EN {hour}: {topic} en vivo. Trae tu mejores plays 🏆',
    '🔥 Trending: {topic} · Stream a las {hour} · ¡No faltes!',
    'TONIGHT {hour} — {topic} run. Todos al stream 🎯',
  ],
  music: [
    '🎵 Sesión de {topic} en vivo a las {hour}',
    '🎶 {hour} — Noche de {topic}. ¡Chat, vengan!',
    'Live session: {topic} · {hour} · Sin interrupciones 🌙',
    '🎹 {hour}: Tocamos {topic} en vivo. ¡Vénganse!',
  ],
  irl: [
    '🌎 IRL desde las {hour}: {topic} en vivo hoy',
    'Salimos a las {hour} — hoy: {topic} 📍',
    '🎒 {hour} aventura en vivo: {topic}. ¡El chat decide!',
  ],
  art: [
    '🎨 Sesión creativa a las {hour}: {topic} en vivo',
    'Art stream {hour} — pintando {topic} contigo 🖌️',
    '✏️ {hour}: proceso completo de {topic}. Chat en vivo.',
  ],
  tech: [
    '💻 {hour}: codificando en vivo — {topic}',
    'Dev stream {hour} — hoy: {topic} desde cero 🛠️',
    '🔧 {hour}: tutorial en vivo de {topic}. ¡Preguntas bienvenidas!',
  ],
  default: [
    'Hoy a las {hour}: "{topic}" está en tendencia — ¡únete al stream! 🔴',
    '🔴 LIVE {hour} — Hoy: {topic}. ¡Chat activo!',
    '¡Stream en {hour}! Tema: {topic} 🎯',
    'Nos vemos a las {hour} para {topic} en vivo 🚀',
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const buildTemplateText = (topics: string[], bestHour: number, category: string): string => {
  const hour12 =
    bestHour === 0 ? "12am"
    : bestHour < 12 ? `${bestHour}am`
    : bestHour === 12 ? "12pm"
    : `${bestHour - 12}pm`;

  const key = category.toLowerCase();
  const pool = TEMPLATES_BY_CATEGORY[key] ?? TEMPLATES_BY_CATEGORY.default;
  const template = pick(pool);
  const topic = pick(topics) ?? "Trending Now";

  return template.replace("{hour}", hour12).replace("{topic}", topic);
};

const pickBestHour = (preferredHours: number[], peakHours: number[]): number => {
  const overlap = preferredHours.filter((h) => peakHours.includes(h));
  if (overlap.length > 0) return pick(overlap);
  if (preferredHours.length > 0) return pick(preferredHours);
  return pick(peakHours) ?? 20;
};

export const generateRecommendation = async (
  category: string,
  preferredHours: number[]
): Promise<Recommendation> => {
  const { topics, peakHours } = await getTrendingForCategory(category);
  // Shuffle topics so the order varies between calls
  const shuffled = [...topics].sort(() => Math.random() - 0.5);
  const bestHour = pickBestHour(preferredHours, peakHours);
  const templateText = buildTemplateText(shuffled, bestHour, category);

  return { topics: shuffled, bestHour, templateText };
};
