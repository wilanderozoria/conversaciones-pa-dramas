# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands
- Develop: `npm run dev` (Starts Express server with Vite middleware on port 3000)
- Build: `npm run build` (Builds React frontend and bundles server to `dist/server.cjs`)
- Start Production: `npm start` (Runs the bundled production server)
- Lint: `npm run lint` (Runs TypeScript type check)
- Clean: `npm run clean` (Removes `dist` and `server.js`)

## Architecture
The project is a full-stack React application integrated with a Node.js/Express server.

### Server (`server.ts`)
- **Role**: Acts as the backend API and the host for the Vite development server.
- **API Endpoints**:
  - `/api/generate-dialogue`: Uses Gemini to create a JSON dialogue script.
  - `/api/synthesize-turn`: Generates audio for a single line of text.
  - `/api/synthesize-multispeaker`: Generates audio for a full conversation using multi-speaker TTS.
  - `/api/download-project-zip`: Serves a ZIP of the project source.
- **Integration**: Uses `@google/genai` for AI capabilities. Requires `GEMINI_API_KEY` in `.env`.

### Frontend (`src/`)
- **Framework**: React 19 + Vite + TypeScript.
- **Styling**: Tailwind CSS 4.
- **Core Flow**:
  1. User configures speakers and topic.
  2. App requests a script from `/api/generate-dialogue`.
  3. Script is edited in `DialogueEditor`.
  4. Audio is synthesized either turn-by-turn or as a complete conversation.
  5. `src/utils/audio.ts` handles PCM audio manipulation and MP3 encoding via `lamejs`.

### Data Flow
- **Dialogue**: JSON schema with `title` and an array of `turns` (speakerIndex, speakerName, text).
- **Audio**: Audio is returned from Gemini as base64 encoded PCM data (24kHz), which the frontend converts to MP3 Blobs for download.
