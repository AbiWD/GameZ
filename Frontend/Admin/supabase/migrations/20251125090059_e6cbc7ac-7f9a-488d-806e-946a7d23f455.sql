-- Fix search_path for has_role function to prevent security vulnerabilities
CREATE OR REPLACE FUNCTION public.has_role(check_role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = check_role
  );
END;
$$;