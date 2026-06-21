import { safetyLabData } from "../src/safetyLabData.js";
import { safetyPacks } from "../src/safetyPacks.js";
import {
  getArticleBySlug,
  getArticleDraftBlockers,
  getCitationById,
  getSourceNoteById,
  getWikiReviewPackBySlug,
  tierOneArticleSlugs,
  wikiReviewPacks,
} from "../src/wikiContent.js";

const errors = [];
const expectedSlugs = new Set(tierOneArticleSlugs);
const packSlugs = new Set(wikiReviewPacks.map((pack) => pack.slug));
const talkIds = new Set(safetyLabData.toolboxTalks.map((item) => item.id));
const checklistIds = new Set(safetyLabData.checklists.map((item) => item.id));
const quizIds = new Set(safetyLabData.quizzes.map((item) => item.id));
const formIds = new Set(safetyLabData.forms.map((item) => item.id));
const safetyPackIds = new Set(safetyPacks.map((pack) => pack.id));

if (!wikiReviewPacks.length) {
  errors.push("no wiki review packs were generated");
}

if (wikiReviewPacks.length !== tierOneArticleSlugs.length) {
  errors.push(`expected ${tierOneArticleSlugs.length} Tier 1 review packs; found ${wikiReviewPacks.length}`);
}

for (const slug of tierOneArticleSlugs) {
  if (!packSlugs.has(slug)) errors.push(`Tier 1 article "${slug}" has no review pack`);
}

for (const pack of wikiReviewPacks) {
  const article = getArticleBySlug(pack.slug);
  if (!article) {
    errors.push(`${pack.slug || "unknown"}: review pack references a missing article`);
    continue;
  }

  if (!expectedSlugs.has(pack.slug)) {
    errors.push(`${pack.slug}: review pack is not for a Tier 1 article`);
  }

  if (getWikiReviewPackBySlug(pack.slug) !== pack) {
    errors.push(`${pack.slug}: getWikiReviewPackBySlug does not return this pack`);
  }

  if (!pack.title || !pack.summary || !pack.generatedAt) {
    errors.push(`${pack.slug}: review pack is missing title, summary, or generated date`);
  }

  if (pack.reviewTier !== "Tier 1" || article.reviewTier !== "Tier 1") {
    errors.push(`${pack.slug}: review pack must stay scoped to Tier 1 articles`);
  }

  if (pack.maturity !== "Draft" || article.maturity !== "Draft") {
    errors.push(`${pack.slug}: review pack article is not Draft`);
  }

  if (pack.review?.legalReviewStatus === "Source checked" && (article.sourceReviewFlagCount || 0) > 0) {
    errors.push(`${pack.slug}: legal/source review is Source checked while source-review flags remain`);
  }

  if (pack.review?.safetyReviewStatus === "Safety reviewed" && (article.sourceReviewFlagCount || 0) > 0) {
    errors.push(`${pack.slug}: safety review is Safety reviewed while source-review flags remain`);
  }

  if (!Array.isArray(pack.legalRequirements) || pack.legalRequirements.length < 6) {
    errors.push(`${pack.slug}: review pack needs at least 6 legal requirements`);
  }

  for (const requirement of pack.legalRequirements || []) {
    if (!requirement.text) errors.push(`${pack.slug}: legal requirement ${requirement.index} has no text`);
    if (!requirement.needsSourceReview && !(requirement.citationIds || []).length) {
      errors.push(`${pack.slug}: legal requirement ${requirement.index} lacks a citation or source-review flag`);
    }
  }

  if (!Array.isArray(pack.claimsNeedingReview) || !pack.claimsNeedingReview.length) {
    errors.push(`${pack.slug}: review pack should list claims needing source review while article is Draft`);
  }

  if ((pack.sourceReviewFlagCount || 0) !== (article.sourceReviewFlagCount || 0)) {
    errors.push(`${pack.slug}: source-review flag count does not match article data`);
  }

  if (!Array.isArray(pack.citations) || pack.citations.length < 8) {
    errors.push(`${pack.slug}: review pack needs at least 8 citations`);
  }

  if (!Array.isArray(pack.exactCitationIds) || pack.exactCitationIds.length < 8) {
    errors.push(`${pack.slug}: review pack needs at least 8 exact OHSR citations`);
  }

  for (const citationId of pack.citationIds || []) {
    if (!getCitationById(citationId)) errors.push(`${pack.slug}: citation "${citationId}" is missing`);
  }

  if (!Array.isArray(pack.sourceNotes) || !pack.sourceNotes.length) {
    errors.push(`${pack.slug}: review pack needs linked source notes`);
  }

  for (const sourceNoteId of pack.sourceNoteIds || []) {
    if (!getSourceNoteById(sourceNoteId)) errors.push(`${pack.slug}: source note "${sourceNoteId}" is missing`);
  }

  if (!Array.isArray(pack.reviewChecklist) || pack.reviewChecklist.length < 6) {
    errors.push(`${pack.slug}: review checklist is missing or incomplete`);
  }

  if (!Array.isArray(pack.reviewChecklistTemplates) || pack.reviewChecklistTemplates.length < 4) {
    errors.push(`${pack.slug}: review checklist templates are missing`);
  }

  const expectedBlockers = getArticleDraftBlockers(article);
  if (!Array.isArray(pack.draftBlockers) || !pack.draftBlockers.length) {
    errors.push(`${pack.slug}: draft blockers are missing`);
  }
  for (const blocker of expectedBlockers) {
    if (!pack.draftBlockers.includes(blocker)) {
      errors.push(`${pack.slug}: draft blocker "${blocker}" missing from review pack`);
    }
  }

  if (!Array.isArray(pack.printSections) || pack.printSections.length < 6) {
    errors.push(`${pack.slug}: printable review sections are missing`);
  }

  const relatedTools = pack.relatedTools || {};
  const relatedToolCount =
    (relatedTools.toolboxTalks || []).length +
    (relatedTools.checklists || []).length +
    (relatedTools.quizzes || []).length +
    (relatedTools.forms || []).length;
  if (!relatedToolCount) {
    errors.push(`${pack.slug}: review pack has no related field tools`);
  }

  for (const item of relatedTools.toolboxTalks || []) {
    if (!talkIds.has(item.id)) errors.push(`${pack.slug}: missing toolbox talk "${item.id}"`);
  }
  for (const item of relatedTools.checklists || []) {
    if (!checklistIds.has(item.id)) errors.push(`${pack.slug}: missing checklist "${item.id}"`);
  }
  for (const item of relatedTools.quizzes || []) {
    if (!quizIds.has(item.id)) errors.push(`${pack.slug}: missing quiz "${item.id}"`);
  }
  for (const item of relatedTools.forms || []) {
    if (!formIds.has(item.id)) errors.push(`${pack.slug}: missing form "${item.id}"`);
  }
  for (const item of relatedTools.safetyPacks || []) {
    if (!safetyPackIds.has(item.id)) errors.push(`${pack.slug}: missing safety pack "${item.id}"`);
  }
}

if (errors.length) {
  console.error("Wiki review pack verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Wiki review pack verification passed for ${wikiReviewPacks.length} Tier 1 review packs.`);
