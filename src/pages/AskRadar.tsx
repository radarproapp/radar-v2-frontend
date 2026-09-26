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
  const [summaryMode, setSummaryMode] = useState<"chat" | "file" | "link">("chat");
  const [fileName, setFileName] = useState("");
  const [fileText, setFileText] = useState("");
  const [link, setLink] = useState("");
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

  const summarizeFile = () => {
    if (!fileText.trim() || busy) return;
    send(`Summarize this file for me. Explain the key points, why they matter to my goals, and my next move.\n\nFile: ${fileName}\n\n${fileText.slice(0, 50000)}`);
  };

  const summarizeLink = () => {
    if (!link.trim() || busy) return;
    send(`Summarize this link for me. Explain what happened, why it matters to my goals, and my next move.\n\n${link.trim()}`);
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

      <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
        {(["chat", "file", "link"] as const).map((mode) => (
          <button key={mode} className={`r-chip ${summaryMode === mode ? "active" : ""}`} onClick={() => setSummaryMode(mode)}>
            {mode === "chat" ? "Ask Radar" : mode === "file" ? "Summarize file" : "Summarize link"}
          </button>
        ))}
      </div>

      {summaryMode === "file" && (
        <div style={{ marginBottom: 10, padding: 12, background: "var(--bg-hover)", borderRadius: 10 }}>
          <input type="file" accept=".txt,.md,.csv,.json,.html,.rtf" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setFileName(file.name); setFileText(await file.text()); }} />
          {fileName && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 7 }}>{fileName} ready to summarize</div>}
          <button className="btn btn--primary btn--sm" style={{ marginTop: 9 }} onClick={summarizeFile} disabled={!fileText.trim() || busy}>Summarize file</button>
        </div>
      )}

      {summaryMode === "link" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input className="r-input" type="url" placeholder="Paste an article or webpage link" value={link} onChange={(e) => setLink(e.target.value)} />
          <button className="btn btn--primary btn--sm" onClick={summarizeLink} disabled={!link.trim() || busy}>Summarize</button>
        </div>
      )}

      <div className="ask-input-row">
        <textarea
          className="ask-input-field"
          rows={1}
          placeholder={summaryMode === "chat" ? "Ask Radar anything…" : "Add a question or context (optional)…"}
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
