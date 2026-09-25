import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import { AudioLibrary } from './library.js';
import { RadioStreamer } from './streamer.js';
import { AudioSettings, AudioTrack, NowPlayingData } from './types.js';

export class AutoDJEngine extends EventEmitter {
  private library: AudioLibrary;
  private streamer: RadioStreamer;
  private audioSettings: AudioSettings;
  
  private isRunning: boolean = false;
  private currentTrack: AudioTrack | null = null;
  private nextTrack: AudioTrack | null = null;
  private upNext: AudioTrack[] = [];
  private history: { track: AudioTrack; playedAt: string }[] = [];
  
  private currentProcess: ChildProcess | null = null;
  private trackStartTime: number = 0;
  private elapsedSeconds: number = 0;
  private tickInterval: NodeJS.Timeout | null = null;
  private isTransitioning: boolean = false;
  private startedAt: string | null = null;

  constructor(library: AudioLibrary, streamer: RadioStreamer, audioSettings: AudioSettings) {
    super();
    this.library = library;
    this.streamer = streamer;
    this.audioSettings = audioSettings;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getStartedAt(): string | null {
    return this.startedAt;
  }

  getAudioSettings(): AudioSettings {
    return this.audioSettings;
  }

  updateSettings(settings: Partial<AudioSettings>): void {
    this.audioSettings = {
      ...this.audioSettings,
      ...settings,
      equalizer: {
        ...this.audioSettings.equalizer,
        ...(settings.equalizer || {}),
      },
      limiter: {
        ...this.audioSettings.limiter,
        ...(settings.limiter || {}),
      },
    };
    this.emit('settingsChanged', this.audioSettings);
  }

  /**
   * Start Auto DJ continuous broadcasting
   */
  async start(): Promise<boolean> {
    if (this.isRunning) return true;

    const allTracks = this.library.getAllTracks();
    if (allTracks.length === 0) {
      throw new Error('A biblioteca de áudio está vazia. Adicione músicas antes de iniciar o Auto DJ.');
    }

    this.isRunning = true;
    this.startedAt = new Date().toISOString();
    this.streamer.setBroadcasting(true);

    // Prepare queue
    this.ensureQueuePopulated();

    // Start playback of current/next track
    await this.playNextTrack();

    // Start 1-second interval ticker for real-time progress and UI sync
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 1000);

    this.emit('stateChanged', true);
    return true;
  }

  /**
   * Stop Auto DJ broadcasting
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.startedAt = null;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    this.killCurrentProcess();

    if (this.currentTrack) {
      this.history.unshift({
        track: this.currentTrack,
        playedAt: new Date().toISOString(),
      });
      if (this.history.length > 20) this.history.pop();
    }

    this.currentTrack = null;
    this.elapsedSeconds = 0;
    this.streamer.setBroadcasting(false);

    this.emit('stateChanged', false);
    this.emit('trackChanged', null);
  }

  /**
   * Skip to next track in queue with immediate FFmpeg switch
   */
  async skip(): Promise<void> {
    if (!this.isRunning) return;
    this.isTransitioning = true;
    this.killCurrentProcess();
    await this.playNextTrack();
    this.isTransitioning = false;
  }

  /**
   * Queue management methods
   */
  addToQueue(trackId: string, position: 'top' | 'bottom' = 'bottom'): AudioTrack | null {
    const track = this.library.getTrack(trackId);
    if (!track) return null;

    if (position === 'top') {
      this.upNext.unshift(track);
    } else {
      this.upNext.push(track);
    }

    this.updateNextTrackPreview();
    this.emit('queueChanged');
    return track;
  }

  removeFromQueue(index: number): boolean {
    if (index >= 0 && index < this.upNext.length) {
      this.upNext.splice(index, 1);
      this.updateNextTrackPreview();
      this.emit('queueChanged');
      return true;
    }
    return false;
  }

  reorderQueue(fromIndex: number, toIndex: number): boolean {
    if (
      fromIndex >= 0 &&
      fromIndex < this.upNext.length &&
      toIndex >= 0 &&
      toIndex < this.upNext.length
    ) {
      const [item] = this.upNext.splice(fromIndex, 1);
      this.upNext.splice(toIndex, 0, item);
      this.updateNextTrackPreview();
      this.emit('queueChanged');
      return true;
    }
    return false;
  }

  getNowPlaying(): NowPlayingData {
    const duration = this.currentTrack ? this.currentTrack.duration : 0;
    const progress = duration > 0 ? Math.min(100, (this.elapsedSeconds / duration) * 100) : 0;

    return {
      online: this.isRunning,
      streamUrl: '/api/radio/stream',
      currentTrack: this.currentTrack,
      elapsedSeconds: Math.floor(this.elapsedSeconds),
      durationSeconds: Math.floor(duration),
      progressPercent: Math.round(progress * 10) / 10,
      nextTrack: this.nextTrack,
      upNext: this.upNext.slice(0, 8),
      history: this.history.slice(0, 10),
      activeListeners: this.streamer.getActiveListenersCount(),
      peakListeners: this.streamer.getPeakListenersCount(),
      metadata: {
        title: this.currentTrack ? this.currentTrack.title : 'Rádio Offline',
        artist: this.currentTrack ? this.currentTrack.artist : 'RealAudio Auto DJ',
        album: this.currentTrack ? this.currentTrack.album : '',
        genre: this.currentTrack ? this.currentTrack.genre : 'Broadcast',
        streamName: 'RealAudio FM Live',
      },
    };
  }

  private ensureQueuePopulated(): void {
    const allTracks = this.library.getAllTracks();
    if (allTracks.length === 0) return;

    // Fill upNext if low
    while (this.upNext.length < 5) {
      // Pick random track from library that isn't the immediate last one
      const available = allTracks.filter(
        t => (!this.currentTrack || t.id !== this.currentTrack.id)
      );
      const pool = available.length > 0 ? available : allTracks;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      this.upNext.push(pick);
    }

    this.updateNextTrackPreview();
  }

  private updateNextTrackPreview(): void {
    if (this.upNext.length > 0) {
      this.nextTrack = this.upNext[0];
    } else {
      const all = this.library.getAllTracks();
      this.nextTrack = all.length > 0 ? all[0] : null;
    }
  }

  /**
   * Internal player loop: plays next track via FFmpeg
   */
  private async playNextTrack(): Promise<void> {
    if (!this.isRunning) return;

    // Move current track to history
    if (this.currentTrack) {
      this.history.unshift({
        track: this.currentTrack,
        playedAt: new Date().toISOString(),
      });
      if (this.history.length > 20) this.history.pop();
    }

    this.ensureQueuePopulated();

    // Dequeue next track
    this.currentTrack = this.upNext.shift() || null;
    if (!this.currentTrack) {
      const all = this.library.getAllTracks();
      if (all.length > 0) this.currentTrack = all[0];
    }

    this.updateNextTrackPreview();

    if (!this.currentTrack || !fs.existsSync(this.currentTrack.filepath)) {
      console.warn('Track file not found on disk:', this.currentTrack?.filepath);
      // Wait slightly and try next
      setTimeout(() => this.playNextTrack(), 1500);
      return;
    }

    this.elapsedSeconds = 0;
    this.trackStartTime = Date.now();
    this.emit('trackChanged', this.currentTrack);

    // Build FFmpeg process with real DSP filters and encoding
    this.spawnFFmpegStream(this.currentTrack);
  }

  /**
   * Spawns real FFmpeg instance to stream the selected track
   */
  private spawnFFmpegStream(track: AudioTrack): void {
    this.killCurrentProcess();

    const {
      bitrate,
      sampleRate,
      channels,
      crossfadeDuration,
      normalizeVolume,
      equalizer,
      limiter,
    } = this.audioSettings;

    // Construct real audio filter chain
    const filters: string[] = [];

    // 1. Equalizer filters if enabled
    if (equalizer.enabled) {
      if (equalizer.bass !== 0) {
        filters.push(`equalizer=f=100:t=q:w=1.0:g=${equalizer.bass}`);
      }
      if (equalizer.mid !== 0) {
        filters.push(`equalizer=f=1000:t=q:w=1.0:g=${equalizer.mid}`);
      }
      if (equalizer.treble !== 0) {
        filters.push(`equalizer=f=8000:t=q:w=1.0:g=${equalizer.treble}`);
      }
    }

    // 2. Normalization / Volume adjustment
    if (normalizeVolume) {
      filters.push(`loudnorm=I=${this.audioSettings.targetLufs || -16}:TP=-1.5:LRA=11`);
    }

    // 3. Fade in and Fade out if crossfade configured
    const fadeDuration = Math.max(0.5, Math.min(crossfadeDuration || 2, 6));
    if (fadeDuration > 0 && track.duration > fadeDuration * 2) {
      filters.push(`afade=t=in:ss=0:d=${fadeDuration}`);
      const fadeOutStart = Math.max(0, track.duration - fadeDuration);
      filters.push(`afade=t=out:st=${fadeOutStart}:d=${fadeDuration}`);
    }

    // 4. Limiter to prevent clipping
    if (limiter.enabled) {
      filters.push(`alimiter=limit=0.95:level=true`);
    }

    const filterArg = filters.length > 0 ? ['-af', filters.join(',')] : [];

    // FFmpeg arguments:
    // -re : Real-time 1x speed stream
    // -i : Real input audio file
    // -c:a libmp3lame : High-grade MP3 encoder
    // -b:a : Selected bitrate
    // -ar : Selected sample rate
    // -ac : Channels
    // -f mp3 : MP3 format
    // pipe:1 : Stdout stream
    const args: string[] = [
      '-re',
      '-i', track.filepath,
      ...filterArg,
      '-c:a', 'libmp3lame',
      '-b:a', `${bitrate}k`,
      '-ar', `${sampleRate}`,
      '-ac', `${channels}`,
      '-id3v2_version', '3',
      '-metadata', `title=${track.title}`,
      '-metadata', `artist=${track.artist}`,
      '-metadata', `album=${track.album}`,
      '-f', 'mp3',
      'pipe:1',
    ];

    try {
      const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      this.currentProcess = proc;

      // Pipe audio chunks to streamer
      proc.stdout.on('data', (chunk: Buffer) => {
        this.streamer.broadcastAudioChunk(chunk);
      });

      proc.stderr.on('data', (data: Buffer) => {
        // FFmpeg progress / debug info
      });

      proc.on('close', (code) => {
        if (this.currentProcess === proc) {
          this.currentProcess = null;
          if (this.isRunning && !this.isTransitioning) {
            this.playNextTrack();
          }
        }
      });

      proc.on('error', (err) => {
        console.error('FFmpeg process error:', err);
        if (this.isRunning && !this.isTransitioning) {
          setTimeout(() => this.playNextTrack(), 2000);
        }
      });
    } catch (err) {
      console.error('Failed to spawn FFmpeg:', err);
    }
  }

  private killCurrentProcess(): void {
    if (this.currentProcess) {
      try {
        this.currentProcess.kill('SIGTERM');
      } catch (e) {}
      this.currentProcess = null;
    }
  }

  private tick(): void {
    if (!this.isRunning || !this.currentTrack) return;

    this.elapsedSeconds += 1;
    this.emit('tick', {
      elapsed: this.elapsedSeconds,
      duration: this.currentTrack.duration,
    });
  }
}
