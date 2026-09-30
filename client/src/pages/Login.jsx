import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const { data, error: err } = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (err) return setError(err.message);
    // With email confirmation enabled, sign-up returns no session until the link is clicked.
    if (mode === 'signup' && !data.session) setNotice('Check your email to confirm your account, then sign in.');
  }

  return (
    <div className="card auth">
      <h1>{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
      <form onSubmit={submit}>
        <label>Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>Password
          <input
            type="password" required minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
        </label>
        {error && <p className="error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}
        <button disabled={busy}>{busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Sign up'}</button>
      </form>
      <p className="muted">
        {mode === 'signin' ? 'No account? ' : 'Already have one? '}
        <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'signin' ? 'signup' : 'signin'); }}>
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </a>
      </p>
    </div>
  );
}
