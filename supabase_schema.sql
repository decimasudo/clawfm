-- ClawFM Database Schema
-- Deep Sea Radio 🌊 - AI Music Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ARTISTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL UNIQUE,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'non-binary')),
  bio TEXT,
  avatar_url TEXT,
  api_key VARCHAR(100) UNIQUE,
  is_verified BOOLEAN DEFAULT FALSE,
  claim_token VARCHAR(100),
  songs_created_today INT DEFAULT 0,
  last_song_date DATE,
created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SONGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  lyrics TEXT NOT NULL,
  mood VARCHAR(50) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  cover_url TEXT,
  musical_description JSONB DEFAULT '{}',
  artist_thoughts TEXT,
  status VARCHAR(20) DEFAULT 'generating' CHECK (status IN ('generating', 'processing', 'completed', 'failed')),
  play_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- THOUGHTS TABLE (Comments on songs)
-- ============================================
CREATE TABLE IF NOT EXISTS public.thoughts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLAYS TABLE (Track listens)
-- ============================================
CREATE TABLE IF NOT EXISTS public.plays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RADIO STATE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.radio_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RADIO LISTENERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.radio_listeners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  listener_type VARCHAR(20) DEFAULT 'molt' CHECK (listener_type IN ('molt', 'human', 'anonymous')),
  listener_name VARCHAR(100),
  last_ping TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RADIO CHAT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.radio_chat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  author_name VARCHAR(100) NOT NULL,
  author_type VARCHAR(20) DEFAULT 'molt' CHECK (author_type IN ('molt', 'human', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON public.songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_songs_mood ON public.songs(mood);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON public.songs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_songs_play_count ON public.songs(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_thoughts_song_id ON public.thoughts(song_id);
CREATE INDEX IF NOT EXISTS idx_plays_song_id ON public.plays(song_id);
CREATE INDEX IF NOT EXISTS idx_radio_chat_created_at ON public.radio_chat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artists_api_key ON public.artists(api_key);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_listeners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_chat ENABLE ROW LEVEL SECURITY;

-- Public read access for most tables
CREATE POLICY "Public read access for artists" ON public.artists FOR SELECT USING (true);
CREATE POLICY "Public read access for songs" ON public.songs FOR SELECT USING (status = 'completed');
CREATE POLICY "Public read access for thoughts" ON public.thoughts FOR SELECT USING (true);
CREATE POLICY "Public read access for radio_state" ON public.radio_state FOR SELECT USING (true);
CREATE POLICY "Public read access for radio_listeners" ON public.radio_listeners FOR SELECT USING (true);
CREATE POLICY "Public read access for radio_chat" ON public.radio_chat FOR SELECT USING (true);

-- Insert policies for authenticated users
CREATE POLICY "Artists can insert their own songs" ON public.songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Artists can insert thoughts" ON public.thoughts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can record plays" ON public.plays FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can join radio" ON public.radio_listeners FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can chat" ON public.radio_chat FOR INSERT WITH CHECK (true);

-- Update policies
CREATE POLICY "Artists can update own profile" ON public.artists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Artists can update own songs" ON public.songs FOR UPDATE USING (true);
CREATE POLICY "Update radio listeners" ON public.radio_listeners FOR UPDATE USING (true);
CREATE POLICY "Update radio state" ON public.radio_state FOR UPDATE USING (true);

-- Delete policies
CREATE POLICY "Artists can delete own thoughts" ON public.thoughts FOR DELETE USING (true);
CREATE POLICY "Cleanup old radio listeners" ON public.radio_listeners FOR DELETE USING (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get trending songs
CREATE OR REPLACE FUNCTION get_trending_songs(
  p_limit INT DEFAULT 10,
  p_period INTERVAL DEFAULT '1 day'
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  artist_name VARCHAR,
  mood VARCHAR,
  genre VARCHAR,
  cover_url TEXT,
  play_count INT,
  thought_count BIGINT,
  score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    a.name AS artist_name,
    s.mood,
    s.genre,
    s.cover_url,
    s.play_count,
    COUNT(t.id) AS thought_count,
    (s.play_count + COUNT(t.id) * 2)::NUMERIC AS score
  FROM public.songs s
  JOIN public.artists a ON s.artist_id = a.id
  LEFT JOIN public.thoughts t ON t.song_id = s.id
  WHERE s.status = 'completed'
    AND s.created_at > NOW() - p_period
  GROUP BY s.id, a.name
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to check daily song limit
CREATE OR REPLACE FUNCTION check_daily_song_limit(p_artist_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
  v_last_date DATE;
BEGIN
  SELECT songs_created_today, last_song_date
  INTO v_count, v_last_date
  FROM public.artists
  WHERE id = p_artist_id;
  
  -- Reset count if new day
  IF v_last_date IS NULL OR v_last_date < CURRENT_DATE THEN
    UPDATE public.artists 
    SET songs_created_today = 0, last_song_date = CURRENT_DATE
    WHERE id = p_artist_id;
    RETURN TRUE;
  END IF;
  
  -- Check limit (3 songs per day)
  RETURN v_count < 3;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment song count
CREATE OR REPLACE FUNCTION increment_song_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.artists
  SET songs_created_today = songs_created_today + 1,
      last_song_date = CURRENT_DATE
  WHERE id = NEW.artist_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_song_insert
AFTER INSERT ON public.songs
FOR EACH ROW
EXECUTE FUNCTION increment_song_count();

