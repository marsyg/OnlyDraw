'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export interface CollabChatMessage {
  id: string;
  senderId: number;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  type?: 'user' | 'system';
}

interface UseCollabChatProps {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  currentUser: { clientId: number; name: string; color: string } | null;
  isCollaborating: boolean;
  participants: Array<{ clientId: number; name: string; color: string }>;
}

export function useCollabChat({
  doc,
  provider,
  currentUser,
  isCollaborating,
  participants,
}: UseCollabChatProps) {
  const [messages, setMessages] = useState<CollabChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState<CollabChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousParticipantIdsRef = useRef<Set<number>>(new Set());

  // ── 1. Bind to Y.Array('collab-chat') for Real-time Synchronized Messages ──
  useEffect(() => {
    if (!isCollaborating || !doc) {
      setMessages([]);
      setUnreadCount(0);
      setLastNotification(null);
      return;
    }

    const yChat = doc.getArray<CollabChatMessage>('collab-chat');

    const updateMessages = () => {
      const allMsgs = yChat.toArray();
      setMessages(allMsgs);

      // If chat is currently closed, check if the newest message is from a peer
      if (!isOpenRef.current && allMsgs.length > 0) {
        const last = allMsgs[allMsgs.length - 1];
        const localClientId = currentUser?.clientId ?? doc.clientID;
        if (last && last.senderId !== localClientId) {
          setUnreadCount((prev) => prev + 1);
          setLastNotification(last);

          if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
          }
          notificationTimeoutRef.current = setTimeout(() => {
            setLastNotification(null);
          }, 4500);
        }
      }
    };

    updateMessages();
    yChat.observe(updateMessages);

    return () => {
      yChat.unobserve(updateMessages);
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [isCollaborating, doc, currentUser?.clientId]);

  // ── 2. Track Awareness for Live Typing Indicators ─────────────────────────
  useEffect(() => {
    if (!isCollaborating || !provider) {
      setTypingUsers([]);
      return;
    }

    const awareness = provider.awareness;
    const localClientId = currentUser?.clientId ?? doc.clientID;

    const handleAwareness = () => {
      const states = awareness.getStates();
      const typing: string[] = [];

      states.forEach((state, clientId) => {
        if (clientId !== localClientId && state.isTyping && state.user?.name) {
          typing.push(state.user.name);
        }
      });

      setTypingUsers(typing);
    };

    awareness.on('change', handleAwareness);
    return () => {
      awareness.off('change', handleAwareness);
    };
  }, [isCollaborating, provider, currentUser?.clientId, doc.clientID]);

  // ── 3. Announce Peer Joins (System Messages) ──────────────────────────────
  useEffect(() => {
    if (!isCollaborating || participants.length === 0) return;

    const currentIds = new Set(participants.map((p) => p.clientId));
    const prevIds = previousParticipantIdsRef.current;
    const localClientId = currentUser?.clientId ?? doc.clientID;

    // Detect newly joined peers
    participants.forEach((p) => {
      if (!prevIds.has(p.clientId) && p.clientId !== localClientId && prevIds.size > 0) {
        // A peer just joined the room
        const yChat = doc.getArray<CollabChatMessage>('collab-chat');
        const joinMsg: CollabChatMessage = {
          id: `sys-${Date.now()}-${p.clientId}`,
          senderId: 0,
          senderName: 'System',
          senderColor: p.color || '#3b82f6',
          text: `${p.name || 'A collaborator'} joined the canvas.`,
          timestamp: Date.now(),
          type: 'system',
        };
        yChat.push([joinMsg]);
      }
    });

    previousParticipantIdsRef.current = currentIds;
  }, [participants, isCollaborating, currentUser?.clientId, doc]);

  // ── 4. Message Actions ───────────────────────────────────────────────────
  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !isCollaborating) return;

      const yChat = doc.getArray<CollabChatMessage>('collab-chat');
      const localClientId = currentUser?.clientId ?? doc.clientID;

      const newMsg: CollabChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        senderId: localClientId,
        senderName: currentUser?.name || 'Anonymous',
        senderColor: currentUser?.color || '#3b82f6',
        text: trimmed,
        timestamp: Date.now(),
        type: 'user',
      };

      yChat.push([newMsg]);

      // Prune chat history if exceeds 200 messages to maintain high performance
      if (yChat.length > 250) {
        doc.transact(() => {
          yChat.delete(0, yChat.length - 200);
        });
      }

      // Clear typing indicator immediately
      if (provider?.awareness) {
        provider.awareness.setLocalStateField('isTyping', false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    },
    [doc, isCollaborating, currentUser, provider],
  );

  const notifyTyping = useCallback(() => {
    if (!provider?.awareness) return;

    provider.awareness.setLocalStateField('isTyping', true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (provider?.awareness) {
        provider.awareness.setLocalStateField('isTyping', false);
      }
    }, 2500);
  }, [provider]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setUnreadCount(0);
        setLastNotification(null);
      }
      return next;
    });
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
    setLastNotification(null);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    messages,
    isOpen,
    unreadCount,
    lastNotification,
    typingUsers,
    sendMessage,
    notifyTyping,
    toggleOpen,
    openChat,
    closeChat,
  };
}

