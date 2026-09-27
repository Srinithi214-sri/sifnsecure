import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const AXIS_TICK = { fill: 'var(--chart-axis-text)', fontSize: 12 };
const BAR_SIZE = 18;
const RADIUS = 4;
const GAP = 2;

// Bar with rounded right corners
function barPath(x, y, w, h, r) {
  const rr = Math.min(r, w, h / 2);
  return `M${x},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} H${x} Z`;
}

// SIF part of the bar
function SifSegment({ x, y, width, height, fill, payload }) {
  if (!width || width <= 0) return null;
  return <path d={barPath(x, y, width, height, payload.other === 0 ? RADIUS : 0)} fill={fill} />;
}

// Non-SIF part of the bar
function OtherSegment({ x, y, width, height, fill, payload }) {
  if (!width || width <= 0) return null;
  const offset = payload.sif > 0 ? GAP : 0;
  if (width - offset <= 0) return null;
  return <path d={barPath(x + offset, y, width - offset, height, RADIUS)} fill={fill} />;
}

function TotalLabel({ x, y, width, height, index, data }) {
  const row = data[index];
  if (!row) return null;
  return (
    <text x={x + width + 8} y={y + height / 2} dominantBaseline="central" className="chart-value-label">
      {row.total}
    </text>
  );
}

// Show the SIF count inside the bar only if it fits
function SifLabel({ x, y, width, height, value }) {
  if (!value || width < 20) return null;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      textAnchor="middle"
      dominantBaseline="central"
      className="chart-inset-label"
    >
      {value}
    </text>
  );
}

function RuleTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { rule, sif, other, total } = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{rule}</p>
      <p className="chart-tooltip-row">
        <span className="swatch swatch-sif" aria-hidden="true" />
        SIF precursors <strong>{sif}</strong>
      </p>
      <p className="chart-tooltip-row">
        <span className="swatch swatch-other" aria-hidden="true" />
        Other reports <strong>{other}</strong>
      </p>
      <p className="chart-tooltip-row muted">{total} in total</p>
    </div>
  );
}

export default function RuleBarChart({ data }) {
  const rows = data
    .map((d) => ({ ...d, other: d.total - d.sif }))
    .sort((a, b) => b.total - a.total || b.sif - a.sif || a.rule.localeCompare(b.rule));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 0 }} barSize={BAR_SIZE}>
        <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="rule"
          width={180}
          tick={{ ...AXIS_TICK, fill: 'var(--text)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--chart-baseline)' }}
          interval={0}
        />
        <Tooltip content={<RuleTooltip />} cursor={{ fill: 'var(--chart-cursor)' }} isAnimationActive={false} />
        <Bar dataKey="sif" name="SIF precursors" stackId="r" fill="var(--chart-sif)" shape={SifSegment} isAnimationActive={false}>
          <LabelList dataKey="sif" content={SifLabel} />
        </Bar>
        <Bar dataKey="other" name="Other reports" stackId="r" fill="var(--chart-other)" shape={OtherSegment} isAnimationActive={false}>
          <LabelList dataKey="total" content={(props) => <TotalLabel {...props} data={rows} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
