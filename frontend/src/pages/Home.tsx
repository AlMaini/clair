import { useState, useRef } from "react";

// ── Accent palettes ────────────────────────────────────────────────────────────
const ACCENTS = {
  rose:       { bg: "#fef0f0", border: "rgba(220,140,140,0.35)", tagBg: "rgba(220,130,130,0.15)", tagText: "#b05050", dot: "#e8a0a0", glow: "rgba(232,160,160,0.2)" },
  periwinkle: { bg: "#f0f0fe", border: "rgba(140,148,220,0.35)", tagBg: "rgba(130,140,210,0.15)", tagText: "#5058b0", dot: "#a0a8dc", glow: "rgba(160,168,220,0.2)" },
  sage:       { bg: "#f0f7f1", border: "rgba(120,170,130,0.35)", tagBg: "rgba(110,160,120,0.15)", tagText: "#3d7a50", dot: "#88b894", glow: "rgba(136,184,148,0.2)" },
  honey:      { bg: "#fef8ec", border: "rgba(210,175,100,0.35)", tagBg: "rgba(200,165,85,0.15)",  tagText: "#8a6820", dot: "#d4b060", glow: "rgba(212,176,96,0.2)" },
  lavender:   { bg: "#f4f0fe", border: "rgba(168,140,220,0.35)", tagBg: "rgba(158,130,210,0.15)", tagText: "#6848b0", dot: "#b8a0dc", glow: "rgba(184,160,220,0.2)" },
};

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
          border: `1.5px solid ${b.color}`,
          background: `${b.color}22`,
          opacity: b.op,
          animation: `riseUp ${b.dur} ease-in-out infinite`,
          animationDelay: b.delay,
        }}/>
      ))}
    </div>
  );
};

// ── Thought bubble SVG tail ────────────────────────────────────────────────────
const BubbleTail = ({ color, borderColor, side = "left" }) => (
  <svg width="36" height="28" viewBox="0 0 36 28"
    style={{
      position: "absolute", bottom: "-26px",
      left: side === "left" ? "28px" : undefined,
      right: side === "right" ? "28px" : undefined,
      display: "block", overflow: "visible",
      filter: "drop-shadow(0px 2px 3px rgba(160,140,120,0.08))",
    }}>
    <path d="M4 0 Q10 14 0 26 Q16 20 32 24 Q22 10 28 0"
      fill={color} stroke={borderColor} strokeWidth="1.5" strokeLinejoin="round"/>
    <circle cx="4" cy="26" r="3.5" fill={color} stroke={borderColor} strokeWidth="1.2"/>
    <circle cx="1" cy="30" r="2" fill={color} stroke={borderColor} strokeWidth="1"/>
  </svg>
);

// ── Icons ──────────────────────────────────────────────────────────────────────
const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);
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

// ── Waveform ───────────────────────────────────────────────────────────────────
const Waveform = ({ active }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "4px", height: "38px", justifyContent: "center" }}>
    {Array.from({ length: 22 }).map((_, i) => (
      <div key={i} style={{
        width: "4px", borderRadius: "4px",
        background: active ? "#7aab86" : "#e0d4cc",
        height: active ? undefined : "6px",
        animation: active ? `wave ${0.65 + (i % 6) * 0.13}s ease-in-out infinite alternate` : "none",
        animationDelay: `${(i * 0.055) % 0.65}s`,
        minHeight: "4px", maxHeight: "34px",
        transition: "background 0.4s",
      }}/>
    ))}
  </div>
);

// ── Mock data ──────────────────────────────────────────────────────────────────
const MOCK_NOTES = [
  {
    id: 1, title: "The Nature of Consciousness", date: "Feb 27",
    tags: ["philosophy", "mind"], accent: "rose", tilt: -1.5, tailSide: "left",
    summary: "Explored whether consciousness emerges from physical processes or exists independently. Touched on qualia, the hard problem, and integrated information theory.",
    research: ["Integrated Information Theory (IIT) — Giulio Tononi", "Global Workspace Theory — Bernard Baars", "Panpsychism and its modern defenders"],
  },
  {
    id: 2, title: "Decentralized Energy Grids", date: "Feb 25",
    tags: ["energy", "climate"], accent: "periwinkle", tilt: 1.2, tailSide: "right",
    summary: "Ideas on peer-to-peer energy trading using blockchain. Neighborhood microgrids could stabilize supply and reduce transmission loss.",
    research: ["Brooklyn Microgrid Project (LO3 Energy)", "Virtual Power Plants — aggregated DER management", "Transactive energy systems overview"],
  },
  {
    id: 3, title: "Language Shapes Thought", date: "Feb 22",
    tags: ["linguistics", "cognition"], accent: "sage", tilt: -0.8, tailSide: "left",
    summary: "Sapir-Whorf hypothesis revisited. Does the vocabulary available to us constrain or expand the concepts we can form? Color perception across languages as a test case.",
    research: ["Linguistic relativity — Boroditsky et al.", "Color categorization across cultures (Berlin & Kay)", "Universal Grammar vs. usage-based linguistics"],
  },
  {
    id: 4, title: "Fermented Foods & Gut Health", date: "Feb 19",
    tags: ["nutrition", "health"], accent: "honey", tilt: 1.8, tailSide: "right",
    summary: "Kimchi, kefir, and tempeh introduce live cultures. Gut microbiome diversity correlates with mental health — the gut-brain axis is real and fascinating.",
    research: ["Gut-brain axis and the vagus nerve", "Stanford fermented foods study (Sonnenburg Lab)", "Psychobiotics — probiotics that influence mood"],
  },
];

// ── Note Detail Modal ──────────────────────────────────────────────────────────
const NoteModal = ({ note, onClose }) => {
  const acc = ACCENTS[note.accent];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(245,240,234,0.82)", backdropFilter: "blur(12px)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "relative", width: "min(580px, 94vw)", animation: "popBubble 0.38s cubic-bezier(.22,.68,0,1.3)" }} onClick={e => e.stopPropagation()}>
        <div className="note-modal-scroll" style={{
          background: acc.bg, border: `2px solid ${acc.border}`, borderRadius: "32px",
          padding: "36px 36px 30px",
          boxShadow: `0 8px 40px ${acc.glow}, 0 2px 16px rgba(160,140,120,0.1)`,
          position: "relative",
          maxHeight: "80vh", overflowY: "auto",
        }}>
          <button onClick={onClose} style={{ position: "sticky", top: 0, float: "right", background: "rgba(0,0,0,0.06)", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9a8880", zIndex: 2 }}>
            <CloseIcon/>
          </button>
          <div style={{ fontSize: "11.5px", color: "#b0a090", fontFamily: "var(--font-body)", marginBottom: "7px", letterSpacing: "0.04em" }}>{note.date}</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: "#3a3028", marginBottom: "14px", lineHeight: "1.25", fontWeight: "600", paddingRight: "30px" }}>{note.title}</h2>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
            {note.tags.map(t => (
              <span key={t} style={{ background: acc.tagBg, color: acc.tagText, borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "700" }}>{t}</span>
            ))}
          </div>
          <div className="rendered-html" style={{ fontSize: "14.5px", color: "#6a5a50", lineHeight: "1.75", fontFamily: "var(--font-body)", marginBottom: "26px" }} dangerouslySetInnerHTML={{ __html: note.summary }}/>
          <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "20px", padding: "18px 20px", border: `1.5px dashed ${acc.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
              <span style={{ color: acc.tagText }}><SparkleIcon/></span>
              <span style={{ fontSize: "11px", color: acc.tagText, fontFamily: "var(--font-body)", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase" }}>Explore further</span>
            </div>
            {note.research.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "9px", marginBottom: "9px" }}>
                <span style={{ color: acc.tagText, flexShrink: 0, marginTop: "3px" }}><ArrowIcon/></span>
                <span style={{ fontSize: "13.5px", color: "#6a5a50", fontFamily: "var(--font-body)", lineHeight: "1.55" }}>{r}</span>
              </div>
            ))}
          </div>
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

// ── Recording Modal ────────────────────────────────────────────────────────────
const RecordingModal = ({ onClose, onSave }) => {
  const [phase, setPhase] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const recRef = useRef(null);

  const DEMO_T = "I've been thinking about how sleep affects memory consolidation. During REM sleep the hippocampus replays the day's experiences and transfers them to long-term storage. This is why pulling all-nighters before exams backfires — you might cram information but won't retain it without the sleep cycle.";
  const DEMO_R = {
    title: "Sleep & Memory Consolidation",
    tags: ["neuroscience", "learning"],
    accent: "lavender", tilt: -1.2, tailSide: "left",
    summary: "REM sleep enables the hippocampus to replay daily experiences, transferring them to long-term neocortical storage. All-nighters backfire because the consolidation cycle never runs.",
    research: ["Two-stage memory consolidation — Marr & Squire", "Sleep spindles and declarative memory (Walker Lab)", "Targeted memory reactivation during slow-wave sleep"],
  };

  const startRecording = () => {
    setPhase("recording"); setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR(); rec.continuous = true; rec.interimResults = true;
      rec.onresult = e => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setTranscript(t); };
      rec.start(); recRef.current = rec;
    } else {
      let i = 0; const words = DEMO_T.split(" ");
      const iv = setInterval(() => { if (i >= words.length) { clearInterval(iv); return; } setTranscript(t => (t ? t + " " : "") + words[i]); i++; }, 115);
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (recRef.current) recRef.current.stop();
    setPhase("processing");
    setTimeout(() => { setResult(DEMO_R); if (!transcript.trim()) setTranscript(DEMO_T); setPhase("done"); }, 2000);
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(245,240,234,0.82)", backdropFilter: "blur(14px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "min(560px, 95vw)", animation: "popBubble 0.35s cubic-bezier(.22,.68,0,1.3)" }}>
        <div style={{
          background: "linear-gradient(150deg, #fffef9 0%, #fdf5ec 100%)",
          border: "2px solid rgba(180,162,145,0.28)", borderRadius: "36px",
          padding: "38px 36px 30px",
          boxShadow: "0 12px 48px rgba(160,140,120,0.14), 0 0 0 8px rgba(255,255,255,0.5)",
          position: "relative",
        }}>
          <button onClick={onClose} style={{ position: "absolute", top: 18, right: 18, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9a8880" }}>
            <CloseIcon/>
          </button>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "24px", color: "#3a3028", marginBottom: "5px", fontWeight: "600" }}>
            {phase === "idle" && "✦ new thought"}
            {phase === "recording" && "listening…"}
            {phase === "processing" && "weaving thoughts…"}
            {phase === "done" && "thought ready ✦"}
          </h2>
          <p style={{ fontSize: "13px", color: "#b0a090", marginBottom: "26px", fontFamily: "var(--font-body)", fontWeight: "300" }}>
            {phase === "idle" && "speak freely — clair will gently organise your ideas"}
            {phase === "recording" && `recording ${fmt(seconds)} · keep going as long as you like`}
            {phase === "processing" && "floating your words into shape…"}
            {phase === "done" && "review your thought below"}
          </p>
          <div style={{ background: "rgba(255,255,255,0.75)", borderRadius: "22px", padding: "18px 22px", marginBottom: "20px", border: "1.5px solid rgba(200,185,170,0.2)", boxShadow: "inset 0 2px 10px rgba(200,180,160,0.07)" }}>
            <Waveform active={phase === "recording"}/>
            {transcript && (
              <p style={{ marginTop: "12px", fontSize: "12.5px", color: "#9a8878", fontStyle: "italic", lineHeight: "1.6", fontFamily: "var(--font-body)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                "{transcript.slice(0, 230)}{transcript.length > 230 ? "…" : ""}"
              </p>
            )}
          </div>
          {phase === "processing" && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", color: "#7aab86" }}>
              <div style={{ width: "16px", height: "16px", border: "2px solid #7aab86", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.9s linear infinite" }}/>
              <span style={{ fontSize: "13px", fontFamily: "var(--font-body)" }}>organising with clair…</span>
            </div>
          )}
          {phase === "done" && result && (
            <div style={{ marginBottom: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "10.5px", color: "#b8a898", letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: "var(--font-body)", marginBottom: "4px" }}>Title</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "21px", color: "#3a3028", fontWeight: "600" }}>{result.title}</div>
              </div>
              <div>
                <div style={{ fontSize: "10.5px", color: "#b8a898", letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: "var(--font-body)", marginBottom: "4px" }}>Summary</div>
                <p style={{ fontSize: "13.5px", color: "#6a5a50", lineHeight: "1.68", fontFamily: "var(--font-body)" }}>{result.summary}</p>
              </div>
              <div>
                <div style={{ fontSize: "10.5px", color: "#b8a898", letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: "var(--font-body)", marginBottom: "8px" }}>To explore</div>
                {result.research.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "7px" }}>
                    <span style={{ color: "#7aab86", flexShrink: 0, marginTop: "3px" }}><ArrowIcon/></span>
                    <span style={{ fontSize: "13px", color: "#6a5a50", fontFamily: "var(--font-body)" }}>{r}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {result.tags.map(t => (
                  <span key={t} style={{ background: "rgba(122,171,134,0.15)", color: "#3d7a50", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "700" }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: "10px" }}>
            {phase === "idle" && (
              <button onClick={startRecording} style={{
                flex: 1, background: "linear-gradient(135deg, #82af8c, #6a9878)", color: "#fff",
                border: "none", borderRadius: "18px", padding: "15px", fontWeight: "700",
                fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", gap: "8px", fontFamily: "var(--font-body)",
                boxShadow: "0 4px 18px rgba(106,152,120,0.32)", transition: "transform 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
              >
                <MicIcon/> start speaking
              </button>
            )}
            {phase === "recording" && (
              <button onClick={stopRecording} style={{
                flex: 1, background: "linear-gradient(135deg, #e8a0b0, #d4788a)", color: "#fff",
                border: "none", borderRadius: "18px", padding: "15px", fontWeight: "700",
                fontSize: "15px", cursor: "pointer", fontFamily: "var(--font-body)",
                boxShadow: "0 4px 18px rgba(212,120,138,0.32)",
              }}>◼ stop recording</button>
            )}
            {phase === "done" && (
              <>
                <button onClick={() => onSave(result)} style={{
                  flex: 1, background: "linear-gradient(135deg, #82af8c, #6a9878)", color: "#fff",
                  border: "none", borderRadius: "18px", padding: "15px", fontWeight: "700",
                  fontSize: "15px", cursor: "pointer", fontFamily: "var(--font-body)",
                  boxShadow: "0 4px 18px rgba(106,152,120,0.32)",
                }}>save thought ✦</button>
                <button onClick={onClose} style={{
                  background: "rgba(0,0,0,0.05)", border: "1.5px solid rgba(0,0,0,0.08)", color: "#9a8880",
                  borderRadius: "18px", padding: "15px 20px", cursor: "pointer",
                  fontFamily: "var(--font-body)", fontSize: "14px",
                }}>discard</button>
              </>
            )}
          </div>
        </div>
        <BubbleTail color="#fdf5ec" borderColor="rgba(180,162,145,0.28)" side="left"/>
        <div style={{ position: "absolute", bottom: "-48px", left: "24px", display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,253,248,0.9)", border: "1.5px solid rgba(180,162,145,0.28)" }}/>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,253,248,0.8)", border: "1.2px solid rgba(180,162,145,0.22)" }}/>
        </div>
      </div>
    </div>
  );
};

// ── Note Card (rectangular grid card) ─────────────────────────────────────────
const NoteCard = ({ note, onClick, index }) => {
  const acc = ACCENTS[note.accent];
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: acc.bg,
        border: `2px solid ${acc.border}`,
        borderRadius: "18px",
        padding: "18px 18px 16px",
        cursor: "pointer",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        minHeight: "160px",
        boxShadow: hovered ? `0 10px 32px ${acc.glow}, 0 2px 12px rgba(160,140,120,0.1)` : `0 2px 12px ${acc.glow}, 0 1px 4px rgba(160,140,120,0.05)`,
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
        animation: `floatIn 0.45s cubic-bezier(.22,.68,0,1.1) both`,
        animationDelay: `${index * 0.07}s`,
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Decorative corner wash */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: "64px", height: "64px",
        background: `radial-gradient(circle at top right, ${acc.dot}55 0%, transparent 70%)`,
        borderRadius: "0 18px 0 0", pointerEvents: "none",
      }}/>
      {/* Accent dot */}
      <div style={{ position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: "50%", background: acc.dot, opacity: 0.85 }}/>

      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "#3a3028", fontWeight: "600", lineHeight: "1.35", marginBottom: "7px", paddingRight: "16px" }}>
          {note.title}
        </div>
        <div className="rendered-html" style={{ fontSize: "12px", color: "#8a7a70", lineHeight: "1.6", fontFamily: "var(--font-body)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: note.summary }}/>
      </div>

      <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "5px" }}>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {note.tags.map(t => (
            <span key={t} style={{ background: acc.tagBg, color: acc.tagText, borderRadius: "20px", padding: "2px 9px", fontSize: "10.5px", fontFamily: "var(--font-body)", fontWeight: "700" }}>{t}</span>
          ))}
        </div>
        <span style={{ fontSize: "10.5px", color: "#c0b0a0", fontFamily: "var(--font-body)", flexShrink: 0 }}>{note.date}</span>
      </div>
    </div>
  );
};

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [notes, setNotes] = useState(MOCK_NOTES);
  const [query, setQuery] = useState("");
  const [recording, setRecording] = useState(false);
  const [selected, setSelected] = useState(null);

  const filtered = notes.filter(n => {
    const q = query.toLowerCase();
    return !q || n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.tags.some(t => t.includes(q));
  });

  const handleSave = result => {
    const accents = ["rose","periwinkle","sage","honey","lavender"];
    const tilts = [-1.8, 1.4, -0.9, 1.9, -1.3];
    const sides = ["left","right"];
    const idx = notes.length % accents.length;
    setNotes(prev => [{
      ...result, id: Date.now(),
      date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),
      accent: accents[idx], tilt: tilts[idx], tailSide: sides[idx % 2],
    }, ...prev]);
    setRecording(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@300;400;600;700&display=swap');
        :root {
          --font-display: 'Playfair Display', Georgia, serif;
          --font-body: 'Nunito', sans-serif;
          --bg: #faf6f0;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); font-family: var(--font-body); min-height: 100vh; }
        input:focus { outline: none; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e0d0c0; border-radius: 3px; }

        @keyframes wave { from { height: 5px; } to { height: 32px; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes popBubble {
          0%   { opacity: 0; transform: scale(0.8) translateY(20px); }
          70%  { transform: scale(1.03) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes riseUp {
          0%   { transform: translateY(0) scale(1);    opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-110vh) scale(0.6); opacity: 0; }
        }
        @keyframes heroDrift {
          from { opacity: 0; transform: translateY(-14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%, 100% { box-shadow: 0 8px 32px rgba(130,175,140,0.18), 0 0 0 8px rgba(130,175,140,0.07); }
          50%       { box-shadow: 0 8px 40px rgba(130,175,140,0.3),  0 0 0 10px rgba(130,175,140,0.1); }
        }
        @keyframes logoBounce {
          0%, 100% { transform: translateY(0); }
          40%      { transform: translateY(-6px); }
          60%      { transform: translateY(-3px); }
        }
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(154,160,216,0.1) 0%, transparent 55%), radial-gradient(ellipse 55% 40% at 88% 75%, rgba(130,175,140,0.09) 0%, transparent 50%), radial-gradient(ellipse 45% 38% at 12% 68%, rgba(232,160,176,0.07) 0%, transparent 50%)" }}/>
      <BubbleField/>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 24px 100px", position: "relative", zIndex: 1 }}>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "76px 0 50px", animation: "heroDrift 0.65s ease" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(145deg, #e8f2ea, #d2e8da)", border: "2px solid rgba(130,175,140,0.4)", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", animation: "shimmer 4s ease-in-out infinite, logoBounce 5s ease-in-out infinite 1s" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5a9468" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          {/* Mini trailing bubbles under logo */}
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

        {/* Search + Record */}
        <div style={{ width: "100%", maxWidth: "780px", marginBottom: "44px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: "11px",
              background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)",
              border: "2px solid rgba(180,162,145,0.22)", borderRadius: "22px",
              padding: "0 18px", height: "52px",
              boxShadow: "0 3px 20px rgba(160,140,120,0.07)",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = "rgba(130,175,140,0.5)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(130,175,140,0.13)"; }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = "rgba(180,162,145,0.22)"; e.currentTarget.style.boxShadow = "0 3px 20px rgba(160,140,120,0.07)"; }}
            >
              <span style={{ color: "#c0b0a0", flexShrink: 0 }}><SearchIcon/></span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search your thoughts…"
                style={{ flex: 1, background: "none", border: "none", color: "#3a3028", fontSize: "15px", fontFamily: "var(--font-body)", fontWeight: "400" }}
              />
              {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "#c0b0a0", cursor: "pointer", flexShrink: 0 }}><CloseIcon/></button>}
            </div>
            <button onClick={() => setRecording(true)} style={{
              height: "52px", padding: "0 22px", background: "linear-gradient(135deg, #82af8c, #6a9878)", color: "#fff",
              border: "none", borderRadius: "22px", cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: "700",
              fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0,
              boxShadow: "0 4px 20px rgba(106,152,120,0.34)", transition: "transform 0.18s, box-shadow 0.18s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(106,152,120,0.42)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(106,152,120,0.34)"; }}
            >
              <MicIcon/> record
            </button>
          </div>
          <p style={{ marginTop: "10px", paddingLeft: "6px", fontSize: "12px", color: "#c0b0a0", fontFamily: "var(--font-body)" }}>
            {query ? `${filtered.length} thought${filtered.length !== 1 ? "s" : ""} found for "${query}"` : `${notes.length} thought${notes.length !== 1 ? "s" : ""} floating around`}
          </p>
        </div>

        {/* Notes container */}
        <div style={{
          width: "100%", maxWidth: "780px",
          background: "rgba(255,253,249,0.72)",
          backdropFilter: "blur(16px)",
          border: "2px solid rgba(200,185,168,0.28)",
          borderRadius: "32px",
          boxShadow: "0 8px 48px rgba(160,140,120,0.1), inset 0 2px 12px rgba(255,255,255,0.8), inset 0 -2px 8px rgba(200,180,160,0.07)",
          padding: "28px 24px 8px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Subtle top label */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "20px", paddingBottom: "14px",
            borderBottom: "1.5px dashed rgba(200,185,168,0.35)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "linear-gradient(135deg,#88b894,#6a9878)", boxShadow: "0 0 6px rgba(106,152,120,0.4)" }}/>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "#8a7a6a", fontStyle: "italic", fontWeight: "400" }}>
                {query ? `thoughts matching "${query}"` : "all thoughts"}
              </span>
            </div>
            <span style={{ fontSize: "12px", color: "#c0b0a0", fontFamily: "var(--font-body)" }}>
              {filtered.length} {filtered.length === 1 ? "note" : "notes"}
            </span>
          </div>

          {/* Scrollable inner area */}
          <div style={{
            maxHeight: "560px",
            overflowY: filtered.length > 2 ? "auto" : "visible",
            overflowX: "visible",
            paddingRight: filtered.length > 2 ? "6px" : "0",
            paddingBottom: "20px",
          }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "52px 0 36px", color: "#c0b0a0" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "40px", marginBottom: "12px", opacity: 0.35 }}>○</div>
                <div style={{ fontSize: "15px", fontFamily: "var(--font-body)", fontWeight: "300" }}>no thoughts match that search</div>
                <div style={{ fontSize: "13px", marginTop: "5px", opacity: 0.7 }}>try different words, or start a new recording</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px", paddingTop: "4px" }}>
                {filtered.map((note, i) => <NoteCard key={note.id} note={note} index={i} onClick={() => setSelected(note)}/>)}
              </div>
            )}
          </div>

          {/* Bottom fade-out gradient when scrollable */}
          {filtered.length > 2 && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "48px",
              background: "linear-gradient(to top, rgba(255,253,249,0.95), transparent)",
              borderRadius: "0 0 30px 30px",
              pointerEvents: "none",
            }}/>
          )}
        </div>

        <div style={{ marginTop: "28px", display: "flex", alignItems: "center", gap: "10px", opacity: 0.28 }}>
          <div style={{ width: "22px", height: "1px", background: "#c8b8a8" }}/>
          <span style={{ color: "#c8b8a8", fontSize: "12px" }}>✦</span>
          <div style={{ width: "22px", height: "1px", background: "#c8b8a8" }}/>
        </div>
      </div>

      {recording && <RecordingModal onClose={() => setRecording(false)} onSave={handleSave}/>}
      {selected && <NoteModal note={selected} onClose={() => setSelected(null)}/>}
    </>
  );
}