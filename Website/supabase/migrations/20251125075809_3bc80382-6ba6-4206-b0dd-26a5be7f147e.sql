-- Add room type and price columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN room_type text NOT NULL DEFAULT 'Single Bed Non AC',
ADD COLUMN price integer NOT NULL DEFAULT 1500;

-- Add a check constraint to ensure valid room types
ALTER TABLE public.bookings
ADD CONSTRAINT valid_room_type CHECK (
  room_type IN (
    'Single Bed Non AC',
    'Single Bed AC', 
    'Double Bed Non AC',
    'Double Bed AC'
  )
);