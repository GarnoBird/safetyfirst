import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  regulationRefs,
  wikiArticles,
  wikiSources,
} from "../src/wikiContent.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(root, "content/articles");
const sourceIds = new Set(wikiSources.map((source) => source.id));
const regulationIds = new Set(regulationRefs.map((ref) => ref.id));
const articleBySlug = new Map(wikiArticles.map((article) => [article.slug, article]));

const categoryHubs = {
  "High-Risk Work": [
    "site-specific-safety-plan",
    "supervisor-duties",
    "workplace-inspections",
    "corrective-actions",
    "site-emergency-response-plan",
  ],
  "Safety Program & Documentation": [
    "prime-contractor-duties",
    "supervisor-duties",
    "worker-rights-and-responsibilities",
    "workplace-inspections",
    "corrective-actions",
  ],
  "Emergency & Medical": [
    "site-emergency-response-plan",
    "occupational-first-aid-requirements",
    "first-aid-assessment",
    "site-orientation",
    "incident-investigation",
  ],
  "Health Hazards": [
    "silica-exposure-control",
    "respirators",
    "whmis-basics",
    "ventilation",
    "dust-control-methods",
  ],
  "PPE & Equipment": [
    "ppe-basics",
    "site-orientation",
    "training-records",
    "workplace-inspections",
    "corrective-actions",
  ],
  "Construction Activities": [
    "site-specific-safety-plan",
    "fall-protection",
    "mobile-equipment",
    "traffic-control",
    "workplace-inspections",
  ],
  "Duties & Rights": [
    "prime-contractor-duties",
    "employer-duties",
    "supervisor-duties",
    "worker-rights-and-responsibilities",
    "ohs-program",
  ],
};

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function yamlScalar(value) {
  return String(value ?? "").replace(/"/g, '\\"');
}

function yamlArray(key, values) {
  const clean = unique(values || []);
  if (!clean.length) return `${key}: []`;
  return [`${key}:`, ...clean.map((value) => `  - "${yamlScalar(value)}"`)].join("\n");
}

function frontmatter(article, related, citationIds) {
  return [
    "---",
    `slug: "${article.slug}"`,
    `title: "${yamlScalar(article.title)}"`,
    `category: "${yamlScalar(article.category)}"`,
    `status: "Deep draft"`,
    `jurisdiction: "${yamlScalar(article.jurisdiction || "BC")}"`,
    `difficulty: "${yamlScalar(article.difficulty || "Basic")}"`,
    `confidenceLevel: "Source-cited deep draft"`,
    `lastReviewed: "${article.review?.lastReviewed || "2026-06-20"}"`,
    `nextReview: "${article.review?.nextReview || "2026-09-20"}"`,
    `legalReviewStatus: "${yamlScalar(article.review?.legalReviewStatus || "Needs qualified review")}"`,
    `safetyReviewStatus: "${yamlScalar(article.review?.safetyReviewStatus || "Needs field review")}"`,
    yamlArray("aliases", article.aliases),
    yamlArray("trades", article.trades || ["All construction trades"]),
    yamlArray("hazards", article.hazards),
    yamlArray("tasks", article.tasks),
    yamlArray("requiredDocuments", requiredDocuments(article)),
    yamlArray("sourceIds", articleSourceIds(article)),
    yamlArray("regulationRefs", articleRegulationRefs(article)),
    yamlArray("citations", citationIds),
    yamlArray("related", related),
    "---",
  ].join("\n");
}

function articleSourceIds(article) {
  return unique([
    ...(article.sourceIds || []),
    "worksafebc-ohs-regulation",
    "worksafebc-ohs-guidelines",
  ]).filter((id) => sourceIds.has(id));
}

function articleRegulationRefs(article) {
  return unique(article.regulationRefs || []).filter((id) => regulationIds.has(id));
}

function citationIdsFor(article) {
  return unique([
    ...articleRegulationRefs(article),
    ...articleSourceIds(article),
  ]).slice(0, 8);
}

function cite(citationIds, index) {
  return `{{cite:${citationIds[index % citationIds.length]}}}`;
}

function link(slug, fallback) {
  const article = articleBySlug.get(slug);
  return `[[${slug}|${article?.title || fallback || slug}]]`;
}

function requiredDocuments(article) {
  return unique([
    ...(article.requiredDocuments || []),
    "Site-specific safe work procedure",
    "Worker instruction or training record",
    "Inspection or pre-use check record",
    "Corrective action record when a deficiency is found",
  ]).slice(0, 8);
}

function selectRelated(article, index) {
  const candidates = [];
  const add = (values) => candidates.push(...values.filter((slug) => slug !== article.slug));

  add(article.related || []);
  add(categoryHubs[article.category] || []);
  add(
    wikiArticles
      .filter((candidate) => candidate.category === article.category && candidate.slug !== article.slug)
      .map((candidate) => candidate.slug),
  );
  add(
    wikiArticles
      .filter((candidate) =>
        candidate.slug !== article.slug &&
        (candidate.regulationRefs || []).some((ref) => (article.regulationRefs || []).includes(ref)),
      )
      .map((candidate) => candidate.slug),
  );
  add(
    wikiArticles
      .filter((candidate) =>
        candidate.slug !== article.slug &&
        (candidate.hazards || []).some((hazard) => (article.hazards || []).includes(hazard)),
      )
      .map((candidate) => candidate.slug),
  );

  const previous = wikiArticles[(index - 1 + wikiArticles.length) % wikiArticles.length];
  const next = wikiArticles[(index + 1) % wikiArticles.length];
  add([previous.slug, next.slug]);
  add(wikiArticles.map((candidate) => candidate.slug));

  return unique(candidates).slice(0, 12);
}

function list(values) {
  return values.map((value) => `- ${value}`).join("\n");
}

function ordered(values) {
  return values.map((value, index) => `${index + 1}. ${value}`).join("\n");
}

function plain(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value) {
  return plain(value).toLowerCase();
}

function taskPhrase(article) {
  return article.tasks?.length ? lower(article.tasks.join(", ")) : "this work";
}

function hazardPhrase(article) {
  return article.hazards?.length ? lower(article.hazards.join(", ")) : "the hazards from this task";
}

function articleMarkdown(article, index) {
  const related = selectRelated(article, index);
  const citations = citationIdsFor(article);
  const docs = requiredDocuments(article);
  const primaryRelated = related[0] || "site-specific-safety-plan";
  const secondaryRelated = related[1] || "workplace-inspections";
  const thirdRelated = related[2] || "corrective-actions";
  const fourthRelated = related[3] || "site-orientation";
  const hazardText = hazardPhrase(article);
  const taskText = taskPhrase(article);
  const topicText = lower(article.title);
  const docText = docs[0] || "site-specific safe work procedure";

  const summaryParagraphs = [
    `Use this page when ${taskText} could involve hazards or outcomes such as ${hazardText}. It gives supervisors and crews a plain-language starting point for the controls, documents, and stop-work triggers that should be checked before work starts.`,
    `${article.title} usually connects to other site controls, not just one task. Read it with ${link(primaryRelated)} and ${link(secondaryRelated)} when planning the work, especially if access, weather, equipment, public protection, or nearby trades could change the risk.`,
    `This is a source-cited draft, not a legal opinion. Legal points include citations where possible; anything marked source review needed must be checked by a qualified BC safety/source reviewer before it is used as a compliance checklist. ${cite(citations, 0)}`,
  ];

  const whenApplies = [
    `You are planning or supervising ${taskText}, and this topic affects the task. ${cite(citations, 1)}`,
    `The work could involve hazards or outcomes such as ${hazardText}, even if the trade or location is different.`,
    `The work could affect nearby trades, visitors, tenants, pedestrians, traffic, or the public.`,
    `Controls need to be chosen before production starts, not after a deficiency is found.`,
    `The crew, equipment, weather, access route, public interface, or work sequence has changed.`,
    `A required document such as ${lower(docText)} must be prepared, reviewed, updated, or kept available.`,
    `A worker is new to the task, unfamiliar with the site, or unsure which control applies.`,
  ];

  const legalRequirements = [
    `Confirm the applicable WorkSafeBC OHS Regulation part, guideline, policy, and any Workers Compensation Act duty before directing the work. ${cite(citations, 0)}`,
    `Identify the hazards connected to this work and control them before workers are exposed. ${cite(citations, 1)}`,
    `Provide workers with the information, instruction, training, supervision, PPE, and equipment needed for the task. ${cite(citations, 2)}`,
    `Keep legal duties separate from best practice notes, owner requirements, manufacturer instructions, and sample field procedures. {{review:source}}`,
    `Use required written plans, procedures, inspections, permits, assessments, or records when the cited source or site condition calls for them. ${cite(citations, 3)}`,
    `Stop and reassess the work when conditions no longer match the plan, a control is missing, or a worker reports an unsafe condition. ${cite(citations, 4)}`,
    `Coordinate the work with the prime contractor, employer, supervisor, affected workers, and nearby trades where overlapping work can create hazards. ${cite(citations, 5)}`,
    `Verify exact section numbers before treating this draft as a compliance checklist for enforcement, orders, permits, or legal advice. {{review:source}}`,
  ];

  const bestPractice = [
    `Before work starts, walk the area with the crew and check whether today's setup also needs controls covered in ${link(thirdRelated)}.`,
    `Use elimination, substitution, engineering, or isolation controls first when they are practicable; do not make PPE the whole plan.`,
    `Name the supervisor, qualified person, or competent worker who can approve changes in the field.`,
    `Use photos, sketches, labels, tags, or simple maps when they help workers understand the control without exposing private information.`,
    `Check nearby entrances, laydown areas, adjacent trades, and public routes for the same hazard before closing the action.`,
    `Review the procedure after an incident, near miss, failed inspection, crew change, equipment change, or weather event.`,
    `Keep field instructions short enough to use in a toolbox talk, but specific enough that the crew knows what to do.`,
  ];

  const requiredDocumentItems = docs.map((doc, docIndex) => {
    const reason = [
      "defines the control, location, responsible person, and review trigger",
      "confirms the site condition was checked before the crew started work",
      "supports follow-up if there is a deficiency, refusal, incident, or source-review question",
      "shows workers received task-specific instruction before doing the work",
      "keeps the field procedure tied to official sources instead of memory or habit",
      "helps employers, the prime contractor, and affected trades coordinate overlapping work",
      "gives the crew a reference point when conditions change mid-shift",
      "creates evidence for the next scheduled safety/source review",
    ][docIndex % 8];
    return `${doc}: ${reason}. ${cite(citations, docIndex)}`;
  });

  const procedure = [
    `Define the exact task, location, workers, equipment, materials, and expected duration.`,
    `Read ${link(primaryRelated)} and the site procedure before setting up the work.`,
    `List the hazards and possible outcomes, including ${hazardText}, and identify everyone who could be affected.`,
    `Confirm the official source, owner/client requirement, manufacturer instruction, and site rule that apply. ${cite(citations, 0)}`,
    `Prepare or update the required document set, including ${lower(docText)}.`,
    `Set up the controls before production work starts and check that they match the actual site condition.`,
    `Brief workers on the control, stop-work triggers, emergency contact path, and who can change the plan.`,
    `Inspect the work area during the task and document deficiencies or corrective actions.`,
    `Stop work if the site condition, crew, equipment, adjacent work, weather, or public exposure changes.`,
    `Close the task by recording what was checked, what changed, and what must be reviewed before the next shift.`,
  ];

  const workerChecklist = [
    `I know how this topic affects my task today.`,
    `I know the main hazards: ${hazardText}.`,
    `I know which control must be in place before I start.`,
    `I know where the required document or procedure is kept.`,
    `I have the required PPE, tools, equipment, and instructions for the task.`,
    `I know who is supervising the work and who can answer questions.`,
    `I know how to report a hazard, refusal, near miss, or changed condition.`,
    `I can explain one stop-work trigger for this task.`,
    `I know the emergency response or first aid contact path if something goes wrong.`,
    `I will not continue if the work no longer matches the plan.`,
  ];

  const supervisorChecklist = [
    `The article and official sources have been checked for this task. ${cite(citations, 1)}`,
    `The crew understands the legal requirement, best practice, sample procedure, and checklist are separate.`,
    `Required documents are available, current, and matched to the site condition.`,
    `Workers are trained, instructed, supervised, or otherwise competent for the work assigned.`,
    `Controls are installed before work starts and are still effective during the task.`,
    `Adjacent trades, public interface, mobile equipment, emergency access, and environmental conditions are considered.`,
    `Deficiencies are assigned to an owner with a due date and interim control.`,
    `A change in conditions triggers a pause and review before work continues.`,
    `Records are kept without collecting unnecessary personal information.`,
    `If the deficiency points to a broader issue, open ${link(fourthRelated)} and assign a separate corrective action.`,
  ];

  const mistakes = [
    `Treating a broad source link as if it proves every site-specific requirement.`,
    `Using a generic procedure that does not match the actual crew, equipment, location, or sequence.`,
    `Starting work before the required document, inspection, briefing, or competent review is complete.`,
    `Relying on PPE alone when stronger engineering or administrative controls are practicable.`,
    `Failing to update the plan after weather, access, equipment, crew, or nearby work changes.`,
    `Closing an inspection item without verifying the corrective action in the field.`,
    `Not telling nearby trades or the prime contractor when the hazard can affect them.`,
    `Letting workers continue because the hazard feels normal for construction.`,
  ];

  const relatedItems = related.map((slug) => `- [[${slug}|${articleBySlug.get(slug)?.title || slug}]]`);
  const sourceItems = citations.map((citationId) => `- {{cite:${citationId}}}`);

  return `${frontmatter(article, related, citations)}

# ${article.title}

From BC Construction Safety Wiki

## Summary

${summaryParagraphs.join("\n\n")}

## When this applies

${list(whenApplies)}

## Legal requirements

${list(legalRequirements)}

## Best practice

${list(bestPractice)}

## Required documents

${list(requiredDocumentItems)}

## Step-by-step safe procedure

${ordered(procedure)}

## Worker checklist

${list(workerChecklist.map((item) => `[ ] ${item}`))}

## Supervisor checklist

${list(supervisorChecklist.map((item) => `[ ] ${item}`))}

## Common mistakes

${list(mistakes)}

## Related topics

${relatedItems.join("\n")}

## Official sources

${sourceItems.join("\n")}

## Version history

- 0.2 deep draft: Moved to Markdown source, expanded field content, added wiki links, citation tokens, and backlink-ready related topics.
- 0.1 scaffold: Initial structured article draft.

## Disclaimer

Plain-language safety information for BC construction. Not legal advice, medical advice, engineering advice, or a substitute for official sources, qualified professionals, manufacturer instructions, or site-specific procedures.
`;
}

await mkdir(outputDir, { recursive: true });

for (const [index, article] of wikiArticles.entries()) {
  const content = articleMarkdown(article, index);
  await writeFile(join(outputDir, `${article.slug}.md`), content);
}

console.log(`Seeded ${wikiArticles.length} deep wiki Markdown article files.`);
