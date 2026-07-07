import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { glossaryTerms, wikiRedirects } from "../src/wikiCompletionData.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const articleDir = join(root, "content/articles");
const reportPath = join(root, "docs/wiki-missing-topic-suggestions.md");

const minDistinctArticles = 2;
const maxMentionsPerTopic = 8;

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
  "areas",
  "assessment",
  "assessments",
  "check",
  "checklist",
  "condition",
  "conditions",
  "construction",
  "control",
  "controls",
  "crew",
  "document",
  "documents",
  "equipment",
  "hazard",
  "hazards",
  "inspection",
  "inspections",
  "instruction",
  "instructions",
  "item",
  "items",
  "job",
  "material",
  "materials",
  "nearby work",
  "plan",
  "planning",
  "procedure",
  "procedures",
  "record",
  "records",
  "review",
  "safe",
  "safety",
  "site",
  "site condition",
  "site conditions",
  "supervisor",
  "system",
  "task",
  "tasks",
  "training",
  "work",
  "worker",
  "workers",
]);

const lowValueStarts = new Set([
  "a",
  "an",
  "and",
  "any",
  "ask",
  "against",
  "before",
  "brief",
  "check",
  "choose",
  "confirm",
  "current",
  "define",
  "document",
  "each",
  "ensure",
  "expected",
  "existing",
  "failing",
  "for",
  "how",
  "i",
  "identify",
  "if",
  "including",
  "inspect",
  "involves",
  "keep",
  "know",
  "likely",
  "maintain",
  "missing",
  "nearby",
  "other",
  "prepare",
  "provide",
  "record",
  "required",
  "related",
  "relying",
  "report",
  "review",
  "same",
  "site",
  "specific",
  "start",
  "stop",
  "the",
  "this",
  "to",
  "update",
  "use",
  "we",
  "will",
  "when",
  "where",
  "who",
  "with",
  "work",
  "workers",
]);

const boilerplateLinePatterns = [
  /bc construction safety reference page/i,
  /it helps a supervisor or worker connect/i,
  /the field value is in the checks/i,
  /what changed today/i,
  /a document, inspection, orientation, permit, plan, or record/i,
  /use the most protective practical control/i,
  /record follow-up so the same issue/i,
  /condition no longer matches the plan/i,
  /i have the required ppe/i,
  /i know how to report/i,
  /adjacent trades, public interface/i,
  /keep written plans, procedures, inspections, permits, assessments, or records/i,
  /review finds a missing citation/i,
  /topic has been checked against current source notes/i,
  /treated as normal production/i,
  /failing to update the plan after weather/i,
  /weather, access, equipment, public interface/i,
  /review the official source and the site procedure/i,
  /using a procedure that does not match/i,
  /i have the ppe, tools, equipment/i,
  /treated as a compliance checklist/i,
  /closing an inspection item/i,
  /worker instructions, the required documents, and the stop-work triggers/i,
  /before relying on ppe/i,
  /i will report/i,
  /know where ppe/i,
  /prepare or update ppe/i,
  /orientation and any supporting record/i,
];

const sentenceFragmentPatterns = [
  /\b(no longer|how to|that carry|at every|or a worker|if an inspection|confirms the plan|required ppe)\b/,
  /\b(actual site condition|existing control|related site procedure|reopened at every|reports a hazard|source notes|topic affects)\b/,
  /\b(matches the plan|match the plan|work continues|work starts|work is planned|work sequence|work area)\b/,
  /\b(update the plan|original plan|compliance checklist|using a procedure|closing an inspection|have the ppe|will report|know where ppe|prepare or update ppe)\b/,
  /\b(such as inspection|hazards connected|against the cited|choose the|define how|expected duration|written fall|how rescue|maintain fall)\b/,
  /\b(decide whether|cited sources|duration for traffic|understand how|personal fall|my approved anchor|could be suspended|leaving rescue|silica exposure)\b/,
  /\b(to the site condition|that should exist|deeper legal|review trail|cited requirements)\b/,
  /^in traffic\b/,
  /^(against|ask|brief|check|choose|confirm|define|document|ensure|expected|failing|identify|inspect|involves|keep|know|maintain|prepare|provide|record|relying|report|review|start|stop|update|use)\b/,
  /^(i|we|they|he|she|it|that|this|or|and)\b/,
];

const coverageModifierWords = new Set([
  ...genericTerms,
  ...lowValueStarts,
  "a",
  "about",
  "all",
  "as",
  "by",
  "connected",
  "current",
  "for",
  "from",
  "how",
  "into",
  "needed",
  "of",
  "on",
  "should",
  "such",
  "their",
  "to",
  "using",
  "where",
  "written",
]);

const sectionWeights = new Map([
  ["legal requirements", 16],
  ["required documents", 14],
  ["step-by-step safe procedure", 10],
  ["worker checklist", 9],
  ["supervisor checklist", 10],
  ["common mistakes", 8],
  ["when this applies", 6],
  ["summary", 5],
  ["best practice", 4],
]);

const categoryWeights = new Map([
  ["forms/documents/permits", 32],
  ["regulatory/legal phrases", 30],
  ["hazards", 26],
  ["medical/first aid terms", 24],
  ["equipment", 21],
  ["procedures", 20],
  ["jobsite safety terms", 14],
]);

const categoryPatterns = [
  {
    category: "regulatory/legal phrases",
    pattern:
      /\b(notice of project|qualified person|competent person|prime contractor|manufacturer instructions?|owner rules?|written instructions?|training and instruction|instruction and training|hazard identification|risk assessment|exposure limits?|engineering controls?|administrative controls?|safe work procedures?|occupational exposure limits?|employer duties|supervisor duties|worker rights|young or new worker)\b/gi,
  },
  {
    category: "forms/documents/permits",
    pattern:
      /\b((?:[a-z0-9][a-z0-9/-]*\s+){0,5}(?:permit|permits|plan|plans|record|records|form|forms|checklist|checklists|procedure|procedures|assessment|assessments|report|reports|inventory|map|log|certificate|certificates|notice|clearance|documentation))\b/gi,
  },
  {
    category: "medical/first aid terms",
    pattern:
      /\b(cardiac arrest|cpr|automated external defibrillator|defibrillator|aed|bleeding|shock|suspension trauma|heat exhaustion|heat stroke|hypothermia|eye injury|first aid attendant|first aid supplies|emergency transportation|medical aid|first aid record|first aid procedures?)\b/gi,
  },
  {
    category: "equipment",
    pattern:
      /\b((?:[a-z0-9][a-z0-9/-]*\s+){0,4}(?:respirators?|harness(?:es)?|lanyards?|anchors?|guardrails?|ladders?|scaffolds?|platforms?|barricades?|extinguishers?|vacuums?|fans?|blowers?|generators?|heaters?|cylinders?|hoists?|cranes?|slings?|shackles?|forklifts?|aerial lifts?|gfci|ppe|gloves?|hard hats?|hearing protection|eye protection|face protection|high visibility apparel))\b/gi,
  },
  {
    category: "hazards",
    pattern:
      /\b((?:[a-z0-9][a-z0-9/-]*\s+){0,5}(?:exposure|exposures|dust|fumes|vapours|vapors|fibres|fibers|collapse|cave-in|struck-by|electrocution|shock|fire|explosion|falls?|impalement|noise|heat stress|cold stress|carbon monoxide|traffic|pedestrian traffic|blocked access|fall hazard|electrical contact|airborne exposure))\b/gi,
  },
  {
    category: "procedures",
    pattern:
      /\b((?:[a-z0-9][a-z0-9/-]*\s+){0,5}(?:setup|inspection|isolation|de-energization|lockout|rescue|evacuation|entry|staging|assembly|dismantling|cleanup|containment|monitoring|signalling|rigging|hoisting|lifting|cutting|grinding|drilling|demolition|excavation|trenching|welding))\b/gi,
  },
  {
    category: "jobsite safety terms",
    pattern:
      /\b(stop-work|work zone|exclusion zone|restricted area|controlled access zone|public interface|pedestrian route|emergency access|muster area|assembly area|spotter|signaller|traffic control zone|swing radius|line of fire|pinch point)\b/gi,
  },
];

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

function titleCase(value) {
  return String(value || "")
    .split(/\s+/)
    .map((word) => {
      if (/^(and|or|of|for|to|in|on|with|near)$/i.test(word)) return word.toLowerCase();
      if (/^(AED|CPR|GFCI|PPE|OHSR)$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/\bBc\b/g, "BC");
}

function slugify(value) {
  return normalizeForKey(value).replace(/\s+/g, "-");
}

function normalizeTerm(value) {
  return String(value || "")
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/["'`]/g, "")
    .replace(/[()[\]{}:;,.!?]+/g, " ")
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

function variantsForKey(value) {
  const key = normalizeForKey(value);
  if (!key) return [];

  const variants = new Set([key]);
  const words = key.split(/\s+/);
  const last = words.at(-1);
  if (last && last.length > 3 && last.endsWith("s")) {
    variants.add([...words.slice(0, -1), last.replace(/s$/, "")].join(" "));
  } else if (last && last.length > 3) {
    variants.add([...words.slice(0, -1), `${last}s`].join(" "));
  }
  return [...variants];
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
    related: toArray(frontmatter.related),
  };
}

function maskProtectedRanges(line) {
  return line
    .replace(/\[\[[^\]]+\]\]/g, (match) => " ".repeat(match.length))
    .replace(/\{\{[^}]+\}\}/g, (match) => " ".repeat(match.length))
    .replace(/`[^`]+`/g, (match) => " ".repeat(match.length))
    .replace(/\[[^\]]+\]\([^)]+\)/g, (match) => " ".repeat(match.length));
}

function extractWikiLinks(markdown) {
  return [...markdown.matchAll(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g)].map((match) => ({
    slug: match[1].trim(),
    label: (match[2] || match[1]).trim(),
  }));
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
  if (boilerplateLinePatterns.some((pattern) => pattern.test(line))) return true;
  return false;
}

function snippetFor(line, index, length) {
  const start = Math.max(0, index - 80);
  const end = Math.min(line.length, index + length + 80);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < line.length ? "..." : "";
  return `${prefix}${line.slice(start, end).trim()}${suffix}`;
}

function buildCoverage(articles) {
  const covered = new Set();

  function add(value) {
    for (const variant of variantsForKey(value)) covered.add(variant);
  }

  for (const article of articles) {
    add(article.title);
    add(article.slug.replace(/-/g, " "));
    for (const value of [...article.aliases, ...article.hazards, ...article.tasks, ...article.requiredDocuments]) add(value);
    for (const link of extractWikiLinks(article.markdown)) {
      add(link.slug.replace(/-/g, " "));
      add(link.label);
    }
  }

  for (const redirect of wikiRedirects || []) {
    add(redirect.term);
    add(redirect.from?.replace(/-/g, " "));
  }

  for (const term of glossaryTerms || []) {
    add(term.term);
    add(term.slug?.replace(/-/g, " "));
  }

  return covered;
}

function cleanCandidateTerm(value) {
  let term = normalizeTerm(value);
  let words = term.split(/\s+/).filter(Boolean);

  while (words.length > 1 && lowValueStarts.has(words[0].toLowerCase())) words = words.slice(1);
  while (words.length > 1 && /^(and|or|for|with|where|when|that|before|after)$/i.test(words.at(-1))) words = words.slice(0, -1);

  term = words.join(" ");
  term = term.replace(/\b(worker|workers|site|task|topic) (?:and|or) /gi, "");
  return term.trim();
}

function isUsefulCandidate(term, covered) {
  const key = normalizeForKey(term);
  if (!key || covered.has(key)) return false;
  if (isCoveredByKnownTopicInside(key, covered)) return false;
  if (genericTerms.has(key)) return false;

  const words = key.split(/\s+/);
  if (words.length < 2 || words.length > 7) return false;
  if (key.length < 7 || key.length > 90) return false;
  if (words.every((word) => genericTerms.has(word))) return false;
  if (words.filter((word) => genericTerms.has(word)).length >= words.length - 1) return false;
  if (/^(what changed|who is affected|what control|when the crew|plain language|bc construction safety reference)/.test(key)) return false;
  if (/\b(topic affects|source notes|review finds|connect the topic|treated as normal production)\b/.test(key)) return false;
  if (/\b(work is planned|work sequence|work area|work during|work continues|work starts|work method)\b/.test(key)) return false;
  if (sentenceFragmentPatterns.some((pattern) => pattern.test(key))) return false;
  return true;
}

function isCoveredByKnownTopicInside(key, covered) {
  for (const coveredKey of covered) {
    if (!coveredKey || coveredKey.length < 8 || coveredKey.split(/\s+/).length < 2) continue;
    if (!key.includes(coveredKey)) continue;
    const remainder = key.replace(coveredKey, " ").trim();
    if (!remainder) return true;
    const remainderWords = remainder.split(/\s+/).filter(Boolean);
    if (remainderWords.length && remainderWords.every((word) => coverageModifierWords.has(word))) return true;
  }
  return false;
}

function classifyTerm(term, defaultCategory) {
  const key = normalizeForKey(term);
  if (/\b(permit|plan|record|form|checklist|procedure|assessment|report|inventory|map|log|certificate|notice|clearance|documentation)\b/.test(key)) {
    return "forms/documents/permits";
  }
  if (/\b(qualified person|competent person|notice of project|manufacturer instruction|owner rule|written instruction|exposure limit|engineering control|administrative control|prime contractor|employer duties|supervisor duties|worker rights)\b/.test(key)) {
    return "regulatory/legal phrases";
  }
  if (/\b(first aid|medical|cardiac|cpr|aed|defibrillator|bleeding|shock|trauma|hypothermia|heat stroke|heat exhaustion)\b/.test(key)) {
    return "medical/first aid terms";
  }
  if (/\b(respirator|harness|lanyard|anchor|guardrail|ladder|scaffold|platform|barricade|extinguisher|vacuum|fan|blower|generator|heater|cylinder|hoist|crane|sling|shackle|forklift|gfci|ppe|glove|hard hat|protection|apparel)\b/.test(key)) {
    return "equipment";
  }
  if (/\b(exposure|dust|fume|vapour|vapor|fibre|fiber|collapse|cave in|struck by|electrocution|shock|fire|explosion|fall|impalement|noise|heat stress|cold stress|carbon monoxide|traffic|blocked access)\b/.test(key)) {
    return "hazards";
  }
  return defaultCategory;
}

function sectionWeight(section) {
  return sectionWeights.get(String(section || "").toLowerCase()) || 2;
}

function addCandidate(groups, candidate) {
  const key = normalizeForKey(candidate.term);
  const existing = groups.get(key) || {
    key,
    term: candidate.term,
    title: titleCase(candidate.term),
    slug: slugify(candidate.term),
    category: candidate.category,
    occurrences: 0,
    articles: new Map(),
    sections: new Map(),
    relatedLinks: new Map(),
    mentions: [],
  };

  existing.occurrences += 1;
  existing.sections.set(candidate.section, (existing.sections.get(candidate.section) || 0) + 1);

  const articleInfo = existing.articles.get(candidate.article.slug) || {
    slug: candidate.article.slug,
    title: candidate.article.title,
    count: 0,
  };
  articleInfo.count += 1;
  existing.articles.set(candidate.article.slug, articleInfo);

  for (const slug of candidate.relatedLinks) {
    if (slug && slug !== candidate.article.slug) existing.relatedLinks.set(slug, (existing.relatedLinks.get(slug) || 0) + 1);
  }

  if (existing.mentions.length < maxMentionsPerTopic) {
    existing.mentions.push({
      articleSlug: candidate.article.slug,
      articleTitle: candidate.article.title,
      line: candidate.line,
      section: candidate.section,
      snippet: candidate.snippet,
    });
  }

  groups.set(key, existing);
}

function extractLineCandidates(article, line, lineNumber, section, covered, groups) {
  const maskedLine = maskProtectedRanges(line);
  const relatedLinks = [
    ...extractWikiLinks(line).map((link) => link.slug),
    ...article.related,
  ];

  for (const { category, pattern } of categoryPatterns) {
    pattern.lastIndex = 0;
    for (const match of maskedLine.matchAll(pattern)) {
      const rawTerm = match[1] || match[0];
      const term = cleanCandidateTerm(rawTerm);
      if (!isUsefulCandidate(term, covered)) continue;

      addCandidate(groups, {
        term,
        category: classifyTerm(term, category),
        article,
        line: lineNumber,
        section: section || "Article body",
        snippet: snippetFor(line, match.index, match[0].length),
        relatedLinks,
      });
    }
  }
}

function extractCandidates(articles, covered) {
  const groups = new Map();

  for (const article of articles) {
    let section = "";
    const lines = article.markdown.split("\n");

    for (const value of [...article.hazards, ...article.tasks, ...article.requiredDocuments]) {
      const term = cleanCandidateTerm(value);
      if (!isUsefulCandidate(term, covered)) continue;
      addCandidate(groups, {
        term,
        category: classifyTerm(term, "jobsite safety terms"),
        article,
        line: 1,
        section: "Frontmatter",
        snippet: `${value}`,
        relatedLinks: article.related,
      });
    }

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      section = currentSection(line, section);
      if (shouldSkipLine(line, section)) continue;
      extractLineCandidates(article, line, article.bodyStartLine + index, section, covered, groups);
    }
  }

  return [...groups.values()];
}

function scoreCandidate(candidate) {
  const articleCount = candidate.articles.size;
  const occurrenceScore = Math.min(candidate.occurrences, 30) * 3;
  const articleScore = articleCount * 22;
  const categoryScore = categoryWeights.get(candidate.category) || 10;
  const sectionScore = [...candidate.sections.entries()].reduce((sum, [section, count]) => sum + sectionWeight(section) * Math.min(count, 3), 0);
  return articleScore + occurrenceScore + categoryScore + sectionScore;
}

function priorityFor(candidate) {
  if (candidate.score >= 185 || (candidate.articles.size >= 6 && /forms|regulatory|hazards/.test(candidate.category))) return "Top priority";
  if (candidate.score >= 120 || candidate.articles.size >= 4) return "Medium priority";
  return "Low priority / watchlist";
}

function suggestedTier(candidate) {
  if (/regulatory|hazards|medical/.test(candidate.category) && candidate.articles.size >= 4) return "Tier 1";
  if (/forms|equipment|procedures/.test(candidate.category) || candidate.articles.size >= 3) return "Tier 2";
  return "Tier 3";
}

function whyItMatters(candidate) {
  const articleCount = candidate.articles.size;
  const sections = [...candidate.sections.keys()].filter(Boolean).slice(0, 3).join(", ");
  const base = `Mentioned ${candidate.occurrences} times across ${articleCount} articles`;
  if (candidate.category === "forms/documents/permits") {
    return `${base}, often in document or review workflow language. A dedicated page could define when the document is needed, who owns it, and how it links to field checklists.`;
  }
  if (candidate.category === "regulatory/legal phrases") {
    return `${base}, including ${sections || "legal/source context"}. It may need one source-checked reference page so legal meaning is not repeated differently across articles.`;
  }
  if (candidate.category === "hazards") {
    return `${base}. A hazard page could centralize controls, warning signs, related documents, and emergency triggers.`;
  }
  if (candidate.category === "medical/first aid terms") {
    return `${base}. A short medical/emergency reference page could keep field direction consistent without turning articles into medical advice.`;
  }
  if (candidate.category === "equipment") {
    return `${base}. Equipment-specific guidance may deserve one page for inspection, limits, compatibility, and required records.`;
  }
  if (candidate.category === "procedures") {
    return `${base}. A procedure page could separate legal requirements, best practice, sample steps, and checklist items.`;
  }
  return `${base}. It appears often enough to watch as a possible worker-language article or redirect.`;
}

function finalizeCandidates(candidates) {
  return candidates
    .filter((candidate) => candidate.articles.size >= minDistinctArticles)
    .map((candidate) => {
      const score = scoreCandidate(candidate);
      return {
        ...candidate,
        score,
        priority: priorityFor({ ...candidate, score }),
        tier: suggestedTier(candidate),
      };
    })
    .sort((a, b) => b.score - a.score || b.articles.size - a.articles.size || a.title.localeCompare(b.title));
}

function topRelatedLinks(candidate, articleBySlug) {
  return [...candidate.relatedLinks.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([slug]) => {
      const article = articleBySlug.get(slug);
      return article ? `[[${slug}|${article.title}]]` : `[[${slug}]]`;
    });
}

function buildReport({ articles, candidates, covered, ignoredCount }) {
  const articleBySlug = new Map(articles.map((article) => [article.slug, article]));
  const byPriority = {
    "Top priority": candidates.filter((candidate) => candidate.priority === "Top priority"),
    "Medium priority": candidates.filter((candidate) => candidate.priority === "Medium priority"),
    "Low priority / watchlist": candidates.filter((candidate) => candidate.priority === "Low priority / watchlist"),
  };

  const lines = [
    "# Wiki Missing Topic Suggestions",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This report proposes missing wiki article topics only. It does not edit article Markdown or create topics automatically.",
    "",
    "## Summary",
    "",
    `- Articles scanned: ${articles.length}`,
    `- Existing coverage terms: ${covered.size}`,
    `- Prioritized missing topics: ${candidates.length}`,
    `- Ignored noisy/covered candidate phrases: ${ignoredCount}`,
    `- Minimum distinct articles required: ${minDistinctArticles}`,
    "",
    "| Priority | Count |",
    "| --- | ---: |",
    `| Top priority | ${byPriority["Top priority"].length} |`,
    `| Medium priority | ${byPriority["Medium priority"].length} |`,
    `| Low priority / watchlist | ${byPriority["Low priority / watchlist"].length} |`,
    "",
  ];

  for (const [heading, items] of Object.entries(byPriority)) {
    lines.push(`## ${heading}`, "");
    if (!items.length) {
      lines.push("- No suggestions in this band.", "");
      continue;
    }

    for (const candidate of items) {
      const related = topRelatedLinks(candidate, articleBySlug);
      lines.push(
        `### ${candidate.title}`,
        "",
        `- Suggested slug: \`${candidate.slug}\``,
        `- Category: ${candidate.category}`,
        `- Suggested first article tier: ${candidate.tier}`,
        `- Priority score: ${candidate.score}`,
        `- Occurrences: ${candidate.occurrences} mentions across ${candidate.articles.size} articles`,
        `- Why it matters: ${whyItMatters(candidate)}`,
        `- Suggested related links: ${related.length ? related.join(", ") : "None found from nearby context"}`,
        "- Articles where it appears:",
      );

      for (const mention of candidate.mentions) {
        lines.push(
          `  - ${mention.articleTitle} (${mention.articleSlug}), line ${mention.line}, ${mention.section}: ${mention.snippet}`,
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function printSummary({ articles, candidates }) {
  console.log("Wiki missing-topic proposal report built.");
  console.log(`- Articles scanned: ${articles.length}`);
  console.log(`- Prioritized missing topics: ${candidates.length}`);
  console.log("- Top 15 suggestions:");
  for (const candidate of candidates.slice(0, 15)) {
    console.log(`  ${candidate.title} (${candidate.category}, ${candidate.articles.size} articles, score ${candidate.score})`);
  }
  if (candidates.length > 15) console.log(`  ...${candidates.length - 15} more suggestions in report`);
  console.log("- Report: docs/wiki-missing-topic-suggestions.md");
}

const files = await markdownFiles();
const articles = await Promise.all(files.map(async (path) => articleFromMarkdown(path, await readFile(path, "utf8"))));
const covered = buildCoverage(articles);
const rawCandidates = extractCandidates(articles, covered);
const candidates = finalizeCandidates(rawCandidates);
const ignoredCount = rawCandidates.reduce((sum, candidate) => sum + candidate.occurrences, 0) - candidates.reduce((sum, candidate) => sum + candidate.occurrences, 0);
const report = buildReport({ articles, candidates, covered, ignoredCount });

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${report}\n`);
printSummary({ articles, candidates });
