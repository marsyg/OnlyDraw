export interface KeybindingDef {
  id: string;
  key: string; // e.g. 'v', 'z', '0', '?'
  code?: string; // e.g. 'KeyV', 'Space'
  ctrl?: boolean; // Matches ctrlKey or metaKey (Command on Mac)
  shift?: boolean;
  alt?: boolean;
  action: string;
  category: 'Tools' | 'Edit' | 'View' | 'Help';
  description: string;
  displayKeys: string[];
}

export const KEYBINDINGS: KeybindingDef[] = [
  // Tools
  {
    id: 'tool.select',
    key: 'v',
    action: 'tool.select',
    category: 'Tools',
    description: 'Select tool',
    displayKeys: ['V'],
  },
  {
    id: 'tool.rectangle',
    key: 'r',
    action: 'tool.rectangle',
    category: 'Tools',
    description: 'Rectangle tool',
    displayKeys: ['R'],
  },
  {
    id: 'tool.ellipse',
    key: 'e',
    action: 'tool.ellipse',
    category: 'Tools',
    description: 'Circle / Ellipse tool',
    displayKeys: ['E'],
  },
  {
    id: 'tool.line',
    key: 'l',
    action: 'tool.line',
    category: 'Tools',
    description: 'Line tool',
    displayKeys: ['L'],
  },
  {
    id: 'tool.freehand',
    key: 'p',
    action: 'tool.freehand',
    category: 'Tools',
    description: 'Pencil / Freehand tool',
    displayKeys: ['P'],
  },
  {
    id: 'tool.text',
    key: 't',
    action: 'tool.text',
    category: 'Tools',
    description: 'Text tool',
    displayKeys: ['T'],
  },
  {
    id: 'tool.image',
    key: 'i',
    action: 'tool.image',
    category: 'Tools',
    description: 'Insert Image tool',
    displayKeys: ['I'],
  },

  // Edit
  {
    id: 'edit.undo',
    key: 'z',
    ctrl: true,
    action: 'edit.undo',
    category: 'Edit',
    description: 'Undo',
    displayKeys: ['Ctrl', 'Z'],
  },
  {
    id: 'edit.redo',
    key: 'y',
    ctrl: true,
    action: 'edit.redo',
    category: 'Edit',
    description: 'Redo',
    displayKeys: ['Ctrl', 'Y'],
  },
  {
    id: 'edit.redo-shift',
    key: 'z',
    ctrl: true,
    shift: true,
    action: 'edit.redo',
    category: 'Edit',
    description: 'Redo (alternative)',
    displayKeys: ['Ctrl', 'Shift', 'Z'],
  },
  {
    id: 'edit.copy',
    key: 'c',
    ctrl: true,
    action: 'edit.copy',
    category: 'Edit',
    description: 'Copy selected element',
    displayKeys: ['Ctrl', 'C'],
  },
  {
    id: 'edit.paste',
    key: 'v',
    ctrl: true,
    action: 'edit.paste',
    category: 'Edit',
    description: 'Paste copied element',
    displayKeys: ['Ctrl', 'V'],
  },
  {
    id: 'edit.duplicate',
    key: 'd',
    ctrl: true,
    action: 'edit.duplicate',
    category: 'Edit',
    description: 'Duplicate selected element',
    displayKeys: ['Ctrl', 'D'],
  },
  {
    id: 'edit.cut',
    key: 'x',
    ctrl: true,
    action: 'edit.cut',
    category: 'Edit',
    description: 'Cut selected element',
    displayKeys: ['Ctrl', 'X'],
  },
  {
    id: 'edit.delete',
    key: 'Delete',
    action: 'edit.delete',
    category: 'Edit',
    description: 'Delete selected element',
    displayKeys: ['Del'],
  },
  {
    id: 'edit.backspace',
    key: 'Backspace',
    action: 'edit.delete',
    category: 'Edit',
    description: 'Delete selected element',
    displayKeys: ['Backspace'],
  },
  {
    id: 'edit.deselect',
    key: 'Escape',
    action: 'edit.deselect',
    category: 'Edit',
    description: 'Deselect / Cancel',
    displayKeys: ['Esc'],
  },
  {
    id: 'edit.group',
    key: 'g',
    ctrl: true,
    action: 'edit.group',
    category: 'Edit',
    description: 'Group selected elements',
    displayKeys: ['Ctrl', 'G'],
  },
  {
    id: 'edit.ungroup',
    key: 'g',
    ctrl: true,
    shift: true,
    action: 'edit.ungroup',
    category: 'Edit',
    description: 'Ungroup selected elements',
    displayKeys: ['Ctrl', 'Shift', 'G'],
  },

  // View
  {
    id: 'view.resetZoom',
    key: '0',
    ctrl: true,
    action: 'view.resetZoom',
    category: 'View',
    description: 'Reset zoom to 100%',
    displayKeys: ['Ctrl', '0'],
  },
  {
    id: 'view.zoomIn',
    key: '=',
    ctrl: true,
    action: 'view.zoomIn',
    category: 'View',
    description: 'Zoom in',
    displayKeys: ['Ctrl', '+'],
  },
  {
    id: 'view.zoomOut',
    key: '-',
    ctrl: true,
    action: 'view.zoomOut',
    category: 'View',
    description: 'Zoom out',
    displayKeys: ['Ctrl', '-'],
  },
  {
    id: 'view.pan',
    key: ' ',
    code: 'Space',
    action: 'view.pan',
    category: 'View',
    description: 'Pan canvas (hold and drag)',
    displayKeys: ['Space'],
  },

  // Help
  {
    id: 'help.dialog',
    key: '?',
    action: 'help.toggle',
    category: 'Help',
    description: 'Show keyboard shortcuts',
    displayKeys: ['?'],
  },
];
