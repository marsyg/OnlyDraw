'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import getRandomColor from '@/lib/helperfunc/getRandomColor';

interface UseCanvasCollaborationProps {
  doc: Y.Doc;
  userName?: string;
  pointerPosition: [number, number];
}

export function useCanvasCollaboration({
  doc,
  userName: initialUserName = '',
  pointerPosition,
}: UseCanvasCollaborationProps) {
  const [userName, setUserName] = useState<string>(initialUserName);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showRoomInput, setShowRoomInput] = useState(false);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [participants, setParticipants] = useState<
    Array<{ clientId: number; name: string; color: string; cursor?: { x: number; y: number } }>
  >([]);
  const awarenessHandlerRef = useRef<(() => void) | null>(null);
  const unloadHandlerRef = useRef<(() => void) | null>(null);

  const startCollaboration = useCallback(() => {
    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }

    try {
      const serverUrl = process.env.NEXT_PUBLIC_URL;
      if (!serverUrl) {
        console.error('NEXT_PUBLIC_URL is not set');
        alert('Collaboration server URL is not configured.');
        return;
      }

      setConnectionStatus('connecting');

      const userColor = getRandomColor();
      const currentUserName = userName || 'Anonymous';

      const provider = new WebsocketProvider(serverUrl, roomId, doc);
      providerRef.current = provider;

      const awareness = provider.awareness;

      awareness.setLocalState({
        user: {
          name: currentUserName,
          color: userColor,
        },
        cursor: null,
      });

      const handleAwarenessChange = () => {
        const states = awareness.getStates();
        const activeUsers: Array<{
          clientId: number;
          name: string;
          color: string;
          cursor?: { x: number; y: number };
        }> = [];

        states.forEach((state, clientId) => {
          if (state.user) {
            activeUsers.push({
              clientId,
              name: state.user.name || 'Anonymous',
              color: state.user.color || '#666',
              cursor: state.cursor,
            });
          }
        });

        setParticipants(activeUsers);
      };

      awarenessHandlerRef.current = handleAwarenessChange;
      awareness.on('change', handleAwarenessChange);

      provider.on('status', ({ status }: { status: string }) => {
        setConnectionStatus(status as 'disconnected' | 'connecting' | 'connected');
        if (status === 'connected') {
          setIsCollaborating(true);
          setShowRoomInput(false);
        }
      });

      const handleUnload = () => {
        if (providerRef.current) {
          try {
            providerRef.current.awareness.setLocalState(null);
          } catch {}
          providerRef.current.destroy();
        }
      };
      unloadHandlerRef.current = handleUnload;
      window.addEventListener('beforeunload', handleUnload);
    } catch (error) {
      console.error('Collaboration connection error:', error);
      alert('Failed to connect to collaboration server');
      setConnectionStatus('disconnected');
    }
  }, [roomId, userName, doc]);

  const disconnectCollaboration = useCallback(() => {
    if (providerRef.current) {
      try {
        providerRef.current.awareness.setLocalState(null);
      } catch {}

      if (unloadHandlerRef.current) {
        window.removeEventListener('beforeunload', unloadHandlerRef.current);
        unloadHandlerRef.current = null;
      }

      providerRef.current.destroy();
      providerRef.current = null;
      setParticipants([]);
      setIsCollaborating(false);
      setConnectionStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (providerRef.current) {
        try {
          const awareness = providerRef.current.awareness;
          if (awareness && awarenessHandlerRef.current) {
            awareness.off('change', awarenessHandlerRef.current);
          }
        } catch {}
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (unloadHandlerRef.current) {
        window.removeEventListener('beforeunload', unloadHandlerRef.current);
        unloadHandlerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isCollaborating && providerRef.current) {
      const awareness = providerRef.current.awareness;
      const localState = awareness.getLocalState();
      if (localState) {
        awareness.setLocalStateField('cursor', { x: pointerPosition[0], y: pointerPosition[1] });
      }
    }
  }, [pointerPosition, isCollaborating]);

  return {
    userName,
    setUserName,
    isCollaborating,
    roomId,
    setRoomId,
    connectionStatus,
    showRoomInput,
    setShowRoomInput,
    providerRef,
    participants,
    startCollaboration,
    disconnectCollaboration,
    stopCollaboration: disconnectCollaboration,
  };
}
