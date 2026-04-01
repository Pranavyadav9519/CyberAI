"use client";

import { CYBER_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CyberPresetsProps {
  onSelect: (prompt: string) => void;
}

export function CyberPresets({ onSelect }: CyberPresetsProps) {
  return (
    <div className="flex flex-wrap gap-2 px-3 py-2 border-t border-surface-800">
      <span className="text-xs text-surface-500 self-center mr-1">Presets:</span>
      {CYBER_PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.prompt)}
          className={cn(
            "text-xs px-2.5 py-1 rounded-md border border-surface-700",
            "bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-100",
            "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500",
            "flex items-center gap-1"
          )}
          title={`Load ${preset.label} prompt`}
        >
          <span aria-hidden="true">{preset.icon}</span>
          {preset.label}
        </button>
      ))}
    </div>
  );
}
