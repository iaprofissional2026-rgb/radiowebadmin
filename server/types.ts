export interface AudioTrack {
  id: string;
  filename: string;
  filepath: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year?: number;
  duration: number; // in seconds
  bitrate: number; // in kbps
  sampleRate: number; // in Hz
  channels: number; // 1 = mono, 2 = stereo
  codec: string;
  filesize: number; // in bytes
  coverArt?: string; // base64 or URL
  waveform?: number[]; // array of normalized values 0-1
  cueIn?: number;
  cueOut?: number;
  dateAdded: string;
}

export interface AudioSettings {
  format: 'mp3' | 'aac' | 'ogg';
  bitrate: 64 | 96 | 128 | 192 | 256 | 320;
  sampleRate: 44100 | 48000;
  channels: 1 | 2; // 1 = Mono, 2 = Stereo
  crossfadeDuration: number; // 0 to 12 seconds
  crossfadeCurve: 'tri' | 'qsin' | 'esin' | 'hsin' | 'log' | 'nofade';
  normalizeVolume: boolean;
  targetLufs: number; // -14 to -23 LUFS
  equalizer: {
    enabled: boolean;
    bass: number; // -12 to +12 dB (100 Hz)
    mid: number; // -12 to +12 dB (1000 Hz)
    treble: number; // -12 to +12 dB (8000 Hz)
  };
  limiter: {
    enabled: boolean;
    threshold: number; // dB
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
