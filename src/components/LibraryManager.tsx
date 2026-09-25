import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Trash2, 
  Edit3, 
  Play, 
  Pause, 
  Plus, 
  Disc, 
  FileAudio, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Clock, 
  Activity, 
  Search,
  HardDrive
} from 'lucide-react';
import { AudioTrack } from '../types';
import { api } from '../services/api';

interface LibraryManagerProps {
  tracks: AudioTrack[];
  stats: { count: number; totalBytes: number; totalDuration: number };
  onRefresh: () => void;
}

export const LibraryManager: React.FC<LibraryManagerProps> = ({
  tracks,
  stats,
  onRefresh,
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  
  // Pre-listening state
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Edit Modal State
  const [editingTrack, setEditingTrack] = useState<AudioTrack | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; artist: string; album: string; genre: string }>({
    title: '',
    artist: '',
    album: '',
    genre: '',
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle Drag & Drop / File Upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadMessage(null);
    setUploadError(null);

    let successCount = 0;
    let errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await api.uploadTrack(file);
        successCount++;
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    setIsUploading(false);
    if (successCount > 0) {
      setUploadMessage(`${successCount} arquivo(s) analisado(s) e adicionado(s) com sucesso!`);
      onRefresh();
    }
    if (errors.length > 0) {
      setUploadError(errors.join(' | '));
    }
  };

  const handlePreviewToggle = (track: AudioTrack) => {
    if (!previewAudioRef.current) return;

    if (previewTrackId === track.id && isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      setPreviewTrackId(track.id);
      previewAudioRef.current.src = api.getPreviewUrl(track.id);
      previewAudioRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  const handleDelete = async (trackId: string, title: string) => {
    if (!confirm(`Deseja realmente remover "${title}" da biblioteca?`)) return;
    try {
      await api.deleteTrack(trackId);
      if (previewTrackId === trackId && previewAudioRef.current) {
        previewAudioRef.current.pause();
        setIsPreviewPlaying(false);
        setPreviewTrackId(null);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir faixa');
    }
  };

  const handleOpenEdit = (track: AudioTrack) => {
    setEditingTrack(track);
    setEditForm({
      title: track.title,
      artist: track.artist,
      album: track.album,
      genre: track.genre,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTrack) return;
    try {
      await api.updateTrack(editingTrack.id, editForm);
      setEditingTrack(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações');
    }
  };

  const handleAddToQueue = async (trackId: string) => {
    try {
      await api.addToQueue(trackId, 'bottom');
      alert('Faixa adicionada à fila do Auto DJ!');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao enfileirar');
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const genres = Array.from(new Set(tracks.map((t) => t.genre || 'Geral')));

  const filteredTracks = tracks.filter((t) => {
    const matchQuery =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.album.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGenre = genreFilter === 'all' || t.genre === genreFilter;
    return matchQuery && matchGenre;
  });

  return (
    <div className="space-y-6">
      {/* Hidden Preview Audio */}
      <audio
        ref={previewAudioRef}
        onEnded={() => setIsPreviewPlaying(false)}
        onError={() => setIsPreviewPlaying(false)}
      />

      {/* Header & Storage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-mono">TOTAL DE FAIXAS</p>
            <p className="text-xl font-extrabold text-neutral-100">{stats.count} arquivos</p>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-mono">TEMPO TOTAL DE ÁUDIO</p>
            <p className="text-xl font-extrabold text-neutral-100">{Math.round(stats.totalDuration / 60)} minutos</p>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-neutral-400 font-mono">ESPAÇO UTILIZADO</p>
            <p className="text-xl font-extrabold text-neutral-100">{formatBytes(stats.totalBytes)}</p>
          </div>
        </div>
      </div>

      {/* Drag and Drop Audio Ingestion Box */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
          isUploading
            ? 'border-amber-500 bg-amber-500/10 animate-pulse'
            : 'border-neutral-700 bg-neutral-900/60 hover:border-amber-500/60 hover:bg-neutral-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.flac,.aac,.ogg,.m4a"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Upload className={`w-7 h-7 ${isUploading ? 'animate-bounce' : ''}`} />
          </div>
          <h3 className="text-lg font-extrabold text-neutral-200">
            {isUploading ? 'Analisando e Ingerindo Áudio com FFmpeg...' : 'Upload de Arquivos de Áudio Reais'}
          </h3>
          <p className="text-xs text-neutral-400">
            Arraste arquivos <strong>MP3, WAV, FLAC, AAC ou OGG</strong> aqui ou clique para selecionar. O sistema extrai metadados, taxa de amostragem, bitrate e constrói a waveform automaticamente.
          </p>
        </div>
      </div>

      {/* Messages */}
      {uploadMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{uploadMessage}</span>
        </div>
      )}
      {uploadError && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por título, artista ou álbum..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-200 outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-neutral-400">Gênero:</span>
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-300 outline-none"
          >
            <option value="all">Todos os gêneros ({tracks.length})</option>
            {genres.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audio Tracks Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 uppercase tracking-wider font-mono border-b border-neutral-800">
              <tr>
                <th className="p-4 w-12 text-center">Pré-escuta</th>
                <th className="p-4">Título & Artista</th>
                <th className="p-4">Gênero</th>
                <th className="p-4">Duração</th>
                <th className="p-4">Formato / Bitrate</th>
                <th className="p-4">Waveform</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredTracks.length > 0 ? (
                filteredTracks.map((track) => {
                  const isThisPreview = previewTrackId === track.id && isPreviewPlaying;
                  return (
                    <tr key={track.id} className="hover:bg-neutral-800/30 transition-colors">
                      {/* Play Preview button */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handlePreviewToggle(track)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            isThisPreview
                              ? 'bg-amber-500 text-neutral-950 font-bold'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          }`}
                          title="Pré-escuta local"
                        >
                          {isThisPreview ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                      </td>

                      {/* Title & Artist */}
                      <td className="p-4 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 overflow-hidden">
                            {track.coverArt ? (
                              <img src={track.coverArt} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileAudio className="w-5 h-5 text-neutral-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-neutral-200 truncate">{track.title}</p>
                            <p className="text-neutral-400 truncate">{track.artist}</p>
                          </div>
                        </div>
                      </td>

                      {/* Genre */}
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700 text-[11px] font-medium">
                          {track.genre || 'Geral'}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="p-4 font-mono text-neutral-300">
                        {formatDuration(track.duration)}
                      </td>

                      {/* Technical Specs */}
                      <td className="p-4 font-mono text-neutral-400">
                        <span>{track.codec?.toUpperCase()} • {track.bitrate} kbps</span>
                        <div className="text-[10px] text-neutral-500">
                          {track.sampleRate} Hz • {track.channels === 2 ? 'Stereo' : 'Mono'}
                        </div>
                      </td>

                      {/* Waveform Thumbnail */}
                      <td className="p-4">
                        <div className="flex items-end gap-0.5 h-6 w-24">
                          {(track.waveform || new Array(24).fill(0.3)).slice(0, 24).map((val, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-amber-500/60 rounded-xs"
                              style={{ height: `${Math.max(10, val * 100)}%` }}
                            />
                          ))}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAddToQueue(track.id)}
                            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 border border-neutral-700 transition-colors"
                            title="Adicionar à fila do Auto DJ"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(track)}
                            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 border border-neutral-700 transition-colors"
                            title="Editar metadados"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(track.id, track.title)}
                            className="p-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition-colors"
                            title="Excluir faixa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-neutral-500">
                    Nenhuma faixa encontrada na biblioteca.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Metadata Modal */}
      {editingTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-neutral-100">Editar Metadados da Faixa</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 font-semibold block mb-1">Título da Música</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 font-semibold block mb-1">Artista / Banda</label>
                <input
                  type="text"
                  value={editForm.artist}
                  onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 font-semibold block mb-1">Álbum</label>
                <input
                  type="text"
                  value={editForm.album}
                  onChange={(e) => setEditForm({ ...editForm, album: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 font-semibold block mb-1">Gênero Musical</label>
                <input
                  type="text"
                  value={editForm.genre}
                  onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                onClick={() => setEditingTrack(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold hover:bg-neutral-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
