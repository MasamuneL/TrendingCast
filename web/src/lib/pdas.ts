import { PublicKey } from '@solana/web3.js'
import { PROGRAM_ID } from './constants'

export async function getStreamerProfilePDA(wallet: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('streamer_profile'), wallet.toBuffer()],
    PROGRAM_ID,
  )
}

export async function getTemplatePDA(templateId: number): Promise<[PublicKey, number]> {
  // PDAs with numeric id use little-endian 4-byte buffer
  const idBuf = Buffer.alloc(4)
  idBuf.writeUInt32LE(templateId, 0)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('stream_template'), idBuf],
    PROGRAM_ID,
  )
}

export async function getReputationPDA(wallet: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('reputation'), wallet.toBuffer()],
    PROGRAM_ID,
  )
}

export async function getPaymentReceiptPDA(
  buyer: PublicKey,
  templateId: number,
): Promise<[PublicKey, number]> {
  const idBuf = Buffer.alloc(4)
  idBuf.writeUInt32LE(templateId, 0)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('payment_receipt'), buyer.toBuffer(), idBuf],
    PROGRAM_ID,
  )
}
