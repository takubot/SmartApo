"use client";

import React from "react";

const TypingIndicator: React.FC = () => {
  return (
    <div
      className="flex gap-2 sm:gap-3 px-2 sm:px-4 py-3 animate-in fade-in slide-in-from-bottom-3 duration-500"
      aria-live="polite"
      aria-busy
      role="status"
      aria-label="応答を生成中"
    >
      <div className="flex-1">
        <div className="inline-flex items-center rounded-2xl rounded-bl-sm border border-slate-200/80 bg-white/90 px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.55)] backdrop-blur-sm">
          <span className="sr-only">Loading response</span>
          <div className="flex items-center gap-1.5" aria-hidden>
            <span
              className="h-2 w-2 rounded-full bg-sky-400/90 animate-bounce motion-reduce:animate-none"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-2 w-2 rounded-full bg-indigo-400/90 animate-bounce motion-reduce:animate-none"
              style={{ animationDelay: "140ms" }}
            />
            <span
              className="h-2 w-2 rounded-full bg-violet-400/90 animate-bounce motion-reduce:animate-none"
              style={{ animationDelay: "280ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
