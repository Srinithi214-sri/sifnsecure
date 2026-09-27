import { Info } from 'lucide-react';
import { EEI_THRESHOLD_FT_LBS, energyMethod } from '../../utils/domain';

// Energy bar uses a log scale (1 to 10^7 ft-lbs)
const MAX_EXP = 7;
const TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000];
const pos = (v) => `${(Math.log10(Math.max(v, 1)) / MAX_EXP) * 100}%`;
const tickLabel = (v) => (v >= 1_000_000 ? `${v / 1_000_000}M` : v >= 1_000 ? `${v / 1_000}k` : String(v));
const num = new Intl.NumberFormat('en-IN');

export default function EnergyCheck({ eei, energySource, height }) {
  const { energyFtLbs, exceedsThreshold } = eei;
  const method = energyMethod(energySource);

  if (energyFtLbs === null) {
    return (
      <div className="energy energy-na">
        <p className="energy-value">
          <span className="energy-number">—</span>
          <span className="energy-unit">no estimate</span>
        </p>
        <p className="energy-note">
          <Info size={16} aria-hidden="true" />
          <span>
            The EEI measures mechanical energy only (gravity, motion, pressure).
            {energySource
              ? ` The energy source here (${energySource}) falls outside it, so the EEI cannot call this a SIF precursor on its own.`
              : ' No energy source was found in the text.'}
          </span>
        </p>
      </div>
    );
  }

  const ratio = energyFtLbs / EEI_THRESHOLD_FT_LBS;
  const comparison = exceedsThreshold
    ? `${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}× the threshold`
    : `${Math.round(ratio * 100)}% of the threshold`;

  return (
    <div className={`energy ${exceedsThreshold ? 'energy-over' : 'energy-under'}`}>
      <p className="energy-value">
        <span className="energy-number">{num.format(energyFtLbs)}</span>
        <span className="energy-unit">ft-lbs</span>
        <span className="energy-compare">{comparison}</span>
      </p>

      <div
        className="energy-scale"
        role="img"
        aria-label={`${num.format(energyFtLbs)} ft-lbs against a ${EEI_THRESHOLD_FT_LBS} ft-lbs threshold`}
      >
        <div className="energy-zone" style={{ left: pos(EEI_THRESHOLD_FT_LBS) }}>
          <span>SIF zone</span>
        </div>
        <div className="energy-bar" style={{ width: pos(energyFtLbs) }} />
        <div className="energy-threshold" style={{ left: pos(EEI_THRESHOLD_FT_LBS) }}>
          <span>{EEI_THRESHOLD_FT_LBS} ft-lbs</span>
        </div>
      </div>
      <div className="energy-ticks" aria-hidden="true">
        {TICKS.map((t) => (
          <span key={t} style={{ left: pos(t) }}>
            {tickLabel(t)}
          </span>
        ))}
      </div>

      <p className="energy-note">
        <Info size={16} aria-hidden="true" />
        <span>
          {method ?? 'Estimated from the energy source in the text'}
          {height ? `, with a height of ${height}` : ''}. Log scale.
        </span>
      </p>
    </div>
  );
}
