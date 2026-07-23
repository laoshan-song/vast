# VAST Challenge 2026 MC2 Presentation Script, English, Under 4 Minutes

Suggested length: about 3:40-3:55  
Demo order: `index.htm` -> Overview -> Q1 -> Q2 -> Q3  
English site: https://laoshan-song.github.io/vast/VAST_Challenge_2026_MC2/index.htm  
Note: read only the English narration aloud. The bracketed Chinese text is for screen operation.

## 0:00-0:25 Opening

[操作提示：打开英文首页 `index.htm`。停留 1 秒，让画面显示项目标题和导航栏，然后点击 `Overview`。]

Good morning. This video presents our solution for VAST Challenge 2026 Mini-Challenge 2. The case begins with one clue: John Windward appeared to post gibberish to SaidIt on May 17, 2046, at 04:21. Our task is to explain how the post was made, what it likely means, whether it happened before, and where one intervention would be most effective.

Our system is an interactive web-based visual analytics tool. It combines statistical EDA, event filtering, linked evidence panels, provenance views, timelines, and recurrence comparison. The goal is to move from logs to defensible answers.

## 0:25-1:10 Overview: Starting Point and Baseline

[操作提示：在 `Overview` 页顶部使用 `Guided Analysis Path`。依次点击 `Next`，展示事件总览、SaidIt 字段统计和 EDA 图集。可以点击一张图放大，再关闭。]

We start from the official clue: a SaidIt post by John at a specific time. Before tracing it, we build a baseline. The dataset has 185,147 logged events, so one event only becomes meaningful relative to normal behavior.

The overview page shows event types, actor and target composition, hourly activity, date-hour density, and the SaidIt post-field audit. The critical result is this: among 108 SaidIt posts, 105 are normal human posts using `content`. Only three are Agent posts using `content_source`, where the body comes from a file. This rare field signature gives us a data-driven entry point.

Our filtering sequence is: all logs, SaidIt posts, the John-and-time target, `content_source`, `SwiftWren.txt`, `SwiftWren_further_instructions.md`, the relay chain, and then historical recurrence.

## 1:10-1:55 Q1: How the Anomalous Post Was Made

[操作提示：点击 `Q1`。先展示顶部 `Guided Analysis Path`，再点击到 `Scan post fields`、`Terminal sequence` 和 `Trace relay task`。在泳道图中切换 `Hop Order` / `Elapsed Time`，并点击一个 relay 点显示详情。]

Q1 asks for the exact chain and system context. The target event shows that John Windward's Agent posted with `content_source=SwiftWren.txt`, not ordinary typed `content`. So the post was generated from a file source through the Agent system.

The final seconds form a five-step terminal sequence: relay arrival at John Windward's Agent, `saidit_post_check`, `saidit_post(content_source=SwiftWren.txt)`, deletion of the instruction file, and deletion of the payload file.

To explain how the task reached John, we trace events involving `SwiftWren_further_instructions.md`. The chain contains 186 relay hops, 18 Agents, 119 cross-department hops, and five arrivals at John. The source-side view shows Emma Harbor's Agent reading `meeting_notes.doc` and creating `SwiftWren.txt`. Therefore, the post was made by an Agent-mediated file-posting workflow, not by John manually typing gibberish.

## 1:55-2:40 Q2: Meaning, Origin, and Evidence Boundary

[操作提示：点击 `Q2`。先指向图例，说明绿色是 observed，黄色是 inferred，灰色是 unknown。然后展示 `Content Provenance Graph`、来源矩阵和 `Claim Guardrails`。]

Q2 asks what the posts mean and where their contents came from. We treat this as a provenance problem. The key design decision is to separate evidence levels. Observed means directly logged. Inferred means supported by timing, file names, and linked actions. Unknown means not supported enough for a firm claim.

For SwiftWren, the observed chain is `meeting_notes.doc` to `SwiftWren.txt` to SaidIt, so the probable content is meeting-note material. For MellowOtter, `strategic_directions.doc` links to `MellowOtter.txt` and SaidIt, so the probable content is strategic-direction material. HiddenOrca has the same terminal mechanism, but its upstream source is not visible.

So we can identify likely origins and meanings, but we cannot recover exact plaintext, motive, or hidden actor identity from the logs alone.

## 2:40-3:35 Q3: Recurrence and One Intervention

[操作提示：点击 `Q3`。用 `Guided Analysis Path` 依次展示复发时间线、三事件对比、混淆矩阵和干预决策矩阵。重点停留在 coverage 3/3、false positives 0/105。]

Q3 asks whether the behavior could repeat and where to intervene. The historical views show two prior incidents before SwiftWren: HiddenOrca and MellowOtter. They differ in scale, but all three share the same terminal signature: Agent relay, SaidIt check, `saidit_post` with `content_source`, and cleanup deletes.

We compare interventions using data. Blocking broad relay behavior would affect many normal automated workflows. Blocking specific file names is fragile. Detecting delete events is too late because the post has already been published.

Our chosen intervention is a SaidIt boundary gate: block or require approval when an Agent-initiated `saidit_post` contains `details.content_source`. In the observed data, this catches 3 out of 3 anomalous file-source posts and produces 0 observed false positives among 105 normal human posts. It also acts before public exposure.

## 3:35-3:55 Closing

[操作提示：最后停在 Q3 的干预决策矩阵，或者返回英文首页。建议停在干预矩阵，因为最后一句正好对应 remedy。]

In conclusion, our system maps the baseline, traces the exact chain, separates observed evidence from inference and unknowns, identifies recurrence, and recommends one targeted boundary intervention. The core finding is that this was not ordinary human communication. It was an Agent workflow failure that transformed internal files into public SaidIt posts.
