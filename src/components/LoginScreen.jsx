import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { auth } from '../lib/api';

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = mode === 'login'
        ? await auth.login(email, password)
        : await auth.register(email, password, displayName);
      onLogin({ role: data.role, displayName: data.displayName }, data.token);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <BookOpen size={36} style={{ color: 'var(--primary)', marginBottom: 8 }} />
          <h1>CBSE Class 12</h1>
          <p>Science Stream &middot; Question Paper Portal</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required placeholder="Your name" />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="student@school.edu" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
          <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
}
