import { Response } from 'express';
import { EventEmitter } from 'events';
import http from 'http';
import https from 'https';
import { IcecastConfig } from './types.js';

export interface StreamListener {
  id: string;
  res: Response;
  ip: string;
  userAgent: string;
  connectedAt: Date;
  bytesSent: number;
}

export class RadioStreamer extends EventEmitter {
  private streamListeners: Map<string, StreamListener> = new Map();
  private peakListeners: number = 0;
  private totalBytesStreamed: number = 0;
  private isBroadcasting: boolean = false;
  private icecastConfig: IcecastConfig;
  private icecastClientReq: http.ClientRequest | null = null;
  private recentAudioBuffer: Buffer[] = []; // small rolling buffer for instant playback on connect
  private maxBufferSize: number = 32; // ~32KB buffer

  constructor(icecastConfig: IcecastConfig) {
    super();
    this.icecastConfig = icecastConfig;
  }

  setBroadcasting(active: boolean): void {
    this.isBroadcasting = active;
    if (!active) {
      this.recentAudioBuffer = [];
      // Notify and close listeners if stopped
      for (const [id, listener] of this.streamListeners.entries()) {
        try {
          listener.res.end();
        } catch (e) {}
      }
      this.streamListeners.clear();
      this.emit('listenersChanged', 0);
      this.closeIcecastRelay();
    }
  }

  getIsBroadcasting(): boolean {
    return this.isBroadcasting;
  }

  updateIcecastConfig(cfg: IcecastConfig): void {
    this.icecastConfig = cfg;
    if (this.isBroadcasting && cfg.enabled) {
      this.connectIcecastRelay();
    } else if (!cfg.enabled) {
      this.closeIcecastRelay();
    }
  }

  /**
   * Registers a real listener HTTP connection for the live MP3 audio stream
   */
  registerListener(res: Response, ip: string, userAgent: string): string {
    const id = 'listener_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const listener: StreamListener = {
      id,
      res,
      ip,
      userAgent,
      connectedAt: new Date(),
      bytesSent: 0,
    };

    this.streamListeners.set(id, listener);
    if (this.streamListeners.size > this.peakListeners) {
      this.peakListeners = this.streamListeners.size;
    }

    // Send recent audio chunk so audio starts playing without waiting for next tick
    for (const chunk of this.recentAudioBuffer) {
      try {
        res.write(chunk);
        listener.bytesSent += chunk.length;
        this.totalBytesStreamed += chunk.length;
      } catch (e) {
        break;
      }
    }

    this.emit('listenersChanged', this.streamListeners.size);

    res.on('close', () => {
      this.streamListeners.delete(id);
      this.emit('listenersChanged', this.streamListeners.size);
    });

    res.on('error', () => {
      this.streamListeners.delete(id);
      this.emit('listenersChanged', this.streamListeners.size);
    });

    return id;
  }

  /**
   * Push real audio chunk from FFmpeg to all connected web listeners and Icecast
   */
  broadcastAudioChunk(chunk: Buffer): void {
    if (!this.isBroadcasting) return;

    // Maintain recent buffer
    this.recentAudioBuffer.push(chunk);
    if (this.recentAudioBuffer.length > this.maxBufferSize) {
      this.recentAudioBuffer.shift();
    }

    // Send to web listeners
    for (const [id, listener] of this.streamListeners.entries()) {
      try {
        if (!listener.res.writableEnded) {
          listener.res.write(chunk);
          listener.bytesSent += chunk.length;
          this.totalBytesStreamed += chunk.length;
        } else {
          this.streamListeners.delete(id);
        }
      } catch (err) {
        this.streamListeners.delete(id);
      }
    }

    // Send to Icecast relay if connected
    if (this.icecastClientReq && !this.icecastClientReq.destroyed) {
      try {
        this.icecastClientReq.write(chunk);
      } catch (e) {
        console.warn('Error writing to Icecast relay:', e);
      }
    }
  }

  getActiveListenersCount(): number {
    return this.streamListeners.size;
  }

  getPeakListenersCount(): number {
    return this.peakListeners;
  }

  getTotalBytesStreamed(): number {
    return this.totalBytesStreamed;
  }

  /**
   * Connect real source stream to external Icecast server via HTTP SOURCE/PUT method
   */
  connectIcecastRelay(): void {
    if (!this.icecastConfig.enabled || !this.icecastConfig.host) {
      return;
    }

    this.closeIcecastRelay();

    try {
      const auth = 'source:' + this.icecastConfig.sourcePassword;
      const authHeader = 'Basic ' + Buffer.from(auth).toString('base64');

      const options: http.RequestOptions = {
        hostname: this.icecastConfig.host,
        port: this.icecastConfig.port || 8000,
        path: this.icecastConfig.mount.startsWith('/') ? this.icecastConfig.mount : '/' + this.icecastConfig.mount,
        method: 'SOURCE', // Or PUT for newer Icecast
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'audio/mpeg',
          'ice-name': this.icecastConfig.streamName || 'RealAudio FM',
          'ice-description': this.icecastConfig.streamDescription || 'Live Broadcast',
          'ice-genre': this.icecastConfig.streamGenre || 'Eclectic',
          'ice-public': this.icecastConfig.isPublic ? '1' : '0',
          'User-Agent': 'RealAudio-AutoDJ/1.0',
        },
      };

      const req = http.request(options, (res) => {
        console.log(`[Icecast Relay] Response status: ${res.statusCode}`);
        this.emit('icecastStatus', res.statusCode === 200);
      });

      req.on('error', (err) => {
        console.warn(`[Icecast Relay] Connection failed: ${err.message}`);
        this.emit('icecastStatus', false, err.message);
      });

      this.icecastClientReq = req;
    } catch (e) {
      console.error('[Icecast Relay] Init error:', e);
    }
  }

  closeIcecastRelay(): void {
    if (this.icecastClientReq) {
      try {
        this.icecastClientReq.end();
      } catch (e) {}
      this.icecastClientReq = null;
    }
  }

  /**
   * Diagnostic test of Icecast connectivity
   */
  static async testIcecastConnection(config: IcecastConfig): Promise<{
    reachable: boolean;
    latencyMs: number;
    statusCode?: number;
    error?: string;
  }> {
    if (!config.host || !config.port) {
      return {
        reachable: false,
        latencyMs: 0,
        error: 'Host e porta não configurados',
      };
    }

    const startTime = Date.now();
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          reachable: false,
          latencyMs: Date.now() - startTime,
          error: 'Timeout ao tentar conectar ao servidor Icecast (5000ms)',
        });
      }, 5000);

      try {
        const req = http.get(
          {
            hostname: config.host,
            port: config.port,
            path: '/status-json.xsl', // Standard icecast status endpoint
            timeout: 4500,
          },
          (res) => {
            clearTimeout(timeout);
            const latency = Date.now() - startTime;
            resolve({
              reachable: res.statusCode !== undefined && res.statusCode < 500,
              latencyMs: latency,
              statusCode: res.statusCode,
            });
          }
        );

        req.on('error', (err) => {
          clearTimeout(timeout);
          resolve({
            reachable: false,
            latencyMs: Date.now() - startTime,
            error: `Erro de conexão: ${err.message}`,
          });
        });
      } catch (err: any) {
        clearTimeout(timeout);
        resolve({
          reachable: false,
          latencyMs: 0,
          error: err.message || 'Erro de rede',
        });
      }
    });
  }
}
