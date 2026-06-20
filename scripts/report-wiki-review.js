import {
  getWikiReviewBacklog,
  wikiArticles,
  wikiQualityMetrics,
  wikiSourceCoverage,
} from "../src/wikiContent.js";

const backlog = getWikiReviewBacklog();
const issueMetrics = [...wikiQualityMetrics]
  .filter((metric) => metric.issues?.length)
  .sort((a, b) => b.issues.length - a.issues.length || a.title.localeCompare(b.title));
const mostSourceFlags = [...wikiArticles]
  .filter((article) => (article.sourceReviewFlagCount || 0) > 0)
  .sort((a, b) => b.sourceReviewFlagCount - a.sourceReviewFlagCount || a.title.localeCompare(b.title))
  .slice(0, 15);
const oldest = backlog.oldestReview.slice(0, 15);

console.log("BC Construction Safety Wiki review report");
console.log("===========================================");
console.log(`Articles: ${wikiArticles.length}`);
console.log(`Source notes: ${wikiSourceCoverage.sourceNoteCount}`);
console.log(`Articles with source notes: ${wikiSourceCoverage.articlesWithSourceNotes}`);
console.log(`Unresolved source-review articles: ${wikiSourceCoverage.unresolvedSourceReviewArticles.length}`);
console.log(`Weak Tier 1 citation coverage: ${wikiSourceCoverage.weakTierOne.length}`);
console.log(`Weak Tier 2 citation coverage: ${wikiSourceCoverage.weakTierTwo.length}`);
console.log("");

printSection(
  "Highest source-review flag counts",
  mostSourceFlags.map((article) => `${article.slug}: ${article.sourceReviewFlagCount} flags`),
);

printSection(
  "Quality issues",
  issueMetrics.slice(0, 20).map((metric) => `${metric.slug}: ${metric.issues.join("; ")}`),
);

printSection(
  "Oldest review dates",
  oldest.map((article) => `${article.slug}: last reviewed ${article.review?.lastReviewed || "unknown"}`),
);

function printSection(title, rows) {
  console.log(title);
  console.log("-".repeat(title.length));
  if (!rows.length) {
    console.log("None");
  } else {
    for (const row of rows) console.log(`- ${row}`);
  }
  console.log("");
}
