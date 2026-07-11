# MC2 最终提交填写指南

这个文件用于最后 30 分钟的提交前收尾。不要把这里的示例当成真实信息提交；所有团队信息必须由你们自己填写。

## 1. 先填最终答案页的真实字段

如果提交 GitHub 目录中的版本，打开 `final_report_0709.html`；如果提交最终 zip，打开 zip 根目录的 `index.htm`。搜索 `TEAM ACTION REQUIRED`，逐项替换。

必须替换：

- Entry name：建议格式为 `<学校或组织>-<主联系人姓氏>-MC2`。
- Team members：每个成员的姓名、学校/学院、邮箱；标出 primary contact。
- Total hours：三个人在 MC2 上投入的总工时估计。
- Video link：稳定可访问的 <=4 分钟视频链接，或包内 `video.mp4` / `.wmv` 文件名。
- Public repository permission：填 `YES` 或 `NO`，由小组决定。

不能替换成：

- `待定`
- `TODO`
- `TEAM ACTION REQUIRED`
- 只有微信/临时网盘才能打开的视频链接
- 你们不能长期访问或评委无法访问的私密链接

## 2. 录制视频

也可以用脚本自动填表，避免手动改 HTML 出错。

在当前目录新建 `team_metadata.json`，格式如下。示例值必须全部替换成真实信息：

```json
{
  "entry_name": "YourUniversity-PrimaryLastName-MC2",
  "team_members": [
    {
      "name": "真实姓名",
      "affiliation": "学校 / 学院 / 班级",
      "email": "name@example.com",
      "primary_contact": true
    },
    {
      "name": "真实姓名",
      "affiliation": "学校 / 学院 / 班级",
      "email": "name@example.com",
      "primary_contact": false
    }
  ],
  "student_team": "YES",
  "tools_used": "Python data extraction, JavaScript, HTML/CSS/SVG, browser-based visual analytics, GitHub Pages, browser screenshot verification",
  "total_hours": "120",
  "video_link": "https://example.com/your-mc2-video.mp4",
  "public_repository_permission": "YES"
}
```

然后运行：

```powershell
node apply_team_metadata.js
```

脚本会拒绝空值、`TODO`、`REPLACE_ME`、没有 primary contact、邮箱格式明显错误、视频字段缺失等问题。运行成功后，删除 `team_metadata.json`，再运行 `node pre_submission_validator.js`。

使用：

- `video_script_4min_zh.md`
- `video_recording_checklist.md`

硬要求：

- 视频不超过 4 分钟。
- 有人声旁白。
- 展示实际网页 `rebuild/index.html`，不要只放幻灯片。
- 至少演示 Q1、Q2、Q3 的一次证据 drill-down 或 incident switching。
- 明确说出 3/3 覆盖和 0/105 正常帖误报。
- 不要声称确定攻击者、动机、精确泄露文本或 HiddenOrca 源文档。

## 3. 运行预提交验证器

在当前目录运行：

```powershell
node pre_submission_validator.js
```

当前版本在未填团队信息、未放视频前应该失败。失败项是最后要修的清单。

只有当验证器显示：

```text
PASS: package-level checks found no blocking issues.
```

才可以认为这个包接近正式提交状态。

## 4. 重建 zip

填完字段和视频后，回到上一级目录运行：

```powershell
cd /d "D:\大二下\大数据可视化\期末大作业"
.\build_final_submission_zip.ps1
```

这个脚本会先运行 `node pre_submission_validator.js`。如果验证失败，它会拒绝生成正式 zip。

如果只是需要一个草稿包用于内部检查，可以运行：

```powershell
.\build_final_submission_zip.ps1 -AllowDraft
```

带 `-AllowDraft` 的包不能直接当最终提交，必须先解决验证器失败项。

如果学校或 VAST 要求正式命名，把 `final_submission.zip` 改成官方 entry name，例如：

```text
<学校或组织>-<主联系人姓氏>-MC2.zip
```

## 5. 最后人工检查

解压最终 zip 到一个新文件夹，然后检查：

- 双击 `index.htm` 能打开。
- 四张报告截图都能显示。
- `Reviewer Quick Start` 的链接能打开。
- `rebuild/index.html`、`overview.html`、`q1.html`、`q2.html`、`q3.html` 能打开。
- Q1 点击事件步骤有 raw evidence。
- Q2 能切换 SwiftWren / MellowOtter / HiddenOrca。
- Q3 能看到复发和单点干预。
- 视频链接能在无登录/隐身窗口打开，或视频文件确实在包内。
- 包里没有 `Q AND A.md`、旧 answer sheet 模板、notebook、原始 `MC2 data.json`。

## 6. 如果还要提交 GitHub Pages 链接

如果你们把线上网页也写进提交表，建议在最终 commit 上打 tag 或 release。

基本命令：

```powershell
git status
git tag mc2-final-YYYYMMDD
git push origin mc2-final-YYYYMMDD
```

不要在截止后继续修改提交链接指向的内容，除非老师或官方要求。

## 7. GitHub 最终版本冻结

如果最终提交中包含 GitHub Pages 或 GitHub 仓库链接，请同时查看：

```text
github_release_finalization_guide_zh.md
```

可以先在项目根目录运行只读检查：

```powershell
.\check_github_release_readiness.ps1
```

这个脚本不会创建 tag，也不会 push。它只检查远端、当前分支、工作区是否干净，以及 HEAD 是否已有 tag。
