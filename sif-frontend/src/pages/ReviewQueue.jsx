import { Check, RefreshCw, RotateCcw, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import RiskBadge from '../components/RiskBadge';
import TableSkeleton from '../components/TableSkeleton';
import Toast from '../components/Toast';
import { getReports } from '../services/api';
import { BORDERLINE_MAX, BORDERLINE_MIN, NOT_SIF, SIF, isBorderline, needsReview } from '../utils/domain';
import { formatDate, splitSite } from '../utils/format';

const TABS = [
  { key: 'pending', label: 'Needs decision' },
  { key: 'decided', label: 'Decided' },
  { key: 'all', label: 'All' },
];

const flip = (verdict) => (verdict === SIF ? NOT_SIF : SIF);

// Sort: disagreements first, then scores closest to 0.50
const byPriority = (a, b) => a.agree - b.agree || Math.abs(a.sifScore - 0.5) - Math.abs(b.sifScore - 0.5);

export default function ReviewQueue() {
  const [state, setState] = useState({ status: 'loading', reports: [] });
  // Reviewer decisions: id -> { action: 'confirm' | 'override', verdict }
  const [decisions, setDecisions] = useState({});
  const [tab, setTab] = useState('pending');
  const [toast, setToast] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', reports: [] });
    getReports()
      .then((all) => !cancelled && setState({ status: 'ready', reports: all.filter(needsReview).sort(byPriority) }))
      .catch(() => !cancelled && setState({ status: 'error', reports: [] }));
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(load, [load]);

  const rows = useMemo(
    () =>
      state.reports.map((r) => {
        const decision = decisions[r.id];
        return { ...r, decision, isDecided: Boolean(decision) || r.status === 'reviewed' };
      }),
    [state.reports, decisions],
  );
  const counts = {
    pending: rows.filter((r) => !r.isDecided).length,
    decided: rows.filter((r) => r.isDecided).length,
    all: rows.length,
  };
  const visible = rows.filter((r) => tab === 'all' || (tab === 'decided') === r.isDecided);
  const disagreements = state.reports.filter((r) => !r.agree).length;
  const borderline = state.reports.filter(isBorderline).length;

  const closeToast = useCallback(() => setToast(null), []);

  function decide(report, action) {
    const verdict = action === 'confirm' ? report.mlVerdict : flip(report.mlVerdict);
    setDecisions((d) => ({ ...d, [report.id]: { action, verdict } }));
    setToast({
      key: Date.now(),
      id: report.id,
      message: `${report.id} ${action === 'confirm' ? 'confirmed' : 'overridden'} as ${verdict}.`,
    });
  }

  function undo(id) {
    setDecisions(({ [id]: _removed, ...rest }) => rest);
    setToast(null);
  }

  if (state.status === 'error') {
    return (
      <div className="card state-card" role="alert">
        <h2 className="section-title">The review queue could not be loaded</h2>
        <p>Check that the API is reachable, then try again.</p>
        <button type="button" className="btn btn-primary" onClick={load}>
          <RefreshCw size={16} aria-hidden="true" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-intro">
        <div>
          <h2 className="section-title">Reports waiting for a person</h2>
          <p>
            The engine sends a report here when the ML model and the energy check disagree, or when the SIF
            score sits between {BORDERLINE_MIN.toFixed(2)} and {BORDERLINE_MAX.toFixed(2)}. Confirm keeps the
            ML verdict; Override replaces it.
          </p>
        </div>
        {state.status === 'ready' && (
          <dl className="mini-stats">
            <div>
              <dt>ML–EEI disagreements</dt>
              <dd>{disagreements}</dd>
            </div>
            <div>
              <dt>Borderline scores</dt>
              <dd>{borderline}</dd>
            </div>
          </dl>
        )}
      </div>

      <section className="card table-card" aria-label="Review queue">
        <div className="tabs" role="group" aria-label="Filter by decision">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={tab === t.key}
              className="tab"
              onClick={() => setTab(t.key)}
            >
              {t.label} <span className="tab-count">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        {state.status === 'loading' ? (
          <TableSkeleton />
        ) : visible.length === 0 ? (
          <div className="empty-table">
            <Check size={28} aria-hidden="true" />
            <p>{tab === 'pending' ? 'Queue cleared. Every report here has a decision.' : 'Nothing here yet.'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table review-table">
              <thead>
                <tr>
                  <th scope="col">Report</th>
                  <th scope="col">What happened</th>
                  <th scope="col" className="num">
                    SIF score
                  </th>
                  <th scope="col">ML / EEI</th>
                  <th scope="col">Why it is here</th>
                  <th scope="col">Decision</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <ReviewRow key={r.id} report={r} onDecide={decide} onUndo={undo} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {toast && (
        <Toast key={toast.key} message={toast.message} onUndo={() => undo(toast.id)} onClose={closeToast} />
      )}
    </div>
  );
}

function VerdictPill({ label, verdict }) {
  return (
    <span className={`verdict-pill ${verdict === SIF ? 'is-sif' : 'is-clear'}`}>
      <span className="verdict-pill-key">{label}</span>
      {verdict === SIF ? 'SIF' : 'Not SIF'}
    </span>
  );
}

function ReviewRow({ report: r, onDecide, onUndo }) {
  const { name } = splitSite(r.site);
  return (
    <tr className={r.decision ? 'is-decided' : undefined}>
      <td>
        <Link to={`/analysis/${encodeURIComponent(r.id)}`} className="row-link mono">
          {r.id}
        </Link>
        <span className="cell-sub">
          {formatDate(r.date)} · {name}
        </span>
      </td>
      <td className="excerpt-cell">
        <p className="excerpt">{r.text}</p>
      </td>
      <td className="num">
        <RiskBadge score={r.sifScore} />
      </td>
      <td>
        <div className="verdict-pair">
          <VerdictPill label="ML" verdict={r.mlVerdict} />
          <VerdictPill label="EEI" verdict={r.eeiVerdict} />
        </div>
      </td>
      <td>
        <div className="reason-chips">
          {!r.agree && <span className="chip chip-warn">Disagreement</span>}
          {isBorderline(r) && <span className="chip chip-neutral">Borderline score</span>}
        </div>
      </td>
      <td className="decision-cell">
        {r.decision ? (
          <div className="decision-done">
            <span className={`decision-tag ${r.decision.action}`}>
              {r.decision.action === 'confirm' ? <Check size={14} aria-hidden="true" /> : <RotateCcw size={14} aria-hidden="true" />}
              {r.decision.action === 'confirm' ? 'Confirmed' : 'Overridden'}: {r.decision.verdict}
            </span>
            <button type="button" className="link-button" onClick={() => onUndo(r.id)}>
              <Undo2 size={13} aria-hidden="true" /> Undo
            </button>
          </div>
        ) : r.status === 'reviewed' ? (
          <span className="status status-reviewed">Reviewed</span>
        ) : (
          <div className="decision-actions">
            <button
              type="button"
              className="btn btn-sm btn-confirm"
              onClick={() => onDecide(r, 'confirm')}
              title={`Keep the ML verdict: ${r.mlVerdict}`}
            >
              <Check size={14} aria-hidden="true" /> Confirm
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => onDecide(r, 'override')}
              title={`Change the verdict to ${flip(r.mlVerdict)}`}
            >
              <RotateCcw size={14} aria-hidden="true" /> Override
            </button>
            <span className="decision-hint">ML says {r.mlVerdict}</span>
          </div>
        )}
      </td>
    </tr>
  );
}
