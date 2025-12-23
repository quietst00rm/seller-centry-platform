-- =============================================================================
-- CRITICAL SECURITY FIX: Enable RLS on user_tenants and invites tables
-- =============================================================================
--
-- This migration fixes the security vulnerabilities identified by Supabase
-- Security Advisor on 2024-12-22:
--
-- 1. policy_exists_rls_disabled on user_tenants
-- 2. rls_disabled_in_public on user_tenants
-- 3. rls_disabled_in_public on invites
--
-- Without RLS enabled, ANY user with the anon key can read/write ALL records
-- in these tables via the Supabase REST API.
--
-- RUN THIS IN SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/byaaliobjjdffkhnxytv/sql/new
-- =============================================================================


-- =============================================================================
-- STEP 1: Enable RLS on user_tenants table
-- =============================================================================
-- The table already has a policy "Users can view their own tenants" but RLS
-- was never enabled, making the policy completely ineffective.

ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- STEP 2: Enable RLS on invites table
-- =============================================================================
-- This table has no RLS at all - completely exposed.

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- STEP 3: Create RLS policies for invites table
-- =============================================================================
-- The invites table needs policies to control who can read/write invites.

-- Policy: Users can view invites sent to their email
CREATE POLICY "Users can view their own invites"
ON public.invites
FOR SELECT
USING (
  auth.jwt() ->> 'email' = email
);

-- Policy: Service role can manage all invites (for admin operations)
-- Note: service_role bypasses RLS by default, but this is explicit for clarity
CREATE POLICY "Service role can manage all invites"
ON public.invites
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- STEP 4: Verify existing user_tenants policies are correct
-- =============================================================================
-- Check what policies exist. The "Users can view their own tenants" policy
-- should already be in place. If you need to recreate it:

-- DROP POLICY IF EXISTS "Users can view their own tenants" ON public.user_tenants;
--
-- CREATE POLICY "Users can view their own tenants"
-- ON public.user_tenants
-- FOR SELECT
-- USING (auth.uid() = user_id);


-- =============================================================================
-- VERIFICATION QUERIES (run these to confirm the fix)
-- =============================================================================

-- Check RLS is enabled on both tables:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename IN ('user_tenants', 'invites');

-- Check policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('user_tenants', 'invites');
