import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const home = readFileSync(new URL("../index.html", import.meta.url), "utf8");
test("new offer and three loyalty prices are displayed",()=>{ for (const x of ["הטמעת פתרונות דיגיטליים בהתאמה אישית לעסקים", "160 ₪ / חודש", "144 ₪ / חודש", "128 ₪ / חודש", "1,760 ₪ / שנה", "1,584 ₪ / שנה", "1,408 ₪ / שנה"]) assert.ok(home.includes(x), x); });
test("retired offers do not appear on public pages",()=>{ for (const file of ["index.html","contact.html","about.html","terms.html","cancellation.html","privacy.html","404.html","landing-pages.html","business-websites.html","landing-page-or-website.html"]) { const s=readFileSync(new URL("../"+file, import.meta.url),"utf8"); assert.doesNotMatch(s,/Clarvix Core|Smart Request|2,900|2,200|Clarvix 24\/7/i,file); } });
