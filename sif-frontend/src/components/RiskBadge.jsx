import { RISK_LABELS, riskLevel } from '../utils/format';

// Shows the SIF score with its risk level
export default function RiskBadge({ score }) {
  const level = riskLevel(score);
  return (
    <span className={`risk-badge risk-${level}`}>
      <span className="risk-badge-score">{score.toFixed(2)}</span>
      <span className="risk-badge-label">{RISK_LABELS[level]}</span>
    </span>
  );
}
