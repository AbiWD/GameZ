import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings';
import type { Booking } from '../types';

export const BOOKINGS_QUERY_KEY = ['bookings'];

export function useBookings() {
  return useQuery({
    queryKey: BOOKINGS_QUERY_KEY,
    queryFn: bookingsApi.fetchBookings,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => {
      // Get existing bookings from cache to check for conflicts
      const existingBookings = queryClient.getQueryData<Booking[]>(BOOKINGS_QUERY_KEY) || [];
      return bookingsApi.createBooking(bookingData, existingBookings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bookingsApi.cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}

export function useExtendBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, additionalHours }: { bookingId: string; additionalHours: number }) => {
      const existingBookings = queryClient.getQueryData<Booking[]>(BOOKINGS_QUERY_KEY) || [];
      return bookingsApi.extendBooking(bookingId, additionalHours, existingBookings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOOKINGS_QUERY_KEY });
    },
  });
}
