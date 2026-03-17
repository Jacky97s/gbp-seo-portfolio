#!/usr/bin/env node
/**
 * Scan reports/*.html and generate data/projects.json
 *
 * Usage: node scripts/build-projects.js
 *
 * Extracts from each report HTML:
 *   - name        → <h1> inside .hero
 *   - score       → <span class="score-number">
 *   - address     → first .hero-meta-item <span> (location pin icon)
 *   - reportUrl   → relative path
 *
 * Category & tags come from an optional lookup table below.
 * If a report is not in the lookup, it falls back to generic values.
 */

const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'projects.json');
const PORTFOLIO_FILE = path.join(__dirname, '..', 'portfolio.html');

// Optional: manual category/tags override per report-id or filename slug
const META_OVERRIDES = {
  'kiryu-crepe-taipei':    { category: '甜點 / 可麗餅', tags: ['甜點', '台北', '赤峰街'] },
  'giethoorn-taiwan':      { category: '民宿',          tags: ['民宿', '清境', '南投'] },
  'true-shabu':            { category: '火鍋 / 預約制',  tags: ['火鍋', '台中', '預約制'] },
  'le-buno-cafe-tainan':   { category: '咖啡廳',        tags: ['咖啡廳', '台南', '新光三越'] },
  'yours-and-mine':        { category: '餐廳',          tags: ['餐廳', '泰山', '新北'] },
  'calmhere-caffe':        { category: '咖啡廳',        tags: ['咖啡廳', '礁溪', '甜點'] },
};

function extractText(html, regex) {
  const m = html.match(regex);
  return m ? m[1].replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).trim() : '';
}

function guessLocation(address) {
  // Extract city/district from Taiwan address (e.g. "103臺北市大同區..." → "台北市大同區")
  const m = address.match(/\d{0,3}(臺灣)?(.*?[市縣])(.*?[區鄉鎮市])/);
  if (m) {
    return (m[2] + m[3]).replace('臺北', '台北').replace('臺中', '台中').replace('臺南', '台南');
  }
  return address.slice(0, 10);
}

function findOverride(filename) {
  for (const key of Object.keys(META_OVERRIDES)) {
    if (filename.includes(key)) return META_OVERRIDES[key];
  }
  return null;
}

function parseReport(filePath) {
  const html = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath, '.html');

  // Name from <h1>
  const name = extractText(html, /<h1[^>]*>(.*?)<\/h1>/s);
  if (!name) return null;

  // Score from <span class="score-number" ...>NN</span>
  const scoreStr = extractText(html, /<span\s+class="score-number"[^>]*>(\d+)<\/span>/);
  const score = parseInt(scoreStr, 10) || 0;

  // Address from first hero-meta-item span (after location SVG)
  const addressMatch = html.match(/hero-meta-item[^>]*>\s*<svg[^>]*>.*?<\/svg>\s*<span>(.*?)<\/span>/s);
  const address = addressMatch ? addressMatch[1].replace(/&amp;/g, '&').trim() : '';

  const location = guessLocation(address);
  const override = findOverride(filename);
  const category = override ? override.category : '商家';
  const tags = override ? override.tags : location ? [location.replace(/[市縣].*/, '')] : [];

  return {
    name,
    category,
    location,
    score,
    tags,
    reportUrl: 'reports/' + path.basename(filePath),
  };
}

// Main
const files = fs.readdirSync(REPORTS_DIR)
  .filter(f => f.endsWith('.html'))
  .sort();

const projects = files
  .map(f => parseReport(path.join(REPORTS_DIR, f)))
  .filter(Boolean);

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(projects, null, 2) + '\n');
console.log(`Generated ${OUTPUT_FILE} with ${projects.length} reports.`);

// Inject data into portfolio.html
if (fs.existsSync(PORTFOLIO_FILE)) {
  let portfolio = fs.readFileSync(PORTFOLIO_FILE, 'utf-8');
  const jsonInline = JSON.stringify(projects);
  portfolio = portfolio.replace(
    /\/\* BUILD:PORTFOLIO_DATA \*\/.*?\/\* \/BUILD:PORTFOLIO_DATA \*\//s,
    `/* BUILD:PORTFOLIO_DATA */${jsonInline}/* /BUILD:PORTFOLIO_DATA */`
  );
  fs.writeFileSync(PORTFOLIO_FILE, portfolio);
  console.log(`Injected ${projects.length} projects into portfolio.html`);
}
