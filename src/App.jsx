import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Moon, Sun, LogOut, ShieldCheck } from 'lucide-react';
import { auth } from './lib/api';
import { SUBJECT_META } from './lib/constants';
import LoginScreen from './components/LoginScreen';
import HomePage from './components/HomePage';
import PapersPage from './components/PapersPage';
import PaperDetail from './components/PaperDetail';
import TopicHeatmap from './components/TopicHeatmap';
import RepeatsList from './components/RepeatsList';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('home');
  const [dark, setDark] = useState(() => localStorage.getItem('cbse-theme') === 'dark');
  const [selectedPaperId, setSelectedPaperId] = useState(null);
  const [filterSubject, setFilterSubject] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('cbse-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('cbse-token');
    if (!token) { setLoading(false); return; }
    try {
      const data = await auth.verify();
      setUser(data);
    } catch {
      localStorage.removeItem('cbse-token');
    }
    setLoading(false);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleLogin = (userData, token) => {
    localStorage.setItem('cbse-token', token);
    setUser(userData);
    setTab('home');
  };

  const handleLogout = async () => {
    await auth.logout().catch(() => {});
    localStorage.removeItem('cbse-token');
    setUser(null);
  };

  const openPaper = (id) => {
    setSelectedPaperId(id);
    setTab('paper-detail');
  };

  if (loading) return <div className="loading">Loading&hellip;</div>;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'papers', label: 'Papers' },
    { id: 'topics', label: 'Topic Distribution' },
    { id: 'repeats', label: 'Repeated Questions' },
    ...(user.role === 'admin' ? [{ id: 'admin', label: 'Admin' }] : [])
  ];

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar-brand">
          <BookOpen size={22} />
          <span className="brand-label">CBSE Class 12</span>
        </span>
        <nav className="topbar-nav">
          {navItems.map(n => (
            <button
              key={n.id}
              className={`nav-btn ${tab === n.id || (tab === 'paper-detail' && n.id === 'papers') ? 'active' : ''}`}
              onClick={() => { setTab(n.id); setSelectedPaperId(null); }}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setDark(d => !d)} title="Toggle theme">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <span className="text-sm text-muted user-name">{user.displayName}</span>
          {user.role === 'admin' && <ShieldCheck size={16} style={{ color: 'var(--warning)' }} />}
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="main">
        {tab === 'home' && <HomePage onNavigate={(t, subj) => { setFilterSubject(subj || ''); setTab(t); }} />}
        {(tab === 'papers' || tab === 'paper-detail') && !selectedPaperId && (
          <PapersPage initialSubject={filterSubject} onOpenPaper={openPaper} />
        )}
        {tab === 'paper-detail' && selectedPaperId && (
          <PaperDetail paperId={selectedPaperId} onBack={() => { setSelectedPaperId(null); setTab('papers'); }} />
        )}
        {tab === 'topics' && <TopicHeatmap />}
        {tab === 'repeats' && <RepeatsList isAdmin={user.role === 'admin'} />}
        {tab === 'admin' && user.role === 'admin' && <AdminPanel />}
      </main>
    </div>
  );
}
