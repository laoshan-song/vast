# VAST Challenge 2026 MC2 Submission

Open `index.htm` first for the concise answer and links to the interactive visual analytics system.

The interactive evidence views are in `rebuild/`:

- `overview.html`: system baseline and anomaly signature
- `q1.html`: exact relay mechanism and terminal event sequence
- `q2.html`: content provenance and evidence boundaries
- `q3.html`: recurrence evidence and the recommended intervention

Start in `Review` mode for the concise evidence path. Switch to `Explore` for supporting baselines and alternative views. Incident, relay-axis, and Agent selections are preserved in the page URL when moving between views; `Reset` returns to the default SwiftWren review.

The core visual methods include a directly-follows process comparison, a 108-post rule-space plot, an Agent relay swimlane, an evidence provenance DAG, and a shared-Agent UpSet plot. Interactive marks support keyboard focus and details on demand.

All links and visualizations are self-contained and work offline. The submitted package intentionally excludes the raw challenge data, exploratory notebooks, and internal analysis notes.
