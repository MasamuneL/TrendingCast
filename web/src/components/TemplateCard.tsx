import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { type StreamTemplate } from '../lib/api'
import { USDC_DECIMALS } from '../lib/constants'

interface Props {
  template: StreamTemplate
  onBuy: (id: number) => Promise<void>
}

function formatUSDC(lamports: number): string {
  return `$${(lamports / 10 ** USDC_DECIMALS).toFixed(2)}`
}

export default function TemplateCard({ template, onBuy }: Props) {
  const { connected } = useWallet()
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy() {
    setBuying(true)
    setError(null)
    try {
      await onBuy(template.id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Purchase failed')
    } finally {
      setBuying(false)
    }
  }

  const tierColor =
    template.tier === 'premium'
      ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700'
      : 'bg-gray-800 text-gray-300 border-gray-700'

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-snug">{template.title}</h3>
        <span className={`badge border shrink-0 ${tierColor}`}>{template.tier}</span>
      </div>

      <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{template.content}</p>

      <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-1">
        <span>{template.purchases} purchases</span>
        <span className="font-mono text-gray-400 truncate max-w-[100px]">
          {template.creator.slice(0, 4)}…{template.creator.slice(-4)}
        </span>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        onClick={handleBuy}
        disabled={!connected || buying}
        className="btn-primary text-sm w-full"
      >
        {buying ? 'Processing…' : `Buy ${formatUSDC(template.price)} USDC`}
      </button>

      {!connected && (
        <p className="text-gray-500 text-xs text-center">Connect wallet to purchase</p>
      )}
    </div>
  )
}
