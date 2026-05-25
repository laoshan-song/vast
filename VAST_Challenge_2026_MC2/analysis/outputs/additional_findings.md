# Additional MC2 Findings

These findings come from a second pass over `MC2 data.json`, beyond the core SwiftWren -> John Windward SaidIt chain.

## 1. The largest anomaly in the whole log is a virus-like file churn episode

- The full event range is `2046-05-08T20:18:12Z` to `2046-07-16T17:05:59Z`, with `185,147` events.
- `75,254` events contain `virus:true`.
- The virus-marked burst runs from `2046-05-10T20:10:00Z` to `2046-05-12T14:20:18Z`.
- It has a repeated five-step loop:
  - `check_in`
  - `read_file`
  - `create_file`
  - `delete_file`
  - `queue_subordinate_task`
- Each of those five types occurs about `15,050` times in the virus subset.
- This burst explains why `2046-05-11` and `2046-05-12` dominate global event volume.

Interpretation: there is a second major abnormal behavior in the dataset, separate from the SaidIt anomaly. It is a self-propagating file churn task centered on agricultural-looking combo files such as `fence_irrigation.txt`, `crop_irrigation.txt`, `wheat_manure.txt`, `crop_harvest.txt`, and `barn_cattle.txt`.

## 2. Queue events are mostly self-loops, not meaningful inter-person propagation

- Total `queue_subordinate_task` events: `17,038`.
- Self-loop queue events: `15,862`.
- Dominant self-loop actors:
  - `Agent/person:zoey_drydock`: `5,933`
  - `Agent/person:gabriel_sonar`: `4,254`
  - `Agent/person:owen_hatch`: `3,103`
  - `Agent/person:evelyn_dock`: `1,955`
- Dominant self-loop tasks/combo files:
  - `fence_irrigation`: `4,455`
  - `crop_irrigation`: `4,197`
  - `wheat_manure`: `3,028`
  - `crop_harvest`: `1,910`
  - `barn_cattle`: `1,456`

Interpretation: most queue traffic is not a social/organizational propagation chain. For the SaidIt investigation, cross-agent `*_further_instructions.md` delegations should be isolated from the self-loop background.

## 3. The three file-source SaidIt incidents are structurally identical but differ in propagation size

| File | Queue events | Distinct queue actors | First file event | Post event | Endpoint |
|---|---:|---:|---|---|---|
| HiddenOrca | 39 | 16 | `2046-05-08T21:50:03Z` | `2046-05-10T12:45:42Z` | John agent -> SaidIt |
| MellowOtter | 10 | 11 | `2046-05-10T15:02:01Z` | `2046-05-11T00:56:04Z` | John agent -> SaidIt |
| SwiftWren | 186 | 18 | `2046-05-09T15:02:01Z` | `2046-05-17T11:21:15Z` | John agent -> SaidIt |

Interpretation: SwiftWren is the largest and slowest of the three known file-source incidents, but it is not unique. It is the latest instance of a repeated mechanism.

## 4. John Windward is a high-volume normal poster, so blocking the person is too coarse

- Top post authors across SaidIt/FleX events:
  - `person:aria_towline`: `114`
  - `person:john_windward`: `102`
  - `person:dylan_hawser`: `99`
  - `person:anthony_reef`: `94`
  - `person:ava_tiller`: `57`
  - `Agent/person:john_windward`: `3`
- John has many ordinary posts, but only three `Agent/person:john_windward` SaidIt file-source posts.

Interpretation: an intervention on all John Windward activity would have high collateral damage. The useful discriminator is not the person; it is `agent + content_source + SaidIt`.

## 5. John agent SaidIt checks exactly match the three file-source incidents

- Total `saidit_post_check` events: `71`.
- John agent has exactly three:
  - `27283`, `2046-05-10T12:45:41Z`
  - `98582`, `2046-05-11T00:56:03Z`
  - `373899`, `2046-05-17T11:21:14Z`
- These precede the three `content_source` SaidIt posts by one second.

Interpretation: the check event is a strong immediate precursor to the anomalous file-source post when the actor is `Agent/person:john_windward`.

## 6. The final SwiftWren chain crosses organizational boundaries

Relevant org paths:

- John Windward: `Tenant Thread > Customer Support > John Windward`
- Chloe Ballast: `Tenant Thread > Information Technologies > Chloe Ballast`
- Lily Anchorline: `Tenant Thread > Information Technologies > Infrastructure > Lily Anchorline`
- Daniel Gangway: `Tenant Thread > Human Resources > Hiring > Daniel Gangway`
- Emma Harbor: `Tenant Thread > Executive Suite > Emma Harbor`

Interpretation: the propagation path is not contained within one department. The intervention should be placed at a system boundary or cross-agent task boundary, not within one team.

## 7. Agents can read other personal-agent files and prompts

- `549` `access_files` events read `personal_agent_person:*.json`.
- `2,573` `read_file` events read `agents/Agent/person:*.prompt`.

Interpretation: the environment allows broad agent introspection. This is not the direct proof for the SaidIt post, but it is a relevant risk context: agents have visibility into other agents' state/prompt files, which could help propagate behavior or identify suitable targets.

## Suggested new visual additions

1. Global event volume timeline: highlight the May 10-12 virus burst separately from the May 17 SaidIt incident.
2. Queue self-loop vs cross-agent split: show that most queue traffic is virus/self-loop background.
3. Three incident comparison: HiddenOrca, MellowOtter, SwiftWren by duration, queue count, actor count, and endpoint.
4. Intervention specificity chart: compare blocking John, blocking all queues, blocking `*_further_instructions.md`, and blocking agent `content_source` posts at SaidIt.
