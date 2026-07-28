#!/usr/bin/env node
// register.mjs
// Appends one entry to manifest.json. If an entry with the same date already
// exists (e.g. the routine re-ran the same day), it is replaced in place so the
// file stays one-entry-per-day. Order is otherwise preserved; the gallery sorts
// by date at render time.
//
// Usage:
//   node scripts/register.mjs '<json>'            (JSON string argument)
//   node scripts/register.mjs --file entry.json   (path to a JSON file)
//   echo '<json>' | node scripts/register.mjs     (JSON on stdin)

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'manifest.json');
const REQUIRED = ['date', 'title', 'lead', 'category', 'keywords', 'chartType', 'sourceUrls', 'file'];

function fail(msg) {
  console.error('register: ' + msg);
  process.exit(1);
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
  });
}

async function getInput() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  if (fileIdx >= 0 && args[fileIdx + 1]) return readFile(args[fileIdx + 1], 'utf8');
  const positional = args.find((a) => !a.startsWith('--'));
  if (positional) return positional;
  return readStdin();
}

const raw = (await getInput()).trim();
if (!raw) fail('no entry provided (pass JSON as an argument, via --file, or on stdin)');

let entry;
try {
  entry = JSON.parse(raw);
} catch (e) {
  fail('invalid JSON: ' + e.message);
}

for (const k of REQUIRED) {
  if (entry[k] === undefined || entry[k] === null || entry[k] === '') fail(`missing required field "${k}"`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) fail('field "date" must be YYYY-MM-DD');
if (!Array.isArray(entry.keywords) || entry.keywords.length === 0) fail('field "keywords" must be a non-empty array');
if (!Array.isArray(entry.sourceUrls) || entry.sourceUrls.length === 0) fail('field "sourceUrls" must be a non-empty array');

let manifest = [];
try {
  const data = JSON.parse(await readFile(MANIFEST, 'utf8'));
  if (Array.isArray(data)) manifest = data;
} catch {
  manifest = [];
}

const clean = {
  date: entry.date,
  title: entry.title,
  lead: entry.lead,
  category: entry.category,
  keywords: entry.keywords,
  chartType: entry.chartType,
  sourceUrls: entry.sourceUrls,
  file: entry.file
};

const existing = manifest.findIndex((e) => e.date === clean.date);
if (existing >= 0) {
  manifest[existing] = clean;
  console.error(`register: replaced existing entry for ${clean.date}`);
} else {
  manifest.push(clean);
}

await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`register: ok — manifest now has ${manifest.length} entr${manifest.length === 1 ? 'y' : 'ies'}`);
