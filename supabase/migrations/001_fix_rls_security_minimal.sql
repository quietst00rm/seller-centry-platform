-- CRITICAL: Run this in Supabase SQL Editor immediately
-- https://supabase.com/dashboard/project/byaaliobjjdffkhnxytv/sql/new

-- Enable RLS on user_tenants (has policies but RLS was disabled)
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- Enable RLS on invites (no policies existed)
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Create policy for invites: users can only see invites sent to their email
CREATE POLICY "Users can view their own invites"
ON public.invites
FOR SELECT
USING (auth.jwt() ->> 'email' = email);

-- Service role bypass for admin operations
CREATE POLICY "Service role can manage all invites"
ON public.invites
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
