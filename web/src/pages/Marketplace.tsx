import { useState, useEffect } from 'react'
import { fetchTemplates, purchaseTemplate, type StreamTemplate } from '../lib/api'
import TemplateCard from '../components/TemplateCard'

export default function Marketplace() {
  const [templates, setTemplates] = useState<StreamTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'cheap' | 'premium'>('all')

  useEffect(() => {
    setLoading(true)
    fetchTemplates()
      .then(setTemplates)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleBuy(templateId: number) {
    // TODO: integrate x402 payment flow
    // 1. Get payment requirements from 402 response
    // 2. Sign USDC transfer with wallet
    // 3. Encode as X-PAYMENT header
    // 4. Call purchaseTemplate with the signed header
    await purchaseTemplate(templateId, '')
    // Refresh templates after purchase
    const updated = await fetchTemplates()
    setTemplates(updated)
  }

  const visible =
    filter === 'all' ? templates : templates.filter((t) => t.tier === filter)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Template Marketplace</h1>
          <p className="text-gray-400 text-sm mt-1">
            Buy ready-to-use content templates from top streamers
          </p>
        </div>
        <div className="flex gap-1">
          {(['all', 'cheap', 'premium'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-48 bg-gray-800" />
          ))}
        </div>
      )}

      {error && (
        <div className="card border-red-800 text-red-400 text-sm">{error}</div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="card text-gray-400 text-sm text-center py-16">
          No templates available yet. Be the first to create one!
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((t) => (
            <TemplateCard key={t.id} template={t} onBuy={handleBuy} />
          ))}
        </div>
      )}
    </div>
  )
}
