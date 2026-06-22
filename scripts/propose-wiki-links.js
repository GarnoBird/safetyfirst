import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const articleDir = join(root, "content/articles");
const reportPath = join(root, "docs/wiki-link-suggestions.md");

const maxSuggestionsPerArticle = 8;
const maxSuggestionsPerTargetPerArticle = 1;

const skippedSections = new Set([
  "related topics",
  "official sources",
  "official citations",
  "source notes",
  "reviewer notes",
  "what a human reviewer must verify",
  "version history",
  "disclaimer",
]);

const genericTerms = new Set([
  "access",
  "area",
  "assessment",
  "check",
  "checklist",
  "construction",
  "control",
  "controls",
  "document",
  "documents",
  "equipment",
  "hazard",
  "hazards",
  "inspection",
  "inspections",
  "instructions",
  "planning",
  "plan",
  "procedure",
  "record",
  "records",
  "review",
  "safe",
  "safety",
  "site",
  "system",
  "task",
  "training",
  "work",
  "worker",
  "workers",
  "public interface",
  "site specific safe work procedure",
  "waste handling",
  "worker instruction",
]);

const highValueTerms = ["fall arrest", "respirators", "silica dust", "confined space", "traffic control plan"];

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
  if (!match) return [{}, content, 1];

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

  const bodyStartLine = match[0].split("\n").length;
  return [data, content.slice(match[0].length), bodyStartLine];
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function unquote(value) {
  return value.replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"');
}

function titleFromMarkdown(content, fallback) {
  return content.match(/^#\s+(.+)$/m)?.[1].trim() || fallback;
}

function titleCaseFromSlug(slug) {
  return String(slug || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeTerm(value) {
  return String(value || "")
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForKey(value) {
  return normalizeTerm(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function articleFromMarkdown(path, content) {
  const [frontmatter, markdown, bodyStartLine] = parseFrontmatter(content);
  const slug = frontmatter.slug || path.split("/").pop().replace(/\.md$/, "");
  const title = frontmatter.title || titleFromMarkdown(markdown, titleCaseFromSlug(slug));
  return {
    path,
    fileName: path.split("/").pop(),
    slug,
    title,
    markdown,
    bodyStartLine,
    aliases: toArray(frontmatter.aliases),
    hazards: toArray(frontmatter.hazards),
    tasks: toArray(frontmatter.tasks),
    requiredDocuments: toArray(frontmatter.requiredDocuments),
  };
}

function termPriority(kind) {
  if (kind === "title") return 100;
  if (kind === "slug") return 90;
  if (kind === "alias") return 80;
  if (kind === "hazard") return 45;
  if (kind === "task") return 35;
  if (kind === "requiredDocument") return 30;
  return 10;
}

function isUsefulTerm(term, kind) {
  const normalized = normalizeForKey(term);
  if (!normalized) return false;
  const words = normalized.split(/\s+/);
  if (kind === "title" || kind === "slug") return normalized.length >= 4;
  if (genericTerms.has(normalized)) return false;
  if (kind === "alias" && words.length === 1) return normalized.length >= 4 && !genericTerms.has(normalized);
  if (kind !== "alias" && words.length === 1) return false;
  if (words.every((word) => genericTerms.has(word))) return false;
  return normalized.length >= 8;
}

function buildTermDictionary(articles) {
  const candidatesByTerm = new Map();

  for (const article of articles) {
    const candidates = [
      { term: article.title, kind: "title" },
      { term: article.slug.replace(/-/g, " "), kind: "slug" },
      ...article.aliases.map((term) => ({ term, kind: "alias" })),
      ...article.hazards.map((term) => ({ term, kind: "hazard" })),
      ...article.tasks.map((term) => ({ term, kind: "task" })),
      ...article.requiredDocuments.map((term) => ({ term, kind: "requiredDocument" })),
    ];

    for (const candidate of candidates) {
      const term = normalizeTerm(candidate.term);
      const key = normalizeForKey(term);
      if (!isUsefulTerm(term, candidate.kind)) continue;

      const next = {
        term,
        key,
        kind: candidate.kind,
        priority: termPriority(candidate.kind),
        targetSlug: article.slug,
        targetTitle: article.title,
      };

      candidatesByTerm.set(key, [...(candidatesByTerm.get(key) || []), next]);
    }
  }

  return [...candidatesByTerm.values()]
    .map(selectBestTermCandidate)
    .filter(Boolean)
    .sort((a, b) => b.key.length - a.key.length || b.priority - a.priority || a.term.localeCompare(b.term));
}

function selectBestTermCandidate(candidates) {
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority || b.term.length - a.term.length || a.targetTitle.localeCompare(b.targetTitle));
  const top = sorted[0];
  const topCandidates = sorted.filter((candidate) => candidate.priority === top.priority);
  const distinctTopTargets = new Set(topCandidates.map((candidate) => candidate.targetSlug));

  if (top.priority >= 80) {
    if (distinctTopTargets.size === 1) return top;
    const exactTitle = topCandidates.filter((candidate) => candidate.kind === "title" && normalizeForKey(candidate.term) === normalizeForKey(candidate.targetTitle));
    const exactTitleTargets = new Set(exactTitle.map((candidate) => candidate.targetSlug));
    if (exactTitleTargets.size === 1) return exactTitle[0];
    return null;
  }

  const distinctTargets = new Set(sorted.map((candidate) => candidate.targetSlug));
  if (distinctTargets.size > 1) return null;
  return top;
}

function extractExistingLinks(markdown) {
  return new Set([...markdown.matchAll(/\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g)].map((match) => match[1].trim()));
}

function maskProtectedRanges(line) {
  return line
    .replace(/\[\[[^\]]+\]\]/g, (match) => " ".repeat(match.length))
    .replace(/\{\{[^}]+\}\}/g, (match) => " ".repeat(match.length))
    .replace(/`[^`]+`/g, (match) => " ".repeat(match.length))
    .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => " ".repeat(match.length));
}

function regexForTerm(term) {
  const words = normalizeForKey(term).split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const pattern = words.map(escapeRegex).join("[\\s\\-/]+");
  return new RegExp(`(^|[^A-Za-z0-9])(${pattern})(?=$|[^A-Za-z0-9])`, "i");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function currentSection(line, current) {
  const heading = line.match(/^##\s+(.+)$/);
  if (heading) return heading[1].trim();
  return current;
}

function shouldSkipLine(line, section) {
  if (!line.trim()) return true;
  if (/^#/.test(line)) return true;
  if (skippedSections.has(String(section || "").toLowerCase())) return true;
  if (/^\s*[-*]\s+\[\[/.test(line)) return true;
  if (/^\s*[-*]\s+\{\{cite:/.test(line)) return true;
  return false;
}

function snippetFor(line, index, length) {
  const start = Math.max(0, index - 70);
  const end = Math.min(line.length, index + length + 70);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < line.length ? "..." : "";
  return `${prefix}${line.slice(start, end).trim()}${suffix}`;
}

function proposedReplacement(matchText, targetSlug) {
  return `[[${targetSlug}|${matchText}]]`;
}

function suggestLinksForArticle(article, terms) {
  const existingLinks = extractExistingLinks(article.markdown);
  const suggestions = [];
  const suggestedTargets = new Map();
  let section = "";
  const lines = article.markdown.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    section = currentSection(line, section);
    if (shouldSkipLine(line, section)) continue;

    const maskedLine = maskProtectedRanges(line);

    for (const term of terms) {
      if (suggestions.length >= maxSuggestionsPerArticle) break;
      if (term.targetSlug === article.slug) continue;
      if (existingLinks.has(term.targetSlug)) continue;
      if ((suggestedTargets.get(term.targetSlug) || 0) >= maxSuggestionsPerTargetPerArticle) continue;

      const regex = regexForTerm(term.term);
      if (!regex) continue;
      const match = maskedLine.match(regex);
      if (!match) continue;

      const matchedText = line.slice(match.index + match[1].length, match.index + match[1].length + match[2].length);
      if (!matchedText.trim()) continue;

      suggestions.push({
        sourceSlug: article.slug,
        sourceTitle: article.title,
        sourceFile: `content/articles/${article.fileName}`,
        targetSlug: term.targetSlug,
        targetTitle: term.targetTitle,
        match: matchedText,
        termKind: term.kind,
        section: section || "Article body",
        line: article.bodyStartLine + index,
        snippet: snippetFor(line, match.index + match[1].length, match[2].length),
        replacement: proposedReplacement(matchedText, term.targetSlug),
      });
      suggestedTargets.set(term.targetSlug, (suggestedTargets.get(term.targetSlug) || 0) + 1);
    }

    if (suggestions.length >= maxSuggestionsPerArticle) break;
  }

  return suggestions;
}

function buildReport({ articles, terms, suggestions }) {
  const lines = [
    "# Wiki Link Suggestions",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This report proposes internal wiki links only. It does not edit article Markdown.",
    "",
    "## Summary",
    "",
    `- Articles scanned: ${articles.length}`,
    `- Link terms indexed: ${terms.length}`,
    `- Suggestions: ${suggestions.length}`,
    `- Max suggestions per article: ${maxSuggestionsPerArticle}`,
    `- Max suggestions per target per article: ${maxSuggestionsPerTargetPerArticle}`,
    "",
    "## High-value term dictionary check",
    "",
    ...highValueTerms.map((term) => {
      const match = terms.find((entry) => entry.key === normalizeForKey(term));
      return match ? `- ${term}: ${match.targetTitle} (${match.targetSlug}) via ${match.kind}` : `- ${term}: not indexed`;
    }),
    "",
    "## Suggestions",
    "",
  ];

  if (!suggestions.length) {
    lines.push("- No suggestions found.");
    return lines.join("\n");
  }

  let currentArticle = "";
  for (const suggestion of suggestions) {
    if (suggestion.sourceSlug !== currentArticle) {
      currentArticle = suggestion.sourceSlug;
      lines.push(`### ${suggestion.sourceTitle} (${suggestion.sourceSlug})`, "");
    }
    lines.push(
      `- Line ${suggestion.line}, ${suggestion.section}: \`${suggestion.match}\` -> \`${suggestion.replacement}\``,
      `  - Target: ${suggestion.targetTitle} (${suggestion.targetSlug}); matched ${suggestion.termKind}`,
      `  - Context: ${suggestion.snippet}`,
    );
  }

  return lines.join("\n");
}

function printSummary(suggestions) {
  const articleCount = new Set(suggestions.map((suggestion) => suggestion.sourceSlug)).size;
  console.log(`Wiki link proposal report built.`);
  console.log(`- Suggestions: ${suggestions.length}`);
  console.log(`- Articles with suggestions: ${articleCount}`);
  console.log(`- Report: docs/wiki-link-suggestions.md`);

  for (const suggestion of suggestions.slice(0, 12)) {
    console.log(`  ${suggestion.sourceSlug}:${suggestion.line} ${suggestion.match} -> [[${suggestion.targetSlug}|${suggestion.match}]]`);
  }
  if (suggestions.length > 12) console.log(`  ...${suggestions.length - 12} more suggestions in report`);
}

const files = await markdownFiles();
const articles = await Promise.all(files.map(async (path) => articleFromMarkdown(path, await readFile(path, "utf8"))));
const terms = buildTermDictionary(articles);
const suggestions = articles.flatMap((article) => suggestLinksForArticle(article, terms));
const report = buildReport({ articles, terms, suggestions });

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${report}\n`);
printSummary(suggestions);
