# Final MC2 0709 Artifacts

This directory contains multiple development artifacts. For grading or final review, use the files below as canonical.

## Canonical Review Files

- Interactive visual analytics system: `rebuild/index.html`
- System overview: `rebuild/overview.html`
- Q1 exact chain and system context: `rebuild/q1.html`
- Q2 provenance and evidence boundary: `rebuild/q2.html`
- Q3 recurrence and one intervention: `rebuild/q3.html`
- Final report HTML: `final_report_0709.html`
- Submission-package readme: `SUBMISSION_README.md`
- Reviewer quick start: `reviewer_quick_start.md`
- Evidence audit: `critical_review.md`
- Finalization guide: `submission_finalization_guide_zh.md`
- GitHub release guide: `github_release_finalization_guide_zh.md`
- Metadata fill helper: `apply_team_metadata.js`
- Pre-submission validator: `pre_submission_validator.js`
- Accessibility validator: `accessibility_verify.js`
- Responsive layout validator: `responsive_verify.js`
- Slides and narration support: `slides_0709.html`, `video_script_4min_zh.md`, `video_recording_checklist.md`
- Submission builder: `../build_final_submission_zip.ps1`
- Release readiness check: `../check_github_release_readiness.ps1`

## Not Canonical

- `Q AND A.md` is exploratory analysis only. It contains hypotheses that are intentionally superseded by the evidence-boundary language in the final report and rebuild pages.
- `VAST Challenge 2026 MC2 Answer Sheet.htm` is an official template and should not be submitted unless it has been fully filled.
- Older `q1/`, `q2/`, `q3/`, and `submission/` folders are development or alternate versions, not the final review path.

## Still Required Before Official Submission

- Fill real team metadata, affiliations, emails, primary contact, total hours, and public repository permission.
- Add a stable narrated video link or bundled video file.
- Record from `video_script_4min_zh.md`; it is aligned to the current drill-down interactions and the <=4 minute video requirement.
- Put the final answer page at the root of the official zip as `index.htm`.
- Create a Git tag or GitHub Release for the submitted version if using GitHub Pages as a demo link.
- Build a clean zip with only final files and relative links.
- Run `node pre_submission_validator.js`, `node accessibility_verify.js`, and `node responsive_verify.js` after real team metadata and video information are filled.
- From the repository root, use `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./build_final_submission_zip.ps1`. It refuses to build an official zip while validation fails; `-AllowDraft` is only for internal review.

## Reproducibility Status

- The official `MC2 data.json` is intentionally ignored and must not enter the submission zip.
- Running `python rebuild/extract_data.py` against the official file reproduces the analysis counts and writes source-file SHA-256 values into `rebuild/mc2_viz_data.json` and `.js`.
- The current official source contains `185,147` events and produces the three known file-source incidents without manual data edits.
- `final_report_0709.pdf` is a fixed review artifact. The official zip uses `index.htm` as the authoritative answer and intentionally omits the PDF so metadata cannot drift between formats.

## Interactive Review Features

- `Review` mode presents the concise evidence path; `Explore` mode reveals supporting baselines and alternative analytical views.
- Incident selection persists across Q1, Q2, and Q3 through URL-backed state, so reviewers can follow one case without reselecting it.
- Overview adds a normal-versus-anomalous directly-follows model and a 108-post SaidIt rule-space view.
- Q1 adds an Agent relay swimlane with hop-order and elapsed-time axes plus Agent highlighting.
- Q2 adds an evidence provenance DAG that distinguishes logged, inferred, and unknown links.
- Q3 adds a shared-Agent UpSet view for exact incident membership intersections.
- Clickable and keyboard-focusable marks expose evidence details; supported overview marks can pin tooltips until `Esc` is pressed.

## Local Verification Setup

- Run `npm install` once from the repository root. The only browser dependency is `playwright-core`; validators reuse the installed Microsoft Edge browser.
- Run `npm run verify` from the repository root for accessibility, responsive-layout, and rebuild screenshot checks.
