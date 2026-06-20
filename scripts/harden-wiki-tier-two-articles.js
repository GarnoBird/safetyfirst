import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tierTwoArticleSlugs } from "../src/wikiCompletionData.js";
import { wikiArticles } from "../src/wikiContent.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const articleDir = join(root, "content/articles");
const reviewDate = "2026-06-20";
const nextReviewDate = "2026-09-20";
const articleMap = new Map(wikiArticles.map((article) => [article.slug, article]));

const citationMap = {
  "ppe-basics": ["ohsr-8-2", "ohsr-8-3", "ohsr-8-4", "ohsr-8-7", "ohsr-8-32", "ohsr-8-39"],
  ladders: ["ohsr-13-2", "ohsr-13-3", "ohsr-13-4", "ohsr-13-5", "ohsr-13-6", "ohsr-13-7", "ohsr-13-12"],
  scaffolds: ["ohsr-13-2", "ohsr-13-3", "ohsr-13-8", "ohsr-13-9", "ohsr-13-10", "ohsr-13-12", "ohsr-13-23"],
  "hot-work": ["ohsr-4-1", "ohsr-4-13", "ohsr-4-14", "ohsr-4-17", "ohsr-5-99", "ohsr-5-100", "ohsr-5-101"],
  housekeeping: ["ohsr-4-1", "ohsr-4-11", "ohsr-4-12", "ohsr-4-13", "ohsr-20-9", "ohsr-20-10"],
  "site-orientation": ["ohsr-3-22", "ohsr-3-23", "ohsr-3-24", "ohsr-3-25", "ohsr-4-16"],
  "workplace-inspections": ["ohsr-3-5", "ohsr-3-8", "ohsr-4-1", "ohsr-4-13", "ohsr-4-14"],
  "mobile-equipment": ["ohsr-16-7", "ohsr-16-8", "ohsr-16-9", "ohsr-16-10", "ohsr-16-11", "ohsr-16-12", "ohsr-16-13", "ohsr-16-20"],
  lockout: ["ohsr-10-3", "ohsr-10-4", "ohsr-10-5", "ohsr-10-6", "ohsr-10-7", "ohsr-10-8", "ohsr-10-9"],
  "demolition-planning": ["ohsr-20-112", "ohsr-20-14", "ohsr-20-15", "ohsr-20-9", "ohsr-20-10", "ohsr-5-54", "ohsr-5-100"],
  "site-emergency-response-plan": ["ohsr-4-13", "ohsr-4-14", "ohsr-4-17", "ohsr-5-101", "ohsr-5-102", "ohsr-5-103", "ohsr-5-104", "ohsr-32-4"],
  "first-aid-assessment": ["ohsr-3-16", "ohsr-3-17", "ohsr-3-18", "ohsr-3-19", "ohsr-3-21", "ohsr-4-13"],
  "traffic-control-plans": ["ohsr-18-3", "ohsr-18-3-1", "ohsr-18-3-2", "ohsr-18-4", "ohsr-18-5"],
  "traffic-control-persons": ["ohsr-18-3", "ohsr-18-3-1", "ohsr-18-3-2", "ohsr-18-4", "ohsr-18-5", "ohsr-8-4"],
};

const emphasis = {
  "ppe-basics": "PPE is the backup control, not the whole safety plan. The useful field decision is whether the hazard was controlled as far upstream as practical before workers rely on hard hats, glasses, gloves, boots, hearing protection, high-visibility clothing, or respirators.",
  ladders: "Ladders are access tools, not default work platforms. The practical field decision is whether the ladder is the right equipment, set on stable footing, inspected, positioned, and limited to work that can be done without overreaching or carrying awkward loads.",
  scaffolds: "A scaffold is only as good as its setup, access, platform, ties, inspection, and use rules. Crews need to know whether the scaffold is ready for use, what has changed since the last inspection, and who can modify it.",
  "hot-work": "Hot work should be treated as an ignition-control job. Before welding, cutting, burning, soldering, or grinding starts, the crew needs fuel control, fire watch, extinguisher access, emergency notification, and follow-up after the sparks stop.",
  housekeeping: "Housekeeping is a production control because poor access, stored material, trailing cords, slurry, waste, and debris create falls, fires, struck-by hazards, and emergency-access delays.",
  "site-orientation": "Site orientation should connect a worker to the real hazards and rules of the site, not just a signature sheet. New workers need to know where to go, who supervises them, what tasks they may do, and how to report unsafe work.",
  "workplace-inspections": "Workplace inspections are a field feedback loop. They find changed conditions, assign corrective action, and give supervisors a way to prove hazards were checked before people kept working.",
  "mobile-equipment": "Mobile equipment planning needs separation, visibility, load control, parking control, riders, communication, and maintenance discipline. The blind spot or swing radius that feels normal to the operator can be invisible to pedestrians.",
  lockout: "Lockout controls hazardous energy before repair, adjustment, cleaning, clearing jams, or maintenance. A worker's personal lock and a verified zero-energy state are the core field controls.",
  "demolition-planning": "Demolition planning starts before the first wall is cut. The site needs hazardous-material checks, utility isolation, structure review, dust control, fall protection, public protection, debris handling, and a stop point when conditions differ from the plan.",
  "site-emergency-response-plan": "An emergency response plan has to work during a bad day, with the actual access, address, people, equipment, communication gaps, weather, and first aid coverage on the site.",
  "first-aid-assessment": "The first aid assessment is the bridge between site risk and first aid services. It should explain supplies, attendants, facilities, communication, emergency transportation, and how the plan changes when the work changes.",
  "traffic-control-plans": "A traffic control plan turns moving vehicles, workers, equipment, and pedestrians into a controlled work zone. It needs to match the road, speed, visibility, work sequence, and setup in the field.",
  "traffic-control-persons": "Traffic control persons need clear authority, visibility, communication, positioning, escape routes, and supervision. They should not be left to fix a poor traffic setup by hand signals alone.",
};

for (const slug of tierTwoArticleSlugs) {
  const article = articleMap.get(slug);
  if (!article) throw new Error(`Missing Tier 2 article: ${slug}`);
  const citations = citationMap[slug];
  if (!citations?.length) throw new Error(`Missing Tier 2 citation config: ${slug}`);
  await writeFile(join(articleDir, `${slug}.md`), renderArticle(article, citations));
}

console.log(`Hardened ${tierTwoArticleSlugs.length} Tier 2 wiki articles.`);

function renderArticle(article, citations) {
  const related = ensureRelated(article);
  const sourceIds = unique([...(article.sourceIds || []), "worksafebc-ohs-regulation", "worksafebc-ohs-guidelines"]);
  const documents = ensureDocuments(article);
  const frontmatter = {
    slug: article.slug,
    title: article.title,
    category: article.category,
    status: "Deep draft",
    jurisdiction: "BC",
    difficulty: article.difficulty || "Basic",
    confidenceLevel: "Tier 2 source-cited draft",
    reviewTier: "Tier 2",
    maturity: "Draft",
    reviewPriority: "Common field-use review",
    lastReviewed: reviewDate,
    nextReview: nextReviewDate,
    legalReviewStatus: "Tier 2 source review in progress",
    safetyReviewStatus: "Needs field review",
    aliases: article.aliases || [],
    trades: article.trades || ["All construction trades"],
    hazards: article.hazards || [],
    tasks: article.tasks || [],
    requiredDocuments: documents,
    sourceIds,
    regulationRefs: citations,
    citations: unique([...citations, ...sourceIds]),
    related,
  };

  const primaryRelated = related.slice(0, 3).map((slug) => `[[${slug}]]`).join(", ");
  const hazardText = listPhrase(article.hazards || ["the site hazard"]);
  const taskText = listPhrase(article.tasks?.length ? article.tasks : [article.title.toLowerCase()]);

  return `---\n${yaml(frontmatter)}---\n\n# ${article.title}\n\nFrom BC Construction Safety Wiki\n\n## Summary\n\n${emphasis[article.slug] || `${article.title} is a common BC construction safety topic that needs field planning before workers start the task.`}\n\nOn site, this topic usually overlaps with ${primaryRelated}. Supervisors should brief the work area, the worker instructions, the required documents, and the stop-work triggers before the crew treats the setup as normal production.\n\nThis page is a Tier 2 draft. It has stronger section-level citations and practical field checks, but all legal wording still needs qualified BC safety/source review before this article is treated as a compliance checklist. {{review:source}}\n\n## When this applies\n\n${bullets([
    `The task involves ${taskText} on a BC construction site.`,
    `The work can expose workers or nearby people to ${hazardText}.`,
    "The setup, access, equipment, crew, weather, traffic, public interface, or work sequence has changed since the last review.",
    `A required document such as ${documents[0]} must be prepared, reviewed, updated, or kept available.`,
    "A supervisor is assigning the work to a young worker, new worker, subcontractor, or crew that has not done the task on this site.",
    "An inspection, near miss, refusal, or worker concern suggests the current control is not working.",
    "The prime contractor or another employer needs coordination because overlapping work can affect the same area.",
  ])}\n\n## Legal requirements\n\n${bullets(legalRequirements(article, citations))}\n\n## Best practice\n\n${bullets([
    "Check whether the hazard can be eliminated, isolated, engineered out, or scheduled differently before relying on PPE or reminders.",
    `Use the field condition, not habit, to decide whether ${documents[0]} is current enough for today's work.`,
    "Name the person who can approve field changes, and stop work when that person is not available for a material change.",
    "Keep the work area, access route, emergency route, public interface, and adjacent trades in the same review.",
    "Use photos, sketches, tags, barricades, or labels when a worker could misunderstand the control in the field.",
    "Review the control after weather, shift change, equipment substitution, failed inspection, or a near miss.",
    "Write corrective actions with an owner, interim control, and due time so deficiencies do not become standing site conditions.",
  ])}\n\n## Required documents\n\n${bullets(documents.slice(0, 8).map((document, index) => `${document}: ${documentReason(index)} {{cite:${citations[index % citations.length]}}`))}\n\n## Step-by-step safe procedure\n\n${numbered([
    `Define the exact location, task, crew, equipment, materials, access route, and expected duration for ${article.title.toLowerCase()}.`,
    "Walk the work area and identify the hazard, the people exposed, and any adjacent work that could change the risk.",
    `Review the official source and the site procedure, then confirm ${documents[0]} matches the actual field condition. {{cite:${citations[0]}}}`,
    "Choose controls in order of effectiveness and set them up before production work starts.",
    "Confirm required equipment, PPE, signs, barriers, permits, inspections, and records are available and understandable.",
    "Brief workers on the control, limits, communication, emergency contact path, and stop-work triggers.",
    "Check the control during the task, especially after deliveries, weather, crew changes, equipment movement, or public interaction.",
    "Stop work if the condition no longer matches the plan, if a required control is missing, or if a worker reports a hazard.",
    "Record deficiencies and corrective actions before the area returns to normal production.",
    "Update the site procedure or orientation if the same deficiency could affect another crew or shift.",
  ])}\n\n## Worker checklist\n\n${checklist([
    `I know how ${article.title.toLowerCase()} affects my task today.`,
    `I know the main hazards, including ${hazardText}.`,
    "I know which control must be in place before I start.",
    `I know where ${documents[0]} or the site procedure is kept.`,
    "I have the PPE, tools, equipment, and instructions required for the task.",
    "I know who is supervising the work and who can approve a change.",
    "I know how to report a hazard, refusal, near miss, or changed condition.",
    "I can name one condition that means the work must stop.",
    "I know the emergency response or first aid contact path if something goes wrong.",
    "I will not continue if the work no longer matches the plan.",
  ])}\n\n## Supervisor checklist\n\n${checklist([
    `The work area has been checked against the cited sources for ${article.title}.`,
    "Workers understand what is legal requirement, best practice, sample procedure, and checklist.",
    "Required documents are current and matched to the actual site condition.",
    "Workers are trained, instructed, supervised, or otherwise competent for the work assigned.",
    "Controls are installed before work starts and remain effective during the task.",
    "Adjacent trades, public interface, mobile equipment, emergency access, and environmental conditions are considered.",
    "Deficiencies have an owner, due date, and interim control.",
    "A change in conditions triggers a pause and review before work continues.",
    "Records are kept without collecting unnecessary personal information.",
    `The legal wording still carries a review flag until a qualified reviewer checks the current source. {{review:source}}`,
  ])}\n\n## Common mistakes\n\n${bullets([
    "Treating a broad source link as if it proves every site-specific requirement.",
    "Using a procedure that does not match the actual crew, equipment, location, or sequence.",
    "Starting work before the required document, inspection, briefing, or competent review is complete.",
    "Relying on PPE alone when stronger engineering or administrative controls are practical.",
    "Failing to update the control after weather, access, equipment, crew, or nearby work changes.",
    "Closing an inspection item without verifying the corrective action in the field.",
    "Not telling nearby trades or the prime contractor when the hazard can affect them.",
    "Letting workers continue because the hazard feels routine for construction.",
  ])}\n\n## Related topics\n\n${bullets(related.map((slug) => `[[${slug}]]`))}\n\n## Official sources\n\n${bullets(unique([...citations, ...sourceIds]).map((id) => `{{cite:${id}}}`))}\n\n## Reviewer notes\n\n- Tier 2 source review is still required before changing maturity to Source checked or Ready for public use. {{review:source}}\n- Reviewer should confirm each exact section supports the article's legal bullets.\n- Field reviewer should confirm the checklist fits common BC construction practice.\n\n## Version history\n\n- 0.3 Tier 2 hardening: Added exact citations, practical field procedure, stronger checklist wording, and draft review metadata.\n- 0.2 deep draft: Moved to Markdown source with wiki links and citation tokens.\n- 0.1 scaffold: Initial structured article draft.\n\n## Disclaimer\n\nPlain-language safety information for BC construction. Not legal advice, medical advice, engineering advice, or a substitute for official sources, qualified professionals, manufacturer instructions, or site-specific procedures.\n`;
}

function legalRequirements(article, citations) {
  return [
    `Check the current WorkSafeBC source for the work condition before directing the task. {{cite:${citations[0]}}}`,
    `Use the cited requirements and site procedure to identify the hazard and control it before workers are exposed. {{cite:${citations[1]}}}`,
    `Provide information, instruction, training, supervision, PPE, or equipment that fits the task and worker. {{cite:${citations[2]}}}`,
    `Do not bypass, remove, or ignore a required control unless the work is stopped and the change is reviewed. {{cite:${citations[3]}}}`,
    `Keep required written procedures, inspections, permits, assessments, or records when the cited source or site condition calls for them. {{cite:${citations[4]}}}`,
    `Stop and reassess when conditions no longer match the plan, a control is missing, or a worker reports an unsafe condition. {{cite:${citations[0]}}}`,
    "Coordinate with the prime contractor, employer, supervisor, affected workers, and nearby trades where overlapping work can create hazards. {{review:source}}",
    "A qualified BC safety/source reviewer must verify the exact legal wording before this draft is used for enforcement, bidding, or legal advice. {{review:source}}",
  ];
}

function ensureRelated(article) {
  const defaults = [
    "site-specific-safety-plan",
    "site-orientation",
    "workplace-inspections",
    "corrective-actions",
    "training-records",
    "toolbox-talks",
    "worker-rights-and-responsibilities",
    "prime-contractor-duties",
  ];
  return unique([...(article.related || []), ...defaults]).filter((slug) => slug !== article.slug).slice(0, 18);
}

function ensureDocuments(article) {
  return unique([
    ...(article.requiredDocuments || []),
    "Site-specific safe work procedure",
    "Worker instruction or training record",
    "Inspection or pre-use check record",
    "Corrective action record when a deficiency is found",
  ]).slice(0, 8);
}

function documentReason(index) {
  return [
    "records the site-specific control expected before the task starts.",
    "confirms workers have a current instruction source instead of relying on memory.",
    "supports follow-up when a deficiency, refusal, incident, or source-review question is raised.",
    "keeps the field method tied to the actual hazard, equipment, and location.",
    "helps the prime contractor and affected trades coordinate overlapping work.",
    "shows workers received task-specific instruction before doing the work.",
    "gives the crew a reference point when conditions change mid-shift.",
    "creates evidence for the next scheduled safety/source review.",
  ][index % 8];
}

function listPhrase(items) {
  return items
    .filter(Boolean)
    .slice(0, 4)
    .map((item) => String(item).toLowerCase())
    .join(", ");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
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

function bullets(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function numbered(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function checklist(items) {
  return items.map((item) => `- [ ] ${item}`).join("\n");
}

function escapeYaml(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
