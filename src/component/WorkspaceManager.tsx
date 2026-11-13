'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Check,
  X,
  Search,
} from 'lucide-react';
import {
  getStoredWorkspaces,
  getStoredActiveWorkspaceId,
  createWorkspace,
  renameWorkspace,
  duplicateWorkspace,
  deleteWorkspace,
  setActiveWorkspaceId,
} from '@/Store/yjs-store';
import { WorkspaceMeta } from '@/types/type';

interface WorkspaceManagerProps {
  isDark?: boolean;
}

export default function WorkspaceManager({ isDark = false }: WorkspaceManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceMeta[]>([]);
  const [activeId, setActiveId] = useState<string>('default');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state on mount and on storage events
  useEffect(() => {
    const refresh = () => {
      setWorkspaces(getStoredWorkspaces());
      setActiveId(getStoredActiveWorkspaceId());
    };
    refresh();

    const handleUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ workspaces: WorkspaceMeta[] }>;
      if (custom.detail?.workspaces) {
        setWorkspaces(custom.detail.workspaces);
      } else {
        refresh();
      }
    };

    const handleChanged = (e: Event) => {
      const custom = e as CustomEvent<{ workspaceId: string }>;
      if (custom.detail?.workspaceId) {
        setActiveId(custom.detail.workspaceId);
      } else {
        refresh();
      }
    };

    window.addEventListener('canvas:workspaces-updated', handleUpdated);
    window.addEventListener('canvas:workspace-changed', handleChanged);

    return () => {
      window.removeEventListener('canvas:workspaces-updated', handleUpdated);
      window.removeEventListener('canvas:workspace-changed', handleChanged);
    };
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingId(null);
        setIsCreatingNew(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeWorkspace = workspaces.find((w) => w.id === activeId) || {
    id: 'default',
    name: 'Main Canvas',
  };

  const handleSwitch = (id: string) => {
    if (id === activeId) {
      setIsOpen(false);
      return;
    }
    setActiveWorkspaceId(id);
    setActiveId(id);
    setIsOpen(false);
  };

  const handleStartRename = (ws: WorkspaceMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(ws.id);
    setEditName(ws.name);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      renameWorkspace(id, editName.trim());
      setWorkspaces(getStoredWorkspaces());
    }
    setEditingId(null);
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newWs = duplicateWorkspace(id);
    setWorkspaces(getStoredWorkspaces());
    setActiveId(newWs.id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (workspaces.length <= 1) return;
    deleteWorkspace(id);
    setWorkspaces(getStoredWorkspaces());
    setActiveId(getStoredActiveWorkspaceId());
  };

  const handleCreateNew = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newWorkspaceName.trim() || `Workspace ${workspaces.length + 1}`;
    const created = createWorkspace(name);
    setWorkspaces(getStoredWorkspaces());
    setActiveId(created.id);
    setNewWorkspaceName('');
    setIsCreatingNew(false);
    setIsOpen(false);
  };

  const filteredWorkspaces = workspaces.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative select-none">
      {/* ── Trigger Button ── */}
      <motion.button
        id="workspace-manager-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 backdrop-blur-md shadow-lg transition-all border ${
          isDark
            ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100 hover:bg-zinc-800'
            : 'bg-white/90 border-zinc-200 text-zinc-800 hover:bg-zinc-100 shadow-sm'
        }`}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        title="Switch or manage workspaces"
      >
        <div className="w-5 h-5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center flex-shrink-0">
          <Layers size={13} className="text-blue-500" />
        </div>
        <span className="max-w-[130px] truncate font-medium">{activeWorkspace.name}</span>
        <ChevronDown
          size={13}
          className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      {/* ── Dropdown Popover ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className={`absolute top-full mt-2 left-0 w-72 rounded-2xl p-2.5 border shadow-2xl backdrop-blur-xl z-50 ${
              isDark
                ? 'bg-zinc-900/98 border-zinc-800 text-zinc-100 shadow-black/60'
                : 'bg-white/98 border-zinc-200 text-zinc-800 shadow-zinc-300/60'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-1.5">
                <Layers size={14} className="text-blue-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Workspaces ({workspaces.length})
                </span>
              </div>
              <button
                onClick={() => setIsCreatingNew((v) => !v)}
                className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                title="Create New Workspace"
              >
                <Plus size={13} />
                <span>New</span>
              </button>
            </div>

            {/* Quick create inline form */}
            {isCreatingNew && (
              <form onSubmit={handleCreateNew} className="p-2 mt-1.5 mb-1.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Workspace name..."
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark
                      ? 'bg-zinc-950 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                      : 'bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400'
                  }`}
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="px-2 py-1 text-[10px] rounded font-medium text-zinc-400 hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-[10px] rounded font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {/* Search if more than 3 workspaces */}
            {workspaces.length > 3 && (
              <div className="mt-2 px-1">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search workspaces..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-7 pr-2 py-1 text-xs rounded-lg border transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      isDark
                        ? 'bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder-zinc-500'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Workspaces List */}
            <div className="mt-2 max-h-60 overflow-y-auto space-y-1 pr-0.5">
              {filteredWorkspaces.map((ws) => {
                const isActive = ws.id === activeId;
                const isEditing = editingId === ws.id;

                return (
                  <div
                    key={ws.id}
                    onClick={() => !isEditing && handleSwitch(ws.id)}
                    className={`group px-2.5 py-2 rounded-xl flex items-center justify-between transition-all cursor-pointer border ${
                      isActive
                        ? isDark
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-100 font-semibold'
                          : 'bg-zinc-100 border-zinc-300 text-zinc-900 font-semibold'
                        : isDark
                        ? 'hover:bg-zinc-800/60 border-transparent text-zinc-300'
                        : 'hover:bg-zinc-100/80 border-transparent text-zinc-700'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(ws.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className={`flex-1 px-2 py-1 text-xs rounded border transition-colors focus:outline-none ${
                            isDark
                              ? 'bg-zinc-950 border-blue-500 text-zinc-100'
                              : 'bg-white border-blue-500 text-zinc-800'
                          }`}
                        />
                        <button
                          onClick={() => handleSaveRename(ws.id)}
                          className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                          title="Save"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-zinc-400 hover:bg-zinc-400/10 rounded"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          {isActive ? (
                            <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-transparent flex-shrink-0" />
                          )}
                          <span className={`text-xs truncate ${isActive ? 'font-semibold text-zinc-100' : 'font-medium'}`}>
                            {ws.name}
                          </span>
                        </div>

                        {/* Action buttons (Rename, Duplicate, Delete) */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleStartRename(ws, e)}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            title="Rename"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => handleDuplicate(ws.id, e)}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            title="Duplicate"
                          >
                            <Copy size={12} />
                          </button>
                          {workspaces.length > 1 && (
                            <button
                              onClick={(e) => handleDelete(ws.id, e)}
                              className="p-1 rounded hover:bg-red-500/15 text-zinc-400 hover:text-red-500 transition-colors"
                              title="Delete workspace"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Create Button */}
            {!isCreatingNew && (
              <div className="pt-2 mt-1 border-t border-zinc-200/80 dark:border-zinc-800/80">
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isDark
                      ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  }`}
                >
                  <Plus size={13} />
                  <span>Create Workspace</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
