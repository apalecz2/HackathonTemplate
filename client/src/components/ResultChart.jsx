import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** Charts the first text/date-like column against the first numeric column, if both exist. */
export default function ResultChart({ columns, rows }) {
  if (!rows.length || columns.length < 2) return null;
  const isNum = (v) => v !== null && v !== '' && !Number.isNaN(Number(v));
  const valueCol = columns.find((c) => rows.every((r) => r[c] === null || isNum(r[c])) && rows.some((r) => r[c] !== null));
  const labelCol = columns.find((c) => c !== valueCol);
  if (!valueCol || !labelCol) return null;

  const data = rows.slice(0, 30).map((r) => ({ label: String(r[labelCol]), value: Number(r[valueCol]) }));
  return (
    <div className="chart">
      <h3>{valueCol} by {labelCol}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#4f46e5" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
