import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { safetyLabData } from "../src/safetyLabData.js";
import { safetyPacks } from "../src/safetyPacks.js";
import {
  getArticleBySlug,
  getArticleDraftBlockers,
  getArticleReviewChecklist,
  getCitationById,
  getSourceNotesForArticle,
  getWikiQualityMetric,
  reviewChecklistTemplates,
  tierOneArticleSlugs,
} from "../src/wikiContent.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(root, "src/generatedWikiReviewPacks.js");

function compactResource(items, ids) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((item) => ({
      id: item.id,
      title: item.title || item.topic || item.name || item.id,
      topic: item.topic || "",
      sourceNote: item.sourceNote || item.reviewNote || "",
    }));
}

function citationTokens(value) {
  return [...String(value || "").matchAll(/\{\{cite:([^}]+)\}\}/g)].map((match) => match[1].trim());
}

function sourceReviewClaims(article) {
  const claims = [];
  for (const [sectionName, items] of Object.entries(article.sections || {})) {
    for (const [index, text] of (items || []).entries()) {
      if (!String(text).includes("{{review:source}}")) continue;
      claims.push({
        id: `${sectionName}-${index + 1}`,
        section: sectionName,
        index: index + 1,
        text,
        citationIds: citationTokens(text),
        needsSourceReview: true,
      });
    }
  }
  for (const [index, text] of (article.summaryParagraphs || []).entries()) {
    if (!String(text).includes("{{review:source}}")) continue;
    claims.push({
      id: `summary-${index + 1}`,
      section: "summary",
      index: index + 1,
      text,
      citationIds: citationTokens(text),
      needsSourceReview: true,
    });
  }
  return claims;
}

function reviewPackForArticle(slug) {
  const article = getArticleBySlug(slug);
  if (!article) throw new Error(`Missing article for review pack: ${slug}`);

  const qualityMetric = getWikiQualityMetric(slug);
  const sourceNotes = getSourceNotesForArticle(slug).map((note) => ({
    id: note.id,
    title: note.title,
    publisher: note.publisher,
    sourceType: note.sourceType,
    lastChecked: note.lastChecked,
    url: note.url,
  }));
  const citations = (article.citationIds || [])
    .map((id) => getCitationById(id))
    .filter(Boolean)
    .map((citation) => ({
      id: citation.id,
      title: citation.title,
      publisher: citation.publisher,
      locator: citation.locator,
      url: citation.url,
      kind: citation.kind,
    }));
  const legalRequirements = (article.sections?.legalRequirements || []).map((text, index) => ({
    index: index + 1,
    text,
    citationIds: citationTokens(text),
    needsSourceReview: text.includes("{{review:source}}"),
  }));
  const claimsNeedingReview = sourceReviewClaims(article);
  const matchingSafetyPacks = safetyPacks
    .filter((pack) => (pack.wikiSlugs || []).includes(slug))
    .map((pack) => ({
      id: pack.id,
      title: pack.title,
      scenario: pack.scenario,
      reviewNotice: pack.reviewNotice,
    }));

  return {
    slug,
    title: article.title,
    generatedAt: "2026-06-20",
    reviewTier: article.reviewTier,
    maturity: article.maturity,
    review: article.review,
    articleStatus: article.status,
    summary: article.summary,
    sourceReviewFlagCount: article.sourceReviewFlagCount || 0,
    draftBlockers: getArticleDraftBlockers(article),
    reviewerNotes: article.reviewerNotes || [],
    reviewChecklist: getArticleReviewChecklist(article),
    reviewChecklistTemplates: reviewChecklistTemplates.map((template) => ({
      id: template.id,
      title: template.title,
      audience: template.audience,
      items: template.items,
    })),
    qualityMetric: qualityMetric || null,
    legalRequirements,
    claimsNeedingReview,
    exactCitationIds: (article.citationIds || []).filter((id) => /^ohsr-\d+-/.test(id)),
    citationIds: article.citationIds || [],
    citations,
    sourceNoteIds: article.sourceNoteIds || [],
    sourceNotes,
    relatedTools: {
      toolboxTalks: compactResource(safetyLabData.toolboxTalks, article.relatedToolboxTalks || []),
      checklists: compactResource(safetyLabData.checklists, article.relatedChecklists || []),
      quizzes: compactResource(safetyLabData.quizzes, article.relatedQuizzes || []),
      forms: compactResource(safetyLabData.forms, article.relatedForms || []),
      safetyPacks: matchingSafetyPacks,
    },
    blockerSummary: getArticleDraftBlockers(article).join("; ") || "No generated blockers",
    printSections: [
      "Article review status",
      "Reviewer checklist",
      "Claims needing source review",
      "Citation coverage",
      "Source notes",
      "Related field-use content",
      "Draft blocker summary",
    ],
  };
}

const reviewPacks = tierOneArticleSlugs.map(reviewPackForArticle);

const output = `// Generated by scripts/build-wiki-review-packs.js. Do not edit by hand.\nexport const generatedWikiReviewPacks = ${JSON.stringify(reviewPacks, null, 2)};\n`;

await writeFile(outputPath, output);
console.log(`Built ${reviewPacks.length} wiki review packs.`);
