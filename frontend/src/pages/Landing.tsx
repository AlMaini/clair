import { useState } from "react";
import "../styles/global.css";

// Types and Accent Palettes
type AccentKey = keyof typeof ACCENTS;
const ACCENTS = {
  rose: {
    bg: "#fef0f0",
    border: "rgba(220,140,140,0.35)",
    tagBg: "rgba(220,130,130,0.15)",
    tagText: "#b05050",
    dot: "#e8a0a0",
    glow: "rgba(232,160,160,0.2)",
  },
  periwinkle: {
    bg: "#f0f0fe",
    border: "rgba(140,148,220,0.35)",
    tagBg: "rgba(130,140,210,0.15)",
    tagText: "#5058b0",
    dot: "#a0a8dc",
    glow: "rgba(160,168,220,0.2)",
  },
  sage: {
    bg: "#f0f7f1",
    border: "rgba(120,170,130,0.35)",
    tagBg: "rgba(110,160,120,0.15)",
    tagText: "#3d7a50",
    dot: "#88b894",
    glow: "rgba(136,184,148,0.2)",
  },
  honey: {
    bg: "#fef8ec",
    border: "rgba(210,175,100,0.35)",
    tagBg: "rgba(200,165,85,0.15)",
    tagText: "#8a6820",
    dot: "#d4b060",
    glow: "rgba(212,176,96,0.2)",
  },
  lavender: {
    bg: "#f4f0fe",
    border: "rgba(168,140,220,0.35)",
    tagBg: "rgba(158,130,210,0.15)",
    tagText: "#6848b0",
    dot: "#b8a0dc",
    glow: "rgba(184,160,220,0.2)",
  },
};

// Mock data
const MOCK_NOTES = [
  {
    id: 1,
    title: "The Nature of Consciousness",
    date: "Feb 27",
    tags: ["philosophy", "mind"],
    accent: "rose" as AccentKey,
    tilt: -1.5,
    tailSide: "left",
    summary:
      "Explored whether consciousness emerges from physical processes or exists independently. Touched on qualia, the hard problem, and integrated information theory.",
    research: [
      "Integrated Information Theory (IIT) — Giulio Tononi",
      "Global Workspace Theory — Bernard Baars",
      "Panpsychism and its modern defenders",
    ],
  },
  {
    id: 2,
    title: "Decentralized Energy Grids",
    date: "Feb 25",
    tags: ["energy", "climate"],
    accent: "periwinkle" as AccentKey,
    tilt: 1.2,
    tailSide: "right",
    summary:
      "Ideas on peer-to-peer energy trading using blockchain. Neighborhood microgrids could stabilize supply and reduce transmission loss.",
    research: [
      "Brooklyn Microgrid Project (LO3 Energy)",
      "Virtual Power Plants — aggregated DER management",
      "Transactive energy systems overview",
    ],
  },
  {
    id: 3,
    title: "Language Shapes Thought",
    date: "Feb 22",
    tags: ["linguistics", "cognition"],
    accent: "sage" as AccentKey,
    tilt: -0.8,
    tailSide: "left",
    summary:
      "Sapir-Whorf hypothesis revisited. Does the vocabulary available to us constrain or expand the concepts we can form? Color perception across languages as a test case.",
    research: [
      "Linguistic relativity — Boroditsky et al.",
      "Color categorization across cultures (Berlin & Kay)",
      "Universal Grammar vs. usage-based linguistics",
    ],
  },
  {
    id: 4,
    title: "Fermented Foods & Gut Health",
    date: "Feb 19",
    tags: ["nutrition", "health"],
    accent: "honey" as AccentKey,
    tilt: 1.8,
    tailSide: "right",
    summary:
      "Kimchi, kefir, and tempeh introduce live cultures. Gut microbiome diversity correlates with mental health — the gut-brain axis is real and fascinating.",
    research: [
      "Gut-brain axis and the vagus nerve",
      "Stanford fermented foods study (Sonnenburg Lab)",
      "Psychobiotics — probiotics that influence mood",
    ],
  },
];

type Note = typeof MOCK_NOTES[number];

// Note Card component
const NoteCard = ({ note, index }: { note: Note; index: number }) => {
  const [hovered, setHovered] = useState(false);
  const acc = ACCENTS[note.accent];
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: acc.bg,
        border: `2px solid ${acc.border}`,
        borderRadius: "18px",
        padding: "18px 18px 16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "160px",
        boxShadow: hovered
          ? `0 10px 32px ${acc.glow}, 0 2px 12px rgba(160,140,120,0.1)`
          : `0 2px 12px ${acc.glow}, 0 1px 4px rgba(160,140,120,0.05)`,
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
        animation: `floatIn 0.45s cubic-bezier(.22,.68,0,1.1) both`,
        animationDelay: `${index * 0.07}s`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative corner wash */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "64px",
          height: "64px",
          background: `radial-gradient(circle at top right, ${acc.dot}55 0%, transparent 70%)`,
          borderRadius: "0 18px 0 0",
          pointerEvents: "none",
        }}
      />
      {/* Accent dot */}
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: acc.dot,
          opacity: 0.85,
        }}
      />

      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "15px",
            color: "#3a3028",
            fontWeight: 600,
            lineHeight: "1.35",
            marginBottom: "7px",
            paddingRight: "16px",
          }}
        >
          {note.title}
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "#8a7a70",
            lineHeight: "1.6",
            fontFamily: "var(--font-body)",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {note.summary}
        </p>
      </div>

      <div
        style={{
          marginTop: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "5px",
        }}
      >
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {note.tags.map((t) => (
            <span
              key={t}
              style={{
                background: acc.tagBg,
                color: acc.tagText,
                borderRadius: "20px",
                padding: "2px 9px",
                fontSize: "10.5px",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <span
          style={{
            fontSize: "10.5px",
            color: "#c0b0a0",
            fontFamily: "var(--font-body)",
            flexShrink: 0,
          }}
        >
          {note.date}
        </span>
      </div>
    </div>
  );
};

// Floating micro-bubbles background
const BubbleField = () => {
  const bubbles = [
    { size: 14, x: "8%", dur: "12s", delay: "0s", op: 0.45, color: "#d4b0c8" },
    { size: 22, x: "18%", dur: "16s", delay: "2s", op: 0.3, color: "#a0b8d8" },
    { size: 9, x: "30%", dur: "10s", delay: "4s", op: 0.4, color: "#b8d4b8" },
    { size: 18, x: "55%", dur: "14s", delay: "1s", op: 0.28, color: "#e8c0b0" },
    {
      size: 11,
      x: "70%",
      dur: "11s",
      delay: "3.5s",
      op: 0.38,
      color: "#c8b8e8",
    },
    {
      size: 26,
      x: "82%",
      dur: "18s",
      delay: "0.5s",
      op: 0.22,
      color: "#b8d8c8",
    },
    { size: 8, x: "92%", dur: "9s", delay: "5s", op: 0.42, color: "#d8c0a8" },
    { size: 16, x: "44%", dur: "13s", delay: "6s", op: 0.32, color: "#a8c0e0" },
    {
      size: 12,
      x: "62%",
      dur: "15s",
      delay: "2.5s",
      op: 0.36,
      color: "#d0b8d8",
    },
    { size: 20, x: "5%", dur: "17s", delay: "7s", op: 0.25, color: "#b0d0b8" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {bubbles.map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            bottom: "-40px",
            left: b.x,
            width: b.size,
            height: b.size,
            borderRadius: "50%",
            border: `1.5px solid ${b.color}`,
            background: `${b.color}22`,
            opacity: b.op,
            animation: `riseUp ${b.dur} ease-in-out infinite`,
            animationDelay: b.delay,
          }}
        />
      ))}
    </div>
  );
};

// Icons
const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const CloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
``;

export default function LandingPage() {
  const [query, setQuery] = useState("");

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(154,160,216,0.1) 0%, transparent 55%), radial-gradient(ellipse 55% 40% at 88% 75%, rgba(130,175,140,0.09) 0%, transparent 50%), radial-gradient(ellipse 45% 38% at 12% 68%, rgba(232,160,176,0.07) 0%, transparent 50%)",
        }}
      />
      <BubbleField />

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 24px 100px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Hero */}
        <div
          style={{
            textAlign: "center",
            padding: "76px 0 50px",
            animation: "heroDrift 0.65s ease",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "linear-gradient(145deg, #e8f2ea, #d2e8da)",
              border: "2px solid rgba(130,175,140,0.4)",
              margin: "0 auto 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation:
                "shimmer 4s ease-in-out infinite, logoBounce 5s ease-in-out infinite 1s",
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5a9468"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "6px",
              marginBottom: "18px",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#e8f2ea",
                border: "1.5px solid rgba(130,175,140,0.4)",
              }}
            />
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#e8f2ea",
                border: "1.2px solid rgba(130,175,140,0.3)",
              }}
            />
            <div
              style={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "#e8f2ea",
                border: "1px solid rgba(130,175,140,0.25)",
              }}
            />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(54px, 8vw, 80px)",
              fontWeight: 700,
              color: "#3a3028",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "10px",
              fontStyle: "normal",
            }}
          >
            clair
          </h1>
          <p
            style={{
              color: "#b0a090",
              fontSize: "14.5px",
              fontFamily: "var(--font-body)",
              fontWeight: "300",
              letterSpacing: "0.04em",
            }}
          >
            your thoughts, beautifully organised
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              marginTop: "18px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "1px",
                background: "linear-gradient(90deg, transparent, #c8b8a8)",
              }}
            />
            <span style={{ color: "#c8b8a8", fontSize: "14px" }}>✦</span>
            <div
              style={{
                width: "36px",
                height: "1px",
                background: "linear-gradient(90deg, #c8b8a8, transparent)",
              }}
            />
          </div>
        </div>

        {/* Search */}
        <div style={{ width: "100%", maxWidth: "600px", marginBottom: "44px" }}>
          <div style={{ display: "flex" }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "11px",
                background: "rgba(255,255,255,0.88)",
                backdropFilter: "blur(8px)",
                border: "2px solid rgba(180,162,145,0.22)",
                borderRadius: "22px",
                padding: "0 18px",
                height: "52px",
                boxShadow: "0 3px 20px rgba(160,140,120,0.07)",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = "rgba(130,175,140,0.5)";
                e.currentTarget.style.boxShadow =
                  "0 4px 24px rgba(130,175,140,0.13)";
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = "rgba(180,162,145,0.22)";
                e.currentTarget.style.boxShadow =
                  "0 3px 20px rgba(160,140,120,0.07)";
              }}
            >
              <span style={{ color: "#c0b0a0", flexShrink: 0 }}>
                <SearchIcon />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="search your thoughts…"
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  color: "#3a3028",
                  fontSize: "15px",
                  fontFamily: "var(--font-body)",
                  fontWeight: "400",
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#c0b0a0",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <CloseIcon />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Folder Container */}
        <div
          style={{
            width: "100%",
            maxWidth: "780px",
            background: "rgba(255,253,249,0.72)",
            backdropFilter: "blur(16px)",
            border: "2px solid rgba(200,185,168,0.28)",
            borderRadius: "32px",
            boxShadow:
              "0 8px 48px rgba(160,140,120,0.1), inset 0 2px 12px rgba(255,255,255,0.8), inset 0 -2px 8px rgba(200,180,160,0.07)",
            padding: "28px 24px 8px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle top label */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
              paddingBottom: "14px",
              borderBottom: "1.5px dashed rgba(200,185,168,0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#88b894,#6a9878)",
                  boxShadow: "0 0 6px rgba(106,152,120,0.4)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "15px",
                  color: "#8a7a6a",
                  fontStyle: "italic",
                  fontWeight: 400,
                }}
              >
                all thoughts
              </span>
            </div>
            <span
              style={{
                fontSize: "12px",
                color: "#c0b0a0",
                fontFamily: "var(--font-body)",
              }}
            >
              {MOCK_NOTES.length} notes
            </span>
          </div>

          {/* Scrollable inner area */}
          <div
            style={{
              maxHeight: "560px",
              overflowY: "auto",
              overflowX: "visible",
              paddingRight: "6px",
              paddingBottom: "20px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "14px",
                paddingTop: "4px",
              }}
            >
              {MOCK_NOTES.map((note, i) => (
                <NoteCard key={note.id} note={note} index={i} />
              ))}
            </div>
          </div>

          {/* Bottom fade-out gradient when scrollable */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "48px",
              background:
                "linear-gradient(to top, rgba(255,253,249,0.95), transparent)",
              borderRadius: "0 0 30px 30px",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </>
  );
}
