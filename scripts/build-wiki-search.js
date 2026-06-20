import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getSourceById,
  glossaryTerms,
  regulationRefs,
  wikiArticles,
  wikiRedirects,
} from "../src/wikiContent.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceNoteDir = join(root, "content/source-notes");
const outputPath = join(root, "src/generatedWikiSearch.js");
const today = "2026-06-20";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function plainText(value) {
  return String(value || "")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{cite:[^}]+\}\}/g, "")
    .replace(/\{\{review:source\}\}/g, "source review needed")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return plainText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function articleText(article) {
  return plainText(
    [
      article.title,
      article.summary,
      ...(article.summaryParagraphs || []),
      article.category,
      ...(article.aliases || []),
      ...(article.trades || []),
      ...(article.hazards || []),
      ...(article.tasks || []),
      ...(article.requiredDocuments || []),
      ...(article.citationIds || []),
      ...Object.values(article.sections || {}).flat(),
    ].join(" "),
  );
}

function snippetFor(article) {
  const summary = plainText((article.summaryParagraphs || [article.summary]).find(Boolean));
  if (summary.length <= 240) return summary;
  return `${summary.slice(0, 237).replace(/\s+\S*$/, "")}...`;
}

async function readSourceNotes() {
  let entries = [];
  try {
    entries = await readdir(sourceNoteDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name.toLowerCase() !== "readme.md")
    .map((entry) => join(sourceNoteDir, entry.name))
    .sort();

  return Promise.all(
    files.map(async (path) => {
      const content = await readFile(path, "utf8");
      const [frontmatter, markdown] = parseFrontmatter(content);
      return {
        id: frontmatter.id || path.split("/").pop().replace(/\.md$/, ""),
        title: frontmatter.title || markdown.match(/^#\s+(.+)$/m)?.[1] || "Source note",
        publisher: frontmatter.publisher || "WorkSafeBC",
        sourceType: frontmatter.sourceType || "Source note",
        url: frontmatter.url || "",
        jurisdiction: frontmatter.jurisdiction || "BC",
        lastChecked: frontmatter.lastChecked || today,
        sourceIds: toArray(frontmatter.sourceIds),
        regulationRefs: toArray(frontmatter.regulationRefs),
        citations: toArray(frontmatter.citations),
        relatedArticles: toArray(frontmatter.relatedArticles),
        summary: plainText(section(markdown, "Source scope") || section(markdown, "Plain-language review notes") || markdown),
        markdownPath: `content/source-notes/${path.split("/").pop()}`,
      };
    }),
  );
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return [{}, content];

  const data = {};
  const lines = match[1].split("\n");
  let currentKey = null;

  for (const line of lines) {
    if (/^\s+-\s+/.test(line) && currentKey) {
      data[currentKey].push(unquote(line.replace(/^\s+-\s+/, "").trim()));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;

    const [, key, rawValue] = keyMatch;
    if (rawValue.trim() === "[]") {
      data[key] = [];
      currentKey = key;
    } else if (rawValue.trim()) {
      data[key] = unquote(rawValue.trim());
      currentKey = null;
    } else {
      data[key] = [];
      currentKey = key;
    }
  }

  return [data, content.slice(match[0].length)];
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function unquote(value) {
  return value.replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"');
}

function section(content, heading) {
  const headings = [...content.matchAll(/^##\s+(.+)$/gm)];
  const current = headings.find((match) => match[1].trim().toLowerCase() === heading.toLowerCase());
  if (!current) return "";

  const start = current.index + current[0].length;
  const next = headings.find((match) => match.index > current.index);
  const end = next ? next.index : content.length;
  return content.slice(start, end).trim();
}

function qualityMetric(article) {
  const exactCitationCount = (article.citationIds || []).filter((id) => /^ohsr-\d+-/.test(id)).length;
  const relatedToolCount = [
    ...(article.relatedToolboxTalks || []),
    ...(article.relatedChecklists || []),
    ...(article.relatedQuizzes || []),
    ...(article.relatedForms || []),
  ].length;
  const wordCount = articleText(article).split(/\s+/).filter(Boolean).length;
  const issues = [];

  if (article.reviewTier === "Tier 1" && exactCitationCount < 8) {
    issues.push(`Tier 1 exact citation count is ${exactCitationCount}; expected at least 8`);
  }
  if (article.reviewTier === "Tier 2" && exactCitationCount < 5) {
    issues.push(`Tier 2 exact citation count is ${exactCitationCount}; expected at least 5`);
  }
  if (!(article.sourceNoteIds || []).length) issues.push("No source notes linked");
  if (!relatedToolCount) issues.push("No related field tools linked");
  if ((article.outboundArticleLinks || []).length < 8) issues.push("Fewer than 8 outbound article links");
  if ((article.backlinks || []).length < 1) issues.push("No inbound backlinks");
  if (article.maturity === "Ready for public use" && article.sourceReviewFlagCount > 0) {
    issues.push("Ready article still has source review flags");
  }

  return {
    slug: article.slug,
    title: article.title,
    reviewTier: article.reviewTier,
    maturity: article.maturity,
    exactCitationCount,
    broadCitationCount: (article.citationIds || []).filter((id) => /^ohsr-part-\d+$/.test(id)).length,
    sourceReviewFlagCount: article.sourceReviewFlagCount || 0,
    outboundLinkCount: (article.outboundArticleLinks || []).length,
    inboundLinkCount: (article.backlinks || []).length,
    relatedToolCount,
    sourceNoteCount: (article.sourceNoteIds || []).length,
    wordCount,
    score: Math.max(0, 100 - issues.length * 10),
    issues,
  };
}

const sourceNotes = await readSourceNotes();
const redirectTermsBySlug = new Map();
for (const redirect of wikiRedirects) {
  redirectTermsBySlug.set(redirect.to, [...(redirectTermsBySlug.get(redirect.to) || []), redirect.term, redirect.from]);
}

const glossaryTermsBySlug = new Map();
for (const term of glossaryTerms) {
  glossaryTermsBySlug.set(term.targetArticle, [...(glossaryTermsBySlug.get(term.targetArticle) || []), term.term]);
}

const searchIndex = wikiArticles.map((article) => {
  const text = articleText(article);
  return {
    slug: article.slug,
    title: article.title,
    category: article.category,
    reviewTier: article.reviewTier,
    maturity: article.maturity,
    aliases: article.aliases || [],
    redirectTerms: unique(redirectTermsBySlug.get(article.slug) || []),
    glossaryTerms: unique(glossaryTermsBySlug.get(article.slug) || []),
    hazards: article.hazards || [],
    trades: article.trades || [],
    tasks: article.tasks || [],
    documents: article.requiredDocuments || [],
    requiredDocuments: article.requiredDocuments || [],
    regulationRefs: article.regulationRefs || [],
    citationIds: article.citationIds || [],
    sourceIds: article.sourceIds || [],
    sourceNoteIds: article.sourceNoteIds || [],
    snippet: snippetFor(article),
    searchText: normalize(text),
  };
});

const qualityMetrics = wikiArticles.map(qualityMetric);
const sourceNoteIds = new Set(sourceNotes.map((note) => note.id));
const articleSourceMissing = wikiArticles
  .filter((article) => !(article.sourceNoteIds || []).some((id) => sourceNoteIds.has(id)))
  .map((article) => article.slug);
const staleReviewArticles = wikiArticles
  .filter((article) => String(article.review?.nextReview || "") < today)
  .map((article) => article.slug);

const sourceCoverage = {
  generatedAt: new Date().toISOString(),
  articleCount: wikiArticles.length,
  sourceNoteCount: sourceNotes.length,
  articlesWithSourceNotes: wikiArticles.length - articleSourceMissing.length,
  articlesMissingSourceNotes: articleSourceMissing,
  unresolvedSourceReviewArticles: wikiArticles
    .filter((article) => (article.sourceReviewFlagCount || 0) > 0)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      sourceReviewFlagCount: article.sourceReviewFlagCount,
    })),
  staleReviewArticles,
  weakTierOne: qualityMetrics.filter((metric) => metric.reviewTier === "Tier 1" && metric.exactCitationCount < 8),
  weakTierTwo: qualityMetrics.filter((metric) => metric.reviewTier === "Tier 2" && metric.exactCitationCount < 5),
  sourceNotesBySourceId: Object.fromEntries(
    sourceNotes
      .filter((note) => note.sourceIds.length)
      .flatMap((note) => note.sourceIds.map((sourceId) => [sourceId, note.id])),
  ),
  officialSourceCount: new Set(wikiArticles.flatMap((article) => article.sourceIds || []).filter((id) => getSourceById(id))).size,
  regulationReferenceCount: new Set(regulationRefs.map((ref) => ref.id)).size,
};

const output = `// Generated by scripts/build-wiki-search.js. Do not edit by hand.\nexport const generatedWikiSearchIndex = ${JSON.stringify(searchIndex, null, 2)};\nexport const generatedWikiQualityMetrics = ${JSON.stringify(qualityMetrics, null, 2)};\nexport const generatedWikiSourceCoverage = ${JSON.stringify(sourceCoverage, null, 2)};\nexport const generatedWikiSourceNotes = ${JSON.stringify(sourceNotes, null, 2)};\n`;

await writeFile(outputPath, output);
console.log(`Built wiki search/source data for ${wikiArticles.length} articles and ${sourceNotes.length} source notes.`);
