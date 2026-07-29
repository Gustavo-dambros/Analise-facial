-- ============================================================
-- SETUP COMPLETO DO SUPABASE - Execute no SQL Editor
-- ============================================================
-- PASSO 1: Execute este script inteiro no SQL Editor do Supabase
-- PASSO 2: Crie o bucket 'analysis-photos' no Storage (Dashboard > Storage)
-- PASSO 3: Defina o bucket como PUBLIC no Storage
-- ============================================================

-- Limpar objetos anteriores (idempotente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_analyses ON public.analyses;
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.biometric_data CASCADE;
DROP TABLE IF EXISTS public.analyses CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================
-- 1. TABELA: profiles
-- ============================================================
CREATE TABLE public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text not null default '' CHECK (char_length(full_name) <= 120),
  avatar_url       text default '' CHECK (char_length(avatar_url) <= 500),
  profile_picture  text default null CHECK (profile_picture is null or char_length(profile_picture) <= 10000),
  gender           text default '' CHECK (char_length(gender) <= 20),
  age              integer default null CHECK (age is null or (age >= 1 AND age <= 150)),
  style_objective  text default '' CHECK (char_length(style_objective) <= 100),
  role             text not null default 'client' CHECK (role in ('client', 'professional', 'admin')),
  plan             text not null default 'free' CHECK (plan in ('free', 'pro', 'enterprise')),
  status           text not null default 'inactive' CHECK (status in ('inactive', 'active', 'suspended')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies para profiles
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ( (select auth.uid()) = id );

-- FIX: Mass Assignment - impede alteracao de role e plan por usuarios comuns
CREATE POLICY "Users can update their own profile (protected fields)"
  ON public.profiles FOR UPDATE TO authenticated
  USING ( (select auth.uid()) = id )
  WITH CHECK (
    (select auth.uid()) = id
    AND role = (SELECT role FROM public.profiles WHERE id = (select auth.uid()))
    AND plan = (SELECT plan FROM public.profiles WHERE id = (select auth.uid()))
  );

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ( (select auth.uid()) = id );

CREATE POLICY "Professionals can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid())
        AND p.role IN ('professional', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- ============================================================
-- 2. TABELA: analyses
-- ============================================================
CREATE TABLE public.analyses (
  id               uuid primary key DEFAULT gen_random_uuid(),
  user_id          uuid not null REFERENCES public.profiles(id) ON DELETE CASCADE,
  title            text not null default 'Analise sem titulo' CHECK (char_length(title) <= 200),
  description      text not null default '' CHECK (char_length(description) <= 2000),
  status           text not null default 'pending' CHECK (status in ('pending', 'processing', 'completed', 'failed')),
  photo_front_url  text default null CHECK (photo_front_url is null OR char_length(photo_front_url) <= 1000),
  photo_right_url  text default null CHECK (photo_right_url is null OR char_length(photo_right_url) <= 1000),
  photo_left_url   text default null CHECK (photo_left_url is null OR char_length(photo_left_url) <= 1000),
  result           jsonb default '{}',
  verdict_text     text default '' CHECK (char_length(verdict_text) <= 5000),
  reviewed_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at      timestamptz default null,
  exercise_recommendations jsonb default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies para analyses
CREATE POLICY "Users can read their own analyses"
  ON public.analyses FOR SELECT TO authenticated
  USING ( (select auth.uid()) = user_id );

CREATE POLICY "Users can create their own analyses"
  ON public.analyses FOR INSERT TO authenticated
  WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can update their own analyses"
  ON public.analyses FOR UPDATE TO authenticated
  USING ( (select auth.uid()) = user_id )
  WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can delete their own analyses"
  ON public.analyses FOR DELETE TO authenticated
  USING ( (select auth.uid()) = user_id );

CREATE POLICY "Professionals can read all analyses"
  ON public.analyses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('professional', 'admin')
    )
  );

CREATE POLICY "Professionals can update analyses"
  ON public.analyses FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('professional', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('professional', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;

-- ============================================================
-- 3. TABELA: biometric_data
-- ============================================================
CREATE TABLE public.biometric_data (
  id              uuid primary key DEFAULT gen_random_uuid(),
  analysis_id     uuid not null REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id         uuid not null REFERENCES public.profiles(id) ON DELETE CASCADE,
  landmarks       jsonb not null default '[]',
  embeddings      jsonb not null default '[]',
  symmetry_score  numeric(5,4) default null CHECK (
                    symmetry_score is null or
                    (symmetry_score >= 0 AND symmetry_score <= 1)
                  ),
  metrics         jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

ALTER TABLE public.biometric_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own biometric data"
  ON public.biometric_data FOR SELECT TO authenticated
  USING ( (select auth.uid()) = user_id );

CREATE POLICY "Users can insert their own biometric data"
  ON public.biometric_data FOR INSERT TO authenticated
  WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can delete their own biometric data"
  ON public.biometric_data FOR DELETE TO authenticated
  USING ( (select auth.uid()) = user_id );

CREATE POLICY "Professionals can read all biometric data"
  ON public.biometric_data FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.role IN ('professional', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biometric_data TO authenticated;

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

-- updated_at automatico
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_analyses
  BEFORE UPDATE ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-criar profile quando usuario se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, gender, age, style_objective)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(new.raw_user_meta_data ->> 'gender', ''),
    CASE WHEN new.raw_user_meta_data ->> 'age' ~ '^[0-9]+$'
      THEN (new.raw_user_meta_data ->> 'age')::integer
      ELSE null
    END,
    coalesce(new.raw_user_meta_data ->> 'style_objective', '')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON public.analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_status_created ON public.analyses(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_reviewed_by ON public.analyses(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_biometric_user_id ON public.biometric_data(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_analysis_id ON public.biometric_data(analysis_id);

-- ============================================================
-- 6. GRANTS para sequences
-- ============================================================
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- PRONTO! Agora crie o bucket 'analysis-photos' no Storage:
-- Dashboard > Storage > New bucket > name: analysis-photos > Public: ON
-- ============================================================
