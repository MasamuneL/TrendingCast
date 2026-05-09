import { BN } from "@anchor-lang/core";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getProgram, getWallet } from "../solana/client";
import { findRecPDA, findProfilePDA } from "../solana/pdas";
import { generateRecommendation } from "../services/recommender";

export const saveRecommendationOnChain = async (streamerWallet: string) => {
  const program = getProgram();
  // FIXME: program.account y program.methods son any — sin tipos generados por anchor build
  const accs = program.account as any;
  const methods = program.methods as any;
  const streamer = new PublicKey(streamerWallet);

  const [profilePDA] = findProfilePDA(streamer);
  const profile = await accs.streamerProfile.fetch(profilePDA);

  const category = profile.category;
  const preferredHours = Array.from(profile.hours as Uint8Array);

  const { topics, bestHour, templateText } = await generateRecommendation(
    category,
    preferredHours
  );

  const timestamp = Math.floor(Date.now() / 1000);
  const [recPDA] = findRecPDA(streamer, timestamp);

  const authority = getWallet().publicKey;

  await methods
    .saveRecommendation(
      new BN(timestamp),
      topics,
      bestHour,
      templateText
    )
    .accounts({
      recommendation: recPDA,
      streamer,
      authority,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  console.info("[saveRecommendation] wallet=%s topics=%j bestHour=%d ts=%d", streamerWallet, topics, bestHour, timestamp);

  return { topics, bestHour, templateText, timestamp, pda: recPDA.toBase58() };
};
