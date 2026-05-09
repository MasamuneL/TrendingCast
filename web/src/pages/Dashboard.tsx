import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import ReputationBadge from '../components/ReputationBadge'
import TrendingTopics from '../components/TrendingTopics'
import { useRecommendation } from '../hooks/useRecommendation'

const STREAMING_CATEGORIES = ['Gaming', 'IRL', 'Music', 'Art', 'Tech', 'Sports', 'Education']
const STREAM_HOURS = [6, 9, 12, 15, 18, 20, 22]

function ConnectPrompt() {
  const { setVisible } = useWalletModal()
  return (
    <div className="card text-center py-12 flex flex-col items-center gap-4 max-w-md mx-auto">
      <div className="text-4xl">📡</div>
      <h2 className="text-xl font-bold">Welcome to TrendingCast</h2>
      <p className="text-gray-400 text-sm">
        Connect your Solana wallet to get personalized streaming recommendations and access the
        template marketplace.
      </p>
      <button className="btn-primary" onClick={() => setVisible(true)}>
        Connect Wallet
      </button>
    </div>
  )
}

interface CreateProfileFormProps {
  onSubmit: (category: string, hours: number[]) => Promise<void>
  loading: boolean
  error: string | null
}

function CreateProfileForm({ onSubmit, loading, error }: CreateProfileFormProps) {
  const [category, setCategory] = useState('')
  const [selectedHours, setSelectedHours] = useState<number[]>([])

  function toggleHour(h: number) {
    setSelectedHours((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : prev.length < 3 ? [...prev, h] : prev,
    )
  }

  return (
    <div className="card flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Create Your Streamer Profile
        </h2>
        <p className="text-gray-500 text-xs mt-1">
          Set up your on-chain profile to unlock personalized recommendations.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 font-medium">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
        >
          <option value="">Select a category…</option>
          {STREAMING_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 font-medium">
          Preferred streaming hours (pick up to 3)
        </label>
        <div className="flex flex-wrap gap-2">
          {STREAM_HOURS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => toggleHour(h)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedHours.includes(h)
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {h}:00
            </button>
          ))}
        </div>
        <p className="text-gray-600 text-xs">{selectedHours.length}/3 selected</p>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        onClick={() => onSubmit(category, selectedHours)}
        disabled={!category || loading}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing transaction…' : 'Create Profile'}
      </button>
    </div>
  )
}

function RecommendationCard({ wallet }: { wallet: string }) {
  const { recommendation, loading, generating, error, profileMissing, generate, createProfile } =
    useRecommendation(wallet)

  if (profileMissing) {
    return <CreateProfileForm onSubmit={createProfile} loading={generating} error={error} />
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Today's Recommendation
        </h2>
        <button
          onClick={generate}
          disabled={generating}
          className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? 'Signing…' : 'Generate'}
        </button>
      </div>

      {loading && (
        <div className="animate-pulse flex flex-col gap-2">
          <div className="h-4 bg-gray-800 rounded w-3/4" />
          <div className="h-4 bg-gray-800 rounded w-1/2" />
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && !recommendation && (
        <p className="text-gray-500 text-sm">
          No recommendation yet. Hit Generate to get your first one.
        </p>
      )}

      {recommendation && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {recommendation.topics.map((t) => (
              <span key={t} className="px-2 py-1 bg-brand-900 text-brand-300 rounded text-xs font-medium">
                {t}
              </span>
            ))}
          </div>
          <p className="text-gray-300 text-sm">
            Best time to stream:{' '}
            <span className="text-white font-semibold">{recommendation.bestHour}:00</span>
          </p>
          <div className="bg-gray-900 rounded-lg p-3 text-sm text-gray-200 italic border border-gray-700">
            "{recommendation.templateText}"
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { connected, publicKey } = useWallet()

  if (!connected || !publicKey) {
    return (
      <div className="flex flex-col gap-8">
        <ConnectPrompt />
        <TrendingTopics />
      </div>
    )
  }

  const walletStr = publicKey.toBase58()

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <RecommendationCard wallet={walletStr} />
        </div>
        <ReputationBadge score={0} totalSales={0} totalPurchases={0} />
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Your Wallet
        </h2>
        <p className="text-gray-300 text-sm font-mono break-all">{walletStr}</p>
        <p className="text-gray-500 text-xs mt-1">Devnet</p>
      </div>

      <TrendingTopics />
    </div>
  )
}
