import { writeFile } from "node:fs/promises";

import { wikiArticles, wikiQualityMetrics, wikiReviewIssues, wikiSourceCoverage } from "../src/wikiContent.js";

const reviewPhrase = "Needs verification against current WorkSafeBC/OHS source.";

const issueRows = wikiReviewIssues
  .map((row) => ({
    slug: row.slug || row.articleSlug,
    title: row.title || row.articleTitle || row.slug || row.articleSlug,
    tier: row.reviewTier || "Unassigned",
    maturity: row.maturity || "Draft",
    prepStatus: row.prepStatus || "Needs AI prep",
    issueCount: row.issues?.length || 0,
  }))
  .filter((row) => row.issueCount > 0)
  .sort((a, b) => b.issueCount - a.issueCount || a.title.localeCompare(b.title));

const issueCount = issueRows.reduce((sum, row) => sum + row.issueCount, 0);
const tierCounts = issueRows.reduce((counts, row) => {
  counts[row.tier] = (counts[row.tier] || 0) + 1;
  return counts;
}, {});
const qualityRows = [...wikiQualityMetrics]
  .filter((metric) => metric.issues?.length)
  .sort((a, b) => b.issues.length - a.issues.length || a.title.localeCompare(b.title))
  .slice(0, 20);
const mostSourceFlags = [...wikiArticles]
  .filter((article) => (article.sourceReviewFlagCount || 0) > 0)
  .sort((a, b) => b.sourceReviewFlagCount - a.sourceReviewFlagCount || a.title.localeCompare(b.title))
  .slice(0, 25);

const lines = [
  "# Safety Wiki Review Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Summary",
  "",
  `- Articles: ${wikiArticles.length}`,
  `- Articles with unresolved review issues: ${issueRows.length}`,
  `- Unresolved claim-level review issues: ${issueCount}`,
  `- Source notes: ${wikiSourceCoverage.sourceNoteCount}`,
  `- Articles with source notes: ${wikiSourceCoverage.articlesWithSourceNotes}`,
  `- Articles with unresolved source-review flags: ${wikiSourceCoverage.unresolvedSourceReviewArticles.length}`,
  "",
  "## Review Flow",
  "",
  "- Open `/wiki/review`.",
  "- Pick one article from the list.",
  "- Answer only the issues you can answer now.",
  "- Use **Yes, keep it** when the claim is acceptable.",
  "- Use **Change wording** when the article needs corrected wording.",
  "- Use **Remove item** when the issue text should be deleted from the article.",
  "- Save. Completed answers disappear from the page; unfinished issues stay for later.",
  `- ${reviewPhrase}`,
  "",
  "## Articles Needing Review By Tier",
  "",
  ...Object.entries(tierCounts).map(([tier, count]) => `- ${tier}: ${count} articles`),
  "",
  "## Highest Review Issue Counts",
  "",
  ...issueRows.slice(0, 30).map((row) => `- ${row.title}: ${row.issueCount} issues (${row.tier}) - /wiki/review/item/${row.slug}`),
  "",
  "## Highest Source-Review Flag Counts",
  "",
  ...mostSourceFlags.map(
    (article) =>
      `- ${article.title}: ${article.sourceReviewFlagCount || 0} flags - /wiki/review/item/${article.slug}`,
  ),
  "",
  "## Quality Follow-Up",
  "",
  ...(qualityRows.length
    ? qualityRows.map((metric) => `- ${metric.title}: ${metric.issues.join("; ")}`)
    : ["- No generated quality issues reported."]),
  "",
  "## Boundary",
  "",
  "This report is a review queue summary. It is not legal approval, source approval, safety approval, or a statement that any article is compliant or complete.",
  reviewPhrase,
];

await writeFile("docs/safety-wiki-review-report.md", `${lines.join("\n")}\n`, "utf8");

console.log("BC Construction Safety Wiki review report");
console.log("===========================================");
console.log(`Articles: ${wikiArticles.length}`);
console.log(`Articles needing review: ${issueRows.length}`);
console.log(`Unresolved claim-level issues: ${issueCount}`);
console.log("Wrote docs/safety-wiki-review-report.md");
