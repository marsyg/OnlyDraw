'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useCollabChat } from '@/hooks/useCollabChat';
import {
  MessageSquare,
  Send,
  Users,
  Smile,
  Minus,
  Sparkles,
} from 'lucide-react';

interface CollabChatProps {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  currentUser: { clientId: number; name: string; color: string } | null;
  isCollaborating: boolean;
  participants: Array<{ clientId: number; name: string; color: string }>;
  roomId: string;
  isDark?: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🚀', '💡', '🎉', '👋'];

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CollabChat({
  doc,
  provider,
  currentUser,
  isCollaborating,
  participants,
  roomId,
  isDark = true,
}: CollabChatProps) {
  const {
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
  } = useCollabChat({
    doc,
    provider,
    currentUser,
    isCollaborating,
    participants,
  });

  const [inputVal, setInputVal] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const localClientId = currentUser?.clientId ?? doc.clientID;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, typingUsers]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;
    sendMessage(inputVal);
    setInputVal('');
    setShowEmojiPicker(false);
  };

  const handleEmojiClick = (emoji: string) => {
    sendMessage(emoji);
    setShowEmojiPicker(false);
  };

  // Only show when actively collaborating
  if (!isCollaborating) return null;

  return (
    <>
      {/* ── 1. Floating Notification Toast (When Chat is Minimized) ── */}
      <AnimatePresence>
        {!isOpen && lastNotification && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.92 }}
            onClick={openChat}
            className={`fixed bottom-24 right-4 z-50 max-w-xs p-3 rounded-2xl shadow-xl backdrop-blur-xl border cursor-pointer select-none transition-transform hover:scale-[1.02] active:scale-95 ${
              isDark
                ? 'bg-zinc-900/95 border-zinc-700/80 text-zinc-100 shadow-black/50'
                : 'bg-white/95 border-zinc-200 text-zinc-900 shadow-zinc-300/40'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: lastNotification.senderColor }}
              />
              <span className="text-xs font-bold truncate">{lastNotification.senderName}</span>
              <span className="text-[10px] text-zinc-400 font-mono ml-auto">
                {formatTime(lastNotification.timestamp)}
              </span>
            </div>
            <p className="text-xs text-zinc-300 dark:text-zinc-300 line-clamp-2 leading-relaxed pl-4">
              {lastNotification.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. Floating Chat Dock Button ── */}
      <div className="fixed bottom-20 right-4 z-50 select-none">
        <motion.button
          id="collab-chat-toggle"
          onClick={toggleOpen}
          className={`relative px-3.5 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg backdrop-blur-xl border transition-all ${
            isOpen
              ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
              : isDark
                ? 'bg-zinc-900/95 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                : 'bg-white/95 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
          }`}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          title={isOpen ? 'Minimize Chat' : 'Open Collaboration Chat'}
        >
          <div className="relative">
            <MessageSquare size={16} />
            {/* Live pulsing online beacon */}
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-zinc-900" />
          </div>

          <span className="text-xs font-semibold tracking-wide">
            Chat
          </span>

          {/* Active Participants Count */}
          <div className="flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-800/80 dark:bg-zinc-800 text-zinc-300 border border-zinc-700/60">
            <Users size={10} />
            <span>{participants.length}</span>
          </div>

          {/* Unread Message Badge */}
          {unreadCount > 0 && !isOpen && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shadow-md ring-2 ring-zinc-900 animate-pulse"
            >
              {unreadCount}
            </motion.span>
          )}
        </motion.button>
      </div>

      {/* ── 3. Expandable Chat Window Drawer ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className={`fixed bottom-32 right-4 z-50 w-[340px] max-w-[92vw] h-[460px] max-h-[72vh] flex flex-col rounded-2xl shadow-2xl backdrop-blur-2xl border overflow-hidden ${
              isDark
                ? 'bg-zinc-900/98 border-zinc-800 text-zinc-100 shadow-black/70'
                : 'bg-white/98 border-zinc-200 text-zinc-900 shadow-zinc-300/50'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80 flex-shrink-0 bg-zinc-50/50 dark:bg-zinc-950/40">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                  <MessageSquare size={14} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold tracking-tight truncate">Room Chat</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      #{roomId}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{participants.length} collaborator{participants.length !== 1 ? 's' : ''} active</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={closeChat}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Minimize"
                  aria-label="Minimize chat"
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>

            {/* Online Members Avatars Bar */}
            <div className="px-4 py-2 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-1.5 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider flex-shrink-0">
                In room:
              </span>
              {participants.map((p) => {
                const isMe = p.clientId === localClientId;
                return (
                  <div
                    key={p.clientId}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/70 flex-shrink-0"
                    title={p.name}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="max-w-[70px] truncate">{p.name}</span>
                    {isMe && <span className="text-[9px] text-zinc-400">(You)</span>}
                  </div>
                );
              })}
            </div>

            {/* Messages Scroll View */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
              style={{ scrollbarWidth: 'thin' }}
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-2">
                    <Sparkles size={18} className="text-blue-500" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    No messages yet
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-[200px]">
                    Collaborate and discuss canvas edits with other participants in real-time.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.type === 'system') {
                    return (
                      <div key={msg.id} className="flex justify-center my-1.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  const isMe = msg.senderId === localClientId;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      {!isMe && (
                        <div className="flex items-center gap-1.5 px-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: msg.senderColor }}
                          />
                          <span
                            className="text-[11px] font-bold"
                            style={{ color: msg.senderColor }}
                          >
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed break-words shadow-sm ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-tr-xs'
                            : isDark
                              ? 'bg-zinc-800 border border-zinc-700/80 text-zinc-100 rounded-tl-xs'
                              : 'bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-tl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {isMe && (
                        <span className="text-[9px] font-mono text-zinc-400 px-1">
                          {formatTime(msg.timestamp)}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Live Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 py-1.5 text-[11px] text-zinc-400 flex items-center gap-1.5 bg-zinc-50/50 dark:bg-zinc-950/40 border-t border-zinc-200/40 dark:border-zinc-800/40 flex-shrink-0">
                <div className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                </div>
                <span>
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} is typing...`
                    : `${typingUsers.join(', ')} are typing...`}
                </span>
              </div>
            )}

            {/* Quick Emoji Bar (Collapsible) */}
            {showEmojiPicker && (
              <div className="px-3 py-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between gap-1 bg-zinc-50 dark:bg-zinc-950/60 flex-shrink-0">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-sm transition-transform active:scale-125"
                    title={`Send ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Footer Input Bar */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-1.5 bg-zinc-50/70 dark:bg-zinc-950/70 flex-shrink-0"
            >
              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={`p-2 rounded-xl transition-colors ${
                  showEmojiPicker
                    ? 'text-blue-500 bg-blue-500/10'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
                title="Quick Emoji Reactions"
              >
                <Smile size={16} />
              </button>

              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message..."
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  notifyTyping();
                }}
                className={`flex-1 px-3 py-2 text-xs rounded-xl border transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                    : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                }`}
              />

              <button
                type="submit"
                disabled={!inputVal.trim()}
                className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 flex-shrink-0"
                title="Send Message"
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

