import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  SkipForward, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Disc, 
  Layers, 
  Activity, 
  Sparkles, 
  Sliders, 
  CheckCircle,
  AlertCircle,
  Clock,
  Music2,
  Shuffle
} from 'lucide-react';
import { AudioTrack, NowPlayingData, RadioStatus } from '../types';
import { api } from '../services/api';

interface AutoDJConsoleProps {
  nowPlaying: NowPlayingData | null;
  status: RadioStatus | null;
  libraryTracks: AudioTrack[];
  onRefresh: () => void;
}

export const AutoDJConsole: React.FC<AutoDJConsoleProps> = ({
  nowPlaying,
  status,
  libraryTracks,
  onRefresh,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [searchLibrary, setSearchLibrary] = useState<string>('');
  const [selectedQueuePosition, setSelectedQueuePosition] = useState<'top' | 'bottom'>('bottom');

  const isOnline = status?.online ?? false;
  const currentTrack = nowPlaying?.currentTrack;
  const nextTrack = nowPlaying?.nextTrack;
  const upNext = nowPlaying?.upNext || [];
  const history = nowPlaying?.history || [];
  const crossfadeDuration = status?.audioSettings?.crossfadeDuration || 3;

  const handleStart = async () => {
    setLoadingAction('start');
    try {
      await api.startAutoDJ();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao iniciar Auto DJ');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStop = async () => {
    setLoadingAction('stop');
    try {
      await api.stopAutoDJ();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao parar Auto DJ');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSkip = async () => {
    setLoadingAction('skip');
    try {
      await api.skipTrack();
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao pular faixa');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAddToQueue = async (trackId: string) => {
    setLoadingAction(`add_${trackId}`);
    try {
      await api.addToQueue(trackId, selectedQueuePosition);
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar faixa à fila');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveFromQueue = async (index: number) => {
    setLoadingAction(`remove_${index}`);
    try {
      await api.removeFromQueue(index);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao remover da fila');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleMoveQueue = async (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= upNext.length) return;
    setLoadingAction(`move_${index}`);
    try {
      await api.reorderQueue(index, target);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao reordenar fila');
    } finally {
      setLoadingAction(null);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const filteredLibrary = libraryTracks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchLibrary.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchLibrary.toLowerCase()) ||
      t.genre.toLowerCase().includes(searchLibrary.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner with Studio Control Console */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className={`flex h-3.5 w-3.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
            <h2 className="text-2xl font-extrabold text-neutral-100 tracking-tight">
              Console do Auto DJ Real (FFmpeg Core)
            </h2>
          </div>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Transmissão contínua com decodificação real, aplicação de filtros DSP, normalização de volume EBU R128 e crossfade automatizado de faixas.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {isOnline ? (
            <>
              <button
                onClick={handleSkip}
                disabled={loadingAction !== null}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-amber-500/30 text-sm font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              >
                <SkipForward className="w-4 h-4 fill-current" />
                <span>PULAR FAIXA (SKIP)</span>
              </button>
              <button
                onClick={handleStop}
                disabled={loadingAction !== null}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-lg shadow-rose-950/40 transition-transform active:scale-95 disabled:opacity-50"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>PARAR AUTO DJ</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleStart}
              disabled={loadingAction !== null}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-sm font-extrabold shadow-lg shadow-amber-500/25 transition-transform active:scale-95 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>INICIAR TRANSMISSÃO CONTÍNUA</span>
            </button>
          )}
        </div>
      </div>

      {/* Crossfade & DSP Pipeline Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-mono">CROSSFADE ATIVO</p>
            <p className="text-sm font-bold text-neutral-100">{crossfadeDuration} segundos (Curva Triangular)</p>
          </div>
        </div>

        <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-mono">NORMALIZAÇÃO EBU R128</p>
            <p className="text-sm font-bold text-neutral-100">{status?.audioSettings?.normalizeVolume ? 'Ativada (-16 LUFS)' : 'Desativada'}</p>
          </div>
        </div>

        <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-mono">TOTAL NA FILA</p>
            <p className="text-sm font-bold text-neutral-100">{upNext.length} faixas agendadas</p>
          </div>
        </div>
      </div>

      {/* 4-TIER QUEUE DISPLAY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Tier 1 & Tier 2: Current Track + Next Track */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* CURRENT (TOCANDO AGORA) */}
          <div className="bg-neutral-900 border-2 border-amber-500/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-500 text-neutral-950 text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl font-mono tracking-widest">
              TOCANDO AGORA (CURRENT)
            </div>

            <div className="flex items-start gap-4 mt-2">
              <div className="w-16 h-16 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                {currentTrack?.coverArt ? (
                  <img src={currentTrack.coverArt} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Disc className={`w-8 h-8 text-amber-400 ${isOnline ? 'animate-spin' : ''}`} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold text-neutral-100 truncate">
                  {currentTrack ? currentTrack.title : (isOnline ? 'Transmitindo...' : 'Auto DJ Parado')}
                </h3>
                <p className="text-sm text-neutral-400 truncate">
                  {currentTrack ? `${currentTrack.artist} • ${currentTrack.album}` : 'Nenhuma faixa ativa'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-amber-300 border border-neutral-700">
                    {currentTrack?.genre || 'Broadcast'}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    {formatTime(nowPlaying?.elapsedSeconds || 0)} / {formatTime(nowPlaying?.durationSeconds || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Progress Bar */}
            <div className="mt-5 space-y-1.5">
              <div className="w-full h-2.5 rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${nowPlaying?.progressPercent || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* NEXT (PRÓXIMA) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-neutral-800 text-neutral-300 text-[10px] font-bold uppercase px-3 py-1 rounded-bl-xl font-mono tracking-widest">
              PRÓXIMA (NEXT)
            </div>

            <div className="flex items-start gap-4 mt-2">
              <div className="w-14 h-14 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 text-cyan-400">
                <Music2 className="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-lg font-bold text-neutral-200 truncate">
                  {nextTrack ? nextTrack.title : 'Aguardando próxima faixa...'}
                </h4>
                <p className="text-sm text-neutral-400 truncate">
                  {nextTrack ? `${nextTrack.artist} • ${nextTrack.album}` : 'O Auto DJ selecionará automaticamente'}
                </p>
                {nextTrack && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-cyan-300 border border-neutral-700">
                      {nextTrack.genre}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">
                      Duração: {formatTime(nextTrack.duration)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* HISTORY (HISTÓRICO) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h4 className="text-sm font-bold text-neutral-300 uppercase tracking-wider font-mono flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span>HISTÓRICO REAL DE TRANSMISSÃO</span>
              </h4>
              <span className="text-xs text-neutral-500 font-mono">Últimas faixas</span>
            </div>

            <div className="divide-y divide-neutral-800/60 max-h-56 overflow-y-auto pr-1">
              {history.length > 0 ? (
                history.map((item, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-200 truncate">{item.track.title}</p>
                      <p className="text-neutral-500 truncate">{item.track.artist}</p>
                    </div>
                    <span className="text-neutral-400 font-mono shrink-0">
                      {new Date(item.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500 py-4 text-center">Nenhum histórico registrado nesta sessão.</p>
              )}
            </div>
          </div>

        </div>

        {/* Tier 3: UP NEXT (EM SEGUIDA) Full Queue List */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>EM SEGUIDA (UP NEXT)</span>
              </h3>
              <p className="text-xs text-neutral-400">Gerenciamento da Fila de Transmissão</p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Faixa</span>
            </button>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 divide-y divide-neutral-800/80 shadow-md">
            {upNext.length > 0 ? (
              upNext.map((track, idx) => (
                <div key={track.id + idx} className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-neutral-800/40 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center font-mono text-xs font-bold text-neutral-500">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-neutral-200 truncate">{track.title}</p>
                      <p className="text-xs text-neutral-400 truncate">{track.artist} • {track.genre}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-mono text-neutral-400 mr-2">
                      {formatTime(track.duration)}
                    </span>
                    <button
                      onClick={() => handleMoveQueue(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 disabled:opacity-20"
                      title="Subir posição"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveQueue(idx, 'down')}
                      disabled={idx === upNext.length - 1}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 disabled:opacity-20"
                      title="Descer posição"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveFromQueue(idx)}
                      className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 ml-1"
                      title="Remover da fila"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-neutral-500 text-sm space-y-3">
                <Music2 className="w-10 h-10 mx-auto text-neutral-700" />
                <p>A fila está vazia. O Auto DJ sorteará músicas da biblioteca automaticamente.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add Track to Queue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-100">Adicionar Faixa à Fila de Transmissão</h3>
                <p className="text-xs text-neutral-400">Selecione uma faixa da biblioteca</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-100 text-sm px-2 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 border-b border-neutral-800 flex gap-3">
              <input
                type="text"
                placeholder="Buscar por título, artista ou gênero..."
                value={searchLibrary}
                onChange={(e) => setSearchLibrary(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-200 outline-none focus:border-amber-500"
              />
              <select
                value={selectedQueuePosition}
                onChange={(e) => setSelectedQueuePosition(e.target.value as 'top' | 'bottom')}
                className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-300 outline-none"
              >
                <option value="bottom">Fim da Fila</option>
                <option value="top">Topo da Fila (Tocar em Seguida)</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 divide-y divide-neutral-800">
              {filteredLibrary.length > 0 ? (
                filteredLibrary.map((track) => (
                  <div key={track.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-neutral-200 truncate">{track.title}</p>
                      <p className="text-xs text-neutral-400 truncate">{track.artist} • {track.genre}</p>
                    </div>
                    <button
                      onClick={() => handleAddToQueue(track.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shrink-0 transition-transform active:scale-95"
                    >
                      + Adicionar
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-500 py-8 text-center">Nenhuma faixa encontrada na biblioteca.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
