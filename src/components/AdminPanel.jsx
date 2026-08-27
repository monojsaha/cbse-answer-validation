import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { admin as adminApi, papers as papersApi } from '../lib/api';
import { SUBJECT_META } from '../lib/constants';
import RepeatsList from './RepeatsList';

const SUBJECTS = Object.keys(SUBJECT_META);
const PAPER_TYPES = ['board', 'sqp'];
const SETS = ['1', '2', '3', 'Term1', 'Term2'];
const Q_TYPES = ['mcq', 'short', 'long', 'case_based', 'assertion_reason'];
const SESSIONS = ['2019-20', '2021-22 Term1', '2021-22 Term2', '2022-23', '2023-24'];
const YEARS = [2020, 2022, 2023, 2024];

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('papers');

  return (
    <div>
      <div className="page-header">
        <h2>Admin Panel</h2>
        <p>Manage papers, questions, topics, and repeat flags.</p>
      </div>
      <div className="admin-tabs">
        {['papers', 'questions', 'topics', 'repeats', 'users'].map(t => (
          <button key={t} className={`admin-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {activeTab === 'papers' && <PapersAdmin />}
      {activeTab === 'questions' && <QuestionsAdmin />}
      {activeTab === 'topics' && <TopicsAdmin />}
      {activeTab === 'repeats' && <RepeatsList isAdmin={true} />}
      {activeTab === 'users' && <UsersAdmin />}
    </div>
  );
}

function PapersAdmin() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: 'physics', exam_year: 2024, academic_session: '2023-24',
    paper_type: 'board', set_code: '1', paper_url: '', answer_key_url: '',
    total_marks: 70, duration_minutes: 180
  });

  const load = async () => {
    setLoading(true);
    try { setPapers(await adminApi.getPapers()); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ subject: 'physics', exam_year: 2024, academic_session: '2023-24', paper_type: 'board', set_code: '1', paper_url: '', answer_key_url: '', total_marks: 70, duration_minutes: 180 });
    setShowModal(true);
  };
  const openEdit = (p) => { setEditing(p.id); setForm({ ...p }); setShowModal(true); };
  const save = async () => {
    setSaving(true);
    try {
      await adminApi.upsertPaper(editing ? { id: editing, ...form } : form);
      setShowModal(false);
      load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };
  const del = async (id) => {
    if (!confirm('Delete this paper?')) return;
    await adminApi.deletePaper(id);
    load();
  };

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      <div className="card-header mb-4">
        <h3 className="card-title">Papers ({papers.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Add Paper</button>
      </div>
      {loading ? <div className="loading">Loading&hellip;</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Subject</th><th>Session</th><th>Year</th><th>Type</th><th>Set</th><th>Marks</th><th>Paper URL</th><th></th>
              </tr>
            </thead>
            <tbody>
              {papers.map(p => (
                <tr key={p.id}>
                  <td>{SUBJECT_META[p.subject]?.label}</td>
                  <td>{p.academic_session}</td>
                  <td>{p.exam_year}</td>
                  <td>{p.paper_type}</td>
                  <td>{p.set_code}</td>
                  <td>{p.total_marks}</td>
                  <td>{p.paper_url ? <a href={p.paper_url} target="_blank" rel="noreferrer" className="text-sm" style={{ color: 'var(--primary)' }}>Link</a> : '—'}</td>
                  <td>
                    <div className="flex-row">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Pencil size={13} /></button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(p.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <Modal
          title={editing ? 'Edit Paper' : 'Add Paper'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Subject</label>
            <select className="form-input form-select" value={form.subject} onChange={e => f('subject', e.target.value)}>
              {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_META[s].label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Academic Session</label>
            <select className="form-input form-select" value={form.academic_session} onChange={e => f('academic_session', e.target.value)}>
              {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Exam Year</label>
            <select className="form-input form-select" value={form.exam_year} onChange={e => f('exam_year', parseInt(e.target.value))}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Paper Type</label>
            <select className="form-input form-select" value={form.paper_type} onChange={e => f('paper_type', e.target.value)}>
              {PAPER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Set Code</label>
            <select className="form-input form-select" value={form.set_code} onChange={e => f('set_code', e.target.value)}>
              {SETS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Total Marks</label>
            <input className="form-input" type="number" value={form.total_marks} onChange={e => f('total_marks', parseInt(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Duration (minutes)</label>
            <input className="form-input" type="number" value={form.duration_minutes} onChange={e => f('duration_minutes', parseInt(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Paper URL (official CBSE PDF)</label>
            <input className="form-input" type="url" value={form.paper_url} onChange={e => f('paper_url', e.target.value)} placeholder="https://cbse.gov.in/..." />
          </div>
          <div className="form-group">
            <label className="form-label">Marking Scheme URL</label>
            <input className="form-input" type="url" value={form.answer_key_url} onChange={e => f('answer_key_url', e.target.value)} placeholder="https://cbseacademic.nic.in/..." />
          </div>
        </Modal>
      )}
    </div>
  );
}

function QuestionsAdmin() {
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState('');
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ question_number: '', question_text: '', marks: 1, question_type: 'short', topic_id: '', answer_text: '' });

  useEffect(() => {
    adminApi.getPapers().then(setPapers).catch(() => {});
    adminApi.getTopics().then(setTopics).catch(() => {});
  }, []);

  const loadQuestions = async (pid) => {
    if (!pid) { setQuestions([]); return; }
    try {
      const d = await papersApi.get(pid);
      setQuestions(d.questions || []);
    } catch {}
  };

  const openAdd = () => {
    setEditingQ(null);
    setForm({ question_number: '', question_text: '', marks: 1, question_type: 'short', topic_id: '', answer_text: '' });
    setShowModal(true);
  };
  const openEdit = (q) => {
    setEditingQ(q.id);
    setForm({ question_number: q.question_number, question_text: q.question_text || '', marks: q.marks || 1, question_type: q.question_type || 'short', topic_id: q.topic_id || '', answer_text: q.answer_text || '' });
    setShowModal(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      if (editingQ) await adminApi.updateQuestion(editingQ, form);
      else await adminApi.addQuestion({ ...form, paper_id: selectedPaper });
      setShowModal(false);
      loadQuestions(selectedPaper);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };
  const del = async (id) => {
    if (!confirm('Delete question?')) return;
    await adminApi.deleteQuestion(id);
    loadQuestions(selectedPaper);
  };
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      <div className="form-group mb-4" style={{ maxWidth: 400, marginBottom: 16 }}>
        <label className="form-label">Select Paper</label>
        <select className="form-input form-select" value={selectedPaper} onChange={e => { setSelectedPaper(e.target.value); loadQuestions(e.target.value); }}>
          <option value="">-- Choose a paper --</option>
          {papers.map(p => (
            <option key={p.id} value={p.id}>
              {SUBJECT_META[p.subject]?.label} &middot; {p.academic_session} &middot; Set {p.set_code}
            </option>
          ))}
        </select>
      </div>
      {selectedPaper && (
        <>
          <div className="card-header mb-4">
            <h3 className="card-title">Questions ({questions.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Add Question</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr><th>Q#</th><th>Type</th><th>Marks</th><th>Topic</th><th>Question</th><th></th></tr>
              </thead>
              <tbody>
                {questions.map(q => (
                  <tr key={q.id}>
                    <td>{q.question_number}</td>
                    <td>{q.question_type}</td>
                    <td>{q.marks}</td>
                    <td>{q.topics?.chapter_name || '—'}</td>
                    <td style={{ maxWidth: 300 }}>{q.question_text?.substring(0, 80)}{q.question_text?.length > 80 ? '…' : ''}</td>
                    <td>
                      <div className="flex-row">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(q)}><Pencil size={13} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(q.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {showModal && (
        <Modal
          title={editingQ ? 'Edit Question' : 'Add Question'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Question Number</label>
            <input className="form-input" value={form.question_number} onChange={e => f('question_number', e.target.value)} placeholder="1, 2a, 15(b)..." />
          </div>
          <div className="form-group">
            <label className="form-label">Question Type</label>
            <select className="form-input form-select" value={form.question_type} onChange={e => f('question_type', e.target.value)}>
              {Q_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Marks</label>
            <input className="form-input" type="number" value={form.marks} onChange={e => f('marks', parseInt(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Topic</label>
            <select className="form-input form-select" value={form.topic_id} onChange={e => f('topic_id', e.target.value)}>
              <option value="">-- No topic --</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.chapter_name} ({t.subject})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Question Text</label>
            <textarea className="form-input" rows={4} value={form.question_text} onChange={e => f('question_text', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Answer / Key Points</label>
            <textarea className="form-input" rows={3} value={form.answer_text} onChange={e => f('answer_text', e.target.value)} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function TopicsAdmin() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: 'physics', unit_name: '', chapter_name: '', official_marks_weightage: 0, academic_session: '2023-24' });

  const load = async () => {
    setLoading(true);
    try { setTopics(await adminApi.getTopics()); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ subject: 'physics', unit_name: '', chapter_name: '', official_marks_weightage: 0, academic_session: '2023-24' });
    setShowModal(true);
  };
  const openEdit = (t) => { setEditing(t.id); setForm({ ...t }); setShowModal(true); };
  const save = async () => {
    setSaving(true);
    try {
      await adminApi.upsertTopic(editing ? { id: editing, ...form } : form);
      setShowModal(false);
      load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      <div className="card-header mb-4">
        <h3 className="card-title">Topics ({topics.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Add Topic</button>
      </div>
      {loading ? <div className="loading">Loading&hellip;</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr><th>Subject</th><th>Unit</th><th>Chapter</th><th>Weightage</th><th>Session</th><th></th></tr>
            </thead>
            <tbody>
              {topics.map(t => (
                <tr key={t.id}>
                  <td>{SUBJECT_META[t.subject]?.label}</td>
                  <td>{t.unit_name}</td>
                  <td>{t.chapter_name}</td>
                  <td>{t.official_marks_weightage}</td>
                  <td>{t.academic_session}</td>
                  <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}><Pencil size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <Modal
          title={editing ? 'Edit Topic' : 'Add Topic'}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Subject</label>
            <select className="form-input form-select" value={form.subject} onChange={e => f('subject', e.target.value)}>
              {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_META[s].label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Unit Name</label>
            <input className="form-input" value={form.unit_name} onChange={e => f('unit_name', e.target.value)} placeholder="e.g. Electrostatics" />
          </div>
          <div className="form-group">
            <label className="form-label">Chapter Name</label>
            <input className="form-input" value={form.chapter_name} onChange={e => f('chapter_name', e.target.value)} placeholder="e.g. Electric Charges and Fields" />
          </div>
          <div className="form-group">
            <label className="form-label">Official Marks Weightage</label>
            <input className="form-input" type="number" value={form.official_marks_weightage} onChange={e => f('official_marks_weightage', parseInt(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Academic Session</label>
            <select className="form-input form-select" value={form.academic_session} onChange={e => f('academic_session', e.target.value)}>
              {['2019-20', '2021-22', '2022-23', '2023-24'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}

function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="card-header mb-4"><h3 className="card-title">Users ({users.length})</h3></div>
      {loading ? <div className="loading">Loading&hellip;</div> : (
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.display_name}</td>
                <td>{u.email}</td>
                <td><span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-primary'}`}>{u.role}</span></td>
                <td className="text-sm text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

