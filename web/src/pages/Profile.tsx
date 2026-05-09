import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import { BACKEND_URL } from '../lib/constants'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Recommendation {
  id: string
  topics: string[]
  bestHour: number
  templateText: string
  timestamp: number
  txSignature?: string
}

interface Sale {
  templateId: string
  templateTitle: string
  templateEmoji: string
  buyerWallet: string
  priceUsdc: number
  receipt: string
  timestamp: number
}

interface OwnTemplate {
  id: string
  emoji: string
  title: string
  category: string
  price: number
  totalSales: number
}

// Shape real del backend GET /profiles/:wallet
interface BackendProfile {
  wallet: string
  category: string
  hours: number[]
  createdAt: number
  profilePDA: string
  reputation: {
    totalSales: number
    totalPurchases: number
    successRate: number
    reputationScore: string   // BN.toString()
    tokensEarned: string
  } | null
}

type TabKey = 'recs' | 'sales' | 'templates'
type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIER_COLORS: Record<Tier, string> = {
  Bronze:   '#cd7f32',
  Silver:   '#c0c0c0',
  Gold:     '#f5c842',
  Platinum: '#4af7c4',
}

const TIER_THRESHOLDS: [Tier, number][] = [
  ['Platinum', 1000],
  ['Gold',      500],
  ['Silver',    250],
  ['Bronze',      0],
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcTier(score: number): Tier {
  for (const [tier, threshold] of TIER_THRESHOLDS) {
    if (score >= threshold) return tier
  }
  return 'Bronze'
}

function repBarWidth(score: number, tier: Tier): number {
  const safeScore = Math.max(0, score)
  const order: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum']
  const idx  = order.indexOf(tier)
  const caps: Record<Tier, number> = { Bronze: 250, Silver: 500, Gold: 1000, Platinum: Infinity }
  const prev = idx === 0 ? 0 : caps[order[idx - 1]]
  const next = caps[tier]
  if (next === Infinity) return 100
  return Math.min(100, Math.max(0, ((safeScore - prev) / (next - prev)) * 100))
}

function nextTierLabel(score: number, tier: Tier): string {
  const order: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum']
  const caps: Record<Tier, number> = { Bronze: 250, Silver: 500, Gold: 1000, Platinum: Infinity }
  const idx = order.indexOf(tier)
  if (idx === order.length - 1) return 'Rango máximo alcanzado'
  return `${caps[tier] - score} pts para ${order[idx + 1]}`
}

function formatRelative(ts: number): string {
  // backend stores Unix seconds; convert to ms for comparison
  const tsMs = ts < 1e12 ? ts * 1000 : ts
  const diff = Math.max(0, Date.now() - tsMs)
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)} días`
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchProfile(walletAddr: string): Promise<BackendProfile | null> {
  const res = await fetch(`${BACKEND_URL}/profiles/${walletAddr}`)
  if (!res.ok) return null
  return res.json()
}

// Backend devuelve UN objeto (latest), no array. Wrapeamos para la UI.
async function fetchRecommendations(wallet: string): Promise<Recommendation[]> {
  const res = await fetch(`${BACKEND_URL}/recommendations/${wallet}`)
  if (!res.ok) return []
  const data = await res.json()
  const items: any[] = Array.isArray(data) ? data : [data]
  return items.map((r, i) => ({
    id: r.id ?? `rec-${r.timestamp ?? i}`,
    topics: r.topics ?? [],
    bestHour: r.bestHour ?? 0,
    templateText: r.templateText ?? '',
    timestamp: r.timestamp ?? Date.now(),
    txSignature: r.txSignature,
  }))
}

async function fetchSales(walletAddr: string): Promise<Sale[]> {
  const res = await fetch(`${BACKEND_URL}/profiles/sales/${walletAddr}`)
  if (!res.ok) return []
  return res.json()
}

async function fetchOwnTemplates(walletAddr: string): Promise<OwnTemplate[]> {
  const res = await fetch(`${BACKEND_URL}/templates?creator=${walletAddr}`)
  if (!res.ok) return []
  return res.json()
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function RecCard({ rec, dim }: { rec: Recommendation; dim: boolean }) {
  const explorerUrl = rec.txSignature
    ? `https://explorer.solana.com/tx/${rec.txSignature}?cluster=devnet`
    : null

  return (
    <div
      className="rounded-xl border p-4 transition-opacity"
      style={{ background: '#1a1a26', borderColor: '#2a2a3e', opacity: dim ? 0.55 : 1 }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[13px] font-bold text-[#e8e8f0]">Recomendación del día</span>
        <span className="text-[10px] text-[#4a4a6a] font-mono">{formatRelative(rec.timestamp)}</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {rec.topics.map((t) => (
          <span
            key={t}
            className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
            style={{ background: 'rgba(74,247,196,.08)', color: '#4af7c4', borderColor: 'rgba(74,247,196,.25)' }}
          >
            {t}
          </span>
        ))}
      </div>

      <div
        className="rounded-md p-3 text-[11px] leading-relaxed font-mono mb-3 border-l-2"
        style={{ background: '#12121a', borderColor: '#7c5cfc', color: '#e8e8f0' }}
      >
        {rec.templateText}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border"
          style={{ background: 'rgba(124,92,252,.1)', color: '#7c5cfc', borderColor: 'rgba(124,92,252,.25)' }}
        >
          ⏰ Mejor hora: {rec.bestHour}:00
        </span>
        {explorerUrl ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1"
            style={{ background: 'rgba(74,247,196,.06)', color: '#4af7c4', borderColor: 'rgba(74,247,196,.2)', textDecoration: 'none' }}
          >
            ⛓ On-chain · {rec.txSignature!.slice(0, 4)}...{rec.txSignature!.slice(-4)}
          </a>
        ) : (
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border"
            style={{ background: 'rgba(74,247,196,.06)', color: '#4af7c4', borderColor: 'rgba(74,247,196,.2)' }}
          >
            ⛓ On-chain
          </span>
        )}
      </div>
    </div>
  )
}

function SaleRow({ sale }: { sale: Sale }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{ background: '#1a1a26', borderColor: '#2a2a3e' }}
    >
      <span className="text-xl w-8 text-center">{sale.templateEmoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#e8e8f0] truncate">{sale.templateTitle}</p>
        <p className="text-[10px] text-[#8888a8] font-mono">comprado por {sale.buyerWallet}</p>
        <p className="text-[9px] text-[#4a4a6a] font-mono mt-0.5">{sale.receipt} · confirmado</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[13px] font-bold font-mono" style={{ color: '#f5c842' }}>
          +{sale.priceUsdc.toFixed(2)} USDC
        </p>
        <p className="text-[10px] text-[#4a4a6a]">{formatRelative(sale.timestamp)}</p>
      </div>
    </div>
  )
}

function TemplateCard({ t }: { t: OwnTemplate }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: '#1a1a26', borderColor: '#2a2a3e' }}>
      <div className="h-14 flex items-center justify-center text-2xl" style={{ background: '#1a1030' }}>
        {t.emoji}
      </div>
      <div className="p-3">
        <p className="text-[12px] font-bold text-[#e8e8f0] mb-2 leading-snug">{t.title}</p>
        <div className="flex justify-between items-center">
          <span className="text-[10px]" style={{ color: '#4af7c4' }}>{t.totalSales} ventas</span>
          <span className="text-[11px] font-bold font-mono" style={{ color: '#f5c842' }}>
            {(t.price / 1_000_000).toFixed(2)} USDC
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Profile() {
  const { publicKey } = useWallet()
  const walletAddr = publicKey?.toBase58() ?? ''

  const [activeTab, setActiveTab] = useState<TabKey>('recs')

  const { data: profile } = useQuery<BackendProfile | null>({
    queryKey: ['profile', walletAddr],
    queryFn: () => fetchProfile(walletAddr),
    enabled: !!walletAddr,
    staleTime: 60_000,
  })

  const { data: recs = [], isLoading: recsLoading } = useQuery<Recommendation[]>({
    queryKey: ['recs', walletAddr],
    queryFn: () => fetchRecommendations(walletAddr),
    enabled: !!walletAddr,
    staleTime: 60_000,
  })

  const { data: sales = [], isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ['sales', walletAddr],
    queryFn: () => fetchSales(walletAddr),
    enabled: !!walletAddr,
    staleTime: 60_000,
  })

  const { data: ownTemplates = [], isLoading: templatesLoading } = useQuery<OwnTemplate[]>({
    queryKey: ['own-templates', walletAddr],
    queryFn: () => fetchOwnTemplates(walletAddr),
    enabled: !!walletAddr,
    staleTime: 60_000,
  })

  const repScore = parseInt(profile?.reputation?.reputationScore ?? '0') || 0
  const tier     = calcTier(repScore)
  const tierColor = TIER_COLORS[tier]
  const barWidth  = repBarWidth(repScore, tier)

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'recs',      label: 'Recomendaciones' },
    { key: 'sales',     label: 'Historial de ventas' },
    { key: 'templates', label: 'Mis templates' },
  ]

  if (!publicKey) {
    return (
      <div
        className="flex flex-col items-center justify-center flex-1 py-20 text-center gap-4"
        style={{ color: '#8888a8' }}
      >
        <span className="text-5xl opacity-30">👛</span>
        <p className="text-[14px]">Conecta tu wallet para ver tu perfil</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ color: '#e8e8f0', fontFamily: "'Syne', sans-serif" }}>
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 'calc(100vh - 52px)' }}>
        {/* Sidebar */}
        <aside
          className="w-64 border-r p-5 flex flex-col gap-5 shrink-0 overflow-y-auto"
          style={{ background: '#12121a', borderColor: '#2a2a3e' }}
        >
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2"
              style={{ background: '#1a1a26', borderColor: '#7c5cfc' }}
            >
              🎮
            </div>
            <p className="text-[16px] font-bold mt-1">
              {walletAddr.slice(0, 4)}...{walletAddr.slice(-4)}
            </p>
            <p className="text-[10px] font-mono" style={{ color: '#8888a8' }}>
              {walletAddr.slice(0, 6)}...{walletAddr.slice(-4)}
            </p>
            {profile?.category && (
              <span
                className="mt-1 text-[11px] font-bold px-3 py-0.5 rounded-full border"
                style={{ background: 'rgba(124,92,252,.12)', color: '#7c5cfc', borderColor: 'rgba(124,92,252,.3)' }}
              >
                {profile.category}
              </span>
            )}
          </div>

          <div className="rounded-xl border p-4" style={{ background: '#1a1a26', borderColor: '#2a2a3e' }}>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#8888a8' }}>
              Reputación on-chain
            </p>
            <p className="text-[36px] font-bold font-mono leading-none" style={{ color: tierColor }}>
              {repScore}
            </p>
            <p className="text-[11px] mt-1 mb-3" style={{ color: tierColor }}>★ {tier} Creator</p>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#2a2a3e' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${barWidth}%`, background: tierColor }}
              />
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: '#4a4a6a' }}>
              {nextTierLabel(repScore, tier)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Ventas',    val: profile?.reputation?.totalSales ?? 0,                                         color: '#4af7c4' },
              { label: 'Compras',   val: profile?.reputation?.totalPurchases ?? 0,                                     color: '#4af7c4' },
              { label: 'Ganado',    val: `${((parseInt(profile?.reputation?.tokensEarned ?? '0') || 0) / 1e6).toFixed(2)}$`, color: '#f5c842' },
              { label: 'Score',     val: repScore,                                                                     color: tierColor },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-lg border p-2.5" style={{ background: '#1a1a26', borderColor: '#2a2a3e' }}>
                <p className="text-[18px] font-bold" style={{ color }}>{val}</p>
                <p className="text-[10px]" style={{ color: '#8888a8' }}>{label}</p>
              </div>
            ))}
          </div>

          <a
            href={`https://explorer.solana.com/address/${walletAddr}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg border font-mono self-start"
            style={{ color: '#4af7c4', borderColor: 'rgba(74,247,196,.25)', background: 'rgba(74,247,196,.04)', textDecoration: 'none' }}
          >
            ↗ Ver en Solana Explorer
          </a>
        </aside>

        {/* Main */}
        <main className="flex-1 p-5 overflow-y-auto flex flex-col gap-4" style={{ background: '#0a0a0f' }}>
          <div className="flex gap-1 border-b -mb-1" style={{ borderColor: '#2a2a3e' }}>
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className="px-4 py-2 text-[12px] font-semibold transition-all"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === key ? '#7c5cfc' : 'transparent'}`,
                  color: activeTab === key ? '#7c5cfc' : '#8888a8',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginBottom: '-1px',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'recs' && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: '#8888a8' }}>
                Recomendaciones recientes
              </p>
              {recsLoading ? (
                <p className="text-[13px]" style={{ color: '#8888a8' }}>Cargando...</p>
              ) : recs.length === 0 ? (
                <div className="text-center py-10" style={{ color: '#8888a8' }}>
                  <p className="text-4xl mb-3 opacity-30">📭</p>
                  <p className="text-[13px]">No hay recomendaciones aún.</p>
                </div>
              ) : (
                recs.map((r, i) => <RecCard key={r.id} rec={r} dim={i > 0} />)
              )}
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: '#8888a8' }}>
                Últimas ventas de tus templates
              </p>
              {salesLoading ? (
                <p className="text-[13px]" style={{ color: '#8888a8' }}>Cargando...</p>
              ) : sales.length === 0 ? (
                <div className="text-center py-10" style={{ color: '#8888a8' }}>
                  <p className="text-4xl mb-3 opacity-30">🏪</p>
                  <p className="text-[13px]">Sin ventas todavía.</p>
                </div>
              ) : (
                sales.map((s) => <SaleRow key={s.receipt} sale={s} />)
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: '#8888a8' }}>
                Templates que has creado
              </p>
              {templatesLoading ? (
                <p className="text-[13px]" style={{ color: '#8888a8' }}>Cargando...</p>
              ) : ownTemplates.length === 0 ? (
                <div className="text-center py-10" style={{ color: '#8888a8' }}>
                  <p className="text-4xl mb-3 opacity-30">📦</p>
                  <p className="text-[13px]">No has creado templates aún.</p>
                </div>
              ) : (
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                  {ownTemplates.map((t) => <TemplateCard key={t.id} t={t} />)}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
