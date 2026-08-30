const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

async function requireAdmin(req, res) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  const { data } = await supabase.from('sessions').select('*, user_accounts(*)').eq('token', token).gt('expires_at', new Date().toISOString()).single();
  if (!data || data.role !== 'admin') { res.status(403).json({ error: 'Admin only' }); return null; }
  return data;
}

const STOP = new Set(['a','an','the','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','to','of','in','on','at','for','with','by','from','and','or','but','if','as','it','its','this','that','these','those','not','no','so','such','each','other','into','about','through','during','what','which','who','when','where','how']);

function normalize(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function termFreq(text) {
  const counts = {};
  for (const w of text.split(' ')) {
    if (w.length > 2 && !STOP.has(w)) counts[w] = (counts[w] || 0) + 1;
  }
  return counts;
}

function cosineSimilarity(a, b) {
  const v1 = termFreq(a), v2 = termFreq(b);
  const terms = new Set([...Object.keys(v1), ...Object.keys(v2)]);
  let dot = 0, mag1 = 0, mag2 = 0;
  for (const t of terms) {
    const x = v1[t] || 0, y = v2[t] || 0;
    dot += x * y; mag1 += x * x; mag2 += y * y;
  }
  if (!mag1 || !mag2) return 0;
  return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {

  const { action } = req.query;

  // PUT /api/admin?action=paper — add/update paper
  if (req.method === 'PUT' && action === 'paper') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { id, ...fields } = req.body || {};
    if (id) {
      const { data, error } = await supabase.from('papers').update(fields).eq('id', id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      return res.json(data);
    } else {
      const { data, error } = await supabase.from('papers').insert(fields).select().single();
      if (error) return res.status(400).json({ error: error.message });
      return res.json(data);
    }
  }

  // DELETE /api/admin?action=paper&id=xxx
  if (req.method === 'DELETE' && action === 'paper') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { id } = req.query;
    await supabase.from('papers').delete().eq('id', id);
    return res.json({ ok: true });
  }

  // PUT /api/admin?action=question&id=xxx — update topic tag / answer
  if (req.method === 'PUT' && action === 'question') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { id } = req.query;
    const { data, error } = await supabase.from('questions').update(req.body).eq('id', id).select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }

  // POST /api/admin?action=question — add question to paper
  if (req.method === 'POST' && action === 'question') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { data, error } = await supabase.from('questions').insert(req.body).select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }

  // DELETE /api/admin?action=question&id=xxx
  if (req.method === 'DELETE' && action === 'question') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { id } = req.query;
    await supabase.from('questions').delete().eq('id', id);
    return res.json({ ok: true });
  }

  // PUT /api/admin?action=repeat&id=xxx — confirm/dismiss repeat flag
  if (req.method === 'PUT' && action === 'repeat') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { id } = req.query;
    const { admin_verdict } = req.body || {};
    const { data, error } = await supabase
      .from('repeat_flags')
      .update({ admin_verdict, reviewed_by: session.user_id, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }

  // POST /api/admin?action=detect — run similarity scan
  if (req.method === 'POST' && action === 'detect') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { subject } = req.body || {};

    const { data: questions } = await supabase
      .from('questions')
      .select('id, question_text, paper_id, papers(subject, exam_year)')
      .not('question_text', 'is', null)
      .neq('question_text', '');

    let filtered = (questions || []).filter(q => q.question_text && q.question_text.length > 20);
    if (subject) filtered = filtered.filter(q => q.papers?.subject === subject);

    let newFlags = 0;
    for (let i = 0; i < filtered.length; i++) {
      for (let j = i + 1; j < filtered.length; j++) {
        const q1 = filtered[i], q2 = filtered[j];
        if (q1.paper_id === q2.paper_id) continue;
        const score = cosineSimilarity(normalize(q1.question_text), normalize(q2.question_text));
        if (score >= 0.8) {
          const { error } = await supabase.from('repeat_flags').upsert({
            question_id_1: q1.id,
            question_id_2: q2.id,
            similarity_score: Math.round(score * 1000) / 1000,
            auto_detected: true,
            admin_verdict: 'pending'
          }, { onConflict: 'question_id_1,question_id_2', ignoreDuplicates: true });
          if (!error) newFlags++;
        }
      }
    }

    return res.json({ newFlags });
  }

  // GET /api/admin?action=papers — list all papers for admin
  if (req.method === 'GET' && action === 'papers') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { data } = await supabase.from('papers').select('*').order('exam_year', { ascending: false });
    return res.json(data || []);
  }

  // GET /api/admin?action=topics — list all topics
  if (req.method === 'GET' && action === 'topics') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { data } = await supabase.from('topics').select('*').order('subject').order('unit_name');
    return res.json(data || []);
  }

  // DELETE /api/admin?action=topic&id=xxx
  if (req.method === 'DELETE' && action === 'topic') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    await supabase.from('topics').delete().eq('id', id);
    return res.json({ ok: true });
  }

  // PUT /api/admin?action=topic — add/update topic
  if (req.method === 'PUT' && action === 'topic') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { id, ...fields } = req.body || {};
    if (id) {
      const { data, error } = await supabase.from('topics').update(fields).eq('id', id).select().single();
      if (error) return res.status(400).json({ error: error.message });
      return res.json(data);
    } else {
      const { data, error } = await supabase.from('topics').insert(fields).select().single();
      if (error) return res.status(400).json({ error: error.message });
      return res.json(data);
    }
  }

  // GET /api/admin?action=users
  if (req.method === 'GET' && action === 'users') {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { data } = await supabase.from('user_accounts').select('id, email, display_name, role, created_at').order('created_at', { ascending: false });
    return res.json(data || []);
  }

    res.status(404).json({ error: 'Not found' });
  } catch (err) {
    console.error('Admin handler error:', err);
    res.status(500).json({ error: err.message });
  }
};
