import { ArrowRight, CircleCheck, FileSpreadsheet, RefreshCw, Upload, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { importReports } from '../../services/api';
import { REPORT_TYPES } from '../../utils/domain';

const ACCEPT = '.csv,.xlsx,.xls';
const MAX_BYTES = 10 * 1024 * 1024;
const PROGRESS_STEPS = ['Reading rows', 'Scoring SIF potential', 'Checking energy against 500 ft-lbs', 'Tagging IOGP rules'];
const STEP_MS = 600;

const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function checkFile(file) {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) return 'Choose a .csv, .xlsx or .xls file.';
  if (file.size > MAX_BYTES) return 'The file is larger than 10 MB.';
  return null;
}

export default function BulkImport() {
  const inputId = useId();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  // idle -> running -> done | failed
  const [phase, setPhase] = useState('idle');
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Change the progress text while importing
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, PROGRESS_STEPS.length - 1)), STEP_MS);
    return () => clearInterval(id);
  }, [phase]);

  function pick(candidate) {
    if (!candidate) return;
    const problem = checkFile(candidate);
    setError(problem);
    setFile(problem ? null : candidate);
  }

  async function run(source) {
    setPhase('running');
    setStep(0);
    setError(null);
    try {
      const result = await importReports(source);
      if (!alive.current) return;
      setSummary(result);
      setPhase('done');
    } catch {
      if (!alive.current) return;
      setPhase('failed');
    }
  }

  function reset() {
    setFile(null);
    setSummary(null);
    setError(null);
    setPhase('idle');
    if (inputRef.current) inputRef.current.value = '';
  }

  if (phase === 'done' && summary) return <ImportSummary summary={summary} onReset={reset} />;

  if (phase === 'running' || phase === 'failed') {
    const failed = phase === 'failed';
    return (
      <section className="card import-card" aria-labelledby="import-title">
        <h2 id="import-title" className="section-title">
          {failed ? 'Import failed' : 'Analysing file'}
        </h2>
        <p className="import-file-line">
          <FileSpreadsheet size={18} aria-hidden="true" /> {file?.name ?? 'sample-safety-reports.csv'}
        </p>
        {failed ? (
          <>
            <p className="field-error">The file could not be analysed. Check the API, then try again.</p>
            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={() => run(file)}>
                <RefreshCw size={16} aria-hidden="true" /> Try again
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset}>
                Choose another file
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="import-progress" aria-hidden="true">
              <span />
            </div>
            <p className="pipeline-status" role="status" aria-live="polite">
              {PROGRESS_STEPS[step]}…
            </p>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="card import-card" aria-labelledby="import-title">
      <header className="card-header">
        <div>
          <h2 id="import-title" className="section-title">
            Import a batch of reports
          </h2>
          <p>Upload an export from your incident system. Every row is run through the same five-stage analysis.</p>
        </div>
      </header>

      <label
        htmlFor={inputId}
        className={`drop-zone${dragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="visually-hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {file ? (
          <>
            <FileSpreadsheet size={32} aria-hidden="true" />
            <span className="drop-title">{file.name}</span>
            <span className="drop-hint">{formatSize(file.size)} · click to choose a different file</span>
          </>
        ) : (
          <>
            <Upload size={32} aria-hidden="true" />
            <span className="drop-title">Drop a CSV or Excel file here, or click to browse</span>
            <span className="drop-hint">.csv, .xlsx or .xls, up to 10 MB</span>
          </>
        )}
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <div className="import-columns">
        <span className="field-hint">Expected columns</span>
        {['report_text', 'site', 'date', 'report_type'].map((c) => (
          <code key={c}>{c}</code>
        ))}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-lg" disabled={!file} onClick={() => run(file)}>
          <Upload size={16} aria-hidden="true" /> Analyse file
        </button>
        {file ? (
          <button type="button" className="btn btn-ghost btn-lg" onClick={reset}>
            <X size={16} aria-hidden="true" /> Remove
          </button>
        ) : (
          <button type="button" className="btn btn-ghost btn-lg" onClick={() => run(null)}>
            <FileSpreadsheet size={16} aria-hidden="true" /> Use sample file
          </button>
        )}
      </div>
      <p className="prototype-note">
        Prototype: any file loads the 30 sample reports, so the numbers match the dashboard.
      </p>
    </section>
  );
}

function ImportSummary({ summary, onReset }) {
  const { fileName, analysed, sifPrecursors, sentToReview, ruleMatched, byReportType } = summary;
  const label = (value) => REPORT_TYPES.find((t) => t.value === value)?.label ?? value;

  return (
    <section className="card import-card import-done" aria-labelledby="import-title">
      <div className="import-done-head">
        <CircleCheck size={28} aria-hidden="true" />
        <div>
          <h2 id="import-title" className="section-title">
            {analysed} reports analysed — {sifPrecursors} SIF precursors flagged
          </h2>
          <p className="import-file-line">
            <FileSpreadsheet size={16} aria-hidden="true" /> {fileName}
          </p>
        </div>
      </div>

      <dl className="import-stats">
        <div>
          <dt>Analysed</dt>
          <dd>{analysed}</dd>
        </div>
        <div className="is-accent">
          <dt>SIF precursors</dt>
          <dd>{sifPrecursors}</dd>
        </div>
        <div>
          <dt>ML–EEI disagreements</dt>
          <dd>{sentToReview}</dd>
        </div>
        <div>
          <dt>Matched an IOGP rule</dt>
          <dd>{ruleMatched}</dd>
        </div>
      </dl>

      <div className="import-types-head">
        <h3>By report type</h3>
        <ul className="legend" aria-label="Legend">
          <li>
            <span className="swatch swatch-sif" aria-hidden="true" /> SIF precursor
          </li>
          <li>
            <span className="swatch swatch-other" aria-hidden="true" /> Other
          </li>
        </ul>
      </div>
      <ul className="import-types">
        {byReportType.map((t) => (
          <li key={t.reportType}>
            <span>{label(t.reportType)}</span>
            <span className="import-type-bar" aria-hidden="true">
              <span style={{ width: `${(t.total / analysed) * 100}%` }}>
                <span style={{ width: t.total ? `${(t.sif / t.total) * 100}%` : 0 }} />
              </span>
            </span>
            <span className="import-type-count">
              {t.total} <span className="text-muted">({t.sif} SIF)</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="form-actions">
        <Link to="/reports" className="btn btn-primary btn-lg">
          Open in Report Explorer <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link to="/review" className="btn btn-ghost btn-lg">
          Review queue
        </Link>
        <button type="button" className="btn btn-ghost btn-lg" onClick={onReset}>
          Import another file
        </button>
      </div>
    </section>
  );
}
