# O Assistant

Personal AI assistant with **text**, **voice**, **sessions**, **persistent memory**, an **OpenAI-compatible API**, and a **3D avatar**.

## Stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **PostgreSQL** + **Prisma**
- **Docker** / **Docker Compose**
- **Three.js** / React Three Fiber (3D avatar)
- **OpenAI SDK** (works with any OpenAI-compatible endpoint)

## Features

| Feature | Implementation |
|--------|----------------|
| Text chat | Streaming UI with session sidebar |
| Voice | Web Speech API (input) + OpenAI-compatible TTS (configured in Settings → Voice) |
| Sessions | Postgres-backed; switch or create chats |
| Memory | Assistant returns `{ message, memory }` JSON; new facts saved automatically |
| OpenAI API | `POST /api/v1/chat/completions`, `GET /api/v1/models`, `POST /api/v1/audio/transcriptions` |
| 3D avatar | React Three Fiber character with speak/listen states |

## Quick start

### 1. Environment

```bash
cp .env.example .env
```

Only **database** and optional **API_SECRET** / **DEFAULT_USER_ID** go in `.env`. LLM and TTS are configured in the app UI.

- **Settings → Model** — chat API (OpenAI, Ollama, LiteLLM, etc.)
- **Settings → Voice** — TTS API (e.g. [Kokoro-FastAPI](https://github.com/remsky/Kokoro-FastAPI) or any `/v1/audio/*` compatible host)

### 2. Database (Docker)

```bash
docker compose up postgres -d
npm run db:push
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Full stack with Docker

Runs **Postgres**, migrations, and the app (no bundled TTS — point Voice settings at your own server):

```bash
docker compose up --build
```

## OpenAI-compatible usage

Point any OpenAI client at your app:

```bash
# Base URL: http://localhost:3000/api/v1
# If API_SECRET is set, use Authorization: Bearer <API_SECRET>
```

Example with `session_id` to persist messages:

```bash
curl http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "session_id": "your-session-cuid",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## API routes

| Route | Description |
|-------|-------------|
| `POST /api/chat` | App UI chat (streaming) |
| `GET/POST /api/sessions` | List / create sessions |
| `GET/DELETE /api/sessions/:id` | Session detail / delete |
| `GET/PUT /api/instructions` | Persistent custom system instructions |
| `GET/PUT /api/llm/config` | Saved LLM settings |
| `GET/POST/DELETE /api/memory` | User memories |
| `GET/PUT /api/tts/config` | Saved TTS connection & voice |
| `POST /api/tts/catalog` | Load voices from TTS server |
| `POST /api/tts` | Text-to-speech |
| `GET /api/model/status` | LLM health check |
| `POST /api/v1/chat/completions` | OpenAI-compatible chat |
| `GET /api/v1/models` | Model list |
| `POST /api/v1/audio/transcriptions` | Whisper-compatible STT |

## Project layout

```
src/
  app/           # Next.js routes & API
  components/    # Chat, voice, avatar, settings UI
  hooks/         # Shared client hooks
  lib/           # DB, OpenAI, sessions, memory, TTS
  generated/     # Prisma client (generated)
prisma/          # Schema
```

## Customization

- **Avatar**: Replace `Avatar3D.tsx` with a GLB model via `@react-three/drei` `useGLTF`.
- **TTS**: Run your own OpenAI-compatible speech server (e.g. Kokoro-FastAPI on port 8880) and set the URL in **Settings → Voice**.
- **Multi-user**: Add auth and scope `userId` per account instead of `DEFAULT_USER_ID`.
