# MC2 四分钟视频录制脚本

用途：正式录制 VAST Challenge 2026 MC2 / 课程期末展示视频。目标时长控制在 3:40-3:55，最多不超过 4:00。

录制原则：

- 展示实际网页 `rebuild/index.html` 或线上 GitHub Pages，不要只放幻灯片。
- 全程口径保持证据边界：可观测的是日志中的事件、文件名、动作和时间；不可观测的是文件正文、动机和幕后触发者身份。
- 至少演示一次 Q1/Q2/Q3 的证据 drill-down 点击。
- 使用 UTC-7 题目本地时间描述目标事件：2046-05-17 04:21。

## 0:00-0:20 开场与问题定位

屏幕操作：打开 `rebuild/index.html`，进入 Overview。

旁白：

这份作品分析 VAST Challenge 2026 Mini-Challenge 2。目标事件是 2046 年 5 月 17 日 04:21，John Windward 名下在 SaidIt 出现一条乱码帖子。我们的目标不是猜测动机，而是用日志证据还原：帖子怎样产生、内容可能来自哪里、这种行为是否已经重复，以及应该在哪一个系统边界做干预。

## 0:20-0:55 系统概览与异常签名

屏幕操作：停留 Overview，指向 baseline 与 anomaly signature 区域。

旁白：

我们先建立系统基线。原始数据包含 185,147 条事件，其中 SaidIt 发帖共有 108 条。正常模式是人类用户使用普通 `content` 字段发帖，共 105 条。异常模式只有 3 条：发帖者是 Agent，而且 `saidit_post` 使用 `content_source` 文件作为正文来源。这个签名非常干净，所以后续分析围绕 `Agent + content_source` 展开。

设计上，我们没有用大而杂的网络图作为主视图，而是把问题拆成三层：Q1 还原事件链，Q2 追踪内容来源，Q3 比较历史重复并选择单点干预。

## 0:55-1:55 Q1：目标帖子如何产生

屏幕操作：进入 Q1。先展示五步 terminal recipe，再点击一个 recipe 方块或 relay 点，打开 evidence panel。

旁白：

Q1 聚焦 5 月 17 日的 SwiftWren 目标链。可观测链条是：Emma Harbor 的 Agent 读取 `meeting_notes.doc`，创建 `SwiftWren.txt` payload；随后 `SwiftWren_further_instructions.md` 通过 `queue_subordinate_task(task=read_file)` 在 Agent 间传播。整条 relay 最终到达 John Windward Agent。

终端序列有五步，分别是 relay 到达 John、`saidit_post_check`、`saidit_post(content_source=SwiftWren.txt)`，然后删除 instruction 文件和 payload 文件。这里我点击其中一步，可以看到原始 evidence panel：包括 event id、时间、动作、actor、target 和 raw JSON。这个 drill-down 的作用是让图上的每个关键结论都能回到日志记录，而不是只讲故事。

## 1:55-2:35 Q2：帖子“是什么意思”以及内容来源

屏幕操作：进入 Q2。依次点击或切换 SwiftWren、MellowOtter、HiddenOrca 的 evidence selector。

旁白：

Q2 回答帖子内容的含义和来源。我们的结论是：这些帖子语义上是“文件被外部公开发布”，而不是普通人工输入的 SaidIt 文本。原因是三条异常帖都通过 `content_source` 引用了本地 payload 文件。

对 SwiftWren，日志可见 `meeting_notes.doc` 被读取、`SwiftWren.txt` 被创建、随后由 John Agent 作为 `content_source` 发布。对 MellowOtter，也能看到源文档到 payload 再到公开帖的 provenance。对 HiddenOrca，源文档在可见窗口外，所以我们只确认它复用了同样的 file-source 发帖机制，不能声称知道它的原始文档。这里的 observed、inferred、unknown 三类标签，是为了防止把推断写成事实。

## 2:35-3:35 Q3：是否会复发，以及单点干预

屏幕操作：进入 Q3。展示 timeline 和 comparison table，点击一个历史事件 marker 或默认 gate evidence panel。

旁白：

Q3 的结论是：这种行为已经重复发生。历史上有 HiddenOrca、MellowOtter，加上最新的 SwiftWren，三次都共享同一个终端机制：Agent relay 到 John Agent，然后 `saidit_post(content_source)`，最后清理文件。

这说明问题不是某一条孤立帖子，而是系统边界缺少检查。我们只选择一个干预点：SaidIt 发布边界。当发帖者是 Agent，并且 `saidit_post.details.content_source` 存在时，阻断或转人工审批。这个规则覆盖 3/3 已知异常，并且对 105 条正常人工 SaidIt 帖没有误报，因为正常帖使用的是普通 `content` 字段。

它的限制也要说明：如果未来异常改用直接 `content` 文本，这个规则不能单独覆盖。但在当前数据中，它是最小、最靠近外部发布边界、同时业务扰动最低的干预。

## 3:35-3:55 收束

屏幕操作：回到 Overview 或 Q3 gate，停在最终结论处。

旁白：

总结一下：目标乱码帖由 Agent 任务链触发，最后通过 John Windward Agent 的 file-source SaidIt 发帖产生。帖子内容的准确正文不可见，但可证明它来自本地 payload 文件，并且至少两条有可见源文档 provenance。历史数据显示同一机制已经出现三次。最有效的单点防护是在 SaidIt 边界审查 Agent 发起的 `content_source` 发帖。

## 录制后自检

- 最终视频时长不超过 4:00。
- 有清楚人声旁白。
- 画面展示的是实际网页，不是纯幻灯片。
- Q1 展示了五步 terminal sequence。
- Q1/Q2/Q3 至少各有一次 evidence drill-down 或 incident selection。
- 没有说“确定攻击者是谁”“确切泄露正文是什么”“HiddenOrca 源文档已知”。
- 结尾明确回答了机制、内容来源、历史重复和一个干预点。
