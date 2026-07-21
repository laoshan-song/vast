# VAST Challenge 2026 MC2 Submission

Open `index.htm` first for the concise English answer and links to the interactive visual analytics system. `index_zh.htm` is the Chinese mirror for classroom explanation and team review.

The interactive evidence views are in `rebuild/`:

- `overview.html`: system baseline and anomaly signature
- `q1.html`: exact relay mechanism and terminal event sequence
- `q2.html`: content provenance and evidence boundaries
- `q3.html`: recurrence evidence and the recommended intervention

Start in `Review` mode for the concise evidence path. Switch to `Explore` for supporting baselines and alternative views. Incident, relay-axis, and Agent selections are preserved in the page URL when moving between views; `Reset` returns to the default SwiftWren review.

The core visual methods include a directly-follows process comparison, a 108-post rule-space plot, an Agent relay swimlane, an evidence provenance DAG, and a shared-Agent UpSet plot. Interactive marks support keyboard focus and details on demand.

The official answer entry `index.htm` includes exactly six supporting figures for each question; `index_zh.htm` mirrors the same structure in Chinese. Each official figure links to its corresponding interactive evidence view. `pre_submission_validator.js` checks those figure counts, figure-to-evidence links, local links, statistical-gallery image references, and current Tools Used wording before final packaging.

## Tools Used

- HTML, CSS, vanilla JavaScript, and custom SVG for the final interactive visual analytics system.
- Python `rebuild/extract_data.py` for extracting auditable evidence objects from the official `MC2 data.json` and `org_chart.json`.
- PNG statistical figure gallery generated from the extracted evidence data for EDA-style descriptive charts.
- Playwright / `playwright-core` with Microsoft Edge for screenshot QA, linked-interaction checks, layout checks, and figure lightbox verification.
- Git and GitHub Pages for version control and static hosting.

The submitted rebuild does not require Tableau, Vega-Lite, or a D3 runtime. Older D3 prototypes in development folders are not part of the canonical review path.

All links and visualizations are self-contained and work offline. The submitted package intentionally excludes the raw challenge data, exploratory notebooks, and internal analysis notes.
