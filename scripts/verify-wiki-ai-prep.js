import { wikiArticles } from "../src/wikiContent.js";

const errors = [];
const allowedPrepStatuses = new Set([
  "AI source-prepped",
  "Needs human source review",
  "Needs field safety review",
]);
const bannedGenericFlagPatterns = [
  /source review is still required before changing maturity/i,
  /before source-checked maturity is assigned\.\s*\{\{review:source\}\}/i,
  /before public-ready maturity\.\s*\{\{review:source\}\}/i,
  /current legal wording has been checked before/i,
];

for (const article of wikiArticles) {
  if (article.maturity !== "Draft") {
    errors.push(`${article.slug}: AI-prepped article must remain Draft; found ${article.maturity}`);
  }

  if (!allowedPrepStatuses.has(article.prepStatus)) {
    errors.push(`${article.slug}: invalid or missing prepStatus "${article.prepStatus || ""}"`);
  }

  if (!article.prepReviewedDate) {
    errors.push(`${article.slug}: missing prepReviewedDate`);
  }

  if (!Array.isArray(article.prepNotes) || article.prepNotes.length < 3) {
    errors.push(`${article.slug}: missing prepNotes`);
  }

  if (!Array.isArray(article.reviewQuestions) || article.reviewQuestions.length < 3) {
    errors.push(`${article.slug}: missing reviewQuestions frontmatter`);
  }

  if (!Array.isArray(article.humanReviewQuestions) || article.humanReviewQuestions.length < 3) {
    errors.push(`${article.slug}: missing "What a human reviewer must verify" section`);
  }

  const allSectionLines = [
    ...Object.values(article.sections || {}).flat(),
    ...(article.summaryParagraphs || []),
    ...(article.reviewerNotes || []),
  ];

  for (const [index, line] of allSectionLines.entries()) {
    if (!line.includes("{{review:source}}")) continue;
    if (!/Reviewer question:|Reviewer task:/.test(line)) {
      errors.push(`${article.slug}: source-review flag ${index + 1} does not explain the reviewer task`);
    }
    for (const pattern of bannedGenericFlagPatterns) {
      if (pattern.test(line)) {
        errors.push(`${article.slug}: source-review flag ${index + 1} still has generic review wording`);
      }
    }
  }

  for (const [index, item] of (article.sections?.legalRequirements || []).entries()) {
    if (!item.includes("{{cite:") && !item.includes("{{review:source}}")) {
      errors.push(`${article.slug}: legal requirement ${index + 1} lacks citation or source-review flag`);
    }
  }

  if (["Source checked", "Safety reviewed", "Ready for public use"].includes(article.maturity)) {
    errors.push(`${article.slug}: AI prep must not assign final maturity status`);
  }
}

if (errors.length) {
  console.error("Wiki AI prep verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const counts = wikiArticles.reduce((acc, article) => {
  acc[article.prepStatus] = (acc[article.prepStatus] || 0) + 1;
  return acc;
}, {});

console.log(`Wiki AI prep verification passed for ${wikiArticles.length} articles.`);
for (const [status, count] of Object.entries(counts)) {
  console.log(`- ${status}: ${count}`);
}
