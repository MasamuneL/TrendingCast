import { PublicKey } from "@solana/web3.js";

const PROFILE_SEED = Buffer.from("profile");
const REPUTATION_SEED = Buffer.from("reputation");
const TEMPLATE_SEED = Buffer.from("template");
const PAYMENT_SEED = Buffer.from("payment");
const REC_SEED = Buffer.from("recommendation");

if (!process.env.TRENDINGCAST_PROGRAM_ID) {
  throw new Error("TRENDINGCAST_PROGRAM_ID env var not set");
}
export const PROGRAM_ID = new PublicKey(process.env.TRENDINGCAST_PROGRAM_ID);

export const findProfilePDA = (wallet: PublicKey) =>
  PublicKey.findProgramAddressSync([PROFILE_SEED, wallet.toBuffer()], PROGRAM_ID);

export const findReputationPDA = (wallet: PublicKey) =>
  PublicKey.findProgramAddressSync([REPUTATION_SEED, wallet.toBuffer()], PROGRAM_ID);

export const findTemplatePDA = (creator: PublicKey, templateId: number) => {
  const idBuf = Buffer.alloc(4);
  idBuf.writeUInt32LE(templateId, 0);
  return PublicKey.findProgramAddressSync(
    [TEMPLATE_SEED, creator.toBuffer(), idBuf],
    PROGRAM_ID
  );
};

export const findPaymentPDA = (buyer: PublicKey, templatePubkey: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [PAYMENT_SEED, buyer.toBuffer(), templatePubkey.toBuffer()],
    PROGRAM_ID
  );

export const findRecPDA = (streamer: PublicKey, timestamp: number) => {
  const tsBuf = Buffer.alloc(8);
  tsBuf.writeBigInt64LE(BigInt(timestamp), 0);
  return PublicKey.findProgramAddressSync(
    [REC_SEED, streamer.toBuffer(), tsBuf],
    PROGRAM_ID
  );
};
