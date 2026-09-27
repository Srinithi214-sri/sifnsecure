// Constants and text used to explain results

export const ML_SIF_THRESHOLD = 0.5;
export const EEI_THRESHOLD_FT_LBS = 500;
export const SIF = 'SIF precursor';
export const NOT_SIF = 'Not SIF';

// Scores this close to the threshold need human review
export const BORDERLINE_MIN = 0.4;
export const BORDERLINE_MAX = 0.6;

export const isBorderline = (r) => r.sifScore >= BORDERLINE_MIN && r.sifScore <= BORDERLINE_MAX;
export const needsReview = (r) => !r.agree || isBorderline(r);

export const REPORT_TYPES = [
  { value: 'near miss', label: 'Near miss' },
  { value: 'unsafe act', label: 'Unsafe act' },
  { value: 'unsafe condition', label: 'Unsafe condition' },
];

// IOGP Life-Saving Rules
export const IOGP_RULE_TEXT = {
  'Bypassing Safety Controls': 'Obtain authorisation before overriding or disabling safety controls.',
  'Confined Space': 'Obtain authorisation before entering a confined space.',
  Driving: 'Follow safe driving rules.',
  'Energy Isolation': 'Verify isolation and zero energy before work begins.',
  'Hot Work': 'Control flammables and ignition sources.',
  'Line of Fire': 'Keep yourself and others out of the line of fire.',
  'Safe Mechanical Lifting': 'Plan lifting operations and control the area.',
  'Work Authorisation': 'Work with a valid work permit when required.',
  'Working at Height': 'Protect yourself against a fall when working at height.',
};

// How the energy was estimated for each source
export function energyMethod(energySource) {
  const source = energySource ?? '';
  if (/gravity/i.test(source)) return 'Gravity: mass × g × height';
  if (/motion/i.test(source)) return 'Motion: ½ × mass × speed²';
  if (/pressure/i.test(source)) return 'Stored pressure energy of the contained volume';
  if (/mechanical|biomechanical/i.test(source)) return 'Mechanical: estimated from the tool or load involved';
  return null;
}
