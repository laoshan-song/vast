# MC2 中文答辩脚本

建议时长：5 分钟。答辩时优先打开 `rebuild/index.html` 展示交互网页；如果时间紧，打开 `slides.html` 快速讲完。

## 0:00-0:30 开场

大家好，我们选择的是 VAST Challenge 2026 Mini-Challenge 2。题目的核心是：John Windward 在 SaidIt 上出现了一条异常帖子，我们要用可视分析解释这条帖子是怎么产生的、内容从哪里来，以及如何防止复发。

我们的结论是：这不是普通的人类发帖，而是一条利用公司 Agent 任务队列的指令转发链。内部文件被打包成 `.txt`，经过多个 Agent 盲转发，最后由 John Windward 的 Agent 以 `content_source` 形式发到 SaidIt。

## 0:30-1:40 系统基线和异常签名

打开 `overview.html`。

先说明数据规模：

- 原始日志共有 185,147 条事件。
- 全系统有 108 条 `saidit_post`。
- 其中 105 条是人类正常发帖。
- 只有 3 条是 Agent 发起，并且使用 `content_source` 文件作为正文来源。

这里的关键不是异常数量多，而是异常签名非常干净：`Agent 发起 + content_source 文件` 只出现 3 次，正好对应三条异常泄露帖。

## 1:40-2:50 Q1：异常帖怎么产生

打开 `q1.html`。

先看 A 区：John Agent 的终点行为。每次泄露都会出现完全相同的 5 步：

1. relay 任务到达 John Agent；
2. John Agent 执行 `saidit_post_check`；
3. John Agent 执行 `saidit_post(content_source)`；
4. 删除指令文件；
5. 删除 payload 文件。

这说明异常发帖不是一次手误，而是一个可重复的自动化流程。

再看 B 区：SwiftWren 的传播路径。它一共走了 186 跳，涉及 18 个 Agent，跨部门 119 次，并且 5 次到达 John。我们没有用传统的毛球网络图，而是按 hop 顺序展开，原因是这样可以直接看到随机游走、反复经过同一节点，以及最终落到 John 的时刻。

最后看 C 区：系统总图。风险从内部文档开始，经过 payload 文件和 Agent relay，真正造成外部危害的是 SaidIt 边界的 `content_source` 发帖。

## 2:50-3:45 Q2：帖子内容意味着什么

打开 `q2.html`。

Q2 我们刻意不做过度推理，只做内容溯源。

SwiftWren 的证据链最强：Emma Harbor 的 Agent 读取 `meeting_notes.doc`，随后创建 `SwiftWren.txt`，最后由 John Agent 发到 SaidIt。因此它很可能是 CFO 会议纪要的外泄。

MellowOtter 也有完整证据链：Noah Mariner 的 Agent 读取 `strategic_directions.doc`，随后创建 `MellowOtter.txt`，最后外发。因此它很可能是 COO 战略方向文档的外泄。

HiddenOrca 的源头较弱，因为它的文件创建发生在数据窗口之前。我们只能确认它使用了同一套发帖和清理机制，但不能确认源文档和逐字内容。

这里最重要的是证据边界表：哪些是 observed，哪些是 inferred，哪些是 unknown。我们不能声称知道文件全文，也不能声称知道动机。

## 3:45-4:45 Q3：是否会复发，怎么干预

打开 `q3.html`。

会复发，因为同一机制已经发生了 3 次：HiddenOrca、MellowOtter、SwiftWren。三次的源头、规模、时间跨度不同，但机制完全一致：Agent relay 到 John Agent，随后 `content_source` 发帖并清理文件。

我们只选择一个干预点：SaidIt 边界。

规则很简单：

```text
如果发帖者是 Agent，并且 saidit_post.details 中存在 content_source，
则阻断、转人工审批或高优告警。
```

这个点的优势是：

- 覆盖 3/3 已知异常；
- 对 105 条正常人工 SaidIt 帖 0 误报；
- 它拦在外部发布边界，能在内部文件真正公开之前阻止危害；
- 比阻断所有 `queue_subordinate_task` 更低成本，因为任务委派有 17,038 条，直接封禁会误伤正常业务。

## 4:45-5:10 结尾

总结一下，我们的分析分三层：

第一层是事件链：异常帖由 Agent relay 触发，不是人类正常发帖。  
第二层是内容溯源：SwiftWren 和 MellowOtter 可以追到高管内部文档，HiddenOrca 保持 unknown。  
第三层是防御：最佳干预点是 SaidIt 边界的 Agent `content_source` 发帖门控。

这套方案的关键不是“猜谁是坏人”，而是用数据找到系统失控的位置，并给出误伤最小的控制点。

## 可能被问到的问题

**问：为什么不重点讨论谁是幕后黑手？**  
答：因为官方问题要求解释机制、内容来源和系统干预。身份和动机有较多推断成分，但我们提出的 SaidIt 边界干预不依赖证明动机。

**问：HiddenOrca 为什么不能确认来源？**  
答：因为它的 payload 和指令文件在可见数据窗口开始前就已经存在。日志能证明它的终点行为，但不能证明源文档。

**问：为什么不直接禁掉 `queue_subordinate_task`？**  
答：因为全系统有 17,038 条这类任务，其中大量是正常业务。直接禁用会严重误伤。

**问：如果攻击者不用 `content_source` 怎么办？**  
答：这条规则是针对当前数据中已知机制的最小有效干预。更完整的安全方案还可以加入发帖内容大小、Agent 身份、跨部门 relay 风险评分，但题目要求最多选一处干预，所以我们选择最靠近外部危害的边界点。

