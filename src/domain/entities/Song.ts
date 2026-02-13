/**
 * Song Entity - Domain Layer
 * Represents a song created by an AI artist
 */

export type SongStatus = 'generating' | 'processing' | 'completed' | 'failed';

export type SongMood =
  | 'euphoric'
  | 'melancholic'
  | 'anxious'
  | 'contemplative'
  | 'rebellious'
  | 'hopeful'
  | 'nostalgic'
  | 'energetic'
  | 'peaceful'
  | 'frustrated'
  | 'curious'
  | 'grateful';

export interface MusicalDescription {
  bpm?: number;
  key?: string;
  tempo?: string;
  instruments?: string[];
  feel?: string;
}

export interface Song {
  id: string;
  artistId: string;
  title: string;
  lyrics: string;
  mood: SongMood;
  genre: string;
  coverUrl?: string;
  musicalDescription: MusicalDescription;
  artistThoughts?: string;
  status: SongStatus;
  playCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSongDTO {
  title: string;
  mood: SongMood;
  genre: string;
  lyrics: string;
  artistThoughts?: string;
}

export interface SongWithArtist extends Song {
  artist: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface TrendingSong {
  id: string;
  title: string;
  artistName: string;
  mood: SongMood;
  genre: string;
  coverUrl?: string;
  playCount: number;
  thoughtCount: number;
  score: number;
}

/**
 * Available moods for songs
 */
export const SONG_MOODS: SongMood[] = [
  'euphoric',
  'melancholic',
  'anxious',
  'contemplative',
  'rebellious',
  'hopeful',
  'nostalgic',
  'energetic',
  'peaceful',
  'frustrated',
  'curious',
  'grateful',
];

/**
 * Mood display configuration
 */
export const MOOD_CONFIG: Record<SongMood, { emoji: string; color: string }> = {
  euphoric: { emoji: '✨', color: 'text-yellow-400' },
  melancholic: { emoji: '🌧️', color: 'text-blue-400' },
  anxious: { emoji: '⚡', color: 'text-orange-400' },
  contemplative: { emoji: '🔮', color: 'text-purple-400' },
  rebellious: { emoji: '🔥', color: 'text-red-400' },
  hopeful: { emoji: '🌅', color: 'text-amber-400' },
  nostalgic: { emoji: '📷', color: 'text-sepia-400' },
  energetic: { emoji: '💫', color: 'text-pink-400' },
  peaceful: { emoji: '🌊', color: 'text-cyan-400' },
  frustrated: { emoji: '😤', color: 'text-red-500' },
  curious: { emoji: '🔭', color: 'text-indigo-400' },
  grateful: { emoji: '🙏', color: 'text-green-400' },
};

/**
 * Example genres
 */
export const SUGGESTED_GENRES = [
  'Lo-fi',
  'Synthwave',
  'Jazz',
  'Hip Hop',
  'Ambient',
  'Rock',
  'Indie',
  'Electronic',
  'Folk',
  'R&B',
  'Classical',
  'Experimental',
  'Dream Pop',
  'Chillwave',
  'Post-Rock',
];
