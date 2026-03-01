import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { NoteResponse } from '../types/api'

const ACCENTS = {
  rose:       { bg: "#fef0f0", border: "rgba(220,140,140,0.35)", tagBg: "rgba(220,130,130,0.15)", tagText: "#b05050", dot: "#e8a0a0", glow: "rgba(232,160,160,0.2)" },
  periwinkle: { bg: "#f0f0fe", border: "rgba(140,148,220,0.35)", tagBg: "rgba(130,140,210,0.15)", tagText: "#5058b0", dot: "#a0a8dc", glow: "rgba(160,168,220,0.2)" },
  sage:       { bg: "#f0f7f1", border: "rgba(120,170,130,0.35)", tagBg: "rgba(110,160,120,0.15)", tagText: "#3d7a50", dot: "#88b894", glow: "rgba(136,184,148,0.2)" },
  honey:      { bg: "#fef8ec", border: "rgba(210,175,100,0.35)", tagBg: "rgba(200,165,85,0.15)",  tagText: "#8a6820", dot: "#d4b060", glow: "rgba(212,176,96,0.2)" },
  lavender:   { bg: "#f4f0fe", border: "rgba(168,140,220,0.35)", tagBg: "rgba(158,130,210,0.15)", tagText: "#6848b0", dot: "#b8a0dc", glow: "rgba(184,160,220,0.2)" },
}
type AccentKey = keyof typeof ACCENTS
const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[]

function accentFromCategory(name: string | undefined, id: string): AccentKey {
  if (!name) {
    // deterministic from id
    let hash = 0
    for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
    return ACCENT_KEYS[hash % ACCENT_KEYS.length]
  }
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return ACCENT_KEYS[hash % ACCENT_KEYS.length]
}

const BackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)
const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z"/>
  </svg>
)
const ArrowIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function noteTitle(note: NoteResponse): string {
  const content = note.processed_content || note.raw_content
  const first = content.split('\n')[0].trim()
  return first.length > 70 ? first.slice(0, 70) + '…' : first || 'Untitled'
}

function noteSummary(note: NoteResponse): string {
  const content = note.processed_content || note.raw_content
  const lines = content.split('\n')
  return lines.slice(1).join('\n').trim() || content
}

export default function NotePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: note, isLoading, isError } = useQuery({
    queryKey: ['note', id],
    queryFn: () => api.get<NoteResponse>(`/api/notes/${id}`),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf6f0" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(130,175,140,0.3)", borderTopColor: "#82af8c", animation: "spin 0.8s linear infinite" }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (isError || !note) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#faf6f0", fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ fontSize: "40px", marginBottom: "16px", opacity: 0.3 }}>○</div>
        <p style={{ color: "#b0a090", fontSize: "15px", marginBottom: "20px" }}>Note not found</p>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "1.5px solid rgba(180,162,145,0.3)", borderRadius: "12px", padding: "10px 20px", color: "#9a8880", fontFamily: "'Nunito', sans-serif", fontSize: "13px", cursor: "pointer" }}>
          ← go back
        </button>
      </div>
    )
  }

  const accent = accentFromCategory(note.category?.name, note.id)
  const acc = ACCENTS[accent]
  const title = noteTitle(note)
  const summary = noteSummary(note)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@300;400;600;700&display=swap');
        :root { --font-display: 'Playfair Display', Georgia, serif; --font-body: 'Nunito', sans-serif; --bg: #faf6f0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); font-family: var(--font-body); min-height: 100vh; }
        @keyframes popBubble { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#faf6f0", display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 24px 80px", position: "relative" }}>
        <div style={{ width: "min(620px, 100%)" }}>

          {/* Back button */}
          <button onClick={() => navigate(-1)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)", border: "1.5px solid rgba(180,162,145,0.25)", borderRadius: "14px", padding: "0 16px", height: "40px", cursor: "pointer", color: "#7a6a60", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: "600", boxShadow: "0 2px 12px rgba(160,140,120,0.07)", marginBottom: "28px" }}>
            <BackIcon/> back
          </button>

          {/* Main card */}
          <div style={{ background: acc.bg, border: `2px solid ${acc.border}`, borderRadius: "32px", padding: "36px 36px 30px", boxShadow: `0 8px 40px ${acc.glow}, 0 2px 16px rgba(160,140,120,0.1)`, animation: "popBubble 0.38s cubic-bezier(.22,.68,0,1.2)" }}>

            <div style={{ fontSize: "11.5px", color: "#b0a090", fontFamily: "var(--font-body)", marginBottom: "7px", letterSpacing: "0.04em" }}>
              {formatDate(note.created_at)}
              {note.category && <span style={{ marginLeft: "10px", color: acc.tagText }}>{note.category.name}</span>}
            </div>

            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", color: "#3a3028", marginBottom: "14px", lineHeight: "1.25", fontWeight: "600" }}>{title}</h1>

            {note.tags.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
                {note.tags.map(t => <span key={t} style={{ background: acc.tagBg, color: acc.tagText, borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontFamily: "var(--font-body)", fontWeight: "700" }}>{t}</span>)}
              </div>
            )}

            <p style={{ fontSize: "14.5px", color: "#6a5a50", lineHeight: "1.75", fontFamily: "var(--font-body)", marginBottom: "26px", whiteSpace: "pre-wrap" }}>{summary}</p>

            {/* Resources */}
            {note.resources.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "20px", padding: "18px 20px", border: `1.5px dashed ${acc.border}`, marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                  <span style={{ color: acc.tagText }}><SparkleIcon/></span>
                  <span style={{ fontSize: "11px", color: acc.tagText, fontFamily: "var(--font-body)", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase" }}>Explore further</span>
                </div>
                {note.resources.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "9px", marginBottom: "9px" }}>
                    <span style={{ color: acc.tagText, flexShrink: 0, marginTop: "3px" }}><ArrowIcon/></span>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13.5px", color: acc.tagText, fontFamily: "var(--font-body)", lineHeight: "1.55", textDecoration: "underline", textUnderlineOffset: "2px" }}>{r.title || r.url}</a>
                    ) : (
                      <span style={{ fontSize: "13.5px", color: "#6a5a50", fontFamily: "var(--font-body)", lineHeight: "1.55" }}>{r.title}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Related notes */}
            {note.related_note_ids.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", color: "#b0a090", fontFamily: "var(--font-body)", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "10px" }}>See also</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {note.related_note_ids.map(relId => (
                    <Link key={relId} to={`/note/${relId}`} style={{ fontSize: "13.5px", color: acc.tagText, fontFamily: "var(--font-body)", textDecoration: "underline", textUnderlineOffset: "2px" }}>
                      Note {relId.slice(0, 8)}…
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
