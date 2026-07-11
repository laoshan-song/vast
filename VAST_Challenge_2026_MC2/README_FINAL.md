# Final MC2 0709 Artifacts

This directory contains multiple development artifacts. For grading or final review, use the files below as canonical.

## Canonical Review Files

- Interactive visual analytics system: `rebuild/index.html`
- System overview: `rebuild/overview.html`
- Q1 exact chain and system context: `rebuild/q1.html`
- Q2 provenance and evidence boundary: `rebuild/q2.html`
- Q3 recurrence and one intervention: `rebuild/q3.html`
- Final report HTML: `final_report_0709.html`
- Reviewer quick start: `reviewer_quick_start.md`
- Evidence audit: `critical_review.md`
- Finalization guide: `submission_finalization_guide_zh.md`
- GitHub release guide: `github_release_finalization_guide_zh.md`
- Metadata fill helper: `apply_team_metadata.js`
- Pre-submission validator: `pre_submission_validator.js`
- Accessibility validator: `accessibility_verify.js`
- Responsive layout validator: `responsive_verify.js`
- Slides and narration support: `slides_0709.html`, `video_script_4min_zh.md`, `video_recording_checklist.md`

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
- From the project root, use `build_final_submission_zip.ps1` so the zip is not built when validation fails.
