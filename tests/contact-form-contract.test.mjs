import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const contact = readFileSync(new URL('../contact.html', import.meta.url), 'utf8');

test('contact form posts JSON to the Clarvix web-lead endpoint', () => {
  assert.match(script, /https:\/\/n8n\.clarvix\.net\/webhook\/clarvix\/web-lead/);
  assert.match(script, /fetch\(CONTACT_ENDPOINT/);
  assert.match(script, /method:\s*'POST'/);
  assert.doesNotMatch(script, /window\.location\.href\s*=\s*mailto/);
});

test('contact form captures attribution and bot trap fields', () => {
  for (const field of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
    assert.match(script, new RegExp(field));
  }
  assert.match(script, /document\.referrer/);
  assert.match(contact, /name="company"/);
});

test('contact form matches the live intake requirement for email and phone', () => {
  assert.match(contact, /id="cf-phone"[^>]*required/);
  assert.match(contact, /id="cf-email"[^>]*required/);
  assert.doesNotMatch(contact, /אימייל[^<]*\(לא חובה\)/);
});

test('contact page security policy permits only the intake host', () => {
  assert.match(contact, /connect-src 'self' https:\/\/n8n\.clarvix\.net/);
  assert.match(contact, /option value="core_monthly"/);
  assert.match(contact, /option value="core_annual"/);
  assert.match(contact, /option value="not_sure"/);
  assert.match(contact, /name="responder_count"/);
  assert.match(contact, /href="privacy\.html"/);
});
