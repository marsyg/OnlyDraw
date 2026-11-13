'use client';

import React from 'react';
import { TOOLBAR_ITEM } from '@/types/toolbarData';
import { useAppStore } from '@/Store/store';
import { actionType, elementType } from '@/types/type';

type ToolbarProps = {
  className?: string;
  isDark?: boolean;
};

const Toolbar: React.FC<ToolbarProps> = ({ className, isDark = false }) => {
  const { setActiveToolbarId, toolbar, setCurrentTool, setIsDragging, setIsSelecting } = useAppStore();

  const handleClick = (id: string, action: actionType, elementType: elementType) => {
    setActiveToolbarId(id);
    setCurrentTool({ action, elementType });
    if (action === actionType.Selecting) setIsSelecting(true);
    else setIsSelecting(false);
    if (action === actionType.Dragging) setIsDragging(true);
    else setIsDragging(false);
  };

  return (
    <div
      className={`flex items-center gap-1 p-1.5 rounded-xl border backdrop-blur-md shadow-xl transition-colors select-none ${
        isDark
          ? 'bg-zinc-900/95 border-zinc-800 text-zinc-100 shadow-black/40'
          : 'bg-white/95 border-zinc-200 text-zinc-700 shadow-sm'
      } ${className || ''}`}
    >
      {TOOLBAR_ITEM.map((item) => {
        const isActive = toolbar.activeToolId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleClick(item.id, item.actionType, item.elementType)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title={item.name}
            aria-label={item.name}
          >
            <item.icon size={18} />
          </button>
        );
      })}
    </div>
  );
};

export default Toolbar;
