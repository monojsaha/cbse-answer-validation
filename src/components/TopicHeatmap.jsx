import { useState, useEffect } from 'react';
import { topics as topicsApi } from '../lib/api';
import { SUBJECT_META } from '../lib/constants';

const ALL_YEARS = [2020, 2022, 2023, 2024];

export default function TopicHeatmap() {
  const [subject, setSubject] = useState('physics');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await topicsApi.distribution(subject);
      setData(d);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [subject]);

  function heatClass(marks) {
    if (!marks) return 'heat-0';
    if (marks <= 2) return 'heat-1';
    if (marks <= 5) return 'heat-2';
    if (marks <= 8) return 'heat-3';
    if (marks <= 12) return 'heat-4';
    return 'heat-5';
  }

  function officialHeatClass(w) {
    if (!w) return 'heat-0';
    if (w <= 3) return 'heat-1';
    if (w <= 6) return 'heat-2';
    if (w <= 9) return 'heat-3';
    if (w <= 12) return 'heat-4';
    return 'heat-5';
  }

  const hasTaggedData = data.some(r => Object.keys(r.years || {}).length > 0);

  return (
    <div>
      <div className="page-header">
        <h2>Topic-wise Marks Distribution</h2>
        <p>Official CBSE syllabus weightage per chapter. Actual marks from tagged papers appear in year columns once questions are added.</p>
      </div>

      <div className="filter-bar" style={{ marginBottom: 24 }}>
        <div className="form-group">
          <label className="form-label">Subject</label>
          <select className="form-input form-select" value={subject} onChange={e => setSubject(e.target.value)}>
            {Object.entries(SUBJECT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={load}>Refresh</button>
      </div>

      {loading && <div className="loading">Loading distribution&hellip;</div>}

      {!loading && data.length === 0 && (
        <div className="empty-state">
          <h3>No topic data for this subject</h3>
          <p>Admin can add topics via the Admin Panel.</p>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          {!hasTaggedData && (
            <div style={{ padding: '10px 16px', background: 'var(--warning-light)', color: 'var(--warning)', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
              Showing official CBSE syllabus weightage. Year-wise columns will fill in once questions are tagged.
            </div>
          )}
          <table className="heatmap-table">
            <thead>
              <tr>
                <th>Unit / Chapter</th>
                <th style={{ textAlign: 'center' }}>Official Wt.</th>
                {ALL_YEARS.map(y => <th key={y} style={{ textAlign: 'center' }}>{y}</th>)}
                {hasTaggedData && <th style={{ textAlign: 'center' }}>Tagged Total</th>}
              </tr>
            </thead>
            <tbody>
              {data.sort((a, b) => a.unit_name.localeCompare(b.unit_name)).map((row, i) => {
                const total = ALL_YEARS.reduce((s, y) => s + (row.years[y] || 0), 0);
                return (
                  <tr key={i}>
                    <td className="chapter-cell">
                      <div className="unit-label">{row.unit_name}</div>
                      {row.chapter_name !== row.unit_name && <div className="chapter-label">{row.chapter_name}</div>}
                    </td>
                    <td className={`heatmap-cell ${officialHeatClass(row.official_marks_weightage)}`}>
                      {row.official_marks_weightage ?? '—'}
                    </td>
                    {ALL_YEARS.map(y => (
                      <td key={y} className={`heatmap-cell ${heatClass(row.years[y])}`}>
                        {row.years[y] || '—'}
                      </td>
                    ))}
                    {hasTaggedData && <td className="heatmap-cell heat-4">{total || '—'}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="card mt-4" style={{ marginTop: 24 }}>
        <div className="card-header"><h3 className="card-title">Heat Scale</h3></div>
        <div className="flex-row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {['0 marks', '1–2 / 1–3', '3–5 / 4–6', '6–8 / 7–9', '9–12 / 10–12', '13+'].map((l, i) => (
            <span key={i} className={`heatmap-cell heat-${i}`} style={{ padding: '4px 12px', borderRadius: 4 }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
