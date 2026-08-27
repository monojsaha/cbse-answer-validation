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

  const { subject, year, type, set, id } = req.query;

  // GET /api/papers?id=xxx — single paper with questions
  if (id) {
    const { data: paper } = await supabase.from('papers').select('*').eq('id', id).single();
    if (!paper) return res.status(404).json({ error: 'Not found' });
    const { data: questions } = await supabase
      .from('questions')
      .select('*, topics(unit_name, chapter_name), repeat_flags_1:repeat_flags!repeat_flags_question_id_1_fkey(id,admin_verdict,question_id_2), repeat_flags_2:repeat_flags!repeat_flags_question_id_2_fkey(id,admin_verdict,question_id_1)')
      .eq('paper_id', id)
      .order('question_number');
    return res.json({ ...paper, questions: questions || [] });
  }

  // GET /api/papers — list with filters
  let query = supabase.from('papers').select('*').order('exam_year', { ascending: false }).order('subject');
  if (subject) query = query.eq('subject', subject);
  if (year) query = query.eq('exam_year', parseInt(year));
  if (type) query = query.eq('paper_type', type);
  if (set) query = query.eq('set_code', set);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
};
