import { RISK_LABELS, riskLevel } from '../../utils/format';
import { ML_SIF_THRESHOLD } from '../../utils/domain';

const CX = 110;
const CY = 110;
const R = 88;

// Point on the arc for t in [0, 1]
const point = (t, r = R) => {
  const a = Math.PI * (1 - t);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
};

// Half-circle gauge for the SIF score; the tick marks the ML threshold
export default function SifGauge({ score }) {
  const level = riskLevel(score);

  const [tx1, ty1] = point(ML_SIF_THRESHOLD, R - 16);
  const [tx2, ty2] = point(ML_SIF_THRESHOLD, R + 16);
  const [lx, ly] = point(ML_SIF_THRESHOLD, R + 28);
  const arc = `M${CX - R},${CY} A${R},${R} 0 0 1 ${CX + R},${CY}`;

  return (
    <figure className={`gauge gauge-${level}`}>
      <svg viewBox="0 0 220 128" role="img" aria-label={`SIF score ${score.toFixed(2)} out of 1, ${RISK_LABELS[level]} risk`}>
        <path d={arc} className="gauge-track" pathLength="100" />
        <path d={arc} key={score} className="gauge-fill" pathLength="100" strokeDasharray={`${score * 100} 200`} />
        <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} className="gauge-tick" />
        <text x={lx} y={ly} textAnchor="middle" className="gauge-tick-label">
          {ML_SIF_THRESHOLD.toFixed(2)}
        </text>
        <text x={CX - R} y={CY + 16} textAnchor="middle" className="gauge-end-label">
          0
        </text>
        <text x={CX + R} y={CY + 16} textAnchor="middle" className="gauge-end-label">
          1
        </text>
      </svg>
      <figcaption className="gauge-readout">
        <span className="gauge-value">{score.toFixed(2)}</span>
        <span className={`risk-pill risk-${level}`}>{RISK_LABELS[level]} risk</span>
      </figcaption>
    </figure>
  );
}
