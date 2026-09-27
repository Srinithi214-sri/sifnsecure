import { ArrowDown, ArrowUp, ChevronDown, RefreshCw, ScanSearch, Search, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SimilarIncidents from '../components/explorer/SimilarIncidents';
import RiskBadge from '../components/RiskBadge';
import TableSkeleton from '../components/TableSkeleton';
import { getReports } from '../services/api';
import { IOGP_RULE_TEXT, REPORT_TYPES } from '../utils/domain';
import { RISK_LABELS, formatDate, riskLevel, splitSite } from '../utils/format';

const NO_RULE = '__none__';
const EMPTY_FILTERS = { q: '', risk: '', type: '', site: '', rule: '' };
const COLUMN_COUNT = 7;

const typeLabel = (value) => REPORT_TYPES.find((t) => t.value === value)?.label ?? value;

function matches(r, f) {
  if (f.risk && riskLevel(r.sifScore) !== f.risk) return false;
  if (f.type && r.reportType !== f.type) return false;
  if (f.site && r.site !== f.site) return false;
  if (f.rule && (f.rule === NO_RULE ? r.iogpRule !== null : r.iogpRule !== f.rule)) return false;
  const q = f.q.trim().toLowerCase();
  if (!q) return true;
  return [r.id, r.text, r.site, r.iogpRule, r.entities.equipment, r.entities.activity, r.entities.energySource]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(q));
}

export default function ReportExplorer() {
  const [state, setState] = useState({ status: 'loading', reports: [] });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [openId, setOpenId] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getReports()
      .then((reports) => !cancelled && setState({ status: 'ready', reports }))
      .catch(() => !cancelled && setState({ status: 'error', reports: [] }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const sites = useMemo(() => [...new Set(state.reports.map((r) => r.site))].sort(), [state.reports]);

  const rows = useMemo(() => {
    const list = state.reports.filter((r) => matches(r, filters));
    const sign = sort.dir === 'asc' ? 1 : -1;
    const value = sort.key === 'score' ? (r) => r.sifScore : (r) => r.date;
    return list.sort((a, b) => (value(a) < value(b) ? -1 : value(a) > value(b) ? 1 : 0) * sign);
  }, [state.reports, filters, sort]);

  const activeFilters = Object.entries(filters).filter(([, v]) => v).length;
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  const toggleOpen = (id) => setOpenId((current) => (current === id ? null : id));

  if (state.status === 'error') {
    return (
      <div className="card state-card" role="alert">
        <h2 className="section-title">Reports could not be loaded</h2>
        <p>Check that the API is reachable, then try again.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setState({ status: 'loading', reports: [] });
            setAttempt((n) => n + 1);
          }}
        >
          <RefreshCw size={16} aria-hidden="true" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="card filter-bar" aria-label="Search and filters">
        <div className="search-field">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={filters.q}
            onChange={set('q')}
            placeholder="Search text, ID, equipment or activity"
            aria-label="Search reports"
          />
        </div>
        <label className="select-field">
          <span>Risk level</span>
          <select value={filters.risk} onChange={set('risk')}>
            <option value="">All levels</option>
            {Object.entries(RISK_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span>Report type</span>
          <select value={filters.type} onChange={set('type')}>
            <option value="">All types</option>
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span>Site</span>
          <select value={filters.site} onChange={set('site')}>
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span>IOGP rule</span>
          <select value={filters.rule} onChange={set('rule')}>
            <option value="">All rules</option>
            {Object.keys(IOGP_RULE_TEXT).map((rule) => (
              <option key={rule} value={rule}>
                {rule}
              </option>
            ))}
            <option value={NO_RULE}>No rule matched</option>
          </select>
        </label>
      </section>

      <section className="card table-card" aria-label="Reports">
        <div className="table-toolbar">
          <p aria-live="polite">
            {state.status === 'loading' ? (
              'Loading reports…'
            ) : (
              <>
                <strong>{rows.length}</strong> of {state.reports.length} reports
              </>
            )}
          </p>
          {activeFilters > 0 && (
            <button type="button" className="link-button" onClick={() => setFilters(EMPTY_FILTERS)}>
              <X size={14} aria-hidden="true" /> Clear {activeFilters === 1 ? 'filter' : `${activeFilters} filters`}
            </button>
          )}
        </div>

        {state.status === 'loading' ? (
          <TableSkeleton rows={8} />
        ) : rows.length === 0 ? (
          <div className="empty-table">
            <ScanSearch size={28} aria-hidden="true" />
            <p>No reports match these filters.</p>
            <button type="button" className="btn btn-ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table explorer-table">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="visually-hidden">Details</span>
                  </th>
                  <th scope="col">Report</th>
                  <SortHeader col="date" label="Date" sort={sort} onSort={toggleSort} />
                  <th scope="col">Type</th>
                  <th scope="col">IOGP rule</th>
                  <SortHeader col="score" label="Severity" className="num" sort={sort} onSort={toggleSort} />
                  <th scope="col">ML / EEI</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const open = openId === r.id;
                  const { name, place } = splitSite(r.site);
                  return (
                    <Fragment key={r.id}>
                      <tr className={`clickable-row${open ? ' is-open' : ''}`} onClick={() => toggleOpen(r.id)}>
                        <td className="expand-cell">
                          <button
                            type="button"
                            className="expand-button"
                            aria-expanded={open}
                            aria-controls={`detail-${r.id}`}
                            aria-label={`${open ? 'Hide' : 'Show'} details for ${r.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleOpen(r.id);
                            }}
                          >
                            <ChevronDown size={16} aria-hidden="true" />
                          </button>
                        </td>
                        <td>
                          <span className="row-id mono">{r.id}</span>
                          <span className="cell-sub" title={r.site}>
                            {name}
                            {place ? `, ${place}` : ''}
                          </span>
                        </td>
                        <td className="nowrap">{formatDate(r.date)}</td>
                        <td className="nowrap">{typeLabel(r.reportType)}</td>
                        <td>{r.iogpRule ?? <span className="text-muted">—</span>}</td>
                        <td className="num">
                          <RiskBadge score={r.sifScore} />
                        </td>
                        <td>
                          {r.agree ? (
                            <span className="chip chip-neutral">Agree</span>
                          ) : (
                            <span className="chip chip-warn">Disagree</span>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr className="detail-row" id={`detail-${r.id}`}>
                          <td colSpan={COLUMN_COUNT}>
                            <ReportDetail report={r} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SortHeader({ col, label, className, sort, onSort }) {
  const active = sort.key === col;
  const Arrow = sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th scope="col" className={className} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort-button" onClick={() => onSort(col)}>
        {label}
        {active && <Arrow size={12} aria-hidden="true" />}
      </button>
    </th>
  );
}

function ReportDetail({ report: r }) {
  const facts = [
    ['ML verdict', r.mlVerdict],
    ['EEI verdict', r.eeiVerdict],
    ['Energy', r.eei.energyFtLbs === null ? 'No estimate' : `${r.eei.energyFtLbs.toLocaleString('en-IN')} ft-lbs`],
    ['Energy source', r.entities.energySource ?? '—'],
    ['Equipment', r.entities.equipment ?? '—'],
    ['Status', r.status === 'pending' ? 'Pending review' : 'Reviewed'],
  ];
  return (
    <div className="report-detail">
      <div className="report-detail-main">
        <blockquote className="report-text">{r.text}</blockquote>
        <dl className="fact-grid">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <Link to={`/analysis/${encodeURIComponent(r.id)}`} className="btn btn-primary">
          Open full analysis
        </Link>
      </div>
      <SimilarIncidents report={r} />
    </div>
  );
}
