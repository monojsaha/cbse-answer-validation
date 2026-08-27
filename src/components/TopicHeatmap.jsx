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

  return (
    <div>
      <div className="page-header">
        <h2>Topic-wise Marks Distribution</h2>
        <p>See how many marks come from each chapter across years. Based on official CBSE syllabus and question tagging.</p>
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
          <h3>No data yet</h3>
          <p>Admin needs to tag questions with topics before the distribution appears.</p>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="heatmap-table">
            <thead>
              <tr>
                <th>Unit / Chapter</th>
                {ALL_YEARS.map(y => <th key={y} style={{ textAlign: 'center' }}>{y}</th>)}
                <th style={{ textAlign: 'center' }}>Total</th>
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
                    {ALL_YEARS.map(y => (
                      <td key={y} className={`heatmap-cell ${heatClass(row.years[y])}`}>
                        {row.years[y] || '—'}
                      </td>
                    ))}
                    <td className="heatmap-cell heat-4">{total}</td>
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
          {['0 marks', '1–2', '3–5', '6–8', '9–12', '13+'].map((l, i) => (
            <span key={i} className={`heatmap-cell heat-${i}`} style={{ padding: '4px 12px', borderRadius: 4 }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

