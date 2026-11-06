import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { decodeHtml } from './helpers.mjs';

// Guard: the commercial text (services, prices, process, pricing terms, FAQ) of the production
// landing of 1 Nov 2026 must not change without explicit approval. The fixture was extracted
// from origin/main (commit 2dbb499). Any change here must be a deliberate, approved update.
const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const expected = readFileSync(new URL('./fixtures/commercial-offer.txt', import.meta.url), 'utf8');

function commercialText(source) {
  const start = source.indexOf('<section class="statement section-light" id="services">');
  // The services..FAQ block ends where the contact section (new, no commercial content) begins.
  const endCandidates = [source.indexOf('<section class="contact-cta'), source.indexOf('</main>')].filter((i) => i > start);
  const block = source.slice(start, Math.min(...endCandidates));
  return decodeHtml(block.replace(/<[^>]+>/g, '\n')).split('\n').map((l) => l.trim()).filter(Boolean).join('\n') + '\n';
}

test('services, prices, process, pricing terms and FAQ are identical to production', () => {
  assert.equal(commercialText(home), expected);
});

test('every published price from the landing is still present', () => {
  for (const price of ['160 ₪', '144 ₪', '128 ₪', '200 ₪', '180 ₪', '120 ₪', '280 ₪', '252 ₪', '1,760 ₪', '2,200 ₪', '3,080 ₪', '1,320 ₪']) {
    assert.ok(home.includes(price), `${price} missing`);
  }
});

test('structured data does not publish prices, addresses, ratings or sameAs', () => {
  const blocks = [...home.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => m[1]);
  assert.equal(blocks.length, 1);
  assert.doesNotMatch(blocks[0], /"(price|priceCurrency|offers|address|aggregateRating|review|sameAs|LocalBusiness)"/);
});
