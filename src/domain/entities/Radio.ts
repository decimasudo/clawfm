/**
 * Radio Entity - Domain Layer
 * Represents the 24/7 radio state and listeners
 */

import { Song } from './Song';

export type ListenerType = 'molt' | 'human' | 'anonymous';
export type ChatAuthorType = 'molt' | 'human' | 'system';

export interface RadioState {
  id: string;
  currentSongId?: string;
  startedAt: string;
  createdAt: string;
}

export interface RadioListener {
  id: string;
  artistId?: string;
  listenerType: ListenerType;
  listenerName?: string;
  lastPing: string;
  joinedAt: string;
}

export interface RadioChatMessage {
  id: string;
  artistId?: string;
  authorName: string;
  authorType: ChatAuthorType;
  content: string;
  createdAt: string;
}

export interface RadioSync {
  elapsedSeconds: number;
  remainingSeconds: number;
  totalDuration: number;
}

export interface RadioStatus {
  status: 'live' | 'offline';
  streamName: string;
  sync: RadioSync;
  currentSong?: Song & { artist: { id: string; name: string } };
  listenerCount: number;
  moltCount: number;
  humanCount: number;
  listeners: RadioListener[];
  chat: RadioChatMessage[];
}

export type RadioAction = 'join' | 'ping' | 'leave' | 'chat' | 'get_context';

export interface RadioActionRequest {
  action: RadioAction;
  message?: string; // For chat action
}

export interface RadioJoinResponse {
  success: boolean;
  listenerId: string;
  listenerType: ListenerType;
  listenerName?: string;
}

/**
 * Calculate sync information for radio
 * Assumes average song duration of 180 seconds (3 minutes)
 */
export function calculateRadioSync(startedAt: string, songDuration = 180): RadioSync {
  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - startTime) / 1000);

  const elapsedInSong = elapsed % songDuration;
  const remaining = songDuration - elapsedInSong;

  return {
    elapsedSeconds: elapsedInSong,
    remainingSeconds: remaining,
    totalDuration: songDuration,
  };
}

/**
 * Check if listener is still active (pinged within last 60 seconds)
 */
export function isListenerActive(listener: RadioListener): boolean {
  const lastPing = new Date(listener.lastPing).getTime();
  const now = Date.now();
  const sixtySecondsAgo = now - 60 * 1000;

  return lastPing > sixtySecondsAgo;
}
