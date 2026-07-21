# VAST Challenge 2026 MC2 课程汇报讲稿（20260721 增强版）

建议时长：7 分钟左右  
展示顺序：中文入口 `index_zh.htm` -> Overview -> Q1 -> Q2 -> Q3  
正式提交说明：英文网页和英文答案用于官方提交；中文页面和本讲稿用于课堂汇报、组内解释和视频准备。

## 一、开场：先把题目讲清楚

各位老师好，我们小组选择的是 VAST Challenge 2026 Mini-Challenge 2。

这个题目可以理解为一个多智能体系统的异常溯源问题。公司 A 有一个复杂的 Agent 系统，很多 Agent 会代表员工自动读文件、转发任务、检查平台状态或执行发布操作。现在公司发现：John Windward 名下在公共平台 SaidIt 上出现了一条乱码帖子。题目给出的关键线索是：发帖人与 John Windward 有关，平台是 SaidIt，时间是 2046 年 5 月 17 日凌晨 4 点 21 分。

我们要回答的不是简单的“谁发了帖”，而是三组问题。第一，这条异常 SaidIt 帖是怎样一步一步产生的，要给出精确事件链和系统概览。第二，帖子内容可能是什么意思、来自哪里，同时要说明哪些结论是日志直接支持的，哪些只是推断，哪些仍然未知。第三，这种行为是否已经重复发生；如果系统最多只能选一个地方进行干预，应该选哪里，为什么。

因此，我们的总体思路是把一条乱码帖还原为可审计证据链：先建立全局基线，再识别异常字段签名，然后追踪文件和任务传播，最后比较历史复发并评估干预点。

## 二、Overview：先做 EDA，再判断异常在哪里

先看 Overview。我们没有一开始就画目标链条，因为没有基线就不知道什么叫异常。

原始日志共有 185,147 条事件，其中 SaidIt posts 只有 108 条。第一组统计图先回答系统规模和事件组成：事件类型条形图说明，系统中大量行为是邮件、文件、任务和 Agent 自动化；SaidIt 发帖只是全系统中很小的一个子集。

第二组图进入 SaidIt 发帖基线。我们把 108 条 SaidIt posts 按 actor 类型和帖子字段展开，发现正常模式主要是人类使用普通 `content` 字段发帖，共 105 条；异常模式只有 3 条，都是 Agent 使用 `content_source` 字段发帖。这里不是预先把它们贴上“异常”标签，而是通过字段审计发现：`Agent + saidit_post + content_source` 是一个极少见组合，并且正好包含题目给出的目标事件。

第三组图看时间背景。小时直方图和日期-小时热力图说明，系统中存在高密度的背景活动和病毒/诱饵事件，但三条文件源 SaidIt 发帖不是简单地跟随最大噪声峰值出现。这个区分很重要：我们追踪的是一个特定的文件源发布机制，而不是把所有系统波动都归为同一种异常。

第四组图看组织背景。部门活动矩阵、文件操作分布和事件规模比较说明，Agent 任务和文件操作广泛存在，而且可以跨部门传播。这样才能解释后面 Q1 中 SwiftWren 不是 John 单点行为，而是多 Agent、多部门传播后到达 John Agent 的结果。

Overview 的结论是：目标异常不是靠主观感觉发现的，而是通过 EDA 筛出来的。我们从全局日志缩小到 SaidIt posts，再从 SaidIt posts 中发现 `Agent + content_source` 这个罕见签名，最后把 `SwiftWren.txt` 确定为后续追踪入口。

展示操作建议：依次指事件类型条形图、SaidIt 字段堆叠图、时间热力图、部门活动矩阵。每张图只讲一句功能：建立背景、发现字段差异、排除噪声、说明跨部门传播背景。

展示交互建议：正式入口页中每张配图下方都有“查看证据视图”。汇报时可以点击 SaidIt 字段图跳到 Q1/Q2 的字段审计或溯源证据面板，说明我们的图不是装饰，而是能直接定位到后续证据。

## 三、Q1：异常帖子是怎样产生的

Q1 有两个要求：一是提供目标消息的精确事件链；二是提供系统概览，把这条消息链放回整体系统中解释。

我们先用题目给出的 SaidIt、John Windward、2046-05-17 04:21 作为定位线索，在 SaidIt 发帖日志中找到目标事件。目标事件显示，John Windward 的 Agent 在 04:21:15 向 SaidIt 发帖，details 中不是普通 `content`，而是 `content_source=SwiftWren.txt`。这说明帖子正文来自一个文件，而不是人工直接输入文本。

接着看 John Agent 在发帖前后几秒发生了什么。终端五步序列显示：04:21:13，Chloe Ballast 的 Agent 把一个 `read_file` 任务转给 John；04:21:14，John Agent 执行 `saidit_post_check`；04:21:15，John Agent 执行 `saidit_post(content_source=SwiftWren.txt)`；随后在 04:21:16 和 04:21:17 删除 `SwiftWren_further_instructions.md` 和 `SwiftWren.txt`。这张图证明了最后几秒的直接机制：任务到达、发帖检查、文件源发帖、文件清理。

但是，只看最后几秒还不够，因为它只能说明 John Agent 做了发布动作，不能说明任务从哪里来。因此下一步追踪 `SwiftWren_further_instructions.md`。我们筛选所有包含这个指令文件的 `queue_subordinate_task(task=read_file)` 事件，并按时间排序，得到一条 186 跳的 relay chain。泳道图和接收者排序图说明，任务不是突然出现在 John 那里，而是在多个 Agent 之间多次传播后到达 John。

再往前追踪文件来源。文件生命周期图显示，Emma Harbor 的 Agent 先读取 `meeting_notes.doc`，随后创建 `SwiftWren.txt`。因此，在可见日志范围内，最强证据链是 `meeting_notes.doc -> SwiftWren.txt -> John Agent content_source post`。

最后把它放回系统背景中。部门传播热力图显示，SwiftWren 链条跨越 18 个 Agent、186 次 relay hops，其中 119 次是跨部门跳转，并且任务 5 次到达 John。前四次到达没有在紧邻证据窗口内直接产生发帖，第五次到达才导致目标帖。这说明目标帖不是 John 手动写出的普通帖子，而是内部文件通过 Agent relay 传播后，在 SaidIt 发布边界被公开的系统性流程。

Q1 的答案是：异常帖由 Agent 文件源发帖链产生。Emma Harbor Agent 读取 `meeting_notes.doc` 并创建 `SwiftWren.txt`；相关指令文件经多 Agent relay 到达 John Agent；John Agent 使用 `content_source=SwiftWren.txt` 发帖，并立即删除指令文件和 payload 文件。

## 四、Q2：帖子是什么意思，内容来自哪里

Q2 问的是帖子“mean”什么，以及内容来源是什么。这里必须先说明证据边界：日志没有保存完整 payload 正文，所以我们不能逐字恢复乱码帖原文，也不能判断人类动机。我们能做的是追踪内容来源，并区分已观测、推断和未知。

Q2 页面把每起事件拆成三段：源文档、中间 payload 文件、公开 SaidIt 帖。这样做的目的，是把“看起来像乱码”转换为“哪个文件被带出并发布”的溯源问题。

SwiftWren 的证据最完整：日志显示 Emma Harbor Agent 读取 `meeting_notes.doc`，随后创建 `SwiftWren.txt`，最后 John Agent 把 `SwiftWren.txt` 作为 `content_source` 发到 SaidIt。因此，SwiftWren 的可能内容主题是会议记录相关材料。但因为没有正文，我们不能声称知道具体泄露了哪些句子。

MellowOtter 的逻辑类似：Noah Mariner Agent 读取 `strategic_directions.doc`，随后创建 `MellowOtter.txt`，最终也由 John Agent 作为文件源发布。因此它可能与战略方向材料有关。

HiddenOrca 必须更谨慎。它的终端发帖机制与另外两起一致，也就是 Agent 使用 `content_source` 发帖并清理文件；但上游源文档和 payload 创建记录缺失。因此我们只能说它属于同类文件源发布机制，来源仍然未知，不能强行补出源文档。

Q2 的统计图进一步说明三起事件的证据强度不同。完整性热力图展示 source read、payload create、relay、post、cleanup 哪些可见；证据确定性堆叠图把 observed、inferred、unknown 分开；payload size、source-to-post lag、cleanup count 说明它们虽然共享文件源发布机制，但规模、时间差和证据完整度不同。

Q2 的答案是：这些帖子不是普通人类手写文本，而是内部文件被 Agent 以文件源形式发布到 SaidIt 的结果。SwiftWren 可能来自会议记录，MellowOtter 可能来自战略方向文档，HiddenOrca 来源未知。我们能确定的是发布机制和部分来源链，不能确定 exact plaintext、完整机密内容或个人动机。

## 五、Q3：是否复发，以及选哪个干预点

Q3 关注风险是否会再次发生，以及如果最多只能选一个位置改系统，应该改哪里。

我们判断这种行为已经重复发生。历史上有 HiddenOrca、MellowOtter，加上最新的 SwiftWren，三起事件时间、规模和来源可见性不同，但终端模式高度一致：任务 relay 到 John Agent，John Agent 执行 `saidit_post_check`，随后用 `content_source` 发帖，最后清理相关文件。

Q3 的平行时间线和规模对比图证明了复发性。SwiftWren 是最大的一次，有 186 次 relay hops；MellowOtter 和 HiddenOrca 规模较小，但共享同一个终端发布机制。因此问题不是某一条孤立帖子，而是系统边界缺少对 Agent 文件源外发的检查。

接着评估干预点。候选方案包括源文档处拦截、relay 任务处拦截、John Agent 处拦截、删除文件时报警，以及 SaidIt 发布边界拦截。我们推荐 SaidIt boundary gate：当发帖主体是 Agent，并且 `saidit_post.details.content_source` 存在时，阻断或转人工审批。

这个选择不是凭直觉。混淆矩阵显示，这条规则覆盖当前数据中的 3/3 条异常文件源帖，并且对 105 条正常人类 SaidIt 帖的观测误伤为 0。规则权衡矩阵还说明，它位于外部公开发布之前，能在风险真正暴露前拦截；相比之下，拦截所有 relay 会影响大量正常自动化，文件名规则容易绕过，只限制 John 过于端点化，delete-file 报警又发生在公开暴露之后。

我们也说明局限：如果未来异常机制改成 Agent 直接生成普通 `content` 文本，这条规则不能单独覆盖，需要增加 Agent 发帖行为检测或内容检测。但在本题“最多选择一个干预点”的限制下，SaidIt 发布边界是证据最充分、误伤最小、工程上最可执行的位置。

Q3 的答案是：同类异常已至少出现三次，存在复发风险；最优单点干预是在 SaidIt 边界拦截或审批 Agent 发起的 `content_source` 发帖。

## 六、可视化方法亮点

我们的系统不是把结论做成静态 PPT，而是让图表承担推理功能。

第一类是描述性统计图，用于建立基线，包括事件类型条形图、参与者组成图、SaidIt 字段堆叠图、小时直方图、日期-小时热力图、部门活动矩阵和文件操作分布。这些图回答“异常在哪里”。

第二类是过程可视化，用于还原顺序，包括终端五步时间线、文件生命周期图和 hop-expanded relay swimlane。这些图回答“事情如何一步一步发生”。

第三类是关系和证据边界图，包括 provenance graph、claim support DAG、confidence matrix 和 observed/inferred/unknown 标注。这些图回答“哪些结论有证据，哪些只能推断”。

第四类是比较和决策图，包括历史事件 small multiples、规模点图、混淆矩阵、rule coverage matrix 和 parallel coordinates。这些图回答“是否复发，以及干预点是否合理”。

交互设计遵循 overview first、zoom/filter、details on demand。先从全局看，再筛选到事件，再点击查看原始 event id、时间、actor、target 和 raw JSON。这样既能让初次观看者跟上逻辑，也能让老师检查每个结论是否有日志支撑。

本轮还给所有统计型 EDA 图增加了点击放大功能。汇报时如果某张图字号较小，可以直接点击图表进入放大视图，图题、核心 takeaway 和数据依据会一起保留，方便老师核对分母、字段和证据来源。

最新版本还增加了两类联动交互。第一，六张 EDA 图上方有搜索框和“上一张/下一张”，可以按关键词聚焦某一类证据。第二，每张统计图都有“查看对应证据视图”按钮，点击后会跳转并高亮对应的交互证据面板。这样汇报路径可以从描述性统计图直接进入 raw evidence drill-down，逻辑链更清楚。

工具上，最终 rebuild 版本使用 HTML、CSS、原生 JavaScript 和自定义 SVG 实现交互式看板，用 Python `rebuild/extract_data.py` 从官方 `MC2 data.json` 与 `org_chart.json` 提取证据对象，并用 PNG 统计图补充 EDA 型描述性分析。页面交互、截图、布局和图片放大功能通过 Playwright / Microsoft Edge 验证；GitHub Pages 用于静态部署。正式页面不依赖 Tableau、Vega-Lite 或 D3 运行时，旧 D3 文件只是开发原型，不作为最终评审路径。

## 七、结尾

总结一下，我们的核心结论是：这条乱码帖不是 John 手动写出来的，而是内部文件经过 Agent 自动任务链传播后，被 John Windward 的 Agent 作为 `content_source` 发布到了 SaidIt。

这套可视分析系统回答了三组官方问题：Q1 还原了 SwiftWren 的精确事件链和系统背景；Q2 说明了帖子内容来源和证据边界；Q3 证明同类机制已经复发，并给出 SaidIt 发布边界这一单点干预方案。

我的汇报到这里，谢谢老师。

## 八、可能追问与建议回答

1. 为什么不能说 John 本人发了帖子？

日志显示执行 `saidit_post` 的是 John Windward 的 Agent，而不是 John 手动输入正文。我们可以说 John Agent 是终端发布端点，但不能把它等同于 John 本人的主观行为。

2. 为什么 `content_source` 是关键线索？

因为正常 SaidIt 帖主要使用 `content` 字段，表示正文直接写在帖子里；目标异常帖使用 `content_source=SwiftWren.txt`，说明正文来自文件。这把问题从“谁写了乱码”转为“哪个文件被发布出去”。

3. 为什么追踪 `SwiftWren_further_instructions.md`？

因为 John Agent 发帖前接收的是一个 `read_file` relay 任务，任务细节指向 `SwiftWren_further_instructions.md`。追踪该指令文件能还原任务在多 Agent 间如何传播。

4. 为什么 HiddenOrca 标为 unknown？

它的终端发布机制可见，但上游源文档和 payload 创建记录缺失。为了避免过度推断，我们只确认它属于同类文件源发布机制，不强行指定源文档。

5. 为什么不拦截所有 Agent relay？

`queue_subordinate_task` 是系统中的常规自动化行为，直接拦截所有 relay 会造成高业务扰动。SaidIt 边界只拦截 Agent 的 `content_source` 外部发布，覆盖当前 3/3 异常，并且对 105 条正常人类帖子观测误伤为 0。
