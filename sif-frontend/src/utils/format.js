// Formatting helpers for scores, dates and sites

// Risk level for a SIF score (0–1)
export function riskLevel(score) {
  if (score >= 0.75) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

export const RISK_LABELS = { high: 'High', medium: 'Elevated', low: 'Low' };

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const monthShort = new Intl.DateTimeFormat('en-GB', { month: 'short' });
const monthLong = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

// Parse YYYY-MM[-DD] as a local date
const toDate = (iso) => {
  const [y, m, d = 1] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const formatDate = (iso) => dateFormat.format(toDate(iso));
export const formatMonthShort = (yyyyMm) => monthShort.format(toDate(yyyyMm));
export const formatMonthLong = (yyyyMm) => monthLong.format(toDate(yyyyMm));

export const formatPercent = (ratio) => `${Math.round(ratio * 100)}%`;

// "Drilling Rig E-2000-12, Duliajan field" -> { name: "Drilling Rig E-2000-12", place: "Duliajan field" }
export function splitSite(site) {
  const i = site.indexOf(',');
  return i === -1 ? { name: site, place: null } : { name: site.slice(0, i), place: site.slice(i + 1).trim() };
}
