// All data fetching goes through this file.
// Uses mock data unless VITE_API_BASE_URL is set (see .env.example).
//
//   GET  /reports            -> Report[]
//   GET  /reports/{id}       -> Report
//   POST /reports/import (multipart "file": .csv/.xlsx) -> ImportSummary (see importReports)
//   GET  /reports/{id}/similar -> Report[] (2–3 related past reports, most similar first)
//   GET  /review-queue       -> Report[]
//   GET  /dashboard/stats    -> DashboardStats
//   POST /analyze {text, site, date, reportType} -> Report

import {
  EEI_THRESHOLD_FT_LBS,
  IOGP_LIFE_SAVING_RULES,
  ML_SIF_THRESHOLD,
  REPORT_TYPES,
  reports as mockReports,
  similarReports as mockSimilar,
} from '../data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
const USE_MOCK = !API_BASE_URL;

const MOCK_LATENCY_MS = 300;
const MOCK_ANALYSIS_DELAY_MS = 2000;
const MOCK_IMPORT_DELAY_MS = 2400;

const SIF = 'SIF precursor';
const NOT_SIF = 'Not SIF';

// Reports analysed in this session (lost on reload)
const mockDrafts = new Map();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Return copies so the mock data isn't changed
const clone = (value) => structuredClone(value);

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }
  return response.json();
}

// Public API

export async function getReports() {
  if (!USE_MOCK) return request('/reports');
  await delay(MOCK_LATENCY_MS);
  return clone([...mockReports].sort((a, b) => b.date.localeCompare(a.date)));
}

export async function getReport(id) {
  if (!USE_MOCK) return request(`/reports/${encodeURIComponent(id)}`);
  await delay(MOCK_LATENCY_MS);
  const report = mockDrafts.get(id) ?? mockReports.find((r) => r.id === id);
  if (!report) throw new Error(`Report ${id} not found`);
  return clone(report);
}

// Bulk import from CSV/Excel (the mock ignores the file; file = null uses the sample)
export async function importReports(file) {
  if (!USE_MOCK) {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`${API_BASE_URL}/reports/import`, { method: 'POST', body });
    if (!response.ok) throw new Error(`Import failed with status ${response.status}`);
    return response.json();
  }
  await delay(MOCK_IMPORT_DELAY_MS);
  const isSif = (r) => r.mlVerdict === SIF;
  return {
    fileName: file?.name ?? 'sample-safety-reports.csv',
    analysed: mockReports.length,
    sifPrecursors: mockReports.filter(isSif).length,
    sentToReview: mockReports.filter((r) => !r.agree).length,
    ruleMatched: mockReports.filter((r) => r.iogpRule).length,
    byReportType: REPORT_TYPES.map((reportType) => ({
      reportType,
      total: mockReports.filter((r) => r.reportType === reportType).length,
      sif: mockReports.filter((r) => r.reportType === reportType && isSif(r)).length,
    })),
  };
}

// Similar past reports
export async function getSimilarReports(id) {
  if (!USE_MOCK) return request(`/reports/${encodeURIComponent(id)}/similar`);
  await delay(MOCK_LATENCY_MS / 2);
  const ids = mockSimilar[id] ?? [];
  return clone(ids.map((sid) => mockReports.find((r) => r.id === sid)).filter(Boolean));
}

// Pending reports, highest SIF score first
export async function getReviewQueue() {
  if (!USE_MOCK) return request('/review-queue');
  await delay(MOCK_LATENCY_MS);
  return clone(
    mockReports.filter((r) => r.status === 'pending').sort((a, b) => b.sifScore - a.sifScore),
  );
}

export async function getDashboardStats() {
  if (!USE_MOCK) return request('/dashboard/stats');
  await delay(MOCK_LATENCY_MS);
  return buildStats(mockReports);
}

// Analyse report text (the mock uses keyword rules)
export async function analyzeReport({ text, site, date, reportType }) {
  const input = { text, site, date, reportType };
  if (!USE_MOCK) return request('/analyze', { method: 'POST', body: JSON.stringify(input) });
  await delay(MOCK_ANALYSIS_DELAY_MS);
  const report = mockAnalyze(text);
  for (const key of ['site', 'date', 'reportType']) {
    if (input[key]) report[key] = input[key];
  }
  mockDrafts.set(report.id, report);
  return clone(report);
}

// Mock helpers

function buildStats(reports) {
  const isSif = (r) => r.mlVerdict === SIF;
  const countBy = (keyFn, keys) => {
    const map = new Map(keys.map((k) => [k, { total: 0, sif: 0 }]));
    for (const r of reports) {
      const key = keyFn(r);
      if (!map.has(key)) map.set(key, { total: 0, sif: 0 });
      const entry = map.get(key);
      entry.total += 1;
      if (isSif(r)) entry.sif += 1;
    }
    return map;
  };

  const byMonth = countBy((r) => r.date.slice(0, 7), []);
  const byRule = countBy((r) => r.iogpRule, IOGP_LIFE_SAVING_RULES);
  byRule.delete(null);

  return {
    totalReports: reports.length,
    sifPrecursors: reports.filter(isSif).length,
    pendingReview: reports.filter((r) => r.status === 'pending').length,
    disagreements: reports.filter((r) => !r.agree).length,
    averageSifScore: Number((reports.reduce((sum, r) => sum + r.sifScore, 0) / reports.length).toFixed(2)),
    byReportType: [...countBy((r) => r.reportType, REPORT_TYPES)].map(([reportType, c]) => ({ reportType, ...c })),
    byRule: [...byRule].map(([rule, c]) => ({ rule, ...c })),
    byMonth: [...byMonth]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, c]) => ({ month, ...c })),
    bySite: [...countBy((r) => r.site, [])]
      .map(([site, c]) => ({ site, ...c }))
      .sort((a, b) => b.total - a.total),
  };
}

const RULE_PATTERNS = [
  ['Working at Height', /\b(height|derrick|monkey ?board|scaffold|harness|lanyard|ladder|fell from|roof)\b/i],
  ['Confined Space', /\b(confined space|tank entry|entered (the )?(tank|vessel)|manhole|vessel entry)\b/i],
  ['Hot Work', /\b(weld|welding|hot work|cutting torch|grinding|spark)\b/i],
  ['Energy Isolation', /\b(lockout|lock-out|loto|isolat\w*|de-?energi[sz]\w*|breaker)\b/i],
  ['Bypassing Safety Controls', /\b(bypass\w*|jumper|override|overrid\w*|inhibit\w*|silenced)\b/i],
  ['Safe Mechanical Lifting', /\b(crane|lift\w*|sling|rigger|suspended load|hoist)\b/i],
  ['Line of Fire', /\b(dropped|fell|falling|swung|struck|line of fire|pinch)\b/i],
  ['Driving', /\b(driv\w*|vehicle|tanker|truck|speed\w*|km\/h)\b/i],
  ['Work Authorisation', /\b(permit|authoris\w*|authoriz\w*)\b/i],
];

const ENERGY_PATTERNS = [
  ['Chemical (H2S)', /\bh2s\b|hydrogen sulphide|hydrogen sulfide/i],
  ['Chemical', /\b(gas|vapou?r|caustic|acid|chemical|lel)\b/i],
  ['Thermal', /\b(weld\w*|fire|flame|hot|burn\w*)\b/i],
  ['Electrical', /\b(electric\w*|voltage|breaker|cable|live)\b/i],
  ['Pressure', /\b(pressur\w*|psi|kg\/cm2|bar)\b/i],
  ['Motion', /\b(vehicle|tanker|truck|forklift|km\/h|speed)\b/i],
  ['Gravity', /\b(height|fell|fall\w*|dropped|derrick|scaffold|suspended)\b/i],
];

const HIGH_HAZARD_ENERGY = new Set(['Chemical (H2S)', 'Chemical', 'Thermal', 'Electrical']);
const J_TO_FT_LB = 0.7376;
const G = 9.81;

function parseQuantity(text, pattern, units) {
  const match = text.match(pattern);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const factor = units[match[2].toLowerCase()] ?? 1;
  return { value: value * factor, raw: match[0] };
}

function mockAnalyze(text) {
  const clean = text.trim();
  const iogpRule = RULE_PATTERNS.find(([, re]) => re.test(clean))?.[0] ?? null;
  const energySource = ENERGY_PATTERNS.find(([, re]) => re.test(clean))?.[0] ?? null;

  const height = parseQuantity(clean, /(\d+(?:\.\d+)?)\s*(m|metres?|meters?|ft|feet)\b/i, {
    ft: 0.3048,
    feet: 0.3048,
  });
  const mass = parseQuantity(clean, /(\d+(?:\.\d+)?)\s*(kg|t|tonnes?|tons?)\b/i, {
    t: 1000,
    tonne: 1000,
    tonnes: 1000,
    ton: 1000,
    tons: 1000,
  });
  const energyFtLbs = height && mass ? Math.round(mass.value * G * height.value * J_TO_FT_LB) : null;
  const exceedsThreshold = energyFtLbs !== null && energyFtLbs > EEI_THRESHOLD_FT_LBS;

  let score = 0.15;
  if (iogpRule) score += 0.25;
  if (exceedsThreshold) score += 0.3;
  if (HIGH_HAZARD_ENERGY.has(energySource)) score += 0.25;
  if (/\b(nearly|narrowly|missed|near miss|could have)\b/i.test(clean)) score += 0.1;
  const sifScore = Number(Math.min(score, 0.96).toFixed(2));

  const reportType = /\b(near miss|nearly|narrowly|landed (near|about))\b/i.test(clean)
    ? 'near miss'
    : /\b(found|missing|damaged|cracked|leak\w*|broken|not working)\b/i.test(clean)
      ? 'unsafe condition'
      : 'unsafe act';

  const mlVerdict = sifScore >= ML_SIF_THRESHOLD ? SIF : NOT_SIF;
  const eeiVerdict = exceedsThreshold ? SIF : NOT_SIF;

  return {
    id: `DRAFT-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    site: 'Unassigned',
    reportType,
    text: clean,
    sifScore,
    entities: {
      energySource,
      height: height ? height.raw : null,
      equipment: null,
      activity: null,
    },
    eei: { energyFtLbs, exceedsThreshold },
    iogpRule,
    mlVerdict,
    eeiVerdict,
    agree: mlVerdict === eeiVerdict,
    status: 'pending',
  };
}
