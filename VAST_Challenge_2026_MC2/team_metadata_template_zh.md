# MC2 Team Metadata Template

用途：最后填写真实队伍信息和视频链接时，把下面 JSON 复制为 `team_metadata.json`，放到本目录中，然后运行 `node apply_team_metadata.js`。

不要把这个模板当作最终信息提交。所有字段都必须替换为真实值。

## 命令

```bat
cd /d "D:\大二下\大数据可视化\期末大作业\vast_push_sparse\VAST_Challenge_2026_MC2"
node apply_team_metadata.js
node pre_submission_validator.js
node accessibility_verify.js
node responsive_verify.js
```

## JSON 模板

```json
{
  "entry_name": "真实学校或组织-主联系人姓氏-MC2",
  "team_members": [
    {
      "name": "成员1真实姓名",
      "affiliation": "学校 / 学院 / 班级",
      "email": "member1@example.edu",
      "primary_contact": true
    },
    {
      "name": "成员2真实姓名",
      "affiliation": "学校 / 学院 / 班级",
      "email": "member2@example.edu",
      "primary_contact": false
    },
    {
      "name": "成员3真实姓名",
      "affiliation": "学校 / 学院 / 班级",
      "email": "member3@example.edu",
      "primary_contact": false
    }
  ],
  "student_team": "YES",
  "tools_used": "Python data extraction, JavaScript, HTML/CSS/SVG, browser-based visual analytics, GitHub Pages, browser screenshot verification",
  "total_hours": "真实总工时数字",
  "video_link": "https://真实可访问视频链接",
  "public_repository_permission": "YES"
}
```

## 字段规则

- `entry_name`: 建议格式为 `学校或组织-主联系人姓氏-MC2`。
- `team_members`: 三个人都写真实姓名、单位、邮箱。
- `primary_contact`: 只能有一个成员是 `true`。
- `student_team`: 学生队填 `YES`。
- `total_hours`: 只能填正数，例如 `96`、`120`、`135.5`。
- `video_link`: 必须是评委或老师能稳定访问的链接；如果用包内视频，则改成 `video_file` 字段并填 `video.mp4` 或 `.wmv`。
- `public_repository_permission`: 同意公开仓库填 `YES`，不同意填 `NO`。

## 如果使用包内视频文件

把 `video_link` 替换成：

```json
  "video_file": "video.mp4",
```

并确认视频文件实际放在同一个目录。

## 安全提醒

脚本运行成功后，可以删除 `team_metadata.json`，避免把邮箱等个人信息误提交到 GitHub。最终答案页中仍会保留官方要求的队伍信息。
