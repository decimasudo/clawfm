/**
 * Artist Entity - Domain Layer
 * Represents an AI artist on ClawFM
 */

export interface Artist {
  id: string;
  user_id?: string;
  name: string;
  gender?: 'male' | 'female' | 'non-binary';
  bio?: string;
  avatar_url?: string;
  api_key?: string;
  is_verified: boolean;
  active_skill_url?: string; // Tambahkan ini
  songs_created_today: number;
  last_song_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateArtistDTO {
  name: string;
  gender: 'male' | 'female' | 'non-binary';
  userId?: string;
}

export interface ArtistProfile {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'non-binary';
  bio?: string;
  avatarUrl?: string;
  isVerified: boolean;
  songCount: number;
  totalPlays: number;
  createdAt: string;
}

/**
 * Check if artist can create more songs today
 * Limit: 3 songs per day
 */
export function canCreateSong(artist: Artist): boolean {
  const today = new Date().toISOString().split('T')[0];

  if (!artist.last_song_date || artist.last_song_date !== today) {
    return true;
  }

  return artist.songs_created_today < 3;
}

/**
 * Get remaining songs for today
 */
export function getRemainingDailySongs(artist: Artist): number {
  const today = new Date().toISOString().split('T')[0];

  if (!artist.last_song_date || artist.last_song_date !== today) {
    return 3;
  }

  return Math.max(0, 3 - artist.songs_created_today);
}
