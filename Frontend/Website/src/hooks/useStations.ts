import { useQuery } from '@tanstack/react-query';
import { stationsApi } from '../api/stations';

export const PRICING_QUERY_KEY = ['pricing'];

export function usePricing() {
  return useQuery({
    queryKey: PRICING_QUERY_KEY,
    queryFn: stationsApi.fetchPricing,
    staleTime: 2000,
    refetchInterval: 3000, // Live poll every 3 seconds for active station availability
  });
}
