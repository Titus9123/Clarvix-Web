import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const page=readFileSync(new URL("../contact.html",import.meta.url),"utf8");
test("contact methods offer WhatsApp, email and phone",()=>{assert.match(page,/https:\/\/wa\.me\/972534377718/);assert.match(page,/mailto:contact@clarvix\.net/);assert.match(page,/tel:\+972534377718/);});
test('form retains the original intake fields and endpoint',()=>{for(const field of ['name="name"','name="phone"','name="email"','name="business_type"','name="responder_count"','name="has_existing_site"','name="plan"']) assert.ok(page.includes(field),field); const s=readFileSync(new URL('../script.js',import.meta.url),'utf8');assert.match(s,/https:\/\/n8n\.clarvix\.net\/webhook\/clarvix\/web-lead/);assert.match(s,/fetch\(CONTACT_ENDPOINT/);});
