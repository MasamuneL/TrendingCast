import { PublicKey } from '@solana/web3.js'
import { PROGRAM_ID } from './constants'

// Seeds must match programs/trendingcast/src/constants.rs exactly

export function getStreamerProfilePDA(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('profile'), wallet.toBuffer()],
    PROGRAM_ID,
  )
}

export function getTemplatePDA(creator: PublicKey, templateId: number): [PublicKey, number] {
  const idBuf = Buffer.alloc(4)
  idBuf.writeUInt32LE(templateId, 0)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('template'), creator.toBuffer(), idBuf],
    PROGRAM_ID,
  )
}

export function getReputationPDA(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('reputation'), wallet.toBuffer()],
    PROGRAM_ID,
  )
}

export function getPaymentReceiptPDA(
  buyer: PublicKey,
  templatePubkey: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('payment'), buyer.toBuffer(), templatePubkey.toBuffer()],
    PROGRAM_ID,
  )
}
