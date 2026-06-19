import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reviewPhrase = "Needs verification against current WorkSafeBC/OHS source.";

const directories = {
  toolboxTalks: "toolbox-talks",
  quizzes: "training",
  checklists: "checklists",
  forms: "forms",
};

const errors = [];

async function markdownFiles(dir) {
  const entries = await readdir(join(root, dir), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(dir, entry.name))
    .sort();
}

async function readMarkdown(path) {
  return readFile(join(root, path), "utf8");
}

function slugFromPath(path) {
  return path
    .split("/")
    .pop()
    .replace(/\.md$/, "")
    .replace(/^\d+-/, "");
}

function titleFromMarkdown(content, fallback) {
  return content.match(/^#\s+(.+)$/m)?.[1].trim() || fallback;
}

function fieldValue(content, field) {
  return content.match(new RegExp(`^${escapeRegExp(field)}:\\s*(.+)$`, "m"))?.[1].trim() || "";
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

function bulletList(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- \[[ xX]\]\s*/, "").replace(/^- /, "").trim())
    .filter(Boolean);
}

function paragraph(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("- "))
    .join(" ")
    .trim();
}

function parseChoices(block) {
  return ["A", "B", "C", "D"]
    .map((letter) => ({
      letter,
      text: block.match(new RegExp(`^${letter}\\.\\s+(.+)$`, "m"))?.[1].trim() || "",
    }))
    .filter((choice) => choice.text);
}

function parseQuizQuestions(content) {
  const headings = [...content.matchAll(/^## (\d+)\.\s+(.+)$/gm)];
  return headings.map((match, index) => {
    const start = match.index + match[0].length;
    const next = headings[index + 1];
    const source = content.slice(start).match(/^## Source\/review note$/m);
    const relativeEnd = next
      ? next.index - start
      : source
        ? source.index
        : content.length - start;
    const block = content.slice(start, start + relativeEnd).trim();
    return {
      number: Number(match[1]),
      prompt: match[2].trim(),
      choices: parseChoices(block),
      answer: block.match(/^Answer:\s+(.+)$/m)?.[1].trim() || "",
      explanation: block.match(/^Explanation:\s+(.+)$/m)?.[1].trim() || "",
    };
  });
}

async function parseToolboxTalk(path) {
  const content = await readMarkdown(path);
  const title = titleFromMarkdown(content, slugFromPath(path));
  const parsedTopicArea = fieldValue(content, "Topic area");
  return {
    id: slugFromPath(path),
    title,
    path,
    duration: fieldValue(content, "Duration"),
    audience: fieldValue(content, "Audience"),
    topicArea: inferTalkTopic(title, parsedTopicArea),
    reviewStatus: fieldValue(content, "Review status"),
    keyMessage: paragraph(section(content, "Key message")),
    discussionPoints: bulletList(section(content, "Discussion points")),
    questionsForCrew: bulletList(section(content, "Questions for crew")),
    supervisorDemo: paragraph(section(content, "Supervisor demonstration")),
    signOffPrompt: paragraph(section(content, "Sign-off prompt")),
    sourceReviewNote: sanitizeReviewNote(bulletList(section(content, "Source/review note"))),
  };
}

function inferTalkTopic(title, fallback) {
  const value = title.toLowerCase();
  const rules = [
    ["fall protection", ["tie-off", "guardrail", "fall rescue", "harness"]],
    ["ladders and scaffolds", ["ladder", "scaffold"]],
    ["excavation and trenching", ["trench", "utility"]],
    ["confined spaces", ["confined", "atmospheric"]],
    ["silica and dust", ["silica", "dust", "hepa", "respirator"]],
    ["WHMIS/SDS", ["whmis", "sds", "chemical"]],
    ["PPE", ["eye", "visibility", "hearing", "glove"]],
    ["first aid", ["first aid", "aed", "cardiac"]],
    ["incident reporting", ["incident", "near miss"]],
    ["refusing unsafe work", ["refusing unsafe"]],
    ["site orientation", ["new worker", "orientation"]],
    ["tool and equipment safety", ["tool", "extension cord"]],
    ["electrical safety", ["power line", "temporary power"]],
    ["lockout/tagout", ["lockout", "stored energy"]],
    ["mobile equipment", ["mobile equipment", "spotter", "seat belt", "rollover"]],
    ["cranes/rigging", ["crane", "rigging", "suspended load"]],
    ["traffic control", ["traffic", "pedestrian"]],
    ["heat/cold stress", ["heat", "cold"]],
    ["violence/harassment", ["violence", "harassment", "respectful"]],
    ["supervisor duties", ["supervisor"]],
    ["prime contractor/site coordination", ["prime contractor"]],
    ["emergency response", ["emergency", "fire extinguisher", "hot work"]],
    ["housekeeping", ["housekeeping"]],
  ];

  const match = rules.find(([, keywords]) => keywords.some((keyword) => value.includes(keyword)));
  return match ? match[0] : fallback;
}

function sanitizeReviewNote(items) {
  const filtered = items.filter((item) => !item.startsWith("Source candidate:"));
  return filtered.length ? filtered : items;
}

async function parseQuiz(path) {
  const content = await readMarkdown(path);
  const title = titleFromMarkdown(content, slugFromPath(path));
  return {
    id: slugFromPath(path),
    title,
    path,
    status: fieldValue(content, "Status"),
    questionsLabel: fieldValue(content, "Questions"),
    passThreshold: fieldValue(content, "Suggested pass threshold"),
    reviewFlag: fieldValue(content, "Review flag"),
    questions: parseQuizQuestions(content),
    sourceReviewNote: bulletList(section(content, "Source/review note")),
  };
}

async function parseChecklist(path) {
  const content = await readMarkdown(path);
  const title = titleFromMarkdown(content, slugFromPath(path));
  return {
    id: slugFromPath(path),
    title,
    path,
    status: fieldValue(content, "Status"),
    jurisdiction: fieldValue(content, "Jurisdiction"),
    reviewStatus: fieldValue(content, "Review status"),
    use: paragraph(section(content, "Use")),
    items: bulletList(section(content, "Checklist")),
    notesTemplate: bulletList(section(content, "Notes / deficiencies")),
    sourceReviewNote: bulletList(section(content, "Sources / review needed")),
  };
}

async function parseForm(path) {
  const content = await readMarkdown(path);
  const title = titleFromMarkdown(content, slugFromPath(path));
  return {
    id: slugFromPath(path),
    title,
    path,
    status: fieldValue(content, "Status"),
    reviewStatus: fieldValue(content, "Review status"),
    fields: bulletList(section(content, "Form fields")).map((item) => item.replace(/:$/, "")),
    privacyNote: paragraph(section(content, "Privacy and sensitivity note")),
    sourceReviewNote: bulletList(section(content, "Source/review note")),
  };
}

function validate(data) {
  if (!data.toolboxTalks.length) errors.push("No toolbox talks parsed.");
  if (!data.quizzes.length) errors.push("No quizzes parsed.");
  if (!data.checklists.length) errors.push("No checklists parsed.");
  if (!data.forms.length) errors.push("No forms parsed.");

  requireUniqueSignatures(
    "toolbox talk body",
    data.toolboxTalks,
    (talk) =>
      [
        talk.keyMessage,
        ...talk.discussionPoints,
        ...talk.questionsForCrew,
        talk.supervisorDemo,
        talk.signOffPrompt,
      ].join(" | "),
  );
  requireUniqueSignatures("checklist item set", data.checklists, (checklist) => checklist.items.join(" | "));
  requireUniqueSignatures("form field set", data.forms, (form) => form.fields.join(" | "));
  requireUniqueSignatures(
    "quiz prompt set",
    data.quizzes,
    (quiz) => quiz.questions.map((question) => question.prompt).join(" | "),
  );

  for (const talk of data.toolboxTalks) {
    if (!talk.title || !talk.keyMessage || !talk.sourceReviewNote.length) {
      errors.push(`${talk.path}: missing title, key message, or source/review note`);
    }
  }

  for (const quiz of data.quizzes) {
    if (quiz.questions.length !== 10) {
      errors.push(`${quiz.path}: expected 10 questions, found ${quiz.questions.length}`);
    }
    const answerLetters = new Set(quiz.questions.map((question) => question.answer));
    for (const letter of ["A", "B", "C", "D"]) {
      if (!answerLetters.has(letter)) {
        errors.push(`${quiz.path}: quiz answer key does not use ${letter}`);
      }
    }
    for (const question of quiz.questions) {
      if (!question.answer || !question.explanation || question.choices.length !== 4) {
        errors.push(`${quiz.path}: question ${question.number} missing answer, explanation, or choices`);
      }
      if (!question.choices.some((choice) => choice.letter === question.answer)) {
        errors.push(`${quiz.path}: question ${question.number} answer does not match a choice`);
      }
    }
  }

  for (const checklist of data.checklists) {
    if (!checklist.items.length || !checklist.sourceReviewNote.join(" ").includes(reviewPhrase)) {
      errors.push(`${checklist.path}: missing checklist items or review note`);
    }
  }

  for (const form of data.forms) {
    if (!form.fields.length || !form.sourceReviewNote.join(" ").includes(reviewPhrase)) {
      errors.push(`${form.path}: missing fields or review note`);
    }
  }
}

function requireUniqueSignatures(label, items, getSignature) {
  const signatures = new Map();
  for (const item of items) {
    const signature = normalizeSignature(getSignature(item));
    if (signatures.has(signature)) {
      errors.push(`${item.path}: duplicate ${label} also used by ${signatures.get(signature)}`);
    } else {
      signatures.set(signature, item.path);
    }
  }
}

function normalizeSignature(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  const [talkFiles, quizFiles, checklistFiles, formFiles] = await Promise.all([
    markdownFiles(directories.toolboxTalks),
    markdownFiles(directories.quizzes),
    markdownFiles(directories.checklists),
    markdownFiles(directories.forms),
  ]);

  const data = {
    generatedAt: new Date().toISOString(),
    toolboxTalks: await Promise.all(talkFiles.map(parseToolboxTalk)),
    quizzes: await Promise.all(quizFiles.map(parseQuiz)),
    checklists: await Promise.all(checklistFiles.map(parseChecklist)),
    forms: await Promise.all(formFiles.map(parseForm)),
  };

  data.counts = {
    toolboxTalks: data.toolboxTalks.length,
    quizzes: data.quizzes.length,
    checklists: data.checklists.length,
    forms: data.forms.length,
  };

  validate(data);
  if (errors.length) {
    console.error("Safety Lab data build failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  const output = `// Generated by scripts/build-safety-lab-data.js. Do not edit by hand.\nexport const safetyLabData = ${JSON.stringify(data, null, 2)};\n`;
  await writeFile(join(root, "src/safetyLabData.js"), output, "utf8");

  console.log("Safety Lab data built:");
  console.log(`- ${data.counts.toolboxTalks} toolbox talks`);
  console.log(`- ${data.counts.quizzes} quizzes`);
  console.log(`- ${data.counts.checklists} checklists`);
  console.log(`- ${data.counts.forms} forms`);
}

await main();
