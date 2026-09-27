import { Area, AreaChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMonthLong, formatMonthShort } from '../../utils/format';

const AXIS_TICK = { fill: 'var(--chart-axis-text)', fontSize: 12 };

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { month, sif, total } = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{formatMonthLong(month)}</p>
      <p className="chart-tooltip-row">
        <span className="swatch swatch-sif" aria-hidden="true" />
        SIF precursors <strong>{sif}</strong>
      </p>
      <p className="chart-tooltip-row muted">
        of {total} {total === 1 ? 'report' : 'reports'} filed
      </p>
    </div>
  );
}

// Only label the latest month
function EndLabel({ x, y, value, index, count }) {
  if (index !== count - 1) return null;
  return (
    <text x={x} y={y - 14} textAnchor="middle" className="chart-end-label">
      {value}
    </text>
  );
}

export default function SifTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 28, right: 16, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="sif-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--chart-sif)', stopOpacity: 0.16 }} />
            <stop offset="100%" style={{ stopColor: 'var(--chart-sif)', stopOpacity: 0.02 }} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonthShort}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: 'var(--chart-baseline)' }}
          tickMargin={8}
        />
        <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          content={<TrendTooltip />}
          cursor={{ stroke: 'var(--chart-baseline)', strokeWidth: 1 }}
          isAnimationActive={false}
        />
        <Area
          type="linear"
          dataKey="sif"
          name="SIF precursors"
          stroke="var(--chart-sif)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="url(#sif-trend-fill)"
          dot={{ r: 4, fill: 'var(--chart-sif)', stroke: 'var(--surface)', strokeWidth: 2 }}
          isAnimationActive={false}
          activeDot={{ r: 6, fill: 'var(--chart-sif)', stroke: 'var(--surface)', strokeWidth: 2 }}
        >
          <LabelList dataKey="sif" content={(props) => <EndLabel {...props} count={data.length} />} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
