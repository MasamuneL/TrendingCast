import { BN } from "@anchor-lang/core";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getProgram } from "../solana/client";
import { findTemplatePDA, findPaymentPDA, findReputationPDA } from "../solana/pdas";

interface RecordSaleParams {
  templateId: number;
  buyerWallet: string;
  creatorWallet: string;
  amountUsdc: number;        // en unidades USDC con 6 decimales (ej: 100_000 = $0.10)
  x402TxSignature: string;
  content: string;
  category: string;
}

export const recordSaleOnChain = async (params: RecordSaleParams) => {
  const { templateId, buyerWallet, creatorWallet, amountUsdc, x402TxSignature, content, category } = params;

  const program = getProgram();
  const methods = program.methods as any;
  const buyer = new PublicKey(buyerWallet);
  const creator = new PublicKey(creatorWallet);

  const [templatePDA] = findTemplatePDA(creator, templateId);
  const [paymentPDA] = findPaymentPDA(buyer, templatePDA);
  const [creatorRepPDA] = findReputationPDA(creator);
  const [buyerRepPDA] = findReputationPDA(buyer);

  await methods
    .recordTemplateSale(
      templateId,
      new BN(amountUsdc),
      x402TxSignature,
      content,
      category,
      new BN(amountUsdc)
    )
    .accounts({
      template: templatePDA,
      paymentReceipt: paymentPDA,
      creatorReputation: creatorRepPDA,
      buyerReputation: buyerRepPDA,
      buyer,
      creator,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  console.info("[recordSale] buyer=%s creator=%s templateId=%d amount=%d sig=%s",
    buyerWallet, creatorWallet, templateId, amountUsdc, x402TxSignature);

  return { templatePDA: templatePDA.toBase58(), paymentPDA: paymentPDA.toBase58() };
};
