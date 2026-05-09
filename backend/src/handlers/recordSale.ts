import { BN } from "@anchor-lang/core";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { getProgram, getWallet } from "../solana/client";
import { findTemplatePDA, findPaymentPDA, findReputationPDA } from "../solana/pdas";

interface RecordSaleParams {
  templateId: number;
  buyerWallet: string;
  creatorWallet: string;
  amountUsdc: number;        // monto pagado en USDC 6 decimales (ej: 100_000 = $0.10)
  priceLamports: number;     // precio listado del template (puede diferir de amountUsdc)
  x402TxSignature: string;
  content: string;
  category: string;
}

export const recordSaleOnChain = async (params: RecordSaleParams) => {
  const { templateId, buyerWallet, creatorWallet, amountUsdc, priceLamports, x402TxSignature, content, category } = params;

  const program = getProgram();
  const methods = program.methods as any;
  const authority = getWallet().publicKey;
  const buyer = new PublicKey(buyerWallet);
  const creator = new PublicKey(creatorWallet);

  const [templatePDA] = findTemplatePDA(creator, templateId);
  const [paymentPDA] = findPaymentPDA(buyer, templatePDA);
  const [creatorRepPDA] = findReputationPDA(creator);
  const [buyerRepPDA] = findReputationPDA(buyer);

  const receiptAccount = await program.provider.connection.getAccountInfo(paymentPDA);
  if (receiptAccount !== null) {
    console.log("[recordSale] Receipt ya existe, skipping on-chain tx");
    return { receipt: paymentPDA.toBase58(), alreadyOwned: true };
  }

  await methods
    .recordTemplateSale(
      templateId,
      new BN(amountUsdc),
      x402TxSignature,
      content,
      category,
      new BN(priceLamports)
    )
    .accounts({
      template: templatePDA,
      paymentReceipt: paymentPDA,
      creatorReputation: creatorRepPDA,
      buyerReputation: buyerRepPDA,
      buyer,
      creator,
      authority,
      systemProgram: SystemProgram.programId,
    } as any)
    .rpc();

  console.info("[recordSale] buyer=%s creator=%s templateId=%d amount=%d sig=%s",
    buyerWallet, creatorWallet, templateId, amountUsdc, x402TxSignature);

  return { templatePDA: templatePDA.toBase58(), paymentPDA: paymentPDA.toBase58() };
};
