import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WorkspaceMeta } from '@/types/type';

export const LOCAL_ORIGIN = { local: true };
export const LIVE_ORIGIN = { live: true };

const WORKSPACES_STORAGE_KEY = 'canvas_workspaces';
const ACTIVE_WORKSPACE_STORAGE_KEY = 'canvas_active_workspace';

export interface WorkspaceInstance {
  id: string;
  doc: Y.Doc;
  elements: Y.Map<Y.Map<unknown>>;
  order: Y.Array<string>;
  persistence: IndexeddbPersistence | null;
  undoManager: Y.UndoManager;
}

const globalStore = globalThis as unknown as {
  __canvas_workspace_instances__?: Map<string, WorkspaceInstance>;
  __canvas_active_workspace_id__?: string;
};

const workspaceInstances =
  globalStore.__canvas_workspace_instances__ ?? new Map<string, WorkspaceInstance>();
globalStore.__canvas_workspace_instances__ = workspaceInstances;

export function getStoredWorkspaces(): WorkspaceMeta[] {
  if (typeof window === 'undefined') {
    return [
      {
        id: 'default',
        name: 'Main Canvas',
        createdAt: 1718000000000,
        updatedAt: 1718000000000,
      },
    ];
  }
  try {
    const raw = localStorage.getItem(WORKSPACES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Workspace] Error loading workspaces from localStorage:', err);
  }
  const defaultList: WorkspaceMeta[] = [
    {
      id: 'default',
      name: 'Main Canvas',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
  try {
    localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(defaultList));
  } catch {}
  return defaultList;
}

export function saveStoredWorkspaces(list: WorkspaceMeta[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WORKSPACES_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('canvas:workspaces-updated', { detail: { workspaces: list } }));
  } catch (err) {
    console.warn('[Workspace] Error saving workspaces:', err);
  }
}

export function getStoredActiveWorkspaceId(): string {
  if (globalStore.__canvas_active_workspace_id__) {
    return globalStore.__canvas_active_workspace_id__;
  }
  if (typeof window === 'undefined') return 'default';
  try {
    const id = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    if (id) {
      globalStore.__canvas_active_workspace_id__ = id;
      return id;
    }
  } catch {}
  globalStore.__canvas_active_workspace_id__ = 'default';
  return 'default';
}

export function getWorkspaceInstance(id: string): WorkspaceInstance {
  const existing = workspaceInstances.get(id);
  if (existing) return existing;

  const doc = new Y.Doc();
  const elements = doc.getMap<Y.Map<unknown>>('elements');
  const order = doc.getArray<string>('order');

  let persistence: IndexeddbPersistence | null = null;
  if (typeof window !== 'undefined') {
    try {
      const dbName = id === 'default' ? 'canvas-v1' : `canvas-ws-${id}`;
      persistence = new IndexeddbPersistence(dbName, doc);
      persistence.on('synced', () => {
        window.dispatchEvent(new CustomEvent('canvas:redraw'));
      });
    } catch (err) {
      console.warn(`[IndexedDB] Error initializing persistence for workspace ${id}:`, err);
    }
  }

  const undoManager = new Y.UndoManager([elements ,order], {
    captureTimeout: 500,
    trackedOrigins: new Set([LOCAL_ORIGIN]),
  });

  const instance: WorkspaceInstance = {
    id,
    doc,
    elements,
    order,
    persistence,
    undoManager,
  };

  workspaceInstances.set(id, instance);
  return instance;
}

export function getActiveWorkspace(): WorkspaceInstance {
  const id = getStoredActiveWorkspaceId();
  return getWorkspaceInstance(id);
}

export function setActiveWorkspaceId(id: string): void {
  globalStore.__canvas_active_workspace_id__ = id;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, id);
    } catch {}
    window.dispatchEvent(
      new CustomEvent('canvas:workspace-changed', { detail: { workspaceId: id } })
    );
  }
}

export function createWorkspace(name?: string): WorkspaceMeta {
  const workspaces = getStoredWorkspaces();
  const newId = `ws_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const workspaceName = name?.trim() || `Workspace ${workspaces.length + 1}`;
  const newMeta: WorkspaceMeta = {
    id: newId,
    name: workspaceName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updatedList = [...workspaces, newMeta];
  saveStoredWorkspaces(updatedList);
  setActiveWorkspaceId(newId);
  return newMeta;
}

export function renameWorkspace(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const workspaces = getStoredWorkspaces();
  const updatedList = workspaces.map((w) =>
    w.id === id ? { ...w, name: trimmed, updatedAt: Date.now() } : w
  );
  saveStoredWorkspaces(updatedList);
}

export function duplicateWorkspace(id: string, newName?: string): WorkspaceMeta {
  const workspaces = getStoredWorkspaces();
  const srcMeta = workspaces.find((w) => w.id === id);
  const srcInst = getWorkspaceInstance(id);

  const fallbackName = srcMeta ? `${srcMeta.name} (Copy)` : 'Workspace Copy';
  const newMeta = createWorkspace(newName || fallbackName);
  const destInst = getWorkspaceInstance(newMeta.id);

  destInst.doc.transact(() => {
    srcInst.order.forEach((elId) => {
      const srcEl = srcInst.elements.get(elId);
      if (srcEl) {
        const cloned = new Y.Map<unknown>();
        srcEl.forEach((val, key) => cloned.set(key, val));
        destInst.elements.set(elId, cloned);
        destInst.order.push([elId]);
      }
    });
  }, LOCAL_ORIGIN);

  return newMeta;
}

export function deleteWorkspace(id: string): void {
  const workspaces = getStoredWorkspaces();
  if (workspaces.length <= 1) return; // Never delete the only workspace

  const remaining = workspaces.filter((w) => w.id !== id);
  saveStoredWorkspaces(remaining);

  // If deleted workspace is currently active, switch to first remaining
  if (getStoredActiveWorkspaceId() === id) {
    setActiveWorkspaceId(remaining[0].id);
  }

  const inst = workspaceInstances.get(id);
  if (inst) {
    try {
      inst.persistence?.destroy();
    } catch {}
    workspaceInstances.delete(id);
  }

  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      const dbName = id === 'default' ? 'canvas-v1' : `canvas-ws-${id}`;
      window.indexedDB.deleteDatabase(dbName);
    } catch {}
  }
}

// Global active canvasDoc proxy
export const canvasDoc = {
  get Y() {
    return Y;
  },
  get doc() {
    return getActiveWorkspace().doc;
  },
  get yElement() {
    return getActiveWorkspace().elements;
  },
  get order() {
    return getActiveWorkspace().order;
  },
  get undoManager() {
    return getActiveWorkspace().undoManager;
  },
  get persistence() {
    return getActiveWorkspace().persistence;
  },
  get activeWorkspaceId() {
    return getStoredActiveWorkspaceId();
  },
  switchWorkspace: setActiveWorkspaceId,
  getWorkspaces: getStoredWorkspaces,
  createWorkspace,
  renameWorkspace,
  duplicateWorkspace,
  deleteWorkspace,
};

// Proxy to current active UndoManager so calls always target the active workspace
export const UndoManager = new Proxy({} as Y.UndoManager, {
  get(_target, prop) {
    const um = canvasDoc.undoManager;
    const val = (um as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === 'function') {
      return (val as (...args: unknown[]) => unknown).bind(um);
    }
    return val;
  },
  set(_target, prop, value) {
    (canvasDoc.undoManager as unknown as Record<string | symbol, unknown>)[prop] = value;
    return true;
  },
});

// Proxy to current active persistence
export const persistence = new Proxy({} as unknown as IndexeddbPersistence, {
  get(_target, prop) {
    const p = canvasDoc.persistence;
    if (!p) return undefined;
    const val = (p as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === 'function') {
      return (val as (...args: unknown[]) => unknown).bind(p);
    }
    return val;
  },
});

export default canvasDoc;
