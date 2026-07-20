# VAST Challenge 2026 MC2 课程汇报展示稿

建议时长：6 分钟左右  
展示方式：优先打开 GitHub Pages 或本地网页，按 Overview -> Q1 -> Q2 -> Q3 的顺序展示  
中文阅读版入口：`index_zh.htm`  
英文正式入口：`index.htm`  
交互式系统入口：`rebuild/overview.html`

---

## 0:00-0:40 开场：说明题目、问题和解决思路

各位老师好，我们小组选择的是 VAST Challenge 2026 Mini-Challenge 2。

这个题目的背景是：公司 A 的 AI 系统管理部门发现，John Windward 在 2046 年 5 月 17 日凌晨 4 点 21 分，通过 SaidIt 发出了一条乱码帖子。题目要求我们判断：这条帖子到底是怎么产生的，背后经过了哪些人和系统交互，帖子内容可能来自哪里，以及这种异常行为以前是否发生过、以后如何预防。

所以，我们的任务不是简单地看一条异常日志，而是要在大量系统事件中重建一条证据链：从异常发帖出发，向前追踪文件来源、任务传播路径和 Agent 行为，再把这条链放回整个系统中比较，判断它是偶然事件，还是一种可以重复发生的系统漏洞。

我们的解决思路分为三步。

第一步是定位异常发帖。题目给出了 John Windward、SaidIt 和 2046 年 5 月 17 日 04:21 这几个关键信息。我们先在所有 SaidIt 发帖事件中找到目标事件，然后发现它和正常帖子不同：正常帖子通常直接包含文字内容，而这条异常帖使用的是 `content_source=SwiftWren.txt`，也就是说，帖子内容不是 John 手动输入的，而是来自一个文件。

第二步是反向追踪文件和任务链。既然异常帖来自 `SwiftWren.txt`，我们就继续查这个文件是谁创建的、创建前读取了什么文件，以及 `SwiftWren_further_instructions.md` 这个任务文件是如何在多个 Agent 之间传播的。通过事件时间顺序和任务转发记录，我们还原出一条从 Emma Harbor 的 Agent 到 John Windward 的 Agent 的传播链。

第三步是做系统层面的比较。我们不仅看这一次 SwiftWren 事件，还把它和其他历史异常事件进行对比，分析它们是否共享相同模式。结果发现，类似的 Agent 文件源发帖不是孤立现象，而是已经出现过多次。因此我们进一步评估干预点，认为最有效的预防方式是在 SaidIt 发帖边界增加规则：限制 Agent 使用 `content_source` 自动发帖，尤其是来自内部文件的内容。

简单来说，我们这次做的是一次异常发帖溯源。核心结论是：这不是 John 本人手动写的帖子，而是一个内部文件经过 Agent 自动任务链传播后，被 John 的 Agent 发布到了 SaidIt 上。

---

## 0:40-1:35 Overview：先做 EDA 系统基线，再定位异常签名

展示页面：`rebuild/overview.html`

我们首先没有直接画最终事件链，而是先建立系统基线。因为 VAST Challenge 更强调可视分析过程，而不是只给出结论。这里采用的是探索式数据分析思路：先看全局分布，再看分组差异，最后再筛出异常签名。

从 Overview 可以看到，原始日志共有 185,147 条事件，其中 SaidIt 发帖共有 108 条。正常模式非常清楚：105 条是人类用户使用普通 `content` 字段发帖。异常模式只有 3 条：发帖者是 Agent，并且发帖内容不是普通文本，而是来自 `details.content_source` 文件。

这里我们使用了多组描述性统计视图：

- System Event Mix 用条形图展示所有事件类型的规模，说明 SaidIt 发帖只是大系统中的很小一部分；
- Actors and Rarity 用主体类型组成和不同分母下的异常比例，说明异常不是凭感觉判断，而是在多个统计口径下都很稀有；
- 全局时间密度图，用来把异常发帖放到完整日志时间窗口里；
- Department Activity Matrix 用部门 × 事件类型矩阵展示普通活动、文件操作、relay 和 codename 信号主要集中在哪里；
- SaidIt Field Audit 比较正常人类帖子和 Agent 文件源帖子的字段差异，解释为什么 `content_source` 是合理的追踪入口；
- SaidIt rule space，用 actor type 和 source field 把 108 条帖子分到不同格子中；
- File Operations 展示 read、create、delete 等文件操作和文件扩展名分布，说明文件源证据在全局文件活动中的位置；
- Incident Scale Comparison 对比 HiddenOrca、MellowOtter 和 SwiftWren 的 relay hops、Agent 数、跨部门跳转和 John 到达次数；
- Process Comparison，对比正常人类发帖流程和 Agent 文件源发帖流程；
- Data Layer Fusion，展示我们如何从原始日志、文件操作、Agent relay、组织结构和 SaidIt 记录，构造后续 Q1-Q3 的证据对象。

这一页想说明的是：异常不是主观判断出来的，而是通过全局 EDA、字段审计和流程对比逐步分离出来的一个干净签名，即 `Agent + saidit_post + content_source`。它既是统计上的少数模式，也是流程上的异常模式。

---

## 1:35-2:45 Q1：异常帖子是如何产生的

展示页面：`rebuild/q1.html`

Q1 的任务是还原导致目标帖产生的精确事件链，并把这条链放到整个系统中解释。

我们的推理是从题目线索开始的。题目给出 John Windward、SaidIt、2046 年 5 月 17 日 04:21，所以我们先定位目标 SaidIt 事件。定位后发现，这条记录不是普通 `content` 字段，而是 `content_source=SwiftWren.txt`。因此后续追踪的核心就从“帖子文本”转为“SwiftWren.txt 这个文件是怎么来的，以及它怎么被送到 John Agent 那里”。

对 SwiftWren 事件，我们还原出的链条是：

Emma Harbor 的 Agent 读取 `meeting_notes.doc`，随后创建 `SwiftWren.txt`；  
接着 `SwiftWren_further_instructions.md` 通过 `queue_subordinate_task(task=read_file)` 在多个 Agent 之间传播；  
最终任务到达 John Windward 的 Agent；  
John Agent 执行 `saidit_post_check`；  
然后执行 `saidit_post(content_source=SwiftWren.txt)`；  
发帖后立刻删除 instruction 文件和 payload 文件。

在可视化上，我们没有使用大型毛球网络图，因为那种图很难读出事件顺序。我们采用了：

- Terminal Five-Step Recipe 展示 John Agent 终端五步；
- File Lifecycle Timeline 展示从源文档读取、payload 创建到清理文件的阶段；
- Agent Relay Swimlane 按 hop order 或 elapsed time 展开 186 跳传播过程；
- Department Propagation Matrix 和 Department Flow Ribbons 展示跨部门传播。

从数值上看，SwiftWren 是三起文件源事件中规模最大的一次：186 个 relay hops，18 个 Agent，119 次跨部门跳转，并且 5 次到达 John。这个结果说明，异常帖不是 John 单点行为，而是一个跨 Agent、跨部门传播后在 SaidIt 边界失控的系统流程。

---

## 2:45-3:55 Q2：帖子是什么意思，内容从哪里来

展示页面：`rebuild/q2.html`

Q2 我们特别强调证据边界。因为日志只记录了文件名、操作、时间、actor 和 details，并没有保存 payload 文件正文。所以我们不能声称知道乱码的 exact plaintext，也不能声称知道人的动机。

我们把 Q2 定义为 provenance 问题，也就是内容来源追踪问题。

SwiftWren 的证据链最完整：日志显示 Emma Harbor 的 Agent 读取 `meeting_notes.doc`，随后创建 `SwiftWren.txt`，最后 John Agent 以 `content_source=SwiftWren.txt` 发帖。因此我们可以说，SwiftWren 很可能来自会议记录相关内容，但不能说知道具体正文。

MellowOtter 也有可见来源：Noah Mariner 的 Agent 读取 `strategic_directions.doc`，随后创建 `MellowOtter.txt`，再由 John Agent 作为 `content_source` 发布。因此它很可能与战略方向材料有关。

HiddenOrca 的终端机制是可见的，也就是同样发生了 Agent 文件源发帖和清理；但它的源文档和 payload 创建记录不在可见数据窗口内，所以我们把它标为 unknown，而不是强行猜测来源。

最新版 Q2 中我们补充了一个数值型描述统计图：Numeric Evidence Summary。它统计每个事件在 7 类证据字段中有多少是 observed、inferred、unknown，并同时比较 payload size、relay hops 和 John arrivals。这个图的作用是先量化证据强弱，再讨论帖子含义，避免纯文字推理。

所以 Q2 的最终回答是：这些帖子意味着内部文件被以文件源方式发布到了 SaidIt。SwiftWren 和 MellowOtter 有可见来源文档，HiddenOrca 来源未知。所有 exact body text、具体机密句子、加密状态和动机都不能从当前数据中确定。

---

## 3:55-5:20 Q3：是否会复发，以及选择一个干预点

展示页面：`rebuild/q3.html`

Q3 的问题是：这种行为是否会重复，以及应该选择最多一个系统干预点。

我们的结论是：它已经重复发生。除了 5 月 17 日的 SwiftWren，历史上还有 HiddenOrca 和 MellowOtter 两起文件源 SaidIt 事件。三起事件源头、规模和时间跨度不同，但终端机制一致：relay 到达 John Agent，执行 `saidit_post_check`，通过 `content_source` 发帖，然后删除相关文件。

为了让这个结论不是单纯叙述，我们在 Q3 中使用了多种数值型可视化：

- Discovery From SaidIt Baseline：从 108 条 SaidIt posts 中逐步筛到 3 条 content_source posts；
- Prior Occurrences Timeline：展示三起事件发生时间和传播跨度；
- Recurrence scale bar matrix：用条形矩阵比较 relay hops、distinct Agents、departments touched、cross-dept hops、John arrivals、propagation duration；
- Incident Scale Dot Plot：用点图比较不同事件规模；
- Confusion Matrix：验证推荐规则对异常和正常帖子的覆盖情况；
- Rule Coverage Matrix 和 Parallel Coordinates：比较候选干预规则的覆盖、误伤、影响记录数和成本。

我们推荐的唯一干预点是 SaidIt 发布边界。规则是：

如果发帖者是 Agent，并且 `saidit_post.details` 中存在 `content_source`，就阻断或转人工审批。

这个选择的证据是：

第一，它覆盖当前数据中 3/3 条文件源异常帖；  
第二，它对 105 条正常人类 SaidIt 帖的观测误伤是 0；  
第三，它位于外部发布边界，能在内部文件真正公开之前阻断风险；  
第四，它比阻断所有 `queue_subordinate_task` 更低成本，因为任务委派在系统中大量存在，直接禁用会影响正常业务。

我们也明确说明限制：如果未来攻击方式改成 Agent 直接写普通 `content` 文本，这条规则不能单独覆盖，需要额外的行为检测或内容检测。但在当前数据和题目“最多选一个干预点”的约束下，SaidIt boundary gate 是证据最充分、误伤最小的单点干预。

---

## 5:20-6:00 可视化设计说明：为什么这样设计

这里补充说明我们的可视化设计思路。

第一，我们遵循 Overview first, zoom and filter, details on demand。先看系统基线，再筛选异常签名，最后点击具体事件查看 raw evidence。

第二，我们尽量使用适合数据类型的图表。数量比较主要用条形图、点图、矩阵和比例图；事件链使用时间线和 hop-expanded swimlane；证据关系使用 provenance graph 和 claim support DAG；干预比较使用 confusion matrix、rule matrix 和 parallel coordinates。

第三，我们避免误导性可视化。没有使用 3D、彩虹色或无过滤的大型网络图；所有比例都尽量标明分母；无法确定的内容用 unknown 标注，不把推断伪装成事实。

第四，我们提供了英文正式版和中文阅读版。英文版用于正式提交，中文阅读版用于组内讨论和课堂汇报，二者结论一致。

---

## 6:00-6:20 结尾总结

总结一下，我们的分析回答了三个核心问题。

第一，异常帖子由 Agent 文件源发帖链产生，不是普通人类发帖。  
第二，帖子内容可以追溯到 payload 文件；SwiftWren 和 MellowOtter 有可见源文档，HiddenOrca 来源未知。  
第三，同类机制已经出现三次，最佳单点干预是在 SaidIt 边界拦截 Agent 发起的 `content_source` 发帖。

我们这套系统的重点不是猜测谁有动机，而是用可视分析把系统中的行为链、证据边界和干预位置展示清楚。

我的汇报到这里，谢谢老师。

---

## 老师可能追问与回答

### 1. 为什么不直接说 John Windward 是责任人？

不能这样说。日志显示 public post 是 John Windward 的 Agent 发出的，但这不能证明 John 本人手动发帖，也不能证明 John 有动机。我们的结论限定为：John Agent 是终端发布端点。

### 2. 为什么说 SwiftWren 来自 `meeting_notes.doc`？

因为日志中有相邻的 `read_file meeting_notes.doc` 和 `create_file SwiftWren.txt` 记录，随后 SwiftWren.txt 又作为 `content_source` 被发布。这个链条支持来源推断，但不支持逐字正文恢复。

### 3. HiddenOrca 为什么不说来源？

因为 HiddenOrca 的上游 source document 和 payload create 记录在当前可见日志窗口中缺失。我们只能确认它的终端发帖机制相同，不能确认源文件。

### 4. 为什么只选 SaidIt 边界作为干预点？

因为题目要求最多选一个干预点。SaidIt 边界规则在当前数据中覆盖 3/3 异常，对 105 条正常人类帖子观测误伤为 0，而且处在外部公开发布之前，是最接近危害发生点、同时业务扰动较小的位置。

### 5. 如果未来不用 `content_source` 怎么办？

这确实是限制。我们的规则针对当前数据中已观测到的机制；如果未来变体改成普通 `content`，需要补充 Agent 发帖行为检测、异常文本检测或跨部门 relay 风险评分。但在本题数据和单点干预约束下，SaidIt boundary gate 仍是最稳妥选择。
