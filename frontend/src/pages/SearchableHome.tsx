import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/global.css";

// ── Types ──────────────────────────────────────────────────────────────────────
type AccentKey = keyof typeof ACCENTS;

// ── Accent palettes ────────────────────────────────────────────────────────────
const ACCENTS = {
  rose:       { bg: "#fef0f0", border: "rgba(220,140,140,0.35)", tagBg: "rgba(220,130,130,0.15)", tagText: "#b05050", dot: "#e8a0a0", glow: "rgba(232,160,160,0.2)", folder: "#f8d8d8" },
  periwinkle: { bg: "#f0f0fe", border: "rgba(140,148,220,0.35)", tagBg: "rgba(130,140,210,0.15)", tagText: "#5058b0", dot: "#a0a8dc", glow: "rgba(160,168,220,0.2)", folder: "#d8d8f8" },
  sage:       { bg: "#f0f7f1", border: "rgba(120,170,130,0.35)", tagBg: "rgba(110,160,120,0.15)", tagText: "#3d7a50", dot: "#88b894", glow: "rgba(136,184,148,0.2)", folder: "#d4ecda" },
  honey:      { bg: "#fef8ec", border: "rgba(210,175,100,0.35)", tagBg: "rgba(200,165,85,0.15)",  tagText: "#8a6820", dot: "#d4b060", glow: "rgba(212,176,96,0.2)",  folder: "#f4e4c0" },
  lavender:   { bg: "#f4f0fe", border: "rgba(168,140,220,0.35)", tagBg: "rgba(158,130,210,0.15)", tagText: "#6848b0", dot: "#b8a0dc", glow: "rgba(184,160,220,0.2)", folder: "#e4d8f8" },
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

// ── Mock data ──────────────────────────────────────────────────────────────────
const MOCK_NOTES = [
  {
    id: 1, title: "The Nature of Consciousness", date: "Feb 27",
    tags: ["philosophy", "mind"], accent: "rose" as AccentKey, tailSide: "left",
    summary: "Explored whether consciousness emerges from physical processes or exists independently. Touched on qualia, the hard problem, and integrated information theory.",
    research: ["Integrated Information Theory (IIT) — Giulio Tononi", "Global Workspace Theory — Bernard Baars", "Panpsychism and its modern defenders"],
  },
  {
    id: 2, title: "Decentralized Energy Grids", date: "Feb 25",
    tags: ["energy", "climate"], accent: "periwinkle" as AccentKey, tailSide: "right",
    summary: "Ideas on peer-to-peer energy trading using blockchain. Neighborhood microgrids could stabilize supply and reduce transmission loss.",
    research: ["Brooklyn Microgrid Project (LO3 Energy)", "Virtual Power Plants — aggregated DER management", "Transactive energy systems overview"],
  },
  {
    id: 3, title: "Language Shapes Thought", date: "Feb 22",
    tags: ["linguistics", "cognition"], accent: "sage" as AccentKey, tailSide: "left",
    summary: "Sapir-Whorf hypothesis revisited. Does the vocabulary available to us constrain or expand the concepts we can form? Color perception across languages as a test case.",
    research: ["Linguistic relativity — Boroditsky et al.", "Color categorization across cultures (Berlin & Kay)", "Universal Grammar vs. usage-based linguistics"],
  },
  {
    id: 4, title: "Fermented Foods & Gut Health", date: "Feb 19",
    tags: ["nutrition", "health"], accent: "honey" as AccentKey, tailSide: "right",
    summary: "Kimchi, kefir, and tempeh introduce live cultures. Gut microbiome diversity correlates with mental health — the gut-brain axis is real and fascinating.",
    research: ["Gut-brain axis and the vagus nerve", "Stanford fermented foods study (Sonnenburg Lab)", "Psychobiotics — probiotics that influence mood"],
  },
  {
    id: 5, title: "Sleep & Memory Consolidation", date: "Feb 15",
    tags: ["neuroscience", "learning"], accent: "lavender" as AccentKey, tailSide: "left",
    summary: "REM sleep enables the hippocampus to replay daily experiences, transferring them to long-term neocortical storage. All-nighters are counterproductive.",
    research: ["Two-stage memory consolidation — Marr & Squire", "Sleep spindles and declarative memory (Walker Lab)", "Targeted memory reactivation during slow-wave sleep"],
  },
  {
    id: 6, title: "Urban Green Spaces", date: "Feb 12",
    tags: ["environment", "wellbeing"], accent: "sage" as AccentKey, tailSide: "right",
    summary: "Access to parks and nature within cities measurably reduces cortisol, improves mood, and fosters community. Green infrastructure as mental health policy.",
    research: ["Attention Restoration Theory — Kaplan & Kaplan", "Green space and mental health meta-analysis (WHO, 2016)", "Biophilic design in urban planning"],
  },
];

type Note = typeof MOCK_NOTES[number];

// ── Note Detail Modal ──────────────────────────────────────────────────────────
const NoteModal = ({ note, onClose }: { note: Note; onClose: () => void }) => {
  const acc = ACCENTS[note.accent];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(245,240,234,0.82)", backdropFilter: "blur(12px)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "relative", width: "min(580px, 94vw)", animation: "popBubble 0.38s cubic-bezier(.22,.68,0,1.3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: acc.bg, border: `2px solid ${acc.border}`, borderRadius: "32px", padding: "36px 36px 30px", boxShadow: `0 8px 40px ${acc.glow}, 0 2px 16px rgba(160,140,120,0.1)`, position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 18, right: 18, background: "rgba(0,0,0,0.06)", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9a8880" }}>
            <CloseIcon/>
          </button>
          <div style={{ fontSize: "11.5px", color: "#b0a090", fontFamily: "var(--font-body)", marginBottom: "7px", letterSpacing: "0.04em" }}>{note.date}</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "26px", color: "#3a3028", marginBottom: "14px", lineHeight: "1.25", fontWeight: "600", paddingRight: "30px" }}>{note.title}</h2>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
            {note.tags.map(t => <span key={t} style={{ background: acc.tagBg, color: acc.tagText, borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "700" }}>{t}</span>)}
          </div>
          <p style={{ fontSize: "14.5px", color: "#6a5a50", lineHeight: "1.75", fontFamily: "var(--font-body)", marginBottom: "26px" }}>{note.summary}</p>
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

// ── Note Card (rectangular grid) ──────────────────────────────────────────────
const NoteCard = ({ note, onClick, index }: { note: Note; onClick?: () => void; index: number }) => {
  const acc = ACCENTS[note.accent];
  const [hovered, setHovered] = useState(false);
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
const FolderCard = ({ note, onClick, index }: { note: Note; onClick?: () => void; index: number }) => {
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
      {/* Folder tab */}
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
      {/* Folder body */}
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
        {/* Corner glow */}
        <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "80px", background: `radial-gradient(circle at top right, ${acc.dot}40 0%, transparent 70%)`, borderRadius: "0 12px 0 0", pointerEvents: "none" }}/>

        {/* Top row: folder icon + date */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FolderIcon color={acc.dot}/>
            <span style={{ fontSize: "10.5px", color: acc.tagText, fontFamily: "var(--font-body)", fontWeight: "700", letterSpacing: "0.04em", textTransform: "uppercase" }}>note</span>
          </div>
          <span style={{ fontSize: "11px", color: "#c0b0a0", fontFamily: "var(--font-body)" }}>{note.date}</span>
        </div>

        {/* Title */}
        <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", color: "#3a3028", fontWeight: "600", lineHeight: "1.3", marginBottom: "8px", paddingRight: "12px" }}>
          {note.title}
        </div>

        {/* Summary preview */}
        <p style={{ fontSize: "12px", color: "#8a7a70", lineHeight: "1.6", fontFamily: "var(--font-body)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: "12px" }}>
          {note.summary}
        </p>

        {/* Tags + research count */}
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

// ── Results Page ───────────────────────────────────────────────────────────────
const ResultsPage = ({ query, results, onBack, onSelectNote, onQueryChange, onSearch }: {
  query: string;
  results: Note[];
  onBack: () => void;
  onSelectNote: (note: Note) => void;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 24px 80px", position: "relative", zIndex: 1, animation: "pageSlideIn 0.35s cubic-bezier(.22,.68,0,1.1)" }}>

      {/* Results header */}
      <div style={{ width: "100%", maxWidth: "780px", padding: "44px 0 32px" }}>
        {/* Back + search row */}
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

          {/* Search bar — stays live on results page */}
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
              style={{ flex: 1, background: "none", border: "none", color: "#3a3028", fontSize: "15px", fontFamily: "var(--font-body)", fontWeight: "400" }}
            />
            {query && <button onClick={() => onQueryChange("")} style={{ background: "none", border: "none", color: "#c0b0a0", cursor: "pointer", flexShrink: 0 }}><CloseIcon/></button>}
          </div>
        </div>

        {/* Results summary */}
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

        {/* Folder grid */}
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
      </div>
    </div>
  );
};

// ── Main App ───────────────────────────────────────────────────────────────────
export default function SearchableHome() {
  const navigate = useNavigate();
  const notes = MOCK_NOTES;
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // committed search on Enter
  const [view, setView] = useState<"home" | "results">("home");
  const [selected, setSelected] = useState<Note | null>(null);

  // Home: live-filter as user types
  const liveFiltered = notes.filter(n => {
    const q = query.toLowerCase();
    return !q || n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.tags.some(t => t.includes(q));
  });

  // Results page: filter by committed search term
  const searchResults = notes.filter(n => {
    const q = searchQuery.toLowerCase();
    return !q || n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.tags.some(t => t.includes(q));
  });

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setView("results");
  };

  const handleBack = () => {
    setView("home");
    setSearchQuery("");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@300;400;600;700&display=swap');
        :root { --font-display: 'Playfair Display', Georgia, serif; --font-body: 'Nunito', sans-serif; --bg: #faf6f0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); font-family: var(--font-body); min-height: 100vh; }
        input:focus { outline: none; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e0d0c0; border-radius: 3px; }

        @keyframes wave { from { height: 5px; } to { height: 32px; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes popBubble { 0% { opacity: 0; transform: scale(0.8) translateY(20px); } 70% { transform: scale(1.03) translateY(-4px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes floatIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes folderSlideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pageSlideIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes riseUp { 0% { transform: translateY(0) scale(1); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.6; } 100% { transform: translateY(-110vh) scale(0.6); opacity: 0; } }
        @keyframes heroDrift { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0%, 100% { box-shadow: 0 8px 32px rgba(130,175,140,0.18), 0 0 0 8px rgba(130,175,140,0.07); } 50% { box-shadow: 0 8px 40px rgba(130,175,140,0.3), 0 0 0 10px rgba(130,175,140,0.1); } }
        @keyframes logoBounce { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } 60% { transform: translateY(-3px); } }
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(154,160,216,0.1) 0%, transparent 55%), radial-gradient(ellipse 55% 40% at 88% 75%, rgba(130,175,140,0.09) 0%, transparent 50%), radial-gradient(ellipse 45% 38% at 12% 68%, rgba(232,160,176,0.07) 0%, transparent 50%)" }}/>
      <BubbleField/>

      {view === "results" ? (
        <ResultsPage
          query={query}
          results={searchResults}
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

          {/* Search + Record */}
          <div style={{ width: "100%", maxWidth: "780px", marginBottom: "32px" }}>
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
              {query ? `${liveFiltered.length} thought${liveFiltered.length !== 1 ? "s" : ""} matching — press ↵ for full results` : `${notes.length} thought${notes.length !== 1 ? "s" : ""} floating around`}
            </p>
          </div>

          {/* Notes container */}
          <div style={{ width: "100%", maxWidth: "780px", background: "rgba(255,253,249,0.72)", backdropFilter: "blur(16px)", border: "2px solid rgba(200,185,168,0.28)", borderRadius: "32px", boxShadow: "0 8px 48px rgba(160,140,120,0.1), inset 0 2px 12px rgba(255,255,255,0.8), inset 0 -2px 8px rgba(200,180,160,0.07)", padding: "28px 24px 8px", position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1.5px dashed rgba(200,185,168,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "linear-gradient(135deg,#88b894,#6a9878)", boxShadow: "0 0 6px rgba(106,152,120,0.4)" }}/>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", color: "#8a7a6a", fontStyle: "italic", fontWeight: "400" }}>
                  {query ? `thoughts matching "${query}"` : "all thoughts"}
                </span>
              </div>
              <span style={{ fontSize: "12px", color: "#c0b0a0", fontFamily: "var(--font-body)" }}>{liveFiltered.length} {liveFiltered.length === 1 ? "note" : "notes"}</span>
            </div>
            <div style={{ maxHeight: "560px", overflowY: liveFiltered.length > 4 ? "auto" : "visible", overflowX: "visible", paddingRight: liveFiltered.length > 4 ? "6px" : "0", paddingBottom: "20px" }}>
              {liveFiltered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "52px 0 36px", color: "#c0b0a0" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "40px", marginBottom: "12px", opacity: 0.35 }}>○</div>
                  <div style={{ fontSize: "15px", fontFamily: "var(--font-body)", fontWeight: "300" }}>no thoughts match that search</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px", paddingTop: "4px" }}>
                  {liveFiltered.map((note, i) => <NoteCard key={note.id} note={note} index={i} onClick={() => navigate(`/note/${note.id}`)}/>)}
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

      {selected && <NoteModal note={selected} onClose={() => setSelected(null)}/>}
    </>
  );
}
