import {
  getRegulationById,
  getSourceById,
  getSourceNoteById,
  wikiArticles,
  wikiSourceCoverage,
  wikiSourceNotes,
} from "../src/wikiContent.js";

const errors = [];
const articleMap = new Map(wikiArticles.map((article) => [article.slug, article]));
const sourceNoteIds = new Set(wikiSourceNotes.map((note) => note.id));

if (!wikiSourceNotes.length) {
  errors.push("expected generated source notes; found zero");
}

if (wikiSourceCoverage.articleCount !== wikiArticles.length) {
  errors.push(
    `source coverage article count ${wikiSourceCoverage.articleCount} does not match wiki article count ${wikiArticles.length}`,
  );
}

if (wikiSourceCoverage.articlesMissingSourceNotes?.length) {
  errors.push(
    `articles missing source notes: ${wikiSourceCoverage.articlesMissingSourceNotes.join(", ")}`,
  );
}

for (const article of wikiArticles) {
  if (!(article.sourceNoteIds || []).length) {
    errors.push(`${article.slug}: missing sourceNoteIds`);
  }

  for (const id of article.sourceIds || []) {
    if (!getSourceById(id)) errors.push(`${article.slug}: unknown source id "${id}"`);
  }

  for (const id of article.regulationRefs || []) {
    if (!getRegulationById(id)) errors.push(`${article.slug}: unknown regulation reference "${id}"`);
  }

  for (const id of article.citationIds || []) {
    if (!getSourceById(id) && !getRegulationById(id)) {
      errors.push(`${article.slug}: unknown citation id "${id}"`);
    }
  }

  for (const id of article.sourceNoteIds || []) {
    if (!getSourceNoteById(id)) {
      errors.push(`${article.slug}: missing source note "${id}"`);
    }
  }
}

for (const note of wikiSourceNotes) {
  if (!note.id || !note.title || !note.publisher || !note.url || !note.lastChecked) {
    errors.push(`${note.id || note.markdownPath}: source note missing required metadata`);
  }

  for (const id of note.sourceIds || []) {
    if (!getSourceById(id)) errors.push(`${note.id}: unknown source id "${id}"`);
  }

  for (const id of note.regulationRefs || []) {
    if (!getRegulationById(id)) errors.push(`${note.id}: unknown regulation reference "${id}"`);
  }

  for (const id of note.citations || []) {
    if (!getSourceById(id) && !getRegulationById(id)) {
      errors.push(`${note.id}: unknown citation id "${id}"`);
    }
  }

  for (const slug of note.relatedArticles || []) {
    if (!articleMap.has(slug)) {
      errors.push(`${note.id}: related article "${slug}" is missing`);
    }
  }
}

for (const id of sourceNoteIds) {
  if (!getSourceNoteById(id)) errors.push(`source note map missing "${id}"`);
}

if (errors.length) {
  console.error("Wiki source verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Wiki source verification passed for ${wikiArticles.length} articles.`);
console.log(`- Source notes: ${wikiSourceNotes.length}`);
console.log(`- Unresolved source-review articles: ${wikiSourceCoverage.unresolvedSourceReviewArticles.length}`);
