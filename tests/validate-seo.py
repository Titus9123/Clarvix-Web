"""Static route, metadata and structured-data checks; no external requests."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin,urlsplit,unquote
import json,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent
BASE='https://web.clarvix.net/'
class Page(HTMLParser):
 def __init__(self,source):
  super().__init__(convert_charrefs=True);self.tags=[];self.ids=[];self.feed(source)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);self.tags.append((tag,a))
  if 'id' in a:self.ids.append(a['id'])
def visible(s):
 s=re.sub(r'<span aria-hidden="true">.*?</span>','',s,flags=re.S)
 from html import unescape
 return unescape(re.sub('<[^>]+>','',s)).strip()
sources={p.name:p.read_text() for p in ROOT.glob('*.html')}
pages={n:Page(s) for n,s in sources.items()}
titles=set();descriptions=set();canons=set();count=0
for name,page in pages.items():
 tags=page.tags;s=sources[name];attrs=lambda tag:[a for t,a in tags if t==tag]
 assert attrs('html')[0]=={'lang':'he','dir':'rtl'},name
 assert len(attrs('h1'))==1,name
 assert len(page.ids)==len(set(page.ids)),f'{name}: duplicate IDs'
 title=re.search(r'<title>(.*?)</title>',s,re.S)[1]
 assert title not in titles; titles.add(title)
 desc=[a['content'] for a in attrs('meta') if a.get('name')=='description'];assert len(desc)==1
 assert desc[0] not in descriptions;descriptions.add(desc[0])
 canonical=[a['href'] for a in attrs('link') if a.get('rel')=='canonical'];assert len(canonical)==1
 assert canonical[0]==BASE+('' if name=='index.html' else name);assert canonical[0] not in canons;canons.add(canonical[0])
 noindex=any('noindex' in a.get('content','') for a in attrs('meta') if a.get('name')=='robots')
 assert noindex==(name=='404.html'),name
 assert '<noscript><style>.reveal{opacity:1!important;transform:none!important}</style></noscript>' in s
 for tag,a in tags:
  key='href' if tag in ['a','link'] else 'src' if tag in ['img','script'] else None
  if not key or key not in a:continue
  url=urlsplit(urljoin(canonical[0],a[key]));
  if url.scheme not in ['https','http'] or url.netloc!='web.clarvix.net':continue
  target=unquote(url.path).lstrip('/') or 'index.html';assert (ROOT/target).is_file(),f'{name}: missing {target}'
  if url.fragment and target in pages:assert unquote(url.fragment) in pages[target].ids,f'{name}: broken {a[key]}'
  count+=1
 for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S):
  data=json.loads(block);assert data['@context']=='https://schema.org'
  graph=data['@graph'];org=next(x for x in graph if x['@type']=='Organization')
  assert org['@id']==BASE+'#organization';assert 'address' not in org;assert 'sameAs' not in org
  for entity in graph:
   assert entity['@type']!='ProfessionalService'
   if entity['@type']=='FAQPage':
    actual=[(visible(q),visible(a)) for q,a in re.findall(r'<details[^>]*>\s*<summary>(.*?)</summary>\s*<p>(.*?)</p>\s*</details>',s,re.S)]
    assert actual==[(x['name'],x['acceptedAnswer']['text']) for x in entity['mainEntity']],f'{name}: FAQ mismatch'
   if entity['@type']=='Service':
    assert entity['provider']['@id']==org['@id']
    for offer in entity['offers']:
     assert offer['priceCurrency']=='ILS'
     if 'Dynamic' in offer['name']:assert 'price' not in offer and offer['priceSpecification']['minPrice'] in [7500,8900]
 if name=='404.html':
  for tag,a in tags:
   for k in ['href','src']:
    if k in a:assert a[k].startswith(('/','#','https:','http:','mailto:','tel:')),f'404 nested resource {a[k]}'
urls=[e.text for e in ET.parse(ROOT/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
expected={BASE+('' if n=='index.html' else n) for n in pages if n!='404.html'}
assert len(urls)==len(set(urls));assert set(urls)==expected
print(f'PASS: {len(pages)} HTML pages; {count} internal links/assets; unique metadata, H1, RTL, anchors, canonicals, matching FAQ schema, nested 404 resources; {len(urls)} sitemap URLs.')
