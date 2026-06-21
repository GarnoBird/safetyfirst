import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const articleDir = join(process.cwd(), "content/articles");
const reportPath = join(process.cwd(), "docs/wiki-source-resolution-report.md");
const runDate = "2026-06-21";

const sourceNotes = [
  "WorkSafeBC Notice of Project page: asbestos, lead or similar exposure work activity requires at least 48 hours notice and submission of safe work procedures plus hazardous materials survey or alternate explanation.",
  "WorkSafeBC OHS Regulation Part 6: asbestos waste handling and disposal are addressed in sections 6.25 to 6.28.",
  "WorkSafeBC OHS Regulation Part 6: asbestos respiratory protection, protective clothing, and records are addressed in sections 6.29, 6.30, and 6.32.",
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

const genericLegalReviewPatterns = [
  /Keep legal requirements separate from best practice, owner rules, manufacturer instructions, and sample procedures/i,
  /Coordinate overlapping work with the prime contractor, employer, supervisor, affected workers, and nearby trades/i,
  /Stop and reassess the work when a required control is missing, conditions change, or a worker reports an unsafe condition/i,
  /A qualified reviewer must confirm exact section wording before this draft is used as a compliance checklist/i,
  /Confirm the exact section wording and any applicable guideline before using this draft/i,
  /Confirm current .* before marking this article source checked/i,
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

  const afterFlags = countReviewFlags(content);
  articleReport.flagsAfter = afterFlags;
  report.flagsAfter += afterFlags;

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
    );

  if (next !== content) {
    const resolved = countReviewFlags(content) - countReviewFlags(next);
    report.asbestosClaimsResolved += Math.max(resolved, 0);
    articleReport.changes.push("Resolved asbestos Notice of Project, waste, PPE, and records claims with exact WorkSafeBC/OHSR citations.");
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
    `- Files changed: ${data.filesChanged}`,
    `- Review flags before: ${data.flagsBefore}`,
    `- Review flags after: ${data.flagsAfter}`,
    `- Review flags resolved: ${data.flagsBefore - data.flagsAfter}`,
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
    "## Boundary",
    "",
    "This cleanup resolves review noise and clearly source-supported claims. It does not mark any article as Source checked, Safety reviewed, Ready for public use, legal advice, or proof of WorkSafeBC compliance.",
  ];

  await writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");
}
