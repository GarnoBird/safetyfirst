import { safetyLabData } from "../src/safetyLabData.js";

const errors = [];
const expectedQuizCount = 23;
const expectedQuestionCount = 230;

if (!safetyLabData.toolboxTalks?.length) errors.push("No toolbox talks in generated data.");
if (!safetyLabData.quizzes?.length) errors.push("No quizzes in generated data.");
if (!safetyLabData.checklists?.length) errors.push("No checklists in generated data.");
if (!safetyLabData.forms?.length) errors.push("No forms in generated data.");

const totalQuestions = (safetyLabData.quizzes || []).reduce(
  (total, quiz) => total + (quiz.questions?.length || 0),
  0,
);

if (safetyLabData.quizzes?.length !== expectedQuizCount) {
  errors.push(`Expected ${expectedQuizCount} quizzes, found ${safetyLabData.quizzes?.length || 0}`);
}

if (totalQuestions !== expectedQuestionCount) {
  errors.push(`Expected ${expectedQuestionCount} total quiz questions, found ${totalQuestions}`);
}

requireUniqueSignatures(
  "toolbox talk body",
  safetyLabData.toolboxTalks || [],
  (talk) =>
    [
      talk.keyMessage,
      ...(talk.discussionPoints || []),
      ...(talk.questionsForCrew || []),
      talk.supervisorDemo,
      talk.signOffPrompt,
    ].join(" | "),
);
requireUniqueSignatures(
  "checklist item set",
  safetyLabData.checklists || [],
  (checklist) => (checklist.items || []).join(" | "),
);
requireUniqueSignatures("form field set", safetyLabData.forms || [], (form) => (form.fields || []).join(" | "));
requireUniqueSignatures(
  "quiz prompt set",
  safetyLabData.quizzes || [],
  (quiz) => (quiz.questions || []).map((question) => question.prompt).join(" | "),
);

for (const talk of safetyLabData.toolboxTalks || []) {
  if (!talk.title || !talk.keyMessage || !talk.sourceReviewNote?.length) {
    errors.push(`${talk.id}: toolbox talk missing title, key message, or source/review note`);
  }
}

for (const quiz of safetyLabData.quizzes || []) {
  if (quiz.questions?.length !== 10) {
    errors.push(`${quiz.id}: expected 10 quiz questions, found ${quiz.questions?.length || 0}`);
  }

  if (!quiz.reviewFlag?.includes("Needs source review") || !quiz.sourceReviewNote?.length) {
    errors.push(`${quiz.id}: missing needs-source-review flag or source/review note`);
  }

  const answerLetters = new Set((quiz.questions || []).map((question) => question.answer));
  for (const letter of ["A", "B", "C", "D"]) {
    if (!answerLetters.has(letter)) {
      errors.push(`${quiz.id}: quiz answer key does not use ${letter}`);
    }
  }

  for (const question of quiz.questions || []) {
    if (!question.prompt || !question.answer || !question.explanation || question.choices?.length !== 4) {
      errors.push(`${quiz.id}: question ${question.number} is incomplete`);
    }
    if (!question.choices?.some((choice) => choice.letter === question.answer)) {
      errors.push(`${quiz.id}: question ${question.number} answer does not match a choice`);
    }
  }
}

for (const checklist of safetyLabData.checklists || []) {
  if (!checklist.title || !checklist.items?.length || !checklist.sourceReviewNote?.length) {
    errors.push(`${checklist.id}: checklist missing title, items, or source/review note`);
  }
}

for (const form of safetyLabData.forms || []) {
  if (!form.title || !form.fields?.length || !form.sourceReviewNote?.length) {
    errors.push(`${form.id}: form missing title, fields, or source/review note`);
  }
}

if (errors.length) {
  console.error("Safety Lab data verification failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Safety Lab data verification passed:");
console.log(`- ${safetyLabData.toolboxTalks.length} toolbox talks`);
console.log(`- ${safetyLabData.quizzes.length} quizzes`);
console.log(`- ${safetyLabData.checklists.length} checklists`);
console.log(`- ${safetyLabData.forms.length} forms`);

function requireUniqueSignatures(label, items, getSignature) {
  const signatures = new Map();
  for (const item of items) {
    const signature = normalizeSignature(getSignature(item));
    if (signatures.has(signature)) {
      errors.push(`${item.id}: duplicate ${label} also used by ${signatures.get(signature)}`);
    } else {
      signatures.set(signature, item.id);
    }
  }
}

function normalizeSignature(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
