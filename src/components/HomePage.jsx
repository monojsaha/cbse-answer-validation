import { FlaskConical, Calculator, Monitor, ChevronRight, BookOpen, BarChart2, RefreshCw, Download, Search, Shield } from 'lucide-react';
import { SUBJECT_META } from '../lib/constants';

const GUIDE_STEPS = [
  {
    icon: Search,
    title: 'Browse Papers',
    color: '#2563eb',
    steps: [
      'Click any subject card or go to the Papers tab.',
      'Filter by Subject, Year, Type (Board / SQP) and Set.',
      'Click a paper card to open it.',
    ],
  },
  {
    icon: BookOpen,
    title: 'Read Questions',
    color: '#7c3aed',
    steps: [
      'Questions are listed on-screen with marks, type and topic tags.',
      'Tick "Show answer keys" to reveal model answers inline.',
      'Click "Question Paper" to open the original PDF on the CBSE website.',
    ],
  },
  {
    icon: Download,
    title: 'Download Marking Scheme',
    color: '#059669',
    steps: [
      'Marking schemes are available for SQP (Sample Question Paper) entries.',
      'Click the blue "Marking Scheme" button — the PDF saves to your device.',
      'Board exam marking schemes are not publicly hosted by CBSE.',
    ],
  },
  {
    icon: BarChart2,
    title: 'Topic Distribution',
    color: '#d97706',
    steps: [
      'Go to the Topic Distribution tab and choose a subject.',
      'The heatmap shows official CBSE marks weightage per chapter.',
      'Year columns fill in as questions are tagged by the admin.',
    ],
  },
  {
    icon: RefreshCw,
    title: 'Repeated Questions',
    color: '#dc2626',
    steps: [
      'Go to the Repeated Questions tab.',
      'Filter by subject to see questions that appeared in multiple years.',
      'Similarity score ≥ 80% is required; admin confirms each match.',
    ],
  },
  {
    icon: Shield,
    title: 'Admin Panel',
    color: '#6366f1',
    steps: [
      'Only visible to admin accounts.',
      'Add / edit papers, tag questions with chapters, and manage topics.',
      'Run auto-detect to find repeated questions across all papers.',
    ],
  },
];

const SUBJECTS = [
  { key: 'physics', icon: FlaskConical },
  { key: 'chemistry', icon: FlaskConical },
  { key: 'mathematics', icon: Calculator },
  { key: 'computer_science', icon: Monitor }
];

export default function HomePage({ onNavigate }) {
  return (
    <div>
      <div className="home-header">
        <h2>CBSE Class 12 Science &mdash; Question Paper Portal</h2>
        <p>Browse official past papers, answer keys, topic distribution and more for Physics, Chemistry, Mathematics &amp; Computer Science.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-val">4</div>
          <div className="stat-card-label">Subjects</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">5</div>
          <div className="stat-card-label">Academic Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">2020&ndash;2024</div>
          <div className="stat-card-label">Years Covered</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-val">Official</div>
          <div className="stat-card-label">CBSE Source Only</div>
        </div>
      </div>

      <div className="card-grid">
        {SUBJECTS.map(({ key, icon: Icon }) => {
          const meta = SUBJECT_META[key];
          return (
            <div
              key={key}
              className={`subject-card subject-${key}`}
              onClick={() => onNavigate('papers', key)}
            >
              <div className="subject-card-code">Code {meta.code}</div>
              <div className="subject-card-icon" style={{ background: 'var(--subj-color)' }}>
                <Icon size={24} />
              </div>
              <div className="subject-card-name">{meta.label}</div>
              <div className="subject-card-meta">Class XII &middot; Science Stream</div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--subj-color)', fontSize: '0.85rem', fontWeight: 500 }}>
                View Papers <ChevronRight size={14} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── User Guide ── */}
      <div style={{ marginTop: 40 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>How to Use This Portal</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginBottom: 20 }}>Follow these steps to get the most out of the CBSE Class 12 Science question paper portal.</p>
        <div className="guide-grid">
          {GUIDE_STEPS.map(({ icon: Icon, title, color, steps }) => (
            <div key={title} className="guide-card">
              <div className="guide-icon" style={{ background: color + '18', color }}>
                <Icon size={20} />
              </div>
              <div className="guide-content">
                <div className="guide-title">{title}</div>
                <ol className="guide-steps">
                  {steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── About ── */}
      <div className="card" style={{ marginTop: 32 }}>
        <div className="card-header">
          <h3 className="card-title">About This Portal</h3>
        </div>
        <ul style={{ listStyle: 'disc', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.9rem', color: 'var(--text-2)' }}>
          <li>All question papers and marking schemes are sourced strictly from official CBSE portals (cbse.gov.in and cbseacademic.nic.in).</li>
          <li>Covers board exam papers (2020, 2022 Term 1, 2022 Term 2, 2023, 2024) and Sample Question Papers (SQPs).</li>
          <li>2021 board exams were fully cancelled by CBSE &mdash; no papers available for that year.</li>
          <li>Topic-wise distribution is based on official CBSE unit-wise syllabus marks weightage.</li>
          <li>Repeated questions are algorithmically detected (&ge;80% text similarity) and admin-verified.</li>
        </ul>
      </div>
    </div>
  );
}

