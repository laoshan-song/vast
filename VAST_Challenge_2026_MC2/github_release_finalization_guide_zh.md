# GitHub 最终版本冻结指南

如果最终答案中包含 GitHub Pages 或仓库链接，应使用 tag 或 GitHub Release 固定评委看到的版本。

## 打 tag 前必须满足

- `final_report_0709.html` 已填入真实团队信息；
- 视频链接或包内视频已准备好；
- `node pre_submission_validator.js` 通过；
- `npm run verify` 通过；
- 正式 ZIP 已构建并从新目录人工检查；
- 所有最终修改已经 commit；
- 团队确认不再修改提交内容。

## 只读就绪检查

在 `vast` 仓库根目录运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\check_github_release_readiness.ps1
```

该脚本不会创建 tag，也不会 push。它只检查：

- `origin` 是否为 `https://github.com/laoshan-song/vast.git`；
- 当前分支和 HEAD commit；
- 工作区是否干净；
- HEAD 是否已有 tag。

在工作区不干净或提交校验失败时，不要创建最终 tag。

## 创建冻结版本

确认最终修改后，根据团队流程提交：

```powershell
git status
git add .gitignore package.json package-lock.json VAST_Challenge_2026_MC2 build_final_submission_zip.ps1 check_github_release_readiness.ps1
git commit -m "Finalize MC2 submission"
git push origin master
```

然后使用真实日期创建并推送 tag：

```powershell
git tag mc2-final-YYYYMMDD
git push origin mc2-final-YYYYMMDD
```

如需 GitHub Release，应让 Release 指向同一个 tag，并附上最终 ZIP 的文件名和 SHA-256。

## 不要做

- 不要提交 `team_metadata.json` 或 `MC2 data.json`；
- 不要在验证失败时打 tag；
- 不要修改已经提交给评委的 tag；
- 不要只提交在线链接而遗漏官方要求的 ZIP；
- 不要把探索笔记或旧页面当作最终答案。

## 团队留档

建议记录：

- 最终 ZIP 文件名和 SHA-256；
- 最终 commit hash；
- 最终 tag 和 Release URL；
- GitHub Pages URL；
- 视频 URL；
- PCS 或课程系统上传时间。
