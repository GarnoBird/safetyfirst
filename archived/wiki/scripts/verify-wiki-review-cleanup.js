import { existsSync, readFileSync } from "node:fs";

const removedFiles = [
  "src/generatedWikiReviewPacks.js",
  "scripts/build-wiki-review-packs.js",
  "scripts/verify-wiki-review-packs.js",
  "scripts/verify-wiki-review-console.js",
  "scripts/verify-wiki-review-workflow.js",
];

const activeFiles = [
  "src/WikiApp.jsx",
  "src/wikiContent.js",
  "package.json",
  "scripts/report-wiki-review.js",
];

const bannedActiveRefs = [
  "generatedWikiReviewPacks",
  "wikiReviewPacks",
  "getWikiReviewPackBySlug",
  "getWikiReviewerQueues",
  "ReviewCenterPage",
  "ReviewConsolePage",
  "ReviewIntakePage",
  "ReviewOperationsPage",
  "ReviewSprintsPage",
  "ReviewPacksPage",
  "ReviewPackPage",
  "ReviewGuidePage",
  "ReviewExamplesPage",
  "ReviewTodayPage",
  "ReviewerPage",
  "ReviewStartPage",
  'normalizedPath === "/wiki/review-center"',
  'normalizedPath === "/wiki/review-console"',
  'normalizedPath === "/wiki/review-intake"',
  'normalizedPath === "/wiki/review-ops"',
  'normalizedPath === "/wiki/review-sprints"',
  'normalizedPath === "/wiki/review-packs"',
  'normalizedPath.startsWith("/wiki/review-packs/")',
];

const requiredSimpleReviewRefs = [
  "SimpleReviewPage",
  "SimpleReviewItemPage",
  "IssueReviewControl",
  "wikiReviewIssues",
  "getWikiReviewIssuesForArticle",
  'normalizedPath === "/wiki/review"',
  'normalizedPath.startsWith("/wiki/review/item/")',
];

const errors = [];

for (const file of removedFiles) {
  if (existsSync(file)) {
    errors.push(`old review maze file still exists: ${file}`);
  }
}

for (const file of activeFiles) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const ref of bannedActiveRefs) {
    if (text.includes(ref)) {
      errors.push(`${file}: old review maze reference remains: ${ref}`);
    }
  }
}

const wikiApp = readFileSync("src/WikiApp.jsx", "utf8");
for (const ref of requiredSimpleReviewRefs) {
  if (!wikiApp.includes(ref)) {
    errors.push(`src/WikiApp.jsx: missing simple claim-level review reference: ${ref}`);
  }
}

if (errors.length) {
  console.error("Wiki review cleanup verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Wiki review cleanup verification passed.");
