export interface AudioTrack {
  id: string;
  filename: string;
  filepath: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year?: number;
  duration: number;
  bitrate: number;
  sampleRate: number;
  channels: number;
  codec: string;
  filesize: number;
  coverArt?: string;
  waveform?: number[];
  cueIn?: number;
  cueOut?: number;
  dateAdded: string;
}

export interface AudioSettings {
  format: 'mp3' | 'aac' | 'ogg';
  bitrate: 64 | 96 | 128 | 192 | 256 | 320;
  sampleRate: 44100 | 48000;
  channels: 1 | 2;
  crossfadeDuration: number;
  crossfadeCurve: 'tri' | 'qsin' | 'esin' | 'hsin' | 'log' | 'nofade';
  normalizeVolume: boolean;
  targetLufs: number;
  equalizer: {
    enabled: boolean;
    bass: number;
    mid: number;
    treble: number;
  };
  limiter: {
    enabled: boolean;
    threshold: number;
  };
}

export interface IcecastConfig {
  enabled: boolean;
  host: string;
  port: number;
  mount: string;
  sourcePassword: string;
  streamName: string;
  streamDescription: string;
  streamGenre: string;
  isPublic: boolean;
}

export interface RadioStatus {
  online: boolean;
  autodjActive: boolean;
  streamUrl: string;
  icecastConnected: boolean;
  directStreamPort: number;
  activeListeners: number;
  peakListeners: number;
  totalBytesStreamed: number;
  uptimeSeconds: number;
  startedAt: string | null;
  currentTrackElapsed: number;
  currentTrackDuration: number;
  audioSettings: AudioSettings;
  icecastConfig: {
    enabled: boolean;
    host: string;
    port: number;
    mount: string;
    streamName: string;
    isPublic: boolean;
  };
  ffmpeg: {
    installed: boolean;
    version: string;
    encoders: string[];
    isEncoding: boolean;
  };
}

export interface NowPlayingData {
  online: boolean;
  streamUrl: string;
  currentTrack: AudioTrack | null;
  elapsedSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  nextTrack: AudioTrack | null;
  upNext: AudioTrack[];
  history: {
    track: AudioTrack;
    playedAt: string;
  }[];
  activeListeners: number;
  peakListeners: number;
  metadata: {
    title: string;
    artist: string;
    album: string;
    genre: string;
    streamName: string;
  };
}

export interface DiagnosticResult {
  timestamp: string;
  overallStatus: 'ok' | 'warning' | 'error';
  checks: {
    name: string;
    status: 'ok' | 'warning' | 'error';
    summary: string;
    details: string;
    troubleshooting?: string;
  }[];
  ffmpegInfo: {
    installed: boolean;
    version: string;
    path: string;
    supportedEncoders: string[];
  };
  icecastInfo: {
    configured: boolean;
    reachable: boolean;
    latencyMs?: number;
    endpoint: string;
    error?: string;
  };
  storageInfo: {
    libraryCount: number;
    totalDurationSeconds: number;
    totalSizeBytes: number;
  };
}

export interface ProgrammingShow {
  id: string;
  title: string;
  host: string;
  time: string;
  genre: string;
  days: string;
  active: boolean;
}
