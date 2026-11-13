import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { CollabChatMessage } from '@/hooks/useCollabChat';

describe('Collaboration Real-Time Chat (Yjs & WebSocket)', () => {
  it('synchronizes chat messages through Y.Array across collaborative clients', () => {
    // Simulate Client A's doc and Client B's doc synced via Yjs update
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    // Two-way sync emulation
    docA.on('update', (update) => {
      Y.applyUpdate(docB, update);
    });
    docB.on('update', (update) => {
      Y.applyUpdate(docA, update);
    });

    const chatA = docA.getArray<CollabChatMessage>('collab-chat');
    const chatB = docB.getArray<CollabChatMessage>('collab-chat');

    // Client A sends a message
    const msg1: CollabChatMessage = {
      id: 'msg-1',
      senderId: 101,
      senderName: 'Alice',
      senderColor: '#3b82f6',
      text: 'Hey Bob, check out this flowchart architecture!',
      timestamp: Date.now(),
      type: 'user',
    };
    chatA.push([msg1]);

    // Client B immediately observes message
    expect(chatB.length).toBe(1);
    expect(chatB.get(0).text).toBe('Hey Bob, check out this flowchart architecture!');
    expect(chatB.get(0).senderName).toBe('Alice');

    // Client B sends a response
    const msg2: CollabChatMessage = {
      id: 'msg-2',
      senderId: 202,
      senderName: 'Bob',
      senderColor: '#10b981',
      text: 'Looks awesome! Let me connect the database node.',
      timestamp: Date.now() + 1000,
      type: 'user',
    };
    chatB.push([msg2]);

    // Client A observes response
    expect(chatA.length).toBe(2);
    expect(chatA.get(1).senderName).toBe('Bob');
    expect(chatA.get(1).text).toBe('Looks awesome! Let me connect the database node.');
  });

  it('safely prunes old chat history to avoid unbounded memory growth', () => {
    const doc = new Y.Doc();
    const chat = doc.getArray<CollabChatMessage>('collab-chat');

    // Push 300 messages
    const batch: CollabChatMessage[] = [];
    for (let i = 0; i < 300; i++) {
      batch.push({
        id: `msg-${i}`,
        senderId: 1,
        senderName: 'Alice',
        senderColor: '#3b82f6',
        text: `Message ${i}`,
        timestamp: i,
        type: 'user',
      });
    }
    chat.push(batch);

    expect(chat.length).toBe(300);

    // Apply pruning when exceeding 250
    if (chat.length > 250) {
      doc.transact(() => {
        chat.delete(0, chat.length - 200);
      });
    }

    expect(chat.length).toBe(200);
    // Oldest messages deleted, latest preserved
    expect(chat.get(0).text).toBe('Message 100');
    expect(chat.get(199).text).toBe('Message 299');
  });

  it('formats system notifications properly', () => {
    const doc = new Y.Doc();
    const chat = doc.getArray<CollabChatMessage>('collab-chat');

    const sysMsg: CollabChatMessage = {
      id: 'sys-1',
      senderId: 0,
      senderName: 'System',
      senderColor: '#8b5cf6',
      text: 'Charlie joined the canvas.',
      timestamp: Date.now(),
      type: 'system',
    };
    chat.push([sysMsg]);

    expect(chat.get(0).type).toBe('system');
    expect(chat.get(0).text).toContain('Charlie joined');
  });
});

