import { Route, Routes } from 'react-router-dom';
import { supabaseConfigured } from './lib/supabase';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';

export default function App() {
  if (!supabaseConfigured) {
    return (
      <div className="card">
        <h1>Setup needed</h1>
        <p>
          Copy <code>.env.example</code> to <code>.env</code> and fill in <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>, then restart <code>npm run dev</code>.
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
        </Route>
      </Route>
      <Route path="*" element={<p className="muted">Page not found.</p>} />
    </Routes>
  );
}
