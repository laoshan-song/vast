# MC2 Reviewer Quick Start

This file is a navigation aid for reviewers. It is not a replacement for the official answer page.

## Open First

1. Open `final_report_0709.html` for the concise written answer.
2. Open `rebuild/index.html` for the interactive visual analytics system.
3. If reviewing the final zip, open root `index.htm` first, then follow the relative links to `rebuild/`.

## What To Check In The Interactive Site

| View | What To Inspect | Why It Matters |
|---|---|---|
| Overview | Baseline: 185,147 events, 108 SaidIt posts, 3 Agent `content_source` anomalies | Establishes normal behavior before the anomaly claim |
| Q1 | Click terminal recipe boxes or relay points | Shows event ids, timestamps, actors, actions, and raw JSON behind the target chain |
| Q2 | Switch SwiftWren, MellowOtter, and HiddenOrca | Separates observed provenance, inferred meaning, and unknown source/content limits |
| Q3 | Click recurrence markers or the SaidIt gate evidence panel | Verifies prior issues and why the one intervention has 3/3 coverage and 0/105 normal-post false positives |

## Evidence Boundary

- Observed: directly present in the event logs.
- Inferred: derived from linked observed records.
- Unknown: not supported by the provided data.

The final answer does not claim:

- exact leaked file text,
- HiddenOrca's original source document,
- a proven human attacker identity,
- motive or intent as fact,
- universal prevention of every future variant.

## Best-Fit Grading Interpretation

The core contribution is a visual analytics incident reconstruction:

1. Establish a system baseline.
2. Isolate the anomaly signature: Agent-initiated SaidIt post with `content_source`.
3. Reconstruct the SwiftWren chain for the May 17 04:21 target post.
4. Trace content provenance where visible.
5. Compare prior occurrences.
6. Recommend one minimal boundary intervention.

## Manual Items Still Required Before Official Submission

- Fill real team metadata and primary contact.
- Fill total team hours.
- Choose public repository permission YES/NO.
- Add a stable <=4 minute narrated video link or bundled video file.
- Create a GitHub tag or release if the live GitHub Pages demo is submitted.
