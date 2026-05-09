import { PublicKey } from '@solana/web3.js'

export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_TRENDINGCAST_PROGRAM_ID ?? 'CewXVE956fdWcnTCZYHRtfFDdueG66fGLLoedSUMwffD',
)

// Circle USDC devnet mint
export const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

export const SOLANA_RPC =
  import.meta.env.VITE_SOLANA_RPC ?? 'https://api.devnet.solana.com'

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'

// USDC has 6 decimals
export const USDC_DECIMALS = 6

export const TEMPLATE_PRICE = {
  cheap: 100_000,    // $0.10 in USDC lamports
  premium: 500_000,  // $0.50 in USDC lamports
} as const
