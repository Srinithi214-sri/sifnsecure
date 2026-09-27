import { ArrowRight, Brain, CircleCheck, Equal, EqualNot, UserRoundCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EEI_THRESHOLD_FT_LBS, ML_SIF_THRESHOLD, SIF } from '../../utils/domain';

const num = new Intl.NumberFormat('en-IN');

function mlEvidence(score) {
  const op = score >= ML_SIF_THRESHOLD ? '≥' : '<';
  return `Score ${score.toFixed(2)} ${op} ${ML_SIF_THRESHOLD.toFixed(2)} threshold`;
}

function eeiEvidence({ energyFtLbs, exceedsThreshold }) {
  if (energyFtLbs === null) return 'No mechanical energy to measure';
  return `${num.format(energyFtLbs)} ${exceedsThreshold ? '>' : '≤'} ${EEI_THRESHOLD_FT_LBS} ft-lbs threshold`;
}

// Explains why ML and EEI disagree
function disagreementReason(report) {
  const { mlVerdict, eei, entities } = report;
  if (mlVerdict === SIF) {
    return eei.energyFtLbs === null
      ? `The language model sees a serious hazard, but the EEI cannot estimate energy for ${entities.energySource ?? 'this hazard'}.`
      : `The language model sees a serious hazard, but the estimated energy stays under ${EEI_THRESHOLD_FT_LBS} ft-lbs.`;
  }
  return `The energy is over ${EEI_THRESHOLD_FT_LBS} ft-lbs, but the wording of the report scored below ${ML_SIF_THRESHOLD.toFixed(2)}.`;
}

function VerdictColumn({ icon: Icon, method, question, verdict, evidence }) {
  const isSif = verdict === SIF;
  return (
    <div className={`verdict-col ${isSif ? 'is-sif' : 'is-clear'}`}>
      <p className="verdict-method">
        <Icon size={16} aria-hidden="true" /> {method}
      </p>
      <p className="verdict-question">{question}</p>
      <p className="verdict-outcome">{verdict}</p>
      <p className="verdict-evidence">{evidence}</p>
    </div>
  );
}

export default function VerdictPanel({ report }) {
  const { agree, mlVerdict, eeiVerdict, sifScore, eei } = report;

  return (
    <div className={`verdict-panel ${agree ? 'agree' : 'disagree'}`}>
      <div className="verdict-grid">
        <VerdictColumn
          icon={Brain}
          method="ML verdict"
          question="Does the language describe a potential serious injury?"
          verdict={mlVerdict}
          evidence={mlEvidence(sifScore)}
        />
        <div className="verdict-link" aria-hidden="true">
          <span className="verdict-link-icon">{agree ? <Equal size={22} /> : <EqualNot size={22} />}</span>
          <span className="verdict-link-label">{agree ? 'Agree' : 'Disagree'}</span>
        </div>
        <VerdictColumn
          icon={Zap}
          method="EEI verdict"
          question="Is there enough energy to seriously injure someone?"
          verdict={eeiVerdict}
          evidence={eeiEvidence(eei)}
        />
      </div>

      {agree ? (
        <div className="verdict-outcome-bar outcome-agree">
          <CircleCheck size={22} aria-hidden="true" />
          <div>
            <strong>Both methods agree: {mlVerdict === SIF ? 'SIF precursor' : 'not a SIF precursor'}</strong>
            <p>Independent checks on the language and the physics reach the same answer.</p>
          </div>
        </div>
      ) : (
        <div className="verdict-outcome-bar outcome-review" role="status">
          <UserRoundCheck size={22} aria-hidden="true" />
          <div>
            <strong>Sent to human review</strong>
            <p>{disagreementReason(report)}</p>
          </div>
          <Link to="/review" className="btn btn-outline">
            Review queue <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
