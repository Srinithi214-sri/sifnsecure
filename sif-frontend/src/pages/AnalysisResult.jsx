import { ArrowLeft, FilePlus, ShieldCheck, ShieldQuestion, TableProperties } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EnergyCheck from '../components/analysis/EnergyCheck';
import SifGauge from '../components/analysis/SifGauge';
import VerdictPanel from '../components/analysis/VerdictPanel';
import { getReport } from '../services/api';
import { IOGP_RULE_TEXT, REPORT_TYPES } from '../utils/domain';
import { formatDate } from '../utils/format';

const ENTITY_FIELDS = [
  ['energySource', 'Energy source'],
  ['height', 'Height'],
  ['equipment', 'Equipment'],
  ['activity', 'Activity'],
];

function useReport(id) {
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setState({ status: 'loading' });
    getReport(id)
      .then((report) => !cancelled && setState({ status: 'ready', report }))
      .catch((error) => !cancelled && setState({ status: 'error', error }));
    return () => {
      cancelled = true;
    };
  }, [id]);
  return state;
}

export default function AnalysisResult() {
  const { id } = useParams();
  const state = useReport(id);

  if (!id) {
    return (
      <EmptyState
        title="No report selected"
        body="Submit a new observation, or open one from the dashboard or the report explorer to see its analysis."
      />
    );
  }
  if (state.status === 'error') {
    return (
      <EmptyState
        title={`Report ${id} could not be found`}
        body="New analyses are kept only for this browser session, so they disappear after a reload."
      />
    );
  }
  if (state.status === 'loading') return <AnalysisSkeleton />;

  const { report } = state;
  const isDraft = report.id.startsWith('DRAFT-');
  const typeLabel = REPORT_TYPES.find((t) => t.value === report.reportType)?.label ?? report.reportType;

  return (
    <div className="analysis">
      <header className="analysis-head">
        <Link to="/" className="back-link">
          <ArrowLeft size={14} aria-hidden="true" /> Dashboard
        </Link>
        <div className="analysis-title">
          {isDraft ? (
            <>
              <h2>New report</h2>
              <span className="chip chip-neutral">Not yet saved</span>
            </>
          ) : (
            <>
              <h2 className="mono">{report.id}</h2>
              <span className={`status status-${report.status}`}>
                {report.status === 'pending' ? 'Pending review' : 'Reviewed'}
              </span>
            </>
          )}
        </div>
        <p className="analysis-meta">
          {typeLabel} · {report.site} · {formatDate(report.date)}
        </p>
      </header>

      <section className="card area-gauge" aria-labelledby="score-title">
        <header className="card-header">
          <div>
            <h3 id="score-title">SIF score</h3>
            <p>ML model score from 0 to 1. At 0.50 or above the report is flagged as a SIF precursor.</p>
          </div>
        </header>
        <SifGauge score={report.sifScore} />
      </section>

      <section className="card area-verdict" aria-labelledby="verdict-title">
        <header className="card-header">
          <div>
            <h3 id="verdict-title">ML verdict vs EEI verdict</h3>
            <p>Two independent checks: what the words say, and what the physics says</p>
          </div>
        </header>
        <VerdictPanel report={report} />
      </section>

      <section className="card area-energy" aria-labelledby="energy-title">
        <header className="card-header">
          <div>
            <h3 id="energy-title">Energy check (EEI)</h3>
            <p>Energy that could have been released, against the 500 ft-lbs serious-injury threshold</p>
          </div>
        </header>
        <EnergyCheck eei={report.eei} energySource={report.entities.energySource} height={report.entities.height} />
      </section>

      <section className="card area-rule" aria-labelledby="rule-title">
        <header className="card-header">
          <div>
            <h3 id="rule-title">IOGP Life-Saving Rule</h3>
            <p>The rule this observation relates to</p>
          </div>
        </header>
        {report.iogpRule ? (
          <div className="rule-match">
            <span className="rule-icon" aria-hidden="true">
              <ShieldCheck size={26} />
            </span>
            <div>
              <p className="rule-name">{report.iogpRule}</p>
              <p className="rule-text">{IOGP_RULE_TEXT[report.iogpRule]}</p>
            </div>
          </div>
        ) : (
          <div className="rule-match rule-none">
            <span className="rule-icon" aria-hidden="true">
              <ShieldQuestion size={26} />
            </span>
            <div>
              <p className="rule-name">No rule matched</p>
              <p className="rule-text">The text does not clearly relate to any of the nine Life-Saving Rules.</p>
            </div>
          </div>
        )}
      </section>

      <section className="card area-text" aria-labelledby="text-title">
        <header className="card-header">
          <div>
            <h3 id="text-title">Report and extracted entities</h3>
            <p>What the engine pulled out of the text</p>
          </div>
        </header>
        <ul className="entity-list">
          {ENTITY_FIELDS.map(([key, label]) => {
            const value = report.entities[key];
            return (
              <li key={key} className={`entity-chip${value ? '' : ' is-empty'}`}>
                <span className="entity-key">{label}</span>
                <span className="entity-value">{value ?? 'Not found'}</span>
              </li>
            );
          })}
        </ul>
        <blockquote className="report-text">{report.text}</blockquote>
      </section>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="card state-card">
      <h2 className="section-title">{title}</h2>
      <p>{body}</p>
      <div className="form-actions">
        <Link to="/submit" className="btn btn-primary">
          <FilePlus size={16} aria-hidden="true" /> Submit a report
        </Link>
        <Link to="/reports" className="btn btn-ghost">
          <TableProperties size={16} aria-hidden="true" /> Browse reports
        </Link>
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="analysis" aria-busy="true" aria-label="Loading analysis">
      <div className="analysis-head">
        <span className="skeleton" style={{ width: 240, height: 28 }} />
      </div>
      {['area-gauge', 'area-verdict', 'area-energy', 'area-rule'].map((area) => (
        <div key={area} className={`card ${area}`}>
          <span className="skeleton" style={{ width: '45%', height: 18 }} />
          <span className="skeleton" style={{ width: '100%', height: 180, marginTop: 20 }} />
        </div>
      ))}
    </div>
  );
}
