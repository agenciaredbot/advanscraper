-- ============================================
-- Trigger: Auto-create Profile on user signup
-- ============================================
-- Run this SQL in Supabase Dashboard > SQL Editor
-- This creates a row in public."Profile" whenever
-- a new user signs up via Supabase Auth.

-- 1. Create the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."Profile" (id, email, name, "dailyLimit", "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    50,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 4. Enable RLS on Profile table (optional but recommended)
ALTER TABLE public."Profile" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON public."Profile"
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public."Profile"
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Allow the trigger function to insert (service_role)
CREATE POLICY "Service role can insert profiles"
  ON public."Profile"
  FOR INSERT
  WITH CHECK (true);
