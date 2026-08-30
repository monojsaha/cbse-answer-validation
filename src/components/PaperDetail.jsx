import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Download, List, Loader } from 'lucide-react';
import { papers as papersApi } from '../lib/api';
import { SUBJECT_META } from '../lib/constants';
import QuestionRow from './QuestionRow';

async function downloadPdf(pdfUrl, filename) {
  const token = localStorage.getItem('cbse-token') || '';
  const res = await fetch(`/api/pdf-download?url=${encodeURIComponent(pdfUrl)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server returned ${res.status}`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export default function PaperDetail({ paperId, onBack }) {
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const handleDownload = async (pdfUrl, filename) => {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadPdf(pdfUrl, filename);
    } catch (e) {
      setDownloadError(e.message);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    papersApi.get(paperId).then(d => { setPaper(d); setLoading(false); }).catch(() => setLoading(false));
  }, [paperId]);

  if (loading) return <div className="loading">Loading paper&hellip;</div>;
  if (!paper) return <div className="empty-state"><h3>Paper not found</h3></div>;

  const subjectMeta = SUBJECT_META[paper.subject] || {};
  const hasRepeats = (paper.questions || []).some(q => {
    const f1 = q.repeat_flags_1 || [], f2 = q.repeat_flags_2 || [];
    return [...f1, ...f2].some(f => f.admin_verdict === 'confirmed');
  });

  return (
    <div className="paper-detail">
      <button className="back-btn" onClick={onBack}><ArrowLeft size={16} /> Back to Papers</button>

      <div className="paper-detail-header">
        <div>
          <h2 className="paper-detail-title">{subjectMeta.label} &mdash; {paper.academic_session}</h2>
          <div className="flex-row text-sm text-muted" style={{ marginTop: 4 }}>
            <span className="badge badge-primary">{paper.paper_type === 'board' ? 'Board Exam' : 'SQP'}</span>
            <span>Set {paper.set_code}</span>
            {paper.total_marks && <span>{paper.total_marks} marks</span>}
            {paper.duration_minutes && <span>{paper.duration_minutes} min</span>}
            {hasRepeats && <span className="badge badge-danger">Has Repeated Questions</span>}
          </div>
        </div>
        <div className="flex-row">
          {paper.paper_url && (
            <a href={paper.paper_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
              <ExternalLink size={14} /> Question Paper
            </a>
          )}
          {paper.answer_key_url && (
            <button
              className="btn btn-primary btn-sm"
              disabled={downloading}
              onClick={() => handleDownload(
                paper.answer_key_url,
                `${paper.subject}-${paper.academic_session}-set${paper.set_code}-marking-scheme.pdf`
              )}
            >
              {downloading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
              {downloading ? 'Downloading…' : 'Marking Scheme'}
            </button>
          )}
        </div>
      </div>

      {downloadError && (
        <div style={{ padding: '8px 14px', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
          Download failed: {downloadError}
        </div>
      )}

      <div className="flex-row mb-4" style={{ marginTop: 16 }}>
        <span className="flex-row text-sm text-muted"><List size={14} /> {(paper.questions || []).length} questions</span>
        <div className="spacer" />
        <label className="flex-row text-sm" style={{ cursor: 'pointer', gap: 6 }}>
          <input type="checkbox" checked={showAnswer} onChange={e => setShowAnswer(e.target.checked)} />
          Show answer keys
        </label>
      </div>

      {(paper.questions || []).length === 0 ? (
        <div className="empty-state">
          <h3>No questions added yet</h3>
          <p>Questions for this paper have not been seeded. Use the links above to view the official PDF.</p>
        </div>
      ) : (
        <div className="question-list">
          {(paper.questions || []).map(q => (
            <QuestionRow key={q.id} question={q} showAnswer={showAnswer} />
          ))}
        </div>
      )}
    </div>
  );
}
