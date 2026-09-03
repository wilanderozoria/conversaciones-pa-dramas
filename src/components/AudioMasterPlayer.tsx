import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Download,
  Volume2,
  Share2,
  Check,
  Disc,
} from 'lucide-react';
import { Conversation, DialogueTurn } from '../types';
import {
  base64ToInt16Array,
  pcmToMp3Blob,
  pcmToWavBlob,
  triggerFileDownload,
} from '../utils/audio';

interface AudioMasterPlayerProps {
  conversation: Conversation;
  activeTurnId: string | null;
  onTurnSelect?: (turnId: string) => void;
}

export const AudioMasterPlayer: React.FC<AudioMasterPlayerProps> = ({
  conversation,
  activeTurnId,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [downloadingFormat, setDownloadingFormat] = useState<'mp3' | 'wav' | null>(null);
  const [copied, setCopied] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<{ mp3Blob: Blob | null; wavBlob: Blob | null }>({
    mp3Blob: null,
    wavBlob: null,
  });

  // Prepare Audio Blob when conversation has audio PCM
  useEffect(() => {
    if (!conversation.fullAudioPcmBase64) {
      setAudioUrl(null);
      return;
    }

    try {
      const pcmSamples = base64ToInt16Array(conversation.fullAudioPcmBase64);
      const sampleRate = 24000;
      const wavBlob = pcmToWavBlob(pcmSamples, sampleRate);
      const mp3Blob = pcmToMp3Blob(pcmSamples, sampleRate, 128);

      blobRef.current = { mp3Blob, wavBlob };
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);

      const calculatedDuration = pcmSamples.length / sampleRate;
      setDuration(calculatedDuration);

      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err) {
      console.error('Error procesando audio para reproductor:', err);
    }
  }, [conversation.fullAudioPcmBase64]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        audioRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    }
  };

  const sanitizeFilename = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñ]+/gi, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleDownloadMp3 = useCallback(() => {
    if (!conversation.fullAudioPcmBase64) return;
    setDownloadingFormat('mp3');
    try {
      let blob = blobRef.current.mp3Blob;
      if (!blob) {
        const pcmSamples = base64ToInt16Array(conversation.fullAudioPcmBase64);
        blob = pcmToMp3Blob(pcmSamples, 24000, 128);
        blobRef.current.mp3Blob = blob;
      }
      const filename = `${sanitizeFilename(conversation.title || 'conversacion')}_dialogo.mp3`;
      triggerFileDownload(blob, filename);
    } catch (err) {
      console.error('Error al descargar MP3:', err);
    } finally {
      setTimeout(() => setDownloadingFormat(null), 800);
    }
  }, [conversation.fullAudioPcmBase64, conversation.title]);

  const handleDownloadWav = useCallback(() => {
    if (!conversation.fullAudioPcmBase64) return;
    setDownloadingFormat('wav');
    try {
      let blob = blobRef.current.wavBlob;
      if (!blob) {
        const pcmSamples = base64ToInt16Array(conversation.fullAudioPcmBase64);
        blob = pcmToWavBlob(pcmSamples, 24000);
        blobRef.current.wavBlob = blob;
      }
      const filename = `${sanitizeFilename(conversation.title || 'conversacion')}_dialogo.wav`;
      triggerFileDownload(blob, filename);
    } catch (err) {
      console.error('Error al descargar WAV:', err);
    } finally {
      setTimeout(() => setDownloadingFormat(null), 800);
    }
  }, [conversation.fullAudioPcmBase64, conversation.title]);

  const handleCopyTranscript = () => {
    const text = conversation.turns
      .map((t) => `${t.speakerName}: ${t.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Find active turn based on current playback time
  const currentSpeakingTurn: DialogueTurn | undefined = conversation.turns.find(
    (t) =>
      t.startTimeSec !== undefined &&
      t.durationSec !== undefined &&
      currentTime >= t.startTimeSec &&
      currentTime <= t.startTimeSec + t.durationSec + 0.3
  );

  return (
    <div className="bg-neutral-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-neutral-800">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      )}

      {/* Top Title & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isPlaying ? 'bg-indigo-600 animate-pulse' : 'bg-neutral-800'
            }`}
          >
            <Disc className={`w-5 h-5 ${isPlaying ? 'animate-spin' : 'text-neutral-400'}`} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-neutral-100 leading-tight">
              {conversation.title || 'Conversación Generada'}
            </h3>
            <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
              <span className="text-indigo-400 font-medium">
                {conversation.speaker1.name} ({conversation.speaker1.voice})
              </span>
              <span>&bull;</span>
              <span className="text-emerald-400 font-medium">
                {conversation.speaker2.name} ({conversation.speaker2.voice})
              </span>
              <span>&bull;</span>
              <span>{conversation.turns.length} turnos</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: MP3 & WAV Download */}
        <div className="flex items-center gap-2">
          <button
            id="btn-download-mp3"
            type="button"
            onClick={handleDownloadMp3}
            disabled={downloadingFormat === 'mp3'}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02]"
            title="Descargar conversación completa en MP3 (128 kbps)"
          >
            <Download className="w-4 h-4" />
            <span>Descargar MP3</span>
          </button>

          <button
            id="btn-download-wav"
            type="button"
            onClick={handleDownloadWav}
            disabled={downloadingFormat === 'wav'}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-xl border border-neutral-700 transition-colors"
            title="Descargar audio sin compresión (WAV 24kHz)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WAV</span>
          </button>

          <button
            type="button"
            onClick={handleCopyTranscript}
            className="p-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
            title="Copiar guion transcrito"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Currently Speaking Subtitle / Indicator */}
      <div className="my-4 min-h-[44px] bg-neutral-950/80 rounded-xl px-4 py-2.5 border border-neutral-800/80 flex items-center justify-between">
        {currentSpeakingTurn ? (
          <div className="flex items-center gap-3 w-full">
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                currentSpeakingTurn.speakerIndex === 1
                  ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50'
                  : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
              }`}
            >
              {currentSpeakingTurn.speakerName}
            </span>
            <p className="text-xs text-neutral-200 italic line-clamp-1 flex-1">
              "{currentSpeakingTurn.text}"
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Volume2 className="w-3.5 h-3.5" />
            <span>
              {isPlaying
                ? 'Reproduciendo diálogo...'
                : 'Presiona reproducir para escuchar la conversación entre ambos interlocutores'}
            </span>
          </div>
        )}
      </div>

      {/* Timeline Scrubber */}
      <div className="space-y-1.5 mb-3">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-hidden"
          />
        </div>
        <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
          <span>{formatSeconds(currentTime)}</span>
          <span>{formatSeconds(duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {/* Speed Buttons */}
          <div className="flex items-center bg-neutral-800/90 rounded-lg p-0.5 text-[11px] font-medium border border-neutral-700/60">
            {[0.8, 1, 1.25, 1.5].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  playbackRate === speed
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Center Main Play / Pause Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="p-2 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-full transition-colors"
            title="Reiniciar reproducción"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="btn-master-play"
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-transform active:scale-95"
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Audio Format Info Badge */}
        <div className="text-right">
          <span className="text-[10px] text-neutral-500 block font-mono">
            PCM 24kHz &bull; 16-bit
          </span>
          <span className="text-[10px] text-emerald-400 font-medium">
            Listo para MP3
          </span>
        </div>
      </div>
    </div>
  );
};
