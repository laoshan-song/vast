#!/usr/bin/env python3
"""
MC2 rebuild — data extraction.
Reads ONLY the raw challenge data (MC2 data.json, org_chart.json) and emits a
compact mc2_viz_data.json used by the q1/q2/q3/overview pages.

All display times are CHALLENGE-LOCAL (UTC-7) to match the official anchor
"John Windward, May 17 2046 4:21am".
"""
import json, datetime, hashlib, os
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, "MC2 data.json")
ORG = os.path.join(ROOT, "org_chart.json")
OUT = os.path.join(HERE, "mc2_viz_data.json")

TZ = datetime.timedelta(hours=7)  # challenge local = UTC-7


def det(e):
    d = e.get("details")
    return d if isinstance(d, dict) else {}


def local(w):
    return (datetime.datetime.utcfromtimestamp(w) - TZ).strftime("%Y-%m-%d %H:%M:%S")


def short(pid):
    """person:emma_harbor / Agent/person:emma_harbor -> emma_harbor"""
    if pid is None:
        return None
    return pid.split(":")[-1]


def first_existing(paths):
    for p in paths:
        if os.path.exists(p):
            return p
    raise FileNotFoundError("Could not locate required data file in:\n" + "\n".join(paths))


def file_manifest(path):
    digest = hashlib.sha256()
    with open(path, "rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return {
        "name": os.path.basename(path),
        "bytes": os.path.getsize(path),
        "sha256": digest.hexdigest().upper(),
    }


RAW = first_existing([
    RAW,
    os.path.join(os.path.dirname(os.path.dirname(ROOT)), "MC2_赛题与数据包_20260712", "02_官方原始数据",
                 "VAST_Challenge_2026_MC2", "VAST_Challenge_2026_MC2", "MC2 data.json"),
])
ORG = first_existing([
    ORG,
    os.path.join(os.path.dirname(os.path.dirname(ROOT)), "MC2_赛题与数据包_20260712", "02_官方原始数据",
                 "VAST_Challenge_2026_MC2", "VAST_Challenge_2026_MC2", "org_chart.json"),
])


def main():
    data = json.load(open(RAW))
    ev = data["events"]
    ev.sort(key=lambda e: (e["when"], e["id"]))
    print("events:", len(ev))

    out = {"generated_from": "MC2 data.json (185147 events) + org_chart.json",
           "timezone": "challenge-local UTC-7",
           "schema_version": 2,
           "source_files": {
               "events": file_manifest(RAW),
               "organization": file_manifest(ORG),
           }}

    # ---- system overview: event type + party type distributions ----
    sn = Counter(e["short_name"] for e in ev)
    out["event_type_counts"] = dict(sn.most_common())
    pref = Counter()
    for e in ev:
        for p in e.get("parties", []):
            key = p.split(":")[0] if ":" in p else p.split("/")[0]
            pref[key] += 1
    out["party_type_counts"] = dict(pref.most_common())
    out["total_events"] = len(ev)
    out["time_span_local"] = [local(ev[0]["when"]), local(ev[-1]["when"])]

    # ---- global time density for overview context ----
    codenames = ["HiddenOrca", "MellowOtter", "SwiftWren"]
    hour_bins = defaultdict(lambda: {
        "total": 0,
        "virus": 0,
        "saidit_post": 0,
        "content_source_post": 0,
        "queue_subordinate_task": 0,
        "codename_related": 0,
    })
    day_short = defaultdict(Counter)
    for e in ev:
        hr = local(e["when"])[:13] + ":00"
        dd = local(e["when"])[:10]
        de = det(e)
        blob = json.dumps(de)
        hour_bins[hr]["total"] += 1
        day_short[dd][e["short_name"]] += 1
        if de.get("virus") is True:
            hour_bins[hr]["virus"] += 1
        if e["short_name"] == "saidit_post":
            hour_bins[hr]["saidit_post"] += 1
            if "content_source" in de:
                hour_bins[hr]["content_source_post"] += 1
        if e["short_name"] == "queue_subordinate_task":
            hour_bins[hr]["queue_subordinate_task"] += 1
        if any(c in blob for c in codenames):
            hour_bins[hr]["codename_related"] += 1
    out["time_density"] = [
        {"hour": k, **v} for k, v in sorted(hour_bins.items())
    ]
    out["daily_event_mix"] = [
        {"day": day, "top": dict(cnt.most_common(6)), "total": sum(cnt.values())}
        for day, cnt in sorted(day_short.items())
    ]

    # ---- the anomaly signature: content_source posts ----
    cs_posts = sorted([e for e in ev if "content_source" in det(e)], key=lambda x: x["when"])
    out["anomalous_posts"] = [{
        "id": e["id"], "file": det(e)["content_source"], "forum": det(e).get("forum"),
        "when_local": local(e["when"]), "by": short(e["parties"][0])
    } for e in cs_posts]

    # ---- baseline: all saidit_post, who posts, with content vs content_source ----
    saidit = [e for e in ev if e["short_name"] == "saidit_post"]
    by_person = sum(1 for e in saidit if any(p.startswith("person:") for p in e["parties"]))
    by_agent = sum(1 for e in saidit if any(p.startswith("Agent/") for p in e["parties"]))
    with_content = sum(1 for e in saidit if "content" in det(e) and det(e).get("content"))
    with_src = sum(1 for e in saidit if "content_source" in det(e))
    out["saidit_baseline"] = {
        "total": len(saidit), "by_person": by_person, "by_agent": by_agent,
        "with_content_topic": with_content, "with_content_source": with_src,
    }

    # ---- saidit_post_check outcome: does a check lead to a post or a forward? ----
    checks = [e for e in ev if e["short_name"] == "saidit_post_check"]
    check_by = Counter(short(e["parties"][0]) for e in checks)
    # for each check, look at the same actor's next action within 5s
    idx_by_actor = defaultdict(list)
    for e in ev:
        for p in e["parties"][:1]:
            idx_by_actor[short(p)].append(e)
    check_leads_post = 0
    check_leads_other = 0
    for c in checks:
        actor = short(c["parties"][0])
        after = [x for x in idx_by_actor[actor] if 0 < x["when"] - c["when"] <= 5]
        after.sort(key=lambda x: x["when"])
        nxt = after[0]["short_name"] if after else None
        if nxt == "saidit_post":
            check_leads_post += 1
        else:
            check_leads_other += 1
    out["saidit_check"] = {
        "total_checks": len(checks),
        "checks_leading_to_post": check_leads_post,
        "checks_not_posting": check_leads_other,
        "checks_by_john": check_by.get("john_windward", 0),
    }
    compact_posts = []
    for post in saidit:
        actor = short(post["parties"][0])
        actor_events = idx_by_actor[actor]
        prior_check = any(x["short_name"] == "saidit_post_check"
                          and 0 < post["when"] - x["when"] <= 5
                          for x in actor_events)
        cleanup = any(x["short_name"] == "delete_file"
                      and 0 < x["when"] - post["when"] <= 10
                      for x in actor_events)
        compact_posts.append({
            "id": post["id"],
            "when_local": local(post["when"]),
            "actor": actor,
            "actor_type": "Agent" if any(p.startswith("Agent/") for p in post["parties"]) else "Human",
            "source_field": "content_source" if "content_source" in det(post) else "content",
            "post_check": prior_check,
            "cleanup": cleanup,
            "file": det(post).get("content_source"),
        })
    out["saidit_posts_compact"] = compact_posts

    # ---- queue_subordinate_task overview + task types ----
    qst = [e for e in ev if e["short_name"] == "queue_subordinate_task"]
    task_types = Counter(det(e).get("task") for e in qst)
    out["qst_overview"] = {"total": len(qst), "task_types": dict(task_types.most_common(8))}

    # ================= per-incident chain reconstruction =================
    incidents = {}
    for code in codenames:
        inc = {"code": code}
        instr = f"{code}_further_instructions.md"

        # relay hops: queue_subordinate_task carrying this codename's instruction file
        hops = [e for e in qst if instr in json.dumps(det(e))]
        hops.sort(key=lambda x: x["when"])
        hop_list = []
        for e in hops:
            frm = short(e["parties"][0])
            to = short(e["parties"][1]) if len(e["parties"]) > 1 else None
            hop_list.append({"id": e["id"], "from": frm, "to": to, "when": local(e["when"])})
        inc["hops"] = hop_list
        inc["hop_count"] = len(hop_list)

        # distinct agents involved
        agents = set()
        for h in hop_list:
            agents.add(h["from"]);  agents.add(h["to"])
        agents.discard(None)
        inc["distinct_agents"] = sorted(agents)
        inc["distinct_agent_count"] = len(agents)

        # origin = sender of first hop
        inc["origin"] = hop_list[0]["from"] if hop_list else None
        inc["first_hop_when"] = hop_list[0]["when"] if hop_list else None
        inc["last_hop_when"] = hop_list[-1]["when"] if hop_list else None

        # create_file / source doc for the payload
        creates = [e for e in ev if e["short_name"] == "create_file"
                   and f"{code}.txt" == det(e).get("target")]
        if creates:
            c = creates[0]
            inc["create_file"] = {"id": c["id"], "by": short(c["parties"][0]),
                                  "when": local(c["when"]),
                                  "size_hint": det(c).get("size_hint"),
                                  "word_count": det(c).get("word_count")}
            # what source doc did that actor read right before create?
            actor = short(c["parties"][0])
            before = [x for x in idx_by_actor[actor]
                      if x["short_name"] == "read_file" and 0 <= c["when"] - x["when"] <= 10
                      and str(det(x).get("target", "")).endswith(".doc")]
            before.sort(key=lambda x: x["when"])
            if before:
                b = before[-1]
                inc["source_doc"] = {"id": b["id"], "name": det(b).get("target"),
                                     "read_by": short(b["parties"][0]), "when": local(b["when"])}
            else:
                inc["source_doc"] = None
        else:
            inc["create_file"] = None
            inc["source_doc"] = None

        # terminal recipe: john's events in a tight window around the post
        post = next((e for e in cs_posts if det(e).get("content_source") == f"{code}.txt"), None)
        if post:
            lo, hi = post["when"] - 8, post["when"] + 8
            john_ev = [e for e in ev if 0 < len([p for p in e["parties"] if "john_windward" in p])
                       and lo <= e["when"] <= hi]
            john_ev.sort(key=lambda x: x["when"])
            inc["recipe"] = [{"id": e["id"], "action": e["short_name"],
                              "when": local(e["when"]),
                              "from": short(e["parties"][0]),
                              "to": short(e["parties"][1]) if len(e["parties"]) > 1 else None,
                              "detail": {k: v for k, v in det(e).items()
                                         if k in ("content_source", "target", "task", "forum", "path")
                                         or (isinstance(det(e).get("args"), dict) and False)}}
                             for e in john_ev]
            inc["post"] = {"id": post["id"], "when": local(post["when"])}

        # how many times did the token reach john as target (relay arrivals)?
        arrivals = [h for h in hop_list if h["to"] == "john_windward"]
        inc["john_arrivals"] = arrivals
        inc["john_arrival_count"] = len(arrivals)

        arrival_outcomes = []
        for h in arrivals:
            hw = next((e["when"] for e in hops if e["id"] == h["id"]), None)
            post_when = post["when"] if post else None
            after = []
            if hw is not None:
                after = [x for x in idx_by_actor["john_windward"] if 0 < x["when"] - hw <= 120]
                after.sort(key=lambda x: x["when"])
            nxt = after[0] if after else None
            if post_when is not None and hw is not None and 0 <= post_when - hw <= 120:
                outcome = "posted to SaidIt"
            elif nxt and nxt["short_name"] == "queue_subordinate_task":
                outcome = "forwarded/continued relay"
            elif nxt:
                outcome = nxt["short_name"]
            else:
                outcome = "no immediate John action"
            arrival_outcomes.append({
                "arrival_id": h["id"],
                "arrival_when": h["when"],
                "from": h["from"],
                "outcome": outcome,
                "next_event_id": nxt["id"] if nxt else None,
                "next_action": nxt["short_name"] if nxt else None,
                "next_when": local(nxt["when"]) if nxt else None,
            })
        inc["john_arrival_outcomes"] = arrival_outcomes

        incidents[code] = inc

    out["incidents"] = incidents

    # ---- cross-department analysis using org chart ----
    # org is a NetworkX tree: company -> department -> team -> person, via
    # edges with relation 'contains'; department leads via relation 'led_by'.
    org = json.load(open(ORG))
    edges = org.get("edges") or org.get("links") or []
    parent = {}          # child_id -> (parent_id, relation)
    for e in edges:
        parent[e["target"]] = (e["source"], e.get("relation"))

    def dept_of(person_id):
        """walk up to the department:* ancestor"""
        cur = person_id
        seen = 0
        while cur in parent and seen < 8:
            p, _ = parent[cur]
            if p.startswith("department:"):
                return p.split(":")[-1]
            cur = p
            seen += 1
        return None

    def team_of(person_id):
        p = parent.get(person_id)
        if p and p[0].startswith("team:"):
            return p[0].split(":")[-1]
        return None

    def is_lead(person_id):
        p = parent.get(person_id)
        return bool(p and p[1] == "led_by")

    person_ids = [n["id"] for n in org["nodes"] if n["id"].startswith("person:")]
    person_dept = {short(pid): dept_of(pid) for pid in person_ids}
    person_team = {short(pid): team_of(pid) for pid in person_ids}
    person_lead = {short(pid): is_lead(pid) for pid in person_ids}
    out["org"] = {"person_dept": person_dept, "person_team": person_team,
                  "person_lead": person_lead, "node_count": len(org["nodes"])}

    # ---- EDA overview baselines: department, file operations, and actor context ----
    dept_stats = defaultdict(lambda: {
        "total_first_party_events": 0,
        "relay_sent": 0,
        "relay_received": 0,
        "file_ops": 0,
        "saidit_posts": 0,
        "codename_related": 0,
        "distinct_people": set(),
    })
    actor_stats = defaultdict(lambda: {
        "total_first_party_events": 0,
        "relay_sent": 0,
        "relay_received": 0,
        "file_ops": 0,
        "saidit_posts": 0,
        "codename_related": 0,
        "dept": None,
    })
    file_ops = Counter()
    file_ext = Counter()
    file_codename_ops = Counter()

    def detail_blob(e):
        return json.dumps(det(e), ensure_ascii=False)

    def fileish_target(e):
        de = det(e)
        return de.get("target") or de.get("content_source") or de.get("path") or de.get("filename")

    for e in ev:
        blob = detail_blob(e)
        action = e["short_name"]
        first_actor = short(e["parties"][0]) if e.get("parties") else None
        first_dept = person_dept.get(first_actor)
        if first_dept:
            dept_stats[first_dept]["total_first_party_events"] += 1
            dept_stats[first_dept]["distinct_people"].add(first_actor)
            actor_stats[first_actor]["total_first_party_events"] += 1
            actor_stats[first_actor]["dept"] = first_dept
            if action in ("read_file", "create_file", "delete_file", "access_files", "list_files"):
                dept_stats[first_dept]["file_ops"] += 1
                actor_stats[first_actor]["file_ops"] += 1
            if action == "saidit_post":
                dept_stats[first_dept]["saidit_posts"] += 1
                actor_stats[first_actor]["saidit_posts"] += 1
            if any(c in blob for c in codenames):
                dept_stats[first_dept]["codename_related"] += 1
                actor_stats[first_actor]["codename_related"] += 1
        if action == "queue_subordinate_task" and len(e.get("parties", [])) > 1:
            sender, receiver = short(e["parties"][0]), short(e["parties"][1])
            sd, rd = person_dept.get(sender), person_dept.get(receiver)
            if sd:
                dept_stats[sd]["relay_sent"] += 1
                actor_stats[sender]["relay_sent"] += 1
                actor_stats[sender]["dept"] = sd
            if rd:
                dept_stats[rd]["relay_received"] += 1
                actor_stats[receiver]["relay_received"] += 1
                actor_stats[receiver]["dept"] = rd
        if action in ("read_file", "create_file", "delete_file", "access_files", "list_files"):
            target = str(fileish_target(e) or "unknown")
            ext = os.path.splitext(target)[1].lower() or "unknown"
            file_ops[action] += 1
            file_ext[ext] += 1
            if any(c in blob for c in codenames):
                file_codename_ops[action] += 1

    out["department_activity"] = [
        {k: (len(v) if k == "distinct_people" else v) for k, v in stats.items()} | {"department": dept}
        for dept, stats in sorted(dept_stats.items())
    ]
    out["actor_activity_baseline"] = [
        {"actor": actor, **stats}
        for actor, stats in sorted(actor_stats.items(), key=lambda kv: -kv[1]["total_first_party_events"])[:24]
    ]
    out["file_operation_baseline"] = {
        "by_action": dict(file_ops.most_common()),
        "by_extension": dict(file_ext.most_common()),
        "codename_related_by_action": dict(file_codename_ops.most_common()),
    }

    # cross-department hops per incident
    for code, inc in incidents.items():
        cross = 0
        dept_edges = Counter()
        for h in inc["hops"]:
            df, dt = person_dept.get(h["from"]), person_dept.get(h["to"])
            if df and dt and df != dt:
                cross += 1
            dept_edges[(df or "unknown", dt or "unknown")] += 1
        inc["cross_dept_hops"] = cross
        depts = set()
        for a in inc["distinct_agents"]:
            if person_dept.get(a):
                depts.add(person_dept[a])
        inc["departments_touched"] = sorted(depts)
        inc["department_flow"] = [
            {"from": a, "to": b, "count": n}
            for (a, b), n in sorted(dept_edges.items(), key=lambda x: (-x[1], x[0]))
        ]

        post_ev = next((r for r in inc.get("recipe", []) if r["action"] == "saidit_post"), None)
        check_ev = next((r for r in inc.get("recipe", []) if r["action"] == "saidit_post_check"), None)
        deletes = [r for r in inc.get("recipe", []) if r["action"] == "delete_file"]
        lifecycle = []
        src = inc.get("source_doc")
        cf = inc.get("create_file")
        lifecycle.append({
            "stage": "source_read",
            "label": "source document read",
            "status": "observed" if src else "unknown",
            "when": src["when"] if src else None,
            "event_id": src["id"] if src else None,
            "actor": src["read_by"] if src else None,
            "target": src["name"] if src else None,
        })
        lifecycle.append({
            "stage": "payload_create",
            "label": "payload file created",
            "status": "observed" if cf else "unknown",
            "when": cf["when"] if cf else None,
            "event_id": cf["id"] if cf else None,
            "actor": cf["by"] if cf else None,
            "target": f"{code}.txt",
        })
        if inc.get("hops"):
            lifecycle.append({
                "stage": "first_relay",
                "label": "first visible relay",
                "status": "observed",
                "when": inc["hops"][0]["when"],
                "event_id": inc["hops"][0]["id"],
                "actor": inc["hops"][0]["from"],
                "target": inc["hops"][0]["to"],
            })
            lifecycle.append({
                "stage": "final_arrival",
                "label": "final arrival at John",
                "status": "observed" if inc["john_arrivals"] else "unknown",
                "when": inc["john_arrivals"][-1]["when"] if inc["john_arrivals"] else None,
                "event_id": inc["john_arrivals"][-1]["id"] if inc["john_arrivals"] else None,
                "actor": inc["john_arrivals"][-1]["from"] if inc["john_arrivals"] else None,
                "target": "john_windward",
            })
        lifecycle.append({
            "stage": "post_check",
            "label": "SaidIt post check",
            "status": "observed" if check_ev else "unknown",
            "when": check_ev["when"] if check_ev else None,
            "event_id": check_ev["id"] if check_ev else None,
            "actor": "john_windward" if check_ev else None,
            "target": "system:saidit",
        })
        lifecycle.append({
            "stage": "public_post",
            "label": "public SaidIt post",
            "status": "observed" if post_ev else "unknown",
            "when": post_ev["when"] if post_ev else None,
            "event_id": post_ev["id"] if post_ev else None,
            "actor": "john_windward" if post_ev else None,
            "target": f"{code}.txt",
        })
        for i, de in enumerate(deletes, 1):
            lifecycle.append({
                "stage": f"cleanup_{i}",
                "label": "cleanup delete",
                "status": "observed",
                "when": de["when"],
                "event_id": de["id"],
                "actor": "john_windward",
                "target": de["detail"].get("target"),
            })
        inc["lifecycle"] = lifecycle

    # ---- virus (decoy) window + independence proof ----
    vir = [e for e in ev if det(e).get("virus") is True]
    vw = [e["when"] for e in vir]
    vir_touch_codename = sum(1 for e in vir
                             if any(c in json.dumps(det(e)) for c in codenames))
    vir_touch_saidit = sum(1 for e in vir if any("saidit" in str(p) for p in e["parties"]))
    out["virus"] = {
        "count": len(vir),
        "window_local": [local(min(vw)), local(max(vw))] if vw else None,
        "short_name_split": dict(Counter(e["short_name"] for e in vir).most_common()),
        "task_types": dict(Counter(det(e).get("task") for e in vir if e["short_name"] == "queue_subordinate_task").most_common(4)),
        "touch_codename_files": vir_touch_codename,
        "touch_saidit": vir_touch_saidit,
    }

    # ---- data-driven intervention summary ----
    agent_cs = [e for e in saidit if "content_source" in det(e) and any(p.startswith("Agent/") for p in e["parties"])]
    normal_human_posts = [e for e in saidit if any(p.startswith("person:") for p in e["parties"])
                          and "content" in det(e) and "content_source" not in det(e)]
    filename_hits = [e for e in ev if any(f"{c}_further_instructions.md" in json.dumps(det(e)) for c in codenames)]
    john_posts = [e for e in saidit if any("john_windward" in p for p in e["parties"])]
    cleanup_after_cs = 0
    for p in agent_cs:
        actor = short(p["parties"][0])
        if any(x["short_name"] == "delete_file" and 0 < x["when"] - p["when"] <= 10
               for x in idx_by_actor[actor]):
            cleanup_after_cs += 1
    out["intervention_rules"] = [
        {
            "rule": "Agent saidit_post with details.content_source",
            "coverage": len(agent_cs),
            "known_anomalies": len(codenames),
            "normal_human_false_positives": len([e for e in normal_human_posts if "content_source" in det(e)]),
            "records_affected": len(agent_cs),
            "timing": "pre-publication",
            "decision": "recommended",
        },
        {
            "rule": "Block all queue_subordinate_task",
            "coverage": len(codenames),
            "known_anomalies": len(codenames),
            "normal_human_false_positives": len(qst) - sum(inc["hop_count"] for inc in incidents.values()),
            "records_affected": len(qst),
            "timing": "internal relay",
            "decision": "reject: broad operational blast radius",
        },
        {
            "rule": "Detect *_further_instructions.md relay filenames",
            "coverage": len(codenames),
            "known_anomalies": len(codenames),
            "normal_human_false_positives": 0,
            "records_affected": len(filename_hits),
            "timing": "internal relay",
            "decision": "reject: filename-bypass risk",
        },
        {
            "rule": "Remove John Agent SaidIt permission",
            "coverage": len(agent_cs),
            "known_anomalies": len(codenames),
            "normal_human_false_positives": 0,
            "records_affected": len(john_posts),
            "timing": "endpoint-specific",
            "decision": "reject: endpoint-bypass risk",
        },
        {
            "rule": "Alert on delete_file immediately after content_source post",
            "coverage": cleanup_after_cs,
            "known_anomalies": len(codenames),
            "normal_human_false_positives": 0,
            "records_affected": cleanup_after_cs,
            "timing": "post-exposure",
            "decision": "forensics only",
        },
    ]

    json.dump(out, open(OUT, "w"), indent=1, ensure_ascii=False)
    # also emit a JS global so pages work when opened directly as file:// (no server)
    OUT_JS = OUT[:-5] + ".js"
    with open(OUT_JS, "w") as f:
        f.write("/* auto-generated by extract_data.py — do not edit */\n")
        f.write("window.MC2_DATA = ")
        json.dump(out, f, ensure_ascii=False)
        f.write(";\n")
    sz = os.path.getsize(OUT)
    print("wrote", OUT, f"{sz/1024:.1f} KB", "and", os.path.basename(OUT_JS))
    # sanity summary
    for code, inc in incidents.items():
        print(f"  {code}: origin={inc['origin']} hops={inc['hop_count']} "
              f"agents={inc['distinct_agent_count']} john_arrivals={inc['john_arrival_count']} "
              f"cross_dept={inc.get('cross_dept_hops')} src={inc.get('source_doc')}")


if __name__ == "__main__":
    main()
