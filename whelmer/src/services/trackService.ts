// src/services/trackService.ts

export interface SoundTrack {
  id: string;
  title: string;
  artist: string;
  category: 'Lofi' | 'Nature' | 'Ambient' | 'Noise';
  uri: string;
}

export const TRACK_LIST: SoundTrack[] = [
  {
    id: 'lofi-1',
    title: 'Lofi Rain & Focus Beats',
    artist: 'Milo Chill Station',
    category: 'Lofi',
    uri: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
  },
  {
    id: 'lofi-2',
    title: 'Gentle Coffee Shop & Keys',
    artist: 'Cozy Corner',
    category: 'Lofi',
    uri: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a7321f.mp3',
  },
  {
    id: 'lofi-3',
    title: 'Midnight Chill Study',
    artist: 'Lofi Dreamer',
    category: 'Lofi',
    uri: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
  },
  {
    id: 'lofi-4',
    title: 'Soft Rain & Guitar Notes',
    artist: 'Acoustic Lofi',
    category: 'Lofi',
    uri: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c2f82d2719.mp3',
  },
  {
    id: 'nature-1',
    title: 'Deep Forest Rain',
    artist: 'Nature Sounds',
    category: 'Nature',
    uri: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_34b35e07a6.mp3',
  },
  {
    id: 'nature-2',
    title: 'Calm Ocean Waves',
    artist: 'Seaside Sanctuary',
    category: 'Nature',
    uri: 'https://cdn.pixabay.com/download/audio/2022/02/07/audio_bf041f0578.mp3',
  },
  {
    id: 'nature-3',
    title: 'Campfire & Night Crickets',
    artist: 'Wilderness Ambient',
    category: 'Nature',
    uri: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_1048bdfb13.mp3',
  },
  {
    id: 'ambient-1',
    title: 'Alpha Waves 432Hz Focus',
    artist: 'Brainwave Lab',
    category: 'Ambient',
    uri: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f7d296.mp3',
  },
  {
    id: 'ambient-2',
    title: 'Deep Space Drone',
    artist: 'Cosmic Drift',
    category: 'Ambient',
    uri: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_35b6fb1a93.mp3',
  },
  {
    id: 'noise-1',
    title: 'Smooth Brown Noise',
    artist: 'Focus Frequency',
    category: 'Noise',
    uri: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_24e2373024.mp3',
  },
];