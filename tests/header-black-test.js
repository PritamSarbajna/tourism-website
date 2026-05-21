'use strict';

/**
 * header-black-test.js
 *
 * Acceptance-criteria tests for the "navbar background → solid black" change.
 * Uses ONLY Node.js built-in modules (fs, path, assert, child_process).
 *
 * Run: node tests/header-black-test.js
 * Exit 0  → all tests pass
 * Exit 1  → one or more tests failed
 *
 * AC-001 – .navbar background is #000000 in style.css;
 *           .nav-links background is #000000 inside @media (max-width: 1130px)
 *           in responsive.css.
 * AC-002 – Key header text colours remain white / near-white for contrast.
 * AC-003 – Layout-critical .navbar properties unchanged; index.html and
 *           js/script.js were NOT modified.
 * AC-004 – No package.json (static site); both CSS files are readable and
 *           structurally valid.
 */

const fs   = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

// ─── file paths ──────────────────────────────────────────────────────────────

const REPO_ROOT          = path.resolve(__dirname, '..');
const STYLE_CSS_PATH     = path.join(REPO_ROOT, 'css', 'style.css');
const RESPONSIVE_CSS_PATH = path.join(REPO_ROOT, 'css', 'responsive.css');
const INDEX_HTML_PATH    = path.join(REPO_ROOT, 'index.html');
const SCRIPT_JS_PATH     = path.join(REPO_ROOT, 'js', 'script.js');

// ─── helpers ─────────────────────────────────────────────────────────────────

let passed  = 0;
let failed  = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✓  PASS: ${label}`);
    passed++;
  } catch (err) {
    console.log(`  ✗  FAIL: ${label}`);
    console.log(`         ↳ ${err.message}`);
    failed++;
  }
}

/**
 * Extract the inner content of the first @media block whose declaration
 * contains `querySubstring`.  Handles nested braces correctly.
 *
 * @param {string} css
 * @param {string} querySubstring  e.g. 'max-width: 1130px'
 * @returns {string|null}
 */
function extractMediaBlock(css, querySubstring) {
  const idx = css.indexOf(querySubstring);
  if (idx === -1) return null;

  // Walk back to find '@media' so we start from the opening brace of the block
  const openBrace = css.indexOf('{', idx);
  if (openBrace === -1) return null;

  let depth = 0;
  let end   = -1;
  for (let i = openBrace; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  return end === -1 ? null : css.slice(openBrace + 1, end);
}

/**
 * Extract the property block (between `{` and the first `}`) of a simple CSS
 * selector that has no nested braces (i.e. a regular rule-set, not @media).
 *
 * @param {string} css
 * @param {string} selector  e.g. '.navbar', '.nav-links li a'
 * @returns {string|null}
 */
function extractRuleBlock(css, selector) {
  // Escape regex-special characters present in a CSS selector
  const escaped = selector.replace(/[.[\](){}*+?^$|\\]/g, '\\$&');
  const rx = new RegExp(escaped + '\\s*\\{([^}]*)\\}');
  const m  = css.match(rx);
  return m ? m[1] : null;
}

/** Regex that matches any white / near-white colour value. */
const WHITE_LIKE = /color:\s*(white|whitesmoke|#fff(?:fff)?|rgb\(\s*25[0-9]|rgb\(\s*254)/i;

// ─── read source files ────────────────────────────────────────────────────────

const styleCSS      = fs.readFileSync(STYLE_CSS_PATH, 'utf8');
const responsiveCSS = fs.readFileSync(RESPONSIVE_CSS_PATH, 'utf8');

// Cache the .navbar rule block from style.css — reused across several tests
const navbarBlock = extractRuleBlock(styleCSS, '.navbar');

// ─── AC-001: black background ────────────────────────────────────────────────

console.log('\n════════════════════════════════════════════════════════');
console.log('  header-black-test.js – Acceptance Criteria Checks');
console.log('════════════════════════════════════════════════════════');
console.log('\n[AC-001] Header background is solid black (#000000)\n');

test('style.css › .navbar › background: #000000', () => {
  assert(navbarBlock !== null, '.navbar rule not found in css/style.css');
  assert(
    /background:\s*#000000\b/.test(navbarBlock),
    `.navbar background is not #000000.\nblock:\n${navbarBlock.trim()}`
  );
});

test('style.css › .navbar › backdrop-filter removed', () => {
  assert(navbarBlock !== null, '.navbar rule not found in css/style.css');
  assert(
    !/backdrop-filter/.test(navbarBlock),
    '.navbar still contains backdrop-filter — it should have been removed.'
  );
});

test('responsive.css › @media (max-width: 1130px) › .nav-links › background: #000000', () => {
  const media = extractMediaBlock(responsiveCSS, 'max-width: 1130px');
  assert(
    media !== null,
    '@media block containing "max-width: 1130px" not found in css/responsive.css'
  );

  const block = extractRuleBlock(media, '.nav-links');
  assert(
    block !== null,
    '.nav-links rule not found inside @media (max-width: 1130px) block'
  );
  assert(
    /background:\s*#000000\b/.test(block),
    `.nav-links background inside @media (max-width: 1130px) is not #000000.\nblock:\n${block.trim()}`
  );
});

// ─── AC-002: sufficient contrast ─────────────────────────────────────────────

console.log('\n[AC-002] Header text has sufficient contrast against black\n');

test('style.css › .logo › color is white or near-white', () => {
  const block = extractRuleBlock(styleCSS, '.logo');
  assert(block !== null, '.logo rule not found in css/style.css');
  assert(
    WHITE_LIKE.test(block),
    `.logo color is not white/near-white (low contrast against black).\nblock:\n${block.trim()}`
  );
});

test('style.css › .nav-links li a › color is white', () => {
  const block = extractRuleBlock(styleCSS, '.nav-links li a');
  assert(block !== null, '.nav-links li a rule not found in css/style.css');
  assert(
    WHITE_LIKE.test(block),
    `.nav-links li a color is not white.\nblock:\n${block.trim()}`
  );
});

test('style.css › .navbar › color is whitesmoke/white (high-contrast on black)', () => {
  assert(navbarBlock !== null, '.navbar rule not found in css/style.css');
  assert(
    WHITE_LIKE.test(navbarBlock),
    `.navbar color is not white/whitesmoke.\nblock:\n${navbarBlock.trim()}`
  );
});

// ─── AC-003: no unrelated layout changes ─────────────────────────────────────

console.log('\n[AC-003] Layout properties unchanged; index.html & js/script.js untouched\n');

test('style.css › .navbar › position: fixed (unchanged)', () => {
  assert(navbarBlock !== null, '.navbar rule not found');
  assert(/position:\s*fixed/.test(navbarBlock), '.navbar position is not fixed');
});

test('style.css › .navbar › display: flex (unchanged)', () => {
  assert(navbarBlock !== null, '.navbar rule not found');
  assert(/display:\s*flex/.test(navbarBlock), '.navbar display is not flex');
});

test('style.css › .navbar › width: 100% (unchanged)', () => {
  assert(navbarBlock !== null, '.navbar rule not found');
  assert(/width:\s*100%/.test(navbarBlock), '.navbar width is not 100%');
});

test('style.css › .navbar › z-index: 10 (unchanged)', () => {
  assert(navbarBlock !== null, '.navbar rule not found');
  assert(/z-index:\s*10\b/.test(navbarBlock), '.navbar z-index is not 10');
});

test('style.css › .navbar › padding: 12px 5px (unchanged)', () => {
  assert(navbarBlock !== null, '.navbar rule not found');
  assert(
    /padding:\s*12px\s+5px/.test(navbarBlock),
    '.navbar padding is not "12px 5px"'
  );
});

test('index.html exists and is readable HTML', () => {
  assert(fs.existsSync(INDEX_HTML_PATH), 'index.html does not exist');
  const content = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert(content.length > 0, 'index.html is empty');
  assert(
    content.includes('<html') || content.includes('<!DOCTYPE'),
    'index.html does not appear to be valid HTML'
  );
});

test('js/script.js exists and is readable', () => {
  assert(fs.existsSync(SCRIPT_JS_PATH), 'js/script.js does not exist');
  const content = fs.readFileSync(SCRIPT_JS_PATH, 'utf8');
  assert(content.length > 0, 'js/script.js is empty');
});

test('index.html and js/script.js were NOT modified (git status clean)', () => {
  let statusOutput;
  try {
    // --porcelain output is empty when no changes exist for the given paths
    statusOutput = execSync(
      'git status --porcelain -- index.html js/script.js',
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch (_e) {
    // git unavailable — fall back to working-tree diff
    console.log('    (git status unavailable; trying git diff HEAD)');
    try {
      const diffOut = execSync(
        'git diff HEAD --name-only -- index.html js/script.js',
        { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      assert(
        diffOut === '',
        `index.html or js/script.js has unexpected working-tree changes:\n${diffOut}`
      );
    } catch (gitErr) {
      // git completely unavailable; just confirm files exist and skip the diff check
      if (gitErr.code === 'AssertionError' || gitErr instanceof assert.AssertionError) throw gitErr;
      console.log('    (git not available; skipping modification check — files verified to exist above)');
    }
    return;
  }

  assert(
    statusOutput === '',
    `index.html or js/script.js has unexpected modifications:\n${statusOutput}`
  );
});

// ─── AC-004: no build system; CSS files parseable ────────────────────────────

console.log('\n[AC-004] No build system configured; CSS files are parseable\n');

test('package.json does not exist (pure static site — no build tooling)', () => {
  const pkgPath = path.join(REPO_ROOT, 'package.json');
  assert(
    !fs.existsSync(pkgPath),
    'package.json unexpectedly found — a build system appears to have been introduced'
  );
});

test('css/style.css is readable and contains CSS rule blocks', () => {
  assert(fs.existsSync(STYLE_CSS_PATH), 'css/style.css does not exist');
  assert(styleCSS.length > 0, 'css/style.css is empty');
  assert(
    styleCSS.includes('{') && styleCSS.includes('}'),
    'css/style.css contains no CSS rule blocks'
  );
  assert(styleCSS.includes('.navbar'), 'css/style.css does not contain the .navbar selector');
});

test('css/responsive.css is readable and contains @media queries', () => {
  assert(fs.existsSync(RESPONSIVE_CSS_PATH), 'css/responsive.css does not exist');
  assert(responsiveCSS.length > 0, 'css/responsive.css is empty');
  assert(responsiveCSS.includes('@media'), 'css/responsive.css contains no @media rules');
  assert(
    responsiveCSS.includes('max-width: 1130px'),
    'css/responsive.css is missing the expected 1130 px breakpoint'
  );
});

// ─── summary ─────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log('\n════════════════════════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed  (${total} total)`);
console.log('════════════════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
