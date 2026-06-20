import { wikiArticles } from "../src/wikiContent.js";

const errors = [];

const requiredCounts = {
  summaryParagraphs: [2, 4],
  whenApplies: [5, 8],
  legalRequirements: [6, 10],
  requiredDocuments: [4, 8],
  procedure: [8, 12],
  workerChecklist: [8, 12],
  supervisorChecklist: [8, 12],
  commonMistakes: [6, 10],
  related: [10, 18],
};

for (const article of wikiArticles) {
  checkCount(article, "summaryParagraphs", article.summaryParagraphs || []);
  checkCount(article, "whenApplies", article.sections?.whenApplies || []);
  checkCount(article, "legalRequirements", article.sections?.legalRequirements || []);
  checkCount(article, "requiredDocuments", article.sections?.requiredDocuments || []);
  checkCount(article, "procedure", article.sections?.procedure || []);
  checkCount(article, "workerChecklist", article.sections?.workerChecklist || []);
  checkCount(article, "supervisorChecklist", article.sections?.supervisorChecklist || []);
  checkCount(article, "commonMistakes", article.sections?.commonMistakes || []);
  checkCount(article, "related", article.related || []);

  const citationIds = article.citationIds || [];
  if (citationIds.length < 3) {
    errors.push(`${article.slug}: expected at least 3 official source citations; found ${citationIds.length}`);
  }

  for (const [index, item] of (article.sections?.legalRequirements || []).entries()) {
    if (!item.includes("{{cite:") && !item.includes("{{review:source}}")) {
      errors.push(`${article.slug}: legal requirement ${index + 1} lacks citation or source-review flag`);
    }
  }
}

function checkCount(article, key, value) {
  const [min, max] = requiredCounts[key];
  if (value.length < min || value.length > max) {
    errors.push(`${article.slug}: ${key} count must be ${min}-${max}; found ${value.length}`);
  }
}

if (errors.length) {
  console.error("Wiki depth verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Wiki depth verification passed for ${wikiArticles.length} articles.`);
