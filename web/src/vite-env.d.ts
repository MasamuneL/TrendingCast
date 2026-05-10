/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRENDSURGE_PROGRAM_ID: string
  readonly VITE_SOLANA_RPC: string
  readonly VITE_BACKEND_URL: string
  readonly VITE_BACKEND_WALLET_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
