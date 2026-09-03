import React from 'react';
import { Mic, Headphones, Download, Sparkles, FolderDown } from 'lucide-react';

interface HeaderProps {
  hasActiveAudio: boolean;
  onQuickDownload?: () => void;
  savedCount: number;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasActiveAudio,
  onQuickDownload,
  savedCount,
  onOpenHistory,
}) => {
  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-sm">
            <Headphones className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 leading-none">
                Conversaciones de Audio
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Sparkles className="w-3 h-3" />
                Gemini 2-Speaker TTS
              </span>
            </div>
            <p className="text-xs text-neutral-500 hidden sm:block mt-0.5">
              Genera diálogos realistas entre 2 interlocutores y descárgalos en MP3
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            id="btn-download-project-zip"
            href="/api/download-project-zip"
            download="proyecto-conversaciones-audio.zip"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            title="Descargar código fuente completo en un archivo .ZIP"
          >
            <FolderDown className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Descargar Proyecto (.ZIP)</span>
            <span className="sm:hidden">ZIP</span>
          </a>

          <button
            id="btn-open-history"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            title="Ver conversaciones guardadas"
          >
            <Mic className="w-3.5 h-3.5 text-neutral-500" />
            <span>Biblioteca</span>
            {savedCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-neutral-900 text-white text-[10px] font-bold rounded-full">
                {savedCount}
              </span>
            )}
          </button>

          {hasActiveAudio && onQuickDownload && (
            <button
              id="btn-header-quick-mp3"
              onClick={onQuickDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar MP3</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
