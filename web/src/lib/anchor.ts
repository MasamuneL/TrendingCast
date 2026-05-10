import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import type { AnchorWallet } from '@solana/wallet-adapter-react'
import { SOLANA_RPC, PROGRAM_ID } from './constants'
import idl from './trendsurge.json'

// FIXME: cast to any to avoid TS2589 (Anchor generic depth limit with inferred IDL types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProgram = Program<any>

function getProgram(wallet: AnchorWallet): AnyProgram {
  const connection = new Connection(SOLANA_RPC, 'confirmed')
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  // Always use PROGRAM_ID from env — IDL address may be stale from a previous deploy
  const patchedIdl = { ...idl, address: PROGRAM_ID.toBase58() }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (Program as any)(patchedIdl, provider)
}

// Anchor 0.30 new IDL format: accounts with "pda" or "address" are auto-resolved.
// Only pass accounts that Anchor cannot derive on its own.

export async function createProfileOnChain(
  wallet: AnchorWallet,
  category: string,
  hours: number[],
): Promise<string> {
  const program = getProgram(wallet)

  // profile (PDA auto) and system_program (address auto) are resolved by Anchor
  const tx = await (program.methods as any)
    .createProfile(category, Buffer.from(hours))
    .accounts({ wallet: wallet.publicKey })
    .rpc()

  return tx as string
}

export async function saveRecommendationOnChain(
  wallet: AnchorWallet,
  streamer: PublicKey,
  data: { topics: string[]; bestHour: number; templateText: string; timestamp: number },
): Promise<string> {
  const program = getProgram(wallet)
  const ts = new BN(data.timestamp)

  // Anchor 0.30.1 cannot auto-resolve PDAs with kind:"arg" seeds — derive manually.
  // recommendation seed: ["recommendation", streamer, timestamp (i64 LE)]
  const tsBuf = Buffer.alloc(8)
  tsBuf.writeBigInt64LE(BigInt(data.timestamp), 0)
  const [recPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('recommendation'), streamer.toBuffer(), tsBuf],
    program.programId,
  )

  const tx = await (program.methods as any)
    .saveRecommendation(ts, data.topics, data.bestHour, data.templateText)
    .accounts({
      recommendation: recPDA,
      streamer,
      authority: wallet.publicKey,
      // system_program auto-resolved from address field
    })
    .rpc()

  return tx as string
}

export async function recordTemplateSaleOnChain(
  wallet: AnchorWallet,
  args: {
    templateId: number
    buyer: PublicKey
    creator: PublicKey
    amountUsdc: number
    x402TxSignature: string
    content: string
    category: string
    priceLamports: number
  },
): Promise<string> {
  const program = getProgram(wallet)

  // template PDA has kind:"arg" seed (template_id u32 LE) — derive manually.
  // payment_receipt depends on the derived template PDA — also derive manually.
  // creator_reputation and buyer_reputation only have const+account seeds — auto-resolved.
  const idBuf = Buffer.alloc(4)
  idBuf.writeUInt32LE(args.templateId, 0)
  const [templatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('template'), args.creator.toBuffer(), idBuf],
    program.programId,
  )
  const [paymentReceiptPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('payment'), args.buyer.toBuffer(), templatePDA.toBuffer()],
    program.programId,
  )

  const tx = await (program.methods as any)
    .recordTemplateSale(
      args.templateId,
      new BN(args.amountUsdc),
      args.x402TxSignature,
      args.content,
      args.category,
      new BN(args.priceLamports),
    )
    .accounts({
      template: templatePDA,
      paymentReceipt: paymentReceiptPDA,
      buyer: args.buyer,
      creator: args.creator,
      authority: wallet.publicKey,
      // creatorReputation, buyerReputation: auto (const+account seeds)
      // systemProgram: auto (address field)
    })
    .rpc()

  return tx as string
}
