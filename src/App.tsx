import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { PublicPlayer } from './components/PublicPlayer';
import { AutoDJConsole } from './components/AutoDJConsole';
import { LibraryManager } from './components/LibraryManager';
import { AudioSettingsStudio } from './components/AudioSettingsStudio';
import { IcecastConfigPanel } from './components/IcecastConfigPanel';
import { DiagnosticsScreen } from './components/DiagnosticsScreen';
import { IntegrationAndDocker } from './components/IntegrationAndDocker';
import { AudioTrack, NowPlayingData, ProgrammingShow, RadioStatus } from './types';
import { api } from './services/api';
import { Radio, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('player');
  const [status, setStatus] = useState<RadioStatus | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [programming, setProgramming] = useState<ProgrammingShow[]>([]);
  const [libraryTracks, setLibraryTracks] = useState<AudioTrack[]>([]);
  const [libraryStats, setLibraryStats] = useState<{ count: number; totalBytes: number; totalDuration: number }>({
    count: 0,
    totalBytes: 0,
    totalDuration: 0,
  });
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Fetch all station state
  const refreshData = useCallback(async () => {
    try {
      const [st, np, prog, lib] = await Promise.all([
        api.getStatus().catch(() => null),
        api.getNowPlaying().catch(() => null),
        api.getProgramming().catch(() => []),
        api.getLibrary().catch(() => ({ tracks: [], stats: { count: 0, totalBytes: 0, totalDuration: 0 } })),
      ]);

      if (st) setStatus(st);
      if (np) setNowPlaying(np);
      if (prog) setProgramming(prog);
      if (lib) {
        setLibraryTracks(lib.tracks);
        setLibraryStats(lib.stats);
      }
    } catch (err) {
      console.warn('Refresh error:', err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // Initial load and SSE events subscription
  useEffect(() => {
    refreshData();

    // Setup SSE for zero-latency updates
    let evtSource: EventSource | null = null;
    try {
      evtSource = new EventSource('/api/radio/events');

      evtSource.addEventListener('nowPlaying', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setNowPlaying(data);
        } catch (err) {}
      });

      evtSource.addEventListener('tick', (e: MessageEvent) => {
        try {
          const tickData = JSON.parse(e.data);
          setNowPlaying((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              elapsedSeconds: tickData.elapsed,
              progressPercent: prev.durationSeconds > 0 ? (tickData.elapsed / prev.durationSeconds) * 100 : 0,
            };
          });
        } catch (err) {}
      });

      evtSource.addEventListener('state', (e: MessageEvent) => {
        try {
          const stateData = JSON.parse(e.data);
          setStatus((prev) => (prev ? { ...prev, online: stateData.online, autodjActive: stateData.online } : null));
          refreshData();
        } catch (err) {}
      });

      evtSource.addEventListener('listeners', (e: MessageEvent) => {
        try {
          const listenerData = JSON.parse(e.data);
          setStatus((prev) => (prev ? { ...prev, activeListeners: listenerData.count } : null));
          setNowPlaying((prev) => (prev ? { ...prev, activeListeners: listenerData.count } : null));
        } catch (err) {}
      });
    } catch (err) {
      console.warn('SSE connection failed, falling back to polling:', err);
    }

    // Polling fallback every 3 seconds to keep sync
    const interval = setInterval(refreshData, 3000);

    return () => {
      clearInterval(interval);
      if (evtSource) evtSource.close();
    };
  }, [refreshData]);

  // Master Auto DJ Toggle from Header
  const handleToggleAutoDJ = async () => {
    if (!status) return;
    setLoadingAction(true);
    try {
      if (status.online) {
        await api.stopAutoDJ();
      } else {
        await api.startAutoDJ();
      }
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Falha ao alterar estado do Auto DJ');
    } finally {
      setLoadingAction(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-100 p-4 font-mono">
        <div className="flex items-center gap-3">
          <Radio className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="text-xl font-extrabold tracking-tight">RealAudio FM Studio</span>
        </div>
        <p className="text-xs text-neutral-400 mt-2">Inicializando motor de áudio e verificando FFmpeg...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Studio Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        status={status}
        onToggleAutoDJ={handleToggleAutoDJ}
        loadingAction={loadingAction}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'player' && (
          <PublicPlayer
            nowPlaying={nowPlaying}
            status={status}
            programming={programming}
            onRefresh={refreshData}
          />
        )}

        {currentTab === 'autodj' && (
          <AutoDJConsole
            nowPlaying={nowPlaying}
            status={status}
            libraryTracks={libraryTracks}
            onRefresh={refreshData}
          />
        )}

        {currentTab === 'library' && (
          <LibraryManager
            tracks={libraryTracks}
            stats={libraryStats}
            onRefresh={refreshData}
          />
        )}

        {currentTab === 'dsp' && status && (
          <AudioSettingsStudio
            settings={status.audioSettings}
            onRefresh={refreshData}
          />
        )}

        {currentTab === 'icecast' && (
          <IcecastConfigPanel
            status={status}
            onRefresh={refreshData}
          />
        )}

        {currentTab === 'diagnostics' && (
          <DiagnosticsScreen />
        )}

        {currentTab === 'deploy' && (
          <IntegrationAndDocker />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 border-t border-neutral-800/80 py-6 text-xs text-neutral-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-neutral-400">RealAudio FM Engine</span>
            <span>— Processamento Real FFmpeg & Streaming Icecast 2</span>
          </div>
          <div className="font-mono text-[11px] text-neutral-400">
            Bitrate: {status?.audioSettings?.bitrate || 128} kbps • {status?.audioSettings?.sampleRate || 44100} Hz Stereo
          </div>
        </div>
      </footer>
    </div>
  );
}
