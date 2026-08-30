// Fetches a CBSE PDF server-side and returns it as a file download attachment.
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const ALLOWED_HOSTS = ['cbse.gov.in', 'cbseacademic.nic.in', 'cbseacademic.in'];

async function requireAuth(req, res) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return false; }
  const { data } = await supabase.from('sessions').select('id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
  if (!data) { res.status(401).json({ error: 'Unauthorized' }); return false; }
  return true;
}

function fetchUrl(url, cb) {
  const lib = url.startsWith('https') ? https : http;
  return lib.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CBSE-Portal/1.0)', Accept: 'application/pdf,*/*' },
    timeout: 20000,
  }, cb);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ok = await requireAuth(req, res);
  if (!ok) return;

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url param required' });

  let parsed;
  try { parsed = new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

  const hostOk = ALLOWED_HOSTS.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
  if (!hostOk) return res.status(403).json({ error: 'URL not from an allowed CBSE domain' });

  const safeFilename = (parsed.pathname.split('/').pop() || 'cbse-marking-scheme.pdf').replace(/[^a-z0-9.\-_]/gi, '_');

  return new Promise((resolve) => {
    function stream(targetUrl, hops) {
      if (hops > 3) { res.status(502).json({ error: 'Too many redirects' }); return resolve(); }

      fetchUrl(targetUrl, (upstream) => {
        if ([301, 302, 307, 308].includes(upstream.statusCode) && upstream.headers.location) {
          upstream.resume();
          const next = new URL(upstream.headers.location, targetUrl).toString();
          const nextHostOk = ALLOWED_HOSTS.some(h => {
            try { const u = new URL(next); return u.hostname === h || u.hostname.endsWith('.' + h); } catch { return false; }
          });
          if (!nextHostOk) { res.status(403).json({ error: 'Redirect outside allowed domains' }); return resolve(); }
          return stream(next, hops + 1);
        }

        if (upstream.statusCode !== 200) {
          upstream.resume();
          res.status(upstream.statusCode || 502).json({ error: `Upstream returned ${upstream.statusCode}` });
          return resolve();
        }

        res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);
        res.status(200);
        upstream.pipe(res);
        upstream.on('end', resolve);
      }).on('error', (e) => {
        res.status(502).json({ error: 'Fetch failed: ' + e.message });
        resolve();
      }).on('timeout', function () {
        this.destroy();
        res.status(504).json({ error: 'Upstream timeout' });
        resolve();
      });
    }

    stream(url, 0);
  });
};
