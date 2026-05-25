#!/usr/bin/env python3
"""
Generate interactive HTML dashboard for MC2 visualization.
Extracts data from original JSON and embeds inline in a single HTML file.
"""
import json
import pandas as pd
from collections import defaultdict

# ===== Load data =====
with open('../MC2 data.json') as f:
    raw = json.load(f)

with open('../org_chart.json') as f:
    org = json.load(f)

# ===== Department mapping =====
dept_name = {}
team_to_dept = {}
person_dept = {}

for node in org['nodes']:
    nid = node['id']
    if nid.startswith('department:'):
        dept_name[nid] = node.get('label', nid)

for edge in org['edges']:
    src = edge['source']
    tgt = edge['target']
    if src.startswith('department:') and tgt.startswith('team:'):
        team_to_dept[tgt] = src
    elif src.startswith('team:') and tgt.startswith('person:'):
        person_dept[tgt] = team_to_dept.get(src, 'Unknown')

def get_dept(name):
    for prefix in ['person:', 'Agent/person:']:
        d = person_dept.get(f'{prefix}{name}', '')
        if d:
            return d.split(':')[-1] if ':' in d else str(d)
    return 'Unknown'

# Department colors
DEPT_COLORS = {
    'executive_suite': '#e74c3c',
    'information_technologies': '#3498db',
    'customer_support': '#e67e22',
    'products': '#2ecc71',
    'human_resources': '#9b59b6',
    'legal': '#1abc9c',
    'Unknown': '#95a5a6',
}

# ===== Extract chain network data =====
nodes_set = set()
chain_edges = []

for e in raw['events']:
    sn = e['short_name']
    d = e.get('details') or {}
    search_str = json.dumps(d).lower()

    chain_name = None
    if 'hiddenorca' in search_str: chain_name = 'HiddenOrca'
    elif 'swiftwren' in search_str: chain_name = 'SwiftWren'
    elif 'mellowotter' in search_str: chain_name = 'MellowOtter'

    if sn == 'queue_subordinate_task' and chain_name:
        parties = e.get('parties', [])
        src = ''
        for p in parties:
            if 'person:' in p:
                src = p.split(':')[-1]
                break

        target = d.get('target_agent', d.get('target', ''))
        if ':' in str(target):
            target = str(target).split(':')[-1]

        if src and target and src != target:
            chain_edges.append({
                'source': src, 'target': target, 'chain': chain_name,
                'time': pd.Timestamp(e['when'], unit='s').strftime('%m/%d %H:%M'),
                'srcDept': get_dept(src), 'dstDept': get_dept(target),
            })
            nodes_set.add(src)
            nodes_set.add(target)

nodes_list = []
for p in sorted(nodes_set):
    d = get_dept(p)
    nodes_list.append({
        'name': p, 'dept': d, 'category': list(DEPT_COLORS.keys()).index(d) if d in DEPT_COLORS else 6
    })

# ===== Micro-Gantt data =====
def extract_window(ts_start, ts_end):
    events = []
    for e in raw['events']:
        ts = e['when']
        if ts_start <= ts <= ts_end:
            d = e.get('details') or {}
            parties = e.get('parties', [])
            actor = ''
            for p in parties:
                if 'person:' in p:
                    actor = p.split(':')[-1]
                    break

            detail = ''
            sn = e['short_name']
            if sn in ('read_file','create_file','delete_file'):
                detail = d.get('target', '')
            elif sn == 'queue_subordinate_task':
                detail = f"→ {str(d.get('target_agent','')).split(':')[-1]}"
                if d.get('args'):
                    detail += f" [{d['args'].get('path','')}]"
            elif sn == 'saidit_post':
                detail = f"forum={d.get('forum','')} src={d.get('content_source','')}"
            elif sn == 'saidit_post_check':
                detail = 'CHECK trigger'
            elif sn == 'assign_agent_task':
                detail = d.get('task', '')

            is_agent = any('Agent/' in p for p in parties)
            events.append({
                'ts': ts,
                'time': pd.Timestamp(ts, unit='s').strftime('%H:%M:%S.%f')[:-3],
                'event': sn, 'actor': actor, 'isAgent': is_agent, 'detail': detail,
            })
    events.sort(key=lambda x: x['ts'])
    return events

# SwiftWren creation window: 15:01:54 - 15:02:03
swift_create = extract_window(2409490914, 2409490923)
# SwiftWren post window: 11:21:13 - 11:21:17
swift_post = extract_window(2410168873, 2410168877)

# All three post windows combined
orca_post = extract_window(2409423500, 2409999999)  # Will be filtered
# Actually find HiddenOrca post
orca_post_ts = None
mellow_post_ts = None
for e in raw['events']:
    d = e.get('details') or {}
    if e['short_name'] == 'saidit_post' and d.get('content_source') == 'HiddenOrca.txt':
        orca_post_ts = e['when']
    if e['short_name'] == 'saidit_post' and d.get('content_source') == 'MellowOtter.txt':
        mellow_post_ts = e['when']

orca_post = extract_window(orca_post_ts - 5, orca_post_ts + 5) if orca_post_ts else []
mellow_post = extract_window(mellow_post_ts - 5, mellow_post_ts + 5) if mellow_post_ts else []

# ===== Signal vs Noise =====
noise_hourly = defaultdict(int)
signal_hourly = defaultdict(int)

for e in raw['events']:
    ts = e['when']
    hour = int(ts // 3600) * 3600
    d = e.get('details') or {}

    if d.get('virus') == True:
        noise_hourly[hour] += 1
    if e['short_name'] == 'queue_subordinate_task' and d.get('task') == 'read_file':
        signal_hourly[hour] += 1

all_hours = sorted(set(list(noise_hourly.keys()) + list(signal_hourly.keys())))
ts_data = []
for h in all_hours:
    dt = pd.Timestamp(h, unit='s')
    ts_data.append({
        'time': dt.strftime('%m/%d %H:00'),
        'ts': h,
        'noise': noise_hourly[h],
        'signal': signal_hourly[h],
    })

# Key moments for annotation
key_moments_data = []
for ts_val, label in [
    (2409490921, 'SwiftWren created'),
    (2409583500, 'HiddenOrca posted'),
    (2409606121, 'MellowOtter created'),
    (2409621000, 'Virus starts'),
    (2409638160, 'MellowOtter posted'),
    (2409776400, 'Virus ends'),
    (2410168875, 'SwiftWren posted'),
]:
    dt = pd.Timestamp(ts_val, unit='s')
    key_moments_data.append({
        'time': dt.strftime('%m/%d %H:00'),
        'label': label,
    })

# ===== File size data =====
file_sizes = []
for e in raw['events']:
    if e['short_name'] == 'create_file':
        d = e.get('details') or {}
        fname = d.get('target', '')
        size = d.get('size_hint', 0)
        words = d.get('word_count', 0)
        if size:
            # Categorize files
            cat = 'Other'
            if 'irrigation' in fname.lower(): cat = 'Virus files'
            elif fname.endswith('.txt') and not fname.endswith('instructions.md') and 'further' not in fname:
                cat = 'Chain payload (.txt)'
            elif 'further_instructions' in fname: cat = 'Chain instructions'

            parties = e.get('parties', [])
            actor = ''
            for p in parties:
                if 'person:' in p:
                    actor = p.split(':')[-1]
                    break

            file_sizes.append({
                'file': fname, 'size': size, 'words': words, 'category': cat,
                'time': pd.Timestamp(e['when'], unit='s').strftime('%m/%d %H:%M'),
                'person': actor,
            })

# ===== Key file pairs for provenance =====
# meeting_notes.doc read → SwiftWren.txt create (same size)
# Actually we don't have meeting_notes.doc size. But we have the txt sizes.
# The important comparison is the create_file size_hint patterns.
chain_files = [f for f in file_sizes if f['category'] == 'Chain payload (.txt)']
virus_files = [f for f in file_sizes if f['category'] == 'Virus files']

# ===== Write all to JSON for HTML =====
dashboard_data = {
    'nodes': nodes_list,
    'chain_edges': chain_edges,
    'swift_create': swift_create,
    'swift_post': swift_post,
    'orca_post': orca_post,
    'mellow_post': mellow_post,
    'ts_data': ts_data,
    'key_moments': key_moments_data,
    'file_sizes': file_sizes,
    'chain_files': chain_files,
    'dept_colors': DEPT_COLORS,
    'dept_names': {k.split(':')[-1] if ':' in k else k: v for k, v in dept_name.items()},
}

with open('dashboard_data.json', 'w') as f:
    json.dump(dashboard_data, f, ensure_ascii=False, default=str)

print(f"Dashboard data extracted: {len(nodes_list)} nodes, {len(chain_edges)} edges")
print(f"Swift create: {len(swift_create)} events, Swift post: {len(swift_post)} events")
print(f"Orca post: {len(orca_post)}, Mellow post: {len(mellow_post)}")
print(f"TS points: {len(ts_data)}, File sizes: {len(file_sizes)}")
print("✓ dashboard_data.json ready")
