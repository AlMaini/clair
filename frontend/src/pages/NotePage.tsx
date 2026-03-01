import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { NoteResponse } from "../types/api";

// ─── Accent Palettes ───────────────────────────────────────────────────────
const ACCENTS = {
  rose:       { bg:"#fef0f0", border:"rgba(220,140,140,0.30)", tagBg:"rgba(220,130,130,0.15)", tagText:"#b05050", dot:"#e8a0a0", glow:"rgba(232,160,160,0.18)", folder:"#f8d8d8", bar:"rgba(254,242,242,0.97)", sidebar:"#fdf5f5", line:"rgba(220,140,140,0.09)", hlBar:"#e8a0a0" },
  periwinkle: { bg:"#f0f0fe", border:"rgba(140,148,220,0.30)", tagBg:"rgba(130,140,210,0.15)", tagText:"#5058b0", dot:"#a0a8dc", glow:"rgba(160,168,220,0.18)", folder:"#d8d8f8", bar:"rgba(242,242,254,0.97)", sidebar:"#f4f4fd", line:"rgba(140,148,220,0.09)", hlBar:"#a0a8dc" },
  sage:       { bg:"#f0f7f1", border:"rgba(120,170,130,0.30)", tagBg:"rgba(110,160,120,0.15)", tagText:"#3d7a50", dot:"#88b894", glow:"rgba(136,184,148,0.18)", folder:"#d4ecda", bar:"rgba(242,248,243,0.97)", sidebar:"#f4faf5", line:"rgba(120,170,130,0.09)", hlBar:"#88b894" },
  honey:      { bg:"#fef8ec", border:"rgba(210,175,100,0.30)", tagBg:"rgba(200,165,85,0.15)",  tagText:"#8a6820", dot:"#d4b060", glow:"rgba(212,176,96,0.18)",  folder:"#f4e4c0", bar:"rgba(254,250,238,0.97)", sidebar:"#fdf9f1", line:"rgba(210,175,100,0.09)", hlBar:"#d4b060" },
  lavender:   { bg:"#f4f0fe", border:"rgba(168,140,220,0.30)", tagBg:"rgba(158,130,210,0.15)", tagText:"#6848b0", dot:"#b8a0dc", glow:"rgba(184,160,220,0.18)", folder:"#e4d8f8", bar:"rgba(246,242,254,0.97)", sidebar:"#f8f5fe", line:"rgba(168,140,220,0.09)", hlBar:"#b8a0dc" },
};
const ACCENT_KEYS = ["rose","periwinkle","sage","honey","lavender"];

// Helper to derive consistent accent color from category
function accentFromCategory(categoryName: string | undefined, noteId: string): keyof typeof ACCENTS {
  if (categoryName) {
    let hash = 0;
    for (const c of categoryName) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
    return ACCENT_KEYS[hash % ACCENT_KEYS.length] as keyof typeof ACCENTS;
  }
  // Fallback: hash the note ID for consistent color
  let hash = 0;
  for (const c of noteId) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return ACCENT_KEYS[hash % ACCENT_KEYS.length] as keyof typeof ACCENTS;
}

// ─── Waveform ──────────────────────────────────────────────────────────────
const Waveform = ({active}: {active: boolean}) => (
  <div style={{display:"flex",alignItems:"center",gap:"3px",height:"32px",justifyContent:"center"}}>
    {Array.from({length:20}).map((_,i) => (
      <div key={i} style={{width:"3px",borderRadius:"3px",background:active?"#7aab86":"#ddd0c4",height:active?undefined:"5px",animation:active?`wave ${0.6+(i%6)*0.12}s ease-in-out infinite alternate`:"none",animationDelay:`${(i*0.05)%0.6}s`,minHeight:"3px",maxHeight:"28px",transition:"background 0.3s"}}/>
    ))}
  </div>
);

// ─── Icons ─────────────────────────────────────────────────────────────────
const Svg = ({children,w=16,h=16,...p}: any) => <svg width={w} height={h} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>;
const MicI   = () => <Svg w={17} h={17}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></Svg>;
const SrchI  = () => <Svg w={15} h={15}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Svg>;
const XIcon  = () => <Svg w={12} h={12} strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>;
const BkIcon = () => <Svg w={14} h={14} strokeWidth={2.5}><polyline points="15 18 9 12 15 6"/></Svg>;
const PlusI  = () => <Svg w={13} h={13} strokeWidth={2.5}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Svg>;
const TrashI = () => <Svg w={13} h={13}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></Svg>;
const SpkI   = () => <Svg w={12} h={12}><path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z"/></Svg>;
const ArrI   = () => <Svg w={10} h={10} strokeWidth={2.5}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Svg>;
const ChkI   = () => <Svg w={12} h={12} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></Svg>;
const BldI   = () => <Svg w={13} h={13} strokeWidth={2.5}><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></Svg>;
const ItalI  = () => <Svg w={13} h={13} strokeWidth={2.5}><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></Svg>;
const UndI   = () => <Svg w={13} h={13} strokeWidth={2.5}><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></Svg>;
const ListI  = () => <Svg w={13} h={13}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></Svg>;
const QtI    = () => <Svg w={13} h={13}><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></Svg>;
const LkI    = () => <Svg w={13} h={13}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></Svg>;

// ─── Recording Modal ──────────────────────────────────────────────────────
const RecordingModal = ({onClose, onSave}: any) => {
  const [phase, setPhase] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<any>(null);
  const [secs, setSecs] = useState(0);
  const timerRef = useRef<any>(null);
  const recRef = useRef<any>(null);

  const DEMO_T = "I've been thinking about how morning journaling can dramatically change the quality of the day. Writing freely before checking your phone acts as a cognitive dump.";
  const DEMO_R = {
    title:"Morning Journaling",tags:["mindfulness","habits"],accent:"rose",
    summary:"Writing freely each morning clears mental clutter before it accumulates.",
    body:`Julia Cameron's Morning Pages — three pages of uncensored stream-of-consciousness writing done immediately on waking — has become one of the most recommended creative and mental-health practices of the last thirty years.

<strong>Why it works</strong>

The act of writing externalizes the internal monologue that would otherwise circulate unproductively. Anxieties, to-do lists, resentments, random associations — once on the page, they stop consuming working memory. The result is a kind of cognitive spaciousness that makes everything else that day feel more manageable.

<strong>The practice</strong>

• Write immediately upon waking, before any device or conversation
• Three pages (roughly 750 words) is the traditional target
• Do not edit, judge, or re-read during the session
• Anything goes — complaints, nonsense, fragments, repetition

<blockquote>The goal is not to write well. The goal is to write honestly, and get out of your own way.</blockquote>

Most people notice a difference within two weeks. The changes are subtle at first: slightly more patience, slightly more creative engagement with problems, slightly less emotional reactivity.`,
    research:["Morning Pages — Julia Cameron (The Artist's Way)","Expressive writing and health — Pennebaker","Journaling as cognitive defusion in ACT therapy"]
  };

  const startRec = () => {
    setPhase("recording"); setSecs(0);
    timerRef.current = setInterval(()=>setSecs(s=>s+1),1000);
    if("SpeechRecognition" in window||"webkitSpeechRecognition" in window){
      const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
      const r=new SR(); r.continuous=true; r.interimResults=true;
      r.onresult=(e: any)=>{let t="";for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;setTranscript(t);};
      r.start(); recRef.current=r;
    } else {
      let i=0; const w=DEMO_T.split(" ");
      const iv=setInterval(()=>{if(i>=w.length){clearInterval(iv);return;}setTranscript(t=>(t?t+" ":"")+w[i]);i++;},110);
    }
  };
  const stopRec = () => {
    clearInterval(timerRef.current); if(recRef.current)recRef.current.stop();
    setPhase("processing");
    setTimeout(()=>{setResult(DEMO_R);if(!transcript.trim())setTranscript(DEMO_T);setPhase("done");},1800);
  };
  const fmt = (s: number)=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(242,238,232,0.88)",backdropFilter:"blur(16px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:"min(500px,94vw)",background:"linear-gradient(150deg,#fffef9,#fdf5ec)",border:"2px solid rgba(180,162,145,0.25)",borderRadius:"28px",padding:"34px 30px 26px",boxShadow:"0 16px 60px rgba(140,120,100,0.14)",position:"relative",animation:"popUp 0.32s cubic-bezier(.22,.68,0,1.25)"}}>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"rgba(0,0,0,0.05)",border:"none",borderRadius:"50%",width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#9a8880"}}><XIcon/></button>
        <h2 style={{fontFamily:"var(--fd)",fontSize:"21px",color:"#2e2620",marginBottom:"3px",fontWeight:"600"}}>
          {phase==="idle"&&"✦ new thought"}{phase==="recording"&&"listening…"}{phase==="processing"&&"weaving…"}{phase==="done"&&"thought ready ✦"}
        </h2>
        <p style={{fontSize:"12.5px",color:"#b0a090",marginBottom:"20px",fontFamily:"var(--fb)",fontWeight:"300"}}>
          {phase==="idle"&&"speak freely — clair will organise your ideas"}
          {phase==="recording"&&`recording ${fmt(secs)}`}
          {phase==="processing"&&"shaping your words…"}
          {phase==="done"&&"your thought has been captured"}
        </p>
        <div style={{background:"rgba(255,255,255,0.7)",borderRadius:"16px",padding:"14px 18px",marginBottom:"16px",border:"1.5px solid rgba(200,185,170,0.18)"}}>
          <Waveform active={phase==="recording"}/>
          {transcript&&<p style={{marginTop:"8px",fontSize:"12px",color:"#9a8878",fontStyle:"italic",lineHeight:"1.55",fontFamily:"var(--fb)",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>"{transcript.slice(0,200)}…"</p>}
        </div>
        {phase==="processing"&&<div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px",color:"#7aab86"}}><div style={{width:"14px",height:"14px",border:"2px solid #7aab86",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.85s linear infinite"}}/><span style={{fontSize:"12.5px",fontFamily:"var(--fb)"}}>organising…</span></div>}
        {phase==="done"&&result&&<div style={{marginBottom:"16px"}}><div style={{fontFamily:"var(--fd)",fontSize:"17px",color:"#2e2620",fontWeight:"600",marginBottom:"3px"}}>{result.title}</div><p style={{fontSize:"12px",color:"#6a5a50",lineHeight:"1.55",fontFamily:"var(--fb)"}}>{result.summary}</p><div style={{display:"flex",gap:"5px",marginTop:"6px"}}>{result.tags.map((t: string)=><span key={t} style={{background:"rgba(122,171,134,0.14)",color:"#3d7a50",borderRadius:"20px",padding:"2px 9px",fontSize:"10.5px",fontFamily:"var(--fb)",fontWeight:"700"}}>{t}</span>)}</div></div>}
        <div style={{display:"flex",gap:"8px"}}>
          {phase==="idle"&&<button onClick={startRec} style={{flex:1,background:"linear-gradient(135deg,#82af8c,#6a9878)",color:"#fff",border:"none",borderRadius:"14px",padding:"13px",fontWeight:"700",fontSize:"13.5px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px",fontFamily:"var(--fb)"}}><MicI/>start speaking</button>}
          {phase==="recording"&&<button onClick={stopRec} style={{flex:1,background:"linear-gradient(135deg,#e8a0b0,#d4788a)",color:"#fff",border:"none",borderRadius:"14px",padding:"13px",fontWeight:"700",fontSize:"13.5px",cursor:"pointer",fontFamily:"var(--fb)"}}>◼ stop</button>}
          {phase==="done"&&<><button onClick={()=>onSave(result)} style={{flex:1,background:"linear-gradient(135deg,#82af8c,#6a9878)",color:"#fff",border:"none",borderRadius:"14px",padding:"13px",fontWeight:"700",fontSize:"13.5px",cursor:"pointer",fontFamily:"var(--fb)"}}>save thought ✦</button><button onClick={onClose} style={{background:"rgba(0,0,0,0.05)",border:"1px solid rgba(0,0,0,0.07)",color:"#9a8880",borderRadius:"14px",padding:"13px 16px",cursor:"pointer",fontFamily:"var(--fb)",fontSize:"12.5px"}}>discard</button></>}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ★ NOTE EDITOR PAGE — the main feature
// ══════════════════════════════════════════════════════════════════════════════
const NoteEditor = ({notes, activeId, onSelectNote, onUpdateNote, onDeleteNote, onNewNote, onBack, onSave, isSaving}: any) => {
  const note = notes.find((n: any)=>n.id===activeId) || notes[0];
  const acc  = ACCENTS[(note?.accent || "sage") as keyof typeof ACCENTS];

  // Local edit state
  const [title,    setTitle]    = useState(note?.title   || "");
  const [body,     setBody]     = useState(note?.body    || "");
  const [tags,     setTags]     = useState(note?.tags    || []);
  const [newTag,   setNewTag]   = useState("");
  const [saved,    setSaved]    = useState(true);
  const [nlSearch, setNlSearch] = useState("");
  const [showRes,  setShowRes]  = useState(true);
  const [delConf,  setDelConf]  = useState(false);
  const [resInput, setResInput] = useState("");
  const [accentPicker, setAccentPicker] = useState(false);

  const editorRef  = useRef<HTMLDivElement>(null);
  const titleRef   = useRef<HTMLInputElement>(null);
  const saveTimer  = useRef<any>(null);
  const lastNoteId = useRef(note?.id);

  // ── Sync when note switches ───────────────────────────────────────────────
  useEffect(()=>{
    if(!note||note.id===lastNoteId.current) return;
    lastNoteId.current = note.id;
    setTitle(note.title||"");
    setBody(note.body||"");
    setTags(note.tags||[]);
    setSaved(true);
    setDelConf(false);
    // Push body into contentEditable
    if(editorRef.current) editorRef.current.innerHTML = note.body||"";
  },[note?.id]);

  // Initial mount: populate contentEditable
  useEffect(()=>{
    if(editorRef.current) editorRef.current.innerHTML = note?.body||"";
  },[]);

  // ── Auto-save (800 ms debounce) ───────────────────────────────────────────
  const scheduleSave = useCallback((t: string,b: string,tg: string[])=>{
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(()=>{
      const plain = (b||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
      onUpdateNote({...note, title:t, body:b, tags:tg, summary:plain.slice(0,140)+(plain.length>140?"…":"")});
      setSaved(true);
    }, 800);
  },[note, onUpdateNote]);

  const handleTitleChange = (e: any) => {setTitle(e.target.value); scheduleSave(e.target.value, body, tags);};

  // ── contentEditable input ─────────────────────────────────────────────────
  const handleEditorInput = () => {
    if(!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setBody(html);
    scheduleSave(title, html, tags);
  };

  // ── Exec formatting command ───────────────────────────────────────────────
  const fmt = (cmd: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false);
    handleEditorInput();
  };
  const fmtVal = (cmd: string,val: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    handleEditorInput();
  };

  // ── Block-level format helpers ────────────────────────────────────────────

  const insertHR = () => {
    editorRef.current?.focus();
    document.execCommand("insertHTML",false,"<hr/><p><br></p>");
    handleEditorInput();
  };

  // ── Keyboard shortcut handler ─────────────────────────────────────────────
  const handleKeyDown = (e: any) => {
    const mod = e.metaKey||e.ctrlKey;
    if(mod&&e.key==="b"){e.preventDefault();fmt("bold");}
    if(mod&&e.key==="i"){e.preventDefault();fmt("italic");}
    if(mod&&e.key==="u"){e.preventDefault();fmt("underline");}
    if(mod&&e.key==="k"){e.preventDefault();promptLink();}
    // Enter inside list → native behaviour is fine; Tab to indent
  };

  const promptLink = () => {
    const url = window.prompt("Enter URL:","https://");
    if(url) fmtVal("createLink",url);
  };

  // ── Tags ──────────────────────────────────────────────────────────────────
  const addTag = (e: any) => {
    if((e.key==="Enter"||e.key===",")&&newTag.trim()){
      e.preventDefault();
      const t=newTag.trim().replace(/,/g,"");
      if(!tags.includes(t)){const u=[...tags,t];setTags(u);scheduleSave(title,body,u);}
      setNewTag("");
    }
  };
  const removeTag = (t: string) => {const u=tags.filter((x: string)=>x!==t);setTags(u);scheduleSave(title,body,u);};

  // ── Research ──────────────────────────────────────────────────────────────
  const addResearch = () => {
    if(!resInput.trim()) return;
    const updated = {...note, research:[...(note.research||[]), resInput.trim()]};
    onUpdateNote(updated);
    setResInput("");
  };
  const removeResearch = (idx: number) => {
    const r=[...note.research]; r.splice(idx,1);
    onUpdateNote({...note,research:r});
  };

  // ── Word count ────────────────────────────────────────────────────────────
  const wordCount = useMemo(()=>{
    const plain = body.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
    return plain ? plain.split(" ").length : 0;
  },[body]);

  // ── Sidebar filter ────────────────────────────────────────────────────────
  const sidebarNotes = nlSearch.trim()
    ? notes.filter((n: any)=>n.title.toLowerCase().includes(nlSearch.toLowerCase())||n.tags.some((t: string)=>t.includes(nlSearch.toLowerCase())))
    : notes;

  // ── Accent change ─────────────────────────────────────────────────────────
  const changeAccent = (ak: string) => {
    onUpdateNote({...note, accent:ak});
    setAccentPicker(false);
  };

  // Close color picker when clicking outside
  useEffect(() => {
    if (!accentPicker) return;
    const handleClick = () => setAccentPicker(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [accentPicker]);

  if(!note) return null;

  // ─── Toolbar button ───────────────────────────────────────────────────────
  const TB = ({onClick,tip,active,children}: any) => {
    const [h,setH]=useState(false);
    return (
      <button onClick={onClick} title={tip} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
        style={{background:active||(h?acc.tagBg:"transparent"),border:"none",borderRadius:"6px",padding:"5px 7px",cursor:"pointer",color:(active||h)?acc.tagText:"#7a6858",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.12s,color 0.12s",flexShrink:0}}>
        {children}
      </button>
    );
  };

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:"#f9f5ef",overflow:"hidden",animation:"edIn 0.28s cubic-bezier(.22,.68,0,1.1)"}}>

      {/* ══ TOP CHROME ══ */}
      <div style={{height:"50px",flexShrink:0,display:"flex",alignItems:"center",gap:"10px",padding:"0 18px",background:acc.bar,backdropFilter:"blur(20px)",borderBottom:`1.5px solid ${acc.border}`,boxShadow:"0 1px 14px rgba(140,120,100,0.06)",zIndex:40}}>
        {/* Back to clair home */}
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:"5px",background:"rgba(255,255,255,0.55)",border:`1.5px solid ${acc.border}`,borderRadius:"10px",padding:"5px 11px",cursor:"pointer",color:"#7a6858",fontFamily:"var(--fb)",fontSize:"12px",fontWeight:"600",transition:"transform 0.12s",flexShrink:0}} onMouseEnter={(e: any)=>e.currentTarget.style.transform="translateX(-2px)"} onMouseLeave={(e: any)=>e.currentTarget.style.transform="translateX(0)"}><BkIcon/>clair</button>
        {/* Breadcrumb */}
        <div style={{flex:1,display:"flex",alignItems:"center",gap:"5px",minWidth:0,overflow:"hidden"}}>
          <span style={{fontSize:"10.5px",color:"#c0b0a0",fontFamily:"var(--fb)",flexShrink:0}}>notes</span>
          <span style={{fontSize:"10.5px",color:"#d4c4b0",flexShrink:0}}>/</span>
          <span style={{fontSize:"12.5px",color:"#7a6858",fontFamily:"var(--fd)",fontWeight:"600",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title||"Untitled"}</span>
        </div>
        {/* Color Change Button */}
        <div style={{position:"relative"}}>
          <button onClick={(e)=>{e.stopPropagation();setAccentPicker(v=>!v);}} style={{display:"flex",alignItems:"center",gap:"6px",background:accentPicker?acc.tagBg:"rgba(255,255,255,0.55)",border:`1.5px solid ${acc.border}`,borderRadius:"10px",padding:"5px 11px",cursor:"pointer",color:acc.tagText,fontFamily:"var(--fb)",fontSize:"12px",fontWeight:"600",transition:"all 0.15s",flexShrink:0}} onMouseEnter={(e: any)=>e.currentTarget.style.background=acc.tagBg} onMouseLeave={(e: any)=>!accentPicker&&(e.currentTarget.style.background="rgba(255,255,255,0.55)")}>
            <div style={{width:"14px",height:"14px",borderRadius:"50%",background:acc.dot,border:`2px solid ${acc.border}`,flexShrink:0}}/>
            color
          </button>
          {accentPicker&&<div onClick={(e)=>e.stopPropagation()} style={{position:"absolute",top:"46px",right:0,background:"rgba(255,255,255,0.98)",backdropFilter:"blur(16px)",border:"1.5px solid rgba(200,185,168,0.28)",borderRadius:"16px",padding:"12px",display:"flex",flexDirection:"column",gap:"8px",boxShadow:"0 8px 32px rgba(140,120,100,0.16)",zIndex:100,minWidth:"160px"}}>
            <div style={{fontSize:"11px",fontWeight:"700",color:"#7a6858",fontFamily:"var(--fb)",marginBottom:"2px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Note Color</div>
            <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
              {ACCENT_KEYS.map(k=><button key={k} onClick={(e)=>{e.stopPropagation();changeAccent(k);}} title={k.charAt(0).toUpperCase()+k.slice(1)} style={{width:"28px",height:"28px",borderRadius:"50%",background:ACCENTS[k as keyof typeof ACCENTS].dot,border:k===note.accent?`3px solid #3a3028`:`2px solid ${ACCENTS[k as keyof typeof ACCENTS].border}`,cursor:"pointer",transition:"all 0.15s",boxShadow:k===note.accent?"0 2px 8px rgba(0,0,0,0.15)":"none"}} onMouseEnter={(e: any)=>{e.currentTarget.style.transform="scale(1.15)";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.15)";}} onMouseLeave={(e: any)=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow=k===note.accent?"0 2px 8px rgba(0,0,0,0.15)":"none";}}/>)}
            </div>
          </div>}
        </div>
        {/* Research toggle */}
        <button onClick={()=>setShowRes(v=>!v)} style={{display:"flex",alignItems:"center",gap:"4px",background:showRes?acc.tagBg:"rgba(255,255,255,0.5)",border:`1.5px solid ${acc.border}`,borderRadius:"9px",padding:"4px 10px",cursor:"pointer",color:showRes?acc.tagText:"#9a8878",fontSize:"11.5px",fontFamily:"var(--fb)",fontWeight:"600",transition:"background 0.15s"}}><SpkI/>research</button>
        {/* Delete button */}
        {!delConf ? (
          <button onClick={()=>setDelConf(true)} style={{display:"flex",alignItems:"center",gap:"4px",background:"rgba(220,100,100,0.08)",border:"1.5px solid rgba(220,100,100,0.25)",borderRadius:"9px",padding:"4px 10px",cursor:"pointer",color:"#b05050",fontSize:"11.5px",fontFamily:"var(--fb)",fontWeight:"600",transition:"all 0.15s"}} onMouseEnter={(e: any)=>{e.currentTarget.style.background="rgba(220,100,100,0.15)";e.currentTarget.style.borderColor="rgba(220,100,100,0.4)";}} onMouseLeave={(e: any)=>{e.currentTarget.style.background="rgba(220,100,100,0.08)";e.currentTarget.style.borderColor="rgba(220,100,100,0.25)";}}><TrashI/>delete</button>
        ) : (
          <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
            <button onClick={()=>setDelConf(false)} style={{padding:"4px 8px",background:"rgba(255,255,255,0.55)",border:`1.5px solid ${acc.border}`,borderRadius:"8px",fontSize:"10.5px",fontFamily:"var(--fb)",fontWeight:"600",color:"#7a6858",cursor:"pointer"}}>cancel</button>
            <button onClick={onDeleteNote} style={{padding:"4px 8px",background:"#dc6464",border:"1.5px solid #c85050",borderRadius:"8px",fontSize:"10.5px",fontFamily:"var(--fb)",fontWeight:"700",color:"#fff",cursor:"pointer"}}>confirm</button>
          </div>
        )}
        {/* Save button */}
        <button onClick={onSave} disabled={isSaving} style={{display:"flex",alignItems:"center",gap:"5px",background:isSaving?"rgba(130,175,140,0.4)":"linear-gradient(145deg, #82af8c, #6a9878)",border:`1.5px solid ${isSaving?"rgba(130,175,140,0.3)":"rgba(106,152,120,0.5)"}`,borderRadius:"10px",padding:"5px 12px",cursor:isSaving?"wait":"pointer",color:"#fff",fontSize:"12px",fontFamily:"var(--fb)",fontWeight:"700",transition:"all 0.15s",flexShrink:0,boxShadow:isSaving?"none":"0 2px 8px rgba(106,152,120,0.25)"}} onMouseEnter={(e: any)=>!isSaving&&(e.currentTarget.style.transform="translateY(-1px)",e.currentTarget.style.boxShadow="0 4px 12px rgba(106,152,120,0.35)")} onMouseLeave={(e: any)=>!isSaving&&(e.currentTarget.style.transform="translateY(0)",e.currentTarget.style.boxShadow="0 2px 8px rgba(106,152,120,0.25)")}>
          {isSaving?<div style={{width:"12px",height:"12px",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>:<SpkI/>}
          {isSaving?"analyzing...":"save & analyze"}
        </button>
        {/* Save status */}
        <div style={{display:"flex",alignItems:"center",gap:"3px",fontSize:"11px",color:saved?"#82af8c":"#c0b0a0",fontFamily:"var(--fb)",transition:"color 0.35s",flexShrink:0}}>
          {saved?<ChkI/>:<div style={{width:"10px",height:"10px",border:"1.5px solid #c0b0a0",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.85s linear infinite"}}/>}
          {saved?"saved":"saving"}
        </div>
      </div>

      {/* ══ THREE-PANEL BODY ══ */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* ─── LEFT SIDEBAR: Note List ─── */}
        <div style={{width:"230px",flexShrink:0,borderRight:`1.5px solid ${acc.border}`,background:acc.sidebar,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* Sidebar header */}
          <div style={{padding:"12px 12px 8px",borderBottom:`1px solid ${acc.border}`,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
              <span style={{fontFamily:"var(--fd)",fontSize:"12.5px",color:"#7a6858",fontStyle:"italic",fontWeight:"400"}}>all notes</span>
              <button onClick={onNewNote} title="New note" style={{background:"linear-gradient(135deg,#82af8c,#6a9878)",border:"none",borderRadius:"7px",width:"24px",height:"24px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",boxShadow:"0 2px 7px rgba(106,152,120,0.28)"}}><PlusI/></button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"6px",background:"rgba(255,255,255,0.65)",border:`1.5px solid ${acc.border}`,borderRadius:"9px",padding:"0 9px",height:"30px"}}>
              <span style={{color:"#c0b0a0",transform:"scale(0.85)"}}><SrchI/></span>
              <input value={nlSearch} onChange={(e)=>setNlSearch(e.target.value)} placeholder="filter…" style={{flex:1,background:"none",border:"none",outline:"none",fontSize:"11.5px",color:"#2e2620",fontFamily:"var(--fb)"}}/>
              {nlSearch&&<button onClick={()=>setNlSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#c0b0a0",padding:0,display:"flex"}}><XIcon/></button>}
            </div>
          </div>
          {/* Note list */}
          <div style={{flex:1,overflowY:"auto",padding:"6px 7px"}}>
            {sidebarNotes.map((n: any)=>{
              const a=ACCENTS[n.accent as keyof typeof ACCENTS]; const isA=n.id===note.id;
              return (
                <div key={n.id} onClick={()=>onSelectNote(n.id)} style={{padding:"9px 11px",borderRadius:"11px",cursor:"pointer",marginBottom:"3px",background:isA?a.tagBg:"transparent",border:`1.5px solid ${isA?a.border:"transparent"}`,transition:"background 0.12s,border-color 0.12s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"3px"}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:a.dot,flexShrink:0}}/>
                    <span style={{fontFamily:"var(--fd)",fontSize:"12.5px",color:isA?"#2e2620":"#5a4a3a",fontWeight:isA?"600":"400",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:"1.3"}}>{n.title||"Untitled"}</span>
                  </div>
                  <div style={{fontSize:"10.5px",color:"#b0a090",fontFamily:"var(--fb)",paddingLeft:"13px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.date}{n.tags[0]?" · "+n.tags[0]:""}</div>
                </div>
              );
            })}
            {sidebarNotes.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:"#c0b0a0",fontSize:"11.5px",fontFamily:"var(--fb)"}}>no notes</div>}
          </div>
        </div>

        {/* ─── CENTER: Editor ─── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

          {/* Formatting toolbar */}
          <div style={{padding:"5px 20px",borderBottom:`1px solid ${acc.border}`,background:"rgba(255,255,255,0.5)",display:"flex",alignItems:"center",gap:"1px",flexShrink:0,flexWrap:"wrap"}}>
            {/* Text style */}
            <TB onClick={()=>fmt("bold")}      tip="Bold (⌘B)"><BldI/></TB>
            <TB onClick={()=>fmt("italic")}    tip="Italic (⌘I)"><ItalI/></TB>
            <TB onClick={()=>fmt("underline")} tip="Underline (⌘U)"><UndI/></TB>
            <TB onClick={()=>fmt("strikeThrough")} tip="Strikethrough"><span style={{textDecoration:"line-through",fontSize:"12px",fontWeight:"600"}}>S</span></TB>
            <div style={{width:"1px",height:"18px",background:acc.border,margin:"0 4px"}}/>
            {/* Headings */}
            <TB onClick={()=>fmtVal("formatBlock","h1")} tip="Heading 1"><span style={{fontSize:"11px",fontWeight:"800"}}>H1</span></TB>
            <TB onClick={()=>fmtVal("formatBlock","h2")} tip="Heading 2"><span style={{fontSize:"11px",fontWeight:"700"}}>H2</span></TB>
            <TB onClick={()=>fmtVal("formatBlock","h3")} tip="Heading 3"><span style={{fontSize:"10.5px",fontWeight:"700"}}>H3</span></TB>
            <TB onClick={()=>fmtVal("formatBlock","p")}  tip="Normal text"><span style={{fontSize:"10.5px",fontWeight:"600"}}>¶</span></TB>
            <div style={{width:"1px",height:"18px",background:acc.border,margin:"0 4px"}}/>
            {/* Lists & blocks */}
            <TB onClick={()=>fmt("insertUnorderedList")} tip="Bullet list"><ListI/></TB>
            <TB onClick={()=>fmt("insertOrderedList")}   tip="Numbered list"><span style={{fontSize:"10.5px",fontWeight:"700"}}>1.</span></TB>
            <TB onClick={()=>fmtVal("formatBlock","blockquote")} tip="Blockquote"><QtI/></TB>
            <TB onClick={()=>fmtVal("formatBlock","pre")}        tip="Code block"><span style={{fontFamily:"monospace",fontSize:"11px"}}>{"</>"}</span></TB>
            <TB onClick={insertHR} tip="Divider"><span style={{fontSize:"10px",letterSpacing:"-1px"}}>───</span></TB>
            <TB onClick={promptLink} tip="Insert link (⌘K)"><LkI/></TB>
            <div style={{flex:1}}/>
            {/* Undo / Redo */}
            <TB onClick={()=>fmt("undo")} tip="Undo (⌘Z)"><span style={{fontSize:"13px"}}>↩</span></TB>
            <TB onClick={()=>fmt("redo")} tip="Redo (⌘Y)"><span style={{fontSize:"13px"}}>↪</span></TB>
            <div style={{width:"1px",height:"18px",background:acc.border,margin:"0 4px"}}/>
            {/* Delete */}
            {!delConf
              ? <TB onClick={()=>setDelConf(true)} tip="Delete note"><span style={{color:"#cc8888"}}><TrashI/></span></TB>
              : <div style={{display:"flex",alignItems:"center",gap:"5px",padding:"0 4px"}}>
                  <span style={{fontSize:"10.5px",color:"#cc8888",fontFamily:"var(--fb)",whiteSpace:"nowrap"}}>delete?</span>
                  <button onClick={()=>{onDeleteNote(note.id);setDelConf(false);}} style={{background:"#cc8888",border:"none",borderRadius:"5px",padding:"2px 8px",color:"#fff",fontSize:"10.5px",fontFamily:"var(--fb)",cursor:"pointer",fontWeight:"700"}}>yes</button>
                  <button onClick={()=>setDelConf(false)} style={{background:"rgba(0,0,0,0.06)",border:"none",borderRadius:"5px",padding:"2px 8px",color:"#7a6858",fontSize:"10.5px",fontFamily:"var(--fb)",cursor:"pointer"}}>no</button>
                </div>
            }
          </div>

          {/* ── Scrollable writing area ── */}
          <div style={{flex:1,overflowY:"auto"}}>

            {/* Note metadata header */}
            <div style={{padding:"30px 48px 0",background:`linear-gradient(180deg,${acc.bg} 0%,transparent 100%)`,flexShrink:0}}>
              {/* Tags row */}
              <div style={{display:"flex",gap:"5px",flexWrap:"wrap",alignItems:"center",marginBottom:"14px"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:acc.dot}}/>
                {tags.map((t: string)=>(
                  <div key={t} style={{display:"flex",alignItems:"center",gap:"3px",background:acc.tagBg,borderRadius:"20px",padding:"2px 8px 2px 10px"}}>
                    <span style={{fontSize:"10.5px",color:acc.tagText,fontFamily:"var(--fb)",fontWeight:"700"}}>{t}</span>
                    <button onClick={()=>removeTag(t)} style={{background:"none",border:"none",cursor:"pointer",color:acc.tagText,padding:0,display:"flex",opacity:0.5,lineHeight:1}}><XIcon/></button>
                  </div>
                ))}
                <div style={{display:"flex",alignItems:"center",gap:"3px",background:"rgba(255,255,255,0.45)",border:`1px dashed ${acc.border}`,borderRadius:"20px",padding:"2px 8px"}}>
                  <span style={{color:"#c0b0a0",transform:"scale(0.8)"}}><PlusI/></span>
                  <input value={newTag} onChange={(e)=>setNewTag(e.target.value)} onKeyDown={addTag} placeholder="tag…" style={{background:"none",border:"none",fontSize:"10.5px",color:"#9a8878",fontFamily:"var(--fb)",width:"42px",outline:"none"}}/>
                </div>
                <span style={{fontSize:"10.5px",color:"#c0b0a0",fontFamily:"var(--fb)",marginLeft:"4px"}}>{note.date}</span>
              </div>

              {/* Editable title */}
              <input ref={titleRef} value={title} onChange={handleTitleChange} placeholder="Note title…"
                style={{width:"100%",background:"none",border:"none",outline:"none",fontFamily:"var(--fd)",fontSize:"clamp(20px,3.2vw,34px)",fontWeight:"700",color:"#1e1a16",lineHeight:"1.15",marginBottom:"4px"}}/>
              {/* Accent underline */}
              <div style={{width:"48px",height:"3px",background:`linear-gradient(90deg,${acc.dot},transparent)`,borderRadius:"2px",marginBottom:"22px"}}/>
            </div>

            {/* ════ THE CONTENTEDITABLE EDITOR ════ */}
            <div style={{padding:"0 48px 80px",position:"relative"}}>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onKeyDown={handleKeyDown}
                spellCheck
                data-placeholder="Start writing your thoughts here…"
                style={{
                  minHeight:"calc(100vh - 380px)",
                  outline:"none",
                  fontFamily:"var(--fb)",
                  fontSize:"15px",
                  color:"#2a2018",
                  lineHeight:"1.9",
                  letterSpacing:"0.01em",
                  wordBreak:"break-word",
                }}
              />
            </div>
          </div>

          {/* Status bar */}
          <div style={{height:"28px",flexShrink:0,borderTop:`1px solid ${acc.border}`,background:"rgba(255,255,255,0.38)",display:"flex",alignItems:"center",gap:"16px",padding:"0 48px",fontSize:"10.5px",color:"#c0b0a0",fontFamily:"var(--fb)"}}>
            <span>{wordCount} word{wordCount!==1?"s":""}</span>
            <span>{note.date}</span>
            <span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"3px",color:saved?"#82af8c":"#c0b0a0",transition:"color 0.35s"}}>
              {saved?<ChkI/>:<div style={{width:"8px",height:"8px",border:"1.5px solid #c0b0a0",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.85s linear infinite"}}/>}
              {saved?"all changes saved":"saving…"}
            </span>
          </div>
        </div>

        {/* ─── RIGHT: Research Panel ─── */}
        {showRes&&(
          <div style={{width:"256px",flexShrink:0,borderLeft:`1.5px solid ${acc.border}`,background:acc.bar,backdropFilter:"blur(12px)",display:"flex",flexDirection:"column",overflow:"hidden",animation:"sideIn 0.22s ease"}}>
            <div style={{padding:"16px 16px 11px",borderBottom:`1px solid ${acc.border}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:"5px",marginBottom:"2px"}}>
                <span style={{color:acc.tagText}}><SpkI/></span>
                <span style={{fontFamily:"var(--fd)",fontSize:"13.5px",color:"#2e2620",fontWeight:"600",fontStyle:"italic"}}>explore further</span>
              </div>
              <p style={{fontSize:"10.5px",color:"#c0b0a0",fontFamily:"var(--fb)"}}>AI-suggested reading</p>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"12px 12px 20px",display:"flex",flexDirection:"column",gap:"7px"}}>
              {(note.research||[]).length===0&&<div style={{fontSize:"11.5px",color:"#c0b0a0",fontFamily:"var(--fb)",textAlign:"center",padding:"16px 0"}}>no suggestions yet</div>}
              {(note.research||[]).map((r: string,i: number)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.62)",border:`1.5px solid ${acc.border}`,borderRadius:"11px",padding:"11px 12px",animation:`floatIn 0.3s ease both`,animationDelay:`${i*0.06}s`,position:"relative"}}>
                  <div style={{display:"flex",gap:"7px",alignItems:"flex-start",paddingRight:"18px"}}>
                    <span style={{color:acc.dot,flexShrink:0,marginTop:"2px"}}><ArrI/></span>
                    <span style={{fontSize:"12px",color:"#4a3828",fontFamily:"var(--fb)",lineHeight:"1.5"}}>{r}</span>
                  </div>
                  <button onClick={()=>removeResearch(i)} style={{position:"absolute",top:7,right:7,background:"none",border:"none",cursor:"pointer",color:"#c0b0a0",display:"flex",padding:0,opacity:0.6}} onMouseEnter={(e: any)=>e.currentTarget.style.opacity="1"} onMouseLeave={(e: any)=>e.currentTarget.style.opacity="0.6"}><XIcon/></button>
                </div>
              ))}

              {/* Add resource */}
              <div style={{marginTop:"6px",paddingTop:"10px",borderTop:`1px dashed ${acc.border}`}}>
                <div style={{fontSize:"10px",color:"#c0b0a0",fontFamily:"var(--fb)",marginBottom:"7px",display:"flex",alignItems:"center",gap:"3px"}}><PlusI/>add resource</div>
                <div style={{display:"flex",gap:"5px"}}>
                  <input value={resInput} onChange={(e)=>setResInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&addResearch()} placeholder="title or URL…" style={{flex:1,background:"rgba(255,255,255,0.65)",border:`1.5px solid ${acc.border}`,borderRadius:"8px",padding:"6px 9px",fontSize:"11px",fontFamily:"var(--fb)",color:"#3a2e28",outline:"none"}}/>
                  <button onClick={addResearch} style={{background:acc.tagBg,border:"none",borderRadius:"8px",padding:"6px 9px",cursor:"pointer",color:acc.tagText,display:"flex",alignItems:"center"}}><PlusI/></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP - Backend-connected note editor
// ══════════════════════════════════════════════════════════════════════════════
export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [recording, setRecording] = useState(false);
  const isNewNote = id === "new";

  // Fetch existing note if not new
  const { data: fetchedNote, isLoading } = useQuery({
    queryKey: ["note", id],
    queryFn: () => api.get<NoteResponse>(`/api/notes/${id}`),
    enabled: !isNewNote,
  });

  // Local state for the note being edited
  const [localNote, setLocalNote] = useState<any>(null);

  // Initialize local note from fetched data or create blank note
  useEffect(() => {
    if (isNewNote) {
      setLocalNote({
        id: "new",
        title: "",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        tags: [],
        accent: "sage",
        summary: "",
        body: "",
        research: [],
      });
    } else if (fetchedNote) {
      const content = fetchedNote.processed_content || fetchedNote.raw_content;
      const lines = content.split("\n");
      const firstLine = lines[0].trim();
      // Use stored title if available; otherwise derive from first line
      const title = fetchedNote.title || (firstLine.length > 70 ? firstLine.slice(0, 70) + "…" : firstLine || "Untitled");
      // Body is always raw_content (title is now an independent field)
      const body = fetchedNote.raw_content;

      setLocalNote({
        id: fetchedNote.id,
        title,
        body,
        tags: fetchedNote.tags,
        // Use stored color if available; otherwise derive from category
        accent: (fetchedNote.color as keyof typeof ACCENTS) || accentFromCategory(fetchedNote.category?.name, fetchedNote.id),
        summary: fetchedNote.processed_content?.slice(0, 140) || "",
        date: new Date(fetchedNote.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        research: fetchedNote.resources.map(r => r.title || r.url),
      });
    }
  }, [isNewNote, fetchedNote]);

  // Mutation for creating a new note
  const createMutation = useMutation({
    mutationFn: async (content: string) => {
      const form = new FormData();
      form.append("content", content);
      form.append("content_type", "text");
      return api.post<{ id: string }>("/api/notes/", form);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      navigate(`/note/${data.id}`);
    },
  });

  // Mutation for updating an existing note
  const updateMutation = useMutation({
    mutationFn: async ({ noteId, content, title, tags, color }: { noteId: string; content: string; title?: string; tags: string[]; color?: string }) => {
      return api.patch<NoteResponse>(`/api/notes/${noteId}`, { content, title, tags, color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["note", id] });
    },
  });

  // Mutation for deleting a note
  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return api.delete(`/api/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      navigate("/");
    },
  });

  // Mutation for reprocessing note (AI analysis)
  const reprocessMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return api.post(`/api/notes/${noteId}/reprocess`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note", id] });
    },
  });

  // Fetch all notes for sidebar
  const { data: allNotes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: () => api.get<NoteResponse[]>("/api/notes/?limit=50"),
  });

  const handleUpdate = useCallback((updated: any) => {
    setLocalNote(updated);

    // Only auto-save for existing notes
    if (!isNewNote && updated.id && updated.id !== "new") {
      updateMutation.mutate({
        noteId: updated.id,
        content: updated.body,
        title: updated.title,
        tags: updated.tags,
        color: updated.accent,
      });
    }
  }, [isNewNote, updateMutation]);

  const handleSave = useCallback(() => {
    if (!localNote) return;

    if (isNewNote) {
      // Create new note — send body as content; AI will generate title
      if (localNote.body?.trim()) {
        createMutation.mutate(localNote.body);
      }
    } else if (localNote.id && localNote.id !== "new") {
      // Update existing note with separate title, body, color, then trigger AI reprocessing
      updateMutation.mutate(
        {
          noteId: localNote.id,
          content: localNote.body,
          title: localNote.title,
          tags: localNote.tags,
          color: localNote.accent,
        },
        {
          onSuccess: () => {
            reprocessMutation.mutate(localNote.id);
          },
        }
      );
    }
  }, [localNote, isNewNote, createMutation, updateMutation, reprocessMutation]);

  const handleDelete = useCallback(() => {
    if (localNote?.id && localNote.id !== "new") {
      deleteMutation.mutate(localNote.id);
    } else {
      navigate("/");
    }
  }, [localNote, deleteMutation, navigate]);

  const handleNewNote = useCallback(() => {
    navigate("/note/new");
  }, [navigate]);

  const handleSelectNote = useCallback((noteId: string) => {
    navigate(`/note/${noteId}`);
  }, [navigate]);

  const handleSaveRecording = (result: any) => {
    const content = `${result.title}\n${result.body}`;
    createMutation.mutate(content);
    setRecording(false);
  };

  const handleBack = () => {
    navigate("/");
  };

  // Show loading state
  if (!isNewNote && isLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f5ef" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(130,175,140,0.3)", borderTopColor: "#82af8c", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }}/>
          <div style={{ fontSize: "14px", color: "#c0b0a0", fontFamily: "var(--fb)" }}>Loading note…</div>
        </div>
      </div>
    );
  }

  // Show error if note not found
  if (!isNewNote && !isLoading && !fetchedNote) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f5ef" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>○</div>
          <div style={{ fontSize: "16px", color: "#9a8880", fontFamily: "var(--fb)", marginBottom: "16px" }}>Note not found</div>
          <button onClick={handleBack} style={{ background: "linear-gradient(145deg, #e8f2ea, #d2e8da)", border: "1.5px solid rgba(130,175,140,0.4)", borderRadius: "12px", padding: "10px 20px", cursor: "pointer", color: "#3d6b4a", fontFamily: "var(--fb)", fontSize: "13px", fontWeight: "600" }}>← Back to home</button>
        </div>
      </div>
    );
  }

  if (!localNote) return null;

  // Convert all notes to display format for sidebar
  const displayNotes = allNotes.map((n) => {
    const content = n.processed_content || n.raw_content;
    const lines = content.split("\n");
    const firstLine = lines[0].trim();
    const title = n.title || (firstLine.length > 70 ? firstLine.slice(0, 70) + "…" : firstLine || "Untitled");
    return {
      id: n.id,
      title,
      date: new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      tags: n.tags,
      accent: (n.color as keyof typeof ACCENTS) || accentFromCategory(n.category?.name, n.id),
      body: "",
      summary: "",
      research: [],
    };
  });

  // If we have a localNote, ensure it's in the list (for new notes)
  const allDisplayNotes = localNote.id === "new" 
    ? [localNote, ...displayNotes]
    : displayNotes;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@300;400;600;700&display=swap');
        :root{--fd:'Playfair Display',Georgia,serif;--fb:'Nunito',sans-serif;}
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#f9f5ef;font-family:var(--fb);min-height:100vh;}
        input:focus,textarea:focus{outline:none;}

        /* Editor rich-text styles */
        [contenteditable] h1{font-family:var(--fd);font-size:26px;font-weight:700;color:#1a1410;line-height:1.25;margin:28px 0 6px;}
        [contenteditable] h2{font-family:var(--fd);font-size:20px;font-weight:600;color:#2a2018;line-height:1.3;margin:22px 0 5px;}
        [contenteditable] h3{font-family:var(--fd);font-size:16px;font-weight:600;color:#3a3028;line-height:1.35;margin:16px 0 4px;}
        [contenteditable] p{margin:0 0 4px;}
        [contenteditable] blockquote{border-left:3px solid #c8b8a8;padding:4px 14px;margin:14px 0;color:#7a6858;font-style:italic;font-family:var(--fd);font-size:15px;line-height:1.65;}
        [contenteditable] ul,[contenteditable] ol{padding-left:22px;margin:6px 0;}
        [contenteditable] li{margin-bottom:4px;line-height:1.75;}
        [contenteditable] pre{background:rgba(0,0,0,0.045);border:1px solid rgba(0,0,0,0.08);border-radius:8px;padding:12px 16px;font-family:monospace;font-size:13.5px;overflow-x:auto;white-space:pre-wrap;margin:10px 0;color:#2a2018;line-height:1.6;}
        [contenteditable] code{background:rgba(0,0,0,0.05);border-radius:4px;padding:1px 5px;font-family:monospace;font-size:13.5px;}
        [contenteditable] hr{border:none;border-top:1.5px solid #ddd0c4;margin:20px 0;}
        [contenteditable] a{color:#5058b0;text-decoration:underline;text-underline-offset:2px;}
        [contenteditable]:empty:before{content:attr(data-placeholder);color:#c8b8a8;pointer-events:none;font-style:italic;}
        [contenteditable] strong{font-weight:700;}
        [contenteditable] em{font-style:italic;}

        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#ddd0c0;border-radius:3px;}

        @keyframes wave{from{height:4px;}to{height:28px;}}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes popUp{0%{opacity:0;transform:scale(0.84) translateY(18px);}70%{transform:scale(1.02) translateY(-3px);}100%{opacity:1;transform:scale(1) translateY(0);}}
        @keyframes floatIn{from{opacity:0;transform:translateY(13px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}
        @keyframes edIn{from{opacity:0;transform:translateX(24px);}to{opacity:1;transform:translateX(0);}}
        @keyframes sideIn{from{opacity:0;transform:translateX(12px);}to{opacity:1;transform:translateX(0);}}
      `}</style>

      <NoteEditor
        notes={allDisplayNotes}
        activeId={localNote.id}
        onSelectNote={handleSelectNote}
        onUpdateNote={handleUpdate}
        onDeleteNote={handleDelete}
        onNewNote={handleNewNote}
        onBack={handleBack}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending || reprocessMutation.isPending}
      />

      {recording && <RecordingModal onClose={() => setRecording(false)} onSave={handleSaveRecording} />}
    </>
  );
}
