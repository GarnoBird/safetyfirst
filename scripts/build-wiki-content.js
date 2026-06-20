import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { articleResourceLinks, workflowForArticle } from "../src/wikiCompletionData.js";
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

function countSourceReviewFlags(text) {
  return [...text.matchAll(/\{\{review:source\}\}/g)].length;
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

const defaultResourceLinks = {
  toolboxTalks: ["site-orientation-refresh", "housekeeping-and-access-routes"],
  checklists: ["daily-site-inspection"],
  quizzes: ["site-orientation-quiz"],
  forms: ["hazard-report", "toolbox-talk-attendance"],
};

const fieldToolRules = [
  {
    terms: ["fall", "guardrail", "edge", "opening", "roof", "harness", "anchor", "scaffold", "ladder", "swing stage", "work platform"],
    toolboxTalks: ["tie-off-planning-before-edge-work", "guardrails-and-floor-openings", "fall-rescue-readiness", "harness-inspection"],
    checklists: ["fall-protection", "ladders", "scaffolds"],
    quizzes: ["fall-protection-quiz", "ladders-and-scaffolds-quiz"],
    forms: ["equipment-inspection", "training-matrix", "hazard-report"],
  },
  {
    terms: ["silica", "dust", "respirator", "hepa", "wet cutting", "asbestos", "lead", "mould", "whmis", "chemical", "sds", "carbon monoxide", "ventilation"],
    toolboxTalks: ["silica-dust-controls", "wet-cutting-and-hepa-cleanup", "respirator-fit-and-seal-checks", "whmis-labels-and-sds-access"],
    checklists: ["silica-dust", "ppe", "whmis-sds"],
    quizzes: ["silica-and-dust-quiz", "ppe-quiz", "whmis-sds-quiz"],
    forms: ["hazard-report", "training-matrix", "site-safety-inspection"],
  },
  {
    terms: ["confined", "atmosphere", "entry permit", "rescue", "standby"],
    toolboxTalks: ["confined-space-entry-basics", "atmospheric-testing-awareness"],
    checklists: ["confined-space-pre-entry", "emergency-response"],
    quizzes: ["confined-spaces-quiz", "emergency-response-quiz"],
    forms: ["hazard-report", "incident-report", "training-matrix"],
  },
  {
    terms: ["excavation", "trench", "spoil", "utility", "underground", "shoring", "sloping"],
    toolboxTalks: ["trench-cave-in-warning-signs", "underground-utility-awareness"],
    checklists: ["excavations", "traffic-control"],
    quizzes: ["excavation-and-trenching-quiz"],
    forms: ["hazard-report", "site-safety-inspection"],
  },
  {
    terms: ["crane", "hoist", "rigging", "lift", "sling", "signaller", "suspended load"],
    toolboxTalks: ["crane-pick-communication", "rigging-inspection-basics", "exclusion-zones-under-suspended-loads"],
    checklists: ["mobile-equipment"],
    quizzes: ["cranes-rigging-quiz"],
    forms: ["equipment-inspection", "hazard-report"],
  },
  {
    terms: ["mobile equipment", "telehandler", "forklift", "skid steer", "delivery", "blind spot", "spotter"],
    toolboxTalks: ["mobile-equipment-blind-spots", "spotter-communication", "seat-belts-and-rollover-risk"],
    checklists: ["mobile-equipment"],
    quizzes: ["mobile-equipment-quiz"],
    forms: ["equipment-inspection", "site-safety-inspection", "hazard-report"],
  },
  {
    terms: ["traffic", "pedestrian", "tcp", "flagger", "high visibility", "lane", "delivery"],
    toolboxTalks: ["traffic-control-around-deliveries", "pedestrian-detours", "high-visibility-apparel"],
    checklists: ["traffic-control"],
    quizzes: ["traffic-control-quiz"],
    forms: ["site-safety-inspection", "hazard-report"],
  },
  {
    terms: ["first aid", "cardiac", "aed", "emergency", "evacuation", "fire", "hot work", "extinguisher", "muster"],
    toolboxTalks: ["first-aid-access-and-reporting", "aed-location-and-emergency-access", "cardiac-arrest-response-basics", "hot-work-fire-watch", "emergency-muster-and-headcount"],
    checklists: ["first-aid-kit-first-aid-room", "emergency-response", "hot-work"],
    quizzes: ["first-aid-quiz", "emergency-response-quiz"],
    forms: ["incident-report", "near-miss-report", "toolbox-talk-attendance"],
  },
  {
    terms: ["lockout", "de-energization", "electrical", "power line", "temporary power", "tool", "guard", "powder"],
    toolboxTalks: ["lockout-before-maintenance", "stored-energy-hazards", "overhead-power-line-awareness", "extension-cords-and-temporary-power", "power-tool-guards"],
    checklists: ["power-tools", "daily-site-inspection"],
    quizzes: ["electrical-safety-quiz", "lockout-tagout-quiz", "tool-and-equipment-safety-quiz"],
    forms: ["equipment-inspection", "hazard-report", "training-matrix"],
  },
  {
    terms: ["orientation", "young", "new worker", "supervisor", "prime", "worker rights", "refusal", "committee", "training record", "program"],
    toolboxTalks: ["site-orientation-refresh", "new-worker-questions", "refusing-unsafe-work", "prime-contractor-coordination", "supervisor-stop-work-expectations"],
    checklists: ["daily-site-inspection"],
    quizzes: ["site-orientation-quiz", "young-new-workers-quiz", "supervisor-duties-quiz", "prime-contractor-site-coordination-quiz"],
    forms: ["worker-orientation", "training-matrix", "subcontractor-safety-onboarding"],
  },
  {
    terms: ["inspection", "incident", "near miss", "corrective", "documentation", "notice", "report"],
    toolboxTalks: ["incident-and-near-miss-reporting", "site-orientation-refresh"],
    checklists: ["daily-site-inspection", "incident-follow-up"],
    quizzes: ["incident-reporting-quiz"],
    forms: ["incident-report", "near-miss-report", "corrective-action-log", "site-safety-inspection"],
  },
  {
    terms: ["ppe", "hard hat", "eye", "face", "glove", "boot", "hearing", "high visibility"],
    toolboxTalks: ["eye-and-face-protection", "hearing-protection", "glove-selection", "high-visibility-apparel"],
    checklists: ["ppe"],
    quizzes: ["ppe-quiz"],
    forms: ["equipment-inspection", "training-matrix"],
  },
];

function inferRelatedResources(article) {
  const haystack = normalizeForMatch(
    [
      article.slug,
      article.title,
      article.category,
      article.markdown,
      ...(article.aliases || []),
      ...(article.trades || []),
      ...(article.hazards || []),
      ...(article.tasks || []),
      ...(article.requiredDocuments || []),
      ...(article.related || []),
    ].join(" "),
  );

  const resources = {
    toolboxTalks: [],
    checklists: [],
    quizzes: [],
    forms: [],
  };

  for (const rule of fieldToolRules) {
    if (rule.terms.some((term) => haystack.includes(normalizeForMatch(term)))) {
      resources.toolboxTalks.push(...(rule.toolboxTalks || []));
      resources.checklists.push(...(rule.checklists || []));
      resources.quizzes.push(...(rule.quizzes || []));
      resources.forms.push(...(rule.forms || []));
    }
  }

  for (const key of Object.keys(resources)) {
    if (!resources[key].length) resources[key].push(...defaultResourceLinks[key]);
    resources[key] = unique(resources[key]).slice(0, 6);
  }

  return resources;
}

function mergeResourceLinks(explicit = {}, inferred = {}) {
  return {
    toolboxTalks: unique([...(explicit.toolboxTalks || []), ...(inferred.toolboxTalks || [])]),
    checklists: unique([...(explicit.checklists || []), ...(inferred.checklists || [])]),
    quizzes: unique([...(explicit.quizzes || []), ...(inferred.quizzes || [])]),
    forms: unique([...(explicit.forms || []), ...(inferred.forms || [])]),
  };
}

function sourceNoteIdsFor(citationIds, sourceIds) {
  return unique([
    ...citationIds
      .map((id) => {
        const exact = id.match(/^ohsr-(\d+)-/);
        const broad = id.match(/^ohsr-part-(\d+)$/);
        const part = exact?.[1] || broad?.[1];
        return part ? `worksafebc-ohsr-part-${Number(part)}` : "";
      })
      .filter(Boolean),
    ...sourceIds.map((id) => `source-note-${id}`),
  ]);
}

function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  const workflow = workflowForArticle(slug);
  const inferredResources = inferRelatedResources({
    slug,
    title,
    category: frontmatter.category || "Uncategorized",
    markdown,
    aliases: frontmatter.aliases || [],
    trades: frontmatter.trades || ["All construction trades"],
    hazards: frontmatter.hazards || [],
    tasks: frontmatter.tasks || [],
    requiredDocuments: frontmatter.requiredDocuments || [],
    related,
  });
  const linkedResources = mergeResourceLinks(articleResourceLinks[slug], inferredResources);

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
    reviewTier: frontmatter.reviewTier || workflow.reviewTier,
    maturity: frontmatter.maturity || workflow.maturity,
    reviewPriority: frontmatter.reviewPriority || workflow.reviewPriority,
    aliases: frontmatter.aliases || [],
    trades: frontmatter.trades || ["All construction trades"],
    hazards: frontmatter.hazards || [],
    tasks: frontmatter.tasks || [],
    requiredDocuments: frontmatter.requiredDocuments || [],
    sourceIds,
    regulationRefs,
    citationIds,
    citations: citationIds.map(sourceForCitation),
    sourceNoteIds: sourceNoteIdsFor(citationIds, sourceIds),
    sourceReviewFlagCount: countSourceReviewFlags(markdown),
    wikiLinks,
    outboundArticleLinks: unique([...wikiLinks, ...related]),
    backlinks: [],
    related,
    relatedToolboxTalks: unique([
      ...toArray(frontmatter.relatedToolboxTalks),
      ...(linkedResources.toolboxTalks || []),
    ]),
    relatedChecklists: unique([
      ...toArray(frontmatter.relatedChecklists),
      ...(linkedResources.checklists || []),
    ]),
    relatedQuizzes: unique([
      ...toArray(frontmatter.relatedQuizzes),
      ...(linkedResources.quizzes || []),
    ]),
    relatedForms: unique([
      ...toArray(frontmatter.relatedForms),
      ...(linkedResources.forms || []),
    ]),
    versionHistory: listItems(section(markdown, "Version history")),
    reviewerNotes: listItems(section(markdown, "Reviewer notes")),
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
