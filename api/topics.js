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

  // Load official syllabus weightage from topics table as baseline
  let topicsQuery = supabase.from('topics').select('*').order('unit_name').order('chapter_name');
  if (subject) topicsQuery = topicsQuery.eq('subject', subject);
  const { data: topicRows } = await topicsQuery;

  // Aggregate tagged questions for actual marks-per-year distribution
  let qQuery = supabase
    .from('questions')
    .select('marks, topic_id, topics(unit_name, chapter_name, subject), paper_id, papers(exam_year, subject, academic_session)')
    .not('topic_id', 'is', null);
  const { data: qData } = await qQuery;

  // Build distribution map keyed by topic id
  const distribution = {};

  // Seed all topics first with official weightage
  for (const t of (topicRows || [])) {
    const key = t.id;
    distribution[key] = {
      unit_name: t.unit_name,
      chapter_name: t.chapter_name,
      subject: t.subject,
      official_marks_weightage: t.official_marks_weightage,
      years: {}
    };
  }

  // Overlay actual tagged-question marks per year
  for (const q of (qData || [])) {
    if (!q.topics || !q.papers) continue;
    if (subject && q.papers.subject !== subject) continue;
    const key = q.topic_id;
    if (!distribution[key]) {
      distribution[key] = { unit_name: q.topics.unit_name, chapter_name: q.topics.chapter_name, subject: q.topics.subject, official_marks_weightage: null, years: {} };
    }
    const year = q.papers.exam_year;
    distribution[key].years[year] = (distribution[key].years[year] || 0) + (q.marks || 0);
  }

  return res.json(Object.values(distribution));
};
