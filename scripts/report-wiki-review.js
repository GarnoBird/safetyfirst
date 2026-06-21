import { writeFile } from "node:fs/promises";

import { wikiArticles, wikiQualityMetrics, wikiReviewIssues, wikiSimpleReviews, wikiSourceCoverage } from "../src/wikiContent.js";

const reviewPhrase = "Needs verification against current WorkSafeBC/OHS source.";

const issueRows = wikiReviewIssues
  .map((row) => {
    const reviewRecord = normalizeReviewRecord(wikiSimpleReviews[row.slug], row.issues || []);
    const remainingIssues = (row.issues || []).filter((issue) => !isCompleteReviewDecision(reviewRecord.issues?.[issue.id]));
    const status = reviewStatusFromIssueDecisions(row.issues || [], reviewRecord.issues || {});
    return {
      slug: row.slug || row.articleSlug,
      title: row.title || row.articleTitle || row.slug || row.articleSlug,
      tier: row.reviewTier || "Unassigned",
      maturity: row.maturity || "Draft",
      prepStatus: row.prepStatus || "Needs AI prep",
      issueCount: remainingIssues.length,
      articleCheckCount: remainingIssues.filter((issue) => issue.issueType === "article-check").length,
      claimReviewCount: remainingIssues.filter((issue) => issue.issueType === "claim-review").length,
      status,
    };
  })
  .filter((row) => row.issueCount > 0 || row.status === "Reviewed: needs changes")
  .sort((a, b) => b.issueCount - a.issueCount || a.title.localeCompare(b.title));

const issueCount = issueRows.reduce((sum, row) => sum + row.issueCount, 0);
const articleCheckCount = issueRows.reduce((sum, row) => sum + row.articleCheckCount, 0);
const claimReviewCount = issueRows.reduce((sum, row) => sum + row.claimReviewCount, 0);
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
  `- Open whole-article human review checks: ${articleCheckCount}`,
  `- Open claim-level source review issues: ${claimReviewCount}`,
  `- Open review items total: ${issueCount}`,
  `- Source notes: ${wikiSourceCoverage.sourceNoteCount}`,
  `- Articles with source notes: ${wikiSourceCoverage.articlesWithSourceNotes}`,
  `- Articles with unresolved source-review flags: ${wikiSourceCoverage.unresolvedSourceReviewArticles.length}`,
  "",
  "## Review Flow",
  "",
  "- Open `/wiki/review`.",
  "- Pick one article from the list.",
  "- Answer only the article checks or source claims you can answer now.",
  "- Use **Pass** when a whole-article check is acceptable.",
  "- Use **Not applicable** when a whole-article check truly does not apply.",
  "- Use **Yes, keep it** when a source-claim item is acceptable.",
  "- Use **Change wording** or **Needs changes** when the article needs corrected wording.",
  "- Use **Remove item** when a source-claim item should be deleted from the article.",
  "- Save. Completed answers disappear from the page; unfinished issues stay for later.",
  `- ${reviewPhrase}`,
  "",
  "## Articles Needing Review By Tier",
  "",
  ...Object.entries(tierCounts).map(([tier, count]) => `- ${tier}: ${count} articles`),
  "",
  "## Highest Review Issue Counts",
  "",
  ...issueRows.slice(0, 30).map((row) => `- ${row.title}: ${row.articleCheckCount} article check${row.articleCheckCount === 1 ? "" : "s"}; ${row.claimReviewCount} source claim${row.claimReviewCount === 1 ? "" : "s"} (${row.tier}) - /wiki/review/item/${row.slug}`),
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
console.log(`Open article checks: ${articleCheckCount}`);
console.log(`Open claim-level issues: ${claimReviewCount}`);
console.log(`Open review items total: ${issueCount}`);
console.log("Wrote docs/safety-wiki-review-report.md");

function normalizeReviewRecord(record, issues = []) {
  const knownIds = new Set(issues.map((issue) => issue.id));
  const decisions = {};
  for (const [issueId, decision] of Object.entries(record?.issues || {})) {
    const normalized = normalizeReviewDecision(decision);
    if (!knownIds.has(issueId) || !isCompleteReviewDecision(normalized)) continue;
    decisions[issueId] = normalized;
  }
  return { ...record, issues: decisions };
}

function normalizeReviewDecision(decision) {
  if (!decision) return null;
  const answer = normalizeReviewAnswer(decision.answer);
  if (!answer) return null;
  return {
    answer,
    note: answer === "change" || answer === "remove" ? String(decision.note || "").trim() : "",
  };
}

function normalizeReviewAnswer(answer) {
  if (answer === "no") return "change";
  if (answer === "pass") return "yes";
  if (answer === "not-applicable" || answer === "n/a") return "na";
  if (answer === "yes" || answer === "change" || answer === "remove" || answer === "na") return answer;
  return "";
}

function isCompleteReviewDecision(decision) {
  const normalized = normalizeReviewDecision(decision);
  if (!normalized) return false;
  if (normalized.answer === "yes" || normalized.answer === "remove" || normalized.answer === "na") return true;
  return normalized.answer === "change" && normalized.note.length > 0;
}

function reviewStatusFromIssueDecisions(issues = [], decisions = {}) {
  if (!issues.length) return "Reviewed: ready";
  const values = issues.map((issue) => decisions[issue.id]).filter(isCompleteReviewDecision);
  if (!values.length) return "Needs review";
  if (values.length === issues.length && values.every((decision) => ["yes", "na"].includes(normalizeReviewAnswer(decision.answer)))) return "Reviewed: ready";
  if (values.some((decision) => ["change", "remove"].includes(normalizeReviewAnswer(decision.answer)))) return "Reviewed: needs changes";
  return "In progress";
}
