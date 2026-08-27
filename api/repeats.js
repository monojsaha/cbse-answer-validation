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

  const { subject, verdict } = req.query;

  let query = supabase
    .from('repeat_flags')
    .select(`
      id, similarity_score, auto_detected, admin_verdict, created_at,
      q1:questions!repeat_flags_question_id_1_fkey(id, question_number, question_text, marks, paper_id, papers(exam_year, subject, set_code, academic_session), topics(chapter_name, unit_name)),
      q2:questions!repeat_flags_question_id_2_fkey(id, question_number, question_text, marks, paper_id, papers(exam_year, subject, set_code, academic_session), topics(chapter_name, unit_name))
    `)
    .order('similarity_score', { ascending: false });

  if (verdict) query = query.eq('admin_verdict', verdict);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let results = data || [];
  if (subject) {
    results = results.filter(r => r.q1?.papers?.subject === subject || r.q2?.papers?.subject === subject);
  }

  return res.json(results);
};
