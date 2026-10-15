import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, CalendarDays, Check, CheckCheck, ChevronDown,
  CircleHelp, Clock3, LayoutDashboard, ListTodo, LogOut, Menu, Plus,
  Search, Settings2, ShieldCheck, Sparkles, Trash2, X
} from 'lucide-react';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const SESSION_KEY = 'clock-it-session';
const TASKS_KEY = 'clock-it-tasks';
const STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' }
];
const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];
const EMPTY_TASK = { title: '', description: '', status: 'todo', priority: 'medium', dueDate: '' };

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.');
  return data;
}

function getSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || localStorage.getItem('taskflow-session') || 'null');
  } catch {
    return null;
  }
}

function getSavedTasks() {
  try {
    const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
    return Array.isArray(tasks) ? tasks : [];
  } catch {
    return [];
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function taskDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
}

function dateLabel(value) {
  if (!value) return 'No due date';
  const date = taskDate(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(task) {
  if (!task.dueDate || task.status === 'completed') return false;
  const due = taskDate(task.dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';
}

function Brand({ compact = false }) {
  return (
    <div className={`brand${compact ? ' brand-compact' : ''}`}>
      <span className="brand-icon"><Clock3 size={20} strokeWidth={2.4} /></span>
      <span>clock<span className="brand-light">it</span></span>
    </div>
  );
}

function AuthScreen({ onAuth, onLocalWorkspace }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await request(`/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        body: JSON.stringify(form)
      });
      onAuth(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-art">
        <Brand />
        <div className="art-copy">
          <span className="eyebrow"><Sparkles size={14} /> MAKE TIME FOR WHAT MATTERS</span>
          <h1>Own your day.<br /><em>One task at a time.</em></h1>
          <p>A little structure goes a long way. Give your to-dos a home and make room for your best work.</p>
          <div className="art-card">
            <div className="art-card-top"><span className="mini-dot" /> A GOOD DAY, IN MOTION <Clock3 size={15} /></div>
            <div className="art-line done"><span><Check size={13} /></span> Get the important things done</div>
            <div className="art-line"><span /> Make progress that feels good</div>
            <div className="art-line"><span /> Still have time for you</div>
            <div className="art-progress"><i /></div>
          </div>
        </div>
        <div className="art-footer">Your time is yours. Make it count.</div>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-welcome"><span className="welcome-icon"><ShieldCheck size={18} /></span><span>YOUR PERSONAL WORKSPACE</span></div>
          <h2>{mode === 'login' ? 'Welcome to Clock It' : 'Create your account'}</h2>
          <p className="muted">{mode === 'login' ? 'Start planning your day, your way.' : 'A fresh start is just a minute away.'}</p>
          <button className="primary-btn local-start" onClick={onLocalWorkspace}>
            <Sparkles size={17} /> Start a free local workspace <ArrowRight size={17} />
          </button>
          <div className="auth-divider"><span>OR USE AN ACCOUNT</span></div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && (
              <label>Full name<input required minLength="2" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Your name" autoComplete="name" /></label>
            )}
            <label>Email address<input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" autoComplete="email" /></label>
            <label>Password<input required minLength={mode === 'register' ? 8 : undefined} type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
            {error && <div className="error-box">{error}</div>}
            <button className="secondary-btn full-btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in with an account' : 'Create account'}<ArrowRight size={16} /></button>
          </form>
          <p className="switch-auth">{mode === 'login' ? "Don't have an account?" : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create one' : 'Sign in'}</button></p>
          <div className="auth-note"><ShieldCheck size={15} /> Local tasks stay in this browser. No setup needed.</div>
        </div>
        <span className="auth-copyright">© 2026 Clock It · Make every minute count</span>
      </section>
    </main>
  );
}

function TaskModal({ task, onClose, onSave, saving }) {
  const [form, setForm] = useState(() => task
    ? { ...EMPTY_TASK, ...task, dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '' }
    : EMPTY_TASK);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Give your task a title first.');
      return;
    }
    try {
      await onSave({ ...form, title: form.title.trim(), dueDate: form.dueDate || null });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="modal-head">
          <div><span className="eyebrow">MAKE IT HAPPEN</span><h2 id="task-modal-title">{task ? 'Edit task' : 'Add a new task'}</h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <form onSubmit={submit} className="task-form">
          <label>Task title <span className="required">*</span><input autoFocus required maxLength="140" placeholder="e.g. Finish the project report" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
          <label>Description <span className="optional">OPTIONAL</span><textarea rows="3" maxLength="2000" placeholder="Add a few details to help you get started…" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
          <div className="form-grid">
            <label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
            <label>Priority<select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}>{PRIORITIES.map(priority => <option key={priority.value} value={priority.value}>{priority.label}</option>)}</select></label>
          </div>
          <label>Due date <span className="optional">OPTIONAL</span><input type="date" value={form.dueDate || ''} onChange={event => setForm({ ...form, dueDate: event.target.value })} /></label>
          {error && <div className="error-box">{error}</div>}
          <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : task ? 'Save changes' : 'Add task'}<ArrowRight size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(getSavedSession);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState('all');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const token = session?.token;
  const user = session?.user;
  const localMode = session?.local === true;

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('taskflow-session');
    setSession(null);
    setTasks([]);
  }, []);

  const refresh = useCallback(async () => {
    if (localMode) {
      setTasks(getSavedTasks());
      setLoading(false);
      return;
    }
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await request('/api/tasks', { token });
      setTasks(data.tasks);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [localMode, token]);

  useEffect(() => {
    if (session?.token || localMode) refresh();
  }, [session?.token, localMode, refresh]);

  function storeSession(data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    localStorage.removeItem('taskflow-session');
    setSession(data);
  }

  function startLocalWorkspace() {
    storeSession({ local: true, user: { name: 'Your workspace', email: 'Saved in this browser' } });
  }

  const counts = useMemo(() => ({
    all: tasks.length,
    todo: tasks.filter(task => task.status === 'todo').length,
    progress: tasks.filter(task => task.status === 'in-progress').length,
    completed: tasks.filter(task => task.status === 'completed').length,
    overdue: tasks.filter(isOverdue).length
  }), [tasks]);

  const filtered = useMemo(() => tasks.filter(task => {
    const query = search.toLowerCase();
    const matchesSearch = !query || task.title.toLowerCase().includes(query) || (task.description || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const today = new Date();
    const due = task.dueDate ? taskDate(task.dueDate) : null;
    const matchesView = view === 'all'
      || (view === 'today' && due && due.getFullYear() === today.getFullYear() && due.getMonth() === today.getMonth() && due.getDate() === today.getDate() && task.status !== 'completed')
      || (view === 'overdue' && isOverdue(task))
      || (view === 'completed' && task.status === 'completed');
    return matchesSearch && matchesStatus && matchesView;
  }).sort((a, b) => (a.status === 'completed') - (b.status === 'completed')
    || (a.dueDate ? taskDate(a.dueDate).getTime() : Infinity) - (b.dueDate ? taskDate(b.dueDate).getTime() : Infinity)), [tasks, search, statusFilter, view]);

  function persistLocalTasks(nextTasks) {
    if (localMode) localStorage.setItem(TASKS_KEY, JSON.stringify(nextTasks));
    setTasks(nextTasks);
  }

  async function saveTask(payload) {
    setSaving(true);
    try {
      if (localMode) {
        const now = new Date().toISOString();
        const saved = modal?.task
          ? { ...modal.task, ...payload, updatedAt: now }
          : { ...payload, _id: makeId(), createdAt: now, updatedAt: now };
        const nextTasks = modal?.task
          ? tasks.map(task => task._id === saved._id ? saved : task)
          : [saved, ...tasks];
        persistLocalTasks(nextTasks);
      } else if (modal?.task) {
        const { task } = await request(`/api/tasks/${modal.task._id}`, { token, method: 'PATCH', body: JSON.stringify(payload) });
        setTasks(oldTasks => oldTasks.map(oldTask => oldTask._id === task._id ? task : oldTask));
      } else {
        const { task } = await request('/api/tasks', { token, method: 'POST', body: JSON.stringify(payload) });
        setTasks(oldTasks => [task, ...oldTasks]);
      }
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(task, status) {
    try {
      if (localMode) {
        persistLocalTasks(tasks.map(item => item._id === task._id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
      } else {
        const { task: updated } = await request(`/api/tasks/${task._id}`, { token, method: 'PATCH', body: JSON.stringify({ status }) });
        setTasks(oldTasks => oldTasks.map(item => item._id === updated._id ? updated : item));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeTask(task) {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    setDeleting(task._id);
    try {
      if (localMode) {
        persistLocalTasks(tasks.filter(item => item._id !== task._id));
      } else {
        await request(`/api/tasks/${task._id}`, { token, method: 'DELETE' });
        setTasks(oldTasks => oldTasks.filter(item => item._id !== task._id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting('');
    }
  }

  if ((!session?.token && !localMode) || !user) {
    return <AuthScreen onAuth={storeSession} onLocalWorkspace={startLocalWorkspace} />;
  }

  const pageTitle = view === 'today' ? 'Today' : view === 'overdue' ? 'Overdue tasks' : view === 'completed' ? 'Completed tasks' : 'All tasks';
  const progress = counts.all ? Math.round((counts.completed / counts.all) * 100) : 0;

  return (
    <div className="app-shell">
      <aside className={`sidebar${mobileNav ? ' sidebar-open' : ''}`}>
        <Brand />
        <div className="workspace-label">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Task views">
          <button className={view === 'all' ? 'active' : ''} onClick={() => { setView('all'); setMobileNav(false); }}><LayoutDashboard size={18} /> Overview</button>
          <button className={view === 'today' ? 'active' : ''} onClick={() => { setView('today'); setMobileNav(false); }}><CalendarDays size={18} /> Today <span className="nav-count">{tasks.filter(task => task.dueDate && taskDate(task.dueDate).toDateString() === new Date().toDateString() && task.status !== 'completed').length || ''}</span></button>
          <button className={view === 'overdue' ? 'active' : ''} onClick={() => { setView('overdue'); setMobileNav(false); }}><Clock3 size={18} /> Overdue <span className="nav-count alert-count">{counts.overdue || ''}</span></button>
          <button className={view === 'completed' ? 'active' : ''} onClick={() => { setView('completed'); setMobileNav(false); }}><CheckCheck size={18} /> Completed</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><span className="tip-icon"><Sparkles size={16} /></span><strong>Make it count.</strong><p>Small steps turn into big things. Focus on what matters now.</p></div>
          <div className="profile-row">
            <div className="avatar">{initials(user.name)}</div>
            <div className="profile-meta"><strong>{user.name}</strong><span>{localMode ? 'Local workspace' : user.email}</span></div>
            <button className="profile-logout icon-btn" title="Sign out" aria-label="Sign out" onClick={logout}><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      {mobileNav && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-btn" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={20} /></button>
            <span className="breadcrumb">Workspace <span>/</span> <strong>{pageTitle}</strong></span>
          </div>
          <div className="topbar-right">
            {localMode && <span className="local-chip"><span /> SAVED ON THIS DEVICE</span>}
            <span className="date-chip"><CalendarDays size={15} />{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <div className="top-avatar" title={user.name}>{initials(user.name)}</div>
          </div>
        </header>
        <div className="page-content">
          <section className="welcome-row">
            <div><div className="eyebrow"><span className="live-dot" /> YOUR TIME, WELL SPENT</div><h1>{localMode ? 'Hey there' : `Hey, ${user.name.split(' ')[0]}`}<span className="wave">✳</span></h1><p className="muted">A little focus goes a long way. What matters today?</p></div>
            <button className="primary-btn add-task-btn" onClick={() => setModal({ task: null })}><Plus size={18} /> New task</button>
          </section>

          <section className="focus-banner">
            <div className="focus-copy"><span className="focus-kicker"><Clock3 size={14} /> YOUR DAY, IN FOCUS</span><h2>Make every minute<br />move you forward.</h2><p>You’ve got this. Pick a priority and get into your flow.</p></div>
            <div className="focus-progress"><div className="progress-ring" style={{ '--progress': `${progress}%` }}><span>{progress}<small>%</small></span></div><div><strong>{counts.completed} of {counts.all} done</strong><span>Every bit of progress counts.</span></div></div>
            <div className="focus-decoration"><Clock3 size={124} strokeWidth={0.7} /></div>
          </section>

          <section className="stats-grid" aria-label="Task summary">
            <div className="stat-card"><div className="stat-top"><span className="stat-icon indigo"><ListTodo size={18} /></span><span className="stat-caption">ON YOUR LIST</span></div><div className="stat-value">{counts.all}<span className="stat-small"> tasks</span></div><div className="stat-foot">The big picture</div></div>
            <div className="stat-card"><div className="stat-top"><span className="stat-icon amber"><Activity size={18} /></span><span className="stat-caption">IN MOTION</span></div><div className="stat-value">{counts.progress}<span className="stat-small"> active</span></div><div className="stat-foot">Keep your momentum</div></div>
            <div className="stat-card"><div className="stat-top"><span className="stat-icon green"><CheckCheck size={18} /></span><span className="stat-caption">MADE IT HAPPEN</span></div><div className="stat-value">{counts.completed}<span className="stat-small"> done</span></div><div className="stat-foot">That’s worth celebrating</div></div>
            <div className="stat-card"><div className="stat-top"><span className="stat-icon rose"><Clock3 size={18} /></span><span className="stat-caption">PAST DUE</span></div><div className="stat-value">{counts.overdue}<span className="stat-small"> overdue</span></div><div className="stat-foot">A chance to reset</div></div>
          </section>

          <section className="task-section">
            <div className="section-heading">
              <div><div className="section-title-row"><h2>{pageTitle}</h2><span className="task-total">{filtered.length}</span></div><p className="muted">One thing at a time. You’re right where you need to be.</p></div>
              <button className="text-btn" onClick={() => { setView('all'); setStatusFilter('all'); setSearch(''); }}>View all <ArrowRight size={15} /></button>
            </div>
            <div className="task-toolbar">
              <div className="search-box"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a task…" aria-label="Search tasks" />{search && <button onClick={() => setSearch('')} className="clear-search" aria-label="Clear search"><X size={14} /></button>}</div>
              <div className="filter-wrap"><Settings2 size={16} /><select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select><ChevronDown size={14} className="filter-chevron" /></div>
            </div>
            {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
            {loading ? <div className="loading-state"><span className="spinner" /><p>Loading your tasks…</p></div> : filtered.length === 0 ? (
              <div className="empty-state"><div className="empty-illustration"><ListTodo size={30} /><span><Sparkles size={14} /></span></div><h3>{search || statusFilter !== 'all' || view !== 'all' ? 'Nothing on the clock' : 'A fresh start'}</h3><p>{search || statusFilter !== 'all' || view !== 'all' ? 'Try another search or clear your filters.' : 'Add the first thing you want to make time for.'}</p>{search || statusFilter !== 'all' || view !== 'all' ? <button className="secondary-btn" onClick={() => { setSearch(''); setStatusFilter('all'); setView('all'); }}>Clear filters</button> : <button className="primary-btn" onClick={() => setModal({ task: null })}><Plus size={17} /> Create your first task</button>}</div>
            ) : (
              <div className="task-list">{filtered.map(task => (
                <article className={`task-card${task.status === 'completed' ? ' task-completed' : ''}`} key={task._id}>
                  <button className={`task-check${task.status === 'completed' ? ' checked' : ''}`} aria-label={task.status === 'completed' ? 'Mark as to do' : 'Mark as completed'} onClick={() => updateStatus(task, task.status === 'completed' ? 'todo' : 'completed')}>{task.status === 'completed' && <Check size={14} />}</button>
                  <div className="task-main">
                    <div className="task-title-row"><h3>{task.title}</h3><span className={`priority priority-${task.priority}`}><i />{task.priority}</span></div>
                    {task.description && <p className="task-description">{task.description}</p>}
                    <div className="task-meta"><span className={`status-pill status-${task.status}`}><i />{STATUSES.find(status => status.value === task.status)?.label}</span><span className={`due-date${isOverdue(task) ? ' overdue-date' : ''}`}><CalendarDays size={14} />{isOverdue(task) ? 'Overdue · ' : ''}{dateLabel(task.dueDate)}</span></div>
                  </div>
                  <div className="task-actions"><button className="icon-btn" title="Edit task" aria-label="Edit task" onClick={() => setModal({ task })}><Settings2 size={17} /></button><button className="icon-btn delete-action" title="Delete task" aria-label="Delete task" disabled={deleting === task._id} onClick={() => removeTask(task)}>{deleting === task._id ? <span className="tiny-spinner" /> : <Trash2 size={17} />}</button></div>
                </article>
              ))}</div>
            )}
          </section>
          <footer className="page-footer"><span><Sparkles size={14} /> One thing at a time. You’ve got this.</span><span><CircleHelp size={14} /> Clock It workspace</span></footer>
        </div>
      </main>
      {modal && <TaskModal task={modal.task} onClose={() => setModal(null)} onSave={saveTask} saving={saving} />}
    </div>
  );
}

export default App;
