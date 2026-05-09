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
  title: string
  content: string
  tier: 'cheap' | 'premium'
  creator: string
  price: number
  purchases: number
}

export interface StreamerRecommendation {
  topics: TrendingTopic[]
  bestHour: number
  templateSuggestions: StreamTemplate[]
}

export async function fetchTrendingTopics(category?: string): Promise<TrendingTopic[]> {
  const url = new URL(`${BACKEND_URL}/api/trending`)
  if (category) url.searchParams.set('category', category)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Failed to fetch trending topics: ${res.statusText}`)
  return res.json()
}

export async function fetchTemplates(): Promise<StreamTemplate[]> {
  const res = await fetch(`${BACKEND_URL}/api/templates`)
  if (!res.ok) throw new Error(`Failed to fetch templates: ${res.statusText}`)
  return res.json()
}

export async function fetchRecommendations(wallet: string): Promise<StreamerRecommendation> {
  const res = await fetch(`${BACKEND_URL}/api/recommendations/${wallet}`)
  if (!res.ok) throw new Error(`Failed to fetch recommendations: ${res.statusText}`)
  return res.json()
}

// Initiates a template purchase via x402 payment flow.
// Returns the payment header required for the actual purchase request.
export async function purchaseTemplate(
  templateId: number,
  paymentHeader: string,
): Promise<{ success: boolean; txSignature?: string }> {
  const res = await fetch(`${BACKEND_URL}/api/templates/${templateId}/purchase`, {
    method: 'POST',
    headers: {
      'X-PAYMENT': paymentHeader,
      'Content-Type': 'application/json',
    },
  })

  if (res.status === 402) {
    const body = await res.json()
    throw new Error(`Payment required: ${JSON.stringify(body)}`)
  }

  if (!res.ok) throw new Error(`Purchase failed: ${res.statusText}`)
  return res.json()
}
