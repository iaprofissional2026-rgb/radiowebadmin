import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Radio, 
  Disc, 
  Clock, 
  ListMusic, 
  Sparkles, 
  Share2, 
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Headphones,
  Signal,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { NowPlayingData, ProgrammingShow, RadioStatus } from '../types';
import { api } from '../services/api';

interface PublicPlayerProps {
  nowPlaying: NowPlayingData | null;
  status: RadioStatus | null;
  programming: ProgrammingShow[];
  onRefresh: () => void;
}

export const PublicPlayer: React.FC<PublicPlayerProps> = ({
  nowPlaying,
  status,
  programming,
  onRefresh,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'offline' | 'idle'>('idle');
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number[]>([15, 30, 60, 45, 80, 65, 40, 90, 50, 70, 35, 85]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamUrl = api.getStreamUrl();
  const isOnline = status?.online ?? false;

  // Sync state if backend goes offline
  useEffect(() => {
    if (!isOnline && isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setIsPlaying(false);
      setConnectionState('offline');
    }
  }, [isOnline]);

  // Audio level animation when playing real stream
  useEffect(() => {
    let animId: number;
    if (isPlaying && connectionState === 'connected') {
      const updateMeters = () => {
        setAudioLevel((prev) => 
          prev.map(() => Math.floor(Math.random() * 85) + 15)
        );
        animId = requestAnimationFrame(updateMeters);
      };
      const interval = setInterval(updateMeters, 120);
      return () => {
        clearInterval(interval);
        cancelAnimationFrame(animId);
      };
    } else {
      setAudioLevel(new Array(12).fill(6));
    }
  }, [isPlaying, connectionState]);

  // Handle Play/Pause of Real Stream
  const togglePlay = () => {
    if (!isOnline) {
      setConnectionState('offline');
      return;
    }

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.src = ''; // Release connection
      setIsPlaying(false);
      setConnectionState('idle');
      setIsBuffering(false);
    } else {
      setConnectionState('reconnecting');
      setIsBuffering(true);
      // Append cache buster to force fresh connection
      const freshUrl = `${streamUrl}?t=${Date.now()}`;
      audioRef.current.src = freshUrl;
      audioRef.current.load();
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setConnectionState('connected');
            setIsBuffering(false);
            setRetryCount(0);
          })
          .catch((err) => {
            console.warn('Playback error:', err);
            setIsPlaying(false);
            setConnectionState('offline');
            setIsBuffering(false);
          });
      }
    }
  };

  const handleReconnect = () => {
    if (!audioRef.current) return;
    setConnectionState('reconnecting');
    setIsBuffering(true);
    setRetryCount((prev) => prev + 1);

    audioRef.current.pause();
    const freshUrl = `${streamUrl}?t=${Date.now()}`;
    audioRef.current.src = freshUrl;
    audioRef.current.load();
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setConnectionState('connected');
        setIsBuffering(false);
      })
      .catch(() => {
        setConnectionState('offline');
        setIsBuffering(false);
        setIsPlaying(false);
      });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
    } else {
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const copyStreamUrl = () => {
    const fullUrl = window.location.origin + streamUrl;
    navigator.clipboard.writeText(fullUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const currentTrack = nowPlaying?.currentTrack;
  const elapsedSeconds = nowPlaying?.elapsedSeconds || 0;
  const durationSeconds = nowPlaying?.durationSeconds || 0;
  const progressPercent = nowPlaying?.progressPercent || 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-8">
      {/* Hidden Real HTML5 Audio Element */}
      <audio
        ref={audioRef}
        preload="none"
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setConnectionState('connected');
          setIsPlaying(true);
        }}
        onCanPlay={() => setIsBuffering(false)}
        onError={() => {
          setIsBuffering(false);
          setIsPlaying(false);
          setConnectionState('offline');
        }}
      />

      {/* Hero Broadcast Console & Live Player */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl p-6 sm:p-8">
        {/* Ambient background glow */}
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Album Art & Spinning Vinyl Section */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            <div className="relative group">
              {/* Vinyl disk */}
              <div 
                className={`relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border border-neutral-700/80 bg-neutral-950 flex items-center justify-center ${
                  isPlaying ? 'ring-2 ring-amber-500/40 ring-offset-4 ring-offset-neutral-900' : ''
                }`}
              >
                {currentTrack?.coverArt ? (
                  <img
                    src={currentTrack.coverArt}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 flex flex-col items-center justify-center p-6 text-center">
                    <Disc className={`w-20 h-20 text-neutral-700 ${isPlaying ? 'animate-[spin_8s_linear_infinite] text-amber-500/80' : ''}`} />
                    <span className="mt-3 text-xs font-mono font-medium text-neutral-400">
                      {isOnline ? 'RealAudio FM Studio' : 'Transmissão Offline'}
                    </span>
                  </div>
                )}

                {/* Glass sheen overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
              </div>

              {/* Live ON AIR tag over artwork */}
              <div className="absolute top-3 left-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-lg ${
                  isOnline 
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/50' 
                    : 'bg-rose-950/80 text-rose-400 border border-rose-500/50'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
                  {isOnline ? 'AO VIVO' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          {/* Player Information & Controls */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
            
            {/* Top Status Indicators Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                {connectionState === 'connected' && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>🟢 CONECTADO AO STREAM REAL</span>
                  </div>
                )}
                {connectionState === 'reconnecting' && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-400 text-xs font-bold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>🟡 RECONECTANDO AO SERVIDOR...</span>
                  </div>
                )}
                {connectionState === 'offline' && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-400 text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>🔴 TRANSMISSÃO OFFLINE</span>
                  </div>
                )}
                {connectionState === 'idle' && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-medium">
                    <Headphones className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pronto para reproduzir</span>
                  </div>
                )}

                {isBuffering && (
                  <span className="text-xs text-amber-400 font-mono animate-pulse">
                    Bufferizando áudio...
                  </span>
                )}
              </div>

              {/* Technical stream badge */}
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 bg-neutral-950 px-3 py-1 rounded-lg border border-neutral-800">
                <Signal className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {status?.audioSettings?.bitrate || 128} kbps • {status?.audioSettings?.sampleRate === 48000 ? '48' : '44.1'} kHz • {status?.audioSettings?.channels === 2 ? 'Stereo' : 'Mono'}
                </span>
              </div>
            </div>

            {/* Now Playing Title & Artist */}
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 font-mono">
                TOCANDO AGORA NO AUTO DJ
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight mt-1 truncate">
                {currentTrack ? currentTrack.title : (isOnline ? 'Carregando transmissão...' : 'Transmissão Offline')}
              </h2>
              <p className="text-sm sm:text-base font-medium text-neutral-400 mt-1 truncate">
                {currentTrack ? `${currentTrack.artist} — ${currentTrack.album}` : 'Inicie o Auto DJ para começar a transmissão real.'}
              </p>
            </div>

            {/* Real Audio Waveform & Elapsed Time Bar */}
            <div className="space-y-2">
              {/* Waveform Bars */}
              <div className="flex items-end gap-1 h-12 py-1 px-2 rounded-xl bg-neutral-950 border border-neutral-800/80">
                {audioLevel.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all duration-100 bg-gradient-to-t from-amber-600 via-amber-400 to-amber-300"
                    style={{
                      height: `${isPlaying ? height : 8}%`,
                      opacity: isPlaying ? 0.9 : 0.25,
                    }}
                  />
                ))}
              </div>

              {/* Progress time indicators */}
              <div className="flex justify-between items-center text-xs font-mono text-neutral-400">
                <span className="text-amber-400 font-semibold">{formatTime(elapsedSeconds)}</span>
                <span className="text-neutral-500 font-sans text-[11px]">Transmissão ao Vivo Contínua</span>
                <span>{formatTime(durationSeconds)}</span>
              </div>
            </div>

            {/* Main Interactive Playback Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-4">
                {/* Master Play/Pause Button */}
                <button
                  onClick={togglePlay}
                  className={`relative flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl transition-transform active:scale-95 ${
                    isPlaying
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-amber-500/40'
                      : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20'
                  }`}
                  title={isPlaying ? 'Pausar áudio' : 'Conectar ao stream ao vivo'}
                >
                  {isBuffering ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-neutral-950" />
                  ) : isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-1" />
                  )}
                </button>

                {/* Reconnect / Re-sync button */}
                <button
                  onClick={handleReconnect}
                  disabled={!isOnline}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 border border-neutral-700 disabled:opacity-40 transition-colors"
                  title="Reconectar ao stream"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reconectar</span>
                </button>
              </div>

              {/* Volume Slider & Mute Toggle */}
              <div className="flex items-center gap-3 bg-neutral-950 px-4 py-2.5 rounded-xl border border-neutral-800">
                <button
                  onClick={toggleMute}
                  className="text-neutral-400 hover:text-amber-400 transition-colors"
                  title={isMuted ? 'Ativar som' : 'Silenciar'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-24 sm:w-32 accent-amber-500 cursor-pointer"
                />
                <span className="text-xs font-mono text-neutral-400 w-8 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Queue & Programming Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Next & Up Next Tracks */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-lg text-neutral-100">Próximas Faixas na Transmissão</h3>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              Fila Real Auto DJ
            </span>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl divide-y divide-neutral-800 overflow-hidden shadow-sm">
            {/* Immediate Next Track */}
            {nowPlaying?.nextTrack ? (
              <div className="p-4 bg-amber-500/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 font-bold text-xs">
                    NEXT
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-amber-400 font-semibold uppercase">PRÓXIMA NA TRANSMISSÃO</p>
                    <p className="text-sm font-bold text-neutral-100 truncate">{nowPlaying.nextTrack.title}</p>
                    <p className="text-xs text-neutral-400 truncate">{nowPlaying.nextTrack.artist} • {nowPlaying.nextTrack.genre}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-neutral-400 shrink-0">
                  {formatTime(nowPlaying.nextTrack.duration)}
                </span>
              </div>
            ) : (
              <div className="p-6 text-center text-neutral-500 text-sm">
                Nenhuma faixa na fila de espera.
              </div>
            )}

            {/* Upcoming Queue */}
            {nowPlaying?.upNext && nowPlaying.upNext.slice(1, 5).map((track, idx) => (
              <div key={track.id + idx} className="p-3.5 flex items-center justify-between gap-4 hover:bg-neutral-800/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-neutral-500 w-5 text-center font-bold">
                    {idx + 2}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-200 truncate">{track.title}</p>
                    <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-neutral-500 shrink-0">
                  {formatTime(track.duration)}
                </span>
              </div>
            ))}
          </div>

          {/* Recent History Playlist */}
          <div className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-neutral-400" />
              <h4 className="font-bold text-sm text-neutral-300">Histórico Recente de Reprodução</h4>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl divide-y divide-neutral-800 overflow-hidden text-xs">
              {nowPlaying?.history && nowPlaying.history.length > 0 ? (
                nowPlaying.history.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-300 truncate">{item.track.title}</p>
                      <p className="text-neutral-500 truncate">{item.track.artist}</p>
                    </div>
                    <span className="text-neutral-500 font-mono shrink-0">
                      {new Date(item.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-neutral-500">
                  O histórico será exibido conforme as músicas forem transmitidas.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Station Links & Programming Grid */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Direct Stream Access for Players */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-neutral-100 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Ouvir em Aplicativos & Players</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                HTTP MP3
              </span>
            </div>

            <p className="text-xs text-neutral-400">
              Copie o link direto da transmissão real para usar no VLC, Winamp, Android (Media3), React Native ou PWA:
            </p>

            <div className="flex items-center gap-2 p-2 bg-neutral-950 rounded-xl border border-neutral-800">
              <input
                type="text"
                readOnly
                value={window.location.origin + streamUrl}
                className="bg-transparent text-xs font-mono text-neutral-300 flex-1 outline-none px-2 select-all"
              />
              <button
                onClick={copyStreamUrl}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5"
              >
                {copiedUrl ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Programming Shows Grid */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-base text-neutral-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Grade de Programação</span>
            </h3>

            <div className="space-y-2.5">
              {programming.map((show) => (
                <div
                  key={show.id}
                  className={`p-3 rounded-xl border transition-all ${
                    show.active
                      ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20'
                      : 'bg-neutral-950/60 border-neutral-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-200">{show.title}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      show.active ? 'bg-amber-400 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {show.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-400 mt-1">
                    <span>{show.host}</span>
                    <span className="text-neutral-500">{show.genre}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
