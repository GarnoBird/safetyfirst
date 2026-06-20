import {
  glossaryTerms,
  maturityLevels,
  tierOneArticleSlugs,
  wikiArticles,
  wikiRedirects,
} from "../src/wikiContent.js";
import { safetyLabData } from "../src/safetyLabData.js";

const errors = [];
const articleMap = new Map(wikiArticles.map((article) => [article.slug, article]));
const talkIds = new Set(safetyLabData.toolboxTalks.map((item) => item.id));
const checklistIds = new Set(safetyLabData.checklists.map((item) => item.id));
const quizIds = new Set(safetyLabData.quizzes.map((item) => item.id));
const formIds = new Set(safetyLabData.forms.map((item) => item.id));

for (const article of wikiArticles) {
  if (!article.reviewTier) {
    errors.push(`${article.slug}: missing review tier`);
  }

  if (!maturityLevels.includes(article.maturity)) {
    errors.push(`${article.slug}: maturity "${article.maturity}" is not valid`);
  }

  if (article.maturity === "Ready for public use" && article.sourceReviewFlagCount > 0) {
    errors.push(`${article.slug}: public-ready article still has source review flags`);
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

for (const slug of tierOneArticleSlugs) {
  const article = articleMap.get(slug);
  if (!article) {
    errors.push(`Tier 1 article missing: ${slug}`);
    continue;
  }

  if (article.reviewTier !== "Tier 1") {
    errors.push(`${slug}: expected Tier 1, found ${article.reviewTier}`);
  }

  const exactCitations = (article.citationIds || []).filter((id) => /^ohsr-\d+-/.test(id));
  if (exactCitations.length < 5) {
    errors.push(`${slug}: expected at least 5 exact OHSR citations; found ${exactCitations.length}`);
  }

  const hasFieldTool =
    (article.relatedToolboxTalks || []).length ||
    (article.relatedChecklists || []).length ||
    (article.relatedQuizzes || []).length ||
    (article.relatedForms || []).length;
  if (!hasFieldTool) {
    errors.push(`${slug}: Tier 1 article needs related field tools`);
  }
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

if (errors.length) {
  console.error("Wiki completion verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Wiki completion verification passed for ${wikiArticles.length} articles.`);
console.log(`- Tier 1 articles: ${tierOneArticleSlugs.length}`);
console.log(`- Redirects: ${wikiRedirects.length}`);
console.log(`- Glossary terms: ${glossaryTerms.length}`);
