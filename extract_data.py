#!/usr/bin/env python3
"""
MC2 rebuild — data extraction.
Reads ONLY the raw challenge data (MC2 data.json, org_chart.json) and emits a
compact mc2_viz_data.json used by the q1/q2/q3/overview pages.

All display times are CHALLENGE-LOCAL (UTC-7) to match the official anchor
"John Windward, May 17 2046 4:21am".
"""
import json, datetime, os
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


def main():
    data = json.load(open(RAW))
    ev = data["events"]
    ev.sort(key=lambda e: (e["when"], e["id"]))
    print("events:", len(ev))

    out = {"generated_from": "MC2 data.json (185147 events) + org_chart.json",
           "timezone": "challenge-local UTC-7"}

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

    # ---- queue_subordinate_task overview + task types ----
    qst = [e for e in ev if e["short_name"] == "queue_subordinate_task"]
    task_types = Counter(det(e).get("task") for e in qst)
    out["qst_overview"] = {"total": len(qst), "task_types": dict(task_types.most_common(8))}

    # ================= per-incident chain reconstruction =================
    codenames = ["HiddenOrca", "MellowOtter", "SwiftWren"]
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

    # cross-department hops per incident
    for code, inc in incidents.items():
        cross = 0
        for h in inc["hops"]:
            df, dt = person_dept.get(h["from"]), person_dept.get(h["to"])
            if df and dt and df != dt:
                cross += 1
        inc["cross_dept_hops"] = cross
        depts = set()
        for a in inc["distinct_agents"]:
            if person_dept.get(a):
                depts.add(person_dept[a])
        inc["departments_touched"] = sorted(depts)

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
