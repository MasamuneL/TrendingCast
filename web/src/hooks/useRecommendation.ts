import { useState, useEffect, useCallback } from 'react'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import {
  fetchRecommendations,
  generateRecommendation,
  ProfileNotFoundError,
  type StreamerRecommendation,
} from '../lib/api'
import { saveRecommendationOnChain, createProfileOnChain } from '../lib/anchor'

interface UseRecommendationReturn {
  recommendation: StreamerRecommendation | null
  loading: boolean
  generating: boolean
  error: string | null
  profileMissing: boolean
  generate: () => Promise<void>
  createProfile: (category: string, hours: number[]) => Promise<void>
  refetch: () => Promise<void>
}

export function useRecommendation(wallet: string): UseRecommendationReturn {
  const anchorWallet = useAnchorWallet()
  const [recommendation, setRecommendation] = useState<StreamerRecommendation | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileMissing, setProfileMissing] = useState(false)

  const refetch = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchRecommendations(wallet)
      setRecommendation(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch recommendation')
    }
  }, [wallet])

  useEffect(() => {
    setLoading(true)
    refetch().finally(() => setLoading(false))
  }, [refetch])

  const generate = useCallback(async () => {
    if (!anchorWallet) {
      setError('Wallet not connected')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const data = await generateRecommendation(wallet)
      await saveRecommendationOnChain(anchorWallet, new PublicKey(wallet), data)
      await refetch()
    } catch (e: unknown) {
      if (e instanceof ProfileNotFoundError) {
        setProfileMissing(true)
      } else {
        setError(e instanceof Error ? e.message : 'Failed to generate recommendation')
      }
    } finally {
      setGenerating(false)
    }
  }, [anchorWallet, wallet, refetch])

  const createProfile = useCallback(
    async (category: string, hours: number[]) => {
      if (!anchorWallet) {
        setError('Wallet not connected')
        return
      }
      setGenerating(true)
      setError(null)
      try {
        await createProfileOnChain(anchorWallet, category, hours)
        setProfileMissing(false)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to create profile')
      } finally {
        setGenerating(false)
      }
    },
    [anchorWallet],
  )

  return { recommendation, loading, generating, error, profileMissing, generate, createProfile, refetch }
}
