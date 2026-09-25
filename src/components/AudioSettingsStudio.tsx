import React, { useState } from 'react';
import { 
  Sliders, 
  Volume2, 
  Activity, 
  Disc, 
  Check, 
  Save, 
  RotateCcw, 
  Zap, 
  ShieldCheck,
  Radio,
  AudioWaveform as Waveform
} from 'lucide-react';
import { AudioSettings } from '../types';
import { api } from '../services/api';

interface AudioSettingsStudioProps {
  settings: AudioSettings;
  onRefresh: () => void;
}

export const AudioSettingsStudio: React.FC<AudioSettingsStudioProps> = ({
  settings,
  onRefresh,
}) => {
  const [form, setForm] = useState<AudioSettings>(settings);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await api.updateSettings({ audio: form });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Falha ao salvar configurações de áudio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setForm({
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
    });
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <Sliders className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-extrabold text-neutral-100 tracking-tight">
              Processador de Áudio & Encoder DSP (FFmpeg)
            </h2>
          </div>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Ajuste a taxa de compressão, amostragem, curvas de crossfade acústico e filtros de equalização/normalização EBU R128 aplicados em tempo real na transmissão.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Padrão</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-transform active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent animate-spin rounded-full" />
            ) : savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Aplicado!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar & Aplicar</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Encoding & Format Settings */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6 shadow-md">
          <h3 className="font-bold text-base text-neutral-100 flex items-center gap-2 pb-3 border-b border-neutral-800">
            <Radio className="w-4 h-4 text-amber-400" />
            <span>Formato & Taxa de Transmissão (Codec)</span>
          </h3>

          {/* Format */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300 block">Formato de Codificação</label>
            <div className="grid grid-cols-3 gap-3">
              {(['mp3', 'aac', 'ogg'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setForm({ ...form, format: fmt })}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold uppercase transition-all ${
                    form.format === fmt
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-inner'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800/60'
                  }`}
                >
                  {fmt === 'mp3' ? 'MP3 (Lame)' : fmt === 'aac' ? 'AAC / M4A' : 'OGG Vorbis'}
                </button>
              ))}
            </div>
          </div>

          {/* Bitrate */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-semibold text-neutral-300">Bitrate de Saída</label>
              <span className="text-xs font-mono text-amber-400 font-bold">{form.bitrate} kbps</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[64, 96, 128, 192, 256, 320].map((br) => (
                <button
                  key={br}
                  type="button"
                  onClick={() => setForm({ ...form, bitrate: br as any })}
                  className={`py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                    form.bitrate === br
                      ? 'bg-amber-500 text-neutral-950 border-amber-400'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  {br}k
                </button>
              ))}
            </div>
          </div>

          {/* Sample Rate & Channels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 block">Sample Rate</label>
              <select
                value={form.sampleRate}
                onChange={(e) => setForm({ ...form, sampleRate: parseInt(e.target.value, 10) as any })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-neutral-200 outline-none"
              >
                <option value={44100}>44.100 Hz (CD Audio Padrão)</option>
                <option value={48000}>48.000 Hz (Broadcast Studio)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 block">Canais</label>
              <select
                value={form.channels}
                onChange={(e) => setForm({ ...form, channels: parseInt(e.target.value, 10) as any })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-neutral-200 outline-none"
              >
                <option value={2}>Stereo (2 Canais)</option>
                <option value={1}>Mono (1 Canal - Baixo Consumo)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Crossfade & Volume Normalization */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6 shadow-md">
          <h3 className="font-bold text-base text-neutral-100 flex items-center gap-2 pb-3 border-b border-neutral-800">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Crossfade Real & Dinâmica (DSP)</span>
          </h3>

          {/* Crossfade Duration */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-neutral-300">Tempo de Crossfade (Transição entre faixas)</label>
              <span className="text-xs font-mono text-amber-400 font-bold">{form.crossfadeDuration}s</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={form.crossfadeDuration}
              onChange={(e) => setForm({ ...form, crossfadeDuration: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>0s (Corte Seco)</span>
              <span>3s (Padrão FM)</span>
              <span>10s (Lounge Fade)</span>
            </div>
          </div>

          {/* Volume Normalization */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-neutral-200 block">Normalização EBU R128 (loudnorm)</span>
                <span className="text-[11px] text-neutral-400">Mantém volume constante entre faixas sem distorção</span>
              </div>
              <input
                type="checkbox"
                checked={form.normalizeVolume}
                onChange={(e) => setForm({ ...form, normalizeVolume: e.target.checked })}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {form.normalizeVolume && (
              <div className="pt-2 flex items-center justify-between gap-4">
                <span className="text-xs text-neutral-400">Target Loudness:</span>
                <select
                  value={form.targetLufs}
                  onChange={(e) => setForm({ ...form, targetLufs: parseInt(e.target.value, 10) })}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs font-mono text-neutral-200"
                >
                  <option value={-14}>-14 LUFS (Web Streaming Alto)</option>
                  <option value={-16}>-16 LUFS (Padrão Spotify / FM)</option>
                  <option value={-18}>-18 LUFS (Broadcast Suave)</option>
                  <option value={-23}>-23 LUFS (EBU R128 Puro)</option>
                </select>
              </div>
            )}
          </div>

          {/* 3-Band Equalizer */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-200">Equalizador de 3 Bandas (FFmpeg Filter)</span>
              <input
                type="checkbox"
                checked={form.equalizer.enabled}
                onChange={(e) => setForm({
                  ...form,
                  equalizer: { ...form.equalizer, enabled: e.target.checked }
                })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {form.equalizer.enabled && (
              <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
                <div>
                  <span className="text-neutral-400 block mb-1 font-mono text-[11px]">Grave (100Hz)</span>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="1"
                    value={form.equalizer.bass}
                    onChange={(e) => setForm({
                      ...form,
                      equalizer: { ...form.equalizer, bass: parseInt(e.target.value, 10) }
                    })}
                    className="w-full accent-amber-500"
                  />
                  <span className="font-mono text-amber-400">{form.equalizer.bass > 0 ? `+${form.equalizer.bass}` : form.equalizer.bass} dB</span>
                </div>

                <div>
                  <span className="text-neutral-400 block mb-1 font-mono text-[11px]">Médio (1kHz)</span>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="1"
                    value={form.equalizer.mid}
                    onChange={(e) => setForm({
                      ...form,
                      equalizer: { ...form.equalizer, mid: parseInt(e.target.value, 10) }
                    })}
                    className="w-full accent-amber-500"
                  />
                  <span className="font-mono text-amber-400">{form.equalizer.mid > 0 ? `+${form.equalizer.mid}` : form.equalizer.mid} dB</span>
                </div>

                <div>
                  <span className="text-neutral-400 block mb-1 font-mono text-[11px]">Agudo (8kHz)</span>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="1"
                    value={form.equalizer.treble}
                    onChange={(e) => setForm({
                      ...form,
                      equalizer: { ...form.equalizer, treble: parseInt(e.target.value, 10) }
                    })}
                    className="w-full accent-amber-500"
                  />
                  <span className="font-mono text-amber-400">{form.equalizer.treble > 0 ? `+${form.equalizer.treble}` : form.equalizer.treble} dB</span>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
