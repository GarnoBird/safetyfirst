import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  articleRoadmap,
  wikiArticles,
  wikiCategories,
  wikiSources,
  slugify,
} from "../src/wikiContent.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reviewPhrase = "Needs verification against current WorkSafeBC/OHS source.";
const today = "2026-06-19";
const quizAnswerPattern = ["A", "C", "B", "D", "B", "D", "C", "A", "D", "C"];

const sourceLinks = {
  regulation:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation",
  guidelines:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-guidelines",
  part3:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-03-rights-and-responsibilities",
  part4:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-04-general-conditions",
  part5:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-05-chemical-agents-and-biological-agents",
  part6:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-06-substance-specific-requirements",
  part8:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-08-personal-protective-clothing-and-equipment",
  part9:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-09-confined-spaces",
  part10:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-10-de-energization-and-lockout",
  part11:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-11-fall-protection",
  part12:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-12-tools-machinery-and-equipment",
  part13:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-13-ladders-scaffolds-and-temporary-work-platforms",
  part14:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-14-cranes-and-hoists",
  part16:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-16-mobile-equipment",
  part18:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-18-traffic-control",
  part19:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-19-electrical-safety",
  part20:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-20-construction-excavation-and-demolition",
  part32:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-32-evacuation-and-rescue",
  act:
    "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/19001_00",
  bccsa: "https://www.bccsa.ca/",
};

const majorTopics = [
  topic("Fall protection", "Fall protection", "Work at height where a worker could fall, be struck by a falling object, or need rescue after a fall protection system is used.", ["Unprotected edges", "Floor openings", "Swing fall", "Suspension trauma"], ["part11", "part32", "part3"]),
  topic("Ladders and scaffolds", "Ladders and scaffolds", "Temporary access and work platforms used by construction crews.", ["Falls", "Collapse", "Unstable setup", "Falling tools/materials"], ["part13", "part11"]),
  topic("Excavation and trenching", "Excavation and trenching", "Digging, trenching, utility exposure, shoring, sloping, or worker entry into excavations.", ["Cave-in", "Underground utilities", "Mobile equipment", "Water accumulation"], ["part20", "part16"]),
  topic("Confined spaces", "Confined spaces", "Entry into spaces with restricted access and possible atmospheric, engulfment, entrapment, or rescue hazards.", ["Oxygen deficiency", "Toxic atmosphere", "Engulfment", "Failed rescue"], ["part9", "part32", "part3"]),
  topic("Silica and dust", "Silica and dust", "Dust-producing work involving concrete, masonry, rock, brick, mortar, tile, or similar materials.", ["Respirable crystalline silica", "Poor ventilation", "Dry sweeping", "Uncontrolled nearby exposure"], ["part6", "part5", "part8"]),
  topic("WHMIS/SDS", "WHMIS/SDS", "Use, storage, transfer, or cleanup of hazardous products on construction sites.", ["Unknown product", "Missing SDS", "Incorrect container label", "Incompatible storage"], ["part5"]),
  topic("PPE", "PPE", "Selection, use, inspection, storage, and replacement of personal protective equipment.", ["Incorrect PPE", "Damaged PPE", "PPE used instead of stronger controls", "Poor fit"], ["part8"]),
  topic("First aid", "First aid", "First aid planning, attendants, supplies, facilities, communication, and emergency transport.", ["Delayed response", "Blocked access", "Missing supplies", "Privacy breach"], ["part3", "part32"]),
  topic("Incident reporting", "Incident reporting", "Reporting, investigating, documenting, and correcting incidents, injuries, near misses, and dangerous conditions.", ["Unreported incident", "Lost evidence", "No corrective action", "Repeat event"], ["part3", "act"]),
  topic("Refusing unsafe work", "Refusing unsafe work", "Worker refusal process when a worker believes work would create undue hazard.", ["Retaliation risk", "Poor documentation", "Uncontrolled hazard", "Worker not informed"], ["part3", "act"]),
  topic("Site orientation", "Site orientation", "Worker onboarding to site-specific hazards, rules, emergency information, and required training checks.", ["New worker risk", "Unknown emergency procedure", "Missed high-risk work rule", "Language/communication gap"], ["part3"]),
  topic("Tool and equipment safety", "Tool and equipment safety", "Hand tools, power tools, guards, cords, maintenance, inspection, and safe use.", ["Missing guard", "Damaged cord", "Improper blade/wheel", "Untrained use"], ["part12", "part19"]),
  topic("Electrical safety", "Electrical safety", "Temporary power, overhead lines, energized equipment, cords, panels, GFCI use, and electrical hazard controls.", ["Shock", "Arc flash", "Overhead line contact", "Damaged temporary power"], ["part19", "part10"]),
  topic("Lockout/tagout", "Lockout/tagout", "De-energization and control of hazardous energy before work on equipment, systems, or circuits.", ["Unexpected startup", "Stored energy", "Wrong isolation point", "Shared lockout confusion"], ["part10", "part19"]),
  topic("Mobile equipment", "Mobile equipment", "Excavators, loaders, forklifts, telehandlers, skid steers, compactors, and similar site equipment.", ["Struck-by", "Backing", "Rollover", "Poor ground condition"], ["part16", "part18"]),
  topic("Cranes/rigging", "Cranes/rigging", "Lifts, hoists, slings, shackles, signals, load control, and exclusion zones.", ["Dropped load", "Overload", "Power line contact", "Pinch/crush points"], ["part14", "part19"]),
  topic("Traffic control", "Traffic control", "Worker, public, pedestrian, cyclist, delivery, and mobile-equipment movement around the site.", ["Vehicle strike", "Public interface", "Poor signage", "Night/visibility issue"], ["part18", "part16"]),
  topic("Heat/cold stress", "Heat/cold stress", "Outdoor or indoor work where temperature, humidity, wind, workload, clothing, or exposure time can affect workers.", ["Heat illness", "Hypothermia", "Frostbite", "Dehydration"], ["regulation", "guidelines"]),
  topic("Violence/harassment", "Violence/harassment", "Threatening, abusive, discriminatory, or harassing conduct affecting workers or site visitors.", ["Threats", "Harassment", "Bullying", "Escalating conflict"], ["part4", "act"]),
  topic("Young/new workers", "Young/new workers", "Workers new to the site, young workers, apprentices, temporary workers, and anyone unfamiliar with construction hazards.", ["Inexperience", "Not asking questions", "No close supervision", "Unverified training"], ["part3", "act"]),
  topic("Supervisor duties", "Supervisor duties", "Field supervision duties for instruction, hazard control, monitoring, correction, and documentation.", ["Unclear direction", "Uncorrected hazard", "No verification", "Production pressure"], ["part3", "act"]),
  topic("Prime contractor/site coordination", "Prime contractor/site coordination", "Coordination between employers, subcontractors, workers, public interfaces, and overlapping work.", ["Conflicting work", "Unclear authority", "Uncontrolled public interface", "Communication failure"], ["part3", "part20", "act"]),
  topic("Emergency response", "Emergency response", "Site response to fire, collapse, medical emergency, rescue, spill, evacuation, severe weather, and external emergency services.", ["Delayed 911 call", "Blocked access", "Unpracticed rescue", "Poor communication"], ["part32", "part3"]),
];

const checklistTitles = [
  "Daily site inspection",
  "Fall protection",
  "Ladders",
  "Scaffolds",
  "Excavations",
  "Confined space pre-entry",
  "PPE",
  "First aid kit / first aid room",
  "Emergency response",
  "Silica/dust",
  "WHMIS/SDS",
  "Housekeeping",
  "Mobile equipment",
  "Hot work",
  "Power tools",
  "Traffic control",
  "Incident follow-up",
];

const formTitles = [
  "Incident report",
  "Near miss report",
  "Hazard report",
  "Corrective action log",
  "Worker orientation",
  "Toolbox talk attendance",
  "Equipment inspection",
  "Site safety inspection",
  "Training matrix",
  "Investigation witness statement",
  "Subcontractor safety onboarding",
];

const talkTitles = [
  "Tie-off planning before edge work",
  "Guardrails and floor openings",
  "Fall rescue readiness",
  "Harness inspection",
  "Ladder setup and three-point contact",
  "Scaffold access and tagging",
  "Rolling scaffold movement",
  "Trench cave-in warning signs",
  "Underground utility awareness",
  "Confined space entry basics",
  "Atmospheric testing awareness",
  "Silica dust controls",
  "Wet cutting and HEPA cleanup",
  "Respirator fit and seal checks",
  "WHMIS labels and SDS access",
  "Chemical storage on site",
  "Eye and face protection",
  "High visibility apparel",
  "Hearing protection",
  "Glove selection",
  "First aid access and reporting",
  "AED location and emergency access",
  "Cardiac arrest response basics",
  "Incident and near miss reporting",
  "Refusing unsafe work",
  "New worker questions",
  "Site orientation refresh",
  "Power tool guards",
  "Extension cords and temporary power",
  "Overhead power line awareness",
  "Lockout before maintenance",
  "Stored energy hazards",
  "Mobile equipment blind spots",
  "Spotter communication",
  "Seat belts and rollover risk",
  "Crane pick communication",
  "Rigging inspection basics",
  "Exclusion zones under suspended loads",
  "Traffic control around deliveries",
  "Pedestrian detours",
  "Heat stress early signs",
  "Cold stress and wet clothing",
  "Violence and harassment reporting",
  "Respectful site communication",
  "Supervisor stop-work expectations",
  "Prime contractor coordination",
  "Emergency muster and headcount",
  "Fire extinguisher access",
  "Hot work fire watch",
  "Housekeeping and access routes",
];

function topic(title, category, applies, hazards, sourceKeys) {
  return {
    title,
    slug: slugify(title),
    category,
    applies,
    hazards,
    sourceKeys,
  };
}

function mdList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function mdChecklist(items) {
  return items.map((item) => `- [ ] ${item}`).join("\n");
}

function sourceLines(keys) {
  const selected = keys.length ? keys : ["regulation"];
  return selected
    .map((key) => `- WorkSafeBC/OHS source candidate: ${sourceLinks[key] || sourceLinks.regulation}`)
    .concat([
      `- ${reviewPhrase}`,
      "- Treat this page as a plain-language draft until a qualified BC safety reviewer verifies current source sections.",
    ])
    .join("\n");
}

function topicPage(topicItem) {
  return `# ${topicItem.title}

Status: Draft expansion page
Jurisdiction: British Columbia, Canada
Last generated: ${today}
Review status: Needs human safety/source review

## Plain-English summary

${topicItem.title} covers practical jobsite controls for ${topicItem.applies.toLowerCase()} This page is written for field use and does not replace WorkSafeBC, BC law, engineered documents, manufacturer instructions, or site-specific procedures.

## When this applies

- The task or condition matches this topic on a BC construction site.
- A supervisor, worker, CSO, employer, or prime contractor needs a plain-language planning/checking page.
- Work is changing, crews are unfamiliar with the task, or controls need to be verified before work starts.

## Common hazards

${mdList(topicItem.hazards)}
- Missing communication between employers or crews.
- Work continuing after site conditions change.

## Required controls / best-practice controls

- Verify current WorkSafeBC/OHS requirements before treating any control as a legal requirement.
- Identify the hazard, affected workers, location, task sequence, equipment, and nearby public or trade interface.
- Choose stronger controls before relying on PPE alone where practical.
- Brief workers on the control, stop-work triggers, and who has authority to change the plan.
- Keep required records, inspections, permits, plans, and training evidence available for review.
- Label any site-specific procedure as a sample until reviewed by the employer, prime contractor, and competent person where needed.

## Supervisor checklist

${mdChecklist([
    "Current source and site-specific procedure checked.",
    "Workers assigned to the task are trained or directly supervised.",
    "Controls are in place before work starts.",
    "Nearby trades, public interfaces, and emergency access have been considered.",
    "Required inspection or planning evidence is available.",
    "Stop-work authority has been explained.",
  ])}

## Worker checklist

${mdChecklist([
    "I understand the task, hazard, and control.",
    "I know who is supervising the work.",
    "I have the required PPE, tools, and instructions.",
    "I know how to report a hazard or stop work.",
    "I can identify at least one red flag for this task.",
  ])}

## Red flags / stop-work triggers

${mdList([
    "The condition does not match the plan or procedure.",
    "Required equipment, training, permit, inspection, or rescue support is missing.",
    "A worker is unsure how to do the task safely.",
    "A control has been removed, damaged, bypassed, or made ineffective.",
    "Weather, access, adjacent work, or public exposure changes the risk.",
  ])}

## Toolbox talk outline

- What task are we doing today?
- What can hurt someone during this task?
- What control must be in place before work starts?
- What red flag means stop and call the supervisor?
- What evidence do we keep after the task?

## Training/competency notes

- Confirm legal training, certification, or qualification requirements against current WorkSafeBC/OHS sources before assigning work.
- Use direct supervision for workers who are new to the task.
- Keep records of site orientation, task instruction, equipment training, and any competency verification.

## Inspection evidence to keep

- Site-specific checklist or inspection record.
- Photos only when appropriate and privacy-safe.
- Corrective action notes and closeout evidence.
- Training, orientation, permit, or attendance records where applicable.

## Incident examples

- A crew starts work from an old plan after site conditions changed.
- A worker continues because the hazard seems normal for construction.
- A control is installed but not inspected or communicated to nearby trades.

## Sources

${sourceLines(topicItem.sourceKeys)}

## Needs human review items

- Confirm exact WorkSafeBC OHS Regulation parts, sections, and any guideline references.
- Confirm whether a qualified person, engineer, certified worker, or written plan is required for the specific task.
- Confirm any inspection frequency, reporting duty, certification, exposure limit, or document-retention requirement before publication.
`;
}

function toolboxTalk(title, index) {
  const topicItem = majorTopics[index % majorTopics.length];
  return `# ${title}

Duration: 5 to 10 minutes
Audience: Construction workers and supervisors
Topic area: ${topicItem.title}
Review status: Needs human safety/source review

## Key message

Do not start the task until the crew understands the hazard, the control, and the stop-work trigger.

## Discussion points

- What is the specific task today?
- Which workers, trades, or public areas could be affected?
- What control must be in place before work starts?
- What changed since the last time we did this task?
- Who stops the work if the control is missing or unclear?

## Questions for crew

- What is one thing that could go wrong during this task?
- What would make you stop and call a supervisor?
- Where is the required document, procedure, or inspection record kept?

## Supervisor demonstration

Show the crew the actual control in the field. Point to the hazard, the control, the access route, and the stop-work trigger.

## Sign-off prompt

Crew members sign only after they can explain the key hazard and control in their own words.

## Source/review note

- Source candidate: ${sourceLinks[topicItem.sourceKeys[0]] || sourceLinks.regulation}
- ${reviewPhrase}
- This talk is a practical draft, not official policy or legal advice.
`;
}

function checklist(title) {
  return `# ${title} Checklist

Status: Draft field checklist
Jurisdiction: British Columbia, Canada
Review status: Needs human safety/source review

## Use

Use this checklist as a field prompt. It does not replace WorkSafeBC requirements, manufacturer instructions, engineered documents, or site-specific procedures.

## Checklist

${mdChecklist([
    "Task, location, crew, and supervisor identified.",
    "Current procedure, plan, permit, SDS, or manufacturer instruction available where applicable.",
    "Workers are oriented, instructed, and competent for the task or directly supervised.",
    "Required PPE and equipment are available, suitable, and inspected.",
    "Hazards to workers, nearby trades, public areas, and emergency access are controlled.",
    "Stop-work triggers have been discussed.",
    "Deficiencies are assigned to a responsible person with a closeout date.",
    "Records are filed where the site safety system requires them.",
  ])}

## Notes / deficiencies

- 
- 
- 

## Sources / review needed

- ${reviewPhrase}
- Verify this checklist against the current WorkSafeBC OHS Regulation and any applicable guideline before using it as a required inspection record.
`;
}

function formTemplate(title) {
  return `# ${title} Form Template

Status: Draft form template
Review status: Needs human safety/source review

## Form fields

- Project:
- Date/time:
- Location:
- Employer/trade:
- Worker(s) involved, if appropriate:
- Supervisor:
- Description:
- Immediate controls taken:
- Required follow-up:
- Responsible person:
- Due date:
- Closeout evidence:
- Reviewer:

## Privacy and sensitivity note

Do not record unnecessary medical details, private personal information, or speculation. Keep only the information needed for safety follow-up, reporting, and corrective action.

## Source/review note

- ${reviewPhrase}
- Confirm legal reporting, investigation, privacy, and retention requirements before using this as an official company form.
`;
}

function quiz(topicItem) {
  const questions = [
    ["What should happen before work starts?", "Confirm hazards, controls, and supervision.", "Wait until the end of shift.", "Assume the last plan still applies.", "Skip the briefing if the crew is experienced."],
    ["What is a stop-work trigger?", "A condition that means work should pause until the hazard is controlled.", "A production target.", "A sign-off sheet only.", "A tool storage label."],
    ["What should a worker do if they do not understand the control?", "Ask the supervisor before starting or continuing.", "Continue slowly.", "Ask another trade to decide.", "Ignore the task."],
    ["Which evidence is most useful after a deficiency is found?", "Assigned corrective action and closeout proof.", "A verbal promise only.", "A deleted photo.", "No record."],
    ["What does 'needs human review' mean?", "A qualified reviewer must verify current sources before publication/use as policy.", "The content is official law.", "The page can be ignored.", "The control is optional."],
    ["When should a procedure be updated?", "When site conditions, crew, tools, sequence, or source requirements change.", "Only once a year regardless of changes.", "Never after publication.", "Only after an injury."],
    ["Which source should be checked first for BC legal requirements?", "WorkSafeBC OHS Regulation or Workers Compensation Act OHS provisions.", "A private company manual from another province.", "A social media post.", "A supplier advertisement."],
    ["How should best practice be labelled?", "Clearly separate from legal requirements.", "As mandatory law without citation.", "Only in verbal instructions.", "Hidden in the checklist."],
    ["What should be done with unsupported legal claims?", "Remove, cite, or mark for human/source review.", "Publish as-is.", "Make them sound more confident.", "Copy text from an unknown manual."],
    ["What is the safest answer when source access is missing?", "Needs verification against current WorkSafeBC/OHS source.", "Verified compliant.", "No source needed.", "Legal requirement confirmed."],
  ];

  return `# ${topicItem.title} Quiz

Status: Draft training quiz
Questions: 10
Suggested pass threshold: 8/10 after instructor review
Review flag: Needs source review before use as mandatory training

${questions
    .map(([question, correct, b, c, d], index) => {
      const answer = quizAnswerForTopic(topicItem.title, index);
      const choices = arrangeQuizChoices(answer, [correct, b, c, d]);
      return `## ${index + 1}. ${question}

${choices.map((choice) => `${choice.letter}. ${choice.text}`).join("\n")}

Answer: ${answer}

Explanation: ${correct} For ${topicItem.title.toLowerCase()}, do not treat this draft quiz as proof of legal competency until the employer verifies current WorkSafeBC/OHS requirements and site-specific procedure.
`;
    })
    .join("\n")}

## Source/review note

${sourceLines(topicItem.sourceKeys)}
`;
}

function arrangeQuizChoices(answer, [correct, ...distractors]) {
  let distractorIndex = 0;
  return ["A", "B", "C", "D"].map((letter) => ({
    letter,
    text: letter === answer ? correct : distractors[distractorIndex++],
  }));
}

function quizAnswerForTopic(topicTitle, questionIndex) {
  const offset = [...topicTitle].reduce((total, char) => total + char.charCodeAt(0), 0);
  return quizAnswerPattern[(questionIndex + offset) % quizAnswerPattern.length];
}

function sourcePolicy() {
  return `# Wiki Source Policy

Last updated: ${today}

## Purpose

This policy controls how the BC Construction Safety Wiki uses sources. The wiki is a plain-language reference, not official policy, legal advice, engineering advice, medical advice, or a replacement for WorkSafeBC, BC law, manufacturer instructions, or site-specific procedures.

## Source hierarchy

1. WorkSafeBC OHS Regulation and related materials.
2. WorkSafeBC OHS Guidelines.
3. WorkSafeBC Prevention Manual / OHS policies.
4. Workers Compensation Act OHS provisions.
5. Government of British Columbia safety, building, fire, and public-protection pages where relevant.
6. BCCSA resources where useful.
7. CSA, ANSI, and manufacturer standards only when source access is available and the standard/instruction is cited without reproducing protected text.
8. Field-proven procedures labelled as non-legal best practice.

## Hard rules

- Do not copy long passages from official sources, private manuals, paid standards, or manufacturer manuals.
- Do not present generated content as official policy.
- Do not invent legal thresholds, certification requirements, inspection intervals, or reporting duties.
- Every page that mentions a regulation, required procedure, inspection interval, certification, or reporting duty must include a Sources / review needed section.
- If source access is missing or a section has not been checked, write: ${reviewPhrase}
- Legal requirements, best practices, sample procedures, and field checklists must remain visibly separate.

## Official source starting points

${wikiSources.map((source) => `- ${source.title}: ${source.url}`).join("\n")}
- WorkSafeBC searchable OHS Regulation and related materials: ${sourceLinks.regulation}
- Workers Compensation Act: ${sourceLinks.act}

## Review status labels

- Source-cited draft: contains source links, but still needs qualified review.
- Needs human review: generated or edited content that has not been source-checked.
- Safety reviewed: field practicality reviewed by a competent safety reviewer.
- Legal/source reviewed: claims checked against current source sections by a qualified reviewer.
- Outdated source flagged: source page changed or review date expired.
`;
}

function contentMap() {
  const existingSlugs = new Set(wikiArticles.map((article) => article.slug));
  const roadmapSlugs = new Set(articleRoadmap.map((item) => item.slug));
  const missingFromMvp = majorTopics.filter((item) => !existingSlugs.has(item.slug));
  const duplicateTitles = findDuplicates(wikiArticles.map((article) => article.title.toLowerCase()));
  const sourceReviewPages = wikiArticles.filter((article) =>
    article.review?.legalReviewStatus?.toLowerCase().includes("needs"),
  );
  const highPriorityGaps = [
    "Lockout/tagout",
    "Heat/cold stress",
    "Violence/harassment",
    "Prime contractor/site coordination",
    "Tool and equipment safety",
    "Refusing unsafe work",
  ];

  return `# Wiki Content Map

Last mapped: ${today}

## Existing wiki pages

${wikiArticles.map((article) => `- ${article.title} (${article.slug}) - ${article.category}`).join("\n")}

## Existing categories

${wikiCategories.map((category) => `- ${category.title}: ${category.topics.join(", ")}`).join("\n")}

## Planned first 100 roadmap topics

${articleRoadmap.map((item) => `- ${item.order}. ${item.title} - ${item.phase} - ${item.status}`).join("\n")}

## Missing major expansion topics

${missingFromMvp.map((item) => `- ${item.title} - generated as content/topics/${item.slug}.md in this expansion`).join("\n")}

## Duplicate topics

${duplicateTitles.length ? duplicateTitles.map((title) => `- ${title}`).join("\n") : "- No duplicate exact titles found in current structured wiki articles."}

## Outdated-looking pages

- No page has an old date, but every generated draft and the MVP wiki pages need qualified human source review before public reliance.
- Current MVP review date in structured content is 2026-06-19; schedule re-review before public launch and whenever WorkSafeBC source pages change.

## Pages needing source review

${sourceReviewPages.map((article) => `- ${article.title}: ${article.review.legalReviewStatus}`).join("\n")}

## High-priority safety gaps

${highPriorityGaps.map((item) => `- ${item}`).join("\n")}

## Source gaps

- Exact section-level citations are incomplete for many generated expansion pages.
- Any inspection interval, certification, reporting duty, or legal threshold must be verified before publication.
- CSA, ANSI, and manufacturer requirements must not be summarized unless source access is available.
- ${reviewPhrase}
`;
}

function reviewReport() {
  return `# Safety Wiki Review Report

Last generated: ${today}

## Pages created

- docs/source-policy.md
- docs/wiki-content-map.md
- ${majorTopics.length} major topic draft pages in content/topics/
- ${talkTitles.length} toolbox talks in toolbox-talks/
- ${checklistTitles.length} checklists in checklists/
- ${formTitles.length} form templates in forms/
- ${majorTopics.length} quizzes in training/

## Pages updated

- package.json: adds expansion verification command.

## Topics still missing

- Detailed section-by-section WorkSafeBC citation notes.
- Employer-specific procedures reviewed by a competent person.
- Trade-specific subpages for concrete, roofing, electrical, mechanical, demolition, restoration, and public protection.
- Source-specific pages for OHS Guidelines and Prevention Manual policy entries.

## Source gaps

- Most generated pages cite source candidates but do not yet include exact section-level legal analysis.
- ${reviewPhrase}
- CSA/ANSI/manufacturer requirements are not reproduced and need source access before use.

## Legal/regulatory items requiring human verification

- Any legal threshold, certification, inspection interval, reporting deadline, qualified-person requirement, exposure limit, or record-retention period.
- Any statement that a written plan, permit, rescue service, engineered document, or specific training card is legally required.
- Any emergency/medical instruction beyond calling 911, activating site first aid, and following trained first aid/AED procedures.

## Verification commands

- npm run verify:wiki-expansion
- npm run validate:wiki
- npm run build

## Recommended next phase

1. Assign a qualified BC safety reviewer to the high-risk topics: fall protection, confined spaces, excavation, silica, cranes/rigging, lockout, electrical, first aid, and emergency response.
2. Build source-note files for the exact OHS Regulation and guideline sections supporting each page.
3. Convert reviewed topic pages into the public React wiki index after source review.
4. Add a source-change monitoring workflow for WorkSafeBC and BC Laws pages.
`;
}

function findDuplicates(items) {
  const seen = new Set();
  const dupes = new Set();
  for (const item of items) {
    if (seen.has(item)) dupes.add(item);
    seen.add(item);
  }
  return [...dupes];
}

async function write(path, content) {
  const fullPath = join(root, path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${content.trim()}\n`, "utf8");
}

async function main() {
  await write("docs/source-policy.md", sourcePolicy());
  await write("docs/wiki-content-map.md", contentMap());
  await write("docs/safety-wiki-review-report.md", reviewReport());

  for (const item of majorTopics) {
    await write(`content/topics/${item.slug}.md`, topicPage(item));
  }

  for (const [index, title] of talkTitles.entries()) {
    await write(`toolbox-talks/${String(index + 1).padStart(2, "0")}-${slugify(title)}.md`, toolboxTalk(title, index));
  }

  for (const title of checklistTitles) {
    await write(`checklists/${slugify(title)}.md`, checklist(title));
  }

  for (const title of formTitles) {
    await write(`forms/${slugify(title)}.md`, formTemplate(title));
  }

  for (const item of majorTopics) {
    await write(`training/${item.slug}-quiz.md`, quiz(item));
  }

  console.log(`Generated ${majorTopics.length} topic pages.`);
  console.log(`Generated ${talkTitles.length} toolbox talks.`);
  console.log(`Generated ${checklistTitles.length} checklists.`);
  console.log(`Generated ${formTitles.length} forms.`);
  console.log(`Generated ${majorTopics.length} quizzes.`);
}

await main();
