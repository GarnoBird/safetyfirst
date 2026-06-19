# Safety Wiki Review Report

Last generated: 2026-06-19

## Pages created

- docs/source-policy.md
- docs/wiki-content-map.md
- 23 major topic draft pages in content/topics/
- 50 toolbox talks in toolbox-talks/
- 17 checklists in checklists/
- 11 form templates in forms/
- 23 quizzes in training/

## Pages updated

- package.json: adds expansion verification command.

## Topics still missing

- Detailed section-by-section WorkSafeBC citation notes.
- Employer-specific procedures reviewed by a competent person.
- Trade-specific subpages for concrete, roofing, electrical, mechanical, demolition, restoration, and public protection.
- Source-specific pages for OHS Guidelines and Prevention Manual policy entries.

## Source gaps

- Most generated pages cite source candidates but do not yet include exact section-level legal analysis.
- Needs verification against current WorkSafeBC/OHS source.
- CSA/ANSI/manufacturer requirements are not reproduced and need source access before use.

## Legal/regulatory items requiring human verification

- Any legal threshold, certification, inspection interval, reporting deadline, qualified-person requirement, exposure limit, or record-retention period.
- Any statement that a written plan, permit, rescue service, engineered document, or specific training card is legally required.
- Any emergency/medical instruction beyond calling 911, activating site first aid, and following trained first aid/AED procedures.

## Verification commands

- npm run verify:wiki-expansion
- npm run validate:wiki
- npm run build

## Recommended next phase

1. Assign a qualified BC safety reviewer to the high-risk topics: fall protection, confined spaces, excavation, silica, cranes/rigging, lockout, electrical, first aid, and emergency response.
2. Build source-note files for the exact OHS Regulation and guideline sections supporting each page.
3. Convert reviewed topic pages into the public React wiki index after source review.
4. Add a source-change monitoring workflow for WorkSafeBC and BC Laws pages.
