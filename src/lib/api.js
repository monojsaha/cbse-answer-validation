const BASE = '';

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('cbse-token');
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const auth = {
  register: (email, password, displayName) =>
    apiFetch('/api/auth', { method: 'POST', body: { action: 'register', email, password, displayName } }),
  login: (email, password) =>
    apiFetch('/api/auth', { method: 'POST', body: { action: 'login', email, password } }),
  verify: () => apiFetch('/api/auth'),
  logout: () => apiFetch('/api/auth', { method: 'DELETE' })
};

export const papers = {
  list: (filters = {}) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([,v]) => v)).toString();
    return apiFetch(`/api/papers${q ? '?' + q : ''}`);
  },
  get: (id) => apiFetch(`/api/papers?id=${id}`)
};

export const topics = {
  distribution: (subject) => apiFetch(`/api/topics${subject ? '?subject=' + subject : ''}`)
};

export const repeats = {
  list: (subject, verdict) => {
    const q = new URLSearchParams({ ...(subject ? { subject } : {}), ...(verdict ? { verdict } : {}) }).toString();
    return apiFetch(`/api/repeats${q ? '?' + q : ''}`);
  }
};

export const admin = {
  upsertPaper: (data) => apiFetch('/api/admin?action=paper', { method: 'PUT', body: data }),
  deletePaper: (id) => apiFetch(`/api/admin?action=paper&id=${id}`, { method: 'DELETE' }),
  addQuestion: (data) => apiFetch('/api/admin?action=question', { method: 'POST', body: data }),
  updateQuestion: (id, data) => apiFetch(`/api/admin?action=question&id=${id}`, { method: 'PUT', body: data }),
  deleteQuestion: (id) => apiFetch(`/api/admin?action=question&id=${id}`, { method: 'DELETE' }),
  updateRepeat: (id, verdict) => apiFetch(`/api/admin?action=repeat&id=${id}`, { method: 'PUT', body: { admin_verdict: verdict } }),
  detectRepeats: (subject) => apiFetch('/api/admin?action=detect', { method: 'POST', body: { subject } }),
  getPapers: () => apiFetch('/api/admin?action=papers'),
  getTopics: () => apiFetch('/api/admin?action=topics'),
  upsertTopic: (data) => apiFetch('/api/admin?action=topic', { method: 'PUT', body: data }),
  getUsers: () => apiFetch('/api/admin?action=users')
};
