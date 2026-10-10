import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, BookOpen, Bot, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock3, Database, FileText, GraduationCap, Info, LockKeyhole, Menu, MessageCircle, Plus, Send, ShieldCheck, Sparkles, UserRound, X, AlertTriangle, ExternalLink } from 'lucide-react';
import './style.css';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
type Citation = { doc_id?: string; title?: string; section?: string; page?: string | number; version?: string; effective_from?: string; effective_date?: string };
type ToolCall = { tool?: string; name?: string; input?: unknown; output?: unknown };
type Answer = { trace_id?: string; answer: string; answer_type: string; citations?: Citation[]; tools_invoked?: ToolCall[]; tool_results?: ToolCall[]; conflicts_detected?: unknown[]; conflicts?: unknown[]; explanation?: string; latency_ms?: number; as_of_date?: string; applied_rules?: unknown[] };
type Message = { id: number; role: 'user' | 'assistant'; text: string; response?: Answer; error?: boolean; timestamp: string };
const samples = [
  { icon: BookOpen, label: 'Attendance policy', question: 'What is the minimum attendance required for the end-semester examination?', public: true },
  { icon: FileText, label: 'Supplementary exams', question: 'What is the procedure for supplementary examinations?', public: true },
  { icon: GraduationCap, label: 'My eligibility', question: 'Am I eligible for the Data Structures examination?', public: false },
  { icon: CalendarDays, label: 'Attendance what-if', question: 'If I attend my next 5 classes in CS201, will I meet the attendance requirement?', public: false },
];
const pretty = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const toError = (data: unknown, status: number) => {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(v => v?.msg || JSON.stringify(v)).join('; ');
  }
  return `Request failed (HTTP ${status})`;
};
function App() {
  const [mode, setMode] = useState<'guest' | 'student'>('guest');
  const [student, setStudent] = useState('S1001');
  const [students, setStudents] = useState<string[]>(['S1001']);
  const [question, setQuestion] = useState('');
  const [asOf, setAsOf] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<'online' | 'offline' | 'checking'>('checking');
  const [sidebar, setSidebar] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API}/health`, { signal: controller.signal }).then(r => setHealth(r.ok ? 'online' : 'offline')).catch(() => { if (!controller.signal.aborted) setHealth('offline'); });
    fetch(`${API}/demo/students`, { signal: controller.signal }).then(r => r.ok ? r.json() : []).then(rows => {
      if (!Array.isArray(rows)) return;
      const ids = rows.map((r: unknown) => typeof r === 'string' ? r : (r && typeof r === 'object' && 'student_id' in r ? String(r.student_id) : '')).filter(Boolean);
      if (ids.length) { setStudents(ids); setStudent(ids[0]); }
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [messages, loading]);
  useEffect(() => () => abort.current?.abort(), []);
  const ask = async (text = question) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setQuestion('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: clean, timestamp: timeNow() }]);
    setLoading(true);
    const controller = new AbortController();
    abort.current = controller;
    const started = performance.now();
    try {
      // The API requires a demo student header for every request, including public policy questions.
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Student-Id': student };
      const res = await fetch(`${API}/ask`, {
        method: 'POST', headers, signal: controller.signal,
        body: JSON.stringify({ question: clean, ...(asOf ? { as_of_date: asOf } : {}) })
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(toError(body, res.status));
      if (!body || typeof body.answer !== 'string') throw new Error('The API returned an unexpected response.');
      const response: Answer = { ...body, latency_ms: body.latency_ms ?? Math.round(performance.now() - started) };
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: response.answer, response, timestamp: timeNow() }]);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof TypeError ? 'Cannot connect to the backend. Check that FastAPI is running and CORS is enabled.' : err instanceof Error ? err.message : 'Something went wrong.';
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: message, error: true, timestamp: timeNow() }]);
    } finally {
      if (abort.current === controller) {
        abort.current = null;
        setLoading(false);
      }
    }
  };
  const clearChat = () => { abort.current?.abort(); abort.current = null; setLoading(false); setMessages([]); setQuestion(''); setSidebar(false); };
  return <div className="shell">
    <aside className={`sidebar ${sidebar ? 'show' : ''}`}>
      <div className="brand"><div className="brand-icon"><GraduationCap size={23}/></div><div><strong>UniAssist</strong><span>AI Student Services</span></div><button className="mobile-close icon-button" onClick={() => setSidebar(false)} aria-label="Close menu"><X size={18}/></button></div>
      <button className="new-chat" onClick={clearChat}><Plus size={17}/> New conversation</button>
      <div className="sidebar-section"><span className="section-caption">WORKSPACE</span><div className="nav-item selected"><MessageCircle size={18}/> AI Assistant</div><a className="nav-item" href={`${API}/sources`} target="_blank" rel="noreferrer"><BookOpen size={18}/> Source Library <ExternalLink size={13} className="nav-tail"/></a><a className="nav-item" href={`${API}/health`} target="_blank" rel="noreferrer"><Database size={18}/> System Status <ExternalLink size={13} className="nav-tail"/></a></div>
      <div className="sidebar-section tips"><span className="section-caption">HOW IT WORKS</span><p><ShieldCheck size={16}/> Answers grounded in university sources</p><p><LockKeyhole size={16}/> Student records require demo login</p><p><FileText size={16}/> Policy citations with every supported answer</p></div>
      <div className="sidebar-bottom"><span className={`status-dot ${health}`}/><span>{health === 'online' ? 'Backend connected' : health === 'checking' ? 'Checking connection...' : 'Backend unavailable'}</span><span className="demo-pill">MVP DEMO</span></div>
    </aside>
    {sidebar && <button className="scrim" aria-label="Close sidebar" onClick={() => setSidebar(false)}/>}
    <div className="content">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setSidebar(true)} aria-label="Open menu"><Menu size={21}/></button><span className="breadcrumb">Workspace <ChevronRight size={14}/> <b>AI Assistant</b></span></div><div className="topbar-right"><span className="secure-label"><ShieldCheck size={15}/> Source-grounded AI</span><span className="avatar"><UserRound size={17}/></span></div></header>
      <main className="workspace">
        <div className="heading-row"><div><div className="eyebrow"><Sparkles size={15}/> YOUR UNIVERSITY COMPANION</div><h1>Student Services Assistant</h1><p className="subtitle">Ask about academic policies, eligibility, attendance and more — with answers backed by university sources.</p></div></div>
        <div className="mode-panel"><div className="mode-intro"><div className="mode-symbol"><LockKeyhole size={19}/></div><div><strong>Access mode</strong><span>{mode === 'guest' ? 'Public policy questions use the default synthetic demo profile.' : 'Choose a synthetic demo student to check personal eligibility.'}</span></div></div><div className="mode-controls"><div className="segmented" role="group" aria-label="Access mode"><button className={mode === 'guest' ? 'active' : ''} onClick={() => setMode('guest')}>Guest</button><button className={mode === 'student' ? 'active' : ''} onClick={() => setMode('student')}>Student demo</button></div>{mode === 'student' && <label className="student-select">Student ID <select value={student} onChange={e => setStudent(e.target.value)}>{students.map(id => <option key={id} value={id}>{id}</option>)}</select></label>}</div></div>
        <div className="chat-area" aria-live="polite">{messages.length === 0 ? <div className="welcome"><div className="welcome-icon"><Bot size={29}/></div><h2>How can I help you today?</h2><p>Explore university regulations or check your own academic eligibility. Choose a suggestion to get started.</p><div className="suggestions">{samples.map(({ icon: Icon, label, question: sample, public: isPublic }) => <button key={label} className="suggestion" onClick={() => { setQuestion(sample); }}><span className="suggestion-icon"><Icon size={18}/></span><span><strong>{label}</strong><small>{isPublic ? 'Public information' : 'Student access needed'}</small></span><ArrowRight size={16} className="suggestion-arrow"/></button>)}</div></div> : <div className="conversation">{messages.map(m => <div className={`message ${m.role}`} key={m.id}><div className={`message-icon ${m.role}`}><>{m.role === 'user' ? <UserRound size={17}/> : <Bot size={19}/>}</></div><div className="message-body"><div className="message-heading"><strong>{m.role === 'user' ? 'You' : 'UniAssist'}</strong><time>{m.timestamp}</time></div><div className={`message-text ${m.error ? 'message-error' : ''}`}>{m.text}</div>{m.response && <ResponseDetails data={m.response}/>}</div></div>)}{loading && <div className="message assistant"><div className="message-icon assistant"><Bot size={19}/></div><div className="message-body"><div className="message-heading"><strong>UniAssist</strong></div><div className="thinking"><span/><span/><span/> Checking university sources...</div></div></div>}</div>}<div ref={bottom}/></div>
        <div className="composer-wrap"><div className="composer"><textarea aria-label="Ask the university assistant" placeholder="Ask about university policies, attendance, or eligibility..." value={question} rows={2} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(); } }} disabled={loading}/><div className="composer-bottom"><button className={`date-toggle ${showDate ? 'active' : ''}`} onClick={() => setShowDate(!showDate)} title="Specify policy date"><CalendarDays size={16}/> {asOf || 'As-of date'} <ChevronDown size={14}/></button><div className="composer-actions"><span>Enter to send · Shift+Enter for new line</span><button className="send-button" disabled={loading || !question.trim()} onClick={() => void ask()} aria-label="Send message"><Send size={17}/></button></div></div>{showDate && <div className="date-picker"><label>Policy effective on <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)}/></label><button onClick={() => setAsOf('')}>Clear</button></div>}</div><div className="disclaimer"><Info size={13}/> Answers are based on available authorised documents. Verify important academic decisions with your university.</div></div>
      </main>
    </div>
  </div>;
}
function ResponseDetails({ data }: { data: Answer }) {
  const citations = data.citations || [];
  const tools = data.tools_invoked || data.tool_results || [];
  const conflicts = data.conflicts_detected || data.conflicts || [];
  const rules = data.applied_rules || [];
  const [expanded, setExpanded] = useState(false);
  const type = data.answer_type || 'retrieved_fact';
  return <div className="response-details"><div className="answer-meta"><span className={`answer-badge ${type}`}>{type === 'calculated' ? <CheckCircle2 size={13}/> : type === 'conflict_flagged' ? <AlertTriangle size={13}/> : <FileText size={13}/>} {pretty(type)}</span>{typeof data.latency_ms === 'number' && <span><Clock3 size={13}/> {(data.latency_ms / 1000).toFixed(2)}s</span>}{data.as_of_date && <span><CalendarDays size={13}/> {data.as_of_date}</span>}</div>{data.explanation && <p className="explanation">{data.explanation}</p>}{conflicts.length > 0 && <div className="conflict"><AlertTriangle size={17}/><span>Potential policy conflict detected. Review the cited documents before relying on this answer.</span></div>}{citations.length > 0 && <div className="sources"><div className="detail-title"><BookOpen size={16}/> Sources <span>{citations.length}</span></div>{citations.map((c, i) => <div className="source" key={`${c.doc_id || 'doc'}-${i}`}><div className="source-icon"><FileText size={17}/></div><div><strong>{c.title || c.doc_id || 'University document'}</strong><small>{[c.section && `Section ${c.section}`, c.page != null && `Page ${c.page}`, c.version && `v${c.version}`, (c.effective_from || c.effective_date) && `Effective ${c.effective_from || c.effective_date}`].filter(Boolean).join(' · ')}</small></div></div>)}</div>}{(tools.length > 0 || rules.length > 0 || data.trace_id) && <div className="technical"><button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}><CircleHelp size={15}/> How was this answered? <ChevronDown size={15} className={expanded ? 'rotate' : ''}/></button>{expanded && <div className="technical-body">{data.trace_id && <div><strong>Trace ID</strong><code>{data.trace_id}</code></div>}{rules.length > 0 && <div><strong>Applied rules</strong><pre>{JSON.stringify(rules, null, 2)}</pre></div>}{tools.length > 0 && <div><strong>Deterministic tools</strong><pre>{JSON.stringify(tools, null, 2)}</pre></div>}{data.trace_id && <a href={`${API}/audit/${encodeURIComponent(data.trace_id)}`} target="_blank" rel="noreferrer">Open audit trace <ExternalLink size={13}/></a>}</div>}</div>}</div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
