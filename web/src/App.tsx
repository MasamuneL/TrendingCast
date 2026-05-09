import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Marketplace from './pages/Marketplace'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
        </Routes>
      </main>
      <footer className="border-t border-gray-800 py-4 text-center text-gray-500 text-sm">
        TrendingCast — Built on Solana devnet
      </footer>
    </div>
  )
}
