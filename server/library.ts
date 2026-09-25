import fs from 'fs';
import path from 'path';
import { AudioTrack } from './types.js';
import { AudioAnalyzer } from './audio-analyzer.js';

export class AudioLibrary {
  private tracks: Map<string, AudioTrack> = new Map();
  private storageDir: string;
  private metadataDbPath: string;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
    this.metadataDbPath = path.join(storageDir, 'library.json');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async init(): Promise<void> {
    // Load existing metadata database if present
    if (fs.existsSync(this.metadataDbPath)) {
      try {
        const raw = fs.readFileSync(this.metadataDbPath, 'utf-8');
        const list: AudioTrack[] = JSON.parse(raw);
        for (const track of list) {
          if (fs.existsSync(track.filepath)) {
            this.tracks.set(track.id, track);
          }
        }
      } catch (err) {
        console.error('Error loading library db:', err);
      }
    }

    // Scan audio files on disk
    const files = fs.readdirSync(this.storageDir);
    const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (audioExtensions.includes(ext)) {
        const fullPath = path.join(this.storageDir, file);
        // Check if already in map
        const existing = Array.from(this.tracks.values()).find(t => t.filepath === fullPath);
        if (!existing) {
          try {
            const track = await AudioAnalyzer.analyzeAudioFile(fullPath, file);
            this.tracks.set(track.id, track);
          } catch (e) {
            console.error('Error analyzing file:', file, e);
          }
        }
      }
    }

    // If library is empty, generate 4 real broadcast audio tracks with FFmpeg so AutoDJ has real music immediately
    if (this.tracks.size === 0) {
      console.log('Generating initial real broadcast tracks with FFmpeg...');
      await this.generateSampleTracks();
    }

    this.saveDb();
  }

  private async generateSampleTracks(): Promise<void> {
    const samples = [
      {
        filename: 'real_midnight_groove.mp3',
        title: 'Midnight Groove (Live Broadcast Mix)',
        artist: 'Studio Resonance',
        genre: 'Nu-Disco / Funk',
        type: 'groove' as const,
      },
      {
        filename: 'real_neon_pulse.mp3',
        title: 'Neon Horizon (Synthwave Edition)',
        artist: 'Aether Wave',
        genre: 'Synthwave / Retro',
        type: 'electronic' as const,
      },
      {
        filename: 'real_chill_sunset.mp3',
        title: 'Sunset Coastline (Acoustic Lounge)',
        artist: 'Horizon Collective',
        genre: 'Chillout / Lo-Fi',
        type: 'chill' as const,
      },
      {
        filename: 'real_station_id_jingle.mp3',
        title: 'RealAudio FM - Station Identification & Chimes',
        artist: 'RealAudio ID',
        genre: 'Jingle / Sweeper',
        type: 'jingle' as const,
      },
    ];

    for (const s of samples) {
      const targetPath = path.join(this.storageDir, s.filename);
      await AudioAnalyzer.generateRealBroadcastTrack(targetPath, s.title, s.artist, s.genre, s.type);
      if (fs.existsSync(targetPath)) {
        const track = await AudioAnalyzer.analyzeAudioFile(targetPath, s.filename);
        track.title = s.title;
        track.artist = s.artist;
        track.genre = s.genre;
        this.tracks.set(track.id, track);
      }
    }
  }

  async addTrackFromFile(filePath: string, originalFilename: string): Promise<AudioTrack> {
    const track = await AudioAnalyzer.analyzeAudioFile(filePath, originalFilename);
    this.tracks.set(track.id, track);
    this.saveDb();
    return track;
  }

  getTrack(id: string): AudioTrack | undefined {
    return this.tracks.get(id);
  }

  getAllTracks(): AudioTrack[] {
    return Array.from(this.tracks.values()).sort((a, b) => 
      new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
    );
  }

  updateTrack(id: string, updates: Partial<AudioTrack>): AudioTrack | null {
    const track = this.tracks.get(id);
    if (!track) return null;

    const updated: AudioTrack = {
      ...track,
      ...updates,
      id: track.id, // Immutable
      filepath: track.filepath,
    };

    this.tracks.set(id, updated);
    this.saveDb();
    return updated;
  }

  deleteTrack(id: string): boolean {
    const track = this.tracks.get(id);
    if (!track) return false;

    try {
      if (fs.existsSync(track.filepath)) {
        fs.unlinkSync(track.filepath);
      }
    } catch (e) {
      console.warn('Could not delete physical file:', track.filepath, e);
    }

    this.tracks.delete(id);
    this.saveDb();
    return true;
  }

  getStorageStats() {
    let totalBytes = 0;
    let totalDuration = 0;
    for (const t of this.tracks.values()) {
      totalBytes += t.filesize;
      totalDuration += t.duration;
    }
    return {
      count: this.tracks.size,
      totalBytes,
      totalDuration,
    };
  }

  private saveDb(): void {
    try {
      const list = Array.from(this.tracks.values());
      fs.writeFileSync(this.metadataDbPath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save library DB:', err);
    }
  }
}
