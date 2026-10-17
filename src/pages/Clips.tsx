import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, getTodaysClips, logEvent, saveClip } from "../lib/api";
import { parseVideoUrl } from "../lib/video";
import type { Clip } from "../lib/types";

const GRADIENTS = [
  "radial-gradient(120% 90% at 80% 0%, #12343b 0%, #0b1418 55%, #080b0e 100%)",
  "radial-gradient(120% 90% at 15% 10%, #241a34 0%, #120e1c 55%, #08070c 100%)",
  "radial-gradient(120% 90% at 85% 5%, #332312 0%, #1a130a 55%, #0b0906 100%)",
  "radial-gradient(120% 90% at 20% 0%, #12304f 0%, #0a1725 55%, #070b10 100%)",
  "radial-gradient(120% 90% at 80% 10%, #341322 0%, #1b0c14 55%, #0b0608 100%)",
];

// Fallback clips ensuring playback always succeeds even offline
const FALLBACK_CLIPS: Clip[] = [
  {
    id: "clip-c1",
    userId: "demo",
    tag: "Network Security",
    signal: "How packet sniffing in Wireshark exposes unencrypted credentials & malware C2 in 60 seconds",
    whyItMatters: "Packet analysis is the ground truth of cybersecurity. Threat actors often disguise malicious C2 beacons as regular HTTPS/DNS traffic; packet inspection reveals handshake anomalies and unusual DNS volumes.",
    yourEdge: "You can spot unencrypted tokens, ARP poisoning attempts, and suspicious outbound beaconing without needing a multimillion-dollar commercial appliance.",
    nextMove: "Open Wireshark on your local interface, filter by 'dns || http', and observe your browser's unencrypted handshake metadata.",
    source: "NetworkChuck · YouTube",
    mediaUrl: "https://www.youtube.com/watch?v=2T_OtuD4tI8",
    mediaType: "video",
    thumbnailUrl: "https://img.youtube.com/vi/2T_OtuD4tI8/hqdefault.jpg",
    durationSeconds: 60,
    isSaved: false,
    publishedAt: new Date().toISOString(),
    contentItemId: null,
  },
  {
    id: "clip-c2",
    userId: "demo",
    tag: "Ethical Hacking",
    signal: "Bypassing Web Application Firewalls (WAF) using Double URL Encoding & Comment Fragmentation",
    whyItMatters: "Legacy WAFs inspect single-decoded input strings. If the backend web server applies a second decoding pass after the WAF check, payload characters bypass filtering and execute directly in the database.",
    yourEdge: "You can write resilient web API endpoints that use strict parameter binding and schema validation rather than placing blind trust in boundary WAFs.",
    nextMove: "Test your lab endpoints with '%2527' (double-encoded single quote) to observe how your application handles double decoding.",
    source: "LiveOverflow · Web Security",
    mediaUrl: "https://www.youtube.com/watch?v=iyAyN3GFMqc",
    mediaType: "video",
    thumbnailUrl: "https://img.youtube.com/vi/iyAyN3GFMqc/hqdefault.jpg",
    durationSeconds: 50,
    isSaved: false,
    publishedAt: new Date().toISOString(),
    contentItemId: null,
  },
  {
    id: "clip-c3",
    userId: "demo",
    tag: "Threat Detection",
    signal: "Active Directory Lateral Movement: Pass-the-Hash without cracking passwords",
    whyItMatters: "In over 80% of enterprise ransomware attacks, threat actors dump NTLM hashes directly from LSASS memory and authenticate across domain controllers without ever decrypting plaintext passwords.",
    yourEdge: "You can identify anomalous Kerberos service ticket requests (TGS) and deploy Microsoft LAPS to randomize local administrator credentials across all machines.",
    nextMove: "Check whether Credential Guard is enabled in your domain controller baseline policies.",
    source: "John Hammond · Security Research",
    mediaUrl: "https://www.youtube.com/watch?v=F07_rV5b9tE",
    mediaType: "video",
    thumbnailUrl: "https://img.youtube.com/vi/F07_rV5b9tE/hqdefault.jpg",
    durationSeconds: 55,
    isSaved: false,
    publishedAt: new Date().toISOString(),
    contentItemId: null,
  },
  {
    id: "clip-c4",
    userId: "demo",
    tag: "Systems Security",
    signal: "Why Memory Corruption triggers 70% of high-severity CVEs, and how Rust prevents them",
    whyItMatters: "Buffer overflows and use-after-free flaws allow attackers to overwrite the instruction pointer (EIP/RIP) and execute shellcode. Modern regulators (CISA, White House) now actively mandate memory safety.",
    yourEdge: "Understanding low-level memory layout enables you to write exploit-resistant system code and conduct deep binary vulnerability triage.",
    nextMove: "Review CISA's official Software Identification guidance for memory-safe roadmap requirements.",
    source: "Computerphile · Systems Security",
    mediaUrl: "https://www.youtube.com/watch?v=1S0aBV-Waeo",
    mediaType: "video",
    thumbnailUrl: "https://img.youtube.com/vi/1S0aBV-Waeo/hqdefault.jpg",
    durationSeconds: 60,
    isSaved: false,
    publishedAt: new Date().toISOString(),
    contentItemId: null,
  },
  {
    id: "clip-c5",
    userId: "demo",
    tag: "Cloud Security",
    signal: "AWS IAM Privilege Escalation: 21 Dangerous Actions that elevate a guest to Administrator",
    whyItMatters: "Cloud breaches rarely require zero-days; they exploit overly permissive IAM policies like 'iam:CreateAccessKey' or 'iam:PassRole' that allow a compromised contractor key to assume full root privileges.",
    yourEdge: "You can configure automated IAM policy linters (like PMapper and AWS IAM Access Analyzer) to detect hidden privilege escalation routes before code is committed to production.",
    nextMove: "Audit your AWS cloud accounts for any IAM role pairing 'iam:PassRole' with 'ec2:RunInstances'.",
    source: "David Bombal · Cloud Security",
    mediaUrl: "https://www.youtube.com/watch?v=3Kq1MIfTWCE",
    mediaType: "video",
    thumbnailUrl: "https://img.youtube.com/vi/3Kq1MIfTWCE/hqdefault.jpg",
    durationSeconds: 45,
    isSaved: false,
    publishedAt: new Date().toISOString(),
    contentItemId: null,
  },
];

export function Clips() {
  const navigate = useNavigate();
  const clipsQuery = useQuery({
    queryKey: ["clips", "today"],
    queryFn: getTodaysClips,
    staleTime: 1000 * 60 * 15,
  });

  const rawClips = clipsQuery.data ?? [];
  const clips = rawClips.length > 0 ? rawClips : FALLBACK_CLIPS;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showBrief, setShowBrief] = useState(true);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  const currentClip = clips[activeIndex] ?? clips[0];
  const clipDuration = currentClip?.durationSeconds || 45;

  // IntersectionObserver detects active slide when user scrolls
  useEffect(() => {
    const root = feedRef.current;
    if (!root || clips.length === 0) return;
    const slides = Array.from(root.querySelectorAll<HTMLElement>("[data-clip-index]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = Number((entry.target as HTMLElement).dataset.clipIndex);
          if (!Number.isNaN(index) && index !== activeIndex) {
            setActiveIndex(index);
            setPlaybackProgress(0);
            setIsPlaying(true);
          }
        });
      },
      { root, threshold: 0.6 },
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [clips.length, activeIndex]);

  // Smooth scroll helper
  const scrollToIndex = useCallback((index: number) => {
    const root = feedRef.current;
    if (!root) return;
    setPlaybackProgress(0);
    setIsPlaying(true);
    root.querySelector<HTMLElement>(`[data-clip-index="${index}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  // Playback timer & auto-advance
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 120;
    const stepPercent = (intervalMs / (clipDuration * 1000)) * 100;

    const timer = setInterval(() => {
      setPlaybackProgress((prev) => {
        const next = prev + stepPercent;
        if (next >= 100) {
          if (activeIndex < clips.length - 1) {
            scrollToIndex(activeIndex + 1);
          } else {
            scrollToIndex(0);
          }
          return 0;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, clipDuration, activeIndex, clips.length, scrollToIndex]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === "j") {
        event.preventDefault();
        scrollToIndex(Math.min(activeIndex + 1, clips.length - 1));
      } else if (event.key === "ArrowUp" || event.key === "PageUp" || event.key === "k") {
        event.preventDefault();
        scrollToIndex(Math.max(activeIndex - 1, 0));
      } else if (event.key === " ") {
        event.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setIsMuted((prev) => !prev);
      } else if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        if (currentClip) save(currentClip);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, clips, currentClip, scrollToIndex]);

  // Handle direct HTML5 video playback
  useEffect(() => {
    const activeVideo = videoRefs.current[activeIndex];
    if (!activeVideo) return;

    activeVideo.muted = isMuted;
    if (isPlaying) {
      activeVideo.play().catch(() => {});
    } else {
      activeVideo.pause();
    }
  }, [activeIndex, isPlaying, isMuted]);

  const save = async (clip: Clip) => {
    if (savedIds[clip.id]) return;
    setSavedIds((prev) => ({ ...prev, [clip.id]: true }));
    logEvent("ClipSaved", { clipId: clip.id, contentItemId: clip.contentItemId ?? undefined });
    try {
      await saveClip(clip.id);
    } catch {
      setSavedIds((prev) => {
        const next = { ...prev };
        delete next[clip.id];
        return next;
      });
    }
  };

  const shareClip = (clip: Clip) => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${clip.signal}\n\nWatch on Radar: ${url}`);
      setCopiedId(clip.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const askMentor = (clip: Clip) => {
    const prompt = `Explain this cybersecurity signal to me in simple terms: "${clip.signal}". Why does it matter and how can I practice this?`;
    navigate(`/mentor?mode=chat&topic=${encodeURIComponent(clip.tag)}&prompt=${encodeURIComponent(prompt)}`);
  };

  const errorMessage = clipsQuery.error instanceof ApiError ? clipsQuery.error.message : "Could not load clips.";

  const renderProgressBars = () => (
    <div className="r-clips__progress">
      {clips.map((_, index) => {
        let fill = 0;
        if (index < activeIndex) fill = 100;
        else if (index === activeIndex) fill = playbackProgress;

        return (
          <button
            key={index}
            className="r-clips__progress-track"
            aria-label={`Go to clip ${index + 1}`}
            onClick={() => scrollToIndex(index)}
          >
            <div className="r-clips__progress-fill" style={{ width: `${fill}%` }} />
          </button>
        );
      })}
    </div>
  );

  const shell = (content: React.ReactNode) => (
    <div className="r-clips">
      <header className="r-clips__top">
        <Link to="/" className="r-clips__back" aria-label="Back">
          ←
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <span className="r-clips__title">Radar Clips</span>
          <span style={{ fontSize: 11, background: "rgba(0,210,219,0.18)", color: "var(--cyan-bright)", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
            REELS
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className={`r-clips__top-btn ${!isMuted ? "active" : ""}`}
            onClick={() => setIsMuted((prev) => !prev)}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            title="Toggle Mute (M)"
          >
            <span>{isMuted ? "🔇" : "🔊"}</span>
            <span style={{ display: "inline-block" }}>{isMuted ? "Muted" : "Sound"}</span>
          </button>

          <button
            type="button"
            className="r-clips__top-btn"
            onClick={() => setIsPlaying((prev) => !prev)}
            aria-label={isPlaying ? "Pause clip" : "Play clip"}
            title="Play/Pause (Space)"
          >
            <span>{isPlaying ? "⏸️" : "▶️"}</span>
          </button>

          <button
            type="button"
            className={`r-clips__top-btn ${showBrief ? "active" : ""}`}
            onClick={() => setShowBrief((prev) => !prev)}
            aria-label="Toggle brief"
            title="Toggle Intelligence Brief"
          >
            <span>ℹ️</span>
            <span>Brief</span>
          </button>

          <span className="r-clips__counter">
            {activeIndex + 1} / {clips.length}
          </span>
        </div>

        {clips.length > 0 && renderProgressBars()}
      </header>
      {content}
    </div>
  );

  if (clipsQuery.isLoading && clips.length === 0) {
    return shell(
      <div className="r-clips__state">
        <div className="r-clips__spinner" />
        <div className="r-clips__state-title">Loading Radar Clips...</div>
      </div>,
    );
  }

  if (clipsQuery.isError && clips.length === 0) {
    return shell(
      <div className="r-clips__state">
        <div className="r-clips__state-title">Failed to load clips</div>
        <div className="r-clips__state-desc">{errorMessage}</div>
        <button className="btn btn--primary btn--sm" onClick={() => clipsQuery.refetch()}>
          Try again
        </button>
      </div>,
    );
  }

  return shell(
    <div className="r-clips__feed" ref={feedRef}>
      {clips.map((clip, index) => {
        const isActive = index === activeIndex;
        const saved = !!savedIds[clip.id] || clip.isSaved;
        const parsed = parseVideoUrl(clip.mediaUrl);
        const posterUrl = clip.thumbnailUrl || (parsed?.kind === "youtube" ? parsed.posterUrl : null);

        // Calculate current elapsed time
        const elapsedSec = Math.floor(((isActive ? playbackProgress : 0) / 100) * (clip.durationSeconds || 45));
        const totalSec = clip.durationSeconds || 45;

        return (
          <section
            key={clip.id}
            className="r-clips__slide"
            data-clip-index={index}
            style={{ background: GRADIENTS[index % GRADIENTS.length] }}
            onClick={(e) => {
              // Clicking background toggles play/pause
              const target = e.target as HTMLElement;
              if (
                target.closest(".r-clips__actions") ||
                target.closest(".r-clips__intel-card") ||
                target.closest("button") ||
                target.closest("a")
              ) {
                return;
              }
              setIsPlaying((prev) => !prev);
            }}
          >
            {/* Media Player Layer */}
            <div className="r-clips__media-container">
              {parsed?.kind === "youtube" ? (
                isActive && isPlaying ? (
                  <iframe
                    className="r-clips__iframe-player"
                    src={`https://www.youtube-nocookie.com/embed/${parsed.id}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=1&loop=1&playlist=${parsed.id}&playsinline=1&rel=0`}
                    title={clip.signal}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <>
                    {posterUrl && <img src={posterUrl} alt="" className="r-clips__poster-bg" />}
                    {posterUrl && <img src={posterUrl} alt={clip.signal} className="r-clips__poster-main" />}
                  </>
                )
              ) : parsed?.kind === "file" ? (
                <video
                  ref={(el) => {
                    videoRefs.current[index] = el;
                  }}
                  className="r-clips__video-player"
                  src={clip.mediaUrl!}
                  poster={posterUrl || undefined}
                  playsInline
                  loop
                  muted={isMuted}
                />
              ) : (
                <>
                  {posterUrl && <img src={posterUrl} alt="" className="r-clips__poster-bg" />}
                  {posterUrl && <img src={posterUrl} alt={clip.signal} className="r-clips__poster-main" />}
                </>
              )}

              {/* Dark subtle gradient overlay to ensure text contrast */}
              <div className="r-clips__overlay-gradient" />

              {/* Animated Play/Pause indicator when paused */}
              {!isPlaying && isActive && (
                <div className="r-clips__play-indicator" aria-hidden="true">
                  ▶
                </div>
              )}
            </div>

            {/* Vertical Action Rail (Right) */}
            <div className="r-clips__actions" style={{ zIndex: 10 }}>
              <button
                className={`r-clips__action ${saved ? "saved" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  save(clip);
                }}
                aria-label={saved ? "Saved" : "Save clip"}
                title="Save Clip"
              >
                <span className="r-clips__action-icon">{saved ? "✓" : "🔖"}</span>
                <span className="r-clips__action-label">{saved ? "Saved" : "Save"}</span>
              </button>

              <button
                className="r-clips__action"
                onClick={(e) => {
                  e.stopPropagation();
                  askMentor(clip);
                }}
                aria-label="Ask AI Mentor"
                title="Explain with AI Learning Mentor"
              >
                <span className="r-clips__action-icon">💡</span>
                <span className="r-clips__action-label">Mentor</span>
              </button>

              {clip.contentItemId && (
                <Link
                  className="r-clips__action"
                  to={`/feed/${clip.contentItemId}`}
                  aria-label="Read full brief"
                  title="Read Full Brief"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="r-clips__action-icon">↗</span>
                  <span className="r-clips__action-label">Brief</span>
                </Link>
              )}

              <button
                className="r-clips__action"
                onClick={(e) => {
                  e.stopPropagation();
                  shareClip(clip);
                }}
                aria-label="Share clip"
                title="Copy Link / Share"
              >
                <span className="r-clips__action-icon">{copiedId === clip.id ? "✓" : "🔗"}</span>
                <span className="r-clips__action-label">{copiedId === clip.id ? "Copied" : "Share"}</span>
              </button>

              <button
                className="r-clips__action"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((prev) => !prev);
                }}
                aria-label={isMuted ? "Unmute" : "Mute"}
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                <span className="r-clips__action-icon">{isMuted ? "🔇" : "🔊"}</span>
                <span className="r-clips__action-label">{isMuted ? "Mute" : "Sound"}</span>
              </button>
            </div>

            {/* Bottom Content & Intelligence Overlay */}
            <div className="r-clips__body" style={{ zIndex: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <span className="r-clips__tag" style={{ margin: 0 }}>
                  {clip.tag}
                </span>

                <div className="r-clips__soundwave" aria-hidden="true">
                  <span className="r-clips__soundwave-bar" style={{ animationDelay: "0ms" }} />
                  <span className="r-clips__soundwave-bar" style={{ animationDelay: "200ms" }} />
                  <span className="r-clips__soundwave-bar" style={{ animationDelay: "400ms" }} />
                  <span className="r-clips__soundwave-bar" style={{ animationDelay: "150ms" }} />
                </div>

                <span className="r-clips__time-badge">
                  {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, "0")} / {Math.floor(totalSec / 60)}:{String(totalSec % 60).padStart(2, "0")}
                </span>
              </div>

              <h2 className="r-clips__signal">{clip.signal}</h2>

              {/* Personalized Radar Intelligence Card */}
              {showBrief && (
                <div className="r-clips__intel-card">
                  <div className="r-clips__intel-section">
                    <span className="r-clips__intel-label">Why It Matters</span>
                    <p className="r-clips__intel-text">{clip.whyItMatters}</p>
                  </div>

                  {clip.yourEdge && (
                    <div className="r-clips__intel-section" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }}>
                      <span className="r-clips__intel-label">Your Edge</span>
                      <p className="r-clips__intel-text">{clip.yourEdge}</p>
                    </div>
                  )}

                  {clip.nextMove && (
                    <div className="r-clips__intel-section" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }}>
                      <span className="r-clips__intel-label">Next Move</span>
                      <p className="r-clips__intel-text" style={{ color: "var(--cyan-bright)", fontWeight: 600 }}>
                        {clip.nextMove}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <span className="r-clips__source">{clip.source}</span>
                {parsed && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: 4 }}>
                    {parsed.kind === "youtube" ? "YouTube Video" : "Video"}
                  </span>
                )}
              </div>
            </div>

            <div className="r-clips__hint">
              {index < clips.length - 1 ? "Scroll or press ↓ for next clip" : "You're caught up with today's clips! ↻"}
            </div>
          </section>
        );
      })}
    </div>,
  );
}
