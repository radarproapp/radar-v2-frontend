import { useState } from "react";
import { streamAskRadarChat } from "../lib/api";
import type { ChatMessage } from "../lib/types";

const SUGGESTIONS = [
  "What should I do today to get closer to my goal?",
  "Which of my missing skills matters most right now?",
  "Summarise the best thing in my feed this week.",
  "Recommend a resource for Artificial Intelligence.",
];

export function AskRadar() {
  const [inputText, setInputText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const history = [...messages, { id: crypto.randomUUID(), role: "user" as const, content: trimmed, timestamp: new Date().toISOString(), suggestedResources: [] }];
    setMessages(history);
    setInputText("");
    setThinking(true);
    setBusy(true);

    const assistantId = crypto.randomUUID();
    let started = false;

    try {
      await streamAskRadarChat(trimmed, history, (chunk) => {
        if (!started) {
          started = true;
          setThinking(false);
          setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: chunk, timestamp: new Date().toISOString(), suggestedResources: [] }]);
        } else {
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)));
        }
      });
    } finally {
      setThinking(false);
      setBusy(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(inputText);
    }
  };

  return (
    <div className="r-page">
      <div className="r-page-head">
        <h1 className="r-page-title">Ask Radar</h1>
        <p className="r-page-sub">Explains, summarises, compares, recommends and finds resources — grounded in your profile.</p>
      </div>

      {messages.length === 0 ? (
        <div className="ask-suggestions">
          <div className="ask-suggestions-label">TRY ASKING</div>
          {SUGGESTIONS.map((s) => (
            <button className="ask-suggestion-item" key={s} onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div className="ask-messages">
          {messages.map((msg) => (
            <div className={`ask-msg ${msg.role === "user" ? "ask-msg--user" : "ask-msg--assistant"}`} key={msg.id}>
              {msg.content}
            </div>
          ))}
          {thinking && (
            <div className="ask-msg ask-msg--assistant">
              <div className="r-spinner r-spinner--sm" />
            </div>
          )}
        </div>
      )}

      <div className="ask-input-row">
        <textarea
          className="ask-input-field"
          rows={1}
          placeholder="Ask Radar anything…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKey}
        />
        <button className="ask-send-btn" onClick={() => send(inputText)} disabled={busy || !inputText.trim()}>
          →
        </button>
      </div>
    </div>
  );
}
