import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reviewPhrase = "Needs verification against current WorkSafeBC/OHS source.";

const expected = {
  docs: [
    "docs/source-policy.md",
    "docs/wiki-content-map.md",
    "docs/safety-wiki-review-report.md",
  ],
  topicCount: 23,
  toolboxTalkCount: 50,
  checklistCount: 17,
  formCount: 11,
  quizCount: 23,
};

const topicHeadings = [
  "## Plain-English summary",
  "## When this applies",
  "## Common hazards",
  "## Required controls / best-practice controls",
  "## Supervisor checklist",
  "## Worker checklist",
  "## Red flags / stop-work triggers",
  "## Toolbox talk outline",
  "## Training/competency notes",
  "## Inspection evidence to keep",
  "## Incident examples",
  "## Sources",
  "## Needs human review items",
];

const toolboxTalkHeadings = [
  "Duration:",
  "Audience:",
  "## Key message",
  "## Discussion points",
  "## Questions for crew",
  "## Supervisor demonstration",
  "## Sign-off prompt",
  "## Source/review note",
];

const errors = [];

async function markdownFiles(dir) {
  const fullDir = join(root, dir);
  const entries = await readdir(fullDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(dir, entry.name))
    .sort();
}

async function read(path) {
  return readFile(join(root, path), "utf8");
}

function requireIncludes(path, content, items) {
  for (const item of items) {
    if (!content.includes(item)) {
      errors.push(`${path}: missing "${item}"`);
    }
  }
}

function requireCount(label, actual, expectedCount) {
  if (actual !== expectedCount) {
    errors.push(`${label}: expected ${expectedCount}, found ${actual}`);
  }
}

function section(content, heading) {
  const headingMatch = [...content.matchAll(/^##\s+(.+)$/gm)].find(
    (match) => match[1].trim() === heading,
  );
  if (!headingMatch) return "";
  const start = headingMatch.index + headingMatch[0].length;
  const nextHeading = [...content.slice(start).matchAll(/^##\s+.+$/gm)][0];
  const end = nextHeading ? start + nextHeading.index : content.length;
  return content.slice(start, end).trim();
}

function requireUniqueSignatures(label, entries) {
  const signatures = new Map();
  for (const [path, value] of entries) {
    const signature = normalizeSignature(value);
    if (signatures.has(signature)) {
      errors.push(`${path}: duplicate ${label} also used by ${signatures.get(signature)}`);
    } else {
      signatures.set(signature, path);
    }
  }
}

function normalizeSignature(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

for (const doc of expected.docs) {
  try {
    const content = await read(doc);
    if (!content.includes(reviewPhrase)) {
      errors.push(`${doc}: missing review phrase`);
    }
  } catch {
    errors.push(`${doc}: missing`);
  }
}

const topicFiles = await markdownFiles("content/topics");
const talkFiles = await markdownFiles("toolbox-talks");
const checklistFiles = await markdownFiles("checklists");
const formFiles = await markdownFiles("forms");
const quizFiles = await markdownFiles("training");

requireCount("content/topics", topicFiles.length, expected.topicCount);
requireCount("toolbox-talks", talkFiles.length, expected.toolboxTalkCount);
requireCount("checklists", checklistFiles.length, expected.checklistCount);
requireCount("forms", formFiles.length, expected.formCount);
requireCount("training", quizFiles.length, expected.quizCount);

for (const path of topicFiles) {
  const content = await read(path);
  requireIncludes(path, content, topicHeadings);
  requireIncludes(path, content, [reviewPhrase]);
}

const talkSignatures = [];
for (const path of talkFiles) {
  const content = await read(path);
  requireIncludes(path, content, toolboxTalkHeadings);
  requireIncludes(path, content, [reviewPhrase]);
  talkSignatures.push([
    path,
    [
      section(content, "Key message"),
      section(content, "Discussion points"),
      section(content, "Questions for crew"),
      section(content, "Supervisor demonstration"),
      section(content, "Sign-off prompt"),
    ].join(" | "),
  ]);
}
requireUniqueSignatures("toolbox talk body", talkSignatures);

const checklistSignatures = [];
for (const path of checklistFiles) {
  const content = await read(path);
  requireIncludes(path, content, ["# ", "## Use", "## Checklist", "## Sources / review needed", reviewPhrase]);
  checklistSignatures.push([path, section(content, "Checklist")]);
}
requireUniqueSignatures("checklist item set", checklistSignatures);

const formSignatures = [];
for (const path of formFiles) {
  const content = await read(path);
  requireIncludes(path, content, ["# ", "## Form fields", "## Privacy and sensitivity note", "## Source/review note", reviewPhrase]);
  formSignatures.push([path, section(content, "Form fields")]);
}
requireUniqueSignatures("form field set", formSignatures);

const quizSignatures = [];
for (const path of quizFiles) {
  const content = await read(path);
  requireIncludes(path, content, [
    "Questions: 10",
    "Suggested pass threshold:",
    "Review flag: Needs source review",
    "## Source/review note",
    reviewPhrase,
  ]);

  const questionCount = (content.match(/^## \d+\. /gm) || []).length;
  const answers = [...content.matchAll(/^Answer:\s+([A-D])$/gm)].map((match) => match[1]);
  const answerCount = answers.length;
  if (questionCount !== 10) {
    errors.push(`${path}: expected 10 questions, found ${questionCount}`);
  }
  if (answerCount !== 10) {
    errors.push(`${path}: expected 10 answers, found ${answerCount}`);
  }
  for (const letter of ["A", "B", "C", "D"]) {
    if (!answers.includes(letter)) {
      errors.push(`${path}: quiz answer key does not use ${letter}`);
    }
  }
  quizSignatures.push([
    path,
    [...content.matchAll(/^## \d+\.\s+(.+)$/gm)].map((match) => match[1]).join(" | "),
  ]);
}
requireUniqueSignatures("quiz prompt set", quizSignatures);

if (errors.length) {
  console.error("Wiki expansion verification failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Wiki expansion verification passed:");
console.log(`- ${topicFiles.length} topic pages`);
console.log(`- ${talkFiles.length} toolbox talks`);
console.log(`- ${checklistFiles.length} checklists`);
console.log(`- ${formFiles.length} forms`);
console.log(`- ${quizFiles.length} quizzes`);
