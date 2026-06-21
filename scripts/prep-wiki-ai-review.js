import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tierOneArticleSlugs, tierTwoArticleSlugs } from "../src/wikiCompletionData.js";

const articleDir = join(process.cwd(), "content/articles");
const prepDate = "2026-06-20";
const tierOne = new Set(tierOneArticleSlugs);
const tierTwo = new Set(tierTwoArticleSlugs);

const prepNotes = [
  "Codex organized this article for human source and field review; this is not legal or safety approval.",
  "Unresolved source-review flags identify claims a qualified reviewer must confirm before maturity changes.",
  "Article remains Draft until qualified source/legal and field safety review are complete.",
];

const reviewQuestions = [
  "Legal/source: Do all Legal requirements accurately paraphrase current official BC sources, and are any best-practice statements incorrectly framed as law?",
  "Field safety: Would the procedure and checklists be safe and practical for the trades and tasks listed on a BC construction site?",
  "Plain-language/copyright: Is the wording original, worker-readable, and free of copied manual or proprietary text?",
];

const sectionQuestions = {
  summary:
    "Reviewer question: confirm this summary is accurate, current, and does not overstate legal certainty.",
  legalRequirements:
    "Reviewer question: confirm this belongs in Legal requirements and is supported by current official BC source material.",
  bestPractice:
    "Reviewer question: confirm this is best practice rather than a legal requirement, unless an official source says otherwise.",
  requiredDocuments:
    "Reviewer question: confirm when this document is legally required, when it is only recommended, and which source supports that distinction.",
  procedure:
    "Reviewer question: confirm this procedural step is practical for BC construction work and does not create an unsafe shortcut.",
  workerChecklist:
    "Reviewer question: confirm this worker checklist item is clear, realistic, and does not imply worker authority beyond the regulation or site role.",
  supervisorChecklist:
    "Reviewer question: confirm this supervisor checklist item matches BC supervisory duties and site practice.",
  commonMistakes:
    "Reviewer question: confirm this common mistake is accurate and not overstated.",
  reviewerNotes:
    "Reviewer task: confirm remaining article-level source-review flags before changing maturity.",
};

const sectionByHeading = new Map([
  ["summary", "summary"],
  ["legal requirements", "legalRequirements"],
  ["best practice", "bestPractice"],
  ["required documents", "requiredDocuments"],
  ["step-by-step safe procedure", "procedure"],
  ["worker checklist", "workerChecklist"],
  ["supervisor checklist", "supervisorChecklist"],
  ["common mistakes", "commonMistakes"],
  ["reviewer notes", "reviewerNotes"],
]);

const vagueReviewPatterns = [
  /confirm the exact section wording/i,
  /current legal wording/i,
  /current worksafebc .* requirements/i,
  /with current worksafebc/i,
  /before public-ready maturity/i,
  /before source-checked maturity/i,
  /source checked before/i,
  /source review is still required/i,
  /checked before changing maturity/i,
];

function slugFromContent(content, filename) {
  const match = content.match(/^slug:\s*"?([^"\n]+)"?/m);
  return match?.[1]?.trim() || filename.replace(/\.md$/, "");
}

function splitFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return ["", content];
  return [match[1], content.slice(match[0].length)];
}

function setScalar(frontmatter, key, value) {
  const line = `${key}: "${value}"`;
  const pattern = new RegExp(`^${key}:.*$`, "m");
  if (pattern.test(frontmatter)) return frontmatter.replace(pattern, line);
  return `${frontmatter.trimEnd()}\n${line}`;
}

function setList(frontmatter, key, values) {
  const block = `${key}:\n${values.map((value) => `  - "${escapeYaml(value)}"`).join("\n")}`;
  const pattern = new RegExp(`^${key}:\\n(?:\\s+-.*\\n?)*`, "m");
  if (pattern.test(frontmatter)) return frontmatter.replace(pattern, `${block}\n`);
  return `${frontmatter.trimEnd()}\n${block}`;
}

function escapeYaml(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function headingForLine(line) {
  const match = line.match(/^##\s+(.+)$/);
  if (!match) return null;
  return sectionByHeading.get(match[1].trim().toLowerCase()) || null;
}

function sourceReviewQuestionFor(sectionKey, line) {
  if (/Reviewer question:|Reviewer task:/.test(line)) return line;
  const question = sectionQuestions[sectionKey] || sectionQuestions.summary;
  return line.replace(/\s*\{\{review:source\}\}/g, ` ${question} {{review:source}}`);
}

function replaceVagueSourceReviewLine(sectionKey, line) {
  const prefix = line.match(/^(\s*(?:-\s+(?:\[[ xX]\]\s+)?|\d+\.\s+)?)/)?.[1] || "";
  const question = sectionQuestions[sectionKey] || sectionQuestions.summary;
  if (sectionKey === "reviewerNotes") {
    return `${prefix}Source/legal reviewer must verify all cited legal claims, source notes, and unresolved source-review flags before changing article maturity. ${question} {{review:source}}`;
  }
  const withoutToken = line.replace(/\s*\{\{review:source\}\}/g, "").trim();
  const withoutPrefix = withoutToken.replace(/^(\s*(?:-\s+(?:\[[ xX]\]\s+)?|\d+\.\s+)?)/, "");
  const cleaned = withoutPrefix
    .replace(/\bwith current WorkSafeBC and environmental sources before publication\b/gi, "")
    .replace(/\bCurrent WorkSafeBC ([^.]+?) requirements are checked before source-checked maturity is assigned\b/gi, "$1 requirements need official-source confirmation")
    .replace(/\bsource checked before public-ready maturity is assigned\b/gi, "confirmed before maturity changes")
    .replace(/\bbefore public-ready maturity\b/gi, "before maturity changes")
    .replace(/\bbefore source-checked maturity is assigned\b/gi, "before maturity changes")
    .replace(/\bcurrent legal wording has been checked before calling the plan source checked\b/gi, "legal wording needs official-source confirmation before maturity changes")
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
  const sentence = cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "This unresolved claim needs source confirmation.";
  return `${prefix}${sentence} ${question} {{review:source}}`;
}

function clarifySourceReviewFlags(body) {
  const lines = body.split("\n");
  let sectionKey = "summary";
  return lines
    .map((line) => {
      const headingKey = headingForLine(line);
      if (headingKey) sectionKey = headingKey;
      if (!line.includes("{{review:source}}")) return line;

      const hasVagueWording = vagueReviewPatterns.some((pattern) => pattern.test(line));
      if (hasVagueWording) return replaceVagueSourceReviewLine(sectionKey, line);
      if (!hasVagueWording && /Reviewer question:|Reviewer task:/.test(line)) return line;
      return sourceReviewQuestionFor(sectionKey, line);
    })
    .join("\n");
}

function insertReviewQuestionsSection(body) {
  const heading = "## What a human reviewer must verify";
  const section = `${heading}\n\n${reviewQuestions.map((item) => `- ${item}`).join("\n")}\n`;
  if (body.includes(heading)) {
    return body.replace(
      /## What a human reviewer must verify\n[\s\S]*?(?=\n##\s+|$)/,
      section.trimEnd(),
    );
  }

  const reviewerIndex = body.indexOf("\n## Reviewer notes");
  if (reviewerIndex >= 0) {
    return `${body.slice(0, reviewerIndex).trimEnd()}\n\n${section}\n${body.slice(reviewerIndex + 1)}`;
  }

  return `${body.trimEnd()}\n\n${section}`;
}

function tierForSlug(slug) {
  if (tierOne.has(slug)) return "Tier 1";
  if (tierTwo.has(slug)) return "Tier 2";
  return "Tier 3";
}

function prepStatusForSlug(slug) {
  return tierForSlug(slug) === "Tier 3" ? "AI source-prepped" : "Needs human source review";
}

const entries = await readdir(articleDir, { withFileTypes: true });
let updated = 0;

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name.toLowerCase() === "readme.md") continue;

  const path = join(articleDir, entry.name);
  const original = await readFile(path, "utf8");
  const [rawFrontmatter, rawBody] = splitFrontmatter(original);
  if (!rawFrontmatter) continue;

  const slug = slugFromContent(rawFrontmatter, entry.name);
  let frontmatter = rawFrontmatter;
  frontmatter = setScalar(frontmatter, "maturity", "Draft");
  frontmatter = setScalar(frontmatter, "prepStatus", prepStatusForSlug(slug));
  frontmatter = setScalar(frontmatter, "prepReviewedDate", prepDate);
  frontmatter = setScalar(frontmatter, "prepReviewTier", tierForSlug(slug));
  frontmatter = setList(frontmatter, "prepNotes", prepNotes);
  frontmatter = setList(frontmatter, "reviewQuestions", reviewQuestions);

  const body = insertReviewQuestionsSection(clarifySourceReviewFlags(rawBody));
  const next = `---\n${frontmatter.trimEnd()}\n---\n\n${body.trimStart()}`;

  if (next !== original) {
    await writeFile(path, next);
    updated += 1;
  }
}

console.log(`AI-prepped ${updated} wiki article files.`);
