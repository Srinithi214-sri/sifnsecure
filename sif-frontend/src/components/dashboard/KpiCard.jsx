// Card showing one number. meter (0–1) adds a progress bar, featured highlights the card
export default function KpiCard({ icon: Icon, label, value, detail, meter, featured = false }) {
  return (
    <article className={`card kpi-card${featured ? ' kpi-featured' : ''}`}>
      <div className="kpi-head">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon" aria-hidden="true">
          <Icon size={18} />
        </span>
      </div>
      <p className="kpi-value">{value}</p>
      {meter !== undefined && (
        <div className="kpi-meter" aria-hidden="true">
          <span style={{ width: `${Math.round(meter * 100)}%` }} />
        </div>
      )}
      <p className="kpi-detail">{detail}</p>
    </article>
  );
}
