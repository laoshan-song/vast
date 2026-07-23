# VAST Challenge 2026 MC2 Presentation Script, English, Under 4 Minutes

建议时长：3:30-3:55  
展示顺序：英文首页 -> Overview -> Q1 -> Q2 -> Q3  
英文网页入口：https://laoshan-song.github.io/vast/VAST_Challenge_2026_MC2/index.htm  
说明：正文为英文口播稿；方括号内为中文操作提示，不需要读出来。每个页面顶部新增了 `Guided Analysis Path`，录屏时优先用它的 Next / Open current evidence 控制节奏。

## 0:00-0:25 Opening

[操作提示：打开英文首页 `index.htm`，先停留 1-2 秒让老师看到这是正式入口，然后点击导航里的 `Overview`。]

Good morning. This project addresses VAST Challenge 2026 Mini-Challenge 2. The prompt gives us one clue: John Windward appeared to post gibberish on SaidIt on May 17, 2046 at 04:21. Our goal is not to guess John’s intention, but to reconstruct the logged system behavior, explain the likely content origin, check recurrence, and recommend one defensible intervention.

## 0:25-1:05 Overview: From Baseline to Anomaly

[操作提示：停在 `Overview` 页面顶部的 `Guided Analysis Path`。先点第 1 步，再点 `Next` 到第 2 步，页面会自动高亮对应证据面板。随后滚动到 `Statistical EDA Atlas`，任选一张图点击放大，再关闭。]

We begin with a baseline because an anomaly only makes sense relative to normal behavior. The dataset contains 185,147 logged events. The overview figures summarize event types, actor and target composition, hourly activity, date-hour density, SaidIt post fields, and virus or decoy activity.

The key EDA result is the SaidIt field audit. Among 108 SaidIt posts, 105 are ordinary human posts using the `content` field. Only three are Agent posts using `content_source`, meaning the post body came from a file. This rare field-level signature becomes the investigation entry point for all three questions.

[操作提示：点击某张图下方的 `Open evidence view`，或在 `Guided Analysis Path` 中点 `Open current evidence`。这里不用细讲，只要让老师看到统计图和引导步骤都能联动到证据视图。]

The interface follows overview first, then details on demand: figures give the statistical route, and evidence links jump to raw event-supported views.

## 1:05-1:55 Q1: How the Anomalous Post Was Made

[操作提示：打开 `Q1` 页面，先用顶部 `Guided Analysis Path` 点到第 2 步和第 3 步。它会自动跳到 EDA 图和 `Terminal Five-Step Recipe`。]

Q1 asks for the exact event chain and system context. Starting from SaidIt, John Windward, and 04:21, the target event shows that John Windward’s Agent posted with `content_source=SwiftWren.txt`, not ordinary `content`. The post body was supplied from a file rather than typed as normal forum text.

The terminal five-step recipe shows the final seconds: relay arrival, `saidit_post_check`, `saidit_post(content_source=SwiftWren.txt)`, instruction-file deletion, and payload-file deletion.

[操作提示：在 Q1 的引导面板点第 4 步 `Trace task propagation`，页面会跳到 `Agent Relay Swimlane`。点击 `Hop Order` / `Elapsed Time` 切换视图；再点击一个 relay 点，展示 event details。]

Tracing `SwiftWren_further_instructions.md` backward gives the system chain: 186 relay hops, 18 Agents, 119 cross-department hops, and five arrivals at John. The file lifecycle view links the payload to Emma Harbor’s Agent reading `meeting_notes.doc` and creating `SwiftWren.txt`. Therefore, the post came from an Agent-mediated file-posting workflow, not John manually composing a post.

## 1:55-2:40 Q2: Meaning, Origin, and Evidence Boundaries

[操作提示：打开 `Q2` 页面。先指向顶部 `Guided Analysis Path` 和证据图例：绿色 observed，黄色 inferred，灰色 unknown。这里要强调证据边界。]

Q2 asks what the posts mean. We treat this as a provenance question, not a motive question. The logs do not preserve full payload text, so we do not claim exact plaintext or intent.

The provenance figures separate three stages: source document, payload file, and public SaidIt post. SwiftWren links `meeting_notes.doc` to `SwiftWren.txt` to the SaidIt post. MellowOtter links `strategic_directions.doc` to `MellowOtter.txt` to SaidIt. HiddenOrca shares the terminal file-source mechanism, but its upstream source is not visible.

[操作提示：在 Q2 引导面板依次点 `Link provenance rows` 和 `State guardrails`。页面会高亮 `Content Provenance Graph` 和 `Claim Guardrails`，可以点击图中的节点或矩阵格。]

The bounded answer is: SwiftWren probably exposed meeting-note material, MellowOtter probably exposed strategic-direction material, and HiddenOrca’s origin remains unknown. Exact body text, motive, and missing sources are outside the evidence.

## 2:40-3:35 Q3: Recurrence and One Intervention

[操作提示：打开 `Q3` 页面。用 `Guided Analysis Path` 依次点 `Prove recurrence`、`Compare candidates`、`Select one gate`。重点展示 Figure 1 复发时间线、Figure 4 混淆矩阵、Figure 6 决策权衡矩阵。]

Q3 asks whether this can repeat and where to intervene. HiddenOrca and MellowOtter occurred before SwiftWren. The three incidents differ in scale, but all share the same terminal mechanism: relay to John’s Agent, SaidIt post check, `saidit_post` with `content_source`, and cleanup deletes.

We compare intervention candidates rather than choosing by intuition. Broad relay blocking would affect many normal automation records. File-name rules are easy to evade. Delete-file alerts occur after exposure. The strongest single intervention is a SaidIt boundary gate: block or require approval when an Agent-initiated `saidit_post` contains `details.content_source`.

In the observed data, this rule catches 3 out of 3 anomalous file-source posts and has 0 observed false positives among 105 ordinary human posts. It is also pre-publication, so it acts before external exposure.

## 3:35-3:55 Closing

[操作提示：结尾可以停在 Q3 的干预矩阵，也可以返回英文首页。推荐停在干预矩阵，因为最后一句正好讲 intervention。]

In summary, the anomalous post was a system workflow failure: an internal document became a payload file, the task propagated through Agents, John Windward’s Agent posted the file to SaidIt, and cleanup followed. The system answers Q1 with the exact chain, Q2 with provenance boundaries, and Q3 with recurrence evidence and a defensible boundary intervention.
