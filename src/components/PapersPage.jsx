import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { papers } from '../lib/api';
import { SUBJECT_META } from '../lib/constants';

const YEARS = [2024, 2023, 2022, 2020];
const PAPER_TYPES = [{ v: 'board', l: 'Board Exam' }, { v: 'sqp', l: 'Sample QP (SQP)' }];
const SETS = ['1', '2', '3', 'Term1', 'Term2'];

export default function PapersPage({ initialSubject, onOpenPaper }) {
  const [subject, setSubject] = useState(initialSubject || '');
  const [year, setYear] = useState('');
  const [type, setType] = useState('');
  const [set, setSet] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await papers.list({ subject, year, type, set });
      setList(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const clear = () => { setSubject(''); setYear(''); setType(''); setSet(''); };

  return (
    <div>
      <div className="page-header">
        <h2>Question Papers</h2>
        <p>Filter by subject, year, paper type or set to find specific papers.</p>
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
          <label className="form-label">Year</label>
          <select className="form-input form-select" value={year} onChange={e => setYear(e.target.value)}>
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-input form-select" value={type} onChange={e => setType(e.target.value)}>
            <option value="">All Types</option>
            {PAPER_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Set</label>
          <select className="form-input form-select" value={set} onChange={e => setSet(e.target.value)}>
            <option value="">All Sets</option>
            {SETS.map(s => <option key={s} value={s}>Set {s}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={load}><Search size={15} /> Search</button>
        <button className="btn btn-secondary" onClick={() => { clear(); setTimeout(load, 0); }}><X size={15} /> Clear</button>
      </div>

      {loading && <div className="loading">Loading papers&hellip;</div>}
      {error && <p className="form-error">{error}</p>}
      {!loading && list.length === 0 && (
        <div className="empty-state">
          <h3>No papers found</h3>
          <p>Try different filters, or ask an admin to add papers.</p>
        </div>
      )}
      <div className="card-grid">
        {list.map(p => (
          <PaperCard key={p.id} paper={p} onClick={() => onOpenPaper(p.id)} />
        ))}
      </div>
    </div>
  );
}

function PaperCard({ paper, onClick }) {
  const subjectKey = paper.subject;
  return (
    <div className={`paper-card subject-${subjectKey}`} onClick={onClick}>
      <div className="paper-card-header">
        <div>
          <div className="paper-card-title">{SUBJECT_META[subjectKey]?.label || paper.subject}</div>
          <div className="paper-card-meta">{paper.academic_session} &middot; {paper.exam_year}</div>
        </div>
      </div>
      <div className="paper-card-badges">
        <span className="badge badge-primary">{paper.paper_type === 'board' ? 'Board Exam' : 'SQP'}</span>
        <span className="badge badge-neutral">Set {paper.set_code}</span>
        {paper.total_marks && <span className="badge badge-neutral">{paper.total_marks} marks</span>}
        {paper.duration_minutes && <span className="badge badge-neutral">{paper.duration_minutes} min</span>}
      </div>
    </div>
  );
}

