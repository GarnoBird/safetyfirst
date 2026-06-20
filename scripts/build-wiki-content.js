import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { regulationRefs, wikiSources } from "../src/wikiContent.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const articleDir = join(root, "content/articles");
const outputPath = join(root, "src/generatedWikiArticles.js");

const sourceMap = new Map(wikiSources.map((source) => [source.id, source]));
const regulationMap = new Map(regulationRefs.map((ref) => [ref.id, ref]));

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function markdownFiles() {
  const entries = await readdir(articleDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name.toLowerCase() !== "readme.md")
    .map((entry) => join(articleDir, entry.name))
    .sort();
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

function titleFromMarkdown(content, fallback) {
  return content.match(/^#\s+(.+)$/m)?.[1].trim() || fallback;
}

function paragraphs(markdown) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith("- ") && !/^\d+\.\s+/.test(block));
}

function listItems(markdown) {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") || /^\d+\.\s+/.test(line))
    .map((line) =>
      line
        .replace(/^\d+\.\s+/, "")
        .replace(/^- /, "")
        .replace(/^\[[ xX]\]\s*/, "")
        .trim(),
    )
    .filter(Boolean);
}

function parseRelated(markdown) {
  return listItems(markdown)
    .map((item) => item.match(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/)?.[1] || item)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractWikiLinks(text) {
  return unique(
    [...text.matchAll(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g)].map((match) => match[1].trim()),
  );
}

function extractCitationIds(text) {
  return unique([...text.matchAll(/\{\{cite:([^}]+)\}\}/g)].map((match) => match[1].trim()));
}

function sourceForCitation(id) {
  const regulation = regulationMap.get(id);
  if (regulation) {
    return {
      id,
      kind: "regulation",
      title: `${regulation.instrument} ${regulation.part}: ${regulation.title}`,
      publisher: "WorkSafeBC",
      locator: regulation.part,
      url: regulation.url,
    };
  }

  const source = sourceMap.get(id);
  if (source) {
    return {
      id,
      kind: "source",
      title: source.title,
      publisher: source.publisher,
      locator: source.type,
      url: source.url,
    };
  }

  return {
    id,
    kind: "unknown",
    title: id,
    publisher: "Source review needed",
    locator: "Unknown citation",
    url: "",
  };
}

function articleFromMarkdown(path, content) {
  const [frontmatter, markdown] = parseFrontmatter(content);
  const slug = frontmatter.slug || path.split("/").pop().replace(/\.md$/, "");
  const title = frontmatter.title || titleFromMarkdown(markdown, slug);
  const summaryParagraphs = paragraphs(section(markdown, "Summary"));
  const sourceIds = frontmatter.sourceIds || [];
  const regulationRefs = frontmatter.regulationRefs || [];
  const related = unique([
    ...(frontmatter.related || []),
    ...parseRelated(section(markdown, "Related topics")),
  ]);
  const wikiLinks = extractWikiLinks(markdown);
  const citationIds = unique([
    ...(frontmatter.citations || []),
    ...extractCitationIds(markdown),
    ...regulationRefs,
    ...sourceIds,
  ]);

  return {
    slug,
    title,
    category: frontmatter.category || "Uncategorized",
    summary: summaryParagraphs[0] || "",
    summaryParagraphs,
    jurisdiction: frontmatter.jurisdiction || "BC",
    difficulty: frontmatter.difficulty || "Basic",
    status: frontmatter.status || "Deep draft",
    confidenceLevel: frontmatter.confidenceLevel || "Source-cited deep draft",
    aliases: frontmatter.aliases || [],
    trades: frontmatter.trades || ["All construction trades"],
    hazards: frontmatter.hazards || [],
    tasks: frontmatter.tasks || [],
    requiredDocuments: frontmatter.requiredDocuments || [],
    sourceIds,
    regulationRefs,
    citationIds,
    citations: citationIds.map(sourceForCitation),
    wikiLinks,
    outboundArticleLinks: unique([...wikiLinks, ...related]),
    backlinks: [],
    related,
    review: {
      lastReviewed: frontmatter.lastReviewed || "2026-06-20",
      nextReview: frontmatter.nextReview || "2026-09-20",
      legalReviewStatus: frontmatter.legalReviewStatus || "Needs qualified review",
      safetyReviewStatus: frontmatter.safetyReviewStatus || "Needs field review",
    },
    sections: {
      whenApplies: listItems(section(markdown, "When this applies")),
      legalRequirements: listItems(section(markdown, "Legal requirements")),
      bestPractice: listItems(section(markdown, "Best practice")),
      requiredDocuments: listItems(section(markdown, "Required documents")),
      procedure: listItems(section(markdown, "Step-by-step safe procedure")),
      workerChecklist: listItems(section(markdown, "Worker checklist")),
      supervisorChecklist: listItems(section(markdown, "Supervisor checklist")),
      commonMistakes: listItems(section(markdown, "Common mistakes")),
    },
    markdownPath: `content/articles/${path.split("/").pop()}`,
  };
}

function withBacklinks(articles) {
  const bySlug = new Map(articles.map((article) => [article.slug, article]));

  for (const article of articles) {
    for (const linkedSlug of article.outboundArticleLinks) {
      const linked = bySlug.get(linkedSlug);
      if (linked) {
        linked.backlinks.push({
          slug: article.slug,
          title: article.title,
        });
      }
    }
  }

  for (const article of articles) {
    article.backlinks = unique(article.backlinks.map((backlink) => backlink.slug)).map((slug) => ({
      slug,
      title: bySlug.get(slug)?.title || slug,
    }));
  }

  return articles;
}

const files = await markdownFiles();
const articles = withBacklinks(
  await Promise.all(files.map(async (path) => articleFromMarkdown(path, await readFile(path, "utf8")))),
);
const citations = unique(articles.flatMap((article) => article.citationIds)).map(sourceForCitation);

const output = `// Generated by scripts/build-wiki-content.js. Do not edit by hand.\nexport const generatedWikiArticles = ${JSON.stringify(articles, null, 2)};\nexport const generatedWikiCitations = ${JSON.stringify(citations, null, 2)};\n`;

await writeFile(outputPath, output);
console.log(`Built generated wiki content for ${articles.length} articles.`);
