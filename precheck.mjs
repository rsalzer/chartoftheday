#!/usr/bin/env node
// precheck.mjs
// Reads manifest.json and prints the current blocklist as JSON on stdout.
// Blocked = categories/chartTypes used within the last 3 days, keywords within
// the last 7 days (all relative to today in Europe/Zurich).
//
// Default:  node scripts/precheck.mjs            -> prints blocklist JSON
// Validate: node scripts/precheck.mjs --check --category X --chartType Y --keywords a,b,c
//           -> prints {ok:true} (exit 0) or {ok:false, violations:[...]} (exit 1)

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'manifest.json');

const CATEGORY_WINDOW = 3;  // days
const CHARTTYPE_WINDOW = 3; // days
const KEYWORD_WINDOW = 7;   // days

function todayInZurich() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function ageInDays(dateISO, todayISO) {
  const a = new Date(dateISO + 'T00:00:00Z');
  const b = new Date(todayISO + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}

async function loadManifest() {
  try {
    const data = JSON.parse(await readFile(MANIFEST, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const norm = (s) => String(s ?? '').trim().toLowerCase();
const uniq = (arr) => [...new Set(arr)];

const today = todayInZurich();
const entries = await loadManifest();

const inWindow = (win) => (e) => {
  const d = ageInDays(e.date, today);
  return d >= 0 && d < win;
};

const blockedCategories = uniq(
  entries.filter(inWindow(CATEGORY_WINDOW)).map((e) => norm(e.category)).filter(Boolean)
);
const blockedChartTypes = uniq(
  entries.filter(inWindow(CHARTTYPE_WINDOW)).map((e) => norm(e.chartType)).filter(Boolean)
);
const blockedKeywords = uniq(
  entries.filter(inWindow(KEYWORD_WINDOW)).flatMap((e) => (e.keywords || []).map(norm)).filter(Boolean)
);

const blocklist = {
  today,
  windows: { categoryDays: CATEGORY_WINDOW, chartTypeDays: CHARTTYPE_WINDOW, keywordDays: KEYWORD_WINDOW },
  blockedCategories,
  blockedChartTypes,
  blockedKeywords
};

const args = process.argv.slice(2);

if (args.includes('--check')) {
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : '';
  };
  const cat = norm(flag('--category'));
  const type = norm(flag('--chartType'));
  const kws = norm(flag('--keywords')).split(',').map((s) => s.trim()).filter(Boolean);

  const violations = [];
  if (cat && blockedCategories.includes(cat)) {
    violations.push(`category "${cat}" was used within the last ${CATEGORY_WINDOW} days`);
  }
  if (type && blockedChartTypes.includes(type)) {
    violations.push(`chartType "${type}" was used within the last ${CHARTTYPE_WINDOW} days`);
  }
  const kwHits = kws.filter((k) => blockedKeywords.includes(k));
  if (kwHits.length) {
    violations.push(`keywords overlap within the last ${KEYWORD_WINDOW} days: ${kwHits.join(', ')}`);
  }

  if (violations.length) {
    console.error(JSON.stringify({ ok: false, violations }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true }, null, 2));
  process.exit(0);
}

console.log(JSON.stringify(blocklist, null, 2));
