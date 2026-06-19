import { safetyLabData } from "../src/safetyLabData.js";
import { safetyPacks, searchSafetyPacks } from "../src/safetyPacks.js";
import { wikiArticles } from "../src/wikiContent.js";

const errors = [];
const expectedPackCount = 10;

const articleSlugs = new Set(wikiArticles.map((article) => article.slug));
const talkIds = new Set(safetyLabData.toolboxTalks.map((talk) => talk.id));
const checklistIds = new Set(safetyLabData.checklists.map((checklist) => checklist.id));
const quizIds = new Set(safetyLabData.quizzes.map((quiz) => quiz.id));
const formIds = new Set(safetyLabData.forms.map((form) => form.id));

if (!safetyPacks.length) errors.push("No safety packs defined.");
if (safetyPacks.length !== expectedPackCount) {
  errors.push(`Expected ${expectedPackCount} safety packs, found ${safetyPacks.length}.`);
}

requireUnique("pack id", safetyPacks.map((pack) => pack.id));
requireSearch("silica", "concrete-cutting-silica");
requireSearch("tie off", "open-slab-edge-fall-protection");
requireSearch("crane pick", "crane-pick-rigging");

for (const pack of safetyPacks) {
  requireField(pack, "id");
  requireField(pack, "title");
  requireField(pack, "scenario");
  requireField(pack, "reviewNotice");
  requireList(pack, "keywords");
  requireList(pack, "hazards");
  requireList(pack, "requiredDocuments");
  requireList(pack, "printableSections");

  requireReferences(pack, "wikiSlugs", articleSlugs, "wiki article");
  requireReferences(pack, "toolboxTalkIds", talkIds, "toolbox talk");
  requireReferences(pack, "checklistIds", checklistIds, "checklist");
  requireReferences(pack, "quizIds", quizIds, "quiz");
  requireReferences(pack, "formIds", formIds, "form");
}

if (errors.length) {
  console.error("Safety pack verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Safety pack verification passed:");
console.log(`- ${safetyPacks.length} safety packs`);
console.log("- Search checks: silica, tie off, crane pick");

function requireField(pack, field) {
  if (!String(pack[field] || "").trim()) {
    errors.push(`${pack.id || "unknown pack"}: missing ${field}`);
  }
}

function requireList(pack, field) {
  if (!Array.isArray(pack[field]) || !pack[field].length) {
    errors.push(`${pack.id || "unknown pack"}: missing ${field}`);
  }
}

function requireReferences(pack, field, validIds, label) {
  requireList(pack, field);

  for (const id of pack[field] || []) {
    if (!validIds.has(id)) {
      errors.push(`${pack.id}: unknown ${label} reference "${id}" in ${field}`);
    }
  }
}

function requireUnique(label, values) {
  const seen = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      errors.push(`Duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }
}

function requireSearch(query, expectedTopId) {
  const [topResult] = searchSafetyPacks(query);
  if (topResult?.id !== expectedTopId) {
    errors.push(
      `Search "${query}" should rank "${expectedTopId}" first, found "${topResult?.id || "none"}".`,
    );
  }
}
