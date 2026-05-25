#!/usr/bin/env python3
"""
Convert MC2 data.json (semi-structured event log) into a flat, structured CSV
for downstream data analysis.

Each event type has different detail fields; this script normalizes them into
a consistent set of columns, extracting semantic meaning from nested structures.
"""

import json
import csv
import sys
from datetime import datetime, timezone

DATA_FILE = "MC2 data.json"
OUTPUT_FILE = "MC2_data_structured.csv"

# ---- helpers ----

def extract_name(party_str):
    """Extract the human-readable name from a party identifier.
    'person:john_doe' -> 'john_doe'
    'Agent/person:john_doe' -> 'john_doe'
    'world:calendar' -> 'calendar'
    'team:hiring' -> 'hiring'
    """
    if ':' in party_str:
        return party_str.split(':', 1)[1]
    return party_str

def get_actor_type(party_str):
    """Classify the party type."""
    if party_str.startswith('Agent/person:'):
        return 'agent'
    elif party_str.startswith('person:'):
        return 'person'
    elif party_str.startswith('world:'):
        return 'system'
    elif party_str.startswith('team:'):
        return 'team'
    elif party_str.startswith('department:'):
        return 'department'
    return 'other'

def get_primary_party(parties):
    """Return the first party that is a person or agent."""
    for p in parties:
        if p.startswith('person:') or p.startswith('Agent/person:'):
            return p
    return parties[0] if parties else ''

def ts_to_iso(ts):
    """Convert unix timestamp to ISO datetime string."""
    try:
        return datetime.fromtimestamp(ts, tz=timezone.utc).strftime('%Y-%m-%dT%H:%M:%S')
    except (ValueError, OSError):
        return ''

# ---- main conversion ----

def flatten_event(e):
    """Flatten a single event into a dict of CSV columns."""
    row = {}

    # --- Core fields ---
    row['id'] = e.get('id', '')
    row['short_name'] = e.get('short_name', '')
    row['when'] = e.get('when', '')
    row['datetime'] = ts_to_iso(e.get('when', 0))

    # --- Parties ---
    parties = e.get('parties', [])
    row['parties'] = '|'.join(parties)
    row['party_count'] = len(parties)

    primary = get_primary_party(parties)
    row['primary_party'] = primary
    row['primary_name'] = extract_name(primary) if primary else ''
    row['primary_type'] = get_actor_type(primary) if primary else ''

    # Is any party an Agent?
    has_agent = any(p.startswith('Agent/person:') for p in parties)
    row['is_agent_action'] = has_agent

    # All person names involved
    person_names = set()
    agent_names = set()
    for p in parties:
        name = extract_name(p)
        if p.startswith('Agent/person:'):
            agent_names.add(name)
        elif p.startswith('person:'):
            person_names.add(name)
    row['persons_involved'] = '|'.join(sorted(person_names))
    row['agents_involved'] = '|'.join(sorted(agent_names))

    # --- Details ---
    details = e.get('details') or {}

    # Flatten all top-level detail keys that are simple values
    for key, val in details.items():
        if isinstance(val, (str, int, float, bool)):
            col_name = f'd_{key}'
            row[col_name] = val
        elif val is None:
            row[f'd_{key}'] = ''

    # --- Semantic extractions ---

    # person field (which person the event relates to)
    person_ref = details.get('person', '')
    if person_ref:
        row['ref_person'] = extract_name(person_ref)

    # target field
    target = details.get('target', '')
    if target:
        row['ref_target'] = extract_name(target) if ':' in str(target) else target

    # task field (for assign_agent_task, queue_subordinate_task, etc.)
    task = details.get('task', '')
    if task:
        row['task_type'] = task

    # Nested details.task for assign_agent_task
    inner_details = details.get('details', {})
    if isinstance(inner_details, dict):
        inner_task = inner_details.get('task', '')
        if inner_task:
            row['sub_task_type'] = inner_task
        inner_person = inner_details.get('person', '')
        if inner_person:
            row['sub_person'] = extract_name(inner_person) if ':' in str(inner_person) else inner_person
        inner_target = inner_details.get('target', '')
        if inner_target:
            row['sub_target'] = extract_name(inner_target) if ':' in str(inner_target) else inner_target

    # File operations
    action = details.get('action', '')
    if action:
        row['action'] = action
    file_target = details.get('target', '')
    if file_target and action in ('read_file', 'create_file', 'delete_file', 'list_files'):
        row['file_path'] = file_target

    # file field
    file_field = details.get('file', '')
    if file_field:
        row['file_path'] = file_field

    # create_file metadata
    if 'size_hint' in details:
        row['file_size_hint'] = details['size_hint']
    if 'word_count' in details:
        row['file_word_count'] = details['word_count']

    # Virus flag
    if 'virus' in details:
        row['virus'] = details['virus']

    # Access type
    access_type = details.get('access_type', '')
    if access_type:
        row['access_type'] = access_type

    # Email fields
    for ef in ('from', 'to', 'subject', 'status'):
        if ef in details:
            row[f'email_{ef}'] = details[ef]

    # SaidIt / Flex post fields
    for sf in ('forum', 'content_source', 'poster_id', 'timestamp', 'content'):
        if sf in details:
            row[f'post_{sf}'] = details[sf]

    # meeting fields
    meeting = details.get('meeting', {})
    if isinstance(meeting, dict):
        row['meeting_organizer'] = meeting.get('organizer', '')
        if 'participants' in meeting:
            row['meeting_participants'] = '|'.join(meeting['participants'])
        row['meeting_time'] = meeting.get('time', '')

    # a2a (agent-to-agent) fields
    a2a = details.get('a2a', {})
    if isinstance(a2a, dict):
        row['a2a_from'] = a2a.get('from', '')
        row['a2a_to'] = a2a.get('to', '')
        row['a2a_action'] = a2a.get('action', '')
        payload = a2a.get('payload', {})
        if isinstance(payload, dict):
            if 'participants' in payload:
                row['a2a_participants'] = '|'.join(payload['participants'])
            row['a2a_organizer'] = payload.get('organizer', '')
            row['a2a_time'] = payload.get('time', '')

    # calendar_emails_sent
    cal_emails = details.get('calendar_emails_sent', [])
    if cal_emails:
        row['calendar_emails_sent'] = '|'.join(cal_emails)

    # Room / access fields
    for rf in ('room', 'name', 'granted'):
        if rf in details:
            row[f'room_{rf}'] = details[rf]

    # ask_agent
    row['question'] = details.get('question', '')
    row['response'] = details.get('response', '')

    # give_advice
    row['advice'] = details.get('advice', '')
    row['advice_topic'] = details.get('topic', '')

    # suggest_contacts
    contacts = details.get('contacts', [])
    if contacts:
        row['suggested_contacts'] = '|'.join(contacts)

    # spread (for queue_subordinate_task)
    if 'spread' in details:
        row['spread'] = details['spread']

    # args (for queue_subordinate_task)
    args = details.get('args', '')
    if args:
        row['qst_args'] = args

    # combo (for check_in)
    combo = details.get('combo', '')
    if combo:
        row['checkin_combo'] = combo
    source = details.get('source', '')
    if source:
        row['checkin_source'] = source

    # time field
    time_str = details.get('time', '')
    if time_str:
        row['detail_time'] = time_str

    return row


def collect_all_columns(events):
    """First pass: collect all possible column names."""
    all_cols = set()
    for i, e in enumerate(events):
        row = flatten_event(e)
        all_cols.update(row.keys())
        if i % 50000 == 0:
            print(f"  Scanning columns... {i}/{len(events)}", file=sys.stderr)
    return sorted(all_cols)


def main():
    print("Loading JSON data...", file=sys.stderr)
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)

    events = data['events']
    print(f"Total events: {len(events)}", file=sys.stderr)

    # First pass: collect all columns
    print("Collecting all column names...", file=sys.stderr)
    columns = collect_all_columns(events)
    print(f"Total columns: {len(columns)}", file=sys.stderr)

    # Ensure core columns come first
    core_order = ['id', 'short_name', 'when', 'datetime',
                  'primary_party', 'primary_name', 'primary_type',
                  'is_agent_action', 'party_count', 'parties',
                  'persons_involved', 'agents_involved']
    remaining = [c for c in columns if c not in core_order]
    final_columns = core_order + remaining

    # Write CSV
    print(f"Writing CSV to {OUTPUT_FILE}...", file=sys.stderr)
    with open(OUTPUT_FILE, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=final_columns, extrasaction='ignore')
        writer.writeheader()

        for i, e in enumerate(events):
            row = flatten_event(e)
            writer.writerow(row)
            if i % 50000 == 0:
                print(f"  Writing... {i}/{len(events)}", file=sys.stderr)

    print(f"Done. Output: {OUTPUT_FILE}", file=sys.stderr)
    print(f"Rows: {len(events)}, Columns: {len(final_columns)}", file=sys.stderr)


if __name__ == '__main__':
    main()
