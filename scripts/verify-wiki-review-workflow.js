import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  getArticleReviewChecklist,
  getWikiReviewerQueues,
  reviewChecklistTemplates,
  reviewQueueDefinitions,
  tierOneArticleSlugs,
  wikiArticles,
  wikiSourceNotes,
} from "../src/wikiContent.js";

const errors = [];
const reviewTemplateDir = join(process.cwd(), "content/review-templates");
const reviewTemplateFiles = await readdir(reviewTemplateDir).catch(() => []);
const articleMap = new Map(wikiArticles.map((article) => [article.slug, article]));
const sourceNoteIds = new Set(wikiSourceNotes.map((note) => note.id));
const queues = getWikiReviewerQueues();

if (reviewChecklistTemplates.length < 4) {
  errors.push(`expected at least 4 review checklist templates; found ${reviewChecklistTemplates.length}`);
}

if (reviewTemplateFiles.filter((file) => file.endsWith(".md")).length < 4) {
  errors.push("expected at least 4 Markdown review templates in content/review-templates");
}

for (const template of reviewChecklistTemplates) {
  if (!template.id || !template.title || !template.audience || !template.items?.length) {
    errors.push(`review checklist template "${template.id || template.title || "unknown"}" is incomplete`);
  }
}

for (const queue of reviewQueueDefinitions) {
  if (!queues[queue.id]) errors.push(`review queue "${queue.id}" is missing from getWikiReviewerQueues()`);
}

if ((queues["tier-1-source-review"] || []).length !== tierOneArticleSlugs.length) {
  errors.push(
    `Tier 1 review queue has ${(queues["tier-1-source-review"] || []).length} articles; expected ${tierOneArticleSlugs.length}`,
  );
}

if (!(queues["ready-for-human-review"] || []).length) {
  errors.push("ready-for-human-review queue is empty; expected draft articles ready for human review");
}

for (const article of wikiArticles) {
  const promoted = ["Source checked", "Safety reviewed", "Ready for public use"].includes(article.maturity);
  if (promoted && (article.sourceReviewFlagCount || 0) > 0) {
    errors.push(`${article.slug}: promoted maturity "${article.maturity}" still has source-review flags`);
  }

  if (article.maturity === "Source checked" && article.review?.legalReviewStatus !== "Source checked") {
    errors.push(`${article.slug}: Source checked maturity does not match legal/source review status`);
  }

  if (article.maturity === "Safety reviewed" && article.review?.safetyReviewStatus !== "Safety reviewed") {
    errors.push(`${article.slug}: Safety reviewed maturity does not match safety review status`);
  }

  if (article.reviewTier === "Tier 1") {
    const exactCitations = (article.citationIds || []).filter((id) => /^ohsr-\d+-/.test(id)).length;
    if (exactCitations < 8) {
      errors.push(`${article.slug}: Tier 1 article has ${exactCitations} exact citations; expected at least 8`);
    }
    if ((article.reviewerNotes || []).length < 3) {
      errors.push(`${article.slug}: Tier 1 article needs reviewer notes metadata`);
    }
  }

  const checklist = getArticleReviewChecklist(article);
  for (const expected of [
    "legal-citations",
    "source-notes",
    "plain-language",
    "related-links",
    "field-tools",
    "unresolved-flags",
  ]) {
    if (!checklist.some((item) => item.id === expected)) {
      errors.push(`${article.slug}: review checklist missing "${expected}"`);
    }
  }

  for (const id of article.sourceNoteIds || []) {
    if (!sourceNoteIds.has(id)) errors.push(`${article.slug}: source note "${id}" is missing`);
  }
}

if (errors.length) {
  console.error("Wiki review workflow verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Wiki review workflow verification passed.");
console.log(`- Review templates: ${reviewChecklistTemplates.length}`);
console.log(`- Tier 1 queue: ${(queues["tier-1-source-review"] || []).length}`);
console.log(`- Ready for human review: ${(queues["ready-for-human-review"] || []).length}`);
