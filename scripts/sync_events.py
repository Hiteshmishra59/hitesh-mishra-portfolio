#!/usr/bin/env python3
"""Safely refresh the static portfolio events.json from public Google Sheets CSV tabs.

Requires no pip dependencies. Run from repo root. Keeps the current events.json
untouched if fetching, parsing, or validation fails.
"""
import csv
import datetime as dt
import hashlib
import io
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'events.json'
SHEET_ID = os.environ.get('HITESH_SHEET_ID', '').strip()
START_YEAR = int(os.environ.get('HITESH_START_YEAR', '2024'))
END_YEAR = int(os.environ.get('HITESH_END_YEAR', str(dt.date.today().year + 1)))
MIN_ROWS = int(os.environ.get('HITESH_MIN_ROWS', '100'))

# Excel headings seen in Projects Overview — Hitesh.xlsx:
# Event Date | Event Name | Event Type | Footfall | Event Location | Scope
HEADERS = {
    'date': {'event date', 'date', 'event dates', 'dates'},
    'name': {'event name', 'event', 'project name', 'project'},
    'type': {'event type', 'type', 'category'},
    'footfall': {'footfall', 'attendance', 'attendees', 'audience'},
    'location': {'event location', 'location', 'venue', 'city'},
    'scope': {'scope', 'scope of work', 'responsibility', 'responsibilities', 'role', 'work scope'},
}

def tidy(value):
    return re.sub(r'\s+', ' ', str(value or '')).strip()

def canonical(value):
    return re.sub(r'[^a-z0-9]+', ' ', tidy(value).lower()).strip()

def load_csv(year):
    if not SHEET_ID or not re.fullmatch(r'[a-zA-Z0-9_-]{20,}', SHEET_ID):
        raise ValueError('HITESH_SHEET_ID must be set to the Google Sheet ID')
    query = urllib.parse.urlencode({'tqx': 'out:csv', 'sheet': str(year)})
    url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?{query}'
    req = urllib.request.Request(url, headers={'User-Agent': 'HiteshPortfolioSync/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            content_type = resp.headers.get('Content-Type', '')
            raw = resp.read(3_000_000)
    except urllib.error.HTTPError as exc:
        if exc.code in (400, 404):
            return None
        raise
    body = raw.decode('utf-8-sig', errors='replace')
    if not raw or body.lstrip().startswith(('<!DOCTYPE', '<html', '{"version"')) or 'text/html' in content_type:
        raise ValueError(f'{year}: Google returned HTML/error instead of CSV. Check sheet access and tab name.')
    return list(csv.reader(io.StringIO(body)))

def parse_sheet(rows, year):
    if not rows:
        return []
    cols = None
    data_start = None
    for i, row in enumerate(rows[:20]):
        names = [canonical(x) for x in row]
        matching = {}
        for field, possible in HEADERS.items():
            matches = [k for k, s in enumerate(names) if s in possible]
            if matches:
                matching[field] = matches[0]
        if 'name' in matching and len(matching) >= 4:
            cols = matching
            data_start = i + 1
            break
    if cols is None:
        raise ValueError(f'{year}: Could not identify event headings. Expected Event Name and at least 3 other known columns.')
    events = []
    for row_idx, row in enumerate(rows[data_start:], start=data_start + 1):
        def value(field):
            c = cols.get(field)
            return tidy(row[c]) if c is not None and c < len(row) else ''
        name = value('name')
        if not name or canonical(name) in ('event name', 'total', 'grand total'):
            continue
        # Explicit publishing control if a 'Public' or 'Publish' column is supplied.
        names = [canonical(x) for x in rows[data_start - 1]]
        public_col = next((i for i, n in enumerate(names) if n in ('public', 'publish', 'publish on website')), None)
        if public_col is not None:
            marked = tidy(row[public_col]).lower() if public_col < len(row) else ''
            if marked not in ('yes', 'true', '1', 'published', 'public'):
                continue
        date = value('date')
        footfall = value('footfall')
        # Previously identified typos in the old exported spreadsheet: never
        # publish these known invalid values while awaiting corrected sheet data.
        if year == 2026 and 'fire india expo' in canonical(name) and '26th to 20th' in date.lower():
            date = ''
        if year == 2024 and 'nova new year bash' in canonical(name) and footfall.lower() == 'around 1.5':
            footfall = ''
        stable_id = hashlib.sha1(f'{year}|{canonical(name)}|{row_idx}'.encode()).hexdigest()[:12]
        events.append({'id': f'gs-{stable_id}', 'year': year, 'name': name,
                       'date': date, 'type': value('type'), 'footfall': footfall,
                       'location': value('location'), 'scope': value('scope'), 'public': True})
    return events

def main():
    if END_YEAR < START_YEAR or END_YEAR - START_YEAR > 15:
        raise ValueError('Invalid year range')
    collected = []
    by_year = {}
    for year in range(START_YEAR, END_YEAR + 1):
        rows = load_csv(year)
        if rows is None:
            print(f'{year}: tab not available (404/400); skipping')
            continue
        ev = parse_sheet(rows, year)
        print(f'{year}: {len(ev)} public records')
        by_year[year] = len(ev)
        collected.extend(ev)
    if len(collected) < MIN_ROWS:
        raise ValueError(f'Only {len(collected)} records found (minimum {MIN_ROWS}); current events.json NOT overwritten.')
    # 2024/2025/2026 were expected from verified export; avoid silently dropping
    # a previously populated year due to renamed/private tabs.
    for year in (2024, 2025, 2026):
        if START_YEAR <= year <= END_YEAR and by_year.get(year, 0) < 1:
            raise ValueError(f'{year} tab missing/empty; refusing to overwrite existing events.json.')
    old_count = None
    if OUTPUT.exists():
        old = json.loads(OUTPUT.read_text(encoding='utf-8'))
        old_count = len(old)
        if old_count and len(collected) < old_count * 0.75:
            raise ValueError(f'New count {len(collected)} fell below 75% of previous {old_count}; refusing replacement.')
    new_content = json.dumps(collected, ensure_ascii=False, indent=2) + '\n'
    if OUTPUT.exists() and OUTPUT.read_text(encoding='utf-8').strip() == new_content.strip():
        print('No change in events data.')
        return
    temp = OUTPUT.with_suffix('.json.tmp')
    temp.write_text(new_content, encoding='utf-8')
    temp.replace(OUTPUT)
    print(f'Updated {OUTPUT.name}: {old_count} -> {len(collected)} entries')

if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'SYNC FAILED: {exc}', file=sys.stderr)
        sys.exit(1)

