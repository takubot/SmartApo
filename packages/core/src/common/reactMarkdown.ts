import React from "react";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export const markdownStyles = `
  .markdown-content {
    line-height: 1.5;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  .markdown-content br {
    display: inline;
    content: "";
    margin: 0;
    padding: 0;
  }
  .markdown-content p {
    margin: 0 0 0.8rem 0;
    line-height: 1.6;
  }
  .markdown-content p:last-child {
    margin-bottom: 0;
  }
  .markdown-content h1 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 1.5rem 0 1rem;
    line-height: 1.3;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 0.5rem;
  }
  .markdown-content h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 1.25rem 0 0.75rem;
    line-height: 1.4;
    border-bottom: 1px solid #f3f4f6;
    padding-bottom: 0.25rem;
  }
  .markdown-content h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem;
    line-height: 1.4;
  }
  .markdown-content h4, .markdown-content h5, .markdown-content h6 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0.75rem 0 0.5rem;
    line-height: 1.5;
  }
  .markdown-content ul, .markdown-content ol {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
  }
  .markdown-content li {
    margin-bottom: 0.3rem;
    line-height: 1.6;
  }
  /* リスト内のpタグのマージンをリセットして行間が開きすぎるのを防ぐ */
  .markdown-content li > p {
    margin: 0;
  }
  .markdown-content li > ul, .markdown-content li > ol {
    margin: 0.4rem 0 0;
  }
  .markdown-content table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 1rem 0;
    font-size: 0.875rem;
    overflow: hidden;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }
  .markdown-content thead {
    background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
  }
  .markdown-content th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #e5e7eb;
    white-space: nowrap;
  }
  .markdown-content td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f3f4f6;
    color: #4b5563;
  }
  .markdown-content tbody tr:last-child td {
    border-bottom: none;
  }
  .markdown-content tbody tr:hover {
    background-color: #f9fafb;
    transition: background-color 0.15s ease;
  }
  .markdown-content pre {
    background: #1e293b;
    color: #e2e8f0;
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 1rem 0;
    overflow-x: auto;
    font-size: 0.875rem;
    line-height: 1.5;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  .markdown-content code {
    font-family: 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace;
  }
  .markdown-content :not(pre) > code {
    background: rgba(147, 197, 253, 0.2);
    color: #1e40af;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    font-weight: 500;
  }
  .markdown-content blockquote {
    border-left: 4px solid #3b82f6;
    padding-left: 1rem;
    margin: 1rem 0;
    color: #4b5563;
    background: #f0f9ff;
    padding: 0.75rem 1rem;
    border-radius: 0 0.5rem 0.5rem 0;
  }
  .markdown-content a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 500;
    border-bottom: 1px solid transparent;
    transition: all 0.15s ease;
    word-break: break-all; /* URLなどの長い文字列を強制的に折り返す */
  }
  .markdown-content a:hover {
    color: #1d4ed8;
    border-bottom-color: #1d4ed8;
  }
  .markdown-content hr {
    border: none;
    height: 1px;
    background: linear-gradient(to right, transparent, #e5e7eb, transparent);
    margin: 1rem 0;
    padding: 0;
    line-height: 0;
  }
  .markdown-content img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1rem 0;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  /* --- Responsive Styles --- */

  /* Mobile (Смартфон) */
  @media (max-width: 640px) {
    .markdown-content {
      font-size: 1rem; /* 0.9375remから1remに調整して読みやすく */
      line-height: 1.6; /* 全体のベース行間を少し広めに */
    }
    .markdown-content p {
      margin: 0 0 0.75rem 0; /* 段落下のマージンを調整 */
      line-height: 1.65; /* 段落の行間を少し広げて読みやすく */
    }
    .markdown-content ul, .markdown-content ol {
      margin: 0.75rem 0;
    }
    .markdown-content li {
      margin-bottom: 0.25rem; /* リスト項目間のマージンを詰める */
      line-height: 1.65;
    }
    .markdown-content h1 {
      font-size: 1.375rem;
      margin: 1.25rem 0 0.75rem;
    }
    .markdown-content h2 {
      font-size: 1.125rem;
      margin: 1.1rem 0 0.5rem;
    }
    .markdown-content h3 {
      font-size: 1.05rem;
    }
    .markdown-content table {
      font-size: 0.8125rem;
    }
    .markdown-content th, .markdown-content td {
      padding: 0.5rem 0.75rem;
    }
    .markdown-content pre {
      padding: 0.75rem;
      font-size: 0.8125rem;
    }
    .table-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      margin: 0 -1rem; /* 親のパディングを考慮 */
      padding: 0 1rem;
    }
  }

  /* Dark Mode Styles */
  .markdown-content.dark-mode blockquote {
    background: rgba(30, 41, 59, 0.5);
    border-left-color: #60a5fa;
    color: inherit;
  }
  .markdown-content.dark-mode :not(pre) > code {
    background: rgba(248, 250, 252, 0.15);
    color: #93c5fd;
  }
  .markdown-content.dark-mode table {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
  }
  .markdown-content.dark-mode thead {
    background: rgba(255, 255, 255, 0.05);
  }
  .markdown-content.dark-mode th {
    color: inherit;
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  .markdown-content.dark-mode td {
    color: inherit;
    border-bottom-color: rgba(255, 255, 255, 0.05);
  }
  .markdown-content.dark-mode tbody tr:hover {
    background-color: rgba(255, 255, 255, 0.02);
  }

  /* Tablet (タブレット) - 微調整 */
  @media (min-width: 641px) and (max-width: 1024px) {
    .markdown-content { line-height: 1.6; }
    .markdown-content p { line-height: 1.65; }
    .markdown-content li { line-height: 1.65; }
  }

  /* Desktop (デスクトップ) - 微調整 */
  @media (min-width: 1025px) {
    .markdown-content { line-height: 1.7; }
    .markdown-content p { line-height: 1.7; }
    .markdown-content li { line-height: 1.7; }
  }

  /* --- Chat Widget Scoped Overrides (tighter typography inside small iframe) --- */
  .chat-widget-scope .markdown-content { line-height: 1.44; }
  /* 段落のマージン調整：上下に対称にせず、下マージンのみで管理する方が自然 */
  .chat-widget-scope .markdown-content p { margin: 0 0 0.5rem 0; line-height: 1.48; }
  .chat-widget-scope .markdown-content p:last-child { margin-bottom: 0; }
  .chat-widget-scope .markdown-content p:first-child { margin-top: 0; }
  .chat-widget-scope .markdown-content ul, .chat-widget-scope .markdown-content ol { margin: 0.3rem 0; }
  .chat-widget-scope .markdown-content li { margin-bottom: 0.2rem; line-height: 1.48; }
  /* チャットウィジェット内でもリスト内のpタグマージンをリセット */
  .chat-widget-scope .markdown-content li > p { margin: 0; }
  .chat-widget-scope .markdown-content li > ul, .chat-widget-scope .markdown-content li > ol { margin: 0.2rem 0 0; }

  @media (max-width: 640px) {
    .chat-widget-scope .markdown-content { line-height: 1.38; }
    .chat-widget-scope .markdown-content p { margin: 0 0 0.4rem 0; line-height: 1.42; }
    .chat-widget-scope .markdown-content p:last-child { margin-bottom: 0; }
    .chat-widget-scope .markdown-content p:first-child { margin-top: 0; }
    .chat-widget-scope .markdown-content ul, .chat-widget-scope .markdown-content ol { margin: 0.25rem 0; }
    .chat-widget-scope .markdown-content li { margin-bottom: 0.18rem; line-height: 1.42; }
    .chat-widget-scope .markdown-content li > p { margin: 0; }
    .chat-widget-scope .markdown-content li > ul, .chat-widget-scope .markdown-content li > ol { margin: 0.15rem 0 0; }
  }
  @media (min-width: 641px) and (max-width: 1024px) {
    .chat-widget-scope .markdown-content { line-height: 1.44; }
    .chat-widget-scope .markdown-content p { margin: 0 0 0.5rem 0; line-height: 1.5; }
    .chat-widget-scope .markdown-content p:last-child { margin-bottom: 0; }
    .chat-widget-scope .markdown-content p:first-child { margin-top: 0; }
    .chat-widget-scope .markdown-content ul, .chat-widget-scope .markdown-content ol { margin: 0.3rem 0; }
    .chat-widget-scope .markdown-content li { margin-bottom: 0.2rem; line-height: 1.5; }
    .chat-widget-scope .markdown-content li > p { margin: 0; }
    .chat-widget-scope .markdown-content li > ul, .chat-widget-scope .markdown-content li > ol { margin: 0.2rem 0 0; }
  }
  @media (min-width: 1025px) {
    .chat-widget-scope .markdown-content { line-height: 1.5; }
    .chat-widget-scope .markdown-content p { margin: 0 0 0.6rem 0; line-height: 1.55; }
    .chat-widget-scope .markdown-content p:last-child { margin-bottom: 0; }
    .chat-widget-scope .markdown-content p:first-child { margin-top: 0; }
    .chat-widget-scope .markdown-content ul, .chat-widget-scope .markdown-content ol { margin: 0.35rem 0; }
    .chat-widget-scope .markdown-content li { margin-bottom: 0.22rem; line-height: 1.55; }
    .chat-widget-scope .markdown-content li > p { margin: 0; }
    .chat-widget-scope .markdown-content li > ul, .chat-widget-scope .markdown-content li > ol { margin: 0.2rem 0 0; }
  }
`;

const TableWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  React.createElement(
    "div",
    { className: "table-wrapper" },
    React.createElement("table", null, children),
  );

// Perplexityの引用番号をリンク化するためのカスタムテキストコンポーネント
// 引用番号を検出して、クリック可能なリンクとして表示
const TextWithCitations: React.FC<{
  children: React.ReactNode;
  citations?: string[];
}> = ({ children, citations = [] }) => {
  if (typeof children === "string") {
    // [1], [2]などの引用番号を検出してリンク化
    // パターン: [1], [2], [10] など（数字のみ）
    const citationRegex = /\[(\d+)\]/g;
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match;
    let elementIndex = 0;

    while ((match = citationRegex.exec(children)) !== null) {
      // 引用番号の前のテキスト
      if (match.index > lastIndex) {
        parts.push(children.substring(lastIndex, match.index));
      }

      // 引用番号をリンクとして追加
      const citationNumberStr = match[1];
      if (!citationNumberStr) continue; // match[1]がundefinedの場合はスキップ
      const citationNumber = parseInt(citationNumberStr, 10);
      // citations配列のインデックスは0ベース、引用番号は1ベースなので-1する
      const citationArrayIndex = citationNumber - 1;
      const citationUrl = citations[citationArrayIndex] || null;

      parts.push(
        React.createElement(
          "a",
          {
            key: `citation-${elementIndex++}`,
            href: citationUrl || `#citation-${citationNumber}`,
            target: citationUrl ? "_blank" : undefined,
            rel: citationUrl ? "noopener noreferrer" : undefined,
            className: "citation-link",
            style: {
              color: "#2563eb",
              textDecoration: "none",
              fontWeight: 500,
              borderBottom: "1px solid transparent",
              transition: "all 0.15s ease",
              cursor: "pointer",
            },
            onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
              if (!citationUrl) {
                e.preventDefault();
                // URLがない場合は視覚的フィードバックのみ
                const element = e.currentTarget;
                const originalColor = element.style.color;
                element.style.color = "#1d4ed8";
                element.style.borderBottomColor = "#1d4ed8";
                setTimeout(() => {
                  element.style.color = originalColor;
                  element.style.borderBottomColor = "transparent";
                }, 200);
              }
              // URLがある場合は通常のリンク動作（target="_blank"で新しいタブで開く）
            },
            onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.borderBottomColor = "#1d4ed8";
              e.currentTarget.style.color = "#1d4ed8";
            },
            onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.borderBottomColor = "transparent";
              e.currentTarget.style.color = "#2563eb";
            },
            title: citationUrl
              ? `引用 ${citationNumber}: ${citationUrl}`
              : `引用 ${citationNumber} をクリック`,
          },
          `[${citationNumber}]`,
        ),
      );
      lastIndex = match.index + match[0].length;
    }

    // 残りのテキスト
    if (lastIndex < children.length) {
      parts.push(children.substring(lastIndex));
    }

    // 引用番号が見つかった場合はリンク化された要素を返す
    if (parts.length > 1) {
      return React.createElement(React.Fragment, null, ...parts);
    }

    // 引用番号が見つからない場合はそのまま返す
    return React.createElement(React.Fragment, null, children);
  }

  // 文字列でない場合はそのまま返す
  return React.createElement(React.Fragment, null, children);
};

// citations情報をコンテキストで渡すためのヘルパー関数
export const createMarkdownComponents = (citations?: string[]): Components => ({
  table: ({ children }) =>
    React.createElement(TableWrapper, null, children as React.ReactNode),
  p: ({ children }) =>
    React.createElement(TextWithCitations, {
      citations,
      children: children as React.ReactNode,
    }),
  ul: ({ children }) =>
    React.createElement(
      "ul",
      { style: { listStyleType: "disc", paddingLeft: "1.5rem" } },
      children as React.ReactNode,
    ),
  ol: ({ children }) =>
    React.createElement(
      "ol",
      { style: { listStyleType: "decimal", paddingLeft: "1.5rem" } },
      children as React.ReactNode,
    ),
  li: ({ children }) =>
    React.createElement("li", null, children as React.ReactNode),
  a: ({ href, children, ...props }) =>
    React.createElement(
      "a",
      {
        href,
        target: "_blank",
        rel: "noopener noreferrer",
        ...props,
      },
      children as React.ReactNode,
    ),
});

export const markdownComponents: Components = {
  table: ({ children }) =>
    React.createElement(TableWrapper, null, children as React.ReactNode),
  p: ({ children }) =>
    React.createElement(TextWithCitations, null, children as React.ReactNode),
  ul: ({ children }) =>
    React.createElement(
      "ul",
      { style: { listStyleType: "disc", paddingLeft: "1.5rem" } },
      children as React.ReactNode,
    ),
  ol: ({ children }) =>
    React.createElement(
      "ol",
      { style: { listStyleType: "decimal", paddingLeft: "1.5rem" } },
      children as React.ReactNode,
    ),
  li: ({ children }) =>
    React.createElement("li", null, children as React.ReactNode),
  a: ({ href, children, ...props }) =>
    React.createElement(
      "a",
      {
        href,
        target: "_blank",
        rel: "noopener noreferrer",
        ...props,
      },
      children as React.ReactNode,
    ),
};

export const reactMarkdownPlugins = [remarkGfm, remarkBreaks];
