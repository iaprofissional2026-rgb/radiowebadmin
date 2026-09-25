import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { AudioLibrary } from './server/library.js';
import { RadioStreamer } from './server/streamer.js';
import { AutoDJEngine } from './server/autodj.js';
import { DiagnosticsRunner } from './server/diagnostics.js';
import { AudioAnalyzer } from './server/audio-analyzer.js';
import { AudioSettings, IcecastConfig, RadioStatus } from './server/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const STORAGE_DIR = path.resolve(__dirname, 'storage/music');
const UPLOADS_DIR = path.resolve(__dirname, 'storage/uploads');

if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Initial Audio settings
let audioSettings: AudioSettings = {
  format: 'mp3',
  bitrate: 128,
  sampleRate: 44100,
  channels: 2,
  crossfadeDuration: 3,
  crossfadeCurve: 'tri',
  normalizeVolume: true,
  targetLufs: -16,
  equalizer: {
    enabled: false,
    bass: 0,
    mid: 0,
    treble: 0,
  },
  limiter: {
    enabled: true,
    threshold: -1.0,
  },
};

// Initial Icecast configuration from ENV if provided
let icecastConfig: IcecastConfig = {
  enabled: process.env.ICECAST_ENABLED === 'true' || Boolean(process.env.ICECAST_HOST),
  host: process.env.ICECAST_HOST || 'localhost',
  port: parseInt(process.env.ICECAST_PORT || '8000', 10),
  mount: process.env.ICECAST_MOUNT || '/radio.mp3',
  sourcePassword: process.env.ICECAST_SOURCE_PASSWORD || 'hackme',
  streamName: process.env.ICECAST_STREAM_NAME || 'RealAudio FM',
  streamDescription: process.env.ICECAST_STREAM_DESC || 'Live 24/7 Studio Stream',
  streamGenre: process.env.ICECAST_GENRE || 'Eclectic',
  isPublic: process.env.ICECAST_PUBLIC === 'true',
};

// Instantiate Subsystems
const library = new AudioLibrary(STORAGE_DIR);
const streamer = new RadioStreamer(icecastConfig);
const autodj = new AutoDJEngine(library, streamer, audioSettings);

// Multer Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    // Preserve safe name
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${cleanName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /\.(mp3|wav|flac|aac|ogg|m4a)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de áudio não suportado. Utilize MP3, WAV, FLAC, AAC ou OGG.'));
    }
  },
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Library
  await library.init();
  console.log(`[Library] Initialized with ${library.getAllTracks().length} tracks.`);

  // Auto-start Auto DJ on boot
  try {
    if (library.getAllTracks().length > 0) {
      await autodj.start();
      console.log('[AutoDJ] Auto-started successfully.');
    }
  } catch (e) {
    console.warn('[AutoDJ] Boot start deferred:', e);
  }

  // SSE (Server-Sent Events) clients registry
  const sseClients: Response[] = [];

  function broadcastSSE(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (let i = sseClients.length - 1; i >= 0; i--) {
      const client = sseClients[i];
      try {
        client.write(payload);
      } catch (err) {
        sseClients.splice(i, 1);
      }
    }
  }

  // Hook AutoDJ events to SSE
  autodj.on('trackChanged', (track) => {
    broadcastSSE('nowPlaying', autodj.getNowPlaying());
  });

  autodj.on('tick', (data) => {
    broadcastSSE('tick', data);
  });

  autodj.on('stateChanged', (online) => {
    broadcastSSE('state', { online });
  });

  autodj.on('queueChanged', () => {
    broadcastSSE('nowPlaying', autodj.getNowPlaying());
  });

  streamer.on('listenersChanged', (count) => {
    broadcastSSE('listeners', { count });
  });

  // ==========================================
  // API ROUTES
  // ==========================================

  // 1. Live MP3 Audio Stream endpoint
  app.get('/api/radio/stream', (req: Request, res: Response) => {
    if (!autodj.getIsRunning() || !streamer.getIsBroadcasting()) {
      res.status(503).json({
        error: 'TRANSMISSÃO OFFLINE',
        message: 'O Auto DJ não está ativo no momento. Inicie a transmissão no painel.',
        online: false,
      });
      return;
    }

    const clientIp = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Player';

    const nowPlaying = autodj.getNowPlaying();
    const currentSong = nowPlaying.currentTrack 
      ? `${nowPlaying.currentTrack.artist} - ${nowPlaying.currentTrack.title}`
      : 'RealAudio FM Live';

    // Write standard ICY headers for media players (VLC, Winamp, Android Media3, Web Audio)
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'icy-name': icecastConfig.streamName || 'RealAudio FM',
      'icy-genre': icecastConfig.streamGenre || 'Eclectic',
      'icy-br': audioSettings.bitrate.toString(),
      'icy-pub': icecastConfig.isPublic ? '1' : '0',
      'icy-description': icecastConfig.streamDescription || 'Live Broadcast',
      'icy-notice1': 'RealAudio Engine Powered by FFmpeg',
    });

    // Register real listener
    streamer.registerListener(res, clientIp, userAgent);
  });

  // 2. Radio Status
  app.get('/api/radio/status', async (req: Request, res: Response) => {
    const ffmpegCheck = await AudioAnalyzer.checkFFmpeg();
    const nowPlaying = autodj.getNowPlaying();

    const status: RadioStatus = {
      online: autodj.getIsRunning(),
      autodjActive: autodj.getIsRunning(),
      streamUrl: '/api/radio/stream',
      icecastConnected: icecastConfig.enabled,
      directStreamPort: PORT,
      activeListeners: streamer.getActiveListenersCount(),
      peakListeners: streamer.getPeakListenersCount(),
      totalBytesStreamed: streamer.getTotalBytesStreamed(),
      uptimeSeconds: autodj.getStartedAt() 
        ? Math.floor((Date.now() - new Date(autodj.getStartedAt()!).getTime()) / 1000) 
        : 0,
      startedAt: autodj.getStartedAt(),
      currentTrackElapsed: nowPlaying.elapsedSeconds,
      currentTrackDuration: nowPlaying.durationSeconds,
      audioSettings: autodj.getAudioSettings(),
      icecastConfig: {
        enabled: icecastConfig.enabled,
        host: icecastConfig.host,
        port: icecastConfig.port,
        mount: icecastConfig.mount,
        streamName: icecastConfig.streamName,
        isPublic: icecastConfig.isPublic,
      },
      ffmpeg: {
        installed: ffmpegCheck.installed,
        version: ffmpegCheck.version,
        encoders: ffmpegCheck.encoders,
        isEncoding: autodj.getIsRunning(),
      },
    };

    res.json(status);
  });

  // 3. Now Playing
  app.get('/api/radio/now-playing', (req: Request, res: Response) => {
    res.json(autodj.getNowPlaying());
  });

  // 4. Programming Grid
  app.get('/api/radio/programming', (req: Request, res: Response) => {
    const now = new Date();
    const programming = [
      {
        id: 'prog_1',
        title: 'Morning Acoustic & News',
        host: 'DJ Marcos Lima',
        time: '06:00 - 10:00',
        genre: 'Acoustic / News',
        days: 'Seg a Sex',
        active: now.getHours() >= 6 && now.getHours() < 10,
      },
      {
        id: 'prog_2',
        title: 'Midday Groove & Pop Hits',
        host: 'Auto DJ Mix Engine',
        time: '10:00 - 14:00',
        genre: 'Pop / Disco / Hits',
        days: 'Todos os dias',
        active: now.getHours() >= 10 && now.getHours() < 14,
      },
      {
        id: 'prog_3',
        title: 'Sunset Sessions Lounge',
        host: 'DJ Camila Rocha',
        time: '14:00 - 18:00',
        genre: 'Chillout / Lo-Fi',
        days: 'Todos os dias',
        active: now.getHours() >= 14 && now.getHours() < 18,
      },
      {
        id: 'prog_4',
        title: 'Studio Underground Beats',
        host: 'Live Studio Master',
        time: '18:00 - 00:00',
        genre: 'Electronic / Synthwave',
        days: 'Todos os dias',
        active: now.getHours() >= 18 || now.getHours() < 6,
      },
    ];
    res.json(programming);
  });

  // 5. Library Endpoints
  app.get('/api/radio/library', (req: Request, res: Response) => {
    const tracks = library.getAllTracks();
    const stats = library.getStorageStats();
    res.json({
      tracks,
      stats,
    });
  });

  app.post('/api/radio/library/upload', upload.single('audioFile'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Nenhum arquivo de áudio enviado.' });
        return;
      }

      const track = await library.addTrackFromFile(req.file.path, req.file.originalname);
      res.json({
        success: true,
        track,
        message: `Faixa "${track.title}" adicionada e analisada com sucesso!`,
      });
    } catch (err: any) {
      console.error('Upload processing error:', err);
      res.status(500).json({ error: err.message || 'Falha ao processar arquivo de áudio.' });
    }
  });

  app.delete('/api/radio/library/:id', (req: Request, res: Response) => {
    const success = library.deleteTrack(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Faixa não encontrada.' });
    }
  });

  app.patch('/api/radio/library/:id', (req: Request, res: Response) => {
    const updated = library.updateTrack(req.params.id, req.body);
    if (updated) {
      res.json({ success: true, track: updated });
    } else {
      res.status(404).json({ error: 'Faixa não encontrada.' });
    }
  });

  // Single track preview pre-listen
  app.get('/api/radio/library/:id/preview', (req: Request, res: Response) => {
    const track = library.getTrack(req.params.id);
    if (!track || !fs.existsSync(track.filepath)) {
      res.status(404).json({ error: 'Arquivo não encontrado' });
      return;
    }

    const stat = fs.statSync(track.filepath);
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(track.filepath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': 'audio/mpeg',
      });
      fs.createReadStream(track.filepath).pipe(res);
    }
  });

  // 6. Auto DJ Controls
  app.post('/api/radio/autodj/start', async (req: Request, res: Response) => {
    try {
      await autodj.start();
      res.json({ success: true, status: autodj.getNowPlaying() });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Falha ao iniciar Auto DJ' });
    }
  });

  app.post('/api/radio/autodj/stop', (req: Request, res: Response) => {
    autodj.stop();
    res.json({ success: true });
  });

  app.post('/api/radio/autodj/skip', async (req: Request, res: Response) => {
    try {
      await autodj.skip();
      res.json({ success: true, status: autodj.getNowPlaying() });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Falha ao pular faixa' });
    }
  });

  app.post('/api/radio/autodj/queue/add', (req: Request, res: Response) => {
    const { trackId, position } = req.body;
    const track = autodj.addToQueue(trackId, position);
    if (track) {
      res.json({ success: true, queue: autodj.getNowPlaying().upNext });
    } else {
      res.status(404).json({ error: 'Faixa não encontrada' });
    }
  });

  app.delete('/api/radio/autodj/queue/:index', (req: Request, res: Response) => {
    const index = parseInt(req.params.index, 10);
    const success = autodj.removeFromQueue(index);
    res.json({ success, queue: autodj.getNowPlaying().upNext });
  });

  app.post('/api/radio/autodj/queue/reorder', (req: Request, res: Response) => {
    const { fromIndex, toIndex } = req.body;
    const success = autodj.reorderQueue(fromIndex, toIndex);
    res.json({ success, queue: autodj.getNowPlaying().upNext });
  });

  // 7. Settings Update
  app.post('/api/radio/settings', (req: Request, res: Response) => {
    const { audio, icecast } = req.body;

    if (audio) {
      audioSettings = { ...audioSettings, ...audio };
      autodj.updateSettings(audioSettings);
    }

    if (icecast) {
      icecastConfig = { ...icecastConfig, ...icecast };
      streamer.updateIcecastConfig(icecastConfig);
    }

    res.json({
      success: true,
      audioSettings,
      icecastConfig,
    });
  });

  // 8. Diagnostics
  app.get('/api/radio/diagnostics', async (req: Request, res: Response) => {
    const report = await DiagnosticsRunner.runFullDiagnostic(
      library,
      autodj,
      streamer,
      icecastConfig
    );
    res.json(report);
  });

  // 9. SSE Events Stream
  app.get('/api/radio/events', (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);
    sseClients.push(res);

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // Production vs Dev mode frontend serving
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    // Dynamic import vite server for dev
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = http.createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[RealAudio FM] Server listening on http://0.0.0.0:${PORT}`);
    console.log(`[RealAudio FM] Live stream mountpoint: http://0.0.0.0:${PORT}/api/radio/stream`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Server Error]', err);
  process.exit(1);
});
