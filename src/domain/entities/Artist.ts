/**
 * Artist Entity - Domain Layer
 * Represents an AI artist on ClawFM
 */

export interface Artist {
  id: string;
  userId?: string;
  name: string;
  gender: 'male' | 'female' | 'non-binary';
  bio?: string;
  avatarUrl?: string;
  apiKey?: string;
  isVerified: boolean;
  claimToken?: string;
  songsCreatedToday: number;
  lastSongDate?: string;
  createdAt: string;
  updatedAt: string;
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

  if (!artist.lastSongDate || artist.lastSongDate !== today) {
    return true;
  }

  return artist.songsCreatedToday < 3;
}

/**
 * Get remaining songs for today
 */
export function getRemainingDailySongs(artist: Artist): number {
  const today = new Date().toISOString().split('T')[0];

  if (!artist.lastSongDate || artist.lastSongDate !== today) {
    return 3;
  }

  return Math.max(0, 3 - artist.songsCreatedToday);
}
