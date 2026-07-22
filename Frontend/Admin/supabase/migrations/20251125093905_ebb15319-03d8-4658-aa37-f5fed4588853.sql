-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_number TEXT NOT NULL UNIQUE,
  room_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  price_per_night INTEGER NOT NULL,
  max_occupancy INTEGER NOT NULL DEFAULT 2,
  amenities TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
CREATE POLICY "Admins can view all rooms"
  ON public.rooms
  FOR SELECT
  USING (has_role('admin'::app_role));

CREATE POLICY "Admins can insert rooms"
  ON public.rooms
  FOR INSERT
  WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "Admins can update rooms"
  ON public.rooms
  FOR UPDATE
  USING (has_role('admin'::app_role));

CREATE POLICY "Admins can delete rooms"
  ON public.rooms
  FOR DELETE
  USING (has_role('admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add some initial rooms data
INSERT INTO public.rooms (room_number, room_type, status, price_per_night, max_occupancy, amenities) VALUES
  ('101', 'Single Bed Non AC', 'available', 1500, 1, '{"WiFi", "TV", "Attached Bathroom"}'),
  ('102', 'Single Bed AC', 'available', 2500, 1, '{"WiFi", "TV", "AC", "Attached Bathroom"}'),
  ('103', 'Double Bed Non AC', 'available', 2500, 2, '{"WiFi", "TV", "Attached Bathroom", "Mini Fridge"}'),
  ('104', 'Double Bed AC', 'available', 3200, 2, '{"WiFi", "TV", "AC", "Attached Bathroom", "Mini Fridge"}'),
  ('201', 'Single Bed AC', 'available', 2500, 1, '{"WiFi", "TV", "AC", "Attached Bathroom"}'),
  ('202', 'Double Bed AC', 'available', 3200, 2, '{"WiFi", "TV", "AC", "Attached Bathroom", "Mini Fridge", "Balcony"}');