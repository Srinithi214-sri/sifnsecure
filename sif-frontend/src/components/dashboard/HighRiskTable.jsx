import { useNavigate, Link } from 'react-router-dom';
import RiskBadge from '../RiskBadge';
import { formatDate, splitSite } from '../../utils/format';

// Table of high-risk reports; clicking a row opens the report
export default function HighRiskTable({ reports }) {
  const navigate = useNavigate();

  if (!reports.length) return <p className="empty-note">No high-risk reports yet.</p>;

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Report</th>
            <th scope="col">Life-saving rule</th>
            <th scope="col" className="num">
              SIF score
            </th>
            <th scope="col">ML / EEI</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => {
            const { name } = splitSite(r.site);
            const href = `/analysis/${encodeURIComponent(r.id)}`;
            return (
              <tr key={r.id} className="clickable-row" onClick={() => navigate(href)}>
                <td>
                  <Link to={href} className="row-link mono" onClick={(e) => e.stopPropagation()}>
                    {r.id}
                  </Link>
                  <span className="cell-sub">
                    {formatDate(r.date)} · {name}
                  </span>
                </td>
                <td>{r.iogpRule ?? <span className="text-muted">No rule matched</span>}</td>
                <td className="num">
                  <RiskBadge score={r.sifScore} />
                </td>
                <td>
                  {r.agree ? (
                    <span className="chip chip-neutral">Agree</span>
                  ) : (
                    <span className="chip chip-warn" title={`ML: ${r.mlVerdict} · EEI: ${r.eeiVerdict}`}>
                      Disagree
                    </span>
                  )}
                </td>
                <td>
                  <span className={`status status-${r.status}`}>
                    {r.status === 'pending' ? 'Pending review' : 'Reviewed'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
