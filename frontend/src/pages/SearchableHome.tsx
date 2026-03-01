import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import type { NoteResponse, Category } from "../types/api";
import "../styles/global.css";

// ── Accent palettes ────────────────────────────────────────────────────────────
const ACCENTS = {
  rose:       { bg: "#fef0f0", border: "rgba(220,140,140,0.35)", tagBg: "rgba(220,130,130,0.15)", tagText: "#b05050", dot: "#e8a0a0", glow: "rgba(232,160,160,0.2)", folder: "#f8d8d8" },
  periwinkle: { bg: "#f0f0fe", border: "rgba(140,148,220,0.35)", tagBg: "rgba(130,140,210,0.15)", tagText: "#5058b0", dot: "#a0a8dc", glow: "rgba(160,168,220,0.2)", folder: "#d8d8f8" },
  sage:       { bg: "#f0f7f1", border: "rgba(120,170,130,0.35)", tagBg: "rgba(110,160,120,0.15)", tagText: "#3d7a50", dot: "#88b894", glow: "rgba(136,184,148,0.2)", folder: "#d4ecda" },
  honey:      { bg: "#fef8ec", border: "rgba(210,175,100,0.35)", tagBg: "rgba(200,165,85,0.15)",  tagText: "#8a6820", dot: "#d4b060", glow: "rgba(212,176,96,0.2)",  folder: "#f4e4c0" },
  lavender:   { bg: "#f4f0fe", border: "rgba(168,140,220,0.35)", tagBg: "rgba(158,130,210,0.15)", tagText: "#6848b0", dot: "#b8a0dc", glow: "rgba(184,160,220,0.2)", folder: "#e4d8f8" },
};
type AccentKey = keyof typeof ACCENTS;
const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

// ── Display shape ──────────────────────────────────────────────────────────────
interface DisplayNote {
  id: string;
  title: string;
  summary: string;
  date: string;
  accent: AccentKey;
  tailSide: "left" | "right";
  tags: string[];
  research: { title: string; url: string }[];
  isProcessing: boolean;
}

function accentFromCategory(name: string | undefined, index: number): AccentKey {
  if (name) {
    let hash = 0;
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
    return ACCENT_KEYS[hash % ACCENT_KEYS.length];
  }
  return ACCENT_KEYS[index % ACCENT_KEYS.length];
}

function toDisplay(note: NoteResponse, index: number): DisplayNote {
  // Voice note still being processed by Celery (no content yet)
  const isProcessing = note.content_type === "voice" && !note.processed_content && !note.raw_content.trim();
  const content = note.processed_content || note.raw_content;
  const lines = content.split("\n");
  const firstLine = lines[0].trim();
  const title = isProcessing
    ? "transcribing…"
    : note.title || (firstLine.length > 70 ? firstLine.slice(0, 70) + "…" : firstLine || "Untitled");
  const summary = isProcessing
    ? "your voice note is being processed by whisper"
    : lines.slice(1).join("\n").trim() || note.raw_content;
  const date = new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const accent = (note.color as AccentKey) || accentFromCategory(note.category?.name, index);
  return {
    id: note.id,
    title,
    summary,
    date,
    accent,
    tailSide: index % 2 === 0 ? "left" : "right",
    tags: note.tags,
    research: note.resources.map(r => ({ title: r.title || r.url, url: r.url })),
    isProcessing,
  };
}

// ── Floating micro-bubbles background ─────────────────────────────────────────
const BubbleField = () => {
  const bubbles = [
    { size: 14, x: "8%",  dur: "12s", delay: "0s",   op: 0.45, color: "#d4b0c8" },
    { size: 22, x: "18%", dur: "16s", delay: "2s",   op: 0.3,  color: "#a0b8d8" },
    { size: 9,  x: "30%", dur: "10s", delay: "4s",   op: 0.4,  color: "#b8d4b8" },
    { size: 18, x: "55%", dur: "14s", delay: "1s",   op: 0.28, color: "#e8c0b0" },
    { size: 11, x: "70%", dur: "11s", delay: "3.5s", op: 0.38, color: "#c8b8e8" },
    { size: 26, x: "82%", dur: "18s", delay: "0.5s", op: 0.22, color: "#b8d8c8" },
    { size: 8,  x: "92%", dur: "9s",  delay: "5s",   op: 0.42, color: "#d8c0a8" },
    { size: 16, x: "44%", dur: "13s", delay: "6s",   op: 0.32, color: "#a8c0e0" },
    { size: 12, x: "62%", dur: "15s", delay: "2.5s", op: 0.36, color: "#d0b8d8" },
    { size: 20, x: "5%",  dur: "17s", delay: "7s",   op: 0.25, color: "#b0d0b8" },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {bubbles.map((b, i) => (
        <div key={i} style={{
          position: "absolute", bottom: "-40px", left: b.x,
          width: b.size, height: b.size, borderRadius: "50%",
          border: `1.5px solid ${b.color}`, background: `${b.color}22`,
          opacity: b.op, animation: `riseUp ${b.dur} ease-in-out infinite`,
          animationDelay: b.delay,
        }}/>
      ))}
    </div>
  );
};

// ── Thought bubble SVG tail ────────────────────────────────────────────────────
const BubbleTail = ({ color, borderColor, side = "left" }: { color: string; borderColor: string; side?: string }) => (
  <svg width="36" height="28" viewBox="0 0 36 28" style={{
    position: "absolute", bottom: "-26px",
    left: side === "left" ? "28px" : undefined,
    right: side === "right" ? "28px" : undefined,
    display: "block", overflow: "visible",
    filter: "drop-shadow(0px 2px 3px rgba(160,140,120,0.08))",
  }}>
    <path d="M4 0 Q10 14 0 26 Q16 20 32 24 Q22 10 28 0" fill={color} stroke={borderColor} strokeWidth="1.5" strokeLinejoin="round"/>
    <circle cx="4" cy="26" r="3.5" fill={color} stroke={borderColor} strokeWidth="1.2"/>
    <circle cx="1" cy="30" r="2" fill={color} stroke={borderColor} strokeWidth="1"/>
  </svg>
);

// ── Icons ──────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const ArrowIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z"/>
  </svg>
);
const BackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const FolderIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={color} stroke="none">
    <path d="M3 7C3 5.9 3.9 5 5 5H10.17C10.7 5 11.21 5.21 11.59 5.59L12.41 6.41C12.79 6.79 13.3 7 13.83 7H19C20.1 7 21 7.9 21 9V18C21 19.1 20.1 20 19 20H5C3.9 20 3 19.1 3 18V7Z"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);
const PencilIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const LinkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const ImageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const EditIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// ── TranscribeModal ────────────────────────────────────────────────────────────
// Records real audio via MediaRecorder → uploads to backend → Whisper transcribes
const TranscribeModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (noteId: string) => void;
}) => {
  type Phase = "idle" | "requesting" | "recording" | "uploading" | "error";
  const [phase, setPhase] = useState<Phase>("idle");
  const [secs, setSecs] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(28).fill(4));
  const [errorMsg, setErrorMsg] = useState("");

  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const streamRef    = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const startRecording = async () => {
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Web Audio analyser for real waveform
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => {
        analyser.getByteFrequencyData(dataArr);
        setBars(Array.from({ length: 28 }, (_, i) => {
          const idx = Math.floor(i * dataArr.length / 28);
          return Math.max(4, (dataArr[idx] / 255) * 52);
        }));
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);
      recorderRef.current = recorder;

      // Timer
      setSecs(0);
      timerRef.current = setInterval(() => setSecs(s => s + 1), 1000);
      setPhase("recording");
    } catch {
      setPhase("error");
      setErrorMsg("Microphone access denied. Please allow access in your browser settings and try again.");
    }
  };

  const stopAndUpload = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());

    const recorder = recorderRef.current;
    if (!recorder) return;
    setPhase("uploading");

    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || "audio/webm";
      const ext = mimeType.includes("ogg") ? "ogg" : "webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const file = new File([blob], `voice_note.${ext}`, { type: mimeType });

      const form = new FormData();
      form.append("content_type", "voice");
      form.append("content", "");
      form.append("file", file, file.name);

      try {
        const data = await api.post<{ id: string }>("/api/notes/", form);
        onCreated(data.id);
      } catch {
        setPhase("error");
        setErrorMsg("Upload failed — please check your connection and try again.");
      }
    };
    recorder.stop();
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Shared label/subtitle text
  const titles: Record<Phase, string> = {
    idle:      "✦ new voice note",
    requesting: "requesting mic…",
    recording: "listening",
    uploading: "sending to clair…",
    error:     "something went wrong",
  };
  const subtitles: Record<Phase, string> = {
    idle:      "speak freely — whisper will capture every word",
    requesting: "allowing microphone access…",
    recording: fmt(secs),
    uploading: "your thought is being transcribed",
    error:     errorMsg,
  };

  const isRecording = phase === "recording";
  const isIdle      = phase === "idle";
  const isUploading = phase === "uploading";
  const isError     = phase === "error";

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(18,14,10,0.72)", backdropFilter: "blur(20px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={isRecording ? undefined : onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: "min(420px,94vw)", position: "relative", animation: "popBubble 0.35s cubic-bezier(.22,.68,0,1.3)" }}
      >
        {/* Card */}
        <div style={{
          background: "linear-gradient(160deg, #1e1812 0%, #16120e 100%)",
          border: "1.5px solid rgba(255,240,220,0.08)",
          borderRadius: "28px",
          padding: "36px 32px 28px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          overflow: "hidden",
          position: "relative",
        }}>
          {/* Subtle ambient glow */}
          <div style={{ position: "absolute", top: "-60px", left: "50%", transform: "translateX(-50%)", width: "200px", height: "200px", background: isRecording ? "radial-gradient(circle, rgba(232,160,160,0.12) 0%, transparent 70%)" : "radial-gradient(circle, rgba(130,175,140,0.1) 0%, transparent 70%)", pointerEvents: "none", transition: "background 0.6s ease" }}/>

          {/* Close */}
          {!isRecording && !isUploading && (
            <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
              <CloseIcon/>
            </button>
          )}

          {/* Title */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "rgba(255,248,238,0.92)", fontWeight: "600", marginBottom: "6px", letterSpacing: "-0.01em" }}>
              {titles[phase]}
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: isError ? "#e8a0a0" : "rgba(255,240,220,0.38)", fontWeight: "300", letterSpacing: "0.02em", transition: "color 0.3s" }}>
              {subtitles[phase]}
            </div>
          </div>

          {/* Central visualisation area */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "28px", marginBottom: "28px" }}>

            {/* Waveform / mic orb */}
            {isIdle && (
              <div style={{ position: "relative", width: "100px", height: "100px" }}>
                {/* Pulse rings */}
                <div style={{ position: "absolute", inset: "-16px", borderRadius: "50%", border: "1.5px solid rgba(130,175,140,0.2)", animation: "pulseRing 2.4s ease-out infinite" }}/>
                <div style={{ position: "absolute", inset: "-8px", borderRadius: "50%", border: "1.5px solid rgba(130,175,140,0.15)", animation: "pulseRing 2.4s ease-out infinite 0.6s" }}/>
                <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "linear-gradient(145deg, rgba(130,175,140,0.25), rgba(106,152,120,0.15))", border: "1.5px solid rgba(130,175,140,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(130,175,140,0.9)", boxShadow: "0 0 32px rgba(130,175,140,0.12), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                  <MicIcon/>
                </div>
              </div>
            )}

            {(phase === "requesting") && (
              <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "linear-gradient(145deg, rgba(200,185,165,0.12), rgba(180,165,145,0.08))", border: "1.5px solid rgba(200,185,165,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(200,185,165,0.5)" }}>
                <div style={{ width: "28px", height: "28px", border: "2.5px solid rgba(200,185,165,0.3)", borderTopColor: "rgba(200,185,165,0.7)", borderRadius: "50%", animation: "spin 0.9s linear infinite" }}/>
              </div>
            )}

            {isRecording && (
              <>
                {/* Live waveform bars */}
                <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "60px" }}>
                  {bars.map((h, i) => (
                    <div key={i} style={{
                      width: "3px", borderRadius: "2px",
                      height: `${h}px`,
                      background: `linear-gradient(to top, rgba(232,160,160,0.9), rgba(200,130,130,0.5))`,
                      transition: "height 0.08s ease",
                      boxShadow: h > 20 ? "0 0 6px rgba(232,160,160,0.4)" : "none",
                    }}/>
                  ))}
                </div>
                {/* Rec indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#e87070", animation: "recBlink 1.2s ease-in-out infinite", boxShadow: "0 0 8px rgba(232,112,112,0.6)" }}/>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "rgba(255,240,220,0.5)", letterSpacing: "0.12em", fontWeight: "600" }}>REC</span>
                </div>
              </>
            )}

            {isUploading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(145deg, rgba(130,175,140,0.15), rgba(106,152,120,0.08))", border: "1.5px solid rgba(130,175,140,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "28px", height: "28px", border: "2.5px solid rgba(130,175,140,0.25)", borderTopColor: "rgba(130,175,140,0.8)", borderRadius: "50%", animation: "spin 0.9s linear infinite" }}/>
                </div>
                <div style={{ display: "flex", gap: "5px" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(130,175,140,0.6)", animation: `bounce 1.2s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}/>
                  ))}
                </div>
              </div>
            )}

            {isError && (
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(220,100,100,0.1)", border: "1.5px solid rgba(220,100,100,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px" }}>
                ×
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            {isIdle && (
              <button
                onClick={startRecording}
                style={{ flex: 1, background: "linear-gradient(135deg, rgba(130,175,140,0.28), rgba(106,152,120,0.2))", color: "rgba(180,230,190,0.9)", border: "1.5px solid rgba(130,175,140,0.3)", borderRadius: "16px", padding: "14px", fontWeight: "700", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "9px", fontFamily: "var(--font-body)", letterSpacing: "0.01em", transition: "all 0.18s", boxShadow: "0 2px 16px rgba(130,175,140,0.08)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(130,175,140,0.38), rgba(106,152,120,0.28))"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(130,175,140,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(130,175,140,0.28), rgba(106,152,120,0.2))"; e.currentTarget.style.boxShadow = "0 2px 16px rgba(130,175,140,0.08)"; }}
              >
                <MicIcon/> start recording
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopAndUpload}
                style={{ flex: 1, background: "linear-gradient(135deg, rgba(232,130,130,0.22), rgba(200,100,100,0.15))", color: "rgba(255,200,200,0.9)", border: "1.5px solid rgba(220,120,120,0.3)", borderRadius: "16px", padding: "14px", fontWeight: "700", fontSize: "14px", cursor: "pointer", fontFamily: "var(--font-body)", letterSpacing: "0.01em", display: "flex", alignItems: "center", justifyContent: "center", gap: "9px", transition: "all 0.18s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(232,130,130,0.32), rgba(200,100,100,0.25))"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(232,130,130,0.22), rgba(200,100,100,0.15))"; }}
              >
                <span style={{ display: "inline-block", width: "11px", height: "11px", borderRadius: "2px", background: "rgba(255,200,200,0.9)", flexShrink: 0 }}/>
                stop & save
              </button>
            )}

            {isError && (
              <>
                <button
                  onClick={() => { setPhase("idle"); setErrorMsg(""); setSecs(0); }}
                  style={{ flex: 1, background: "linear-gradient(135deg, rgba(130,175,140,0.2), rgba(106,152,120,0.14))", color: "rgba(180,230,190,0.8)", border: "1.5px solid rgba(130,175,140,0.25)", borderRadius: "16px", padding: "14px", fontWeight: "700", fontSize: "13.5px", cursor: "pointer", fontFamily: "var(--font-body)" }}
                >
                  try again
                </button>
                <button
                  onClick={onClose}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.08)", color: "rgba(255,240,220,0.35)", borderRadius: "16px", padding: "14px 18px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "13px" }}
                >
                  close
                </button>
              </>
            )}
          </div>

          {/* Footer hint */}
          {isRecording && (
            <p style={{ marginTop: "14px", textAlign: "center", fontSize: "11px", color: "rgba(255,240,220,0.18)", fontFamily: "var(--font-body)" }}>
              tap stop when you're done speaking
            </p>
          )}
          {isIdle && (
            <p style={{ marginTop: "14px", textAlign: "center", fontSize: "11px", color: "rgba(255,240,220,0.18)", fontFamily: "var(--font-body)" }}>
              whisper-1 · your words stay private
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Note Detail Modal ──────────────────────────────────────────────────────────
const NoteModal = ({
  note,
  onClose,
  onDelete,
}: {
  note: DisplayNote;
  onClose: () => void;
  onDelete?: () => void;
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const acc = ACCENTS[note.accent];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(245,240,234,0.82)", backdropFilter: "blur(12px)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "relative", width: "min(580px, 94vw)", animation: "popBubble 0.38s cubic-bezier(.22,.68,0,1.3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: acc.bg, border: `2px solid ${acc.border}`, borderRadius: "32px", padding: "36px 36px 30px", boxShadow: `0 8px 40px ${acc.glow}, 0 2px 16px rgba(160,140,120,0.1)`, position: "relative" }}>
          {/* Top-right buttons */}
          <div style={{ position: "absolute", top: 18, right: 18, display: "flex", gap: "6px", alignItems: "center" }}>
            {onDelete && !deleteConfirm && (
              <button onClick={() => setDeleteConfirm(true)} style={{ background: "rgba(220,100,100,0.08)", border: "1.5px solid rgba(220,100,100,0.2)", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#b05050" }}>
                <TrashIcon/>
              </button>
            )}
            {deleteConfirm && (
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#b05050", fontFamily: "var(--font-body)" }}>delete?</span>
                <button onClick={() => { onDelete?.(); }} style={{ padding: "4px 8px", background: "#dc6464", border: "none", borderRadius: "8px", fontSize: "11px", color: "#fff", cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: "700" }}>yes</button>
                <button onClick={() => setDeleteConfirm(false)} style={{ padding: "4px 8px", background: "rgba(0,0,0,0.06)", border: "none", borderRadius: "8px", fontSize: "11px", color: "#7a6858", cursor: "pointer", fontFamily: "var(--font-body)" }}>no</button>
              </div>
            )}
            <button onClick={onClose} style={{ background: "rgba(0,0,0,0.06)", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9a8880" }}>
              <CloseIcon/>
            </button>
          </div>

          <div style={{ fontSize: "11.5px", color: "#b0a090", fontFamily: "var(--font-body)", marginBottom: "7px", letterSpacing: "0.04em" }}>{note.date}</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: "#3a3028", marginBottom: "14px", lineHeight: "1.25", fontWeight: "600", paddingRight: "30px" }}>{note.title}</h2>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
            {note.tags.map(t => <span key={t} style={{ background: acc.tagBg, color: acc.tagText, borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "700" }}>{t}</span>)}
          </div>
          <p style={{ fontSize: "14.5px", color: "#6a5a50", lineHeight: "1.75", fontFamily: "var(--font-body)", marginBottom: "26px" }}>{note.summary}</p>
          {note.research.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "20px", padding: "18px 20px", border: `1.5px dashed ${acc.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <span style={{ color: acc.tagText }}><SparkleIcon/></span>
                <span style={{ fontSize: "11px", color: acc.tagText, fontFamily: "var(--font-body)", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase" }}>Explore further</span>
              </div>
              {note.research.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "9px", marginBottom: "9px" }}>
                  <span style={{ color: acc.tagText, flexShrink: 0, marginTop: "3px" }}><ArrowIcon/></span>
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13.5px", color: acc.tagText, fontFamily: "var(--font-body)", lineHeight: "1.55", textDecoration: "underline", textUnderlineOffset: "2px" }}>{r.title}</a>
                  ) : (
                    <span style={{ fontSize: "13.5px", color: "#6a5a50", fontFamily: "var(--font-body)", lineHeight: "1.55" }}>{r.title}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <BubbleTail color={acc.bg} borderColor={acc.border} side={note.tailSide}/>
        <div style={{ position: "absolute", bottom: "-50px", left: note.tailSide === "left" ? "22px" : undefined, right: note.tailSide === "right" ? "22px" : undefined, display: "flex", gap: "7px", alignItems: "flex-end", flexDirection: note.tailSide === "right" ? "row-reverse" : "row" }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: acc.bg, border: `1.5px solid ${acc.border}` }}/>
          <div style={{ width: 5.5, height: 5.5, borderRadius: "50%", background: acc.bg, border: `1.2px solid ${acc.border}`, opacity: 0.8 }}/>
          <div style={{ width: 3.5, height: 3.5, borderRadius: "50%", background: acc.bg, border: `1px solid ${acc.border}`, opacity: 0.6 }}/>
        </div>
      </div>
    </div>
  );
};

// ── Note Card (rectangular grid) ──────────────────────────────────────────────
const NoteCard = ({ note, onClick, index }: { note: DisplayNote; onClick?: () => void; index: number }) => {
  const acc = ACCENTS[note.accent];
  const [hovered, setHovered] = useState(false);

  if (note.isProcessing) {
    return (
      <div style={{
        background: "linear-gradient(145deg, rgba(22,18,14,0.94), rgba(18,14,10,0.96))",
        border: "1.5px solid rgba(255,240,220,0.07)",
        borderRadius: "18px", padding: "18px 18px 16px",
        display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "160px",
        animation: `floatIn 0.45s cubic-bezier(.22,.68,0,1.1) both`, animationDelay: `${index * 0.07}s`,
        position: "relative", overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
      }}>
        {/* Ambient red glow */}
        <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "80px", background: "radial-gradient(circle at top right, rgba(232,130,130,0.12) 0%, transparent 70%)", borderRadius: "0 18px 0 0", pointerEvents: "none" }}/>
        {/* Blinking rec dot */}
        <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#e87070", animation: "recBlink 1.4s ease-in-out infinite", boxShadow: "0 0 6px rgba(232,112,112,0.5)" }}/>
          <span style={{ fontSize: "9px", color: "rgba(232,160,160,0.6)", fontFamily: "var(--font-body)", fontWeight: "700", letterSpacing: "0.1em" }}>transcribing</span>
        </div>
        <div>
          {/* Mini waveform bars */}
          <div style={{ display: "flex", alignItems: "center", gap: "2.5px", marginBottom: "12px", height: "20px" }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{
                width: "2.5px", borderRadius: "2px",
                background: "rgba(232,160,160,0.5)",
                animation: `wave ${0.6 + (i % 5) * 0.14}s ease-in-out infinite alternate`,
                animationDelay: `${(i * 0.07) % 0.5}s`,
                minHeight: "3px", maxHeight: "18px",
              }}/>
            ))}
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", color: "rgba(255,240,220,0.45)", fontWeight: "500", lineHeight: "1.35", fontStyle: "italic" }}>
            transcribing…
          </div>
          <p style={{ marginTop: "6px", fontSize: "11.5px", color: "rgba(255,240,220,0.22)", lineHeight: "1.5", fontFamily: "var(--font-body)", fontWeight: "300" }}>
            whisper is processing your recording
          </p>
        </div>
        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ fontSize: "10.5px", color: "rgba(255,240,220,0.2)", fontFamily: "var(--font-body)" }}>{note.date}</span>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      background: acc.bg, border: `2px solid ${acc.border}`, borderRadius: "18px",
      padding: "18px 18px 16px", cursor: "pointer",
      display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "160px",
      boxShadow: hovered ? `0 10px 32px ${acc.glow}, 0 2px 12px rgba(160,140,120,0.1)` : `0 2px 12px ${acc.glow}, 0 1px 4px rgba(160,140,120,0.05)`,
      transform: hovered ? "translateY(-3px)" : "translateY(0)",
      transition: "transform 0.22s ease, box-shadow 0.22s ease",
      animation: `floatIn 0.45s cubic-bezier(.22,.68,0,1.1) both`, animationDelay: `${index * 0.07}s`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: "64px", height: "64px", background: `radial-gradient(circle at top right, ${acc.dot}55 0%, transparent 70%)`, borderRadius: "0 18px 0 0", pointerEvents: "none" }}/>
      <div style={{ position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: "50%", background: acc.dot, opacity: 0.85 }}/>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "#3a3028", fontWeight: "600", lineHeight: "1.35", marginBottom: "7px", paddingRight: "16px" }}>{note.title}</div>
        <p style={{ fontSize: "12px", color: "#8a7a70", lineHeight: "1.6", fontFamily: "var(--font-body)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{note.summary}</p>
      </div>
      <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "5px" }}>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {note.tags.map(t => <span key={t} style={{ background: acc.tagBg, color: acc.tagText, borderRadius: "20px", padding: "2px 9px", fontSize: "10.5px", fontFamily: "var(--font-body)", fontWeight: "700" }}>{t}</span>)}
        </div>
        <span style={{ fontSize: "10.5px", color: "#c0b0a0", fontFamily: "var(--font-body)", flexShrink: 0 }}>{note.date}</span>
      </div>
    </div>
  );
};

// ── Folder Result Card ─────────────────────────────────────────────────────────
const FolderCard = ({ note, onClick, index }: { note: DisplayNote; onClick?: () => void; index: number }) => {
  const acc = ACCENTS[note.accent];
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        animation: `folderSlideIn 0.42s cubic-bezier(.22,.68,0,1.1) both`,
        animationDelay: `${index * 0.08}s`,
        position: "relative",
      }}>
      <div style={{
        height: "18px", width: "90px",
        background: acc.folder,
        borderRadius: "8px 8px 0 0",
        border: `1.5px solid ${acc.border}`,
        borderBottom: "none",
        marginLeft: "14px",
        position: "relative", zIndex: 1,
        transition: "width 0.2s ease",
      }}/>
      <div style={{
        background: hovered ? acc.bg : `linear-gradient(160deg, ${acc.folder} 0%, ${acc.bg} 40%)`,
        border: `1.5px solid ${acc.border}`,
        borderRadius: "0 12px 12px 12px",
        padding: "18px 20px 16px",
        boxShadow: hovered
          ? `0 12px 36px ${acc.glow}, 0 3px 12px rgba(160,140,120,0.1)`
          : `0 3px 16px ${acc.glow}, 0 1px 6px rgba(160,140,120,0.06)`,
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "transform 0.22s ease, box-shadow 0.22s ease, background 0.2s ease",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "80px", background: `radial-gradient(circle at top right, ${acc.dot}40 0%, transparent 70%)`, borderRadius: "0 12px 0 0", pointerEvents: "none" }}/>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FolderIcon color={acc.dot}/>
            <span style={{ fontSize: "10.5px", color: acc.tagText, fontFamily: "var(--font-body)", fontWeight: "700", letterSpacing: "0.04em", textTransform: "uppercase" }}>note</span>
          </div>
          <span style={{ fontSize: "11px", color: "#c0b0a0", fontFamily: "var(--font-body)" }}>{note.date}</span>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "#3a3028", fontWeight: "600", lineHeight: "1.3", marginBottom: "8px", paddingRight: "12px" }}>
          {note.title}
        </div>
        <p style={{ fontSize: "12px", color: "#8a7a70", lineHeight: "1.6", fontFamily: "var(--font-body)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "12px" }}>
          {note.summary}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {note.tags.map(t => <span key={t} style={{ background: acc.tagBg, color: acc.tagText, borderRadius: "20px", padding: "2px 9px", fontSize: "10.5px", fontFamily: "var(--font-body)", fontWeight: "700" }}>{t}</span>)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: acc.tagText, fontFamily: "var(--font-body)", opacity: 0.8 }}>
            <SparkleIcon/> {note.research.length} links
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Category Tabs ──────────────────────────────────────────────────────────────
const CategoryTabs = ({
  categories,
  activeCategory,
  onSelect,
  onRename,
  onDelete,
}: {
  categories: Category[];
  activeCategory: string | null;
  onSelect: (id: string | null) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [hoveringId, setHoveringId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditValue(cat.name);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = (id: string) => {
    if (editValue.trim() && editValue.trim() !== categories.find(c => c.id === id)?.name) {
      onRename(id, editValue.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this category? Notes will not be deleted.")) {
      onDelete(id);
    }
  };

  const pillBase: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "4px",
    padding: "5px 13px", borderRadius: "20px",
    fontFamily: "var(--font-body)", fontSize: "12.5px", fontWeight: "600",
    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
    transition: "all 0.15s", border: "1.5px solid transparent",
  };

  return (
    <div style={{ width: "100%", maxWidth: "780px", marginBottom: "12px" }}>
      <div style={{
        display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px",
        scrollbarWidth: "none",
      }}>
        {/* All tab */}
        <button
          onClick={() => onSelect(null)}
          style={{
            ...pillBase,
            background: activeCategory === null ? "rgba(130,175,140,0.18)" : "rgba(255,255,255,0.7)",
            border: `1.5px solid ${activeCategory === null ? "rgba(130,175,140,0.5)" : "rgba(200,185,168,0.3)"}`,
            color: activeCategory === null ? "#3d7a50" : "#8a7a6a",
          }}
        >
          All
        </button>

        {categories.map(cat => (
          <div
            key={cat.id}
            style={{ position: "relative", flexShrink: 0 }}
            onMouseEnter={() => setHoveringId(cat.id)}
            onMouseLeave={() => setHoveringId(null)}
          >
            {editingId === cat.id ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => commitEdit(cat.id)}
                onKeyDown={e => {
                  if (e.key === "Enter") commitEdit(cat.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                style={{
                  padding: "5px 10px", borderRadius: "20px",
                  fontFamily: "var(--font-body)", fontSize: "12.5px", fontWeight: "600",
                  border: "1.5px solid rgba(130,175,140,0.5)",
                  outline: "none", background: "rgba(255,255,255,0.9)",
                  color: "#3d7a50", width: `${Math.max(editValue.length * 8 + 24, 80)}px`,
                }}
              />
            ) : (
              <button
                onClick={() => onSelect(cat.id)}
                onDoubleClick={() => startEdit(cat)}
                style={{
                  ...pillBase,
                  background: activeCategory === cat.id ? "rgba(130,175,140,0.18)" : "rgba(255,255,255,0.7)",
                  border: `1.5px solid ${activeCategory === cat.id ? "rgba(130,175,140,0.5)" : "rgba(200,185,168,0.3)"}`,
                  color: activeCategory === cat.id ? "#3d7a50" : "#8a7a6a",
                  paddingRight: hoveringId === cat.id ? "6px" : "13px",
                }}
              >
                {cat.name}
                {hoveringId === cat.id && (
                  <span
                    onClick={e => handleDelete(e, cat.id)}
                    style={{ display: "flex", alignItems: "center", marginLeft: "2px", color: "#b05050", opacity: 0.7, cursor: "pointer" }}
                    title="Delete category"
                  >
                    <CloseIcon/>
                  </span>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── FAB Palette ────────────────────────────────────────────────────────────────
const FABPalette = ({
  onNewText,
  onNewVoice,
}: {
  onNewText: () => void;
  onNewVoice: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const handleClick = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => { document.removeEventListener("keydown", handleKey); document.removeEventListener("mousedown", handleClick); };
  }, [open]);

  const miniBtn = (icon: React.ReactNode, label: string, onClick: () => void, color = "#3d6b4a") => (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-end" }}>
      {open && (
        <span style={{
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
          border: "1.5px solid rgba(200,185,168,0.3)", borderRadius: "8px",
          padding: "4px 10px", fontSize: "11.5px", fontFamily: "var(--font-body)",
          color: "#7a6a60", fontWeight: "600", whiteSpace: "nowrap",
          animation: "fadeIn 0.15s ease",
          boxShadow: "0 2px 8px rgba(140,120,100,0.08)",
        }}>{label}</span>
      )}
      <button
        onClick={onClick}
        style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
          border: "1.5px solid rgba(200,185,168,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color,
          boxShadow: "0 2px 12px rgba(140,120,100,0.12)",
          transition: "transform 0.15s, box-shadow 0.15s",
          animation: "popUp 0.2s cubic-bezier(.22,.68,0,1.3)",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 4px 18px rgba(140,120,100,0.2)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(140,120,100,0.12)"; }}
      >
        {icon}
      </button>
    </div>
  );

  const placeholderBtn = (icon: React.ReactNode, label: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-end" }}>
      {open && tooltip === label && (
        <span style={{
          background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)",
          border: "1.5px solid rgba(200,185,168,0.3)", borderRadius: "8px",
          padding: "4px 10px", fontSize: "11.5px", fontFamily: "var(--font-body)",
          color: "#b0a090", fontWeight: "600", whiteSpace: "nowrap",
          animation: "fadeIn 0.15s ease",
          boxShadow: "0 2px 8px rgba(140,120,100,0.08)",
        }}>coming soon</span>
      )}
      <button
        onClick={() => setTooltip(tooltip === label ? null : label)}
        style={{
          width: 42, height: 42, borderRadius: "50%",
          background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)",
          border: "1.5px solid rgba(200,185,168,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#c0b0a0",
          boxShadow: "0 2px 8px rgba(140,120,100,0.07)",
          animation: "popUp 0.2s cubic-bezier(.22,.68,0,1.3)",
        }}
      >
        {icon}
      </button>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9, background: "rgba(250,246,240,0.4)", backdropFilter: "blur(2px)" }}
        />
      )}

      <div ref={fabRef} style={{ position: "fixed", bottom: 32, right: 32, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px" }}>
        {/* Palette items (shown when open) */}
        {open && (
          <>
            {placeholderBtn(<ImageIcon/>, "Image")}
            {placeholderBtn(<LinkIcon/>, "Link")}
            {miniBtn(<MicIcon/>, "Voice note", () => { setOpen(false); onNewVoice(); }, "#5a6a9a")}
            {miniBtn(<PencilIcon/>, "Text note", () => { setOpen(false); onNewText(); })}
          </>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            width: 52, height: 52, borderRadius: "50%",
            background: open ? "linear-gradient(145deg, #c8d8ca, #b0c8b8)" : "linear-gradient(145deg, #e8f2ea, #d2e8da)",
            border: "2px solid rgba(130,175,140,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#3d6b4a",
            boxShadow: "0 4px 20px rgba(130,175,140,0.25)",
            transition: "transform 0.22s, box-shadow 0.22s, background 0.2s",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 28px rgba(130,175,140,0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(130,175,140,0.25)"; }}
        >
          <PlusIcon/>
        </button>
      </div>
    </>
  );
};

// ── Results Page ───────────────────────────────────────────────────────────────
const ResultsPage = ({ query, results, isSearching, onBack, onSelectNote, onQueryChange, onSearch }: {
  query: string;
  results: DisplayNote[];
  isSearching: boolean;
  onBack: () => void;
  onSelectNote: (note: DisplayNote) => void;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 24px 80px", position: "relative", zIndex: 1, animation: "pageSlideIn 0.35s cubic-bezier(.22,.68,0,1.1)" }}>
      <div style={{ width: "100%", maxWidth: "780px", padding: "44px 0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <button onClick={onBack} style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)",
            border: "1.5px solid rgba(180,162,145,0.25)", borderRadius: "14px",
            padding: "0 16px", height: "44px", cursor: "pointer",
            color: "#7a6a60", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600",
            boxShadow: "0 2px 12px rgba(160,140,120,0.07)",
            transition: "transform 0.15s, box-shadow 0.15s", flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateX(-2px)"; e.currentTarget.style.boxShadow = "0 4px 18px rgba(160,140,120,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(160,140,120,0.07)"; }}
          >
            <BackIcon/> back
          </button>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: "11px",
            background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)",
            border: "2px solid rgba(130,175,140,0.4)", borderRadius: "22px",
            padding: "0 18px", height: "52px",
            boxShadow: "0 3px 20px rgba(130,175,140,0.1)",
          }}>
            <span style={{ color: "#82af8c", flexShrink: 0 }}><SearchIcon/></span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && query.trim()) onSearch(query); if (e.key === "Escape") onBack(); }}
              style={{ flex: 1, background: "none", border: "none", color: "#3a3028", fontSize: "15px", fontFamily: "var(--font-body)", fontWeight: "400", outline: "none" }}
            />
            {query && <button onClick={() => onQueryChange("")} style={{ background: "none", border: "none", color: "#c0b0a0", cursor: "pointer", flexShrink: 0 }}><CloseIcon/></button>}
          </div>
        </div>

        {isSearching ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#c0b0a0" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid rgba(130,175,140,0.3)", borderTopColor: "#82af8c", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}/>
            <div style={{ fontSize: "14px", fontFamily: "var(--font-body)", fontWeight: "300" }}>Searching thoughts…</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "6px" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "28px", color: "#3a3028", fontWeight: "600", lineHeight: "1.2" }}>
                {results.length > 0 ? `Found ${results.length} thought${results.length !== 1 ? "s" : ""}` : "No thoughts found"}
              </h2>
            </div>
            <p style={{ fontSize: "13.5px", color: "#b0a090", fontFamily: "var(--font-body)", fontWeight: "300", marginBottom: "28px" }}>
              {results.length > 0
                ? <>matching <em style={{ color: "#8a7a6a", fontStyle: "italic" }}>"{query}"</em> across your collection</>
                : <>nothing matched <em style={{ color: "#8a7a6a", fontStyle: "italic" }}>"{query}"</em> — try different words</>
              }
            </p>

            {results.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {results.map((note, i) => (
                  <FolderCard key={note.id} note={note} index={i} onClick={() => onSelectNote(note)}/>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#c0b0a0" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "48px", marginBottom: "14px", opacity: 0.3 }}>○</div>
                <div style={{ fontSize: "15px", fontFamily: "var(--font-body)", fontWeight: "300" }}>no thoughts match that search</div>
                <button onClick={onBack} style={{ marginTop: "20px", background: "none", border: "1.5px solid rgba(180,162,145,0.3)", borderRadius: "12px", padding: "10px 20px", color: "#9a8880", fontFamily: "var(--font-body)", fontSize: "13px", cursor: "pointer" }}>
                  ← back to all thoughts
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Main App ───────────────────────────────────────────────────────────────────
export default function SearchableHome() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"home" | "results">("home");
  const [searchResults, setSearchResults] = useState<DisplayNote[]>([]);
  const [selected, setSelected] = useState<DisplayNote | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showTranscribe, setShowTranscribe] = useState(false);

  const { data: rawNotes = [], isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: () => api.get<NoteResponse[]>("/api/notes/?limit=50"),
    // Poll every 4 s while any voice note is still being transcribed/organised
    refetchInterval: (query) => {
      const data = query.state.data as NoteResponse[] | undefined;
      const hasProcessing = (data ?? []).some(
        n => n.content_type === "voice" && !n.processed_content && !n.raw_content.trim()
      );
      return hasProcessing ? 4000 : false;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/api/categories/"),
    // Also poll categories — organizer may create a new one while processing
    refetchInterval: (query) => {
      const notes = rawNotes;
      const hasProcessing = notes.some(
        n => n.content_type === "voice" && !n.processed_content && !n.raw_content.trim()
      );
      return hasProcessing ? 5000 : false;
    },
  });

  const notes: DisplayNote[] = rawNotes.map((n, i) => toDisplay(n, i));

  // Live filter on home page (search + category)
  const liveFiltered = notes.filter(n => {
    const q = query.toLowerCase();
    const matchesSearch = !q || n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.tags.some(t => t.includes(q));
    const matchesCategory = activeCategory === null || rawNotes.find(rn => rn.id === n.id)?.category?.id === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const searchMutation = useMutation({
    mutationFn: (q: string) =>
      api.post<{ notes: NoteResponse[] }>("/api/search/", { query: q, mode: "hybrid" }),
    onSuccess: (data) => {
      const results = (data.notes ?? []).map((n, i) => toDisplay(n, i));
      setSearchResults(results);
      setView("results");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => api.delete(`/api/notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setSelected(null);
    },
  });

  const renameCategoryMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Category>(`/api/categories/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setActiveCategory(null);
    },
  });

  const handleSearch = (q: string) => {
    setView("results");
    setSearchResults([]);
    searchMutation.mutate(q);
  };

  const handleBack = () => {
    setView("home");
    setSearchResults([]);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@300;400;600;700&display=swap');
        :root { --font-display: 'Playfair Display', Georgia, serif; --font-body: 'Nunito', sans-serif; --bg: #faf6f0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); font-family: var(--font-body); min-height: 100vh; }
        input:focus { outline: none; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e0d0c0; border-radius: 3px; }

        @keyframes wave { from { height: 5px; } to { height: 32px; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes popBubble { 0% { opacity: 0; transform: scale(0.8) translateY(20px); } 70% { transform: scale(1.03) translateY(-4px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes popUp { 0% { opacity: 0; transform: scale(0.6) translateY(8px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes floatIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes folderSlideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pageSlideIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes riseUp { 0% { transform: translateY(0) scale(1); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.6; } 100% { transform: translateY(-110vh) scale(0.6); opacity: 0; } }
        @keyframes heroDrift { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0%, 100% { box-shadow: 0 8px 32px rgba(130,175,140,0.18), 0 0 0 8px rgba(130,175,140,0.07); } 50% { box-shadow: 0 8px 40px rgba(130,175,140,0.3), 0 0 0 10px rgba(130,175,140,0.1); } }
        @keyframes logoBounce { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } 60% { transform: translateY(-3px); } }
        @keyframes pulseRing { 0% { transform: scale(0.9); opacity: 0.7; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes recBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px); } }
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(154,160,216,0.1) 0%, transparent 55%), radial-gradient(ellipse 55% 40% at 88% 75%, rgba(130,175,140,0.09) 0%, transparent 50%), radial-gradient(ellipse 45% 38% at 12% 68%, rgba(232,160,176,0.07) 0%, transparent 50%)" }}/>
      <BubbleField/>

      {/* Sign out */}
      <button onClick={() => signOut().then(() => navigate("/auth"))} style={{ position: "fixed", top: 20, right: 24, zIndex: 10, background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", border: "1.5px solid rgba(200,185,168,0.3)", borderRadius: "12px", padding: "6px 14px", fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "600", color: "#9a8880", cursor: "pointer" }}>
        sign out
      </button>

      {view === "results" ? (
        <ResultsPage
          query={query}
          results={searchResults}
          isSearching={searchMutation.isPending}
          onBack={handleBack}
          onSelectNote={(note) => navigate(`/note/${note.id}`)}
          onQueryChange={setQuery}
          onSearch={handleSearch}
        />
      ) : (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 24px 100px", position: "relative", zIndex: 1 }}>

          {/* Hero */}
          <div style={{ textAlign: "center", padding: "76px 0 50px", animation: "heroDrift 0.65s ease" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(145deg, #e8f2ea, #d2e8da)", border: "2px solid rgba(130,175,140,0.4)", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", animation: "shimmer 4s ease-in-out infinite, logoBounce 5s ease-in-out infinite 1s" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5a9468" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "18px", alignItems: "flex-end" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e8f2ea", border: "1.5px solid rgba(130,175,140,0.4)" }}/>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#e8f2ea", border: "1.2px solid rgba(130,175,140,0.3)" }}/>
              <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#e8f2ea", border: "1px solid rgba(130,175,140,0.25)" }}/>
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(54px, 8vw, 80px)", fontWeight: "700", color: "#3a3028", letterSpacing: "-0.01em", lineHeight: "1", marginBottom: "10px" }}>clair</h1>
            <p style={{ color: "#b0a090", fontSize: "14.5px", fontFamily: "var(--font-body)", fontWeight: "300", letterSpacing: "0.04em" }}>your thoughts, beautifully organised</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "18px" }}>
              <div style={{ width: "36px", height: "1px", background: "linear-gradient(90deg, transparent, #c8b8a8)" }}/>
              <span style={{ color: "#c8b8a8", fontSize: "14px" }}>✦</span>
              <div style={{ width: "36px", height: "1px", background: "linear-gradient(90deg, #c8b8a8, transparent)" }}/>
            </div>
          </div>

          {/* Search */}
          <div style={{ width: "100%", maxWidth: "780px", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{
                flex: 1, display: "flex", alignItems: "center", gap: "11px",
                background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)",
                border: "2px solid rgba(180,162,145,0.22)", borderRadius: "22px",
                padding: "0 18px", height: "52px",
                boxShadow: "0 3px 20px rgba(160,140,120,0.07)", transition: "border-color 0.2s, box-shadow 0.2s",
              }}
                onFocusCapture={e => { e.currentTarget.style.borderColor = "rgba(130,175,140,0.5)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(130,175,140,0.13)"; }}
                onBlurCapture={e => { e.currentTarget.style.borderColor = "rgba(180,162,145,0.22)"; e.currentTarget.style.boxShadow = "0 3px 20px rgba(160,140,120,0.07)"; }}
              >
                <span style={{ color: "#c0b0a0", flexShrink: 0 }}><SearchIcon/></span>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && query.trim()) handleSearch(query); }}
                  placeholder="search your thoughts…  ↵ to see results"
                  style={{ flex: 1, background: "none", border: "none", color: "#3a3028", fontSize: "15px", fontFamily: "var(--font-body)", fontWeight: "400" }}
                />
                {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "#c0b0a0", cursor: "pointer", flexShrink: 0 }}><CloseIcon/></button>}
              </div>
            </div>
            <p style={{ marginTop: "10px", paddingLeft: "6px", fontSize: "12px", color: "#c0b0a0", fontFamily: "var(--font-body)" }}>
              {isLoading
                ? "Loading thoughts…"
                : query
                  ? `${liveFiltered.length} thought${liveFiltered.length !== 1 ? "s" : ""} matching — press ↵ for full results`
                  : `${notes.length} thought${notes.length !== 1 ? "s" : ""} floating around`
              }
            </p>
          </div>

          {/* Processing banner — shown while voice notes are transcribing */}
          {rawNotes.some(n => n.content_type === "voice" && !n.processed_content && !n.raw_content.trim()) && (
            <div style={{ width: "100%", maxWidth: "780px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px", background: "rgba(22,18,14,0.88)", backdropFilter: "blur(12px)", border: "1.5px solid rgba(232,160,160,0.18)", borderRadius: "16px", padding: "10px 16px", animation: "fadeIn 0.3s ease" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#e87070", flexShrink: 0, animation: "recBlink 1.2s ease-in-out infinite", boxShadow: "0 0 6px rgba(232,112,112,0.5)" }}/>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "12.5px", color: "rgba(255,220,200,0.7)", fontWeight: "400" }}>
                whisper is transcribing your voice note — the page will update automatically
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: "4px", height: "4px", borderRadius: "50%", background: "rgba(232,160,160,0.5)", animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }}/>)}
              </div>
            </div>
          )}

          {/* Category tabs */}
          {categories.length > 0 && (
            <CategoryTabs
              categories={categories}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
              onRename={(id, name) => renameCategoryMutation.mutate({ id, name })}
              onDelete={id => deleteCategoryMutation.mutate(id)}
            />
          )}

          {/* Notes container */}
          <div style={{ width: "100%", maxWidth: "780px", background: "rgba(255,253,249,0.72)", backdropFilter: "blur(16px)", border: "2px solid rgba(200,185,168,0.28)", borderRadius: "32px", boxShadow: "0 8px 48px rgba(160,140,120,0.1), inset 0 2px 12px rgba(255,255,255,0.8), inset 0 -2px 8px rgba(200,180,160,0.07)", padding: "28px 24px 8px", position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1.5px dashed rgba(200,185,168,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "linear-gradient(135deg,#88b894,#6a9878)", boxShadow: "0 0 6px rgba(106,152,120,0.4)" }}/>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "#8a7a6a", fontStyle: "italic", fontWeight: "400" }}>
                  {activeCategory
                    ? categories.find(c => c.id === activeCategory)?.name || "filtered"
                    : query ? `thoughts matching "${query}"` : "all thoughts"}
                </span>
              </div>
              <span style={{ fontSize: "12px", color: "#c0b0a0", fontFamily: "var(--font-body)" }}>{liveFiltered.length} {liveFiltered.length === 1 ? "note" : "notes"}</span>
            </div>
            <div style={{ maxHeight: "560px", overflowY: liveFiltered.length > 4 ? "auto" : "visible", overflowX: "visible", paddingRight: liveFiltered.length > 4 ? "6px" : "0", paddingBottom: "20px" }}>
              {isLoading ? (
                <div style={{ textAlign: "center", padding: "52px 0 36px", color: "#c0b0a0" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", border: "3px solid rgba(130,175,140,0.3)", borderTopColor: "#82af8c", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }}/>
                  <div style={{ fontSize: "14px", fontFamily: "var(--font-body)", fontWeight: "300" }}>Loading thoughts…</div>
                </div>
              ) : liveFiltered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "52px 0 36px", color: "#c0b0a0" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "40px", marginBottom: "12px", opacity: 0.35 }}>○</div>
                  <div style={{ fontSize: "15px", fontFamily: "var(--font-body)", fontWeight: "300" }}>
                    {query ? "no thoughts match that search" : "no thoughts yet — add your first one"}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px", paddingTop: "4px" }}>
                  {liveFiltered.map((note, i) => <NoteCard key={note.id} note={note} index={i} onClick={() => setSelected(note)}/>)}
                </div>
              )}
            </div>
            {liveFiltered.length > 4 && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "48px", background: "linear-gradient(to top, rgba(255,253,249,0.95), transparent)", borderRadius: "0 0 30px 30px", pointerEvents: "none" }}/>
            )}
          </div>

          <div style={{ marginTop: "28px", display: "flex", alignItems: "center", gap: "10px", opacity: 0.28 }}>
            <div style={{ width: "22px", height: "1px", background: "#c8b8a8" }}/>
            <span style={{ color: "#c8b8a8", fontSize: "12px" }}>✦</span>
            <div style={{ width: "22px", height: "1px", background: "#c8b8a8" }}/>
          </div>
        </div>
      )}

      {/* FAB Palette */}
      <FABPalette
        onNewText={() => navigate('/note/new')}
        onNewVoice={() => setShowTranscribe(true)}
      />

      {/* Modals */}
      {selected && (
        <NoteModal
          note={selected}
          onClose={() => setSelected(null)}
          onDelete={() => deleteNoteMutation.mutate(selected.id)}
        />
      )}
      {showTranscribe && (
        <TranscribeModal
          onClose={() => setShowTranscribe(false)}
          onCreated={() => {
            setShowTranscribe(false);
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            // Stay on home — polling will auto-refresh as Whisper + organizer finish
          }}
        />
      )}
    </>
  );
}
