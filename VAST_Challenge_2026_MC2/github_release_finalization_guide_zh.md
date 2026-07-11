# GitHub 最终版本冻结指南

如果最终提交表里写了 GitHub Pages 或 GitHub 仓库链接，建议给最终 commit 打 tag 或创建 GitHub Release。这样评委看到的是一个冻结版本，而不是截止后可能继续变化的页面。

## 什么时候打 tag

只在下面条件都满足后打 tag：

- `final_report_0709.html` 或最终 zip 的 `index.htm` 真实团队信息已填。
- 视频链接或视频文件已填。
- `node pre_submission_validator.js` 通过。
- 最终修改已经 commit。
- 小组确认不再改最终内容。

## 本地检查

在项目根目录运行：

```powershell
.\check_github_release_readiness.ps1
```

这个脚本只读 git 状态，不会创建 tag，也不会 push。

它会检查：

- 当前远端是不是 `laoshan-song/vast.git`。
- 当前分支和 HEAD commit。
- 工作区是否干净。
- HEAD 是否已经有 tag。

如果工作区不干净，不要打 tag。先 commit。

## 打 tag 的基本命令

在 `vast_push_sparse` 仓库目录里：

```powershell
git status
git add VAST_Challenge_2026_MC2
git commit -m "Finalize MC2 submission"
git tag mc2-final-YYYYMMDD
git push origin master
git push origin mc2-final-YYYYMMDD
```

把 `YYYYMMDD` 改成真实日期，例如 `20260711`。

## 不要做的事

- 不要在验证器失败时打 tag。
- 不要把 `team_metadata.json` commit 或 push。
- 不要在截止后继续修改 tag 对应的提交。
- 不要只提交 GitHub 链接而不上传 PCS/course 要求的 zip。
- 不要把旧探索笔记当最终答案。

## 推荐最终记录

提交前在队伍共享文档里记录：

- final zip 文件名
- final commit hash
- final tag 名称
- GitHub Pages URL
- 视频 URL
- PCS/course 上传时间
