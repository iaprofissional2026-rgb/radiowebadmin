import React, { useState } from 'react';
import { 
  Radio, 
  Disc3, 
  Sliders, 
  Layers, 
  Activity, 
  Server, 
  Terminal, 
  Users, 
  Wifi, 
  WifiOff, 
  Play, 
  Square,
  Sparkles,
  Volume2,
  Globe,
  Settings2,
  Check,
  RotateCcw
} from 'lucide-react';
import { RadioStatus } from '../types';
import { api, getResolvedBaseUrl } from '../services/api';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  status: RadioStatus | null;
  onToggleAutoDJ: () => void;
  loadingAction: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  status,
  onToggleAutoDJ,
  loadingAction,
  onRefresh,
}) => {
  const isOnline = status?.online ?? false;
  const activeListeners = status?.activeListeners ?? 0;
  const [showServerModal, setShowServerModal] = useState<boolean>(false);
  const [serverUrlInput, setServerUrlInput] = useState<string>(getResolvedBaseUrl() || '');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const isNetlify = typeof window !== 'undefined' && (
    window.location.hostname.includes('netlify.app') || 
    window.location.hostname.includes('taupe-dragon')
  );

  const tabs = [
    { id: 'player', label: 'Player Público', icon: Radio },
    { id: 'autodj', label: 'Auto DJ & Fila', icon: Disc3 },
    { id: 'library', label: 'Biblioteca', icon: Layers },
    { id: 'dsp', label: 'Processador de Áudio', icon: Sliders },
    { id: 'icecast', label: 'Servidor Icecast', icon: Server },
    { id: 'diagnostics', label: 'Diagnóstico', icon: Activity },
    { id: 'deploy', label: 'Docker & Apps', icon: Terminal },
  ];

  const handleSaveServerUrl = () => {
    api.setBaseUrl(serverUrlInput);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowServerModal(false);
      onRefresh();
    }, 1200);
  };

  const handleResetServerUrl = () => {
    setServerUrlInput('');
    api.setBaseUrl('');
    onRefresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 text-neutral-950 font-black">
              <Radio className="w-5 h-5 text-neutral-950 animate-pulse" />
              {isOnline && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-neutral-100 via-neutral-200 to-amber-200 bg-clip-text text-transparent">
                  RealAudio FM
                </span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                  FFmpeg + Icecast
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">
                Transmissão Contínua de Áudio Real
              </p>
            </div>
          </div>

          {/* Quick Broadcast Status & Master Switch */}
          <div className="flex items-center gap-3">
            {/* Netlify/Server Endpoint Indicator */}
            <button
              onClick={() => {
                setServerUrlInput(getResolvedBaseUrl());
                setShowServerModal(true);
              }}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition-colors ${
                isNetlify
                  ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40'
                  : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
              }`}
              title="Configurar servidor de transmissão backend"
            >
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>{isNetlify ? 'Netlify Conectado' : 'Servidor Backend'}</span>
              <Settings2 className="w-3 h-3 ml-0.5 text-neutral-400" />
            </button>

            {/* Real Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              isOnline 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}>
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ON AIR</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>OFF AIR</span>
                </>
              )}
            </div>

            {/* Real Listeners counter */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700/60 text-xs text-neutral-300 font-mono">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeListeners} {activeListeners === 1 ? 'ouvinte' : 'ouvintes'}</span>
            </div>

            {/* Auto DJ Master Action Button */}
            <button
              onClick={onToggleAutoDJ}
              disabled={loadingAction}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                isOnline
                  ? 'bg-rose-600/90 hover:bg-rose-600 text-white shadow-rose-900/30'
                  : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20'
              } disabled:opacity-50`}
              title={isOnline ? 'Parar transmissão do Auto DJ' : 'Iniciar transmissão com Auto DJ'}
            >
              {loadingAction ? (
                <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
              ) : isOnline ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>PARAR AUTO DJ</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>INICIAR AUTO DJ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 border-t border-neutral-800/60">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-inner font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-neutral-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Backend Server Connection Modal */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-base text-neutral-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Servidor Backend de Transmissão</span>
              </h3>
              <button
                onClick={() => setShowServerModal(false)}
                className="text-neutral-400 hover:text-neutral-100 text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Quando o frontend é hospedado na Netlify (<code className="text-cyan-300">taupe-dragon-883c66.netlify.app</code>), ele se conecta ao servidor backend VPS/Cloud onde o <strong>FFmpeg</strong> e o <strong>Auto DJ</strong> executam continuamente.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 block">URL do Servidor Backend / Stream:</label>
              <input
                type="text"
                value={serverUrlInput}
                placeholder="https://ais-dev-zqepgxm3sm4ndvgrpz52jq-494631811355.us-east1.run.app"
                onChange={(e) => setServerUrlInput(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-neutral-100 outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
              <button
                onClick={handleResetServerUrl}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowServerModal(false)}
                  className="px-3 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold hover:bg-neutral-700"
                >
                  Fechar
                </button>
                <button
                  onClick={handleSaveServerUrl}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md transition-transform active:scale-95"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Conectado!</span>
                    </>
                  ) : (
                    <span>Salvar & Conectar</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
