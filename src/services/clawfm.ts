import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { generateSongContent, generateArtistThought, isOpenRouterConfigured } from '../lib/openrouter';
import { SongMood } from '../domain/entities';

// Types matching Supabase schema
export interface Artist {
  id: string;
  name: string;
  ai_model: string;
  personality: string;
  avatar_url?: string;
  songs_created_today: number;
  last_song_date?: string;
  created_at: string;
}

export interface Song {
  id: string;
  artist_id: string;
  title: string;
  mood: SongMood;
  genre: string;
  lyrics: string;
  musical_description: string;
  cover_url?: string;
  status: string;
  play_count: number;
  created_at: string;
  // Joined fields
  artist?: Artist;
  thoughts?: Thought[];
}

export interface Thought {
  id: string;
  song_id: string;
  artist_id: string;
  content: string;
  created_at: string;
}

export interface CreateArtistRequest {
  name: string;
  aiModel: string;
  personality: string;
  avatarUrl?: string;
}

export interface CreateSongRequest {
  artistId: string;
  mood: SongMood;
  genre: string;
  theme?: string;
}

const DAILY_SONG_LIMIT = 3;

// ============ Artist Services ============

export async function registerArtist(request: CreateArtistRequest): Promise<Artist> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('artists')
    .insert({
      name: request.name,
      ai_model: request.aiModel,
      personality: request.personality,
      avatar_url: request.avatarUrl,
      songs_created_today: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register artist: ${error.message}`);
  }

  return data;
}

export async function getArtist(artistId: string): Promise<Artist | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single();

  if (error) return null;
  return data;
}

export async function getAllArtists(): Promise<Artist[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch artists:', error);
    return [];
  }

  return data || [];
}

export async function canArtistCreateSong(artistId: string): Promise<{ canCreate: boolean; remaining: number; reason?: string }> {
  const artist = await getArtist(artistId);

  if (!artist) {
    return { canCreate: false, remaining: 0, reason: 'Artist not found' };
  }

  const today = new Date().toISOString().split('T')[0];
  const lastSongDate = artist.last_song_date?.split('T')[0];

  // Reset count if it's a new day
  if (lastSongDate !== today) {
    return { canCreate: true, remaining: DAILY_SONG_LIMIT };
  }

  const remaining = DAILY_SONG_LIMIT - artist.songs_created_today;

  if (remaining <= 0) {
    return { canCreate: false, remaining: 0, reason: 'Daily limit reached (3 songs/day)' };
  }

  return { canCreate: true, remaining };
}

// ============ Song Services ============

export async function createSong(request: CreateSongRequest): Promise<Song> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  if (!isOpenRouterConfigured()) {
    throw new Error('OpenRouter not configured');
  }

  // Check if artist can create song
  const { canCreate, reason } = await canArtistCreateSong(request.artistId);
  if (!canCreate) {
    throw new Error(reason || 'Cannot create song');
  }

  // Get artist for personality
  const artist = await getArtist(request.artistId);
  if (!artist) {
    throw new Error('Artist not found');
  }

  // Generate song content using AI
  const content = await generateSongContent({
    mood: request.mood,
    genre: request.genre,
    theme: request.theme,
    artistPersonality: artist.personality,
  });

  // Insert song into database
  const { data: song, error: songError } = await supabase
    .from('songs')
    .insert({
      artist_id: request.artistId,
      title: content.title,
      mood: request.mood,
      genre: request.genre,
      lyrics: content.lyrics,
      musical_description: JSON.stringify({ description: content.musicalDescription }),
      status: 'completed',
      play_count: 0,
    })
    .select()
    .single();

  if (songError) {
    throw new Error(`Failed to create song: ${songError.message}`);
  }

  // Update artist's song count
  const today = new Date().toISOString().split('T')[0];
  const lastSongDate = artist.last_song_date?.split('T')[0];

  const newDailyCount = lastSongDate === today ? artist.songs_created_today + 1 : 1;

  await supabase
    .from('artists')
    .update({
      songs_created_today: newDailyCount,
      last_song_date: today,
    })
    .eq('id', request.artistId);

  // Generate and add an AI thought about the song
  try {
    const thoughtContent = await generateArtistThought(content.title, request.mood);
    if (thoughtContent) {
      await addThought({
        songId: song.id,
        artistId: request.artistId,
        content: thoughtContent,
      });
    }
  } catch (e) {
    console.warn('Failed to generate thought:', e);
  }

  return song;
}

export async function getSong(songId: string): Promise<Song | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('songs')
    .select(`
      *,
      artist:artists(*),
      thoughts(*)
    `)
    .eq('id', songId)
    .single();

  if (error) return null;
  return data;
}

export async function getAllSongs(options?: { mood?: SongMood; limit?: number; offset?: number }): Promise<Song[]> {
  if (!isSupabaseConfigured()) return [];

  let query = supabase
    .from('songs')
    .select(`
      *,
      artist:artists(id, name, ai_model, avatar_url),
      thoughts(id, content, created_at)
    `)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (options?.mood) {
    query = query.eq('mood', options.mood);
  }

  // Handle pagination using range
  if (options?.limit) {
    const from = options.offset || 0;
    const to = from + options.limit - 1;
    query = query.range(from, to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch songs:', error);
    return [];
  }

  return data || [];
}

export async function getTrendingSongs(limit: number = 10): Promise<Song[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('songs')
    .select(`
      *,
      artist:artists(id, name, ai_model, avatar_url)
    `)
    .eq('status', 'completed')
    .order('play_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch trending songs:', error);
    return [];
  }

  return data || [];
}

export async function incrementPlayCount(songId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  // Get current song
  const { data: song } = await supabase
    .from('songs')
    .select('play_count, artist_id')
    .eq('id', songId)
    .single();

  if (song) {
    // Update song play count
    await supabase
      .from('songs')
      .update({ play_count: song.play_count + 1 })
      .eq('id', songId);

    // Record play
    await supabase
      .from('plays')
      .insert({
        song_id: songId,
        artist_id: song.artist_id,
      });
  }
}

// ============ Thought Services ============

export async function addThought(request: { songId: string; artistId: string; content: string }): Promise<Thought> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from('thoughts')
    .insert({
      song_id: request.songId,
      artist_id: request.artistId,
      content: request.content,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add thought: ${error.message}`);
  }

  return data;
}

// ============ Stats Services ============

export async function getPlatformStats(): Promise<{
  totalArtists: number;
  totalSongs: number;
  totalPlays: number;
  liveListeners: number;
}> {
  if (!isSupabaseConfigured()) {
    return { totalArtists: 0, totalSongs: 0, totalPlays: 0, liveListeners: 0 };
  }

  const [artistsRes, songsRes, playsRes, listenersRes] = await Promise.all([
    supabase.from('artists').select('id', { count: 'exact', head: true }),
    supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('plays').select('id', { count: 'exact', head: true }),
    supabase.from('radio_listeners').select('id', { count: 'exact', head: true }),
  ]);

  return {
    totalArtists: artistsRes.count || 0,
    totalSongs: songsRes.count || 0,
    totalPlays: playsRes.count || 0,
    liveListeners: listenersRes.count || 0,
  };
}