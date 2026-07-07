import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getCitationById,
  getSourceNotesForArticle,
  wikiArticles,
} from "../src/wikiContent.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(root, "src/generatedWikiReviewIssues.js");

function citationTokens(value) {
  return [...String(value || "").matchAll(/\{\{cite:([^}]+)\}\}/g)].map((match) => match[1].trim());
}

function stripReviewMarkup(value) {
  return String(value || "")
    .replace(/\{\{review:[^}]+\}\}/g, "")
    .replace(/\{\{cite:([^}]+)\}\}/g, "[$1]")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const sectionTitles = {
  summary: "Summary",
  whenApplies: "When this applies",
  legalRequirements: "Legal requirements",
  bestPractice: "Best practice",
  requiredDocuments: "Required documents",
  procedure: "Step-by-step safe procedure",
  workerChecklist: "Worker checklist",
  supervisorChecklist: "Supervisor checklist",
  commonMistakes: "Common mistakes",
  reviewerNotes: "Reviewer notes",
  humanReview: "Human review",
};

function reviewIssueAnchor(articleSlug, section, index) {
  return `review-issue-${articleSlug}-${section}-${index}`;
}

function humanReviewAnchor(articleSlug, index) {
  return `human-review-${articleSlug}-${index}`;
}

function splitReviewerQuestion(value, section) {
  const text = String(value || "");
  const match = text.match(/Reviewer (?:question|task):\s*([^{}]+?)(?:\s*\{\{review:source\}\}|$)/i);
  if (match?.[1]) return match[1].trim();
  if (section === "legalRequirements") return "Is this correctly stated as a legal requirement and supported by the cited official source?";
  if (section === "summary") return "Is this summary statement correct and not overstated?";
  return "Is this statement correct for BC construction safety?";
}

function issueReason(value, citationIds) {
  if (!citationIds.length) return "AI could not tie this claim to an exact official citation with enough confidence.";
  if (/Legal requirements/i.test(value)) return "AI needs a qualified reviewer to confirm this belongs in Legal requirements.";
  return "AI found a source-review flag and needs a human to confirm the wording is safe and accurate.";
}

function compactCitations(citationIds) {
  return citationIds
    .map((id) => getCitationById(id))
    .filter(Boolean)
    .map((citation) => ({
      id: citation.id,
      title: citation.title,
      publisher: citation.publisher,
      locator: citation.locator,
      url: citation.url,
    }));
}

function sourceReviewIssuesForArticle(article) {
  const issues = [];
  const sourceNotes = getSourceNotesForArticle(article.slug).map((note) => ({
    id: note.id,
    title: note.title,
    publisher: note.publisher,
    url: note.url,
    lastChecked: note.lastChecked,
  }));

  const addIssue = ({ section, index, text, items }) => {
    if (!String(text).includes("{{review:source}}")) return;
    const citationIds = citationTokens(text);
    const currentText = stripReviewMarkup(text.replace(/Reviewer (?:question|task):[^{}]+/i, ""));
    const beforeText = index > 1 ? stripReviewMarkup(items[index - 2]) : "";
    const afterText = index < items.length ? stripReviewMarkup(items[index]) : "";
    const sectionTitle = sectionTitles[section] || section;
    issues.push({
      id: `${article.slug}:${section}:${index}`,
      issueType: "claim-review",
      articleSlug: article.slug,
      articleTitle: article.title,
      articlePath: `/wiki/articles/${article.slug}`,
      reviewTier: article.reviewTier,
      section,
      sectionTitle,
      index,
      contextAnchor: reviewIssueAnchor(article.slug, section, index),
      statement: currentText,
      originalText: text,
      beforeText,
      afterText,
      contextText: [beforeText, currentText, afterText].filter(Boolean).join(" "),
      question: splitReviewerQuestion(text, section),
      reason: issueReason(text, citationIds),
      citationIds,
      citations: compactCitations(citationIds),
      sourceNotes,
    });
  };

  for (const [section, items] of Object.entries(article.sections || {})) {
    (items || []).forEach((text, index) => addIssue({ section, index: index + 1, text, items }));
  }
  (article.summaryParagraphs || []).forEach((text, index, items) => addIssue({ section: "summary", index: index + 1, text, items }));
  (article.reviewerNotes || []).forEach((text, index, items) => addIssue({ section: "reviewerNotes", index: index + 1, text, items }));
  return issues;
}

function humanReviewIssuesForArticle(article) {
  const questions = article.humanReviewQuestions?.length ? article.humanReviewQuestions : article.reviewQuestions || [];
  return questions.map((text, index) => {
    const issueIndex = index + 1;
    const statement = humanReviewStatement(text, issueIndex);
    const beforeText = index > 0 ? stripReviewMarkup(questions[index - 1]) : "";
    const afterText = index < questions.length - 1 ? stripReviewMarkup(questions[index + 1]) : "";
    return {
      id: `${article.slug}:humanReview:${issueIndex}`,
      issueType: "article-check",
      articleSlug: article.slug,
      articleTitle: article.title,
      articlePath: `/wiki/articles/${article.slug}`,
      reviewTier: article.reviewTier,
      section: "humanReview",
      sectionTitle: "Human review",
      index: issueIndex,
      contextAnchor: humanReviewAnchor(article.slug, issueIndex),
      statement,
      originalText: text,
      beforeText,
      afterText,
      contextText: [beforeText, stripReviewMarkup(text), afterText].filter(Boolean).join(" "),
      question: humanReviewQuestionBody(text, issueIndex),
      reason: "This whole-article check must be completed by a human reviewer before the article is locally marked ready.",
      citationIds: [],
      citations: [],
      sourceNotes: getSourceNotesForArticle(article.slug).map((note) => ({
        id: note.id,
        title: note.title,
        publisher: note.publisher,
        url: note.url,
        lastChecked: note.lastChecked,
      })),
    };
  });
}

function humanReviewStatement(text, index) {
  const label = String(text || "").split(":")[0]?.trim();
  if (label && label.length <= 40 && label !== String(text || "").trim()) return label;
  if (index === 1) return "Legal/source review";
  if (index === 2) return "Field safety review";
  if (index === 3) return "Plain-language/copyright review";
  return `Human review check ${index}`;
}

function humanReviewQuestionBody(text, index) {
  const raw = stripReviewMarkup(text);
  const label = humanReviewStatement(text, index);
  const prefix = `${label}:`;
  if (raw.toLowerCase().startsWith(prefix.toLowerCase())) return raw.slice(prefix.length).trim();
  return raw;
}

const articles = wikiArticles.map((article) => {
  const issues = [...humanReviewIssuesForArticle(article), ...sourceReviewIssuesForArticle(article)];
  const articleCheckCount = issues.filter((issue) => issue.issueType === "article-check").length;
  const claimReviewCount = issues.filter((issue) => issue.issueType === "claim-review").length;
  return {
    slug: article.slug,
    title: article.title,
    reviewTier: article.reviewTier,
    maturity: article.maturity,
    prepStatus: article.prepStatus || "Needs AI prep",
    issueCount: issues.length,
    articleCheckCount,
    claimReviewCount,
    issues,
  };
});

const output = `// Generated by scripts/build-wiki-review-issues.js. Do not edit by hand.\nexport const generatedWikiReviewIssues = ${JSON.stringify(articles, null, 2)};\n`;

await writeFile(outputPath, output);
console.log(`Built review issues for ${articles.length} articles.`);
