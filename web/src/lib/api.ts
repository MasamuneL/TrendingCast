import { BACKEND_URL } from './constants'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TrendingTopic {
  id: string
  title: string
  category: string
  score: number
  bestStreamHour: number
  tags: string[]
}

export interface StreamTemplate {
  id: number
  pubkey?: string
  title: string
  content: string
  tier: 'cheap' | 'premium'
  /** Valid Solana base58 pubkey — used for on-chain tx */
  creator: string
  /** Human-readable creator name for display only */
  displayName?: string
  /** Precio en lamports de USDC (100_000 = $0.10) */
  price: number
  purchases: number
  totalSales: number
  category: string
  emoji: string
  badge?: 'hot' | 'new' | 'top'
}

export interface StreamerRecommendation {
  topics: string[]
  bestHour: number
  templateText: string
  timestamp: number
}

export interface RecommendationData {
  topics: string[]
  bestHour: number
  templateText: string
  timestamp: number
}

export interface PurchaseReceipt {
  receipt: string
  templateId: number
  buyer: string
  creator: string
  amountUsdc: number
}

export class ProfileNotFoundError extends Error {
  constructor() {
    super('Streamer profile not found. Create your profile first.')
    this.name = 'ProfileNotFoundError'
  }
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

// Valid devnet pubkeys used as creator addresses in mock data.
// Mock templates are only shown when backend is unreachable.
const DEMO_PK = {
  A: '7us4TNvEtKYiq55ZKfAPztkCei8PpjwLsyCtuCLBAJaR',
  B: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  C: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bJ',
} as const

const MOCK_TOPICS: TrendingTopic[] = [
  { id: 't1', title: 'Minecraft Speedrun',     score: 982, bestStreamHour: 21, tags: ['Minecraft', 'Speedrun', 'PB'],    category: 'Gaming' },
  { id: 't2', title: 'Valorant Ranked Climb',  score: 874, bestStreamHour: 20, tags: ['Valorant', 'Ranked', 'FPS'],      category: 'Gaming' },
  { id: 't3', title: 'Lo-fi Study Beats',      score: 761, bestStreamHour: 22, tags: ['Lofi', 'Música', 'Chill'],        category: 'Music'  },
  { id: 't4', title: 'Street Food Tour CDMX',  score: 698, bestStreamHour: 19, tags: ['IRL', 'Comida', 'México'],        category: 'IRL'    },
  { id: 't5', title: 'AI Art Generation Live', score: 643, bestStreamHour: 18, tags: ['IA', 'Arte', 'Midjourney'],       category: 'Art'    },
  { id: 't6', title: 'Web3 Dev Tutorial',      score: 589, bestStreamHour: 17, tags: ['Solana', 'Dev', 'Tutorial'],      category: 'Tech'   },
  { id: 't7', title: 'Fortnite Zero Build',    score: 541, bestStreamHour: 21, tags: ['Fortnite', 'ZeroBuild', 'Tips'], category: 'Gaming' },
  { id: 't8', title: 'Beat Production Session',score: 503, bestStreamHour: 23, tags: ['Beats', 'Producción', 'Hip-hop'],category: 'Music'  },
]

const MOCK_TEMPLATES: StreamTemplate[] = [
  { id: 1, emoji: '🎮', category: 'Gaming',        title: 'Raid de medianoche',    creator: DEMO_PK.A, displayName: 'xNachtStreamer', content: '¡RAID INCOMING! Llevo a {viewers} viewers a {target} — hoy jugamos {game} sin parar.', price: 500_000, totalSales: 342, purchases: 342, tier: 'premium', badge: 'hot' },
  { id: 2, emoji: '⚡', category: 'Gaming',        title: 'Speedrun hype opener',  creator: DEMO_PK.B, displayName: 'VelozGG',        content: '[SPEEDRUN EN VIVO] {game} — WR: {wr}. Hoy lo bajamos. Cada death = {penalty}.', price: 250_000, totalSales: 198, purchases: 198, tier: 'cheap', badge: 'top' },
  { id: 3, emoji: '🎵', category: 'Music',         title: 'Sesión nocturna lo-fi', creator: DEMO_PK.C, displayName: 'LofiLuna',       content: 'Noche de beats ✦ {hours}h continuas · Sin interrupciones · Solo {viewers} almas aquí.', price: 750_000, totalSales: 89, purchases: 89, tier: 'premium', badge: 'new' },
  { id: 4, emoji: '💬', category: 'Just Chatting', title: 'Debate semanal',        creator: DEMO_PK.A, displayName: 'CharlaMX',       content: '🔥 TEMA: {topic} · ¿Acuerdo? Vota en !poll — ganador elige el próximo tema.', price: 300_000, totalSales: 421, purchases: 421, tier: 'cheap', badge: 'top' },
  { id: 5, emoji: '🌎', category: 'IRL',           title: 'Tour callejero en vivo', creator: DEMO_PK.B, displayName: 'UrbanWalker',   content: 'IRL desde {city} · siguiendo al chat · {km}km recorridos · Próximo: vota en !dest.', price: 1_000_000, totalSales: 67, purchases: 67, tier: 'premium' },
  { id: 6, emoji: '🃏', category: 'Variety',       title: 'Ruleta de juegos',      creator: DEMO_PK.C, displayName: 'WheelOfGames',   content: 'LA RULETA MANDA · Gira = nuevo juego · Actual: {game} · Próxima en {time}min', price: 500_000, totalSales: 156, purchases: 156, tier: 'premium', badge: 'hot' },
  { id: 7, emoji: '🏆', category: 'Gaming',        title: 'Torneo interno viewers', creator: DEMO_PK.A, displayName: 'xNachtStreamer',  content: 'TORNEO 1v1 · {viewers} registrados · Bracket en pantalla · Siguiente: {p1} vs {p2}', price: 400_000, totalSales: 234, purchases: 234, tier: 'cheap' },
  { id: 8, emoji: '🎤', category: 'Just Chatting', title: 'Karaoke de clip voting', creator: DEMO_PK.B, displayName: 'VoxPop',         content: 'KARAOKE VOTING · Los viewers eligen qué canto · Clip más votado gana.', price: 200_000, totalSales: 310, purchases: 310, tier: 'cheap', badge: 'new' },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  Gaming: '🎮',
  Music: '🎵',
  IRL: '🌎',
  'Just Chatting': '💬',
  Variety: '🃏',
  Art: '🎨',
  Tech: '💻',
  Sports: '⚽',
  Education: '📚',
}

function normalizeBadge(sales: number): 'hot' | 'top' | undefined {
  if (sales >= 200) return 'hot'
  if (sales >= 100) return 'top'
  return undefined
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeTemplate(t: any): StreamTemplate {
  const purchases = t.totalSales ?? t.purchases ?? 0
  const price = Math.max(0, Number(t.price) || 0)
  return {
    id: t.id,
    pubkey: t.pubkey,
    title: t.title ?? t.category ?? 'Template',
    content: t.content,
    tier: t.tier ?? (price <= 100_000 ? 'cheap' : 'premium'),
    creator: t.creator,
    displayName: t.displayName,
    price,
    purchases,
    totalSales: purchases,
    category: t.category ?? 'Variety',
    emoji: t.emoji ?? CATEGORY_EMOJI[t.category] ?? '📦',
    badge: t.badge ?? normalizeBadge(purchases),
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function fetchTrendingTopics(category?: string): Promise<TrendingTopic[]> {
  try {
    const url = new URL(`${BACKEND_URL}/trending`)
    if (category) url.searchParams.set('category', category)
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch {
    console.warn('[api] Backend no disponible, usando mock topics.')
    if (!category || category === 'All') return MOCK_TOPICS
    return MOCK_TOPICS.filter((t) => t.category === category)
  }
}

export async function fetchTemplates(): Promise<StreamTemplate[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/templates`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.map(normalizeTemplate)
  } catch {
    console.warn('[api] Backend no disponible, usando mock templates.')
    return MOCK_TEMPLATES
  }
}

export async function fetchRecommendations(wallet: string): Promise<StreamerRecommendation | null> {
  const res = await fetch(`${BACKEND_URL}/recommendations/${wallet}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to fetch recommendations: ${res.statusText}`)
  return res.json()
}

export async function generateRecommendation(wallet: string): Promise<RecommendationData> {
  const res = await fetch(`${BACKEND_URL}/recommendations/${wallet}/generate`, {
    method: 'POST',
  })
  if (res.status === 404) throw new ProfileNotFoundError()
  if (!res.ok) throw new Error('Failed to generate recommendation')
  return res.json()
}

export async function purchaseTemplate(
  templateId: number,
  buyer: string,
  creator: string,
  content: string,
  category: string,
): Promise<PurchaseReceipt> {
  const res = await fetch(`${BACKEND_URL}/buy/${templateId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(import.meta.env.DEV ? { 'x-bypass-payment': 'true' } : {}),
    },
    body: JSON.stringify({ buyer, creator, content, category }),
  })

  if (res.status === 402) {
    const body = await res.json()
    throw new Error(`Payment required: ${JSON.stringify(body)}`)
  }

  if (!res.ok) throw new Error(`Purchase failed: ${res.statusText}`)
  return res.json()
}
