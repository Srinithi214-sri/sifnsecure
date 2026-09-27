import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RiskBadge from '../RiskBadge';
import { getSimilarReports } from '../../services/api';
import { formatDate, splitSite } from '../../utils/format';

// What a similar incident has in common with this report
function sharedTraits(base, other) {
  const traits = [];
  if (base.iogpRule && base.iogpRule === other.iogpRule) traits.push(`Same rule: ${base.iogpRule}`);
  const energy = (r) => r.entities.energySource?.split(' ')[0];
  if (energy(base) && energy(base) === energy(other)) traits.push(`${energy(base)} energy`);
  if (base.site === other.site) traits.push('Same site');
  if (base.reportType === other.reportType) traits.push(`Also a ${base.reportType}`);
  return traits.slice(0, 2);
}

export default function SimilarIncidents({ report }) {
  const [state, setState] = useState({ status: 'loading', items: [] });

  useEffect(() => {
    let cancelled = false;
    getSimilarReports(report.id)
      .then((items) => !cancelled && setState({ status: 'ready', items }))
      .catch(() => !cancelled && setState({ status: 'error', items: [] }));
    return () => {
      cancelled = true;
    };
  }, [report.id]);

  return (
    <section className="similar" aria-label={`Similar past incidents to ${report.id}`}>
      <h4>Similar past incidents</h4>
      {state.status === 'loading' && (
        <div className="similar-list">
          {[0, 1].map((i) => (
            <span key={i} className="skeleton" style={{ height: 92 }} />
          ))}
        </div>
      )}
      {state.status === 'error' && <p className="empty-note">Similar incidents could not be loaded.</p>}
      {state.status === 'ready' && state.items.length === 0 && (
        <p className="empty-note">No similar incidents found.</p>
      )}
      {state.status === 'ready' && state.items.length > 0 && (
        <ul className="similar-list">
          {state.items.map((s) => (
            <li key={s.id} className="similar-card">
              <div className="similar-head">
                <Link to={`/analysis/${encodeURIComponent(s.id)}`} className="row-link mono">
                  {s.id}
                </Link>
                <RiskBadge score={s.sifScore} />
              </div>
              <p className="similar-meta">
                {formatDate(s.date)} · {splitSite(s.site).name}
              </p>
              <p className="excerpt">{s.text}</p>
              <div className="similar-traits">
                {sharedTraits(report, s).map((t) => (
                  <span key={t} className="chip chip-neutral">
                    {t}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
