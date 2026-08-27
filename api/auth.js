const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

async function getSession(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  const { data } = await supabase
    .from('sessions')
    .select('*, user_accounts(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();
  return data;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    return res.json({ role: session.role, userId: session.user_id, displayName: session.user_accounts?.display_name });
  }

  if (req.method === 'POST') {
    const { action, email, password, displayName } = req.body || {};

    if (action === 'register') {
      const hash = await bcrypt.hash(password, 10);
      const { data, error } = await supabase
        .from('user_accounts')
        .insert({ email, password_hash: hash, display_name: displayName || email, role: 'student' })
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('sessions').insert({ token, user_id: data.id, role: data.role, expires_at: expires });
      return res.json({ token, role: data.role, displayName: data.display_name });
    }

    if (action === 'login') {
      const { data: user } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('email', email)
        .single();
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('sessions').insert({ token, user_id: user.id, role: user.role, expires_at: expires });
      return res.json({ token, role: user.role, displayName: user.display_name });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  if (req.method === 'DELETE') {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace('Bearer ', '').trim();
    if (token) await supabase.from('sessions').delete().eq('token', token);
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
