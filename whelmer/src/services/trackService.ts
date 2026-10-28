// src/services/trackService.ts
import type { AudioSource } from 'expo-audio';

export interface SoundTrack {
  id: string;
  title: string;
  artist: string;
  category: 'Lofi' | 'Nature' | 'Ambient' | 'Noise';
  /** Remote URL (string) or a bundled asset via require() (number). */
  source: AudioSource;
}

// Bundled tracks live in assets/audio as 60s seamless loops, so they play
// offline and never depend on a third-party CDN staying up.
export const TRACK_LIST: SoundTrack[] = [
  {
    id: 'lofi-1',
    title: 'Lofi Rain & Focus Beats',
    artist: 'Milo Chill Station',
    category: 'Lofi',
    source: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
  },
  {
    id: 'lofi-2',
    title: 'Gentle Rain & Keys',
    artist: 'Cozy Corner',
    category: 'Lofi',
    source: require('../../assets/audio/rain-keys.mp3'),
  },
  {
    id: 'lofi-3',
    title: 'Midnight Chill Study',
    artist: 'Lofi Dreamer',
    category: 'Lofi',
    source: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
  },
  {
    id: 'nature-1',
    title: 'Soft Rainfall',
    artist: 'Nature Sounds',
    category: 'Nature',
    source: require('../../assets/audio/soft-rain.mp3'),
  },
  {
    id: 'nature-2',
    title: 'Calm Ocean Waves',
    artist: 'Seaside Sanctuary',
    category: 'Nature',
    source: require('../../assets/audio/ocean-waves.mp3'),
  },
  {
    id: 'nature-3',
    title: 'Campfire & Night Crickets',
    artist: 'Wilderness Ambient',
    category: 'Nature',
    source: require('../../assets/audio/campfire-crickets.mp3'),
  },
  {
    id: 'nature-4',
    title: 'Forest Stream',
    artist: 'Nature Sounds',
    category: 'Nature',
    source: require('../../assets/audio/forest-stream.mp3'),
  },
  {
    id: 'ambient-1',
    title: 'Alpha Waves 432Hz Focus',
    artist: 'Brainwave Lab',
    category: 'Ambient',
    source: require('../../assets/audio/alpha-432.mp3'),
  },
  {
    id: 'ambient-2',
    title: 'Deep Space Drone',
    artist: 'Cosmic Drift',
    category: 'Ambient',
    source: require('../../assets/audio/space-drone.mp3'),
  },
  {
    id: 'noise-1',
    title: 'Smooth Brown Noise',
    artist: 'Focus Frequency',
    category: 'Noise',
    source: require('../../assets/audio/brown-noise.mp3'),
  },
];
