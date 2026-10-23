import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  clearAskHistory,
  getAskCapabilities,
  getAskHistory,
  streamAskRadarChat,
  summarizeFile,
  summarizeLink,
  transcribeAudio,
} from "../lib/api";
import { plainText } from "../lib/text";
import type { ChatMessage } from "../lib/types";
import { Icon } from "../components/Icon";

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

/// The four things this page does. "upload" is the word the Learn entry screen uses for the same
/// thing this page calls "file"; the URL speaks the caller's language and maps here.
type AskMode = "chat" | "file" | "link" | "record";

const MODE_FROM_PARAM: Record<string, AskMode> = {
  chat: "chat",
  upload: "file",
  file: "file",
  link: "link",
  record: "record",
};

const MODE_LABEL: Record<AskMode, string> = {
  chat: "Ask Radar",
  file: "Summarize file",
  link: "Summarize link",
  record: "Record",
};

/// Groq accepts webm, mp4, m4a, mp3, wav and ogg. Chrome records webm and Safari mp4, so the
/// extension follows whatever the browser actually produced rather than being assumed.
function extensionFor(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export function AskRadar() {
  // Arriving from the Learn entry screen, which links straight to the lane the learner chose.
  // Read in the initialiser, not an effect: the right panel is then open on the first paint, and
  // a learner who switches to chat afterwards is not dragged back by the URL still naming a mode.
  const [searchParams] = useSearchParams();
  const [inputText, setInputText] = useState("");
  const [summaryMode, setSummaryMode] = useState<AskMode>(
    () => MODE_FROM_PARAM[(searchParams.get("mode") ?? "").toLowerCase()] ?? "chat",
  );
  const [recording, setRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [thinking, setThinking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const capabilitiesQuery = useQuery({ queryKey: ["ask", "capabilities"], queryFn: getAskCapabilities });

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

  // A long lecture is a lot of text. The chat endpoint is grounded in the profile and a prompt,
  // not built to carry an hour of speech, so the transcript is capped and the cap is admitted
  // rather than quietly dropping the end of someone's lecture.
  const TRANSCRIPT_LIMIT = 12_000;

  const stopTracks = () => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
  };

  const startRecording = async () => {
    setRecordError(null);

    if (typeof MediaRecorder === "undefined") {
      setRecordError("This browser cannot record audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stopTracks();
        setRecording(false);

        if (blob.size === 0) {
          setRecordError("Nothing was recorded.");
          return;
        }

        setBusy(true);
        try {
          const { text } = await transcribeAudio(blob, `recording.${extensionFor(mimeType)}`);
          const clipped = text.length > TRANSCRIPT_LIMIT;
          const body = clipped ? text.slice(0, TRANSCRIPT_LIMIT) : text;

          await send(
            `Here is a transcript of a lecture I recorded${clipped ? " (the first part of it)" : ""}. ` +
              `Summarise the key points and tell me what to review:

${body}`,
          );
        } catch (e) {
          setRecordError(
            e instanceof ApiError ? e.message : "The recording could not be transcribed. Try again, or type instead.",
          );
        } finally {
          setBusy(false);
        }
      };

      recorder.start();
      setRecordedSeconds(0);
      setRecording(true);
    } catch {
      // The only likely cause is a denied permission, and the browser has already said so in its
      // own dialog; repeating the technical error would not help.
      setRecordError("Radar could not reach your microphone. Check the permission and try again.");
    }
  };

  const stopRecording = () => recorderRef.current?.stop();

  // A running count, so the learner can see it is actually recording.
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordedSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  // Leaving the page mid-recording must release the microphone, or the browser keeps showing the
  // recording indicator over an app that is no longer listening.
  useEffect(() => stopTracks, []);

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
                {i === 0 ? "" : ""}{sec}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
        {/* Record is only offered where it can work. Showing a chip that always fails teaches
            people the feature is broken rather than that the key is missing. */}
        {(["chat", "file", "link", "record"] as const)
          .filter((mode) => mode !== "record" || capabilitiesQuery.data?.record)
          .map((mode) => (
            <button key={mode} className={`r-chip ${summaryMode === mode ? "active" : ""}`} onClick={() => setSummaryMode(mode)}>
              {MODE_LABEL[mode]}
            </button>
          ))}
      </div>

      {summaryMode === "record" && (
        <div className="ask-record">
          {recording ? (
            <>
              <span className="ask-record__pulse" aria-hidden="true" />
              <span className="ask-record__status">
                Recording · {Math.floor(recordedSeconds / 60)}:{String(recordedSeconds % 60).padStart(2, "0")}
              </span>
              <button className="btn btn--primary btn--sm" onClick={stopRecording}>
                Stop and transcribe
              </button>
            </>
          ) : (
            <>
              <span className="ask-record__icon">
                <Icon name="mic" size={17} />
              </span>
              <span className="ask-record__status">
                {busy ? "Transcribing…" : "Record a lecture, then Radar transcribes it and summarises the key points."}
              </span>
              <button className="btn btn--primary btn--sm" onClick={startRecording} disabled={busy}>
                Start recording
              </button>
            </>
          )}
        </div>
      )}

      {recordError && (
        <div role="alert" className="ask-record__error">
          {recordError}
        </div>
      )}

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
              <div className="ask-file-upload__icon"><Icon name="document" /></div>
              <div className="ask-file-upload__prompt">Click to browse or drag & drop your document</div>
              <div className="ask-file-upload__formats">PDF (.pdf), Word (.docx), Markdown (.md), TXT, CSV, JSON, HTML up to 20MB</div>
            </div>
          ) : (
            <div className="ask-file-selected">
              <div className="ask-file-selected__info">
                <span className="ask-file-selected__icon"><Icon name="document" /></span>
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
                ><Icon name="close" /></button>
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
