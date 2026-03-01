import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const BubbleField = () => {
  const bubbles = [
    { size: 14, x: "8%",  dur: "12s", delay: "0s",   op: 0.45, color: "#d4b0c8" },
    { size: 22, x: "18%", dur: "16s", delay: "2s",   op: 0.3,  color: "#a0b8d8" },
    { size: 9,  x: "30%", dur: "10s", delay: "4s",   op: 0.4,  color: "#b8d4b8" },
    { size: 18, x: "55%", dur: "14s", delay: "1s",   op: 0.28, color: "#e8c0b0" },
    { size: 11, x: "70%", dur: "11s", delay: "3.5s", op: 0.38, color: "#c8b8e8" },
    { size: 26, x: "82%", dur: "18s", delay: "0.5s", op: 0.22, color: "#b8d8c8" },
    { size: 8,  x: "92%", dur: "9s",  delay: "5s",   op: 0.42, color: "#d8c0a8" },
  ]
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
  )
}

export default function Auth() {
  const navigate = useNavigate()
  const { session, signIn, signUp } = useAuth()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signedUp, setSignedUp] = useState(false)

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await signIn(email, password)
        navigate('/', { replace: true })
      } else {
        await signUp(email, password)
        setSignedUp(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@300;400;600;700&display=swap');
        :root { --font-display: 'Playfair Display', Georgia, serif; --font-body: 'Nunito', sans-serif; --bg: #faf6f0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); font-family: var(--font-body); min-height: 100vh; }
        input:focus { outline: none; }
        @keyframes riseUp { 0% { transform: translateY(0) scale(1); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.6; } 100% { transform: translateY(-110vh) scale(0.6); opacity: 0; } }
        @keyframes shimmer { 0%, 100% { box-shadow: 0 8px 32px rgba(130,175,140,0.18), 0 0 0 8px rgba(130,175,140,0.07); } 50% { box-shadow: 0 8px 40px rgba(130,175,140,0.3), 0 0 0 10px rgba(130,175,140,0.1); } }
        @keyframes logoBounce { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } 60% { transform: translateY(-3px); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(ellipse 90% 55% at 50% 0%, rgba(154,160,216,0.1) 0%, transparent 55%), radial-gradient(ellipse 55% 40% at 88% 75%, rgba(130,175,140,0.09) 0%, transparent 50%)" }}/>
      <BubbleField/>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px", animation: "fadeUp 0.5s ease" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(145deg, #e8f2ea, #d2e8da)", border: "2px solid rgba(130,175,140,0.4)", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", animation: "shimmer 4s ease-in-out infinite, logoBounce 5s ease-in-out infinite 1s" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5a9468" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "48px", fontWeight: "700", color: "#3a3028", letterSpacing: "-0.01em" }}>clair</h1>
          <p style={{ color: "#b0a090", fontSize: "14px", fontFamily: "var(--font-body)", fontWeight: "300", letterSpacing: "0.04em", marginTop: "4px" }}>your thoughts, beautifully organised</p>
        </div>

        {/* Card */}
        <div style={{ width: "min(420px, 100%)", background: "rgba(255,253,249,0.88)", backdropFilter: "blur(16px)", border: "2px solid rgba(200,185,168,0.28)", borderRadius: "28px", padding: "32px", boxShadow: "0 8px 48px rgba(160,140,120,0.1)", animation: "fadeUp 0.5s ease 0.1s both" }}>

          {signedUp ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: "40px", marginBottom: "16px" }}>✉️</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "22px", color: "#3a3028", marginBottom: "10px" }}>Check your email</h2>
              <p style={{ fontSize: "14px", color: "#8a7a70", fontFamily: "var(--font-body)", lineHeight: "1.6" }}>
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to sign in.
              </p>
              <button onClick={() => { setSignedUp(false); setTab('login') }} style={{ marginTop: "20px", background: "none", border: "1.5px solid rgba(130,175,140,0.4)", borderRadius: "14px", padding: "10px 24px", color: "#5a9468", fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div style={{ display: "flex", background: "rgba(200,185,168,0.15)", borderRadius: "14px", padding: "4px", marginBottom: "26px" }}>
                {(['login', 'signup'] as const).map(t => (
                  <button key={t} onClick={() => { setTab(t); setError('') }} style={{
                    flex: 1, padding: "9px", borderRadius: "10px", border: "none", cursor: "pointer",
                    background: tab === t ? "rgba(255,255,255,0.9)" : "transparent",
                    boxShadow: tab === t ? "0 2px 8px rgba(160,140,120,0.12)" : "none",
                    fontFamily: "var(--font-body)", fontSize: "14px", fontWeight: "600",
                    color: tab === t ? "#3a3028" : "#b0a090",
                    transition: "all 0.2s ease",
                  }}>
                    {t === 'login' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#9a8880", fontFamily: "var(--font-body)", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@example.com"
                    style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.7)", border: "1.5px solid rgba(200,185,168,0.4)", borderRadius: "14px", fontSize: "15px", fontFamily: "var(--font-body)", color: "#3a3028" }}
                  />
                </div>
                <div style={{ marginBottom: "22px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#9a8880", fontFamily: "var(--font-body)", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "6px" }}>Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••"
                    style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.7)", border: "1.5px solid rgba(200,185,168,0.4)", borderRadius: "14px", fontSize: "15px", fontFamily: "var(--font-body)", color: "#3a3028" }}
                  />
                </div>

                {error && (
                  <div style={{ marginBottom: "16px", padding: "10px 14px", background: "rgba(220,100,100,0.08)", border: "1.5px solid rgba(220,100,100,0.2)", borderRadius: "12px", fontSize: "13px", color: "#b05050", fontFamily: "var(--font-body)" }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "13px", borderRadius: "16px", border: "1.5px solid rgba(130,175,140,0.4)", cursor: loading ? "wait" : "pointer",
                  background: "linear-gradient(145deg, #e8f2ea, #d2e8da)",
                  fontFamily: "var(--font-body)", fontSize: "15px", fontWeight: "700", color: "#3d6b4a",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  transition: "opacity 0.2s", opacity: loading ? 0.7 : 1,
                }}>
                  {loading && <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(61,107,74,0.3)", borderTopColor: "#3d6b4a", animation: "spin 0.8s linear infinite" }}/>}
                  {tab === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}
