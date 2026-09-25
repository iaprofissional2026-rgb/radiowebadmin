import React, { useState } from 'react';
import { 
  Server, 
  Key, 
  Globe, 
  CheckCircle, 
  AlertTriangle, 
  Save, 
  ExternalLink, 
  RefreshCw,
  Radio,
  Copy,
  Check
} from 'lucide-react';
import { IcecastConfig, RadioStatus } from '../types';
import { api } from '../services/api';

interface IcecastConfigPanelProps {
  status: RadioStatus | null;
  onRefresh: () => void;
}

export const IcecastConfigPanel: React.FC<IcecastConfigPanelProps> = ({
  status,
  onRefresh,
}) => {
  const initialCfg = status?.icecastConfig || {
    enabled: false,
    host: 'localhost',
    port: 8000,
    mount: '/radio.mp3',
    streamName: 'RealAudio FM',
    isPublic: false,
  };

  const [form, setForm] = useState<IcecastConfig>({
    enabled: initialCfg.enabled,
    host: initialCfg.host || 'localhost',
    port: initialCfg.port || 8000,
    mount: initialCfg.mount || '/radio.mp3',
    sourcePassword: '',
    streamName: initialCfg.streamName || 'RealAudio FM',
    streamDescription: 'Live Studio Broadcast',
    streamGenre: 'Eclectic',
    isPublic: initialCfg.isPublic || false,
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ reachable: boolean; latencyMs?: number; message?: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateSettings({ icecast: form });
      alert('Configurações de servidor Icecast atualizadas com sucesso!');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Falha ao salvar configurações do Icecast');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestIcecast = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const diag = await api.runDiagnostics();
      setTestResult({
        reachable: diag.icecastInfo.reachable,
        latencyMs: diag.icecastInfo.latencyMs,
        message: diag.icecastInfo.error || (diag.icecastInfo.reachable ? 'Servidor Icecast respondeu com sucesso!' : 'Servidor Icecast não respondeu.'),
      });
    } catch (err: any) {
      setTestResult({
        reachable: false,
        message: err.message || 'Falha ao testar conexão com Icecast',
      });
    } finally {
      setTesting(false);
    }
  };

  const directStreamUrl = window.location.origin + '/api/radio/stream';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <Server className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-extrabold text-neutral-100 tracking-tight">
              Servidor de Streaming & Distribuição Icecast 2
            </h2>
          </div>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Conecte o motor FFmpeg a um servidor Icecast 2 externo ou utilize o endpoint de streaming nativo integrado de alto desempenho.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-transform active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Salvando...' : 'Salvar Configurações'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Icecast Configuration Form */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="font-bold text-base text-neutral-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" />
              <span>Parâmetros de Conexão Icecast</span>
            </h3>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-neutral-300 font-semibold">Habilitar Relay Icecast:</span>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400">Host do Servidor Icecast</label>
              <input
                type="text"
                value={form.host}
                placeholder="Ex: localhost ou radio.meudominio.com"
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-100 outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400">Porta (Port)</label>
              <input
                type="number"
                value={form.port}
                placeholder="8000"
                onChange={(e) => setForm({ ...form, port: parseInt(e.target.value, 10) || 8000 })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400">Mountpoint (Ponto de Montagem)</label>
              <input
                type="text"
                value={form.mount}
                placeholder="/radio.mp3"
                onChange={(e) => setForm({ ...form, mount: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-100 outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400">Senha Source (Source Password)</label>
              <input
                type="password"
                value={form.sourcePassword}
                placeholder="hackme"
                onChange={(e) => setForm({ ...form, sourcePassword: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400">Nome da Emissora (Stream Name)</label>
              <input
                type="text"
                value={form.streamName}
                placeholder="RealAudio FM"
                onChange={(e) => setForm({ ...form, streamName: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-400">Gênero Principal</label>
              <input
                type="text"
                value={form.streamGenre}
                placeholder="Eclectic / Pop / Hits"
                onChange={(e) => setForm({ ...form, streamGenre: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestIcecast}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 border border-neutral-700 transition-colors disabled:opacity-50"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-amber-400" />}
              <span>Testar Conexão com Servidor</span>
            </button>

            {testResult && (
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                testResult.reachable ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {testResult.reachable ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{testResult.reachable ? `Online (${testResult.latencyMs}ms)` : testResult.message}</span>
              </span>
            )}
          </div>
        </div>

        {/* Real Endpoints & Architecture Explanations */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Integrated Native Endpoint */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Endpoint de Transmissão Direta (HTTP MP3)</span>
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                ATIVO
              </span>
            </div>

            <p className="text-xs text-neutral-400">
              O sistema possui um servidor de streaming HTTP/ICY nativo alimentado pelo FFmpeg. Qualquer player HTML5, app Android ou reprodutor pode se conectar a este endpoint:
            </p>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
              <p className="text-[11px] font-mono text-neutral-300 break-all select-all">
                {directStreamUrl}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(directStreamUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-semibold text-amber-300 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar URL'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Icecast Architecture Diagram Box */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-3 shadow-md text-xs text-neutral-400">
            <h4 className="font-bold text-neutral-200">Como Funciona a Transmissão Real</h4>
            <ul className="space-y-2 list-disc list-inside text-neutral-400">
              <li>O <strong>Auto DJ</strong> seleciona os arquivos físicos de áudio na biblioteca.</li>
              <li>O <strong>FFmpeg</strong> decodifica, aplica crossfade, equalização e codifica para MP3 em tempo real.</li>
              <li>Os pacotes de áudio são distribuídos simultaneamente para todos os ouvintes conectados e retransmitidos para o servidor Icecast configurado.</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};
