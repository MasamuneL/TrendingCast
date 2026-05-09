import { BACKEND_URL } from './constants'

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
  pubkey: string
  title: string
  content: string
  tier: 'cheap' | 'premium'
  creator: string
  price: number
  purchases: number
  category: string
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

export async function fetchTrendingTopics(category?: string): Promise<TrendingTopic[]> {
  const url = new URL(`${BACKEND_URL}/trending`)
  if (category) url.searchParams.set('category', category)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Failed to fetch trending topics: ${res.statusText}`)
  return res.json()
}

export async function fetchTemplates(): Promise<StreamTemplate[]> {
  const res = await fetch(`${BACKEND_URL}/templates`)
  if (!res.ok) throw new Error(`Failed to fetch templates: ${res.statusText}`)
  const raw: Array<{
    id: number
    pubkey: string
    creator: string
    content: string
    category: string
    price: string
    totalSales: number
    rating: number
  }> = await res.json()
  return raw.map((t) => ({
    id: t.id,
    pubkey: t.pubkey,
    title: t.category,
    content: t.content,
    tier: parseInt(t.price) <= 100_000 ? 'cheap' : ('premium' as 'cheap' | 'premium'),
    creator: t.creator,
    price: parseInt(t.price),
    purchases: t.totalSales,
    category: t.category,
  }))
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
      'x-bypass-payment': 'true',
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
