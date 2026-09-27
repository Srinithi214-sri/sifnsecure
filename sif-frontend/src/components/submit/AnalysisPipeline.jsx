import { Brain, Check, Inbox, ListOrdered, Tag, TriangleAlert, Zap } from 'lucide-react';

export const PIPELINE_STAGES = [
  { key: 'ingest', label: 'Ingest', icon: Inbox, detail: 'Cleaning the text and extracting entities' },
  { key: 'classify', label: 'Classify', icon: Brain, detail: 'ML model scores the SIF potential' },
  { key: 'verify', label: 'Verify', icon: Zap, detail: 'EEI checks energy against 500 ft-lbs' },
  { key: 'tag', label: 'Tag Rule', icon: Tag, detail: 'Matching an IOGP Life-Saving Rule' },
  { key: 'rank', label: 'Rank', icon: ListOrdered, detail: 'Comparing verdicts and prioritising' },
];

// active = index of the current stage (use PIPELINE_STAGES.length when all are done)
export default function AnalysisPipeline({ active, failed = false }) {
  const current = PIPELINE_STAGES[Math.min(active, PIPELINE_STAGES.length - 1)];
  const finished = active >= PIPELINE_STAGES.length;
  const progress = Math.min(active, PIPELINE_STAGES.length - 1) / (PIPELINE_STAGES.length - 1);

  return (
    <div className="pipeline">
      <ol className="pipeline-track" style={{ '--progress': progress }}>
        {PIPELINE_STAGES.map((stage, i) => {
          const state = i < active || finished ? 'done' : i === active ? (failed ? 'failed' : 'active') : 'waiting';
          const Icon = state === 'done' ? Check : state === 'failed' ? TriangleAlert : stage.icon;
          return (
            <li key={stage.key} className={`pipeline-stage is-${state}`} aria-current={state === 'active' ? 'step' : undefined}>
              <span className="pipeline-node">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="pipeline-label">{stage.label}</span>
              <span className="pipeline-detail">{stage.detail}</span>
            </li>
          );
        })}
      </ol>
      <p className="pipeline-status" role="status" aria-live="polite">
        {failed
          ? `Analysis stopped at ${current.label}.`
          : finished
            ? 'Analysis complete. Opening the result…'
            : `${current.label} · ${current.detail}…`}
      </p>
    </div>
  );
}
