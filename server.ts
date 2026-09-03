import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Download full project ZIP
app.get('/api/download-project-zip', (req: Request, res: Response) => {
  const zipPath = path.join(process.cwd(), 'public', 'proyecto-conversaciones-audio.zip');
  res.download(zipPath, 'proyecto-conversaciones-audio.zip', (err) => {
    if (err) {
      console.error('Error enviando archivo ZIP:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'No se pudo descargar el archivo ZIP.' });
      }
    }
  });
});

/**
 * Generates a realistic dialogue between two people based on the provided topic and speakers.
 */
app.post('/api/generate-dialogue', async (req: Request, res: Response) => {
  try {
    const {
      topic,
      speaker1,
      speaker2,
      tone = 'Conversacional natural y dinámico',
      turnCount = 8,
      language = 'Español',
    } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'El tema de la conversación es requerido.' });
    }

    const s1Name = speaker1?.name || 'Persona 1';
    const s1Role = speaker1?.roleDescription || 'Interlocutor A';
    const s2Name = speaker2?.name || 'Persona 2';
    const s2Role = speaker2?.roleDescription || 'Interlocutor B';

    const prompt = `Eres un guionista experto en diálogos hablados realistas, podcasts y doblaje.
Genera una conversación hablada cautivadora, natural y fluida entre dos personas sobre el siguiente tema:

TEMA: "${topic}"
IDIOMA: ${language}
TONO / ESTILO: ${tone}
CANTIDAD DE TURNOS APROXIMADA: ${turnCount} turnos (alternando entre ambos interlocutores).

PERSONA 1:
- Nombre: ${s1Name}
- Perfil / Rol: ${s1Role}

PERSONA 2:
- Nombre: ${s2Name}
- Perfil / Rol: ${s2Role}

PAUTAS CRÍTICAS:
1. El diálogo está pensado para ser convertido en AUDIO (Text-To-Speech).
2. Evita acotaciones de guion, paréntesis como "(riendo)", "(pausa)", o notas entre corchetes, porque los motores de TTS los leerían textualmente. Escribe únicamente lo que el personaje pronuncia.
3. Haz que las frases suenen coloquiales, vivas, con preguntas, reacciones genuinas, anécdotas o contraargumentos según el tono.
4. Distribuye equitativamente los turnos entre ${s1Name} (speakerIndex: 1) y ${s2Name} (speakerIndex: 2).
5. Devuelve un título llamativo para la conversación y la lista ordenada de turnos.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: 'Título conciso y atractivo de la conversación',
            },
            turns: {
              type: Type.ARRAY,
              description: 'Lista secuencial de turnos del diálogo',
              items: {
                type: Type.OBJECT,
                properties: {
                  speakerIndex: {
                    type: Type.INTEGER,
                    description: '1 para Persona 1, 2 para Persona 2',
                  },
                  speakerName: {
                    type: Type.STRING,
                    description: 'Nombre del personaje que habla',
                  },
                  text: {
                    type: Type.STRING,
                    description: 'Texto exacto y natural que dice el personaje',
                  },
                },
                required: ['speakerIndex', 'speakerName', 'text'],
              },
            },
          },
          required: ['title', 'turns'],
        },
      },
    });

    const rawText = response.text?.trim() || '{}';
    const parsed = JSON.parse(rawText);

    res.json({
      title: parsed.title || topic,
      turns: parsed.turns || [],
    });
  } catch (error: unknown) {
    console.error('Error al generar diálogo:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido al generar guion';
    res.status(500).json({ error: message });
  }
});

/**
 * Synthesizes audio for a single turn of dialogue using Gemini TTS.
 */
app.post('/api/synthesize-turn', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Kore' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Texto vacío para sintetizar.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: text.trim() }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p) => p.inlineData?.data);
    const base64Audio = audioPart?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('El modelo no devolvió datos de audio.');
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: audioPart?.inlineData?.mimeType || 'audio/pcm;rate=24000',
    });
  } catch (error: unknown) {
    console.error('Error al sintetizar turno:', error);
    const message = error instanceof Error ? error.message : 'Error al generar voz para el turno';
    res.status(500).json({ error: message });
  }
});

/**
 * Synthesizes full conversation using Gemini multi-speaker TTS if possible,
 * or allows client to request batch synthesis.
 */
app.post('/api/synthesize-multispeaker', async (req: Request, res: Response) => {
  try {
    const { speaker1, speaker2, turns } = req.body;

    if (!turns || !Array.isArray(turns) || turns.length === 0) {
      return res.status(400).json({ error: 'Lista de turnos vacía.' });
    }

    const s1Name = speaker1?.name || 'Persona 1';
    const s1Voice = speaker1?.voice || 'Kore';
    const s2Name = speaker2?.name || 'Persona 2';
    const s2Voice = speaker2?.voice || 'Puck';

    // Build the dialogue transcript prompt
    const formattedTranscript = turns
      .map((t: { speakerIndex: number; text: string }) => {
        const name = t.speakerIndex === 1 ? s1Name : s2Name;
        return `${name}: ${t.text}`;
      })
      .join('\n');

    const prompt = `TTS the following conversation between ${s1Name} and ${s2Name}:\n${formattedTranscript}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: s1Name,
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: s1Voice },
                },
              },
              {
                speaker: s2Name,
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: s2Voice },
                },
              },
            ],
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p) => p.inlineData?.data);
    const base64Audio = audioPart?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('No se pudo generar el audio multi-locutor completo.');
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: audioPart?.inlineData?.mimeType || 'audio/pcm;rate=24000',
    });
  } catch (error: unknown) {
    console.warn('Fallo en síntesis multi-speaker directa:', error);
    const message = error instanceof Error ? error.message : 'Error en síntesis multi-speaker';
    res.status(500).json({ error: message, fallbackRequired: true });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'index.html'));
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Conversaciones de Audio activo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
