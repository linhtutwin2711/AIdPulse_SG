import urllib.request, xml.etree.ElementTree as ET, json, re
from email.utils import parsedate_to_datetime
ns = {'media': 'http://search.yahoo.com/mrss/'}
# Word-boundary health filter (case-insensitive) — avoids "influence"/"near" false hits.
RX = re.compile(r'\b(dengue|covid|coronavirus|vaccin\w*|influenza|flu|virus\w*|hospitals?|'
                r'outbreaks?|diseases?|measles|hfmd|mosquito\w*|infections?|healthcare|health|'
                r'wellness|wastewater|booster|epidemic|pandemic|fever|diabetes|cancer|vaping|'
                r'smoking|clinic|illness|dialysis|mental health|public health|ministry of health|'
                r'MOH|NEA|HSA|HPB)\b', re.IGNORECASE)
FEEDS = ['10416', '6511', '6311']  # CNA Singapore, Asia, World
seen, rows = set(), []
for cid in FEEDS:
    url = 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=%s' % cid
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        items = ET.fromstring(urllib.request.urlopen(req, timeout=25).read()).findall('.//item')
    except Exception as e:
        print('feed', cid, 'error', e); continue
    for it in items:
        title = (it.findtext('title') or '').strip()
        link = (it.findtext('link') or '').strip()
        desc = (it.findtext('description') or '').strip()
        cat = (it.findtext('category') or '').strip()
        pub = it.findtext('pubDate')
        th = it.find('media:thumbnail', ns)
        img = th.attrib.get('url') if th is not None else None
        if not title or not link or link in seen or not img:
            continue
        if not RX.search(title + ' ' + desc + ' ' + cat):
            continue
        seen.add(link)
        try: iso = parsedate_to_datetime(pub).isoformat() if pub else None
        except Exception: iso = None
        rows.append({'title': title[:300], 'summary': (desc[:500] or None), 'source_name': 'CNA',
                     'source_url': link, 'category': (cat.split(',')[0].strip() if cat else 'Health'),
                     'location': 'Singapore', 'severity': None, 'image_url': img, 'published_at': iso})
rows = rows[:12]
open('.tmp_rows.json', 'w', encoding='utf-8').write(json.dumps(rows))
print('built', len(rows), 'health rows with images:')
for r in rows: print('  -', r['title'][:75])
