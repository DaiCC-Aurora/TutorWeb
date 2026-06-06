'use client';

import { useState } from 'react';
import ToolToggle from './ToolToggle';
import { type ToolId, TOOL_DEFINITIONS } from '@/lib/tools';

interface ToolsPanelProps {
  enabledTools: ToolId[];
  onToolsChange: (tools: ToolId[]) => void;
}

// 工具图标定义
const TOOL_ICONS: Record<ToolId, React.ReactNode> = {
  web_search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  ask_user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  web_fetch: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 13h6m-6 4h6"
      />
    </svg>
  ),
};

export default function ToolsPanel({ enabledTools, onToolsChange }: ToolsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToolChange = (id: ToolId, enabled: boolean) => {
    if (enabled) {
      onToolsChange([...enabledTools, id]);
    } else {
      onToolsChange(enabledTools.filter((t) => t !== id));
    }
  };

  const allToolIds: ToolId[] = ['web_search', 'ask_user', 'web_fetch'];

  return (
    <div className="relative">
      {/* 工具按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          enabledTools.length > 0
            ? 'bg-accent text-white'
            : 'bg-bg-surface dark:bg-bg-card text-text-secondary hover:text-text-primary border border-border-light'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span>工具</span>
        {enabledTools.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
            {enabledTools.length}
          </span>
        )}
      </button>

      {/* 工具面板下拉 */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-20 w-72 bg-bg-card dark:bg-bg-primary rounded-xl border border-border-light shadow-lg overflow-hidden">
          <div className="p-3 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary">扩展工具</h3>
            <p className="text-xs text-text-secondary mt-1">
              启用工具以增强 AI 能力
            </p>
          </div>

          <div className="p-3 space-y-3">
            {allToolIds.map((id) => {
              const def = TOOL_DEFINITIONS[id];
              return (
                <ToolToggle
                  key={id}
                  id={id}
                  name={def.name}
                  description={def.description}
                  icon={TOOL_ICONS[id]}
                  enabled={enabledTools.includes(id)}
                  onChange={handleToolChange}
                />
              );
            })}
          </div>

          {/* 提示信息 */}
          <div className="p-3 bg-bg-surface dark:bg-bg-card border-t border-border-light">
            <p className="text-xs text-text-tertiary">
              启用工具后，AI 将在适当时机自动调用
            </p>
          </div>
        </div>
      )}
    </div>
  );
}