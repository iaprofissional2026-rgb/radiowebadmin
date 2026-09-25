import React, { useState } from 'react';
import { 
  Terminal, 
  Smartphone, 
  Server, 
  Globe, 
  Copy, 
  Check, 
  Layers, 
  Code, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const IntegrationAndDocker: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const streamUrlExample = `${window.location.origin}/api/radio/stream`;

  const dockerComposeYaml = `version: '3.8'

services:
  # 1. Servidor de Distribuição Icecast 2
  icecast:
    image: infiniteproject/icecast:latest
    container_name: realaudio_icecast
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - ICECAST_SOURCE_PASSWORD=hackme
      - ICECAST_ADMIN_PASSWORD=adminpass
    volumes:
      - ./icecast.xml:/etc/icecast2/icecast.xml:ro
      - icecast_logs:/var/log/icecast2
    networks:
      - radio_net

  # 2. Motor FFmpeg + Auto DJ + Backend Studio
  backend:
    build: .
    container_name: realaudio_backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - ICECAST_ENABLED=true
      - ICECAST_HOST=icecast
      - ICECAST_PORT=8000
      - ICECAST_MOUNT=/radio.mp3
      - ICECAST_SOURCE_PASSWORD=hackme
    volumes:
      - radio_storage:/app/storage/music
    depends_on:
      - icecast
    networks:
      - radio_net

volumes:
  radio_storage:
  icecast_logs:

networks:
  radio_net:`;

  const androidCode = `// Android (Kotlin + Jetpack Media3 ExoPlayer)
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer

class RadioPlayerManager(context: Context) {
    private val player = ExoPlayer.Builder(context).build()

    fun playRadio() {
        val streamUri = "${streamUrlExample}"
        val mediaItem = MediaItem.fromUri(streamUri)
        player.setMediaItem(mediaItem)
        player.prepare()
        player.play()
    }

    fun stopRadio() {
        player.stop()
    }
}`;

  const reactNativeCode = `// React Native (react-native-track-player)
import TrackPlayer, { Capability } from 'react-native-track-player';

export async function setupRadio() {
  await TrackPlayer.setupPlayer();
  await TrackPlayer.updateOptions({
    capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
    compactCapabilities: [Capability.Play, Capability.Pause],
  });

  await TrackPlayer.add({
    id: 'realaudio_live',
    url: '${streamUrlExample}',
    title: 'RealAudio FM',
    artist: 'Transmissão ao Vivo',
    isLiveStream: true,
  });

  await TrackPlayer.play();
}`;

  const html5PwaCode = `<!-- HTML5 / PWA Player -->
<audio id="radioPlayer" controls src="${streamUrlExample}"></audio>

<script>
  const audio = document.getElementById('radioPlayer');
  
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'RealAudio FM Live',
      artist: 'Transmissão Contínua',
      album: 'Studio HD',
      artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }]
    });

    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  }
</script>`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Docker Architecture Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
              <Server className="w-4 h-4" />
              <span>DOCKER & ARQUITETURA DE PRODUÇÃO</span>
            </div>
            <h2 className="text-2xl font-extrabold text-neutral-100 tracking-tight mt-1">
              Docker Compose & Execução dos Serviços
            </h2>
          </div>
        </div>

        <p className="text-xs text-neutral-400">
          Para rodar a rádio com alta disponibilidade em produção, utilize o Docker Compose com os serviços separados de backend (Node + FFmpeg), Icecast 2 e armazenamento persistente de músicas:
        </p>

        {/* Docker Commands */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400">Iniciar Todos os Serviços:</span>
              <button
                onClick={() => copy('docker compose up -d', 'up')}
                className="flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:underline"
              >
                {copiedKey === 'up' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'up' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-emerald-400 bg-neutral-900/80 p-3 rounded-xl">
              docker compose up -d
            </pre>
          </div>

          <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400">Verificar Status dos Containers:</span>
              <button
                onClick={() => copy('docker compose ps', 'ps')}
                className="flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:underline"
              >
                {copiedKey === 'ps' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'ps' ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-cyan-400 bg-neutral-900/80 p-3 rounded-xl">
              docker compose ps
            </pre>
          </div>
        </div>

        {/* docker-compose.yml code */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-300">Arquivo docker-compose.yml:</span>
            <button
              onClick={() => copy(dockerComposeYaml, 'compose')}
              className="flex items-center gap-1 text-xs text-amber-400 hover:underline"
            >
              {copiedKey === 'compose' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'compose' ? 'Copiado' : 'Copiar YAML'}</span>
            </button>
          </div>
          <pre className="text-xs font-mono text-neutral-300 bg-neutral-950 p-4 rounded-2xl border border-neutral-800 overflow-x-auto max-h-72">
            {dockerComposeYaml}
          </pre>
        </div>
      </div>

      {/* Netlify Architecture Strategy */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <h3 className="font-bold text-lg text-neutral-100 flex items-center gap-2">
          <Globe className="w-5 h-5 text-emerald-400" />
          <span>Hospedagem Frontend na Netlify</span>
        </h3>

        <p className="text-xs text-neutral-400">
          Como o Auto DJ e o Icecast necessitam de processos de áudio contínuos (FFmpeg), o frontend React pode ser hospedado estaticamente na Netlify enquanto aponta para o seu servidor VPS/Docker:
        </p>

        <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 font-mono text-xs text-neutral-300 space-y-1">
          <p className="text-amber-400 font-bold"># Variável de Ambiente na Netlify (.env / Site Settings)</p>
          <p>VITE_API_BASE_URL=https://sua-vps-radio.com</p>
        </div>
      </div>

      {/* Mobile App Integrations */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <h3 className="font-bold text-lg text-neutral-100 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-amber-400" />
          <span>Integração de Áudio Real para Aplicativos Nativos</span>
        </h3>

        <div className="space-y-6">
          {/* Android Kotlin */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300">Android (Kotlin / Jetpack Media3 ExoPlayer):</span>
              <button
                onClick={() => copy(androidCode, 'android')}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
              >
                {copiedKey === 'android' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'android' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-neutral-300 bg-neutral-950 p-4 rounded-2xl border border-neutral-800 overflow-x-auto">
              {androidCode}
            </pre>
          </div>

          {/* React Native */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300">React Native (react-native-track-player):</span>
              <button
                onClick={() => copy(reactNativeCode, 'rn')}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
              >
                {copiedKey === 'rn' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'rn' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-neutral-300 bg-neutral-950 p-4 rounded-2xl border border-neutral-800 overflow-x-auto">
              {reactNativeCode}
            </pre>
          </div>

          {/* HTML5 & PWA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300">HTML5 / PWA (MediaSession API):</span>
              <button
                onClick={() => copy(html5PwaCode, 'pwa')}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
              >
                {copiedKey === 'pwa' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'pwa' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-neutral-300 bg-neutral-950 p-4 rounded-2xl border border-neutral-800 overflow-x-auto">
              {html5PwaCode}
            </pre>
          </div>
        </div>
      </div>

    </div>
  );
};
