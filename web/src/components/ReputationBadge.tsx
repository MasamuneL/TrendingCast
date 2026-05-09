interface Props {
  score: number
  totalSales: number
  totalPurchases: number
}

function tier(score: number): { label: string; color: string } {
  if (score >= 1000) return { label: 'Elite', color: 'text-yellow-400' }
  if (score >= 500) return { label: 'Pro', color: 'text-purple-400' }
  if (score >= 100) return { label: 'Rising', color: 'text-blue-400' }
  return { label: 'Newcomer', color: 'text-gray-400' }
}

export default function ReputationBadge({ score, totalSales, totalPurchases }: Props) {
  const { label, color } = tier(score)

  return (
    <div className="card flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        Your Reputation
      </h2>
      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold">{score}</span>
        <span className={`text-lg font-semibold mb-1 ${color}`}>{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500 text-xs">Templates sold</p>
          <p className="font-semibold">{totalSales}</p>
        </div>
        <div>
          <p className="text-gray-500 text-xs">Templates bought</p>
          <p className="font-semibold">{totalPurchases}</p>
        </div>
      </div>
    </div>
  )
}
