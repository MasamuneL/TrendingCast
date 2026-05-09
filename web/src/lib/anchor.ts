import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import type { AnchorWallet } from '@solana/wallet-adapter-react'
import { SOLANA_RPC } from './constants'
import idl from './trendingcast.json'

// FIXME: cast to any to avoid TS2589 (Anchor generic depth limit with inferred IDL types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProgram = Program<any>

function getProgram(wallet: AnchorWallet): AnyProgram {
  const connection = new Connection(SOLANA_RPC, 'confirmed')
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (Program as any)(idl, provider)
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

  // recommendation (PDA auto from streamer+timestamp arg) and system_program (address auto)
  // are resolved by Anchor — only pass the non-derivable accounts
  const tx = await (program.methods as any)
    .saveRecommendation(ts, data.topics, data.bestHour, data.templateText)
    .accounts({
      streamer,
      authority: wallet.publicKey,
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

  // All PDAs (template, payment_receipt, creator_reputation, buyer_reputation) and
  // system_program are auto-resolved by Anchor from buyer + creator + template_id arg
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
      buyer: args.buyer,
      creator: args.creator,
      authority: wallet.publicKey,
    })
    .rpc()

  return tx as string
}
