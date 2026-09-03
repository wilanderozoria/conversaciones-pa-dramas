import React, { useState } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Plus,
  Volume2,
  Loader2,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { DialogueTurn, SpeakerConfig, VoiceName } from '../types';
import { base64ToInt16Array } from '../utils/audio';

interface DialogueEditorProps {
  turns: DialogueTurn[];
  speaker1: SpeakerConfig;
  speaker2: SpeakerConfig;
  activeTurnId: string | null;
  onUpdateTurns: (turns: DialogueTurn[]) => void;
  onTurnSynthesized?: (turnId: string, audioBase64: string) => void;
}

export const DialogueEditor: React.FC<DialogueEditorProps> = ({
  turns,
  speaker1,
  speaker2,
  activeTurnId,
  onUpdateTurns,
  onTurnSynthesized,
}) => {
  const [playingTurnId, setPlayingTurnId] = useState<string | null>(null);
  const [synthesizingTurnId, setSynthesizingTurnId] = useState<string | null>(null);

  const handleTextChange = (id: string, newText: string) => {
    onUpdateTurns(
      turns.map((t) => (t.id === id ? { ...t, text: newText, audioBase64: undefined } : t))
    );
  };

  const handleSpeakerSwitch = (id: string) => {
    onUpdateTurns(
      turns.map((t) => {
        if (t.id !== id) return t;
        const newIndex: 1 | 2 = t.speakerIndex === 1 ? 2 : 1;
        const newName = newIndex === 1 ? speaker1.name : speaker2.name;
        return {
          ...t,
          speakerIndex: newIndex,
          speakerName: newName,
          audioBase64: undefined,
        };
      })
    );
  };

  const handleDeleteTurn = (id: string) => {
    if (turns.length <= 1) return;
    onUpdateTurns(turns.filter((t) => t.id !== id));
  };

  const handleAddTurn = (afterIndex: number) => {
    const prevTurn = turns[afterIndex];
    const newIndex: 1 | 2 = prevTurn ? (prevTurn.speakerIndex === 1 ? 2 : 1) : 1;
    const newName = newIndex === 1 ? speaker1.name : speaker2.name;
    const newTurn: DialogueTurn = {
      id: `turn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      speakerIndex: newIndex,
      speakerName: newName,
      text: '',
    };

    const newTurns = [...turns];
    newTurns.splice(afterIndex + 1, 0, newTurn);
    onUpdateTurns(newTurns);
  };

  const handlePlayTurn = async (turn: DialogueTurn) => {
    if (!turn.text.trim()) return;

    if (playingTurnId === turn.id) {
      setPlayingTurnId(null);
      return;
    }

    const voiceToUse: VoiceName =
      turn.speakerIndex === 1 ? speaker1.voice : speaker2.voice;

    let base64 = turn.audioBase64;

    if (!base64) {
      setSynthesizingTurnId(turn.id);
      try {
        const res = await fetch('/api/synthesize-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: turn.text,
            voice: voiceToUse,
          }),
        });

        if (!res.ok) throw new Error('Fallo al sintetizar el turno individual');
        const data = await res.json();
        base64 = data.audioBase64;
        if (base64 && onTurnSynthesized) {
          onTurnSynthesized(turn.id, base64);
        }
      } catch (err) {
        console.error('Error sintetizando turno:', err);
        setSynthesizingTurnId(null);
        return;
      } finally {
        setSynthesizingTurnId(null);
      }
    }

    if (base64) {
      try {
        setPlayingTurnId(turn.id);
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
          sampleRate: 24000,
        });
        const pcm = base64ToInt16Array(base64);
        const floatSamples = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) {
          floatSamples[i] = pcm[i] / 32768.0;
        }

        const buffer = audioCtx.createBuffer(1, floatSamples.length, 24000);
        buffer.copyToChannel(floatSamples, 0);

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = () => {
          setPlayingTurnId(null);
        };
        source.start(0);
      } catch (e) {
        console.error('Error al reproducir audio de turno:', e);
        setPlayingTurnId(null);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-neutral-800">
            Guion del Diálogo ({turns.length} intervenciones)
          </h3>
          <p className="text-xs text-neutral-500">
            Puedes editar el texto de cualquier línea antes de generar el MP3
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleAddTurn(turns.length - 1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg shadow-2xs transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir turno</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {turns.map((turn, index) => {
          const isSpeaker1 = turn.speakerIndex === 1;
          const speaker = isSpeaker1 ? speaker1 : speaker2;
          const isTurnActive = activeTurnId === turn.id;
          const isPlayingThis = playingTurnId === turn.id;
          const isSynthesizingThis = synthesizingTurnId === turn.id;

          const borderHighlight = isTurnActive
            ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20'
            : isSpeaker1
            ? 'border-indigo-100 bg-white hover:border-indigo-200'
            : 'border-emerald-100 bg-white hover:border-emerald-200';

          return (
            <div
              key={turn.id}
              className={`border rounded-xl p-3 sm:p-3.5 transition-all shadow-2xs relative ${borderHighlight}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      isSpeaker1
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    <span>{speaker.name}</span>
                    <span className="font-normal text-[10px] opacity-75">
                      ({speaker.voice})
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSpeakerSwitch(turn.id)}
                    className="text-[11px] text-neutral-400 hover:text-neutral-700 flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-neutral-100 transition-colors"
                    title="Alternar entre Interlocutor 1 y 2"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Cambiar</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePlayTurn(turn)}
                    disabled={isSynthesizingThis || !turn.text.trim()}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      isPlayingThis
                        ? 'bg-indigo-600 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    } disabled:opacity-40`}
                    title="Escuchar sólo este turno con la voz de su personaje"
                  >
                    {isSynthesizingThis ? (
                      <Loader2 className="w-3 h-3 animate-spin text-neutral-500" />
                    ) : isPlayingThis ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                    <span>{isPlayingThis ? 'Pausar' : 'Escuchar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTurn(turn.id)}
                    disabled={turns.length <= 1}
                    className="p-1 text-neutral-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors disabled:opacity-20"
                    title="Eliminar este turno"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <textarea
                value={turn.text}
                onChange={(e) => handleTextChange(turn.id, e.target.value)}
                rows={2}
                placeholder="Escribe lo que dice este personaje..."
                className="w-full text-xs sm:text-sm text-neutral-800 bg-transparent border-0 focus:outline-hidden focus:ring-0 p-0 resize-y leading-relaxed"
              />

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleAddTurn(index)}
                  className="text-[11px] text-neutral-400 hover:text-neutral-700 inline-flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Plus className="w-3 h-3" />
                  <span>Insertar línea aquí</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
