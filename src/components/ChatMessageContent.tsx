"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMessageContentProps = {
  content: string;
  variant: "user" | "assistant";
};

export function ChatMessageContent({ content, variant }: ChatMessageContentProps) {
  if (variant === "user") {
    return (
      <p className="whitespace-pre-wrap break-words">{content}</p>
    );
  }

  return (
    <div className="chat-markdown min-w-0 max-w-full break-words text-[15px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 whitespace-pre-wrap">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 underline hover:text-indigo-300"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h1 className="mb-2 mt-4 text-xl font-semibold first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-lg font-semibold first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-indigo-500/50 pl-3 text-[var(--text-secondary)] last:mb-0">
              {children}
            </blockquote>
          ),
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-4 text-sm leading-relaxed last:mb-0">
              {children}
            </pre>
          ),
          code: ({ className, children }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <code className={`font-mono text-[13px] text-[var(--text-primary)] ${className ?? ""}`}>
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-[var(--bg-input)] px-1.5 py-0.5 font-mono text-[13px]">
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto last:mb-0">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-1 text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-[var(--border-subtle)] px-2 py-1">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
