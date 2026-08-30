// Server-side PDF proxy — fetches CBSE PDFs and streams them back so the
// iframe src is same-origin, avoiding all X-Frame-Options/CORS issues.
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const ALLOWED_HOSTS = ['cbse.gov.in', 'cbseacademic.nic.in', 'cbseacademic.in'];

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

async function requireAuth(req, res) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return false; }
  const { data } = await supabase.from('sessions').select('id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
  if (!data) { res.status(401).json({ error: 'Unauthorized' }); return false; }
  return true;
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ok = await requireAuth(req, res);
  if (!ok) return;

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url param required' });

  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

  const hostOk = ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
  if (!hostOk) return res.status(403).json({ error: 'URL not from an allowed CBSE domain' });

  const lib = parsed.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const proxyReq = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CBSE-Portal/1.0)',
        'Accept': 'application/pdf,*/*',
      },
      timeout: 15000,
    }, (upstream) => {
      // Follow redirects up to 3 hops
      if ([301, 302, 307, 308].includes(upstream.statusCode) && upstream.headers.location) {
        upstream.resume();
        const redirectUrl = new URL(upstream.headers.location, url).toString();
        const redirectHostOk = ALLOWED_HOSTS.some(h => new URL(redirectUrl).hostname.endsWith(h) || new URL(redirectUrl).hostname === h);
        if (!redirectHostOk) {
          res.status(403).json({ error: 'Redirect outside allowed domains' });
          return resolve();
        }
        // Simple single-hop redirect handling
        const libR = redirectUrl.startsWith('https') ? https : http;
        libR.get(redirectUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CBSE-Portal/1.0)' }, timeout: 15000 }, (r2) => {
          res.setHeader('Content-Type', r2.headers['content-type'] || 'application/pdf');
          res.setHeader('Content-Disposition', 'inline');
          res.status(r2.statusCode);
          r2.pipe(res);
          r2.on('end', resolve);
        }).on('error', (e) => { res.status(502).json({ error: e.message }); resolve(); });
        return;
      }

      if (upstream.statusCode !== 200) {
        upstream.resume();
        res.status(upstream.statusCode || 502).json({ error: `Upstream returned ${upstream.statusCode}` });
        return resolve();
      }

      res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);
      res.status(200);
      upstream.pipe(res);
      upstream.on('end', resolve);
    });

    proxyReq.on('error', (e) => {
      res.status(502).json({ error: 'Fetch failed: ' + e.message });
      resolve();
    });
    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(504).json({ error: 'Upstream timeout' });
      resolve();
    });
  });
};
