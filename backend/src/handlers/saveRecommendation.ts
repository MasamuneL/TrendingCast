import { PublicKey } from "@solana/web3.js";
import { getProgram } from "../solana/client";
import { findProfilePDA } from "../solana/pdas";
import { generateRecommendation } from "../services/recommender";

export interface RecommendationData {
  topics: string[];
  bestHour: number;
  templateText: string;
  timestamp: number;
}

// Genera datos de recomendación leyendo el perfil on-chain.
// El frontend es quien firma y guarda la cuenta Recommendation en devnet.
export const getRecommendationData = async (streamerWallet: string): Promise<RecommendationData> => {
  const program = getProgram();
  const accs = program.account as any;
  const streamer = new PublicKey(streamerWallet);

  const [profilePDA] = findProfilePDA(streamer);
  const profile = await accs.streamerProfile.fetch(profilePDA);

  const category: string = profile.category;
  const preferredHours: number[] = Array.from(profile.hours as Uint8Array);

  const { topics, bestHour, templateText } = await generateRecommendation(category, preferredHours);
  const timestamp = Math.floor(Date.now() / 1000);

  console.info("[getRecommendation] wallet=%s category=%s topics=%j bestHour=%d", streamerWallet, category, topics, bestHour);

  return { topics, bestHour, templateText, timestamp };
};
