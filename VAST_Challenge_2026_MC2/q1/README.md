# MC2 Q1 Event Sequence

Open `index.html` in a browser.

This standalone page answers Q1 only: how the anomalous SaidIt posts were made.
It uses `q1-data.js`, a reduced data file derived from `MC2 data.json`, so it does not depend on the existing submission page.

Visual encoding:

- Each horizontal lane is one file-source incident: HiddenOrca, MellowOtter, SwiftWren.
- Colored dots are sampled `queue_subordinate_task` hops.
- The red dot is the final `saidit_post(content_source=*.txt)`.
- The SwiftWren lane expands the source steps and the John Windward agent endpoint burst.

Important nuance:

- SwiftWren reached John Windward's agent several times before the final post.
- Earlier arrivals (`#46396`, `#123088`, `#364377`, `#364604`) did not trigger a post; John agent forwarded or self-queued the task.
- The final trigger was `#373893` (`Chloe Ballast agent -> John Windward agent`), immediately followed by `saidit_post_check`, `saidit_post`, and two `delete_file` events.
