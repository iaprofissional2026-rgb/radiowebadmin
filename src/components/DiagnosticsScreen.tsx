import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Terminal, 
  Server, 
  Cpu, 
  Radio, 
  Play, 
  Copy, 
  Check,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { DiagnosticResult } from '../types';
import { api } from '../services/api';

export const DiagnosticsScreen: React.FC = () => {
  const [report, setReport] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [testing, setTesting] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const data = await api.runDiagnostics();
      setReport(data);
    } catch (err) {
      console.error('Failed to run diagnostics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const handleTestStream = async () => {
    setTesting(true);
    try {
      const data = await api.runDiagnostics();
      setReport(data);
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Required Panel Header Card */}
      <div className="bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
              <Activity className="w-4 h-4" />
              <span>DIAGNÓSTICO EM TEMPO REAL</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight mt-1">
              SISTEMA DE ÁUDIO
            </h2>
          </div>

          <button
            onClick={handleTestStream}
            disabled={testing || loading}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs tracking-wider uppercase shadow-xl shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {testing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" />
            ) : (
              <Radio className="w-4 h-4" />
            )}
            <span>TESTAR TRANSMISSÃO</span>
          </button>
        </div>

        {/* 3 Main Status Columns required by Prompt */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
          
          {/* FFmpeg Status */}
          <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-bold uppercase">FFmpeg</span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                report?.ffmpegInfo.installed ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                <span className="text-base leading-none">●</span>
                <span>{report?.ffmpegInfo.installed ? 'INSTALADO' : 'NÃO DETECTADO'}</span>
              </span>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500">Versão:</p>
              <p className="text-sm font-bold text-neutral-200 truncate">
                {report?.ffmpegInfo.installed ? report.ffmpegInfo.version : 'Ausente no sistema'}
              </p>
            </div>
            <p className="text-[10px] text-neutral-500 truncate">
              {report?.ffmpegInfo.path || 'PATH não localizado'}
            </p>
          </div>

          {/* Encoder Status */}
          <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-bold uppercase">Encoder</span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                (report?.ffmpegInfo.supportedEncoders.length || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                <span className="text-base leading-none">●</span>
                <span>{(report?.ffmpegInfo.supportedEncoders.length || 0) > 0 ? 'DISPONÍVEL' : 'INDISPONÍVEL'}</span>
              </span>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500">Codecs Suportados:</p>
              <p className="text-xs font-bold text-neutral-300">
                {report?.ffmpegInfo.supportedEncoders.join(', ') || 'Nenhum encoder detectado'}
              </p>
            </div>
            <p className="text-[10px] text-neutral-500">
              libmp3lame MP3 320k / AAC / Opus
            </p>
          </div>

          {/* Streaming Server Status */}
          <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-bold uppercase">Streaming</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <span className="text-base leading-none">●</span>
                <span>CONFIGURADO</span>
              </span>
            </div>
            <div>
              <p className="text-[11px] text-neutral-500">Endpoint Ativo:</p>
              <p className="text-xs font-bold text-neutral-200 font-mono truncate">
                /api/radio/stream (HTTP/ICY)
              </p>
            </div>
            <p className="text-[10px] text-neutral-500">
              {report?.icecastInfo.configured ? 'Relay Icecast Ativo' : 'Servidor Integrado Ativo'}
            </p>
          </div>

        </div>

      </div>

      {/* Test Transmission Results Pipeline */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <h3 className="font-bold text-lg text-neutral-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>Resultado do Teste de Transmissão Ponta-a-Ponta</span>
          </h3>
          <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase font-mono ${
            report?.overallStatus === 'ok'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
              : report?.overallStatus === 'warning'
              ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
              : 'bg-rose-950 text-rose-400 border border-rose-500/40'
          }`}>
            {report?.overallStatus === 'ok' ? '🟢 RÁDIO TRANSMITINDO' : '🟡 ALERTA DE CONFIGURAÇÃO'}
          </span>
        </div>

        {/* Diagnostic Checks List */}
        <div className="space-y-3 font-mono text-xs">
          {report?.checks.map((c, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                c.status === 'ok'
                  ? 'bg-neutral-950/70 border-neutral-800/80'
                  : c.status === 'warning'
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-rose-950/20 border-rose-500/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  {c.status === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : c.status === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-bold text-neutral-200">{c.name}</span>
                </div>
                <span className={`font-bold ${
                  c.status === 'ok' ? 'text-emerald-400' : c.status === 'warning' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {c.summary}
                </span>
              </div>
              <p className="text-neutral-400 font-sans text-xs mt-2 pl-7">
                {c.details}
              </p>
              {c.troubleshooting && (
                <div className="mt-3 pl-7 pt-2 border-t border-neutral-800 font-sans text-xs text-amber-300">
                  <strong>Instrução:</strong> {c.troubleshooting}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Terminal Diagnostic & Installation Guide */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
        <div className="flex items-center gap-2 font-bold text-base text-neutral-100">
          <Terminal className="w-5 h-5 text-amber-400" />
          <span>Comandos de Diagnóstico e Instalação do Motor de Áudio</span>
        </div>

        <p className="text-xs text-neutral-400">
          Caso esteja executando em um servidor VPS limpo ou máquina local, utilize os comandos abaixo para verificar o FFmpeg e instalar os pacotes necessários:
        </p>

        <div className="space-y-4">
          {/* FFmpeg check */}
          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400">1. Verificar FFmpeg no Terminal:</span>
              <button
                onClick={() => copyToClipboard('ffmpeg -version', 'cmd1')}
                className="flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:underline"
              >
                {copiedCmd === 'cmd1' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd === 'cmd1' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-emerald-400 bg-neutral-900/80 p-3 rounded-xl overflow-x-auto">
              ffmpeg -version
            </pre>
          </div>

          {/* Linux Installation */}
          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400">2. Instalação no Linux (Ubuntu/Debian):</span>
              <button
                onClick={() => copyToClipboard('sudo apt-get update && sudo apt-get install -y ffmpeg icecast2', 'cmd2')}
                className="flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:underline"
              >
                {copiedCmd === 'cmd2' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd === 'cmd2' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-neutral-300 bg-neutral-900/80 p-3 rounded-xl overflow-x-auto">
              sudo apt-get update && sudo apt-get install -y ffmpeg icecast2
            </pre>
          </div>

          {/* macOS Installation */}
          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400">3. Instalação no macOS (Homebrew):</span>
              <button
                onClick={() => copyToClipboard('brew install ffmpeg icecast', 'cmd3')}
                className="flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:underline"
              >
                {copiedCmd === 'cmd3' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCmd === 'cmd3' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-neutral-300 bg-neutral-900/80 p-3 rounded-xl overflow-x-auto">
              brew install ffmpeg icecast
            </pre>
          </div>
        </div>
      </div>

    </div>
  );
};
