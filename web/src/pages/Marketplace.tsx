import { useState, useCallback, useRef, useEffect } from 'react'
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useQuery } from '@tanstack/react-query'
import { fetchTemplates, purchaseTemplate, type StreamTemplate } from '../lib/api'
import { recordTemplateSaleOnChain } from '../lib/anchor'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SortKey = 'popular' | 'recent' | 'price_asc' | 'price_desc'
type FilterKey = 'all' | 'Gaming' | 'IRL' | 'Just Chatting' | 'Music' | 'Variety'

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIES: FilterKey[] = ['all', 'Gaming', 'IRL', 'Just Chatting', 'Music', 'Variety']

const CAT_COLORS: Record<string, string> = {
  Gaming:        '#1a1030',
  IRL:           '#0d1f20',
  Music:         '#1a1020',
  'Just Chatting':'#0d1520',
  Variety:       '#1a0d20',
}

function fmtPrice(lamports: number): string {
  return (lamports / 1_000_000).toFixed(2)
}

// ─── Buy flow (signer = AnchorWallet del usuario) ─────────────────────────────

async function buyTemplate(
  template: StreamTemplate,
  buyer: string,
  anchorWallet: ReturnType<typeof useAnchorWallet>,
  onStep: (msg: string) => void,
): Promise<string> {
  onStep('Procesando compra...')

  const receipt = await purchaseTemplate(
    template.id,
    buyer,
    template.creator,
    template.content,
    template.category,
  )

  if (anchorWallet) {
    onStep('Firmando on-chain...')
    await recordTemplateSaleOnChain(anchorWallet, {
      templateId: receipt.templateId,
      buyer: new PublicKey(receipt.buyer),
      creator: new PublicKey(receipt.creator),
      amountUsdc: receipt.amountUsdc || template.price,
      x402TxSignature: receipt.receipt,
      content: template.content,
      category: template.category,
      priceLamports: template.price,
    })
  }

  return receipt.receipt
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Badge({ type }: { type: 'hot' | 'new' | 'top' }) {
  const styles = {
    hot: 'bg-[#3d0f1a] text-[#fc5c7d] border border-[#fc5c7d]/40',
    new: 'bg-[#1a1230] text-[#7c5cfc] border border-[#7c5cfc]/40',
    top: 'bg-[#2a1f00] text-[#f5c842] border border-[#f5c842]/40',
  }
  return (
    <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded font-mono ${styles[type]}`}>
      {type.toUpperCase()}
    </span>
  )
}

function OwnedBadge() {
  return (
    <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded font-mono bg-[#0f3d2e] text-[#4af7c4] border border-[#4af7c4]/40">
      OWNED
    </span>
  )
}

function TemplateCard({
  template,
  selected,
  owned,
  onSelect,
}: {
  template: StreamTemplate
  selected: boolean
  owned: boolean
  onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
        selected
          ? 'border-2 border-[#7c5cfc]'
          : 'border border-[#2a2a3e] hover:border-[#7c5cfc]'
      }`}
      style={{ background: '#1a1a26' }}
    >
      <div
        className="h-20 flex items-center justify-center text-3xl relative"
        style={{ background: CAT_COLORS[template.category] ?? '#141428' }}
      >
        {template.emoji}
        {template.badge && <Badge type={template.badge} />}
        {owned && <OwnedBadge />}
      </div>
      <div className="p-3">
        <p className="text-[10px] font-bold tracking-widest text-[#8888a8] uppercase mb-1">
          {template.category}
        </p>
        <p className="text-[13px] font-bold leading-snug text-[#e8e8f0] mb-2">
          {template.title}
        </p>
        <p className="text-[11px] text-[#8888a8] mb-3">
          por <span className="text-[#4af7c4]">@{template.creator}</span>
        </p>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] font-bold text-[#f5c842]">
            {fmtPrice(template.price)} USDC
          </span>
          <span className="text-[10px] text-[#4a4a6a]">▲ {template.totalSales}</span>
        </div>
      </div>
    </div>
  )
}

function PreviewPanel({
  template,
  owned,
  walletConnected,
  buying,
  buyStep,
  onBuy,
}: {
  template: StreamTemplate | null
  owned: boolean
  walletConnected: boolean
  buying: boolean
  buyStep: string
  onBuy: () => void
}) {
  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 text-center text-[#8888a8] text-[13px] gap-3 p-6">
        <span className="text-5xl opacity-30">📦</span>
        <span>Selecciona un template para ver detalles</span>
      </div>
    )
  }

  const canBuy = walletConnected && !owned && !buying

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[#2a2a3e] p-4" style={{ background: '#1a1a26' }}>
        <div className="text-4xl text-center mb-3">{template.emoji}</div>
        <p className="text-[15px] font-bold text-[#e8e8f0] mb-1">{template.title}</p>
        <p className="text-[11px] text-[#8888a8] mb-3">
          {template.category} · @{template.creator}
        </p>
        <div
          className="rounded-md p-3 mb-3 border-l-2 border-[#7c5cfc] text-[12px] leading-relaxed text-[#e8e8f0] font-mono"
          style={{ background: '#12121a' }}
        >
          {template.content}
        </div>
        <div className="flex justify-between text-[11px] text-[#8888a8]">
          <span>▲ {template.totalSales} ventas</span>
          <span className="font-mono">#{template.id}</span>
        </div>
      </div>

      <div
        className="flex items-center justify-between rounded-xl border border-[#2a2a3e] p-3"
        style={{ background: '#1a1a26' }}
      >
        <div>
          <p className="font-mono text-[20px] font-bold text-[#f5c842]">{fmtPrice(template.price)}</p>
          <p className="text-[10px] text-[#8888a8]">USDC · devnet</p>
        </div>
        {owned ? (
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#0f3d2e] text-[#4af7c4] border border-[#4af7c4]/40">
            ✓ Owned
          </span>
        ) : (
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#1a1230] text-[#7c5cfc] border border-[#7c5cfc]/40">
            Pago x402
          </span>
        )}
      </div>

      {buying && (
        <p className="text-[11px] text-[#7c5cfc] text-center animate-pulse">{buyStep}</p>
      )}

      <button
        onClick={onBuy}
        disabled={!canBuy}
        className={`w-full py-3 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all
          ${buying
            ? 'bg-[#4af7c4] text-[#0a0a0f] cursor-wait'
            : canBuy
            ? 'bg-[#7c5cfc] text-white hover:bg-[#6a4ae8] active:scale-[0.98]'
            : 'bg-[#2a2a3e] text-[#4a4a6a] cursor-not-allowed'
          }`}
      >
        {buying
          ? '⏳ Procesando...'
          : owned
          ? '✓ Ya es tuyo'
          : !walletConnected
          ? 'Conecta tu wallet'
          : '🛒 Comprar template'}
      </button>

      {!walletConnected && !owned && (
        <p className="text-[11px] text-[#4a4a6a] text-center">Conecta Phantom para comprar</p>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Marketplace() {
  const { connected, publicKey } = useWallet()
  const anchorWallet = useAnchorWallet()

  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('popular')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [purchased, setPurchased] = useState<Set<number>>(new Set())
  const [buying, setBuying] = useState(false)
  const [buyStep, setBuyStep] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  const { data: templates = [], isLoading } = useQuery<StreamTemplate[]>({
    queryKey: ['templates'],
    queryFn: fetchTemplates,
    staleTime: 60_000,
  })

  const visible = [...templates]
    .filter((t) => filter === 'all' || t.category === filter)
    .sort((a, b) => {
      if (sort === 'popular')    return b.totalSales - a.totalSales
      if (sort === 'price_asc')  return a.price - b.price
      if (sort === 'price_desc') return b.price - a.price
      return 0
    })

  const selected = visible.find((t) => t.id === selectedId) ?? null

  const totalSales = visible.reduce((acc, t) => acc + t.totalSales, 0)
  const creators   = new Set(visible.map((t) => t.creator)).size

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const showToast = useCallback(
    (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      setToast({ msg, type })
      toastTimer.current = setTimeout(() => setToast(null), 3000)
    },
    [],
  )

  const handleBuy = useCallback(async () => {
    if (!selected || !connected || !publicKey || !anchorWallet || buying) return

    setBuying(true)
    try {
      const receipt = await buyTemplate(selected, publicKey.toBase58(), anchorWallet, setBuyStep)
      setPurchased((prev) => new Set(prev).add(selected.id))
      showToast(`Compra confirmada ✓ · ${receipt.slice(0, 8)}...`, 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error en el pago', 'error')
    } finally {
      setBuying(false)
      setBuyStep('')
    }
  }, [selected, connected, publicKey, anchorWallet, buying, showToast])

  return (
    <div
      className="flex flex-col flex-1"
      style={{ background: '#0a0a0f', color: '#e8e8f0', fontFamily: "'Syne', sans-serif" }}
    >
      {/* Filters */}
      <div
        className="flex items-center gap-2 px-5 py-3 border-b flex-wrap"
        style={{ background: '#12121a', borderColor: '#2a2a3e' }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 rounded-full text-[12px] font-semibold border transition-all ${
              filter === cat
                ? 'bg-[#7c5cfc] border-[#7c5cfc] text-white'
                : 'border-[#2a2a3e] text-[#8888a8] hover:border-[#7c5cfc] hover:text-[#7c5cfc]'
            }`}
          >
            {cat === 'all' ? 'Todos' : cat}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-[#4a4a6a]">Ordenar:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="text-[12px] rounded-md px-2 py-1 border font-semibold"
            style={{ background: '#1a1a26', borderColor: '#2a2a3e', color: '#e8e8f0', fontFamily: 'inherit' }}
          >
            <option value="popular">Más vendidos</option>
            <option value="recent">Recientes</option>
            <option value="price_asc">Precio ↑</option>
            <option value="price_desc">Precio ↓</option>
          </select>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex overflow-hidden" style={{ minHeight: 'calc(100vh - 130px)' }}>
        {/* Grid */}
        <main className="flex-1 p-5 overflow-y-auto">
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Templates', val: visible.length },
              { label: 'Creators',  val: creators },
              { label: 'Ventas',    val: totalSales.toLocaleString() },
            ].map(({ label, val }) => (
              <div
                key={label}
                className="rounded-lg border p-3"
                style={{ background: '#12121a', borderColor: '#2a2a3e' }}
              >
                <p className="text-[20px] font-bold text-[#7c5cfc]">{val}</p>
                <p className="text-[11px] text-[#8888a8]">{label}</p>
              </div>
            ))}
          </div>

          {isLoading ? (
            <p className="text-[#8888a8] text-[13px]">Cargando templates...</p>
          ) : (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}
            >
              {visible.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={selectedId === t.id}
                  owned={purchased.has(t.id)}
                  onSelect={() => setSelectedId(t.id)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Panel lateral */}
        <aside
          className="w-64 border-l p-4 flex flex-col gap-4 overflow-y-auto"
          style={{ background: '#12121a', borderColor: '#2a2a3e', minWidth: '256px' }}
        >
          <p className="text-[12px] font-bold tracking-widest text-[#8888a8] uppercase">
            Vista previa
          </p>
          <PreviewPanel
            template={selected}
            owned={selected ? purchased.has(selected.id) : false}
            walletConnected={connected}
            buying={buying}
            buyStep={buyStep}
            onBuy={handleBuy}
          />
        </aside>
      </div>

      {toast && (
        <div
          className={`fixed bottom-5 right-5 px-4 py-3 rounded-xl text-[13px] font-semibold z-50 border max-w-xs leading-snug shadow-lg
            ${toast.type === 'success' ? 'bg-[#0f3d2e] text-[#4af7c4] border-[#4af7c4]/40'
              : toast.type === 'error' ? 'bg-[#3d0f1a] text-[#fc5c7d] border-[#fc5c7d]/40'
              : 'bg-[#1a1230] text-[#7c5cfc] border-[#7c5cfc]/40'}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
