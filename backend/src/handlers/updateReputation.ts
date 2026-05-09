import { PublicKey } from "@solana/web3.js";
import { getProgram } from "../solana/client";
import { findReputationPDA } from "../solana/pdas";

export const updateReputationOnChain = async (streamerWallet: string) => {
  const program = getProgram();
  const accs = program.account as any;
  const methods = program.methods as any;
  const streamer = new PublicKey(streamerWallet);
  const [repPDA] = findReputationPDA(streamer);

  await methods
    .calculateReputation()
    .accounts({ reputation: repPDA, streamer } as any)
    .rpc();

  const rep = await accs.streamerReputation.fetch(repPDA);
  console.info("[updateReputation] wallet=%s score=%s", streamerWallet, rep.reputationScore.toString());

  return {
    reputationScore: rep.reputationScore.toString(),
    totalSales: rep.totalSales,
    totalPurchases: rep.totalPurchases,
    successRate: rep.successRate,
  };
};
