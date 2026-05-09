import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js'
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

export async function createProfileOnChain(
  wallet: AnchorWallet,
  category: string,
  hours: number[],
): Promise<string> {
  const program = getProgram(wallet)

  const [profilePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('profile'), wallet.publicKey.toBuffer()],
    program.programId,
  )

  const tx = await (program.methods as any)
    .createProfile(category, hours)
    .accounts({
      profile: profilePDA,
      wallet: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
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

  const [recommendationPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('recommendation'), streamer.toBuffer(), ts.toArrayLike(Buffer, 'le', 8)],
    program.programId,
  )

  const tx = await (program.methods as any)
    .saveRecommendation(ts, data.topics, data.bestHour, data.templateText)
    .accounts({
      recommendation: recommendationPDA,
      streamer,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
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

  const [creatorReputationPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('reputation'), args.creator.toBuffer()],
    program.programId,
  )

  const [buyerReputationPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('reputation'), args.buyer.toBuffer()],
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
      creatorReputation: creatorReputationPDA,
      buyerReputation: buyerReputationPDA,
      buyer: args.buyer,
      creator: args.creator,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc()

  return tx as string
}
