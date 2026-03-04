"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import {
  markdownComponents,
  markdownStyles,
  reactMarkdownPlugins,
} from "@common/reactMarkdown";

interface StreamingMarkdownProps {
  text: string;
  isStreaming?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const trimTrailingNewlines = (text: string): string => text.replace(/\n+$/, "");

const StreamingMarkdown: React.FC<StreamingMarkdownProps> = ({
  text,
  isStreaming = false,
  className,
  style,
}) => {
  const trimmedText = useMemo(() => trimTrailingNewlines(text), [text]);
  const [displayedText, setDisplayedText] = useState(
    isStreaming ? "" : trimmedText,
  );
  const [isComplete, setIsComplete] = useState(!isStreaming);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(trimmedText);
      setIsComplete(true);
      return;
    }
    setDisplayedText("");
    setIsComplete(false);
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex += 1;
      setDisplayedText(trimmedText.slice(0, currentIndex));
      if (currentIndex >= trimmedText.length) {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, 160);
    return () => clearInterval(interval);
  }, [isStreaming, trimmedText]);

  const caret = useMemo(() => {
    if (!isStreaming || isComplete) return null;
    return (
      <span
        style={{
          display: "inline-block",
          width: "2px",
          height: "1em",
          backgroundColor: "#374151",
          marginLeft: "2px",
          animation: "blink 1s steps(2, start) infinite",
          verticalAlign: "baseline",
        }}
      />
    );
  }, [isComplete, isStreaming]);

  const componentsWithCaret = useMemo(() => {
    if (!isStreaming || isComplete) return markdownComponents;
    const customComponents: Components = {
      ...markdownComponents,
      p: ({ children, ...props }) =>
        React.createElement(
          "p",
          { ...props },
          children as React.ReactNode,
          caret,
        ),
    };
    return customComponents;
  }, [isComplete, isStreaming, caret]);

  return (
    <div className={className} style={style}>
      <style>{markdownStyles}</style>
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={reactMarkdownPlugins}
        components={componentsWithCaret}
        className="markdown-content"
      >
        {displayedText}
      </ReactMarkdown>
    </div>
  );
};

export default StreamingMarkdown;
