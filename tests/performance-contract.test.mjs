import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pages = ['index.html', 'about.html', 'contact.html', 'terms.html'];
const html = Object.fromEntries(pages.map((page) => [page, readFileSync(join(root, page), 'utf8')]));
const script = readFileSync(join(root, 'script.js'), 'utf8');
const css = readFileSync(join(root, 'style.css'), 'utf8');

for (const [page, source] of Object.entries(html)) {
  test(`${page}: fonts and scripts do not block first render`, () => {
    assert.doesNotMatch(source, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
    assert.match(source, /href="fonts\.css"/);
    assert.match(source, /<script src="script\.js(?:\?[^\"]+)?" defer><\/script>/);
  });

  test(`${page}: rendered logos reserve space and use the optimized asset`, () => {
    const logos = [...source.matchAll(/<img\b[^>]*clarvix-web-logo[^>]*>/g)].map((match) => match[0]);
    assert.ok(logos.length >= 2, 'header and footer logos must remain');
    for (const logo of logos) {
      assert.match(logo, /src="images\/clarvix-web-logo\.webp"/);
      assert.match(logo, /width="400"/);
      assert.match(logo, /height="85"/);
    }
  });
}

test('hero content is immediately visible so LCP is not gated by JavaScript', () => {
  assert.match(html['index.html'], /class="hero-copy reveal visible"/);
  assert.match(html['index.html'], /class="hero-stage reveal visible delay"/);
});

test('every local image referenced by the home page exists and stays compact', () => {
  const refs = [...html['index.html'].matchAll(/(?:src|href)="(images\/[^"?]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0);
  for (const ref of refs) assert.ok(statSync(join(root, ref)).size < 400_000, `${ref} is too large`);
});

test('mobile avoids continuous decorative canvas work while preserving desktop motion', () => {
  assert.match(script, /const desktopMotion = window\.matchMedia\('\(min-width: 981px\)'\)\.matches;/);
  assert.match(script, /if \(hero && heroCanvas && !reducedMotion && desktopMotion\)/);
});

test('optional measurement retains conversion IDs and never loads before consent', () => {
  assert.match(script, /AW-18364963340/);
  assert.match(script, /NmvECPz3--EcEIy0jLVE/);
  assert.match(script, /UWaaCP_3--EcEIy0jLVE/);
  assert.match(script, /9EsmCPn3--EcEIy0jLVE/);
  for (const source of Object.values(html)) assert.doesNotMatch(source, /<script async src="https:\/\/www\.googletagmanager\.com/);
  assert.match(script, /function loadOptionalMeasurement\(\)/);
  assert.match(script, /savedConsent === 'analytics'/);
  assert.match(script, /anonymize_ip: true/);
});

test('shared script tolerates legal pages without home-only navigation chrome', () => {
  assert.match(script, /if \(header\) header\.classList\.toggle/);
  assert.match(script, /if \(progressBar\) progressBar\.style\.width/);
  assert.match(script, /if \(menuButton && mobileMenu && header\)/);
  assert.match(script, /if \(year\) year\.textContent/);
});

test('home page carries the three direct contact channels and the original number/email', () => {
  const home = html['index.html'];
  assert.match(home, /href="https:\/\/wa\.me\/972534377718"/);
  assert.match(home, /href="tel:\+972534377718"/);
  assert.match(home, /href="mailto:contact@clarvix\.net"/);
  assert.ok((home.match(/id="contact"/g) || []).length === 1);
});

test('fonts are not chained through @import in shared CSS', () => {
  assert.doesNotMatch(readFileSync(join(root, 'offer.css'), 'utf8'), /@import/);
});
