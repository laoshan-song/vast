# MC2 四分钟视频录制脚本（20260721 增强版）

用途：正式录制 VAST Challenge 2026 MC2 / 课程期末展示视频。  
目标时长：3:40-3:55，最多不超过 4:00。  
展示页面：优先录英文正式页；若课堂说明需要，可切到中文镜像页辅助讲解。

## 录制原则

- 展示实际网页，不只展示幻灯片。
- 至少演示一次交互 drill-down：点击图中节点或事件，显示 event id、时间、actor、target 和 raw JSON。
- 至少演示一次 EDA 图的证据联动：在正式入口或 Q1-Q3 页面点击 `Open evidence view` / `查看对应证据视图`，说明统计图如何跳到对应交互证据面板。
- 全程保持证据边界：能确定的是日志中的事件、文件名、动作和时间；不能确定的是完整文件正文、个人动机和幕后触发者身份。
- 使用题目本地时间 UTC-7 描述目标事件：2046-05-17 04:21。

## 0:00-0:25 开场与问题定位

屏幕操作：打开 `rebuild/index.html` 或 GitHub Pages 首页，进入 Overview。

旁白：

本作品分析 VAST Challenge 2026 Mini-Challenge 2。题目给出的目标事件是：2046 年 5 月 17 日 04:21，John Windward 名下在 SaidIt 上出现一条乱码帖子。我们的目标不是猜测个人动机，而是用日志证据回答三个问题：帖子如何产生，内容可能来自哪里，这种行为是否已经重复发生，以及如果只能选择一个干预点，应该拦在哪里。

## 0:25-1:05 Overview：先建立基线，再发现异常签名

屏幕操作：停留在 Overview，展示 Statistical EDA Atlas 和 SaidIt 字段审计；可用统计图上方的搜索框或“上一张/下一张”逐图聚焦。

旁白：

我们先做全局 EDA。原始日志共有 185,147 条事件，其中 SaidIt posts 只有 108 条。事件类型条形图、主体组成图、时间热力图和部门矩阵先建立系统基线，说明异常发生在一个复杂的 Agent 自动化环境中。

然后看 SaidIt 字段审计。正常模式是人类使用普通 `content` 字段发帖，共 105 条；异常模式只有 3 条，都是 Agent 使用 `content_source` 文件作为帖子正文来源。因此后续分析围绕这个罕见签名展开：`Agent + saidit_post + content_source`。

录制提示：如果统计图在视频中显得太小，可以点击图表进入放大视图，再继续讲图题、核心结论和数据依据。若从正式入口页录制，可点击每张图下方的 `Open evidence view`，直接跳到对应的交互证据面板。

工具说明可在 Overview 末尾展示：最终系统使用 HTML、CSS、原生 JavaScript、自定义 SVG、Python 数据提取、PNG 统计图生成和 Playwright/Edge 验证；正式 rebuild 页面不依赖 Tableau、Vega-Lite 或 D3 运行时。

## 1:05-2:00 Q1：目标帖子如何产生

屏幕操作：进入 Q1，展示六张 EDA 图；点击“Open linked evidence view / 查看对应证据视图”跳到 terminal recipe 或 relay swimlane，再点击其中一个事件。

旁白：

Q1 追踪目标 SwiftWren 事件。目标 SaidIt 记录显示，John Windward 的 Agent 在 04:21:15 发帖，details 中不是普通 `content`，而是 `content_source=SwiftWren.txt`。这说明帖子正文来自文件。

终端五步序列显示最后几秒的机制：任务 relay 到达 John Agent，随后执行 `saidit_post_check`，再执行 `saidit_post(content_source=SwiftWren.txt)`，最后删除指令文件和 payload 文件。这里点击一个事件，可以看到对应的 event id、时间、actor、target 和 raw JSON。

再往前追踪 `SwiftWren_further_instructions.md`，可以看到它经过 186 次 relay hops、18 个 Agent 和 119 次跨部门跳转后到达 John。文件生命周期图进一步显示，Emma Harbor 的 Agent 先读取 `meeting_notes.doc`，随后创建 `SwiftWren.txt`。因此，目标帖不是 John 手动输入，而是文件通过 Agent 任务链传播后被发布到 SaidIt。

## 2:00-2:45 Q2：帖子内容意味着什么，来自哪里

屏幕操作：进入 Q2，先用六张 EDA 图说明证据完整性、字段差异和结论边界；再点击图上的证据视图按钮，展示 provenance graph、evidence certainty 和 claim guardrails。

旁白：

Q2 是溯源问题，不是动机判断问题。日志没有保存完整 payload 正文，所以我们不恢复逐字内容，而是判断内容来源和证据强度。

SwiftWren 的来源链最清楚：`meeting_notes.doc -> SwiftWren.txt -> SaidIt content_source post`，所以可能主题是会议记录。MellowOtter 类似地连接到 `strategic_directions.doc`，所以可能主题是战略方向材料。HiddenOrca 共享相同的终端文件源发帖机制，但上游源文档不可见，因此保持 unknown。

页面用 observed、inferred、unknown 三类标记区分证据边界，避免把合理推断写成确定事实。

## 2:45-3:35 Q3：复发证据与单点干预

屏幕操作：进入 Q3，先用六张 EDA 图说明复发、稀有性、误伤和规则权衡；再点击证据视图按钮展示 recurrence timeline、incident scale dot plot、confusion matrix 和 rule tradeoff matrix。

旁白：

Q3 的结论是这种行为已经重复发生。HiddenOrca、MellowOtter 和 SwiftWren 时间不同、规模不同，但共享同一终端模式：relay 到 John Agent，执行 `saidit_post_check`，使用 `content_source` 发帖，并清理文件。

如果只能选一个干预点，我们推荐 SaidIt boundary gate：当发帖主体是 Agent，且 `saidit_post.details.content_source` 存在时，阻断或转人工审批。混淆矩阵显示，这条规则覆盖当前 3/3 个观测异常，同时对 105 条正常人类 SaidIt 帖的观测误伤为 0。它也发生在公开发布之前，比事后 delete-file 报警更有效。

局限也需要说明：如果未来 Agent 直接生成普通 `content` 文本，这条规则需要与行为检测或内容检测配合。但在本题数据和单点干预限制下，它是证据最充分、业务扰动最低的方案。

## 3:35-3:55 收尾

屏幕操作：停在 Q3 推荐规则或 Overview 结论区域。

旁白：

总结来说，目标乱码帖不是 John 手动写出，而是内部文件经过 Agent 任务链传播后，被 John Windward 的 Agent 作为 `content_source` 发布到 SaidIt。我们的可视分析系统完成了三项任务：还原 SwiftWren 精确事件链，说明帖子来源和证据边界，证明同类机制已复发，并给出 SaidIt 发布边界这一单点干预方案。

## 录制后自检

- 视频时长不超过 4 分钟。
- 展示的是实际网页。
- Overview/Q1/Q2/Q3 都出现。
- 至少演示一次 evidence drill-down。
- 至少演示一次 EDA 图搜索、放大或图到证据视图跳转。
- 没有声称知道完整正文、个人动机或 HiddenOrca 的源文档。
- 明确给出 3/108、105/108、3/3、0/105 等关键数字。
