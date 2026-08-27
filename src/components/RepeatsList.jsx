import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { repeats as repeatsApi, admin as adminApi } from '../lib/api';
import { SUBJECT_META } from '../lib/constants';

const VERDICTS = [
  { v: '', l: 'All' },
  { v: 'pending', l: 'Pending Review' },
  { v: 'confirmed', l: 'Confirmed' },
  { v: 'dismissed', l: 'Dismissed' }
];

export default function RepeatsList({ isAdmin }) {
  const [subject, setSubject] = useState('');
  const [verdict, setVerdict] = useState('confirmed');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await repeatsApi.list(subject, verdict);
      setList(d);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateVerdict = async (id, v) => {
    await adminApi.updateRepeat(id, v);
    setList(l => l.map(r => r.id === id ? { ...r, admin_verdict: v } : r));
  };

  const detect = async () => {
    setDetecting(true);
    try {
      const { newFlags } = await adminApi.detectRepeats(subject || undefined);
      alert(`Detection complete. ${newFlags} new repeat flags found.`);
      load();
    } catch (e) {
      alert('Detection failed: ' + e.message);
    }
    setDetecting(false);
  };

  const verdictIcon = (v) => {
    if (v === 'confirmed') return <span className="badge badge-danger"><CheckCircle size={12} /> Confirmed</span>;
    if (v === 'dismissed') return <span className="badge badge-neutral"><XCircle size={12} /> Dismissed</span>;
    return <span className="badge badge-warning"><Clock size={12} /> Pending</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h2>Repeated Questions</h2>
        <p>Questions that appear (with &ge;80% similarity) across different exam years. Admin-verified matches are highlighted in papers.</p>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label className="form-label">Subject</label>
          <select className="form-input form-select" value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {Object.entries(SUBJECT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-input form-select" value={verdict} onChange={e => setVerdict(e.target.value)}>
            {VERDICTS.map(v => <option key={v.v} value={v.v}>{v.l}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={load}>Search</button>
        {isAdmin && (
          <button className="btn btn-secondary" onClick={detect} disabled={detecting}>
            {detecting ? 'Detecting…' : 'Run Auto-Detect'}
          </button>
        )}
      </div>

      {loading && <div className="loading">Loading&hellip;</div>}
      {!loading && list.length === 0 && (
        <div className="empty-state">
          <h3>No {verdict === 'confirmed' ? 'confirmed ' : verdict === 'pending' ? 'pending ' : verdict === 'dismissed' ? 'dismissed ' : ''}repeated questions found</h3>
          <p>
            {isAdmin
              ? 'Add question text via Admin Panel → Questions, then click "Run Auto-Detect" above to scan for similar questions across years.'
              : 'No confirmed repeated questions yet. They will appear here once admin verifies similarity matches.'}
          </p>
        </div>
      )}

      {list.map(flag => (
        <div key={flag.id} className="repeat-pair">
          <div className="repeat-pair-header">
            <div className="flex-row">
              {verdictIcon(flag.admin_verdict)}
              <span className="text-sm text-muted">Similarity: {Math.round(flag.similarity_score * 100)}%</span>
            </div>
            {isAdmin && flag.admin_verdict === 'pending' && (
              <div className="repeat-verdict">
                <button className="btn btn-sm btn-primary" onClick={() => updateVerdict(flag.id, 'confirmed')}>
                  <CheckCircle size={13} /> Confirm
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => updateVerdict(flag.id, 'dismissed')}>
                  <XCircle size={13} /> Dismiss
                </button>
              </div>
            )}
          </div>
          <div className="repeat-pair-questions">
            {[flag.q1, flag.q2].map((q, i) => q && (
              <div key={i} className="repeat-q-box">
                <div className="repeat-q-meta">
                  {SUBJECT_META[q.papers?.subject]?.label} &middot; {q.papers?.academic_session} &middot; Set {q.papers?.set_code} &middot; Q{q.question_number}
                  {q.topics && ` · ${q.topics.chapter_name}`}
                </div>
                <p>{q.question_text || <em>No text extracted</em>}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

