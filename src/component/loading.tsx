'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#fbfbfa] dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 transition-colors select-none">
      <div className="flex flex-col items-center max-w-xs w-full px-6 space-y-6">
        {/* App Icon or Brand Emblem */}
        <div className="relative w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-sm">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-sm font-bold text-sm tracking-tight">
            OD
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="text-center space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">OnlyDraw</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Initializing canvas workspace...
          </p>
        </div>

        {/* Modern Animated Progress Track */}
        <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden relative">
          <div className="h-full bg-blue-600 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
        </div>
      </div>

      <style jsx>{`
        @keyframes loading {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 60%;
            margin-left: 20%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
