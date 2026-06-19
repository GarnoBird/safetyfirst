import { safetyLabData } from "../src/safetyLabData.js";

const errors = [];

if (!safetyLabData.toolboxTalks?.length) errors.push("No toolbox talks in generated data.");
if (!safetyLabData.quizzes?.length) errors.push("No quizzes in generated data.");
if (!safetyLabData.checklists?.length) errors.push("No checklists in generated data.");
if (!safetyLabData.forms?.length) errors.push("No forms in generated data.");

for (const talk of safetyLabData.toolboxTalks || []) {
  if (!talk.title || !talk.keyMessage || !talk.sourceReviewNote?.length) {
    errors.push(`${talk.id}: toolbox talk missing title, key message, or source/review note`);
  }
}

for (const quiz of safetyLabData.quizzes || []) {
  if (quiz.questions?.length !== 10) {
    errors.push(`${quiz.id}: expected 10 quiz questions, found ${quiz.questions?.length || 0}`);
  }

  for (const question of quiz.questions || []) {
    if (!question.prompt || !question.answer || !question.explanation || question.choices?.length !== 4) {
      errors.push(`${quiz.id}: question ${question.number} is incomplete`);
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
