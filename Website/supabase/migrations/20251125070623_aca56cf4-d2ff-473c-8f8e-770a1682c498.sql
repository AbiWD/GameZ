-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  guests INTEGER NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert bookings (public booking form)
CREATE POLICY "Anyone can create bookings"
ON public.bookings
FOR INSERT
WITH CHECK (true);

-- Create policy for reading bookings (only for admins - you'll need to set this up later)
CREATE POLICY "Only admins can view bookings"
ON public.bookings
FOR SELECT
USING (false); -- Change this later when you add admin authentication

-- Add index for better query performance
CREATE INDEX idx_bookings_created_at ON public.bookings(created_at DESC);