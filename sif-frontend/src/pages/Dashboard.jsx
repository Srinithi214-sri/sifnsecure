import { ArrowRight, ClipboardCheck, FileText, RefreshCw, Scale, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import HighRiskTable from '../components/dashboard/HighRiskTable';
import KpiCard from '../components/dashboard/KpiCard';
import RuleBarChart from '../components/dashboard/RuleBarChart';
import SifTrendChart from '../components/dashboard/SifTrendChart';
import TopRiskSites from '../components/dashboard/TopRiskSites';
import { getDashboardStats, getReports } from '../services/api';
import { formatMonthLong, formatPercent } from '../utils/format';

const SIF = 'SIF precursor';
const TOP_SITES = 5;
const RECENT_HIGH_RISK = 6;

function useDashboardData() {
  const [state, setState] = useState({ status: 'loading', stats: null, reports: [] });

  const load = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    Promise.all([getDashboardStats(), getReports()])
      .then(([stats, reports]) => !cancelled && setState({ status: 'ready', stats, reports }))
      .catch((error) => !cancelled && setState({ status: 'error', stats: null, reports: [], error }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(load, [load]);
  return { ...state, reload: load };
}

function derive(stats, reports) {
  const agreed = stats.totalReports - stats.disagreements;
  const pendingDisagreements = reports.filter((r) => r.status === 'pending' && !r.agree).length;

  // Flagged if either ML or EEI flags it
  const highRisk = reports
    .filter((r) => r.mlVerdict === SIF || r.eeiVerdict === SIF)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_HIGH_RISK);

  // Sort sites by SIF count, then by highest score
  const maxScore = new Map();
  for (const r of reports) maxScore.set(r.site, Math.max(maxScore.get(r.site) ?? 0, r.sifScore));
  const topSites = stats.bySite
    .filter((s) => s.sif > 0)
    .sort((a, b) => b.sif - a.sif || maxScore.get(b.site) - maxScore.get(a.site))
    .slice(0, TOP_SITES);

  const months = stats.byMonth;
  const period = months.length
    ? `${formatMonthLong(months[0].month).split(' ')[0]} – ${formatMonthLong(months.at(-1).month)}`
    : '';
  const ruleMatched = stats.byRule.reduce((sum, r) => sum + r.total, 0);

  return { agreed, pendingDisagreements, highRisk, topSites, period, ruleMatched };
}

export default function Dashboard() {
  const { status, stats, reports, reload } = useDashboardData();
  const view = useMemo(() => (stats ? derive(stats, reports) : null), [stats, reports]);

  if (status === 'error') {
    return (
      <div className="card state-card" role="alert">
        <h2>Dashboard data could not be loaded</h2>
        <p>Check that the API is reachable, then try again.</p>
        <button type="button" className="btn btn-primary" onClick={reload}>
          <RefreshCw size={16} aria-hidden="true" /> Retry
        </button>
      </div>
    );
  }

  if (!view) return <DashboardSkeleton />;

  const { totalReports, sifPrecursors, pendingReview, disagreements } = stats;

  return (
    <div className="dashboard">
      <div className="dashboard-intro">
        <h2>Safety observations overview</h2>
        <p>
          {view.period} · {stats.bySite.length} sites
        </p>
      </div>

      <section className="kpi-grid" aria-label="Headline figures">
        <KpiCard
          icon={FileText}
          label="Total reports"
          value={totalReports}
          detail={`Unsafe acts, unsafe conditions and near misses from ${stats.bySite.length} sites`}
        />
        <KpiCard
          featured
          icon={ShieldAlert}
          label="SIF precursors flagged"
          value={sifPrecursors}
          detail={`${formatPercent(sifPrecursors / totalReports)} of reports scored 0.50 or above by the ML model`}
        />
        <KpiCard
          icon={ClipboardCheck}
          label="Pending human review"
          value={pendingReview}
          detail={
            <>
              {view.pendingDisagreements} with an ML–EEI disagreement ·{' '}
              <Link to="/review">Open queue</Link>
            </>
          }
        />
        <KpiCard
          icon={Scale}
          label="ML–EEI agreement rate"
          value={formatPercent(view.agreed / totalReports)}
          meter={view.agreed / totalReports}
          detail={`${view.agreed} of ${totalReports} verdicts match · ${disagreements} disagree`}
        />
      </section>

      <section className="card chart-card area-trend" aria-labelledby="trend-title">
        <header className="card-header">
          <div>
            <h3 id="trend-title">SIF precursors per month</h3>
            <p>Reports the ML model flagged as potential serious injury or fatality precursors</p>
          </div>
        </header>
        <div className="chart-frame chart-frame-trend">
          <SifTrendChart data={stats.byMonth} />
        </div>
      </section>

      <section className="card chart-card area-rules" aria-labelledby="rules-title">
        <header className="card-header">
          <div>
            <h3 id="rules-title">Reports by IOGP Life-Saving Rule</h3>
            <p>
              {view.ruleMatched} of {totalReports} reports matched a rule
            </p>
          </div>
          <ul className="legend" aria-label="Legend">
            <li>
              <span className="swatch swatch-sif" aria-hidden="true" /> SIF precursor
            </li>
            <li>
              <span className="swatch swatch-other" aria-hidden="true" /> Other
            </li>
          </ul>
        </header>
        <div className="chart-frame chart-frame-rules">
          <RuleBarChart data={stats.byRule} />
        </div>
      </section>

      <section className="card area-table" aria-labelledby="high-risk-title">
        <header className="card-header">
          <div>
            <h3 id="high-risk-title">Recent high-risk reports</h3>
            <p>Flagged by the ML model or over the 500 ft-lb energy threshold</p>
          </div>
          <Link to="/reports" className="card-link">
            All reports <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </header>
        <HighRiskTable reports={view.highRisk} />
      </section>

      <section className="card area-sites" aria-labelledby="sites-title">
        <header className="card-header">
          <div>
            <h3 id="sites-title">Top-risk sites</h3>
            <p>SIF precursors out of all reports at the site</p>
          </div>
        </header>
        <TopRiskSites sites={view.topSites} />
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard" aria-busy="true" aria-label="Loading dashboard">
      <div className="dashboard-intro">
        <span className="skeleton" style={{ width: 260, height: 22 }} />
      </div>
      <div className="kpi-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card kpi-card">
            <span className="skeleton" style={{ width: '55%', height: 14 }} />
            <span className="skeleton" style={{ width: 72, height: 36, marginTop: 14 }} />
            <span className="skeleton" style={{ width: '85%', height: 12, marginTop: 14 }} />
          </div>
        ))}
      </div>
      {['area-trend', 'area-rules', 'area-table', 'area-sites'].map((area) => (
        <div key={area} className={`card ${area}`}>
          <span className="skeleton" style={{ width: '40%', height: 18 }} />
          <span className="skeleton" style={{ width: '100%', height: 240, marginTop: 20 }} />
        </div>
      ))}
    </div>
  );
}
