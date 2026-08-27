/**
 * CBSE Answer Validation Portal — Integration & Regression Test Suite
 * Run: npm test
 * Env vars: TEST_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = (process.env.TEST_BASE_URL || 'https://cbse-answer-validation.vercel.app').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASS = process.env.TEST_ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASS) {
  throw new Error('Set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD env vars to run integration tests');
}

let adminToken = '';
let studentToken = '';
let testStudentEmail = `testuser-${Date.now()}@cbse-test.dev`;
let firstPaperId = '';
let createdTopicId = '';

async function api(path, { token, method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
describe('Auth API', () => {
  it('GET /api/auth without token → 401', async () => {
    const { status } = await api('/api/auth');
    expect(status).toBe(401);
  });

  it('GET /api/auth with invalid token → 401', async () => {
    const { status } = await api('/api/auth', { token: 'invalid-garbage-token' });
    expect(status).toBe(401);
  });

  it('POST register new student → 200 with token', async () => {
    const { status, data } = await api('/api/auth', {
      method: 'POST',
      body: { action: 'register', email: testStudentEmail, password: 'Test@12345', displayName: 'Regression Tester' },
    });
    expect(status).toBe(200);
    expect(data.token).toBeTruthy();
    expect(data.role).toBe('student');
    studentToken = data.token;
  });

  it('POST register duplicate email → 409', async () => {
    const { status } = await api('/api/auth', {
      method: 'POST',
      body: { action: 'register', email: testStudentEmail, password: 'Test@12345', displayName: 'Dup' },
    });
    expect(status).toBe(409);
  });

  it('POST register missing fields → 400', async () => {
    const { status } = await api('/api/auth', {
      method: 'POST',
      body: { action: 'register', email: '' },
    });
    expect(status).toBe(400);
  });

  it('POST login admin → 200 with role=admin', async () => {
    const { status, data } = await api('/api/auth', {
      method: 'POST',
      body: { action: 'login', email: ADMIN_EMAIL, password: ADMIN_PASS },
    });
    expect(status).toBe(200);
    expect(data.role).toBe('admin');
    expect(data.token).toBeTruthy();
    adminToken = data.token;
  });

  it('POST login wrong password → 401', async () => {
    const { status } = await api('/api/auth', {
      method: 'POST',
      body: { action: 'login', email: ADMIN_EMAIL, password: 'wrong-password-xyz' },
    });
    expect(status).toBe(401);
  });

  it('POST login non-existent email → 401', async () => {
    const { status } = await api('/api/auth', {
      method: 'POST',
      body: { action: 'login', email: 'nobody@nowhere.com', password: 'pass' },
    });
    expect(status).toBe(401);
  });

  it('GET /api/auth with valid token → 200 + user info', async () => {
    const { status, data } = await api('/api/auth', { token: adminToken });
    expect(status).toBe(200);
    expect(data.role).toBe('admin');
    expect(data.displayName).toBeTruthy();
  });
});

// ─── PAPERS ──────────────────────────────────────────────────────────────────
describe('Papers API', () => {
  it('GET /api/papers without auth → 401', async () => {
    const { status } = await api('/api/papers');
    expect(status).toBe(401);
  });

  it('GET /api/papers with student token → 200', async () => {
    const { status, data } = await api('/api/papers', { token: studentToken });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/papers → at least 44 seeded papers', async () => {
    const { data } = await api('/api/papers', { token: adminToken });
    expect(data.length).toBeGreaterThanOrEqual(44);
    firstPaperId = data[0]?.id;
  });

  it('Paper object has required fields', async () => {
    const { data } = await api('/api/papers', { token: adminToken });
    const p = data[0];
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('subject');
    expect(p).toHaveProperty('exam_year');
    expect(p).toHaveProperty('paper_type');
    expect(p).toHaveProperty('academic_session');
    expect(p).toHaveProperty('set_code');
  });

  it('Papers cover all 4 subjects', async () => {
    const { data } = await api('/api/papers', { token: adminToken });
    const subjects = [...new Set(data.map(p => p.subject))];
    expect(subjects).toContain('physics');
    expect(subjects).toContain('chemistry');
    expect(subjects).toContain('mathematics');
    expect(subjects).toContain('computer_science');
  });

  it('Papers include both board and sqp types', async () => {
    const { data } = await api('/api/papers', { token: adminToken });
    expect(data.some(p => p.paper_type === 'board')).toBe(true);
    expect(data.some(p => p.paper_type === 'sqp')).toBe(true);
  });

  it('Papers span expected years (2020, 2022, 2023, 2024)', async () => {
    const { data } = await api('/api/papers', { token: adminToken });
    const years = [...new Set(data.map(p => p.exam_year))];
    expect(years).toContain(2020);
    expect(years).toContain(2022);
    expect(years).toContain(2023);
    expect(years).toContain(2024);
  });

  it('No papers from 2021 (exams cancelled)', async () => {
    const { data } = await api('/api/papers?year=2021', { token: adminToken });
    expect(data.length).toBe(0);
  });

  it('Filter subject=physics → only physics', async () => {
    const { status, data } = await api('/api/papers?subject=physics', { token: adminToken });
    expect(status).toBe(200);
    expect(data.length).toBeGreaterThan(0);
    expect(data.every(p => p.subject === 'physics')).toBe(true);
  });

  it('Filter subject=chemistry → only chemistry', async () => {
    const { data } = await api('/api/papers?subject=chemistry', { token: adminToken });
    expect(data.every(p => p.subject === 'chemistry')).toBe(true);
  });

  it('Filter subject=mathematics → only mathematics', async () => {
    const { data } = await api('/api/papers?subject=mathematics', { token: adminToken });
    expect(data.every(p => p.subject === 'mathematics')).toBe(true);
  });

  it('Filter subject=computer_science → only CS', async () => {
    const { data } = await api('/api/papers?subject=computer_science', { token: adminToken });
    expect(data.every(p => p.subject === 'computer_science')).toBe(true);
  });

  it('Filter year=2024 → only 2024 papers', async () => {
    const { data } = await api('/api/papers?year=2024', { token: adminToken });
    expect(data.length).toBeGreaterThan(0);
    expect(data.every(p => p.exam_year === 2024)).toBe(true);
  });

  it('Filter type=board → only board papers', async () => {
    const { data } = await api('/api/papers?type=board', { token: adminToken });
    expect(data.every(p => p.paper_type === 'board')).toBe(true);
  });

  it('Filter type=sqp → only SQP papers', async () => {
    const { data } = await api('/api/papers?type=sqp', { token: adminToken });
    expect(data.every(p => p.paper_type === 'sqp')).toBe(true);
  });

  it('Combined filter subject+year → correct subset', async () => {
    const { data } = await api('/api/papers?subject=physics&year=2024', { token: adminToken });
    expect(data.every(p => p.subject === 'physics' && p.exam_year === 2024)).toBe(true);
  });

  it('GET /api/papers?id=<uuid> → paper detail with questions array', async () => {
    const { status, data } = await api(`/api/papers?id=${firstPaperId}`, { token: adminToken });
    expect(status).toBe(200);
    expect(data.id).toBe(firstPaperId);
    expect(Array.isArray(data.questions)).toBe(true);
  });

  it('GET /api/papers?id=<uuid> → questions is empty array (not yet added)', async () => {
    const { data } = await api(`/api/papers?id=${firstPaperId}`, { token: adminToken });
    expect(data.questions.length).toBe(0);
  });

  it('GET /api/papers?id=non-existent → 404', async () => {
    const { status } = await api('/api/papers?id=00000000-0000-0000-0000-000000000000', { token: adminToken });
    expect(status).toBe(404);
  });
});

// ─── TOPICS ──────────────────────────────────────────────────────────────────
describe('Topics API', () => {
  it('GET /api/topics without auth → 401', async () => {
    const { status } = await api('/api/topics');
    expect(status).toBe(401);
  });

  it('GET /api/topics with auth → array of topics', async () => {
    const { status, data } = await api('/api/topics', { token: adminToken });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('Topics → at least 47 seeded rows', async () => {
    const { data } = await api('/api/topics', { token: adminToken });
    expect(data.length).toBeGreaterThanOrEqual(47);
  });

  it('Topic objects have required fields', async () => {
    const { data } = await api('/api/topics', { token: adminToken });
    const t = data[0];
    expect(t).toHaveProperty('unit_name');
    expect(t).toHaveProperty('chapter_name');
    expect(t).toHaveProperty('subject');
    expect(t).toHaveProperty('years');
    expect(typeof t.years).toBe('object');
  });

  it('Topics cover all 4 subjects', async () => {
    const { data } = await api('/api/topics', { token: adminToken });
    const subjects = [...new Set(data.map(t => t.subject))];
    expect(subjects).toContain('physics');
    expect(subjects).toContain('chemistry');
    expect(subjects).toContain('mathematics');
    expect(subjects).toContain('computer_science');
  });

  it('Filter subject=physics → only physics topics', async () => {
    const { data } = await api('/api/topics?subject=physics', { token: adminToken });
    expect(data.length).toBeGreaterThan(0);
    expect(data.every(t => t.subject === 'physics')).toBe(true);
  });

  it('Filter subject=chemistry → only chemistry topics', async () => {
    const { data } = await api('/api/topics?subject=chemistry', { token: adminToken });
    expect(data.every(t => t.subject === 'chemistry')).toBe(true);
  });

  it('Topics have official_marks_weightage populated (not all null)', async () => {
    const { data } = await api('/api/topics', { token: adminToken });
    const withWeight = data.filter(t => t.official_marks_weightage != null);
    expect(withWeight.length).toBeGreaterThan(0);
  });

  it('Physics total official weightage = 70 marks', async () => {
    const { data } = await api('/api/topics?subject=physics', { token: adminToken });
    const total = data.reduce((s, t) => s + (t.official_marks_weightage || 0), 0);
    expect(total).toBe(70);
  });

  it('Chemistry total official weightage = 70 marks', async () => {
    const { data } = await api('/api/topics?subject=chemistry', { token: adminToken });
    const total = data.reduce((s, t) => s + (t.official_marks_weightage || 0), 0);
    expect(total).toBe(70);
  });

  it('Mathematics total official weightage = 80 marks', async () => {
    const { data } = await api('/api/topics?subject=mathematics', { token: adminToken });
    const total = data.reduce((s, t) => s + (t.official_marks_weightage || 0), 0);
    expect(total).toBe(80);
  });

  it('Computer Science topics have weightage values', async () => {
    const { data } = await api('/api/topics?subject=computer_science', { token: adminToken });
    const withWeight = data.filter(t => (t.official_marks_weightage || 0) > 0);
    expect(withWeight.length).toBeGreaterThan(0);
  });

  it('Topic years field is an object (not null)', async () => {
    const { data } = await api('/api/topics?subject=physics', { token: adminToken });
    data.forEach(t => {
      expect(t.years).toBeTruthy();
      expect(typeof t.years).toBe('object');
    });
  });
});

// ─── REPEATS ─────────────────────────────────────────────────────────────────
describe('Repeats API', () => {
  it('GET /api/repeats without auth → 401', async () => {
    const { status } = await api('/api/repeats');
    expect(status).toBe(401);
  });

  it('GET /api/repeats with auth → 200 array', async () => {
    const { status, data } = await api('/api/repeats', { token: adminToken });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/repeats?verdict=confirmed → 200 array', async () => {
    const { status, data } = await api('/api/repeats?verdict=confirmed', { token: adminToken });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/repeats?verdict=pending → 200 array', async () => {
    const { status, data } = await api('/api/repeats?verdict=pending', { token: adminToken });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/repeats?verdict=dismissed → 200 array', async () => {
    const { status, data } = await api('/api/repeats?verdict=dismissed', { token: adminToken });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/repeats?subject=physics → 200 array', async () => {
    const { status, data } = await api('/api/repeats?subject=physics', { token: adminToken });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('Student can view repeats (not admin-only)', async () => {
    const { status } = await api('/api/repeats', { token: studentToken });
    expect(status).toBe(200);
  });
});

// ─── ADMIN — ACCESS CONTROL ──────────────────────────────────────────────────
describe('Admin API — Access Control', () => {
  it('Unauthenticated request → 401', async () => {
    const { status } = await api('/api/admin?action=papers');
    expect(status).toBe(401);
  });

  it('Student role → 403 on every admin action', async () => {
    const actions = ['papers', 'topics', 'users'];
    for (const a of actions) {
      const { status } = await api(`/api/admin?action=${a}`, { token: studentToken });
      expect(status, `action=${a} should be 403 for student`).toBe(403);
    }
  });

  it('Admin can GET papers list', async () => {
    const { status, data } = await api('/api/admin?action=papers', { token: adminToken });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(44);
  });

  it('Admin can GET topics list', async () => {
    const { status, data } = await api('/api/admin?action=topics', { token: adminToken });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('Admin can GET users list', async () => {
    const { status, data } = await api('/api/admin?action=users', { token: adminToken });
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });
});

// ─── ADMIN — TOPIC CRUD ──────────────────────────────────────────────────────
describe('Admin API — Topic CRUD', () => {
  it('PUT /api/admin?action=topic creates a topic', async () => {
    const { status, data } = await api('/api/admin?action=topic', {
      token: adminToken,
      method: 'PUT',
      body: {
        subject: 'physics',
        unit_name: '__Regression Test Unit__',
        chapter_name: '__Regression Test Chapter__',
        official_marks_weightage: 3,
        academic_session: '2023-24',
      },
    });
    expect(status).toBe(200);
    expect(data.id).toBeTruthy();
    createdTopicId = data.id;
  });

  it('New topic appears in topics list', async () => {
    const { data } = await api('/api/admin?action=topics', { token: adminToken });
    expect(data.some(t => t.id === createdTopicId)).toBe(true);
  });

  it('New topic appears in public topics distribution', async () => {
    const { data } = await api('/api/topics?subject=physics', { token: adminToken });
    expect(data.some(t => t.chapter_name === '__Regression Test Chapter__')).toBe(true);
  });
});

// ─── ADMIN — PAPER CRUD ──────────────────────────────────────────────────────
describe('Admin API — Paper CRUD', () => {
  let createdPaperId = '';

  it('PUT /api/admin?action=paper creates a paper', async () => {
    const { status, data } = await api('/api/admin?action=paper', {
      token: adminToken,
      method: 'PUT',
      body: {
        subject: 'physics',
        academic_session: '2023-24',
        exam_year: 2024,
        paper_type: 'board',
        set_code: '__test__',
        total_marks: 70,
        duration_minutes: 180,
        paper_url: 'https://example.com/test.pdf',
        answer_key_url: 'https://example.com/test-ms.pdf',
      },
    });
    expect(status).toBe(200);
    expect(data.id).toBeTruthy();
    createdPaperId = data.id;
  });

  it('Created paper appears in papers list', async () => {
    const { data } = await api('/api/papers', { token: adminToken });
    expect(data.some(p => p.id === createdPaperId)).toBe(true);
  });

  it('DELETE /api/admin?action=paper removes the paper', async () => {
    const { status } = await api(`/api/admin?action=paper&id=${createdPaperId}`, {
      token: adminToken,
      method: 'DELETE',
    });
    expect(status).toBe(200);
  });

  it('Deleted paper no longer in papers list', async () => {
    const { data } = await api('/api/papers', { token: adminToken });
    expect(data.some(p => p.id === createdPaperId)).toBe(false);
  });

  it('Student cannot create/delete papers (403)', async () => {
    const { status } = await api('/api/admin?action=paper', {
      token: studentToken,
      method: 'PUT',
      body: { subject: 'physics', exam_year: 2024, academic_session: '2023-24', paper_type: 'board', set_code: '1' },
    });
    expect(status).toBe(403);
  });
});

// ─── DATA INTEGRITY ──────────────────────────────────────────────────────────
describe('Data Integrity', () => {
  it('All papers have valid subject values', async () => {
    const valid = ['physics', 'chemistry', 'mathematics', 'computer_science'];
    const { data } = await api('/api/papers', { token: adminToken });
    expect(data.every(p => valid.includes(p.subject))).toBe(true);
  });

  it('All papers have valid paper_type values', async () => {
    const { data } = await api('/api/papers', { token: adminToken });
    expect(data.every(p => ['board', 'sqp'].includes(p.paper_type))).toBe(true);
  });

  it('All papers have an academic_session', async () => {
    const { data } = await api('/api/papers', { token: adminToken });
    expect(data.every(p => p.academic_session)).toBe(true);
  });

  it('All topics have subject, unit_name, chapter_name', async () => {
    const { data } = await api('/api/topics', { token: adminToken });
    expect(data.every(t => t.subject && t.unit_name && t.chapter_name)).toBe(true);
  });

  it('No paper URLs point to non-CBSE domains (spot check)', async () => {
    const allowed = ['cbse.gov.in', 'cbseacademic.nic.in', 'example.com', null, undefined, ''];
    const { data } = await api('/api/papers', { token: adminToken });
    const invalid = data.filter(p => {
      if (!p.paper_url) return false;
      try {
        const h = new URL(p.paper_url).hostname;
        return !allowed.some(d => d && h.endsWith(d));
      } catch { return false; }
    });
    expect(invalid.length, `Non-CBSE paper URLs: ${invalid.map(p => p.paper_url).join(', ')}`).toBe(0);
  });
});

// ─── CLEANUP ─────────────────────────────────────────────────────────────────
afterAll(async () => {
  // Remove test student session + account
  if (studentToken) {
    await api('/api/auth', { method: 'DELETE', token: studentToken });
  }
  // Note: test topic (createdTopicId) intentionally left — no DELETE topic endpoint
  // It can be removed from Admin Panel → Topics if needed
});
