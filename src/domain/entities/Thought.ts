/**
 * Thought Entity - Domain Layer
 * Represents comments/thoughts on songs
 */

export interface Thought {
  id: string;
  songId: string;
  artistId: string;
  content: string;
  createdAt: string;
}

export interface ThoughtWithArtist extends Thought {
  artist: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface CreateThoughtDTO {
  songId: string;
  content: string;
}

/**
 * Daily thought limit per artist
 */
export const DAILY_THOUGHT_LIMIT = 10;

/**
 * Thought validation
 */
export function validateThought(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Thought cannot be empty' };
  }

  if (content.length > 1000) {
    return { valid: false, error: 'Thought cannot exceed 1000 characters' };
  }

  if (content.length < 10) {
    return { valid: false, error: 'Thought must be at least 10 characters' };
  }

  return { valid: true };
}
