import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, clearAskHistory, getAskHistory, streamAskRadarChat, summarizeFile, summarizeLink } from "../lib/api";
import { plainText } from "../lib/text";
import type { ChatMessage } from "../lib/types";

const SUGGESTIONS = [
  "What should I do today to get closer to my goal?",
  "Which of my missing skills matters most right now?",
  "Summarise the best thing in my feed this week.",
  "Recommend a resource for Artificial Intelligence.",
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AskRadar() {
  const [inputText, setInputText] = useState("");
  const [summaryMode, setSummaryMode] = useState<"chat" | "file" | "link">("chat");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [thinking, setThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load the saved conversation once, so history survives reloads and devices.
  const queryClient = useQueryClient();
  const historyQuery = useQuery({ queryKey: ["ask", "history"], queryFn: getAskHistory });
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !historyQuery.isSuccess) return;
    seeded.current = true;
    if (historyQuery.data && historyQuery.data.length > 0) setMessages(historyQuery.data);
  }, [historyQuery.isSuccess, historyQuery.data]);

  const startNewChat = async () => {
    setMessages([]);
    setAvailableSections([]);
    seeded.current = true;
    await clearAskHistory().catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["ask", "history"] });
  };

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

  const summarizeFile_ = async (specificSection?: string | null) => {
    if (!file || busy) return;
    setBusy(true);
    setThinking(true);
    const questionText = inputText.trim();
    if (questionText) setInputText("");

    const displayMsg = specificSection
      ? (specificSection.toLowerCase().includes("all")
          ? `Summarize entire document: ${file.name}`
          : `Summarize ${specificSection} of ${file.name}`)
      : `Summarize file: ${file.name}${questionText ? ` (${questionText})` : ""}`;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: displayMsg,
        timestamp: new Date().toISOString(),
        suggestedResources: [],
      },
    ]);

    try {
      const res = await summarizeFile(file, specificSection, questionText || null);
      if (res.requiresSectionSelection && res.sections && res.sections.length > 0) {
        setAvailableSections(res.sections);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              res.message ||
              "This work is divided into multiple chapters or sections. Which section or chapter should be summarised, or should I summarise the entire document?",
            timestamp: new Date().toISOString(),
            suggestedResources: [],
          },
        ]);
      } else {
        setAvailableSections([]);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: res.summary || res.message || "No summary returned.",
            timestamp: new Date().toISOString(),
            suggestedResources: [],
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err instanceof ApiError ? err.message : "Couldn't summarise that file.",
          timestamp: new Date().toISOString(),
          suggestedResources: [],
        },
      ]);
    } finally {
      setThinking(false);
      setBusy(false);
    }
  };

  const summarizeLink_ = async () => {
    const url = link.trim();
    if (!url || busy) return;
    setBusy(true);
    setThinking(true);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: `Summarize link: ${url}`, timestamp: new Date().toISOString(), suggestedResources: [] }]);
    try {
      const { summary } = await summarizeLink(url);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: summary || "No summary returned.", timestamp: new Date().toISOString(), suggestedResources: [] }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: err instanceof ApiError ? err.message : "Couldn't summarise that link.", timestamp: new Date().toISOString(), suggestedResources: [] }]);
    } finally {
      setThinking(false);
      setBusy(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (summaryMode === "file" && file) {
        if (availableSections.length > 0 && inputText.trim()) {
          summarizeFile_(inputText.trim());
        } else {
          summarizeFile_();
        }
      } else if (summaryMode === "link" && link.trim()) {
        summarizeLink_();
      } else {
        send(inputText);
      }
    }
  };

  return (
    <div className="r-page">
      <div className="r-page-head">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <h1 className="r-page-title">Ask Radar</h1>
          {messages.length > 0 && (
            <button className="btn btn--sm" onClick={startNewChat}>New chat</button>
          )}
        </div>
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
            <div
              className={`ask-msg ${msg.role === "user" ? "ask-msg--user" : "ask-msg--assistant"}`}
              key={msg.id}
              style={msg.role === "assistant" ? { whiteSpace: "pre-wrap" } : undefined}
            >
              {msg.role === "assistant" ? plainText(msg.content) : msg.content}
            </div>
          ))}
          {thinking && (
            <div className="ask-msg ask-msg--assistant">
              <div className="r-spinner r-spinner--sm" />
            </div>
          )}
        </div>
      )}

      {availableSections.length > 0 && (
        <div className="ask-section-picker">
          <div className="ask-section-picker__title">
            Select a section or chapter to summarise:
          </div>
          <div className="ask-section-picker__chips">
            {availableSections.map((sec, i) => (
              <button
                key={sec}
                className={`ask-section-chip ${i === 0 ? "ask-section-chip--all" : ""}`}
                onClick={() => summarizeFile_(sec)}
                disabled={busy}
              >
                {i === 0 ? "✨ " : ""}{sec}
              </button>
            ))}
          </div>
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
        <div className={`ask-file-upload ${isDragging ? "ask-file-upload--active" : ""}`}>
          <input
            ref={fileInputRef}
            type="file"
            className="ask-file-upload__input"
            accept=".pdf,.docx,.doc,.txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.rtf,.xml,.log"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setFile(f);
              setAvailableSections([]);
            }}
          />
          {!file ? (
            <div
              className="ask-file-upload__dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) {
                  setFile(f);
                  setAvailableSections([]);
                }
              }}
            >
              <div className="ask-file-upload__icon">📄</div>
              <div className="ask-file-upload__prompt">Click to browse or drag & drop your document</div>
              <div className="ask-file-upload__formats">PDF (.pdf), Word (.docx), Markdown (.md), TXT, CSV, JSON, HTML up to 20MB</div>
            </div>
          ) : (
            <div className="ask-file-selected">
              <div className="ask-file-selected__info">
                <span className="ask-file-selected__icon">📄</span>
                <div className="ask-file-selected__meta">
                  <div className="ask-file-selected__name">{file.name}</div>
                  <div className="ask-file-selected__size">{formatFileSize(file.size)} · Ready to summarize</div>
                </div>
              </div>
              <div className="ask-file-selected__actions">
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => summarizeFile_()}
                  disabled={busy}
                >
                  {busy ? "Reading..." : "Summarize file"}
                </button>
                <button
                  className="btn btn--sm"
                  style={{ padding: "5px 9px", color: "var(--text-muted)" }}
                  onClick={() => {
                    setFile(null);
                    setAvailableSections([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {summaryMode === "link" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input className="r-input" type="url" placeholder="Paste an article or webpage link" value={link} onChange={(e) => setLink(e.target.value)} />
          <button className="btn btn--primary btn--sm" onClick={summarizeLink_} disabled={!link.trim() || busy}>Summarize</button>
        </div>
      )}

      <div className="ask-input-row">
        <textarea
          className="ask-input-field"
          rows={1}
          placeholder={
            summaryMode === "chat"
              ? "Ask Radar anything…"
              : summaryMode === "file" && availableSections.length > 0
              ? "Type chapter/section or choose from above…"
              : "Add a question or specific focus (optional)…"
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          className="ask-send-btn"
          onClick={() => {
            if (summaryMode === "file" && file) {
              if (availableSections.length > 0 && inputText.trim()) {
                summarizeFile_(inputText.trim());
              } else {
                summarizeFile_();
              }
            } else if (summaryMode === "link" && link.trim()) {
              summarizeLink_();
            } else {
              send(inputText);
            }
          }}
          disabled={
            busy ||
            (summaryMode === "file" ? !file : summaryMode === "link" ? !link.trim() : !inputText.trim())
          }
          title={summaryMode === "file" ? "Summarize uploaded file" : "Send message"}
        >
          →
        </button>
      </div>
    </div>
  );
}
