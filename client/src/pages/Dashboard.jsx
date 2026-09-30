import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import DataTable from '../components/DataTable';
import ResultChart from '../components/ResultChart';

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const [datasets, setDatasets] = useState(null);
  const [saved, setSaved] = useState([]);
  const [detail, setDetail] = useState(null);
  const [sql, setSql] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  const selectedId = params.get('dataset');

  useEffect(() => {
    Promise.all([api('/datasets'), api('/query/saved')])
      .then(([ds, sq]) => {
        setDatasets(ds);
        setSaved(sq);
        if (!selectedId && ds.length) setParams({ dataset: ds[0].id }, { replace: true });
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return setDetail(null);
    setResult(null);
    api(`/datasets/${selectedId}`)
      .then((d) => {
        setDetail(d);
        setSql(`SELECT * FROM ${d.table_name} LIMIT 20`);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [selectedId]);

  async function run() {
    setRunning(true);
    setError('');
    try {
      setResult(await api('/query', { method: 'POST', body: { sql } }));
    } catch (e) {
      setResult(null);
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${detail.name}"?`)) return;
    try {
      await api(`/datasets/${detail.id}`, { method: 'DELETE' });
      window.location.assign('/');
    } catch (e) {
      setError(e.message);
    }
  }

  if (datasets === null && !error) return <p className="muted">Loading...</p>;

  if (datasets && datasets.length === 0) {
    return (
      <div className="card">
        <h1>No datasets yet</h1>
        <p><Link to="/upload">Upload a CSV</Link> to start exploring it with SQL.</p>
      </div>
    );
  }

  return (
    <>
      <div className="row">
        <label className="grow">Dataset
          <select value={selectedId || ''} onChange={(e) => setParams({ dataset: e.target.value })}>
            {(datasets || []).map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.row_count} rows)</option>
            ))}
          </select>
        </label>
        {detail && <button className="secondary danger" onClick={remove}>Delete</button>}
      </div>

      {error && <p className="error">{error}</p>}

      {detail && (
        <>
          <p className="muted">
            Table <code>{detail.table_name}</code>. Columns:{' '}
            {detail.columns.map((c) => `${c.name} (${c.type})`).join(', ')}
          </p>

          <div className="card">
            <h2>Query</h2>
            <div className="row">
              <label className="grow">Example queries (built for sample.csv)
                <select
                  value=""
                  onChange={(e) => {
                    const q = saved[Number(e.target.value)];
                    if (q) setSql(q.sql.replaceAll('{{table}}', detail.table_name));
                  }}
                >
                  <option value="">Pick an example...</option>
                  {saved.map((q, i) => <option key={q.title} value={i}>{q.title}</option>)}
                </select>
              </label>
            </div>
            <textarea rows={8} value={sql} onChange={(e) => setSql(e.target.value)} spellCheck={false} />
            <button onClick={run} disabled={running || !sql.trim()}>{running ? 'Running...' : 'Run query'}</button>
          </div>

          {result ? (
            <div className="card">
              <h2>Results ({result.rows.length}{result.truncated ? '+, truncated' : ''} rows)</h2>
              <ResultChart columns={result.columns} rows={result.rows} />
              <DataTable columns={result.columns} rows={result.rows} />
            </div>
          ) : (
            <div className="card">
              <h2>Preview (first 100 rows)</h2>
              <DataTable columns={detail.columns.map((c) => c.name)} rows={detail.preview} />
            </div>
          )}
        </>
      )}
    </>
  );
}
