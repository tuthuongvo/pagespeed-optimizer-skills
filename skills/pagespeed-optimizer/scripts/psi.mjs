#!/usr/bin/env node
// Run PageSpeed Insights (or local Lighthouse) and print a compact report.
// Usage: node psi.mjs <url> [--strategy=mobile|desktop|both] [--local] [--out=dir]
// Env: PSI_API_KEY (optional, avoids 429 rate limits)
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
if (!url) {
  console.error('Usage: psi.mjs <url> [--strategy=mobile|desktop|both] [--local] [--out=dir]');
  process.exit(2);
}
const strategy = opt('strategy', 'mobile');
const outDir = opt('out', '.pagespeed');
const local = args.includes('--local');
mkdirSync(outDir, { recursive: true });

const CATS = ['performance', 'accessibility', 'best-practices', 'seo'];
const METRICS = {
  'first-contentful-paint': ['FCP', 1800, 3000],
  'largest-contentful-paint': ['LCP', 2500, 4000],
  'total-blocking-time': ['TBT', 200, 600],
  'cumulative-layout-shift': ['CLS', 0.1, 0.25],
  'speed-index': ['SI', 3400, 5800],
};

async function run(strat) {
  if (local) {
    const f = join(outDir, `raw-${strat}.json`);
    const a = [
      '--yes', 'lighthouse', url, '--output=json', `--output-path=${f}`, '--quiet',
      '--chrome-flags=--headless=new --no-sandbox',
      `--only-categories=${CATS.join(',')}`,
    ];
    if (strat === 'desktop') a.push('--preset=desktop');
    execFileSync('npx', a, { stdio: 'inherit' });
    return JSON.parse(readFileSync(f, 'utf8'));
  }
  const q = new URLSearchParams({ url, strategy: strat });
  CATS.forEach((c) => q.append('category', c));
  if (process.env.PSI_API_KEY) q.set('key', process.env.PSI_API_KEY);
  const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`);
  if (!r.ok) throw new Error(`PSI API ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return (await r.json()).lighthouseResult;
}

const mark = (s) => (s >= 90 ? '🟢' : s >= 50 ? '🟠' : '🔴');

function report(lh, strat) {
  writeFileSync(join(outDir, `lh-${strat}.json`), JSON.stringify(lh, null, 1));
  console.log(`\n===== ${strat.toUpperCase()} - ${lh.finalDisplayUrl || url} =====`);
  for (const c of CATS) {
    const s = Math.round((lh.categories[c]?.score ?? 0) * 100);
    console.log(`${mark(s)} ${c.padEnd(15)} ${s}`);
  }
  console.log('\nMetrics:');
  for (const [id, [n, good, poor]] of Object.entries(METRICS)) {
    const a = lh.audits[id];
    if (!a) continue;
    const v = a.numericValue;
    const m = v <= good ? '🟢' : v <= poor ? '🟠' : '🔴';
    console.log(`${m} ${n.padEnd(4)} ${a.displayValue}`);
  }
  console.log('\nAudits to fix (by category, highest impact first):');
  for (const c of CATS) {
    const refs = lh.categories[c].auditRefs
      .map((r) => ({ ...r, a: lh.audits[r.id] }))
      .filter(({ a }) => a && a.score !== null && a.score < 0.9
        && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'manual')
      .sort((x, y) => (y.a.details?.overallSavingsMs || 0) - (x.a.details?.overallSavingsMs || 0)
        || y.weight - x.weight);
    if (!refs.length) continue;
    console.log(`\n[${c}]`);
    for (const { id, a } of refs) {
      console.log(`- ${id}: ${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}`);
      for (const it of (a.details?.items || []).slice(0, 5)) {
        const t = it.url || it.node?.snippet || it.source?.url || it.label || it.groupLabel || '';
        const extra = it.wastedBytes ? ` wasted=${Math.round(it.wastedBytes / 1024)}KB`
          : it.wastedMs ? ` wasted=${Math.round(it.wastedMs)}ms` : '';
        if (t) console.log(`    · ${String(t).replace(/\s+/g, ' ').slice(0, 160)}${extra}`);
      }
    }
  }
  const lcp = lh.audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.snippet;
  if (lcp) console.log(`\nLCP element: ${lcp.slice(0, 200)}`);
  const cls = lh.audits['layout-shifts']?.details?.items?.slice(0, 3).map((i) => i.node?.snippet).filter(Boolean);
  if (cls?.length) console.log(`CLS elements:\n  ${cls.join('\n  ')}`);
}

const list = strategy === 'both' ? ['mobile', 'desktop'] : [strategy];
for (const s of list) report(await run(s), s);
console.log(`\nFull JSON: ${outDir}/lh-<strategy>.json`);
