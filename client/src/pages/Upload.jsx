import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      if (name.trim()) form.append('name', name.trim());
      const dataset = await api('/datasets', { method: 'POST', form });
      navigate(`/?dataset=${dataset.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>Upload a CSV</h1>
      <p className="muted">
        The first row must be headers. Column types are detected automatically. Max 10 MB.
        Try <code>server/db/seed/sample.csv</code>.
      </p>
      <form onSubmit={submit}>
        <label>File
          <input type="file" accept=".csv,text/csv" required onChange={(e) => setFile(e.target.files[0])} />
        </label>
        <label>Dataset name (optional)
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </label>
        {error && <p className="error">{error}</p>}
        <button disabled={busy || !file}>{busy ? 'Uploading...' : 'Upload'}</button>
      </form>
    </div>
  );
}
