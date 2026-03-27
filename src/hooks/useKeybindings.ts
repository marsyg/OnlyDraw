'use client';

import { useEffect, useRef } from 'react';
import { KEYBINDINGS, KeybindingDef } from '@/lib/keybindings';

export type KeybindingActionMap = Partial<Record<string, (e: KeyboardEvent) => void>>;

interface UseKeybindingsOptions {
  actionMap: KeybindingActionMap;
  onSpaceDown?: () => void;
  onSpaceUp?: () => void;
  isEnabled?: boolean;
}

export function useKeybindings({
  actionMap,
  onSpaceDown,
  onSpaceUp,
  isEnabled = true,
}: UseKeybindingsOptions) {
  const actionMapRef = useRef(actionMap);
  const onSpaceDownRef = useRef(onSpaceDown);
  const onSpaceUpRef = useRef(onSpaceUp);

  useEffect(() => {
    actionMapRef.current = actionMap;
    onSpaceDownRef.current = onSpaceDown;
    onSpaceUpRef.current = onSpaceUp;
  });

  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = document.activeElement as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Special handling for Space key (panning)
      if (e.code === 'Space') {
        if (!e.repeat && onSpaceDownRef.current) {
          onSpaceDownRef.current();
        }
        // Don't scroll page
        e.preventDefault();
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const pressedKey = e.key;

      const match = KEYBINDINGS.find((kb) => {
        const requiresCtrl = !!kb.ctrl;
        const requiresShift = !!kb.shift;
        const requiresAlt = !!kb.alt;

        if (requiresCtrl !== isCtrl) return false;
        if (requiresShift !== isShift) return false;
        if (requiresAlt !== isAlt) return false;

        if (kb.code && kb.code === e.code) return true;

        if (kb.key === '?') {
          return pressedKey === '?' || (pressedKey === '/' && isShift);
        }

        return kb.key.toLowerCase() === pressedKey.toLowerCase();
      });

      if (match) {
        const handler = actionMapRef.current[match.action];
        if (handler) {
          if (match.action !== 'edit.paste') {
            e.preventDefault();
          }
          handler(e);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (onSpaceUpRef.current) {
          onSpaceUpRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isEnabled]);
}
