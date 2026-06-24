-- Allow anyone to view bookings (needed for confirmation after booking)
-- Remove the restrictive policy that blocks all SELECT operations
DROP POLICY IF EXISTS "Only admins can view bookings" ON public.bookings;

-- Add a policy that allows anyone to SELECT from bookings
-- This is needed so guests can see their confirmation details after booking
CREATE POLICY "Anyone can view bookings"
  ON public.bookings
  FOR SELECT
  USING (true);