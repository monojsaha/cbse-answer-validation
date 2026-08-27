const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

async function requireAuth(req, res) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  const { data } = await supabase.from('sessions').select('*').eq('token', token).gt('expires_at', new Date().toISOString()).single();
  if (!data) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  return data;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = await requireAuth(req, res);
  if (!session) return;

  const { subject } = req.query;

  // Get all questions with topic tags and paper info for distribution
  let query = supabase
    .from('questions')
    .select('marks, topic_id, topics(unit_name, chapter_name, subject), paper_id, papers(exam_year, subject, academic_session)')
    .not('topic_id', 'is', null);

  if (subject) {
    query = query.eq('papers.subject', subject);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Aggregate: { chapter_name: { year: totalMarks } }
  const distribution = {};
  for (const q of (data || [])) {
    if (!q.topics || !q.papers) continue;
    if (subject && q.papers.subject !== subject) continue;
    const chapter = q.topics.chapter_name;
    const unit = q.topics.unit_name;
    const year = q.papers.exam_year;
    const key = `${unit}__${chapter}`;
    if (!distribution[key]) distribution[key] = { unit_name: unit, chapter_name: chapter, years: {} };
    distribution[key].years[year] = (distribution[key].years[year] || 0) + (q.marks || 0);
  }

  return res.json(Object.values(distribution));
};
