import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const contact = readFileSync(new URL('../contact.html', import.meta.url), 'utf8');

test('contact form posts JSON to the Clarvix form receiver', () => {
  assert.match(script, /https:\/\/forms\.clarvix\.net\/v1\/contact/);
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

test('contact page security policy permits only the intake host for form posts', () => {
  assert.match(contact, /connect-src 'self' https:\/\/forms\.clarvix\.net/);
  assert.match(contact, /form-action 'self'/);
  assert.match(contact, /name="plan" value="not_sure"/);
  assert.match(contact, /name="responder_count"/);
  assert.match(contact, /name="privacy_notice_acknowledged"[^>]*required|id="cf-privacy"[^>]*required/);
  assert.match(contact, /href="privacy\.html"/);
});

test('only the contact page (the one with the lead form) allows connections to the form receiver', async () => {
  const { readdirSync } = await import('node:fs');
  for (const file of readdirSync(new URL('../', import.meta.url)).filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    assert.equal(html.includes('forms.clarvix.net'), file === 'contact.html', file);
    assert.equal(html.includes('n8n'), false, file);
  }
});

test('no hosting-provider leftovers: GitHub Pages is the only publishing target', async () => {
  const { existsSync, readFileSync: read } = await import('node:fs');
  for (const f of ['netlify.toml', '_redirects', '_headers', '.netlify', 'vercel.json']) assert.equal(existsSync(new URL('../' + f, import.meta.url)), false, f);
  assert.equal(read(new URL('../CNAME', import.meta.url), 'utf8').trim(), 'web.clarvix.net');
  assert.ok(existsSync(new URL('../.nojekyll', import.meta.url)));
});

test('privacy notice describes exactly the system in use: first-party form server and the contact mailbox', () => {
  const privacy = readFileSync(new URL('../privacy.html', import.meta.url), 'utf8');
  assert.match(privacy, /שרת הטפסים של Clarvix/);
  assert.match(privacy, /contact@clarvix\.net/);
  assert.doesNotMatch(privacy, /n8n/i);
});
