import {
  getArticleBySlug,
  getWikiQualityMetric,
  glossaryTerms,
  tierOneArticleSlugs,
  wikiArticles,
  wikiRedirects,
  wikiSearchIndex,
} from "../src/wikiContent.js";
import { tierTwoArticleSlugs } from "../src/wikiCompletionData.js";
import { safetyLabData } from "../src/safetyLabData.js";

const errors = [];
const articleMap = new Map(wikiArticles.map((article) => [article.slug, article]));
const talkIds = new Set(safetyLabData.toolboxTalks.map((item) => item.id));
const checklistIds = new Set(safetyLabData.checklists.map((item) => item.id));
const quizIds = new Set(safetyLabData.quizzes.map((item) => item.id));
const formIds = new Set(safetyLabData.forms.map((item) => item.id));
const bannedCopyPatterns = [
  /start with a short pre-job review/i,
  /this topic supports practical jobsite planning/i,
  /use this article as a starting point/i,
  /make sure the work is reviewed before it starts/i,
];

if (wikiRedirects.length < 100) {
  errors.push(`expected at least 100 redirects; found ${wikiRedirects.length}`);
}

if (glossaryTerms.length < 50) {
  errors.push(`expected at least 50 glossary terms; found ${glossaryTerms.length}`);
}

if (wikiSearchIndex.length !== wikiArticles.length) {
  errors.push(`search index count ${wikiSearchIndex.length} does not match article count ${wikiArticles.length}`);
}

for (const redirect of wikiRedirects) {
  if (!articleMap.has(redirect.to)) {
    errors.push(`redirect "${redirect.from}" points to missing article "${redirect.to}"`);
  }
}

for (const term of glossaryTerms) {
  if (!articleMap.has(term.targetArticle)) {
    errors.push(`glossary term "${term.term}" points to missing article "${term.targetArticle}"`);
  }
}

for (const slug of tierOneArticleSlugs) {
  const article = getArticleBySlug(slug);
  const metric = getWikiQualityMetric(slug);
  if (!article) {
    errors.push(`Tier 1 article missing: ${slug}`);
    continue;
  }
  const exactCitationCount = metric?.exactCitationCount ?? exactCitations(article);
  if (exactCitationCount < 8) {
    errors.push(`${slug}: Tier 1 article needs at least 8 exact official citations; found ${exactCitationCount}`);
  }
}

for (const slug of tierTwoArticleSlugs) {
  const article = getArticleBySlug(slug);
  const metric = getWikiQualityMetric(slug);
  if (!article) {
    errors.push(`Tier 2 article missing: ${slug}`);
    continue;
  }
  const exactCitationCount = metric?.exactCitationCount ?? exactCitations(article);
  if (exactCitationCount < 5) {
    errors.push(`${slug}: Tier 2 article needs at least 5 exact official citations; found ${exactCitationCount}`);
  }
}

for (const article of wikiArticles) {
  const allText = [
    article.summary,
    ...(article.summaryParagraphs || []),
    ...Object.values(article.sections || {}).flat(),
  ].join("\n");

  for (const pattern of bannedCopyPatterns) {
    if (pattern.test(allText)) {
      errors.push(`${article.slug}: banned scaffold/robot copy pattern matched "${pattern}"`);
    }
  }

  if (article.maturity === "Ready for public use" && article.sourceReviewFlagCount > 0) {
    errors.push(`${article.slug}: Ready for public use article still has source-review flags`);
  }

  for (const [index, item] of (article.sections?.legalRequirements || []).entries()) {
    if (!item.includes("{{cite:") && !item.includes("{{review:source}}")) {
      errors.push(`${article.slug}: legal requirement ${index + 1} lacks citation or source-review flag`);
    }
  }

  for (const linkedSlug of article.outboundArticleLinks || []) {
    if (!articleMap.has(linkedSlug)) {
      errors.push(`${article.slug}: outbound article link points to missing article "${linkedSlug}"`);
    }
  }

  if (!(article.backlinks || []).length) {
    errors.push(`${article.slug}: article has zero inbound backlinks`);
  }

  if ((article.outboundArticleLinks || []).length < 8) {
    errors.push(`${article.slug}: article has fewer than 8 outbound article links`);
  }

  const relatedToolCount =
    (article.relatedToolboxTalks || []).length +
    (article.relatedChecklists || []).length +
    (article.relatedQuizzes || []).length +
    (article.relatedForms || []).length;
  if (!relatedToolCount) {
    errors.push(`${article.slug}: article has no related field tools`);
  }

  for (const id of article.relatedToolboxTalks || []) {
    if (!talkIds.has(id)) errors.push(`${article.slug}: missing toolbox talk "${id}"`);
  }
  for (const id of article.relatedChecklists || []) {
    if (!checklistIds.has(id)) errors.push(`${article.slug}: missing checklist "${id}"`);
  }
  for (const id of article.relatedQuizzes || []) {
    if (!quizIds.has(id)) errors.push(`${article.slug}: missing quiz "${id}"`);
  }
  for (const id of article.relatedForms || []) {
    if (!formIds.has(id)) errors.push(`${article.slug}: missing form "${id}"`);
  }
}

function exactCitations(article) {
  return (article.citationIds || []).filter((id) => /^ohsr-\d+-/.test(id)).length;
}

if (errors.length) {
  console.error("Wiki quality verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Wiki quality verification passed for ${wikiArticles.length} articles.`);
console.log(`- Redirects: ${wikiRedirects.length}`);
console.log(`- Glossary terms: ${glossaryTerms.length}`);
console.log(`- Search index rows: ${wikiSearchIndex.length}`);
