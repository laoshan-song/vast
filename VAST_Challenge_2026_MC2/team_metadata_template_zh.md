# MC2 团队信息模板

用途：在正式提交前，用真实团队信息和视频地址更新 `final_report_0709.html`。不要直接提交本模板中的示例值。

## 使用方法

在本目录创建 `team_metadata.json`。该文件已被 Git 忽略，不会进入正式提交包。

```json
{
  "entry_name": "YourUniversity-PrimaryLastName-MC2",
  "team_members": [
    {
      "name": "成员一真实姓名",
      "affiliation": "学校 / 学院 / 班级",
      "email": "member1@example.edu",
      "primary_contact": true
    },
    {
      "name": "成员二真实姓名",
      "affiliation": "学校 / 学院 / 班级",
      "email": "member2@example.edu",
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

在 `VAST_Challenge_2026_MC2` 目录运行：

```powershell
node .\apply_team_metadata.js
node .\pre_submission_validator.js
```

回到仓库根目录运行浏览器检查：

```powershell
npm install
npm run verify
```

## 字段规则

- `entry_name`：建议格式为 `学校或组织-主联系人姓氏-MC2`。
- `team_members`：填写所有成员的真实姓名、单位和邮箱。
- `primary_contact`：必须且只能有一位成员为 `true`。
- `student_team`：按实际情况填写 `YES` 或 `NO`。
- `total_hours`：填写团队在本题投入的总工时。
- `video_link`：必须是评委无需特殊账号即可稳定访问的链接。
- `public_repository_permission`：由团队决定填写 `YES` 或 `NO`。

如果使用包内视频，将 `video_link` 替换为：

```json
"video_file": "video.mp4"
```

并把 MP4 或 WMV 文件放在 `VAST_Challenge_2026_MC2` 根目录。打包器会自动复制该视频。

## 安全提醒

- 不要把含私人邮箱的 `team_metadata.json` 加入 Git。
- 不要用 `TODO`、`REPLACE_ME`、示例邮箱或临时视频链接通过最终检查。
- 自动填写后仍需人工检查最终 `index.htm` 和 PDF 中的团队信息。
