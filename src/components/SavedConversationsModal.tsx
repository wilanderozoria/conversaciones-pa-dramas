import React from 'react';
import { X, Download, Play, Trash2, Calendar, Headphones } from 'lucide-react';
import { Conversation } from '../types';
import { base64ToInt16Array, pcmToMp3Blob, triggerFileDownload } from '../utils/audio';

interface SavedConversationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onLoadConversation: (conv: Conversation) => void;
  onDeleteConversation: (id: string) => void;
}

export const SavedConversationsModal: React.FC<SavedConversationsModalProps> = ({
  isOpen,
  onClose,
  conversations,
  onLoadConversation,
  onDeleteConversation,
}) => {
  if (!isOpen) return null;

  const handleDownloadSavedMp3 = (conv: Conversation) => {
    if (!conv.fullAudioPcmBase64) return;
    try {
      const pcm = base64ToInt16Array(conv.fullAudioPcmBase64);
      const mp3Blob = pcmToMp3Blob(pcm, 24000, 128);
      const safeName = (conv.title || 'dialogo')
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúñ]+/gi, '_');
      triggerFileDownload(mp3Blob, `${safeName}.mp3`);
    } catch (e) {
      console.error('Error al descargar MP3 guardado:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-800">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Biblioteca de Conversaciones
              </h3>
              <p className="text-xs text-neutral-500">
                Tus diálogos generados con audio listos para reproducir y descargar en MP3
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {conversations.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 space-y-2">
              <Headphones className="w-10 h-10 mx-auto opacity-40 text-neutral-300" />
              <p className="text-sm font-medium text-neutral-600">
                Aún no tienes conversaciones guardadas
              </p>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                Genera un diálogo con dos interlocutores y sintetiza el audio para guardarlo aquí y descargarlo en MP3 cuando desees.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const formattedDate = new Date(conv.createdAt).toLocaleDateString('es-ES', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={conv.id}
                  className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <h4 className="font-semibold text-sm text-neutral-900 leading-tight">
                      {conv.title}
                    </h4>
                    <p className="text-xs text-neutral-500 line-clamp-1">
                      {conv.topic}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                      <span>&bull;</span>
                      <span>
                        {conv.speaker1.name} ({conv.speaker1.voice}) y {conv.speaker2.name} ({conv.speaker2.voice})
                      </span>
                      <span>&bull;</span>
                      <span>{conv.turns.length} turnos</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadConversation(conv);
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Cargar</span>
                    </button>

                    {conv.fullAudioPcmBase64 && (
                      <button
                        type="button"
                        onClick={() => handleDownloadSavedMp3(conv)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-all flex items-center gap-1.5"
                        title="Descargar archivo MP3"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>MP3</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteConversation(conv.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar de la biblioteca"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
