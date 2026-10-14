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
    const logos = [...source.matchAll(/<img\b[^>]*class="brand-logo"[^>]*>/g)].map((match) => match[0]);
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

test('below-the-fold portfolio imagery uses compact WebP assets', () => {
  assert.match(html['index.html'], /images\/clarvix-screenshot\.webp/);
  assert.match(css, /images\/sunny-hero\.webp/);
  assert.ok(statSync(join(root, 'images/clarvix-screenshot.webp')).size < 250_000);
  assert.ok(statSync(join(root, 'images/sunny-hero.webp')).size < 250_000);
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

test('Clarvix Core offer replaces the retired booking plans everywhere on the home page', () => {
  assert.match(html['index.html'], /Clarvix Core/);
  assert.match(html['index.html'], /2,900/);
  assert.match(html['index.html'], /2,200/);
  assert.match(html['index.html'], /עוסק פטור/);
  assert.doesNotMatch(html['index.html'], /Clarvix 24\/7|Clarvix Care|2,490|4,990/);
});

test('the current offer has no monthly change allowance and uses a central Clarvix domain account', () => {
  assert.match(html['index.html'], /אין מכסת שינויים חודשית/);
  assert.match(html['index.html'], /חשבון ניהול מרכזי/);
  assert.doesNotMatch(html['index.html'], /15 דקות|microchange/i);
});

test('Smart Request demonstration is local-only and builds a WhatsApp URL in the browser', () => {
  assert.match(html['index.html'], /id="smart-demo-form"/);
  assert.match(script, /Smart Request demo: builds the message locally/);
  assert.match(script, /encodeURIComponent\(summary\)/);
});
