import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface Entitlement {
  isPro: boolean
  tier: 'free' | 'pro_monthly' | 'pro_yearly' | 'pro_lifetime'
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export interface PricingPlan {
  id: string
  stripe_price_id?: string
  price_cents: number
  currency?: string
  interval?: string
  name: string
  period?: string
  features?: string[]
}

export function useEntitlement() {
  return useQuery({
    queryKey: ['entitlement'],
    queryFn: async () => await apiFetch<Entitlement>('/api/me/entitlement'),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  })
}

export function useIsPro(): boolean {
  const { data } = useEntitlement()
  return data?.isPro ?? false
}

export function usePricing() {
  return useQuery({
    queryKey: ['pricing'],
    queryFn: async () =>
      await apiFetch<{ plans: PricingPlan[]; earlyBirdRemaining: number }>('/api/pricing'),
    staleTime: 30 * 60_000,
  })
}
