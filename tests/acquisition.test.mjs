import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const attribution = source.slice(0, source.indexOf('// Clickjacking defense-in-depth:'));
const formScript = source.slice(source.indexOf('// Contact form: secure'), source.indexOf('// Easter egg:'));
const BASE = 'https://web.clarvix.net';
const storage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
};
function visit(path, { referrer = '', session = storage(), result = { ok: true }, extended = false } = {}) {
  const events = {}, links = {}, requests = [];
  const button = { disabled: false };
  const status = { textContent: '', classList: { add() {} } };
  let resets = 0;
  const form = { querySelector: () => button, addEventListener: (name, fn) => { events[name] = fn; }, reset: () => resets++ };
  const window = { location: new URL(path, BASE), sessionStorage: session, dataLayer: [] };
  const context = vm.createContext({ window, dataLayer: window.dataLayer, URL, URLSearchParams, Date,
    document: { referrer, documentElement: { lang: 'he' },
      querySelectorAll: (selector) => [{ addEventListener: (_, fn) => { links[selector.includes('wa.me') ? 'whatsapp' : 'phone'] = fn; } }],
      querySelector: (selector) => selector === '#contact-form' ? form : status },
    FormData: class { get(key) { return { name: 'Test Person', phone: '0500000000', email: 'test@example.test', message: 'Test message', plan: 'landing', company: '' }[key]; } },
    fetch: async (url, init) => { requests.push({ url, ...init, payload: JSON.parse(init.body) }); if (result instanceof Error) throw result; return await result; },
    console: { error() {} }
  });
  vm.runInContext(extended ? attribution.replace('LEAD_ATTRIBUTION_FIELDS_ENABLED = false','LEAD_ATTRIBUTION_FIELDS_ENABLED = true') : attribution, context);
  vm.runInContext(formScript, context);
  return { session, context, requests, links, button, status, resets: () => resets,
    acquisition: () => JSON.parse(vm.runInContext('JSON.stringify(acquisition)',context)),
    send: () => events.submit({ preventDefault() {} }),
    events: () => window.dataLayer.filter(([command]) => command === 'event') };
}

test('campaign survives home -> service -> contact; arbitrary query data is not persisted', async () => {
  const home = visit('/?utm_source=google&utm_medium=cpc&utm_campaign=web-sep&utm_content=ad-1&email=private@example.test#x', { referrer: 'https://www.google.com/search?q=private' });
  visit('/landing-pages.html', { session: home.session, referrer: BASE + '/' });
  const contact = visit('/contact.html', { session: home.session, referrer: BASE + '/landing-pages.html', extended: true });
  await contact.send();
  const p = contact.requests[0].payload;
  assert.equal(p.utm_source,'google'); assert.equal(p.utm_medium,'cpc'); assert.equal(p.utm_campaign,'web-sep');
  assert.equal(p.landing_page, BASE + '/'); assert.equal(p.original_referrer,'https://www.google.com/');
  assert.equal(p.page_url,BASE + '/contact.html'); assert.equal(p.referrer, BASE + '/landing-pages.html');
  assert.doesNotMatch(home.session.getItem('clarvix_acquisition_v1'),/private|email=|#x/);
});

test('a new explicit campaign replaces the entire old campaign without mixing fields', async () => {
  const home=visit('/?utm_source=google&utm_campaign=old&utm_term=old-keyword');
  const next=visit('/landing-pages.html?utm_source=bing&utm_campaign=new',{session:home.session});
  const contact=visit('/contact.html',{session:next.session}); await contact.send();
  assert.equal(contact.requests[0].payload.utm_source,'bing');
  assert.equal(contact.requests[0].payload.utm_campaign,'new');
  assert.equal(contact.requests[0].payload.utm_term,'');
});

for (const [name,referrer,expected] of [['organic','https://www.google.com/search?q=web','https://www.google.com/'],['direct','','']]) {
  test(`${name} first entry retains its origin without inventing a campaign`,async()=>{
    const home=visit('/',{referrer});const contact=visit('/contact.html',{session:home.session,referrer:BASE+'/',extended:true});await contact.send();
    assert.equal(contact.requests[0].payload.original_referrer,expected);assert.equal(contact.requests[0].payload.utm_source,'');
  });
}

test('storage denied or corrupt does not prevent a successful form submission', async()=>{
  for(const session of [{getItem(){throw Error('denied')},setItem(){throw Error('denied')}},{getItem(){return '{invalid'},setItem(){}}]){
    const page=visit('/contact.html?utm_source=bing',{session});await page.send();
    assert.equal(page.requests[0].payload.utm_source,'bing');assert.equal(page.resets(),1);assert.equal(page.button.disabled,false);
  }
});

test('default form payload remains compatible; new fields require the receiver gate',async()=>{
  const page=visit('/contact.html');await page.send();
  assert.deepEqual(Object.keys(page.requests[0].payload).sort(),['name','phone','email','plan','message','company','page_url','referrer','utm_source','utm_medium','utm_campaign','utm_term','utm_content','source_language'].sort());
});

test('email, phone-like campaign values and arbitrary parameters are not persisted',()=>{
  const page=visit('/?utm_source=person%40example.test&utm_campaign=053-123-4567&customer=secret&token=secret');
  assert.equal(page.acquisition().utm_source,'');assert.equal(page.acquisition().utm_campaign,'');
  assert.doesNotMatch(page.session.getItem('clarvix_acquisition_v1'),/secret|example.test|053/);
});

test('normal campaign punctuation and Hebrew names remain usable',()=>{
  const campaign = '[2026.09] דפי נחיתה - ישראל';
  const page=visit('/?utm_campaign='+encodeURIComponent(campaign));
  assert.equal(page.acquisition().utm_campaign,campaign);
});

test('one successful submission emits one lead and one original Ads conversion, without form values',async()=>{
  const page=visit('/contact.html');await page.send();
  const events=page.events();assert.equal(events.filter(e=>e[1]==='generate_lead').length,1);
  assert.equal(events.filter(e=>e[1]==='conversion'&&e[2].send_to==='AW-18364963340/9EsmCPn3--EcEIy0jLVE').length,1);
  assert.doesNotMatch(JSON.stringify(events),/Test Person|0500000000|test@example|Test message/);
});

for(const [name,result] of [['HTTP failure',{ok:false,status:500}],['network failure',new Error('offline')]]){
  test(`${name} emits no conversion or lead and permits retry`,async()=>{
    const page=visit('/contact.html',{result});await page.send();assert.equal(page.events().length,0);
    assert.equal(page.resets(),0);assert.equal(page.button.disabled,false);assert.match(page.status.textContent,/לא הצלחנו/);
  });
}

test('repeated submission while request is pending sends once',async()=>{
  let resolve; const result=new Promise(r=>{resolve=r});const page=visit('/contact.html',{result});
  const first=page.send();await page.send();assert.equal(page.requests.length,1);resolve({ok:true});await first;
  assert.equal(page.events().filter(e=>e[1]==='generate_lead').length,1);
});

test('contact clicks each emit one named event plus the matching original Ads event',()=>{
  const page=visit('/');page.links.whatsapp();page.links.phone();
  assert.deepEqual(page.events().map(e=>e[1]),['conversion','whatsapp_click','conversion','phone_click']);
  assert.equal(page.events()[0][2].send_to,'AW-18364963340/NmvECPz3--EcEIy0jLVE');
  assert.equal(page.events()[2][2].send_to,'AW-18364963340/UWaaCP_3--EcEIy0jLVE');
});
