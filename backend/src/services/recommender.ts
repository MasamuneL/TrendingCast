import { getTrendingForCategory } from "./trending";

export interface Recommendation {
  topics: string[];
  bestHour: number;
  templateText: string;
}

const buildTemplateText = (topics: string[], bestHour: number): string => {
  const hour12 = bestHour > 12 ? `${bestHour - 12}pm` : `${bestHour}am`;
  return `Hoy a las ${hour12}: "${topics[0]}" está en tendencia — ¡únete al stream! 🔴`;
};

const pickBestHour = (preferredHours: number[], peakHours: number[]): number => {
  // intersección entre horas del streamer y horas pico de la categoría
  const overlap = preferredHours.filter((h) => peakHours.includes(h));
  if (overlap.length > 0) return overlap[0];
  // si no hay overlap, usar la hora pico más cercana a cualquier hora preferida
  if (preferredHours.length > 0) return preferredHours[0];
  return peakHours[0] ?? 20;
};

export const generateRecommendation = async (
  category: string,
  preferredHours: number[]
): Promise<Recommendation> => {
  const { topics, peakHours } = await getTrendingForCategory(category);
  const bestHour = pickBestHour(preferredHours, peakHours);
  const templateText = buildTemplateText(topics, bestHour);

  return { topics, bestHour, templateText };
};
