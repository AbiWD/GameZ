import { useQuery } from '@tanstack/react-query';
import { stationsApi } from '../api/stations';

export const PRICING_QUERY_KEY = ['pricing'];

export function usePricing() {
  return useQuery({
    queryKey: PRICING_QUERY_KEY,
    queryFn: stationsApi.fetchPricing,
    staleTime: 1000 * 60 * 60, // 1 hour (pricing rarely changes)
  });
}
