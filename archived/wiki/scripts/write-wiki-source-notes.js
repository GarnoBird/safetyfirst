import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { regulationRefs, wikiArticles, wikiSources } from "../src/wikiContent.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceNoteDir = join(root, "content/source-notes");
const lastChecked = "2026-06-20";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function yaml(data) {
  return Object.entries(data)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map((item) => `  - "${escapeYaml(item)}"`).join("\n")}\n`;
      }
      return `${key}: "${escapeYaml(value)}"\n`;
    })
    .join("");
}

function escapeYaml(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function sourceNoteMarkdown(note) {
  return `---\n${yaml(note.frontmatter)}---\n\n# ${note.frontmatter.title}\n\n## Source scope\n\n${note.scope}\n\n## Plain-language review notes\n\n${note.notes.map((item) => `- ${item}`).join("\n")}\n\n## Review handling\n\n- Last checked: ${lastChecked}.\n- Use this note to support article review, not as a substitute for the official source.\n- Keep article text original and paraphrased. Do not copy manuals, proprietary procedures, or long source passages.\n\n## Related article review targets\n\n${note.frontmatter.relatedArticles.length ? note.frontmatter.relatedArticles.map((slug) => `- [[${slug}]]`).join("\n") : "- No direct article targets yet."}\n`;
}

const partRefs = regulationRefs.filter((ref) => /^ohsr-part-\d+$/.test(ref.id));
const exactRefs = regulationRefs.filter((ref) => /^ohsr-\d+-/.test(ref.id));

await mkdir(sourceNoteDir, { recursive: true });

const notes = [];

for (const partRef of partRefs) {
  const partNumber = partRef.id.replace("ohsr-part-", "");
  const citations = exactRefs.filter((ref) => ref.id.startsWith(`ohsr-${partNumber}-`));
  const relatedArticles = wikiArticles
    .filter((article) =>
      [...(article.regulationRefs || []), ...(article.citationIds || [])].some(
        (id) => id === partRef.id || id.startsWith(`ohsr-${partNumber}-`),
      ),
    )
    .map((article) => article.slug);

  notes.push({
    file: `worksafebc-ohsr-part-${Number(partNumber)}.md`,
    frontmatter: {
      id: `worksafebc-ohsr-part-${Number(partNumber)}`,
      title: `${partRef.instrument} ${partRef.part}: ${partRef.title}`,
      publisher: "WorkSafeBC",
      sourceType: "Regulation",
      url: partRef.url,
      jurisdiction: "BC",
      lastChecked,
      sourceIds: ["worksafebc-ohs-regulation"],
      regulationRefs: [partRef.id],
      citations: citations.map((ref) => ref.id),
      relatedArticles: unique(relatedArticles).slice(0, 35),
    },
    scope: `${partRef.title} is an official WorkSafeBC OHS Regulation source used to check BC construction safety articles that cite ${partRef.part}. This note records the source location, article targets, and citation coverage for review tracking.`,
    notes: [
      `Reviewers should confirm each article's legal bullets against the current ${partRef.part} wording before removing source-review flags.`,
      citations.length
        ? `This note currently tracks ${citations.length} exact section citation target${citations.length === 1 ? "" : "s"} used by wiki articles.`
        : "This note currently tracks the regulation part as a broad source; exact section citations should be added when article claims need them.",
      "Plain-language summaries should explain what the source is used for and should avoid quoting regulatory text except for short section names.",
      "If WorkSafeBC changes this part, affected articles should move to Needs update until legal/source review is complete.",
    ],
  });
}

for (const source of wikiSources) {
  const relatedArticles = wikiArticles
    .filter((article) => (article.sourceIds || []).includes(source.id) || (article.citationIds || []).includes(source.id))
    .map((article) => article.slug);

  notes.push({
    file: `source-note-${slugify(source.id)}.md`,
    frontmatter: {
      id: `source-note-${source.id}`,
      title: source.title,
      publisher: source.publisher,
      sourceType: source.type,
      url: source.url,
      jurisdiction: source.jurisdiction || "BC",
      lastChecked,
      sourceIds: [source.id],
      regulationRefs: [],
      citations: [source.id],
      relatedArticles: unique(relatedArticles).slice(0, 35),
    },
    scope: `${source.title} is a public ${source.type.toLowerCase()} source from ${source.publisher}. The wiki uses it as supporting context only according to the source hierarchy and does not treat guidance or industry resources as legislation unless an official legal source supports that claim.`,
    notes: [
      source.note,
      "Use this source to strengthen plain-language explanations, practical controls, or reviewer context without copying manual text.",
      "Legal requirement bullets should still cite exact OHS Regulation, Act, or Code references where a legal claim is made.",
      "If this source changes, confirm whether affected article summaries, checklists, forms, or related field tools need updates.",
    ],
  });
}

for (const note of notes) {
  await writeFile(join(sourceNoteDir, note.file), sourceNoteMarkdown(note));
}

console.log(`Wrote ${notes.length} wiki source notes.`);
