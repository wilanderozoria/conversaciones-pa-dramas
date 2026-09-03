import React from 'react';
import { TOPIC_PRESETS } from '../presets';
import { TopicPreset } from '../types';
import { Sparkles, ArrowRight } from 'lucide-react';

interface PresetSelectorProps {
  onSelectPreset: (preset: TopicPreset) => void;
  selectedId?: string;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  onSelectPreset,
  selectedId,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Plantillas sugeridas (1 clic)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {TOPIC_PRESETS.map((p) => {
          const isSelected = selectedId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPreset(p)}
              className={`text-left p-3 rounded-xl border transition-all text-xs flex flex-col justify-between group ${
                isSelected
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/70 text-neutral-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-neutral-800 text-neutral-300'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {p.category}
                  </span>
                  <ArrowRight
                    className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 ${
                      isSelected ? 'text-neutral-400' : 'text-neutral-400'
                    }`}
                  />
                </div>
                <h4 className="font-semibold text-xs leading-snug line-clamp-1 mb-1">
                  {p.title}
                </h4>
                <p
                  className={`text-[11px] line-clamp-2 leading-relaxed ${
                    isSelected ? 'text-neutral-300' : 'text-neutral-500'
                  }`}
                >
                  {p.topic}
                </p>
              </div>

              <div
                className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] ${
                  isSelected
                    ? 'border-neutral-800 text-neutral-400'
                    : 'border-neutral-100 text-neutral-400'
                }`}
              >
                <span>
                  {p.speaker1Name} ({p.speaker1Voice})
                </span>
                <span>vs</span>
                <span>
                  {p.speaker2Name} ({p.speaker2Voice})
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
