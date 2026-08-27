import { FlaskConical, Calculator, Monitor, ChevronRight } from 'lucide-react';
import { SUBJECT_META } from '../lib/constants';

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

      <div className="card mt-4" style={{ marginTop: 32 }}>
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

