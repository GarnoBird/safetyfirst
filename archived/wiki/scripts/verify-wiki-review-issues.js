import { readFileSync } from "node:fs";
import { wikiArticles, wikiReviewIssues } from "../src/wikiContent.js";

const errors = [];
const articleSlugs = new Set(wikiArticles.map((article) => article.slug));
const allIssues = wikiReviewIssues.flatMap((row) => row.issues || []);
const expectedFlags = wikiArticles.reduce((sum, article) => sum + (article.sourceReviewFlagCount || 0), 0);
const expectedArticleChecks = wikiArticles.reduce(
  (sum, article) => sum + ((article.humanReviewQuestions?.length ? article.humanReviewQuestions : article.reviewQuestions || []).length),
  0,
);

function expectedAnchor(issue) {
  if (issue.issueType === "article-check") return `human-review-${issue.articleSlug}-${issue.index}`;
  return `review-issue-${issue.articleSlug}-${issue.section}-${issue.index}`;
}

if (wikiReviewIssues.length !== wikiArticles.length) {
  errors.push(`expected review issue rows for ${wikiArticles.length} articles; found ${wikiReviewIssues.length}`);
}

const claimIssues = allIssues.filter((issue) => issue.issueType === "claim-review");
const articleCheckIssues = allIssues.filter((issue) => issue.issueType === "article-check");

if (claimIssues.length !== expectedFlags) {
  errors.push(`expected ${expectedFlags} claim-review issues from source-review flags; found ${claimIssues.length}`);
}

if (articleCheckIssues.length !== expectedArticleChecks) {
  errors.push(`expected ${expectedArticleChecks} article-check issues from human review questions; found ${articleCheckIssues.length}`);
}

for (const row of wikiReviewIssues) {
  if (!articleSlugs.has(row.slug)) errors.push(`review issue row points to missing article: ${row.slug}`);
  const rowClaimCount = (row.issues || []).filter((issue) => issue.issueType === "claim-review").length;
  const rowArticleCheckCount = (row.issues || []).filter((issue) => issue.issueType === "article-check").length;
  if (row.claimReviewCount !== rowClaimCount) errors.push(`${row.slug}: claimReviewCount mismatch`);
  if (row.articleCheckCount !== rowArticleCheckCount) errors.push(`${row.slug}: articleCheckCount mismatch`);
  for (const issue of row.issues || []) {
    if (!issue.id) errors.push(`${row.slug}: issue is missing id`);
    if (issue.issueType !== "claim-review" && issue.issueType !== "article-check") errors.push(`${row.slug}: issue ${issue.id} has invalid issueType`);
    if (!issue.articleSlug || !articleSlugs.has(issue.articleSlug)) errors.push(`${row.slug}: issue points to missing article`);
    if (!issue.statement || issue.statement.length < 8) errors.push(`${row.slug}: issue ${issue.id} has no exact statement`);
    if (!issue.question || issue.question.length < 8) errors.push(`${row.slug}: issue ${issue.id} has no reviewer question`);
    if (!issue.reason || issue.reason.length < 8) errors.push(`${row.slug}: issue ${issue.id} has no review reason`);
    if (issue.articlePath !== `/wiki/articles/${issue.articleSlug}`) errors.push(`${row.slug}: issue ${issue.id} has invalid articlePath`);
    if (!issue.contextAnchor) errors.push(`${row.slug}: issue ${issue.id} is missing contextAnchor`);
    if (issue.contextAnchor && issue.contextAnchor !== expectedAnchor(issue)) errors.push(`${row.slug}: issue ${issue.id} has mismatched contextAnchor`);
    if (!issue.sectionTitle || issue.sectionTitle.length < 3) errors.push(`${row.slug}: issue ${issue.id} has no sectionTitle`);
    if (!issue.contextText || issue.contextText.length < issue.statement.length) errors.push(`${row.slug}: issue ${issue.id} has no context text`);
    if (issue.statement.includes("{{review:source}}")) errors.push(`${row.slug}: issue ${issue.id} exposes raw review token`);
  }
}

const wikiApp = readFileSync(new URL("../src/WikiApp.jsx", import.meta.url), "utf8");
const bannedActiveRoutes = [
  'normalizedPath === "/wiki/review-center"',
  'normalizedPath === "/wiki/review-console"',
  'normalizedPath === "/wiki/review-intake"',
  'normalizedPath === "/wiki/review-ops"',
  'normalizedPath === "/wiki/review-sprints"',
  'normalizedPath === "/wiki/review-packs"',
  'normalizedPath.startsWith("/wiki/review-packs/")',
];
for (const route of bannedActiveRoutes) {
  if (wikiApp.includes(route)) errors.push(`old review route remains active: ${route}`);
}

const visibleNavBlock = wikiApp.slice(wikiApp.indexOf("const WIKI_NAV_GROUPS"), wikiApp.indexOf("export default function WikiApp"));
for (const label of ["Old review center", "Review console", "Review intake", "Review packs", "Review ops", "Review sprints"]) {
  if (visibleNavBlock.includes(label)) errors.push(`old review label remains in visible nav: ${label}`);
}

if (!wikiApp.includes("wikiReviewIssues")) errors.push("review UI is not wired to wikiReviewIssues");
if (!wikiApp.includes("IssueReviewControl")) errors.push("claim-level IssueReviewControl is missing");
if (!wikiApp.includes("reviewIssueAnchor(article.slug")) errors.push("article renderer is not adding review issue anchors");
if (!wikiApp.includes("humanReviewAnchor(article.slug")) errors.push("article renderer is not adding human review anchors");
if (!wikiApp.includes("Not applicable")) errors.push("article-check Not applicable action is missing");
if (!wikiApp.includes("Show context")) errors.push("review issue context toggle is missing");
if (!wikiApp.includes("Open in article")) errors.push("review issue article deep link is missing");

if (errors.length) {
  console.error("Wiki review issue verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Wiki review issue verification passed.");
console.log(`- Articles: ${wikiReviewIssues.length}`);
console.log(`- Article checks: ${articleCheckIssues.length}`);
console.log(`- Claim review issues: ${claimIssues.length}`);
console.log(`- Review issues: ${allIssues.length}`);
