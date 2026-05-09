import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import TrendingTopics from '../components/TrendingTopics'
import ReputationBadge from '../components/ReputationBadge'

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

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="card h-full flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Your Streamer Profile
            </h2>
            <p className="text-gray-300 text-sm font-mono break-all">{publicKey.toBase58()}</p>
            <p className="text-gray-500 text-xs mt-1">Devnet</p>
          </div>
        </div>
        {/* Reputation data would be fetched via useStreamerProfile hook */}
        <ReputationBadge score={0} totalSales={0} totalPurchases={0} />
      </div>

      <TrendingTopics />
    </div>
  )
}
