-- Add new columns to bookings table for check-in/check-out tracking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS actual_check_in TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_check_out TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_type TEXT,
  ADD COLUMN IF NOT EXISTS id_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS amount_paid INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_mode TEXT;

-- Add check constraints for valid status values
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'));

-- Add check constraint for valid payment status values
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_status_check 
  CHECK (payment_status IN ('pending', 'partial', 'paid'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_date ON public.bookings(check_in);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out_date ON public.bookings(check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_room ON public.bookings(assigned_room_id);