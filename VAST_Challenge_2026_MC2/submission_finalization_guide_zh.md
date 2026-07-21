# MC2 最终提交指南

本指南用于最后收尾。示例值不能作为真实信息提交，团队字段必须由参赛者填写。

## 1. 当前状态

分析、交互页面、截图和 PDF 已具备。正式提交仍有两类人工阻塞项：

- 团队名称、成员、单位、邮箱、主联系人、总工时和公开许可；
- 时长不超过 4 分钟的解说视频链接或包内视频文件。

在这些字段完成前，只能构建内部审阅用草稿包。

## 2. 填写团队信息

在 `VAST_Challenge_2026_MC2` 目录创建不提交到 Git 的 `team_metadata.json`：

```json
{
  "entry_name": "YourUniversity-PrimaryLastName-MC2",
  "team_members": [
    {
      "name": "真实姓名",
      "affiliation": "学校 / 学院 / 班级",
      "email": "name@example.com",
      "primary_contact": true
    }
  ],
  "student_team": "YES",
  "tools_used": "Python data extraction from MC2 data.json and org_chart.json; HTML/CSS/vanilla JavaScript with custom SVG; PNG statistical EDA figure generation; Playwright/Microsoft Edge screenshot and interaction verification; Git/GitHub Pages. The final rebuild does not require Tableau, Vega-Lite, or a D3 runtime.",
  "total_hours": "120",
  "video_link": "https://example.com/your-mc2-video.mp4",
  "public_repository_permission": "YES"
}
```

然后在该目录运行：

```powershell
node .\apply_team_metadata.js
```

脚本会拒绝空值、示例占位符、无主联系人和明显错误的邮箱格式。填写成功后保留本地 JSON 备份即可，它已被 `.gitignore` 排除。

也可以先复制模板再改：

```powershell
copy .\team_metadata.example.json .\team_metadata.json
notepad .\team_metadata.json
```

注意：模板里的姓名、邮箱、视频链接、总工时和公开许可必须改成真实值。

## 3. 重新生成与验证分析数据

原始 `MC2 data.json` 只用于本地重建，不得放入正式 ZIP：

```powershell
python .\rebuild\extract_data.py
python -m json.tool .\rebuild\mc2_viz_data.json > $null
```

生成数据会记录原始事件文件和组织架构文件的字节数及 SHA-256，便于复核来源。

## 4. 运行提交检查

首次验证前，在仓库根目录安装最小浏览器检查依赖；它会复用系统 Microsoft Edge，不额外下载浏览器：

```powershell
npm install
```

然后可以在仓库根目录运行完整浏览器验证。该命令会同时检查英文入口、中文入口、Overview、Q1、Q2、Q3 及其中文镜像页的可访问性和响应式布局：

```powershell
npm run verify
```

预提交内容检查仍在 `VAST_Challenge_2026_MC2` 目录运行：

```powershell
node .\pre_submission_validator.js
node .\accessibility_verify.js
node .\responsive_verify.js
```

正式提交前，预提交检查器必须输出：

```text
PASS: package-level checks found no blocking issues.
```

该检查器还会检查 `index.htm` 和 `index_zh.htm` 的本地链接、图片引用、工具清单、每张正式配图是否链接到对应交互证据视图，以及 Q1、Q2、Q3 是否各有且仅有 6 张正式配图。若这里失败，先修入口页，不要直接打包。

## 5. 构建 ZIP

回到仓库根目录：

```powershell
cd ..
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build_final_submission_zip.ps1
```

构建器会先运行预提交检查，失败时拒绝生成正式 ZIP。仅供内部检查时可以运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build_final_submission_zip.ps1 -AllowDraft
```

草稿包不能正式提交。生成的 `final_submission/` 和 `final_submission.zip` 都已被 Git 忽略。

正式包只包含：

- 根目录 `index.htm`；
- 自包含的 `rebuild/` 交互站点；
- 简短的 `README.md`；
- 可选的包内 MP4/WMV。

原始数据、Notebook、Python/PowerShell 源码、旧页面和探索笔记不会进入 ZIP。

## 6. 最终人工检查

把 ZIP 解压到一个新目录，并确认：

- 根目录 `index.htm` 可以直接打开；
- Overview、Q1、Q2、Q3 链接和图表均正常；
- Q1 事件步骤可以展开原始证据；
- Q2 可以切换三个事件并显示 observed/inferred/unknown；
- Q3 只推荐 SaidIt 发布边界这一处干预；
- 视频链接可以在无痕窗口中访问，或包内视频可以播放；
- ZIP 小于官方系统限制，且不包含 `MC2 data.json`、Notebook 或团队元数据 JSON。

## 7. 冻结在线版本

若最终答案包含 GitHub Pages 或 GitHub 仓库链接，在仓库根目录先运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\check_github_release_readiness.ps1
```

该脚本不会创建 tag 或 push，只检查远程、分支、工作区、HEAD 和现有 tag。全部内容确认并 commit 后，再创建最终 tag/Release。
