import {
  AudioSettings,
  AudioTrack,
  DiagnosticResult,
  IcecastConfig,
  NowPlayingData,
  ProgrammingShow,
  RadioStatus,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const api = {
  async getStatus(): Promise<RadioStatus> {
    const res = await fetch(`${API_BASE}/api/radio/status`);
    if (!res.ok) throw new Error('Falha ao obter status do servidor');
    return res.json();
  },

  async getNowPlaying(): Promise<NowPlayingData> {
    const res = await fetch(`${API_BASE}/api/radio/now-playing`);
    if (!res.ok) throw new Error('Falha ao obter dados da transmissão');
    return res.json();
  },

  async getProgramming(): Promise<ProgrammingShow[]> {
    const res = await fetch(`${API_BASE}/api/radio/programming`);
    if (!res.ok) throw new Error('Falha ao obter grade de programação');
    return res.json();
  },

  async getLibrary(): Promise<{ tracks: AudioTrack[]; stats: { count: number; totalBytes: number; totalDuration: number } }> {
    const res = await fetch(`${API_BASE}/api/radio/library`);
    if (!res.ok) throw new Error('Falha ao obter biblioteca de áudio');
    return res.json();
  },

  async uploadTrack(file: File): Promise<{ success: boolean; track: AudioTrack; message: string }> {
    const formData = new FormData();
    formData.append('audioFile', file);

    const res = await fetch(`${API_BASE}/api/radio/library/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro no upload' }));
      throw new Error(err.error || 'Falha no upload do arquivo');
    }
    return res.json();
  },

  async updateTrack(id: string, updates: Partial<AudioTrack>): Promise<{ success: boolean; track: AudioTrack }> {
    const res = await fetch(`${API_BASE}/api/radio/library/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Falha ao atualizar metadados');
    return res.json();
  },

  async deleteTrack(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/radio/library/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Falha ao excluir faixa');
    return res.json();
  },

  async startAutoDJ(): Promise<{ success: boolean; status: NowPlayingData }> {
    const res = await fetch(`${API_BASE}/api/radio/autodj/start`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro ao iniciar Auto DJ' }));
      throw new Error(err.error || 'Falha ao iniciar Auto DJ');
    }
    return res.json();
  },

  async stopAutoDJ(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/api/radio/autodj/stop`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Falha ao parar Auto DJ');
    return res.json();
  },

  async skipTrack(): Promise<{ success: boolean; status: NowPlayingData }> {
    const res = await fetch(`${API_BASE}/api/radio/autodj/skip`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Falha ao pular faixa');
    return res.json();
  },

  async addToQueue(trackId: string, position: 'top' | 'bottom' = 'bottom'): Promise<{ success: boolean; queue: AudioTrack[] }> {
    const res = await fetch(`${API_BASE}/api/radio/autodj/queue/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId, position }),
    });
    if (!res.ok) throw new Error('Falha ao adicionar à fila');
    return res.json();
  },

  async removeFromQueue(index: number): Promise<{ success: boolean; queue: AudioTrack[] }> {
    const res = await fetch(`${API_BASE}/api/radio/autodj/queue/${index}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Falha ao remover da fila');
    return res.json();
  },

  async reorderQueue(fromIndex: number, toIndex: number): Promise<{ success: boolean; queue: AudioTrack[] }> {
    const res = await fetch(`${API_BASE}/api/radio/autodj/queue/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromIndex, toIndex }),
    });
    if (!res.ok) throw new Error('Falha ao reordenar fila');
    return res.json();
  },

  async updateSettings(payload: {
    audio?: Partial<AudioSettings>;
    icecast?: Partial<IcecastConfig>;
  }): Promise<{ success: boolean; audioSettings: AudioSettings; icecastConfig: IcecastConfig }> {
    const res = await fetch(`${API_BASE}/api/radio/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Falha ao salvar configurações');
    return res.json();
  },

  async runDiagnostics(): Promise<DiagnosticResult> {
    const res = await fetch(`${API_BASE}/api/radio/diagnostics`);
    if (!res.ok) throw new Error('Falha ao executar diagnóstico');
    return res.json();
  },

  getStreamUrl(): string {
    return `${API_BASE}/api/radio/stream`;
  },

  getPreviewUrl(trackId: string): string {
    return `${API_BASE}/api/radio/library/${trackId}/preview`;
  },
};
