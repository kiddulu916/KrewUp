'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Props = {
  data: Array<{ date: string; errors: number }>;
};

export function ErrorRateChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          labelFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString();
          }}
          formatter={(value) => [value || 0, 'Errors']}
        />
        <Line
          type="monotone"
          dataKey="errors"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ fill: '#ef4444', r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
