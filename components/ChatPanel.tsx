// components/ChatPanel.tsx
"use client";

import React, { useState, useRef, useEffect, FormEvent } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
};

function createId() {
  return Math.random().toString(36).slice(2);
}

const INITIAL_ASSISTANT_MESSAGE = `
Hello, I’m Polylook AI.

• Paste a Polymarket event link to get a structured summary.
• Type a sports match for form, probabilities, and directional insights.
• Strategy, risk and market context questions are welcome.

Responses are in English.
This is not financial or betting advice.
`.trim();

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: "assistant",
      content: INITIAL_ASSISTANT_MESSAGE,
    },
  ]);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
    };

    const loadingMessage: ChatMessage = {
      id: createId(),
      role: "assistant",
      content: "Thinking for a few seconds…",
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMessage.id
            ? {
                ...m,
                isLoading: false,
                content:
                  typeof data.reply === "string"
                    ? data.reply
                    : "Could not generate a response.",
              }
            : m
        )
      );
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMessage.id
            ? {
                ...m,
                isLoading: false,
                content:
                  "There was an error talking to the backend. Please try again in a moment.",
              }
            : m
        )
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-[460px] md:h-[520px] lg:h-[560px] flex-col rounded-3xl border border-slate-800/80 bg-slate-950/80 shadow-[0_0_60px_rgba(0,0,0,0.7)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
            Wallet tracker · AI chatbot
          </span>
          <span className="text-xs text-slate-500">
            AI assistant for Polymarket & sports, powered by Gamma data.
          </span>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-medium text-emerald-100">
            Live · Polylook AI
          </span>
        </div>
      </div>

      {/* Messages – fixed area + transparent scrollbar */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 pt-3 pb-2 pr-3 scroll-shell"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={
                "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed " +
                (m.role === "user"
                  ? "bg-sky-500/20 text-sky-50 border border-sky-500/40"
                  : "bg-slate-900/95 text-slate-100 border border-slate-700/80")
              }
            >
              {m.isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span>{m.content}</span>
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0.12s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-600 [animation-delay:0.24s]" />
                  </span>
                </span>
              ) : (
                m.content.split("\n").map((line, idx) => (
                  <p key={idx} className="whitespace-pre-wrap">
                    {line}
                  </p>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800/80 px-4 pt-2 pb-3"
      >
        <div className="flex items-center gap-2 rounded-2xl bg-slate-900/80 px-3 py-2">
          <input
            type="text"
            className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
            placeholder="Paste a Polymarket link, type a match name or ask a strategy question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="inline-flex items-center rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}