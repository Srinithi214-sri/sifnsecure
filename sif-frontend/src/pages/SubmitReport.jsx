import { FileSpreadsheet, FileText, RefreshCw, Send, Sparkles } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnalysisPipeline, { PIPELINE_STAGES } from '../components/submit/AnalysisPipeline';
import BulkImport from '../components/submit/BulkImport';
import { analyzeReport, getReports } from '../services/api';
import { REPORT_TYPES } from '../utils/domain';

const STAGE_MS = 650;
const DONE_PAUSE_MS = 600;
const MIN_TEXT = 40;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EMPTY = { text: '', site: '', date: today(), reportType: '' };

const EXAMPLE = {
  text:
    'While tripping out on the night shift, a 6 kg hanger pin worked loose from the crown block area and fell ' +
    'approximately 20 m to the rig floor, narrowly missing the floorman at the rotary table. The pin’s safety ' +
    'clip was found missing after last week’s derrick inspection. No injury. The driller stopped the job, the ' +
    'rig floor was cleared and a dropped-object survey of the derrick was carried out before work resumed.',
  site: 'Drilling Rig E-2000-12, Duliajan field',
  reportType: 'near miss',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function validate(form) {
  const errors = {};
  if (form.text.trim().length < MIN_TEXT)
    errors.text = `Describe what happened in at least ${MIN_TEXT} characters.`;
  if (!form.site.trim()) errors.site = 'Enter the site or installation.';
  if (!form.date) errors.date = 'Enter the date of the observation.';
  else if (form.date > today()) errors.date = 'The date cannot be in the future.';
  if (!form.reportType) errors.reportType = 'Choose a report type.';
  return errors;
}

const MODES = [
  { key: 'single', label: 'Single report', icon: FileText },
  { key: 'bulk', label: 'Bulk import', icon: FileSpreadsheet },
];

// Two tabs: single report form and bulk CSV/Excel import
export default function SubmitReport() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'bulk' ? 'bulk' : 'single';
  const tabRefs = useRef({});

  const select = (key) => setParams(key === 'single' ? {} : { mode: key }, { replace: true });

  // Arrow keys switch tabs
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = MODES.findIndex((m) => m.key === mode);
    const next = MODES[(i + (e.key === 'ArrowRight' ? 1 : -1) + MODES.length) % MODES.length].key;
    select(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="submit-shell">
      <div className="mode-tabs" role="tablist" aria-label="How to submit">
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            ref={(el) => {
              tabRefs.current[key] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={mode === key}
            aria-controls={`panel-${key}`}
            tabIndex={mode === key ? 0 : -1}
            className="mode-tab"
            onClick={() => select(key)}
            onKeyDown={onKeyDown}
          >
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${mode}`} aria-labelledby={`tab-${mode}`}>
        {mode === 'single' ? <SingleReportForm /> : <BulkImport />}
      </div>
    </div>
  );
}

function SingleReportForm() {
  const navigate = useNavigate();
  const ids = useId();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sites, setSites] = useState([]);
  // null = editing, otherwise the pipeline is running or failed
  const [run, setRun] = useState(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    getReports()
      .then((reports) => alive.current && setSites([...new Set(reports.map((r) => r.site))].sort()))
      .catch(() => {});
    return () => {
      alive.current = false;
    };
  }, []);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const loadExample = () => {
    setForm({ ...EXAMPLE, date: today() });
    setErrors({});
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`${ids}-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    setRun({ active: 0, failed: false });
    const input = { ...form, text: form.text.trim(), site: form.site.trim() };
    const result = analyzeReport(input).then(
      (report) => ({ report }),
      (error) => ({ error }),
    );

    // Step through the pipeline stages
    for (let i = 1; i < PIPELINE_STAGES.length; i += 1) {
      await sleep(STAGE_MS);
      if (!alive.current) return;
      setRun({ active: i, failed: false });
    }
    const { report, error } = await result;
    if (!alive.current) return;
    if (error) {
      setRun((r) => ({ ...r, failed: true, error }));
      return;
    }
    await sleep(STAGE_MS);
    if (!alive.current) return;
    setRun({ active: PIPELINE_STAGES.length, failed: false });
    await sleep(DONE_PAUSE_MS);
    if (alive.current) navigate(`/analysis/${encodeURIComponent(report.id)}`);
  }

  if (run) {
    return (
      <div className="submit-page">
        <section className="card pipeline-card" aria-labelledby="pipeline-title">
          <header className="card-header">
            <div>
              <h2 id="pipeline-title" className="section-title">
                Analysing report
              </h2>
              <p>
                {REPORT_TYPES.find((t) => t.value === form.reportType)?.label} · {form.site}
              </p>
            </div>
          </header>
          <AnalysisPipeline active={run.active} failed={run.failed} />
          <blockquote className="pipeline-quote">{form.text.trim()}</blockquote>
          {run.failed && (
            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                <RefreshCw size={16} aria-hidden="true" /> Try again
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setRun(null)}>
                Edit report
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  const fieldProps = (field) => ({
    id: `${ids}-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${ids}-${field}-error` : undefined,
  });
  const error = (field) =>
    errors[field] && (
      <p className="field-error" id={`${ids}-${field}-error`}>
        {errors[field]}
      </p>
    );

  return (
    <div className="submit-page">
      <form className="card submit-form" onSubmit={handleSubmit} noValidate>
        <header className="card-header">
          <div>
            <h2 className="section-title">New safety observation</h2>
            <p>Write it the way you would tell your supervisor. The engine reads plain English.</p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={loadExample}>
            <Sparkles size={16} aria-hidden="true" /> Load example
          </button>
        </header>

        <div className="field">
          <label htmlFor={`${ids}-text`}>What happened?</label>
          <textarea
            {...fieldProps('text')}
            rows={7}
            value={form.text}
            onChange={update('text')}
            placeholder="e.g. A 3 kg torque wrench slipped from the derrickman’s belt at around 15 m and landed about 1 m from a floorman…"
          />
          <div className="field-foot">
            {error('text') || <p className="field-hint">Include heights, weights, speeds or pressures if you know them.</p>}
            <span className="char-count">{form.text.trim().length} characters</span>
          </div>
        </div>

        <div className="field-row">
          <div className="field field-grow">
            <label htmlFor={`${ids}-site`}>Site</label>
            <input
              {...fieldProps('site')}
              type="text"
              list={`${ids}-sites`}
              value={form.site}
              onChange={update('site')}
              placeholder="Rig, station or installation"
              autoComplete="off"
            />
            <datalist id={`${ids}-sites`}>
              {sites.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {error('site')}
          </div>
          <div className="field">
            <label htmlFor={`${ids}-date`}>Date observed</label>
            <input {...fieldProps('date')} type="date" max={today()} value={form.date} onChange={update('date')} />
            {error('date')}
          </div>
        </div>

        <fieldset className="field">
          <legend>Report type</legend>
          <div className="segmented" id={`${ids}-reportType`} tabIndex={-1}>
            {REPORT_TYPES.map((t) => (
              <label key={t.value} className="segmented-option">
                <input
                  type="radio"
                  name="reportType"
                  value={t.value}
                  checked={form.reportType === t.value}
                  onChange={update('reportType')}
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
          {error('reportType')}
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-lg">
            <Send size={16} aria-hidden="true" /> Analyse report
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-lg"
            onClick={() => {
              setForm({ ...EMPTY, date: today() });
              setErrors({});
            }}
          >
            Clear
          </button>
        </div>
      </form>

      <aside className="submit-aside" aria-label="How analysis works">
        <h3>What happens next</h3>
        <ol>
          {PIPELINE_STAGES.map((s) => (
            <li key={s.key}>
              <strong>{s.label}</strong>
              <span>{s.detail}</span>
            </li>
          ))}
        </ol>
        <p>
          If the ML model and the energy check disagree, the report goes to a human reviewer before it
          counts as a SIF precursor.
        </p>
      </aside>
    </div>
  );
}
