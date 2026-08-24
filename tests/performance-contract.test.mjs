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

test('Google Ads measurement and conversion IDs remain intact', () => {
  assert.match(script, /AW-18364963340/);
  assert.match(script, /NmvECPz3--EcEIy0jLVE/);
  assert.match(script, /UWaaCP_3--EcEIy0jLVE/);
  assert.match(script, /9EsmCPn3--EcEIy0jLVE/);
  for (const source of Object.values(html)) {
    assert.match(source, /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=AW-18364963340"><\/script>/);
  }
});
