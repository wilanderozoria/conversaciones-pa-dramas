import React, { useState } from 'react';
import { Volume2, Loader2, User } from 'lucide-react';
import { SpeakerConfig, AVAILABLE_VOICES, VoiceName } from '../types';
import { base64ToInt16Array } from '../utils/audio';

interface SpeakerConfigCardProps {
  speakerNumber: 1 | 2;
  config: SpeakerConfig;
  onChange: (newConfig: SpeakerConfig) => void;
  accentColor: 'indigo' | 'emerald';
}

export const SpeakerConfigCard: React.FC<SpeakerConfigCardProps> = ({
  speakerNumber,
  config,
  onChange,
  accentColor,
}) => {
  const [testingVoice, setTestingVoice] = useState(false);

  const handleTestVoice = async () => {
    if (testingVoice) return;
    setTestingVoice(true);
    try {
      const sampleText = `Hola, soy ${config.name}. Esta es mi voz ${config.voice} para nuestra conversación.`;
      const res = await fetch('/api/synthesize-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          voice: config.voice,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al generar muestra de voz');
      }

      const data = await res.json();
      if (data.audioBase64) {
        // Play sample using Web Audio API
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
          sampleRate: 24000,
        });
        const pcmSamples = base64ToInt16Array(data.audioBase64);
        const floatSamples = new Float32Array(pcmSamples.length);
        for (let i = 0; i < pcmSamples.length; i++) {
          floatSamples[i] = pcmSamples[i] / 32768.0;
        }

        const audioBuffer = audioCtx.createBuffer(1, floatSamples.length, 24000);
        audioBuffer.copyToChannel(floatSamples, 0);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start(0);
      }
    } catch (err) {
      console.error('Error probando voz:', err);
    } finally {
      setTestingVoice(false);
    }
  };

  const isIndigo = accentColor === 'indigo';
  const badgeClass = isIndigo
    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  const headerBgClass = isIndigo ? 'bg-indigo-600' : 'bg-emerald-600';

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs hover:border-neutral-300 transition-colors">
      <div className="px-4 py-3 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg ${headerBgClass} text-white flex items-center justify-center font-bold text-xs shadow-xs`}
          >
            {speakerNumber}
          </div>
          <div>
            <span className="text-xs font-semibold text-neutral-800">
              Interlocutor {speakerNumber}
            </span>
            <span className={`ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full border ${badgeClass}`}>
              {speakerNumber === 1 ? 'Voz Principal A' : 'Voz Interlocutor B'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestVoice}
          disabled={testingVoice}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 hover:border-neutral-300 rounded-md transition-all disabled:opacity-50"
          title="Escuchar muestra de esta voz"
        >
          {testingVoice ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-500" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-neutral-500" />
          )}
          <span>Probar voz</span>
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            Nombre del personaje
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={config.name}
              onChange={(e) => onChange({ ...config, name: e.target.value })}
              placeholder={speakerNumber === 1 ? 'Ej: Mateo' : 'Ej: Lucía'}
              className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            Rol / Perfil psicológico
          </label>
          <input
            type="text"
            value={config.roleDescription}
            onChange={(e) => onChange({ ...config, roleDescription: e.target.value })}
            placeholder={
              speakerNumber === 1
                ? 'Ej: Ingeniero escéptico y analítico'
                : 'Ej: Especialista apasionada e intuitiva'
            }
            className="w-full px-3 py-2 text-xs bg-neutral-50/50 border border-neutral-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1.5">
            Voz de Gemini TTS
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AVAILABLE_VOICES.map((v) => {
              const isSelected = config.voice === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onChange({ ...config, voice: v.id as VoiceName })}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all relative ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600 shadow-xs'
                      : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">{v.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {v.gender}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                    {v.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
