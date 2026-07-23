# VAST Challenge 2026 MC2 English Video Script

Suggested length: 3:40-3:55  
Demo order: `index.htm` -> Overview -> Q1 -> Q2 -> Q3  
Latest English site: https://laoshan-song.github.io/vast/VAST_Challenge_2026_MC2/index.htm?v=009a937  
Note: read the English narration aloud. The Chinese brackets are operation prompts only.

## 0:00-0:25 Opening

[操作提示：打开英文首页。先停留在标题页 1-2 秒，让老师看到这是 VAST Challenge 2026 MC2 的可视分析系统，然后点击顶部导航的 `Overview`。]

Good morning. This video presents our solution for VAST Challenge 2026 Mini-Challenge 2. The problem starts with one clue: John Windward appeared to post gibberish to SaidIt on May 17, 2046, at 04:21.

Our goal is to reconstruct how the post was made, infer where its contents came from, check whether this happened before, and recommend one intervention. We use an interactive web-based visual analytics system with EDA charts, filters, linked evidence panels, provenance views, timelines, and comparison matrices.

## 0:25-1:10 Overview: Build a Baseline First

[操作提示：进入 `Overview`。使用页面顶部的 `Guided Analysis Path`，点击 `Next` 展示总览、SaidIt 字段统计、EDA 图集。可以点开一张图放大，再关闭。]

We do not begin by assuming an explanation. We begin from the official clue, then build a baseline. The dataset contains 185,147 logged events, so one suspicious event must be compared with normal behavior.

The overview shows event types, actors, targets, time patterns, date-hour density, and SaidIt posting fields. The key baseline is the SaidIt field audit. There are 108 SaidIt posts. One hundred and five are ordinary human posts using `content`. Only three are Agent posts using `content_source`, meaning the body came from a file.

This rare field signature is our first anomaly. It explains why we trace not only John and SaidIt, but also the file named in `content_source`.

Our filtering order is: all logs, SaidIt posts, John and the target time, `content_source`, `SwiftWren.txt`, `SwiftWren_further_instructions.md`, the relay chain, and prior similar incidents.

## 1:10-1:58 Q1: How the Anomalous SaidIt Post Was Made

[操作提示：点击 `Q1`。先展示 `Guided Analysis Path`，再依次打开 `Scan post fields`、`Terminal sequence`、`Trace relay task`。在泳道图中切换 `Hop Order` 和 `Elapsed Time`，点击一个 relay 点显示事件详情。]

Q1 asks for the exact event chain and system context. The target event shows that John Windward's Agent posted with `content_source=SwiftWren.txt`, not normal typed `content`. Therefore, the post was not produced by a normal human posting workflow.

The terminal sequence gives the final seconds. A relay task arrives at John Windward's Agent. The Agent runs `saidit_post_check`, executes `saidit_post(content_source=SwiftWren.txt)`, then deletes the instruction file and the payload file.

To explain how the task reached John, we trace records involving `SwiftWren_further_instructions.md`. The chain contains 186 hops, 18 Agents, 119 cross-department hops, and five arrivals at John. The source-side view shows Emma Harbor's Agent reading `meeting_notes.doc` and creating `SwiftWren.txt`.

So the answer to Q1 is: an internal document became a payload file, the instruction propagated through multiple Agents, and John Windward's Agent posted that file to SaidIt.

## 1:58-2:42 Q2: What the Posts Mean

[操作提示：点击 `Q2`。先指向图例：绿色是 observed，黄色是 inferred，灰色是 unknown。然后展示 provenance graph、来源矩阵和 claim guardrails。]

Q2 asks what the posts mean and where their contents came from. We treat this as a provenance question, not a motive question. A key design decision is to make uncertainty visible.

In our interface, observed means directly logged. Inferred means supported by linked events, timing, and file names. Unknown means the data does not justify a firm claim.

For SwiftWren, the observed chain is `meeting_notes.doc` to `SwiftWren.txt` to SaidIt, so its probable content is meeting-note material. For MellowOtter, `strategic_directions.doc` links to `MellowOtter.txt` and then SaidIt, so its probable content is strategic-direction material. HiddenOrca has the same terminal file-source mechanism, but its upstream source is not visible.

Therefore, we infer likely origins, but we do not claim exact plaintext, motive, or hidden actor identity.

## 2:42-3:34 Q3: Recurrence and Intervention

[操作提示：点击 `Q3`。用 `Guided Analysis Path` 依次展示复发时间线、三事件对比、混淆矩阵和干预决策矩阵。重点停留在 coverage 3/3 和 false positives 0/105。]

Q3 asks whether this behavior could repeat and where to intervene. The recurrence views show that HiddenOrca and MellowOtter happened before SwiftWren. They differ in size, but share the same terminal signature: Agent relay, SaidIt check, `saidit_post` with `content_source`, and cleanup deletion.

We compare intervention candidates. Blocking general Agent relays would affect many normal workflows. Blocking file names is fragile because names can change. Detecting cleanup deletion is too late, because exposure has already happened.

Our recommended single intervention is a SaidIt boundary gate. The rule is: block or require approval when an Agent-initiated `saidit_post` contains `details.content_source`.

In the observed data, this rule catches 3 out of 3 anomalous file-source posts and has 0 observed false positives among 105 normal human posts. It is also pre-publication, so it acts before public exposure.

## 3:34-3:55 Closing

[操作提示：最后停留在 Q3 的干预决策矩阵；如果时间充足，可以回到首页。]

In summary, our system answers the challenge by moving from baseline, to anomaly detection, to chain reconstruction, to provenance reasoning, to recurrence analysis, and finally to intervention design.

The core finding is that the anomalous SaidIt post was not ordinary human communication. It was an Agent workflow failure that transformed internal files into public posts. The most defensible remedy is a SaidIt boundary gate for Agent file-source posting.
