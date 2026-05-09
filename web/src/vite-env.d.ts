/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRENDINGCAST_PROGRAM_ID: string
  readonly VITE_SOLANA_RPC: string
  readonly VITE_BACKEND_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
