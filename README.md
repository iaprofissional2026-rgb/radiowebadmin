# 📻 RealAudio FM — Sistema Profissional de Automação de Rádio & Streaming Real (FFmpeg + Icecast)

Sistema completo de rádio web com processamento e transmissão de **áudio 100% real**, utilizando o motor nativo **FFmpeg**, distribuição via servidor **Icecast / HTTP MP3**, **Auto DJ contínuo 24/7**, crossfade em tempo real, normalização EBU R128 e console de controle broadcast.

---

## 🏗️ Arquitetura do Sistema

```text
ARQUIVOS DE ÁUDIO REAIS (MP3, WAV, FLAC, AAC, OGG)
                       ↓
              BIBLIOTECA & STORAGE
                       ↓
             AUTO DJ BACKEND ENGINE
                       ↓
     FFmpeg (DSP: EQ + Normalização EBU R128 + Crossfade + Libmp3lame)
                       ↓
         ┌─────────────┴─────────────┐
         ↓                           ↓
   ICECAST 2 SERVER       SERVIDOR HTTP DIRETO
(Distribuição Externa)    (/api/radio/stream)
         ↓                           ↓
   OUVINTES EXTERNOS      PLAYERS WEB / MOBILE / PWA
```

---

## 🚀 Como Executar com Docker

Para iniciar todo o ecossistema (Icecast + Auto DJ + FFmpeg + Backend + Frontend) com um único comando:

```bash
# Iniciar todos os serviços em background
docker compose up -d

# Verificar status dos containers
docker compose ps

# Visualizar logs em tempo real
docker compose logs -f
```

---

## 🧪 Diagnóstico e Verificação do FFmpeg

O sistema inclui diagnóstico em tempo real no painel web e verificação via terminal:

```bash
# Verificar versão e encoders do FFmpeg
ffmpeg -version

# Listar encoders de áudio habilitados (libmp3lame, aac, libopus)
ffmpeg -encoders | grep -E "mp3|aac|opus|vorbis"
```

---

## 🌐 Arquitetura de Produção: Netlify + Servidor Auto DJ

Conforme especificado, processos contínuos de streaming (FFmpeg + Icecast + Auto DJ) devem rodar em um servidor VPS/Cloud Run/Docker, enquanto o frontend estático pode ser hospedado na Netlify:

```text
                 INTERNET
                    │
       ┌────────────┴────────────┐
       │                         │
    NETLIFY                  VPS/SERVIDOR (Docker)
       │                         │
 Painel / PWA               Auto DJ (Node.js)
 Site público               FFmpeg Core
 Player Web                 Icecast 2 Server
                            Storage / Uploads
       │                         │
       └────────────┬────────────┘
                    │
                OUVINTE
                    │
              PLAYER REAL
```

Na Netlify, defina a variável de ambiente:
```env
VITE_API_BASE_URL=https://sua-vps-radio.com
```

---

## 📡 Endpoints da API Pública

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/radio/status` | Status geral, uptime, ouvintes reais e telemetria |
| `GET` | `/api/radio/now-playing` | Faixa tocando agora, próxima, fila e histórico |
| `GET` | `/api/radio/stream` | Stream ao vivo de áudio MP3 contínuo com headers ICY |
| `GET` | `/api/radio/programming` | Grade de programação e horários |
| `GET` | `/api/radio/library` | Lista de faixas cadastradas na biblioteca |
| `POST` | `/api/radio/library/upload` | Upload e análise de novos arquivos de áudio |
| `POST` | `/api/radio/autodj/start` | Iniciar motor contínuo do Auto DJ |
| `POST` | `/api/radio/autodj/stop` | Parar transmissão do Auto DJ |
| `POST` | `/api/radio/autodj/skip` | Pular faixa atual com transição imediata |
| `GET` | `/api/radio/diagnostics` | Executar bateria completa de testes de diagnóstico |
| `GET` | `/api/radio/events` | SSE (Server-Sent Events) para atualizações instantâneas |
