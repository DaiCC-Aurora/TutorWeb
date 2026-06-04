'use client';

import { type ReactNode } from 'react';
import { type ConversationType } from '@/contexts/MessageHistoryContext';

export type ChatMode = 'chat' | 'solve' | 'visualize';

interface ModeSelectorProps {
  currentMode: ChatMode;
  onChangeMode: (mode: ChatMode) => void;
}

const modes: {
  id: ChatMode;
  label: string;
  description: string;
  icon: ReactNode;
  color: {
    bg: string;
    border: string;
    text: string;
    accent: string;
  };
}[] = [
  {
    id: 'chat',
    label: 'Chat',
    description: '自由对话',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    color: {
      bg: 'bg-accent-subtle dark:bg-accent-subtle',
      border: 'border-accent/30',
      text: 'text-accent',
      accent: 'bg-accent hover:bg-accent-hover',
    },
  },
  {
    id: 'solve',
    label: 'Solve',
    description: '问题求解',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    color: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-300 dark:border-purple-700',
      text: 'text-purple-700 dark:text-purple-400',
      accent: 'bg-purple-500 hover:bg-purple-600',
    },
  },
  {
    id: 'visualize',
    label: 'Visualize',
    description: '可视化生成',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    color: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-300 dark:border-green-700',
      text: 'text-green-700 dark:text-green-400',
      accent: 'bg-green-500 hover:bg-green-600',
    },
  },
];

export default function ModeSelector({ currentMode, onChangeMode }: ModeSelectorProps) {
  const currentModeData = modes.find((m) => m.id === currentMode) || modes[0];

  return (
    <div className="flex flex-col gap-2">
      {/* 模式选择器 - 顶部横排 */}
      <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-bg-surface dark:bg-bg-card border border-border-light">
        {modes.map((mode) => {
          const isActive = mode.id === currentMode;
          return (
            <button
              key={mode.id}
              onClick={() => onChangeMode(mode.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? `${mode.color.accent} text-white shadow-sm`
                  : 'text-text-secondary hover:bg-bg-surface dark:hover:bg-bg-card'
              }`}
            >
              {mode.icon}
              <span>{mode.label}</span>
              {isActive && (
                <span className={`absolute inset-0 rounded-lg ring-2 ${mode.color.border.replace('border', 'ring')}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* 当前模式说明 */}
      <div className={`px-3 py-2 rounded-lg border text-xs ${currentModeData.color.bg} ${currentModeData.color.text} ${currentModeData.color.border}`}>
        <span className="font-medium">{currentModeData.label} 模式：</span>
        {currentModeData.description === '自由对话' && (
          <span>适合日常问答、知识查询、创意讨论等通用场景。可结合图片进行视觉理解。</span>
        )}
        {currentModeData.description === '问题求解' && (
          <span>适用于数学题、逻辑推理、分步解答等需要详细推导过程的场景。</span>
        )}
        {currentModeData.description === '可视化生成' && (
          <span>支持生成图表、数据可视化、流程图、交互式页面等图形化内容。</span>
        )}
      </div>
    </div>
  );
}
