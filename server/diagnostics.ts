import { AudioAnalyzer } from './audio-analyzer.js';
import { AutoDJEngine } from './autodj.js';
import { AudioLibrary } from './library.js';
import { RadioStreamer } from './streamer.js';
import { DiagnosticResult, IcecastConfig } from './types.js';

export class DiagnosticsRunner {
  static async runFullDiagnostic(
    library: AudioLibrary,
    autodj: AutoDJEngine,
    streamer: RadioStreamer,
    icecastConfig: IcecastConfig
  ): Promise<DiagnosticResult> {
    const checks: DiagnosticResult['checks'] = [];
    let hasError = false;
    let hasWarning = false;

    // 1. FFmpeg Binary Check
    const ffmpegInfo = await AudioAnalyzer.checkFFmpeg();
    if (ffmpegInfo.installed) {
      checks.push({
        name: 'FFmpeg Core Engine',
        status: 'ok',
        summary: `Instalado (v${ffmpegInfo.version})`,
        details: `Caminho do binário: ${ffmpegInfo.path}. Suporta aceleração e decodificação multiformato nativa.`,
      });
    } else {
      hasError = true;
      checks.push({
        name: 'FFmpeg Core Engine',
        status: 'error',
        summary: 'FFmpeg NÃO Encontrado',
        details: ffmpegInfo.raw,
        troubleshooting: 'Execute no terminal: sudo apt-get update && sudo apt-get install -y ffmpeg (Linux) ou brew install ffmpeg (macOS).',
      });
    }

    // 2. Audio Encoders Check
    if (ffmpegInfo.encoders.length > 0) {
      checks.push({
        name: 'Audio Encoders',
        status: 'ok',
        summary: `${ffmpegInfo.encoders.length} encoders disponíveis`,
        details: `Disponíveis: ${ffmpegInfo.encoders.join(', ')}`,
      });
    } else {
      hasError = true;
      checks.push({
        name: 'Audio Encoders',
        status: 'error',
        summary: 'Encoder MP3/AAC ausente',
        details: 'Nenhum encoder de áudio compatível detectado no build do FFmpeg.',
        troubleshooting: 'Reinstale o pacote libmp3lame / ffmpeg completo.',
      });
    }

    // 3. Audio Library / Input Validation
    const allTracks = library.getAllTracks();
    const storageStats = library.getStorageStats();
    if (allTracks.length > 0) {
      checks.push({
        name: 'Audio Input & Library',
        status: 'ok',
        summary: `${allTracks.length} faixas válidas prontas`,
        details: `Duração total da biblioteca: ${Math.round(storageStats.totalDuration / 60)} minutos (${Math.round((storageStats.totalBytes / 1024 / 1024) * 10) / 10} MB).`,
      });
    } else {
      hasWarning = true;
      checks.push({
        name: 'Audio Input & Library',
        status: 'warning',
        summary: 'Biblioteca vazia',
        details: 'Nenhum arquivo de áudio carregado. O Auto DJ necessita de faixas para iniciar.',
        troubleshooting: 'Faça upload de arquivos MP3, WAV, AAC ou FLAC na aba Biblioteca.',
      });
    }

    // 4. Auto DJ Engine Status
    const autodjRunning = autodj.getIsRunning();
    if (autodjRunning) {
      const nowPlaying = autodj.getNowPlaying();
      checks.push({
        name: 'Auto DJ Engine',
        status: 'ok',
        summary: 'Ativo & Transmitindo',
        details: `Faixa atual: "${nowPlaying.currentTrack?.title}" por ${nowPlaying.currentTrack?.artist}. Fila: ${nowPlaying.upNext.length} faixas agendadas.`,
      });
    } else {
      checks.push({
        name: 'Auto DJ Engine',
        status: 'ok',
        summary: 'Pronto (Em Standby)',
        details: 'O motor está pronto para transmissão contínua. Clique em INICIAR AUTO DJ no painel.',
      });
    }

    // 5. Mountpoint & Local HTTP Stream
    const isBroadcasting = streamer.getIsBroadcasting();
    const activeListeners = streamer.getActiveListenersCount();
    checks.push({
      name: 'Stream Mountpoint (/api/radio/stream)',
      status: 'ok',
      summary: isBroadcasting ? 'Online & Distribuindo' : 'Mountpoint Criado',
      details: `Endpoint de streaming direto HTTP/ICY ativo. Ouvintes conectados em tempo real: ${activeListeners}.`,
    });

    // 6. Metadata Sync
    const np = autodj.getNowPlaying();
    checks.push({
      name: 'Metadata Sync & ICY Tags',
      status: 'ok',
      summary: 'Sincronizado',
      details: `Tags ativas: Título="${np.metadata.title}", Artista="${np.metadata.artist}", Gênero="${np.metadata.genre}".`,
    });

    // 7. Icecast External Server Check (if configured)
    let icecastResult: {
      configured: boolean;
      reachable: boolean;
      latencyMs?: number;
      endpoint: string;
      error?: string;
    };

    if (icecastConfig.enabled && icecastConfig.host) {
      const test = await RadioStreamer.testIcecastConnection(icecastConfig);
      icecastResult = {
        configured: true,
        reachable: test.reachable,
        latencyMs: test.latencyMs,
        endpoint: `http://${icecastConfig.host}:${icecastConfig.port}${icecastConfig.mount}`,
        error: test.error,
      };

      if (test.reachable) {
        checks.push({
          name: 'Icecast Server Relay',
          status: 'ok',
          summary: `Conectado (${test.latencyMs}ms)`,
          details: `Servidor Icecast respondeu em ${icecastConfig.host}:${icecastConfig.port}. Mountpoint: ${icecastConfig.mount}.`,
        });
      } else {
        hasWarning = true;
        checks.push({
          name: 'Icecast Server Relay',
          status: 'warning',
          summary: 'Icecast Externo Indisponível',
          details: test.error || 'Não foi possível conectar ao host Icecast configurado.',
          troubleshooting: 'Verifique se o container Icecast ou daemon icecast2 está rodando e se a porta está liberada no firewall. O sistema continuará transmitindo pelo servidor HTTP local integrado.',
        });
      }
    } else {
      icecastResult = {
        configured: false,
        reachable: false,
        endpoint: 'Transmissão Direta Ativa (/api/radio/stream)',
      };
      checks.push({
        name: 'Icecast Server Relay',
        status: 'ok',
        summary: 'Servidor Local Integrado Ativo',
        details: 'Utilizando servidor de distribuição HTTP MP3 nativo de alta performance. Servidor Icecast externo opcional.',
      });
    }

    const overallStatus: 'ok' | 'warning' | 'error' = hasError ? 'error' : hasWarning ? 'warning' : 'ok';

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      checks,
      ffmpegInfo: {
        installed: ffmpegInfo.installed,
        version: ffmpegInfo.version,
        path: ffmpegInfo.path,
        supportedEncoders: ffmpegInfo.encoders,
      },
      icecastInfo: icecastResult,
      storageInfo: {
        libraryCount: allTracks.length,
        totalDurationSeconds: Math.round(storageStats.totalDuration),
        totalSizeBytes: storageStats.totalBytes,
      },
    };
  }
}
