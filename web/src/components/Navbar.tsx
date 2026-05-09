import { Link, useLocation } from 'react-router-dom'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/profile', label: 'Profile' },
]

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-brand-500 font-bold text-lg tracking-tight">
            TrendingCast
          </Link>
          <nav className="flex gap-1">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === to
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <WalletMultiButton className="!bg-brand-600 hover:!bg-brand-700 !rounded-lg !text-sm !font-medium !transition-colors" />
      </div>
    </header>
  )
}
