import { useState } from 'react'
import { api } from '../lib/api'

interface Props {
  onClose: () => void
  onCreated: () => void
}

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

export default function NoteInput({ onClose, onCreated }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('content', content)
      form.append('content_type', 'text')
      await api.post('/api/notes/', form)
      onCreated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save note')
      setLoading(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(245,240,234,0.82)", backdropFilter: "blur(12px)", zIndex: 90, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 24px 32px" }} onClick={onClose}>
      <div style={{ width: "min(580px, 100%)", background: "rgba(255,253,249,0.95)", border: "2px solid rgba(130,175,140,0.35)", borderRadius: "28px", padding: "24px", boxShadow: "0 8px 48px rgba(130,175,140,0.15)", animation: "slideUp 0.3s cubic-bezier(.22,.68,0,1.1)" }} onClick={e => e.stopPropagation()}>
        <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "17px", color: "#3a3028", fontWeight: "600" }}>New thought</span>
          <button onClick={onClose} style={{ background: "rgba(0,0,0,0.06)", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9a8880" }}>
            <CloseIcon/>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            autoFocus
            placeholder="What's on your mind…"
            rows={5}
            style={{ width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.7)", border: "1.5px solid rgba(200,185,168,0.4)", borderRadius: "16px", fontSize: "14.5px", fontFamily: "'Nunito', sans-serif", color: "#3a3028", lineHeight: "1.65", resize: "vertical", outline: "none" }}
          />

          {error && (
            <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(220,100,100,0.08)", border: "1.5px solid rgba(220,100,100,0.2)", borderRadius: "10px", fontSize: "12.5px", color: "#b05050", fontFamily: "'Nunito', sans-serif" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: "14px", border: "1.5px solid rgba(200,185,168,0.4)", background: "transparent", fontSize: "13.5px", fontFamily: "'Nunito', sans-serif", fontWeight: "600", color: "#9a8880", cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !content.trim()} style={{ padding: "10px 20px", borderRadius: "14px", border: "1.5px solid rgba(130,175,140,0.4)", background: "linear-gradient(145deg, #e8f2ea, #d2e8da)", fontSize: "13.5px", fontFamily: "'Nunito', sans-serif", fontWeight: "700", color: "#3d6b4a", cursor: loading ? "wait" : "pointer", display: "flex", alignItems: "center", gap: "7px", opacity: loading || !content.trim() ? 0.6 : 1, transition: "opacity 0.2s" }}>
              {loading && <div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(61,107,74,0.3)", borderTopColor: "#3d6b4a", animation: "spin 0.8s linear infinite" }}/>}
              Save thought
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
