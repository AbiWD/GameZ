-- Create app_role enum type
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- Create user_roles table to manage role assignments
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(check_role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = check_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies on bookings table
-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON public.bookings;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.bookings;
DROP POLICY IF EXISTS "Enable update for all users" ON public.bookings;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.bookings;

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
USING (public.has_role('admin'));

-- Admins can insert bookings
CREATE POLICY "Admins can insert bookings"
ON public.bookings
FOR INSERT
WITH CHECK (public.has_role('admin'));

-- Admins can update all bookings
CREATE POLICY "Admins can update all bookings"
ON public.bookings
FOR UPDATE
USING (public.has_role('admin'));

-- Admins can delete all bookings
CREATE POLICY "Admins can delete all bookings"
ON public.bookings
FOR DELETE
USING (public.has_role('admin'));

-- Policy for user_roles table - only admins can view roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.has_role('admin'));

-- Admins can manage user roles
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
USING (public.has_role('admin'));