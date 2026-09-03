import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Play,
  Download,
  Loader2,
  RefreshCw,
  Sliders,
  Settings,
  AlertCircle,
  CheckCircle2,
  Volume2,
  FileText,
} from 'lucide-react';
import {
  Conversation,
  DialogueTurn,
  SpeakerConfig,
  TopicPreset,
  VoiceName,
} from './types';
import { TOPIC_PRESETS } from './presets';
import { Header } from './components/Header';
import { PresetSelector } from './components/PresetSelector';
import { SpeakerConfigCard } from './components/SpeakerConfigCard';
import { DialogueEditor } from './components/DialogueEditor';
import { AudioMasterPlayer } from './components/AudioMasterPlayer';
import { SavedConversationsModal } from './components/SavedConversationsModal';
import {
  base64ToInt16Array,
  concatenatePcmChunks,
  int16ArrayToBase64,
  pcmToMp3Blob,
  triggerFileDownload,
} from './utils/audio';

const STORAGE_KEY = 'gemini_audio_conversations_v1';

// Initial preloaded conversation so user sees working demo immediately
const INITIAL_CONVERSATION: Conversation = {
  id: 'conv-initial-demo',
  title: 'Debate: ¿La IA reemplazará a los programadores?',
  topic: 'Un debate entusiasta y con argumentos técnicos sobre el futuro de la ingeniería de software ante la IA generativa.',
  language: 'Español',
  createdAt: new Date().toISOString(),
  speaker1: {
    name: 'Mateo',
    roleDescription: 'Ingeniero escéptico y defensor del criterio humano',
    voice: 'Fenrir',
    avatarColor: '#4f46e5',
  },
  speaker2: {
    name: 'Lucía',
    roleDescription: 'Investigadora de IA entusiasta y visionaria',
    voice: 'Kore',
    avatarColor: '#059669',
  },
  turns: [
    {
      id: 'turn-1',
      speakerIndex: 1,
      speakerName: 'Mateo',
      text: 'Lucía, reconozco que la IA escribe código rápido, pero diseñar la arquitectura de un sistema complejo requiere intuición humana que ningún modelo tiene.',
    },
    {
      id: 'turn-2',
      speakerIndex: 2,
      speakerName: 'Lucía',
      text: 'Entiendo tu punto Mateo, pero no se trata de reemplazar el criterio, sino de multiplicar nuestra capacidad de abstracción diez veces.',
    },
    {
      id: 'turn-3',
      speakerIndex: 1,
      speakerName: 'Mateo',
      text: '¿Y qué pasa cuando el código generado falla en producción a las tres de la mañana? Necesitas haber entendido cada línea para resolverlo.',
    },
    {
      id: 'turn-4',
      speakerIndex: 2,
      speakerName: 'Lucía',
      text: '¡Totalmente de acuerdo! Por eso el programador del futuro será más como un director de orquesta que un mecanógrafo de sintaxis.',
    },
  ],
};

export default function App() {
  const [topic, setTopic] = useState(INITIAL_CONVERSATION.topic);
  const [tone, setTone] = useState('Conversacional con argumentos sólidos y chispa');
  const [turnCount, setTurnCount] = useState<number>(6);
  const [language, setLanguage] = useState('Español');

  const [speaker1, setSpeaker1] = useState<SpeakerConfig>(INITIAL_CONVERSATION.speaker1);
  const [speaker2, setSpeaker2] = useState<SpeakerConfig>(INITIAL_CONVERSATION.speaker2);
  const [currentConversation, setCurrentConversation] = useState<Conversation>(INITIAL_CONVERSATION);

  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isSynthesizingFull, setIsSynthesizingFull] = useState(false);
  const [synthesisProgress, setSynthesisProgress] = useState<{ current: number; total: number; message: string } | null>(null);

  const [savedConversations, setSavedConversations] = useState<Conversation[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load saved conversations from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedConversations(parsed);
        }
      }
    } catch (e) {
      console.error('Error cargando historial:', e);
    }
  }, []);

  // Save to localStorage
  const saveToStorage = (updatedList: Conversation[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
      setSavedConversations(updatedList);
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  };

  // Handle Preset selection
  const handleSelectPreset = (preset: TopicPreset) => {
    setTopic(preset.topic);
    setSpeaker1({
      name: preset.speaker1Name,
      roleDescription: preset.speaker1Role,
      voice: preset.speaker1Voice,
      avatarColor: '#4f46e5',
    });
    setSpeaker2({
      name: preset.speaker2Name,
      roleDescription: preset.speaker2Role,
      voice: preset.speaker2Voice,
      avatarColor: '#059669',
    });
    setSuccessMessage(`Plantilla "${preset.title}" cargada. Haz clic en "Generar Diálogo con IA" para crear el guion.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Generate Script using Gemini
  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      setErrorMessage('Por favor ingresa un tema para la conversación.');
      return;
    }

    setErrorMessage(null);
    setIsGeneratingScript(true);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/generate-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          speaker1,
          speaker2,
          tone,
          turnCount,
          language,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error en la generación del diálogo');
      }

      const data = await res.json();
      const generatedTurns: DialogueTurn[] = (data.turns || []).map(
        (t: { speakerIndex: 1 | 2; speakerName: string; text: string }, index: number) => ({
          id: `turn-${Date.now()}-${index}`,
          speakerIndex: t.speakerIndex === 1 ? 1 : 2,
          speakerName: t.speakerIndex === 1 ? speaker1.name : speaker2.name,
          text: t.text,
        })
      );

      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        title: data.title || topic,
        topic,
        language,
        createdAt: new Date().toISOString(),
        speaker1,
        speaker2,
        turns: generatedTurns,
      };

      setCurrentConversation(newConv);
      setSuccessMessage(`¡Guion creado exitosamente con ${generatedTurns.length} turnos! Ya puedes escucharlo y generar el MP3.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error generando diálogo:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo generar el diálogo.';
      setErrorMessage(msg);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Turn Synthesized callback
  const handleTurnSynthesized = (turnId: string, audioBase64: string) => {
    setCurrentConversation((prev) => ({
      ...prev,
      turns: prev.turns.map((t) => (t.id === turnId ? { ...t, audioBase64 } : t)),
    }));
  };

  // Synthesize Full Conversation Audio (Stitched Turn-by-Turn with natural pause)
  const handleSynthesizeFullAudio = async () => {
    if (!currentConversation.turns.length) return;

    setIsSynthesizingFull(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const turns = currentConversation.turns;
      const pcmChunks: Int16Array[] = [];
      const updatedTurns = [...turns];

      for (let i = 0; i < turns.length; i++) {
        const turn = turns[i];
        const speaker = turn.speakerIndex === 1 ? speaker1 : speaker2;

        setSynthesisProgress({
          current: i + 1,
          total: turns.length,
          message: `Sintetizando turno ${i + 1} de ${turns.length} (${speaker.name} - Voz ${speaker.voice})...`,
        });

        let audioBase64 = turn.audioBase64;

        if (!audioBase64) {
          const res = await fetch('/api/synthesize-turn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: turn.text,
              voice: speaker.voice,
            }),
          });

          if (!res.ok) {
            throw new Error(`Error sintetizando la línea ${i + 1} de ${speaker.name}`);
          }

          const data = await res.json();
          audioBase64 = data.audioBase64;
          updatedTurns[i] = { ...turn, audioBase64 };
        }

        if (audioBase64) {
          const pcm = base64ToInt16Array(audioBase64);
          pcmChunks.push(pcm);
        }
      }

      setSynthesisProgress({
        current: turns.length,
        total: turns.length,
        message: 'Ensamblando diálogo maestro y calculando tiempos...',
      });

      // Combine all PCM chunks with 350ms natural silence gap
      const { combined, turnOffsets } = concatenatePcmChunks(pcmChunks, 350, 24000);
      const combinedBase64 = int16ArrayToBase64(combined);

      // Assign start and duration times to each turn for real-time highlighting
      const finalizedTurns = updatedTurns.map((t, idx) => ({
        ...t,
        startTimeSec: turnOffsets[idx]?.startSec || 0,
        durationSec: turnOffsets[idx]?.durationSec || 0,
      }));

      const finalizedConversation: Conversation = {
        ...currentConversation,
        turns: finalizedTurns,
        fullAudioPcmBase64: combinedBase64,
        durationSec: combined.length / 24000,
      };

      setCurrentConversation(finalizedConversation);

      // Save to saved conversations library
      const filtered = savedConversations.filter((c) => c.id !== finalizedConversation.id);
      const newSaved = [finalizedConversation, ...filtered].slice(0, 20);
      saveToStorage(newSaved);

      setSuccessMessage('¡Audio maestro generado con éxito! Ya puedes reproducirlo y descargarlo en MP3.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error al sintetizar audio completo:', err);
      const msg = err instanceof Error ? err.message : 'Error sintetizando el diálogo completo.';
      setErrorMessage(msg);
    } finally {
      setIsSynthesizingFull(false);
      setSynthesisProgress(null);
    }
  };

  const handleQuickDownloadMp3 = () => {
    if (!currentConversation.fullAudioPcmBase64) return;
    const pcm = base64ToInt16Array(currentConversation.fullAudioPcmBase64);
    const mp3 = pcmToMp3Blob(pcm, 24000, 128);
    const safeTitle = (currentConversation.title || 'conversacion')
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñ]+/gi, '_');
    triggerFileDownload(mp3, `${safeTitle}.mp3`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col text-neutral-900 selection:bg-indigo-100 selection:text-indigo-900">
      <Header
        hasActiveAudio={Boolean(currentConversation.fullAudioPcmBase64)}
        onQuickDownload={handleQuickDownloadMp3}
        savedCount={savedConversations.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Alerts & Notifications */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 text-xs sm:text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Ocurrió un inconveniente</span>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700 text-xs font-semibold"
            >
              Cerrar
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-start gap-3 text-xs sm:text-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{successMessage}</div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-500 hover:text-emerald-700 text-xs font-semibold"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Informative Intro Banner directly answering the user query */}
        <section className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="max-w-3xl relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Generación de Audio y Descarga en MP3</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Crea diálogos entre 2 interlocutores y descárgalos en MP3 al instante
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-2xl">
              Configura los personajes, elige entre 5 voces neuronales de Gemini TTS para cada locutor, genera el guion sobre cualquier tema y obtén un archivo MP3 de alta fidelidad listo para tus podcasts, videos, prácticas de idiomas o proyectos.
            </p>
          </div>
        </section>

        {/* Master Player Component (if audio exists) */}
        {currentConversation.fullAudioPcmBase64 && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-300">
            <AudioMasterPlayer
              conversation={currentConversation}
              activeTurnId={activeTurnId}
              onTurnSelect={(id) => setActiveTurnId(id)}
            />
          </section>
        )}

        {/* 1-Click Topic Presets */}
        <section>
          <PresetSelector onSelectPreset={handleSelectPreset} />
        </section>

        {/* Main Workspace: Left Column (Speakers & Topic) / Right Column (Dialogue Script & Action) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Speaker Configuration & Topic Settings */}
          <div className="lg:col-span-5 space-y-5">
            {/* Topic & Style Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  Tema & Parámetros
                </span>
                <span className="text-[11px] text-neutral-400">Paso 1</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Tema o situación de la conversación
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                  placeholder="Ej: Dos amigos discutiendo sobre si la pizza con piña es aceptable..."
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-neutral-50/70 border border-neutral-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Tono del diálogo
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Conversacional natural y dinámico">Natural & Coloquial</option>
                    <option value="Debate apasionado con argumentos técnicos">Debate & Argumentación</option>
                    <option value="Formal, entrevista de trabajo o negocios">Formal / Negocios</option>
                    <option value="Humorístico, gracioso y divertido">Humorístico / Divertido</option>
                    <option value="Educativo, divulgación paso a paso">Didáctico / Podcast</option>
                    <option value="Práctica de idiomas nivel intermedio">Práctica de Idiomas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Extensión (turnos)
                  </label>
                  <select
                    value={turnCount}
                    onChange={(e) => setTurnCount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={4}>Rápido (4 turnos)</option>
                    <option value={6}>Corto (6 turnos)</option>
                    <option value={8}>Estándar (8 turnos)</option>
                    <option value={12}>Extenso (12 turnos)</option>
                  </select>
                </div>
              </div>

              <button
                id="btn-generate-dialogue"
                type="button"
                onClick={handleGenerateScript}
                disabled={isGeneratingScript}
                className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingScript ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                    <span>Escribiendo guion con Gemini IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Generar Diálogo con IA</span>
                  </>
                )}
              </button>
            </div>

            {/* Interlocutores 1 y 2 Configuration Cards */}
            <div className="space-y-4">
              <SpeakerConfigCard
                speakerNumber={1}
                config={speaker1}
                onChange={setSpeaker1}
                accentColor="indigo"
              />

              <SpeakerConfigCard
                speakerNumber={2}
                config={speaker2}
                onChange={setSpeaker2}
                accentColor="emerald"
              />
            </div>
          </div>

          {/* Right Column: Interactive Script & Full Speech Synthesis */}
          <div className="lg:col-span-7 space-y-5">
            {/* Action Bar for Audio Generation */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-neutral-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                    Producción de Audio MP3
                  </span>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Sintetiza la conversación completa con las voces asignadas
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {currentConversation.fullAudioPcmBase64 && (
                    <button
                      type="button"
                      onClick={handleQuickDownloadMp3}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Bajar MP3</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress feedback when synthesizing */}
              {isSynthesizingFull && synthesisProgress && (
                <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-indigo-900 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      {synthesisProgress.message}
                    </span>
                    <span className="font-mono font-bold">
                      {synthesisProgress.current} / {synthesisProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-indigo-200/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${(synthesisProgress.current / synthesisProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                id="btn-synthesize-all"
                type="button"
                onClick={handleSynthesizeFullAudio}
                disabled={isSynthesizingFull || currentConversation.turns.length === 0}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSynthesizingFull ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-200" />
                    <span>Sintetizando voces con Gemini TTS...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>
                      {currentConversation.fullAudioPcmBase64
                        ? 'Volver a Sintetizar Audio Completo'
                        : 'Sintetizar Audio Completo con Voces Gemini'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Turn by Turn Dialogue Editor */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-xs">
              <DialogueEditor
                turns={currentConversation.turns}
                speaker1={speaker1}
                speaker2={speaker2}
                activeTurnId={activeTurnId}
                onUpdateTurns={(newTurns) =>
                  setCurrentConversation((prev) => ({
                    ...prev,
                    turns: newTurns,
                    fullAudioPcmBase64: undefined, // Invalidate master audio when script changes
                  }))
                }
                onTurnSynthesized={handleTurnSynthesized}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-6 mt-12 text-center text-xs text-neutral-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Conversaciones de Audio con Gemini TTS 24kHz &bull; Exportación en MP3</span>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>Voces neuronales: Kore, Puck, Zephyr, Fenrir, Charon</span>
          </div>
        </div>
      </footer>

      {/* Saved Conversations Library Modal */}
      <SavedConversationsModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        conversations={savedConversations}
        onLoadConversation={(conv) => {
          setCurrentConversation(conv);
          setSpeaker1(conv.speaker1);
          setSpeaker2(conv.speaker2);
          setTopic(conv.topic);
          setSuccessMessage(`Conversación "${conv.title}" cargada.`);
          setTimeout(() => setSuccessMessage(null), 3000);
        }}
        onDeleteConversation={(id) => {
          const updated = savedConversations.filter((c) => c.id !== id);
          saveToStorage(updated);
        }}
      />
    </div>
  );
}
