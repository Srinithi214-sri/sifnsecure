import { splitSite } from '../../utils/format';

// Sites with the most SIF precursors
export default function TopRiskSites({ sites }) {
  if (!sites.length) return <p className="empty-note">No SIF precursors flagged at any site.</p>;

  return (
    <ol className="site-list">
      {sites.map((s, i) => {
        const { name, place } = splitSite(s.site);
        return (
          <li key={s.site} className="site-row">
            <span className="site-rank" aria-hidden="true">
              {i + 1}
            </span>
            <div className="site-body">
              <div className="site-line">
                <span className="site-name" title={s.site}>
                  {name}
                </span>
                <span className="site-count">
                  <strong>{s.sif}</strong> of {s.total}
                </span>
              </div>
              {place && <span className="site-place">{place}</span>}
              <div
                className="site-meter"
                role="img"
                aria-label={`${s.sif} of ${s.total} reports flagged as SIF precursors`}
              >
                <span style={{ width: `${(s.sif / s.total) * 100}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
