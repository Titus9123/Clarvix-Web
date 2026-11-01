import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const page=readFileSync(new URL("../contact.html",import.meta.url),"utf8");
test("contact methods offer WhatsApp, email and phone",()=>{assert.match(page,/https:\/\/wa\.me\/972534377718/);assert.match(page,/mailto:contact@clarvix\.net/);assert.match(page,/tel:\+972534377718/);});
