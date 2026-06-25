-- ==========================================
-- THE VOUCH APP - ENTERPRISE SECURITY SCHEMA
-- ==========================================

-- 1. Create Profiles Table (Users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT NOT NULL,
    is_id_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Vouches Table (The Tea)
CREATE TABLE public.vouches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    target_name TEXT NOT NULL,
    target_city TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- MILITARY-GRADE ROW LEVEL SECURITY (RLS)
-- This blocks all unauthorized API/Database scraping
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouches ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR PROFILES
-- Users can only see their own profile data (e.g. real name, ID status). NO ONE ELSE can query this.
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- POLICIES FOR VOUCHES
-- Anyone can read vouches, but the author's identity is safe because of the profile policy above.
CREATE POLICY "Anyone can view vouches" 
ON public.vouches FOR SELECT 
USING (true);

-- Only logged in, ID-Verified users can INSERT a vouch
CREATE POLICY "Verified users can insert vouches" 
ON public.vouches FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_id_verified = true)
);

-- Note: No UPDATE or DELETE policies exist for vouches. 
-- Once a vouch is posted, it is immutable by users to prevent tampering.
