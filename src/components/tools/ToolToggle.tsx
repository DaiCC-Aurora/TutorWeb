'use client';

import { type ReactNode } from 'react';
import { type ToolId } from '@/lib/tools';

interface ToolToggleProps {
  id: ToolId;
  name: string;
  description: string;
  icon: ReactNode;
  enabled: boolean;
  onChange: (id: ToolId, enabled: boolean) => void;
}

export default function ToolToggle({
  id,
  name,
  description,
  icon,
  enabled,
  onChange,
}: ToolToggleProps) {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
        enabled
          ? 'bg-accent-subtle border-accent/30'
          : 'bg-bg-surface dark:bg-bg-card border-border-light hover:border-border-medium'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${
            enabled
              ? 'bg-accent text-white'
              : 'bg-bg-surface dark:bg-bg-card text-text-secondary'
          }`}
        >
          {icon}
        </div>
        <div>
          <h4 className={`text-sm font-medium ${enabled ? 'text-accent' : 'text-text-primary'}`}>
            {name}
          </h4>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
      </div>

      {/* Toggle Switch */}
      <button
        onClick={() => onChange(id, !enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-accent' : 'bg-border-medium'
        }`}
        role="switch"
        aria-checked={enabled}
        aria-label={`Toggle ${name}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}