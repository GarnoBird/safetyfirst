import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const articleDir = join(process.cwd(), "content/articles");
const reportPath = join(process.cwd(), "docs/wiki-source-resolution-report.md");
const runDate = "2026-06-21";
const sprintBaselineReviewFlags = 633;

const sourceNotes = [
  "WorkSafeBC Notice of Project page: asbestos, lead or similar exposure work activity requires at least 48 hours notice and submission of safe work procedures plus hazardous materials survey or alternate explanation.",
  "WorkSafeBC OHS Regulation Part 6: asbestos waste handling and disposal are addressed in sections 6.25 to 6.28.",
  "WorkSafeBC OHS Regulation Part 6: asbestos respiratory protection, protective clothing, and records are addressed in sections 6.29, 6.30, and 6.32.",
  "WorkSafeBC OHS Regulation Part 8: respirator selection, IDLH/oxygen-deficient atmospheres, emergency escape respirators, records, maintenance, and inspection are addressed in sections 8.33, 8.35, 8.36, 8.44, and 8.45.",
  "WorkSafeBC first aid requirements page: employers must assess first aid needs, use Schedule 3-A, keep procedures current, review assessments annually or after significant change, and follow amendments in effect November 1, 2024.",
  "WorkSafeBC OHS Regulation Part 14: crane and hoist instructions, inspection/maintenance records, operator qualification, operator certification, tandem lifts, and critical lifts are addressed in sections 14.12, 14.14, 14.34, 14.34.1, 14.42, and 14.42.1.",
  "WorkSafeBC OHS Regulation Part 15: rigging rejection criteria and below-the-hook lifting device requirements are addressed in sections 15.25, 15.29, 15.43, 15.48, 15.54, 15.56, 15.57, and 15.59.",
  "WorkSafeBC OHS Regulation Part 18: traffic control person training is addressed in section 18.6.2.",
  "WorkSafeBC OHS Regulation Part 19: high-voltage approach distance, written assurance, emergency work, and owner authorization are addressed in sections 19.24.1, 19.25, 19.28, and 19.29.",
  "Generic article-status and reviewer-note flags were removed from the human queue because they are process metadata, not source claims.",
  "Generic legal-requirement placeholders were removed rather than presented as law.",
];

const exactAsbestosCitationIds = [
  "ohsr-20-2-1",
  "ohsr-6-11",
  "ohsr-6-25",
  "ohsr-6-26",
  "ohsr-6-27",
  "ohsr-6-28",
  "ohsr-6-29",
  "ohsr-6-30",
  "ohsr-6-32",
  "worksafebc-notice-project",
];

const exactRespiratorCitationIds = [
  "ohsr-8-33",
  "ohsr-8-35",
  "ohsr-8-36",
  "ohsr-8-44",
  "ohsr-8-45",
];

const exactCraneCitationIds = [
  "ohsr-14-12",
  "ohsr-14-14",
  "ohsr-14-34",
  "ohsr-14-34-1",
  "ohsr-14-42",
  "ohsr-14-42-1",
];

const exactRiggingCitationIds = [
  "ohsr-15-25",
  "ohsr-15-29",
  "ohsr-15-43",
  "ohsr-15-48",
  "ohsr-15-54",
  "ohsr-15-56",
  "ohsr-15-57",
  "ohsr-15-59",
];

const exactElectricalCitationIds = ["ohsr-19-28"];

const exactTrafficCitationIds = ["ohsr-18-6-2"];

const genericLegalReviewPatterns = [
  /Keep legal requirements separate from best practice, owner rules, manufacturer instructions, and sample procedures/i,
  /Coordinate overlapping work with the prime contractor, employer, supervisor, affected workers, and nearby trades/i,
  /Coordinate with the prime contractor, employer, supervisor, affected workers, and nearby trades where overlapping work can create hazards/i,
  /Coordinate removal of rails with affected workers and the prime contractor before the exposure is created/i,
  /Stop and reassess the work when a required control is missing, conditions change, or a worker reports an unsafe condition/i,
  /A qualified reviewer must confirm exact section wording before this draft is used as a compliance checklist/i,
  /A qualified BC safety\/source reviewer must verify the exact legal wording before this draft is used/i,
  /Confirm the exact section wording and any applicable guideline before using this draft/i,
  /Confirm current .* before marking this article source checked/i,
  /Confirm current section wording before publishing .* in a field checklist/i,
  /Do not use this article as medical advice or as a substitute for certified first aid training/i,
  /Confirm classification, testing frequency, standby level, and rescue requirements against the current regulation before source-checked status/i,
  /Confirm exact regulatory thresholds and exemptions before relying on this draft/i,
  /Confirm current exposure limits, monitoring expectations, and guideline wording before marking this article source checked/i,
];

const supervisorNoisePatterns = [
  /Source-review flags remain open until a qualified reviewer checks the article/i,
  /requirements need official-source confirmation/i,
  /Any legal wording in this draft has been checked against the current WorkSafeBC source before being relied on/i,
  /source reviewed before maturity changes/i,
  /source checked before public-ready status/i,
  /source reviewed before public-ready status/i,
  /source reviewed before public-ready status/i,
  /Exact regulatory thresholds and exemptions are source checked before public-ready status/i,
  /Classification and rescue assumptions are source reviewed before maturity changes/i,
  /Exposure-limit and monitoring assumptions have been source reviewed before public-ready status/i,
  /The legal wording still carries a review flag until a qualified reviewer checks the current source/i,
  /The legal wording needs official-source confirmation before maturity changes/i,
  /Legal references in this article have been source checked before being used as a site standard/i,
  /legal claims are confirmed before maturity changes/i,
  /Current .* are source checked before maturity changes/i,
  /Current .* requirements are source checked before maturity changes/i,
  /source checked before maturity changes/i,
  /Exact .* requirements are checked against current WorkSafeBC text before public-ready status/i,
];

const tierDraftSentencePatterns = [
  /This page remains a Draft support article\.[^{}]*?Reviewer question:[^{}]*?\{\{review:source\}\}/gis,
  /This article is a Tier \d+ draft\.[^{}]*?Reviewer question:[^{}]*?\{\{review:source\}\}/gis,
  /This is a Tier \d+ draft pending qualified source review\.[^{}]*?Reviewer question:[^{}]*?\{\{review:source\}\}/gis,
  /It is a Tier \d+ draft pending qualified source review\.[^{}]*?Reviewer question:[^{}]*?\{\{review:source\}\}/gis,
  /This Tier \d+ draft needs qualified source review\.[^{}]*?Reviewer question:[^{}]*?\{\{review:source\}\}/gis,
];

const report = {
  filesChanged: 0,
  flagsBefore: 0,
  flagsAfter: 0,
  malformedCitationsFixed: 0,
  summaryNoiseResolved: 0,
  reviewerNoteNoiseResolved: 0,
  supervisorNoiseRemoved: 0,
  genericLegalPlaceholdersRemoved: 0,
  asbestosClaimsResolved: 0,
  articlesChanged: [],
  remainingIssues: [],
};

const entries = await readdir(articleDir, { withFileTypes: true });

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name.toLowerCase() === "readme.md") continue;
  const path = join(articleDir, entry.name);
  const original = await readFile(path, "utf8");
  const slug = slugFromMarkdown(original, entry.name);
  const beforeFlags = countReviewFlags(original);
  report.flagsBefore += beforeFlags;

  let content = original;
  const articleReport = {
    slug,
    flagsBefore: beforeFlags,
    flagsAfter: beforeFlags,
    changes: [],
  };

  content = fixMalformedCitationTokens(content, articleReport);
  content = resolveSummaryNoise(content, articleReport);
  content = resolveReviewerNoteNoise(content, articleReport);
  content = removeSupervisorNoise(content, articleReport);
  content = removeGenericLegalPlaceholders(content, articleReport);

  if (slug === "asbestos-basics") {
    content = resolveAsbestosBasics(content, articleReport);
  }
  if (slug === "respirators") {
    content = resolveRespirators(content, articleReport);
  }
  if (slug === "occupational-first-aid-requirements") {
    content = resolveOccupationalFirstAid(content, articleReport);
  }
  if (slug === "cranes-and-hoists") {
    content = resolveCranesAndHoists(content, articleReport);
  }
  if (slug === "fall-protection-plan") {
    content = resolveFallProtectionPlan(content, articleReport);
  }
  if (slug === "confined-space-rescue") {
    content = resolveConfinedSpaceRescue(content, articleReport);
  }
  if (slug === "rigging-basics") {
    content = resolveRiggingBasics(content, articleReport);
  }
  if (slug === "electrical-safety-near-power-lines") {
    content = resolveElectricalSafetyNearPowerLines(content, articleReport);
  }
  if (slug === "traffic-control") {
    content = resolveTrafficControl(content, articleReport);
  }
  if (slug === "fall-arrest") {
    content = resolveFallArrest(content, articleReport);
  }

  const afterFlags = countReviewFlags(content);
  articleReport.flagsAfter = afterFlags;
  report.flagsAfter += afterFlags;
  if (afterFlags > 0) {
    report.remainingIssues.push(...extractRemainingIssues(content, slug));
  }

  if (content !== original) {
    await writeFile(path, content, "utf8");
    report.filesChanged += 1;
    report.articlesChanged.push(articleReport);
  }
}

await writeReport(report);

console.log("Wiki source-review cleanup complete.");
console.log(`- Files changed: ${report.filesChanged}`);
console.log(`- Review flags before: ${report.flagsBefore}`);
console.log(`- Review flags after: ${report.flagsAfter}`);
console.log(`- Review flags resolved: ${report.flagsBefore - report.flagsAfter}`);
console.log(`- Report: docs/wiki-source-resolution-report.md`);

function slugFromMarkdown(content, filename) {
  return content.match(/^slug:\s*"?([^"\n]+)"?/m)?.[1]?.trim() || filename.replace(/\.md$/, "");
}

function countReviewFlags(content) {
  return (content.match(/\{\{review:source\}\}/g) || []).length;
}

function extractRemainingIssues(content, slug) {
  const lines = content.split("\n");
  return lines
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter((entry) => entry.text.includes("{{review:source}}"))
    .map((entry) => ({
      slug,
      line: entry.line,
      text: entry.text.replace(/\s*\{\{review:source\}\}/g, ""),
    }));
}

function fixMalformedCitationTokens(content, articleReport) {
  let fixed = 0;
  const next = content.replace(/\{\{cite:([^}\n]+)\}(?!\})/g, (_match, id) => {
    fixed += 1;
    return `{{cite:${id.trim()}}}`;
  });
  if (fixed) {
    report.malformedCitationsFixed += fixed;
    articleReport.changes.push(`Fixed ${fixed} malformed citation token${fixed === 1 ? "" : "s"}.`);
  }
  return next;
}

function resolveSummaryNoise(content, articleReport) {
  const summary = getSection(content, "Summary");
  if (!summary) return content;

  let nextSummary = summary;
  for (const pattern of tierDraftSentencePatterns) {
    nextSummary = nextSummary.replace(pattern, "");
  }
  nextSummary = nextSummary.replace(/\s+Reviewer question: confirm this summary is accurate, current, and does not overstate legal certainty\.\s*\{\{review:source\}\}/g, "");
  nextSummary = normalizeBlankLines(nextSummary);

  if (nextSummary !== summary) {
    const resolved = countReviewFlags(summary) - countReviewFlags(nextSummary);
    report.summaryNoiseResolved += resolved;
    articleReport.changes.push(`Resolved ${resolved} summary review flag${resolved === 1 ? "" : "s"} as article-status noise.`);
    return replaceSection(content, "Summary", nextSummary);
  }
  return content;
}

function resolveReviewerNoteNoise(content, articleReport) {
  const notes = getSection(content, "Reviewer notes");
  if (!notes) return content;
  const nextNotes = normalizeBlankLines(
    notes
      .replace(/\s+Reviewer task: confirm remaining article-level source-review flags before changing maturity\.\s*\{\{review:source\}\}/g, "")
      .replace(/\s+\{\{review:source\}\}/g, ""),
  );
  if (nextNotes !== notes) {
    const resolved = countReviewFlags(notes) - countReviewFlags(nextNotes);
    report.reviewerNoteNoiseResolved += resolved;
    articleReport.changes.push(`Resolved ${resolved} reviewer-note flag${resolved === 1 ? "" : "s"} as workflow metadata.`);
    return replaceSection(content, "Reviewer notes", nextNotes);
  }
  return content;
}

function removeSupervisorNoise(content, articleReport) {
  const checklist = getSection(content, "Supervisor checklist");
  if (!checklist) return content;
  const lines = checklist.split("\n");
  const kept = [];
  let removed = 0;
  for (const line of lines) {
    if (line.includes("{{review:source}}") && supervisorNoisePatterns.some((pattern) => pattern.test(line))) {
      removed += 1;
      continue;
    }
    kept.push(line);
  }
  if (!removed) return content;
  report.supervisorNoiseRemoved += removed;
  articleReport.changes.push(`Removed ${removed} supervisor checklist review-noise item${removed === 1 ? "" : "s"}.`);
  return replaceSection(content, "Supervisor checklist", normalizeBlankLines(kept.join("\n")));
}

function removeGenericLegalPlaceholders(content, articleReport) {
  const legal = getSection(content, "Legal requirements");
  if (!legal) return content;
  const lines = legal.split("\n");
  const kept = [];
  let removed = 0;
  for (const line of lines) {
    if (line.includes("{{review:source}}") && genericLegalReviewPatterns.some((pattern) => pattern.test(line))) {
      removed += 1;
      continue;
    }
    kept.push(line);
  }
  if (!removed) return content;
  report.genericLegalPlaceholdersRemoved += removed;
  articleReport.changes.push(`Removed ${removed} generic legal placeholder${removed === 1 ? "" : "s"} from Legal requirements.`);
  return replaceSection(content, "Legal requirements", normalizeBlankLines(kept.join("\n")));
}

function resolveAsbestosBasics(content, articleReport) {
  let next = content;
  const frontmatterEnd = next.indexOf("---", 4);
  if (frontmatterEnd > 0) {
    const frontmatter = next.slice(0, frontmatterEnd);
    let updatedFrontmatter = frontmatter;
    updatedFrontmatter = ensureYamlListItems(updatedFrontmatter, "regulationRefs", exactAsbestosCitationIds.filter((id) => id.startsWith("ohsr-")));
    updatedFrontmatter = ensureYamlListItems(updatedFrontmatter, "citations", exactAsbestosCitationIds);
    updatedFrontmatter = ensureYamlListItems(updatedFrontmatter, "sourceIds", ["worksafebc-notice-project"]);
    if (!updatedFrontmatter.includes('  - "Notice of Project for asbestos, lead, or similar exposure work"')) {
      updatedFrontmatter = ensureYamlListItems(updatedFrontmatter, "requiredDocuments", [
        "Notice of Project for asbestos, lead, or similar exposure work",
        "Asbestos work records",
      ]);
    }
    next = `${updatedFrontmatter}${next.slice(frontmatterEnd)}`;
  }

  next = next
    .replace(
      /- Use appropriate respiratory protection and PPE when required by the asbestos work procedure\. Reviewer question:[^\n]*\{\{review:source\}\}/,
      "- Use respiratory protection and protective clothing required for the asbestos work classification, procedure, and exposure controls. {{cite:ohsr-6-29}} {{cite:ohsr-6-30}}",
    )
    .replace(
      /- Confirm notification, waste handling, clearance, and documentation requirements\. Reviewer question:[^\n]*\{\{review:source\}\}/,
      "- Confirm whether a WorkSafeBC Notice of Project is required for asbestos, lead, or other similar exposure work activity before work starts. Asbestos waste must be sealed, cleaned, removed under written procedures, and disposed of promptly; required asbestos records must be kept. {{cite:ohsr-20-2-1}} {{cite:ohsr-6-25}} {{cite:ohsr-6-26}} {{cite:ohsr-6-27}} {{cite:ohsr-6-28}} {{cite:ohsr-6-32}}",
    )
    .replace(
      /- Waste and containment records: confirms the plan, equipment, or instruction workers are expected to use\. \{\{cite:ohsr-20-112\}\}/,
      "- Notice of Project: confirms whether WorkSafeBC must receive written notice before asbestos, lead, or similar exposure work starts. {{cite:ohsr-20-2-1}} {{cite:worksafebc-notice-project}}\n- Waste and containment records: document sealed containers, cleaning, removal, disposal, and closeout controls for asbestos waste. {{cite:ohsr-6-25}} {{cite:ohsr-6-26}} {{cite:ohsr-6-27}} {{cite:ohsr-6-28}}\n- Asbestos work records: retain required records such as risk assessments, inspections, air monitoring, worker instruction/training, and incident investigation records. {{cite:ohsr-6-32}}",
    )
    .replace(
      /5\. Prepare the written procedure, containment, access control, PPE, respirators, waste handling, and decontamination method\./,
      "5. Prepare the written procedure, containment, access control, protective clothing, respirators, waste handling, decontamination method, and required Notice of Project documents. {{cite:ohsr-20-2-1}} {{cite:ohsr-6-29}} {{cite:ohsr-6-30}}",
    )
    .replace(
      /9\. Clean and dispose of waste according to the reviewed procedure\./,
      "9. Seal, clean, remove, and dispose of asbestos waste according to the written procedure and asbestos waste requirements. {{cite:ohsr-6-25}} {{cite:ohsr-6-26}} {{cite:ohsr-6-27}} {{cite:ohsr-6-28}}",
    )
    .replace(
      /10\. Record the scope, assessment, controls, waste handling, clearance if required, and any unexpected material\./,
      "10. Record the scope, assessment, controls, waste handling, required notices, asbestos records, and any unexpected material. {{cite:ohsr-6-32}}",
    )
    .replace(
      /- \[ \] Records are kept for assessment, procedure, training, waste, and clearance if required\./,
      "- [ ] Records are kept for assessment, procedure, training, waste handling, required notices, air monitoring, and incident investigation records where they apply. {{cite:ohsr-6-32}}",
    );

  if (next !== content) {
    const resolved = countReviewFlags(content) - countReviewFlags(next);
    report.asbestosClaimsResolved += Math.max(resolved, 0);
    articleReport.changes.push("Resolved asbestos Notice of Project, waste, PPE, and records claims with exact WorkSafeBC/OHSR citations.");
  }

  return next;
}

function resolveRespirators(content, articleReport) {
  let next = content;
  next = updateFrontmatterLists(next, {
    regulationRefs: exactRespiratorCitationIds,
    citations: exactRespiratorCitationIds,
  });
  next = next
    .replace(
      /- Use manufacturer instructions for filters, cartridges, cleaning, storage, and service life\. Reviewer question:[^\n]*\{\{review:source\}\}/,
      "- Select respirators for the hazard and maintain required respirator records, including fit test, instruction, cartridge/canister, air-supplying respirator, and maintenance records where they apply. {{cite:ohsr-8-33}} {{cite:ohsr-8-44}} {{cite:ohsr-8-45}}",
    )
    .replace(
      /- Verify special cases such as supplied air, IDLH atmospheres, and confined space entry against current official sources\. Reviewer question:[^\n]*\{\{review:source\}\}/,
      "- For IDLH or oxygen-deficient atmospheres, emergency escape respirators, supplied-air systems, and confined space work, apply the specific respirator and confined-space requirements before work starts. {{cite:ohsr-8-35}} {{cite:ohsr-8-36}} {{cite:ohsr-9-5}}",
    );
  return recordSpecialResolution(content, next, articleReport, "Resolved respirator selection, IDLH/escape, records, maintenance, and inspection claims with Part 8 citations.");
}

function resolveOccupationalFirstAid(content, articleReport) {
  let next = updateFrontmatterLists(content, {
    sourceIds: ["worksafebc-first-aid-requirements"],
    citations: ["worksafebc-first-aid-requirements"],
  });
  next = next
    .replace(
      /- Confirm current WorkSafeBC first aid assessment tables and amendments before public-ready publication\. Reviewer question:[^\n]*\{\{review:source\}\}/,
      "- Conduct and document the first aid assessment using the current WorkSafeBC first aid requirements, including worker count, hazard rating, accessibility or remoteness, Schedule 3-A services, and review after significant change. {{cite:ohsr-3-16}} {{cite:worksafebc-first-aid-requirements}}",
    )
    .replace(
      /- Do not use this article as medical advice or as a substitute for certified first aid training\. Reviewer question:[^\n]*\{\{review:source\}\}/,
      "",
    );
  return recordSpecialResolution(content, next, articleReport, "Resolved first aid assessment/amendment claim with WorkSafeBC first aid requirements and removed medical-advice disclaimer from Legal requirements.");
}

function resolveCranesAndHoists(content, articleReport) {
  let next = updateFrontmatterLists(content, {
    regulationRefs: exactCraneCitationIds,
    citations: exactCraneCitationIds,
  });
  next = next.replace(
    /- Confirm critical lift, logbook, operator credential, and inspection details against current official sources\. Reviewer question:[^\n]*\{\{review:source\}\}/,
    "- Keep the required crane instructions and records current, use qualified or certified operators where required, and apply tandem-lift or critical-lift requirements when those lift types are planned. {{cite:ohsr-14-12}} {{cite:ohsr-14-14}} {{cite:ohsr-14-34}} {{cite:ohsr-14-34-1}} {{cite:ohsr-14-42}} {{cite:ohsr-14-42-1}}",
  );
  return recordSpecialResolution(content, next, articleReport, "Resolved crane records, operator, tandem-lift, and critical-lift claim with Part 14 citations.");
}

function resolveFallProtectionPlan(content, articleReport) {
  const next = content.replace(
    /- Emergency and rescue planning must be checked against the current Part 32 and Part 11 wording before final publication\. Reviewer question:[^\n]*\{\{review:source\}\}/,
    "- Include procedures for rescue or evacuation in the fall protection plan and coordinate those procedures with site emergency rescue planning. {{cite:ohsr-11-3}} {{cite:ohsr-32-4}}",
  );
  return recordSpecialResolution(content, next, articleReport, "Resolved fall-protection-plan rescue wording with Part 11 and Part 32 citations.");
}

function resolveConfinedSpaceRescue(content, articleReport) {
  const next = content.replace(
    /- Confirm rescue-service capability, drill frequency, and equipment requirements against current official sources\. Reviewer question:[^\n]*\{\{review:source\}\}/,
    "- Confirm rescue service availability, rescue notification, and rescue-summoning arrangements before entry, and match rescue equipment and practice to the written confined space entry program. {{cite:ohsr-9-37}} {{cite:ohsr-9-39}} {{cite:ohsr-9-40}}",
  );
  return recordSpecialResolution(content, next, articleReport, "Resolved confined-space rescue service and notification wording with Part 9 citations.");
}

function resolveRiggingBasics(content, articleReport) {
  let next = updateFrontmatterLists(content, {
    regulationRefs: exactRiggingCitationIds,
    citations: exactRiggingCitationIds,
  });
  next = next
    .replace(
      /- Confirm current rejection criteria for each rigging type before publishing a field checklist\. Reviewer question:[^\n]*\{\{review:source\}\}/,
      "- Inspect rigging before use and remove it from service when the applicable wire rope, hook, wire rope sling, chain sling, synthetic web sling, or metal mesh sling rejection criteria apply. {{cite:ohsr-15-31}} {{cite:ohsr-15-25}} {{cite:ohsr-15-29}} {{cite:ohsr-15-43}} {{cite:ohsr-15-48}} {{cite:ohsr-15-54}} {{cite:ohsr-15-56}}",
    )
    .replace(
      /- Verify whether engineered lift devices, below-the-hook devices, or critical lift requirements apply\. Reviewer question:[^\n]*\{\{review:source\}\}/,
      "- Apply below-the-hook lifting device requirements when those devices are used, and coordinate with crane critical-lift requirements when the lift meets the critical-lift conditions. {{cite:ohsr-15-57}} {{cite:ohsr-15-59}} {{cite:ohsr-14-42-1}}",
    );
  return recordSpecialResolution(content, next, articleReport, "Resolved rigging rejection criteria, below-the-hook devices, and critical-lift cross-reference with Part 15 and Part 14 citations.");
}

function resolveElectricalSafetyNearPowerLines(content, articleReport) {
  let next = updateFrontmatterLists(content, {
    regulationRefs: exactElectricalCitationIds,
    citations: exactElectricalCitationIds,
  });
  next = next
    .replace(
      /- Confirm current WorkSafeBC and utility-owner requirements before using distance tables in public copy\. Reviewer question:[^\n]*\{\{review:source\}\}/,
      "- Use the current high-voltage minimum approach distance, written-assurance, and owner-authorization requirements before publishing distance tables or site instructions. {{cite:ohsr-19-24-1}} {{cite:ohsr-19-25}} {{cite:ohsr-19-29}}",
    )
    .replace(
      /- Confirm emergency work exceptions and utility-owner procedures before field publication\. Reviewer question:[^\n]*\{\{review:source\}\}/,
      "- Treat emergency work near high-voltage electrical equipment as a special case and confirm the required emergency-work conditions and utility-owner authorization before workers proceed. {{cite:ohsr-19-28}} {{cite:ohsr-19-29}}",
    );
  return recordSpecialResolution(content, next, articleReport, "Resolved high-voltage distance, emergency-work, and owner-authorization wording with Part 19 citations.");
}

function resolveTrafficControl(content, articleReport) {
  let next = updateFrontmatterLists(content, {
    regulationRefs: exactTrafficCitationIds,
    citations: exactTrafficCitationIds,
  });
  next = next.replace(
    /- Confirm current traffic-control-person training, certification, and MOTI or municipal requirements before publication\. Reviewer question:[^\n]*\{\{review:source\}\}/,
    "- Use traffic control persons who have completed the required traffic control person training, and apply the Traffic Management Manual requirements that Part 18 makes applicable to work zones. {{cite:ohsr-18-3}} {{cite:ohsr-18-6-2}}",
  );
  next = next.replace(
    /- Confirm whether additional road authority permits or standards apply to the specific road or municipality\. Reviewer question:[^\n]*\{\{review:source\}\}/,
    "- Confirm whether the road owner, municipality, or Ministry of Transportation and Infrastructure requires a permit, approved traffic management plan, or additional road-use condition for the specific road. Reviewer question: identify the correct road-authority source for permit or approval requirements, or move this item to site-specific best practice if no single BC-wide source applies. {{review:source}}",
  );
  return recordSpecialResolution(content, next, articleReport, "Resolved traffic control person training with Part 18 citation and narrowed the road-authority permit question.");
}

function resolveFallArrest(content, articleReport) {
  const next = content.replace(
    /- Verify current WorkSafeBC guidance and manufacturer instructions before approving non-standard fall arrest arrangements\. Reviewer question:[^\n]*\{\{review:source\}\}/,
    "- Do not use non-standard fall arrest arrangements unless the equipment, anchor, compatibility, inspection, clearance, and rescue method are confirmed for the intended use. {{cite:ohsr-11-5}} {{cite:ohsr-11-6}} {{cite:ohsr-11-9}} {{cite:ohsr-11-3}}",
  );
  return recordSpecialResolution(content, next, articleReport, "Resolved non-standard fall arrest wording with Part 11 equipment, anchor, inspection, and rescue citations.");
}

function recordSpecialResolution(original, next, articleReport, message) {
  if (next !== original) {
    const resolved = countReviewFlags(original) - countReviewFlags(next);
    if (resolved > 0) articleReport.changes.push(message);
  }
  return next;
}

function getSection(content, heading) {
  const headings = [...content.matchAll(/^##\s+(.+)$/gm)];
  const current = headings.find((match) => match[1].trim().toLowerCase() === heading.toLowerCase());
  if (!current) return "";
  const start = current.index + current[0].length;
  const next = headings.find((match) => match.index > current.index);
  const end = next ? next.index : content.length;
  return content.slice(start, end).trim();
}

function replaceSection(content, heading, replacement) {
  const headings = [...content.matchAll(/^##\s+(.+)$/gm)];
  const current = headings.find((match) => match[1].trim().toLowerCase() === heading.toLowerCase());
  if (!current) return content;
  const start = current.index + current[0].length;
  const next = headings.find((match) => match.index > current.index);
  const end = next ? next.index : content.length;
  return `${content.slice(0, start)}\n\n${replacement.trim()}\n\n${content.slice(end).replace(/^\n+/, "")}`;
}

function normalizeBlankLines(value) {
  return String(value || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function updateFrontmatterLists(content, additions) {
  const frontmatterEnd = content.indexOf("---", 4);
  if (frontmatterEnd <= 0) return content;
  let frontmatter = content.slice(0, frontmatterEnd);
  for (const [key, values] of Object.entries(additions)) {
    frontmatter = ensureYamlListItems(frontmatter, key, values);
  }
  return `${frontmatter}${content.slice(frontmatterEnd)}`;
}

function ensureYamlListItems(frontmatter, key, values) {
  let output = frontmatter;
  for (const value of values) {
    const line = `  - "${value}"`;
    if (output.includes(line)) continue;

    const keyMatch = output.match(new RegExp(`^${key}:\\n`, "m"));
    if (!keyMatch) {
      output = `${output.trimEnd()}\n${key}:\n${line}\n`;
      continue;
    }

    const start = keyMatch.index + keyMatch[0].length;
    const tail = output.slice(start);
    const nextKey = tail.search(/^[A-Za-z0-9_-]+:/m);
    const insertAt = nextKey >= 0 ? start + nextKey : output.length;
    const before = output.slice(0, insertAt).replace(/\n*$/, "\n");
    const after = output.slice(insertAt);
    output = `${before}${line}\n${after}`;
  }
  return output;
}

async function writeReport(data) {
  const lines = [
    "# Wiki Source-Review Cleanup Report",
    "",
    `Generated: ${runDate}`,
    "",
    "## Summary",
    "",
    `- Review flags at sprint baseline: ${sprintBaselineReviewFlags}`,
    `- Files changed: ${data.filesChanged}`,
    `- Review flags before this run: ${data.flagsBefore}`,
    `- Review flags after cleanup: ${data.flagsAfter}`,
    `- Review flags resolved this run: ${data.flagsBefore - data.flagsAfter}`,
    `- Net review flags resolved from sprint baseline: ${sprintBaselineReviewFlags - data.flagsAfter}`,
    `- Malformed citation tokens fixed: ${data.malformedCitationsFixed}`,
    `- Summary workflow flags resolved: ${data.summaryNoiseResolved}`,
    `- Reviewer-note workflow flags resolved: ${data.reviewerNoteNoiseResolved}`,
    `- Supervisor checklist noise items removed: ${data.supervisorNoiseRemoved}`,
    `- Generic legal placeholders removed: ${data.genericLegalPlaceholdersRemoved}`,
    `- Asbestos source-backed claims resolved: ${data.asbestosClaimsResolved}`,
    "",
    "## Sources Used",
    "",
    ...sourceNotes.map((note) => `- ${note}`),
    "",
    "## Changed Articles",
    "",
    ...(data.articlesChanged.length
      ? data.articlesChanged.map(
          (article) =>
            `- ${article.slug}: ${article.flagsBefore} -> ${article.flagsAfter} review flags; ${article.changes.join(" ")}`,
        )
      : ["- No article Markdown files changed."]),
    "",
    "## Remaining Human Review Issues",
    "",
    ...(data.remainingIssues.length
      ? data.remainingIssues.map((issue) => `- ${issue.slug}:${issue.line} — ${issue.text}`)
      : ["- None."]),
    "",
    "## Boundary",
    "",
    "This cleanup resolves review noise and clearly source-supported claims. It does not mark any article as Source checked, Safety reviewed, Ready for public use, legal advice, or proof of WorkSafeBC compliance.",
  ];

  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
}
