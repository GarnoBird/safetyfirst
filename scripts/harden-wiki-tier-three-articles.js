import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tierOneArticleSlugs, tierTwoArticleSlugs } from "../src/wikiCompletionData.js";
import { wikiArticles } from "../src/wikiContent.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const articleDir = join(root, "content/articles");
const reviewDate = "2026-06-20";
const nextReviewDate = "2026-12-20";
const protectedSlugs = new Set([...tierOneArticleSlugs, ...tierTwoArticleSlugs]);
const tierThreeArticles = wikiArticles.filter((article) => !protectedSlugs.has(article.slug));

for (const article of tierThreeArticles) {
  await writeFile(join(articleDir, `${article.slug}.md`), renderArticle(article));
}

console.log(`Hardened ${tierThreeArticles.length} Tier 3 wiki articles.`);

function renderArticle(article) {
  const related = ensureRelated(article);
  const sourceIds = unique([...(article.sourceIds || []), "worksafebc-ohs-regulation"]);
  const citations = ensureCitations(article, sourceIds);
  const documents = ensureDocuments(article);
  const frontmatter = {
    slug: article.slug,
    title: article.title,
    category: article.category,
    status: "Deep draft",
    jurisdiction: "BC",
    difficulty: article.difficulty || "Basic",
    confidenceLevel: "Draft reference page - source review needed",
    reviewTier: "Tier 3",
    maturity: "Draft",
    reviewPriority: "Support/reference review",
    lastReviewed: reviewDate,
    nextReview: nextReviewDate,
    legalReviewStatus: "Needs qualified review",
    safetyReviewStatus: "Needs field review",
    aliases: article.aliases || [],
    trades: article.trades || ["All construction trades"],
    hazards: article.hazards || [],
    tasks: article.tasks || [],
    requiredDocuments: documents,
    sourceIds,
    regulationRefs: citations.filter((id) => id.startsWith("ohsr-")),
    citations,
    related,
  };

  const hazardText = listPhrase(article.hazards || ["the relevant site hazard"]);
  const taskText = listPhrase(article.tasks?.length ? article.tasks : [article.title.toLowerCase()]);
  const relatedNames = related.slice(0, 3).map((slug) => `[[${slug}]]`).join(", ");

  return `---\n${yaml(frontmatter)}---\n\n# ${article.title}\n\nFrom BC Construction Safety Wiki\n\n## Summary\n\n${article.title} is a BC construction safety reference page for ${taskText}. It helps a supervisor or worker connect the topic to the site condition, the people exposed, the documents that should exist, and the related articles that carry deeper legal or procedure detail.\n\nThe field value is in the checks: what changed today, who is affected, what control is already in place, what record proves the control was reviewed, and when the crew must stop for a supervisor. Read this page with ${relatedNames} so the topic does not sit apart from the rest of the site safety system.\n\nThis page remains a Draft support article. It is written in original plain language, but exact legal wording, section references, and field procedure details still need qualified BC safety/source review before the article is treated as public-ready. {{review:source}}\n\n## When this applies\n\n${bullets([
    `The work involves ${taskText} or the topic affects how the work is planned.`,
    `The work can expose workers, nearby trades, visitors, tenants, pedestrians, traffic, or the public to ${hazardText}.`,
    "A document, inspection, orientation, permit, plan, or record needs to be prepared or updated before work continues.",
    "A supervisor is assigning the task to a worker who is new to the site, new to the task, or unsure which rule applies.",
    "Weather, access, equipment, public interface, other trades, or the work sequence changes the original plan.",
    "An inspection, near miss, refusal, incident, or worker concern suggests the existing control needs review.",
    "A maintainer needs a clear reference article that links to higher-risk pages, source notes, tools, and related documents.",
  ])}\n\n## Legal requirements\n\n${bullets([
    `Check the cited WorkSafeBC source and any related official guidance before using this article for site direction. {{cite:${citations[0]}}}`,
    `Identify the hazards connected to ${article.title.toLowerCase()} and control them before workers are exposed. {{cite:${citations[1] || citations[0]}}}`,
    `Provide information, instruction, supervision, equipment, and PPE that match the worker and task. {{cite:${citations[2] || citations[0]}}}`,
    "Keep legal requirements separate from best practice, owner rules, manufacturer instructions, and sample procedures. {{review:source}}",
    `Keep written plans, procedures, inspections, permits, assessments, or records when the source or site condition calls for them. {{cite:${citations[0]}}}`,
    "Coordinate overlapping work with the prime contractor, employer, supervisor, affected workers, and nearby trades. {{review:source}}",
    "Stop and reassess the work when a required control is missing, conditions change, or a worker reports an unsafe condition. {{review:source}}",
    "A qualified reviewer must confirm exact section wording before this draft is used as a compliance checklist. {{review:source}}",
  ])}\n\n## Best practice\n\n${bullets([
    "Start with the actual site condition and crew, then choose the control and document set that match that condition.",
    "Use the most protective practical control before relying on reminders, signs, or PPE alone.",
    "Name the person who can approve field changes and the condition that triggers a stop-work pause.",
    "Keep the article linked to related hazards so workers can move from a broad topic to the specific control they need.",
    "Use simple sketches, photos, tags, labels, or location notes when they prevent confusion in the field.",
    "Review the topic after a near miss, failed inspection, equipment change, crew change, or recurring deficiency.",
    "Record follow-up so the same issue is not reopened at every inspection.",
  ])}\n\n## Required documents\n\n${bullets(documents.map((document, index) => `${document}: ${documentReason(index)} {{cite:${citations[index % citations.length]}}`))}\n\n## Step-by-step safe procedure\n\n${numbered([
    `Define how ${article.title.toLowerCase()} connects to today's work area, task, crew, and equipment.`,
    "Read the related article that carries the closest legal or high-risk control before relying on this page alone.",
    `Identify the likely hazards, including ${hazardText}, and who could be affected.`,
    `Confirm the official source, site rule, or procedure that applies to the work. {{cite:${citations[0]}}}`,
    `Prepare or update ${documents[0]} and any supporting record that the site requires.`,
    "Set up controls before production work starts and make sure workers understand the limits.",
    "Brief workers on the stop-work trigger, reporting path, and emergency or first aid contact route.",
    "Check the work during the shift for changed conditions, missing controls, or nearby work that affects the topic.",
    "Record deficiencies with an owner, interim control, and follow-up time.",
    "Update links, source notes, or procedures when review finds a missing citation or unclear field instruction.",
  ])}\n\n## Worker checklist\n\n${checklist([
    `I understand how ${article.title.toLowerCase()} affects my task today.`,
    `I know the likely hazards, including ${hazardText}.`,
    "I know the control that must be in place before I start.",
    `I know where ${documents[0]} or the related site procedure is kept.`,
    "I have the required PPE, tools, equipment, and instructions for the task.",
    "I know who is supervising the work and who can answer questions.",
    "I know how to report a hazard, near miss, refusal, or changed condition.",
    "I can name one condition that means the work must stop.",
    "I know the emergency response or first aid contact path if something goes wrong.",
    "I will not continue if the work no longer matches the plan.",
  ])}\n\n## Supervisor checklist\n\n${checklist([
    `The topic has been checked against current source notes for ${article.title}.`,
    "Workers understand which part is legal requirement, best practice, sample procedure, and checklist.",
    "Required documents are current and match the actual site condition.",
    "Workers are trained, instructed, supervised, or otherwise competent for the assigned work.",
    "Controls are installed before work starts and checked while work continues.",
    "Adjacent trades, public interface, mobile equipment, emergency access, and weather are considered.",
    "Deficiencies have an owner, due time, and interim control.",
    "Changed conditions trigger a pause and review before work continues.",
    "Records are kept without collecting unnecessary personal information.",
    "Source-review flags remain open until a qualified reviewer checks the article. {{review:source}}",
  ])}\n\n## Common mistakes\n\n${bullets([
    "Treating a support article as if it contains every legal detail for the task.",
    "Using a generic instruction that does not match the actual crew, equipment, location, or sequence.",
    "Starting work before the required document, briefing, inspection, or review is complete.",
    "Relying on PPE or worker memory when a stronger control is practical.",
    "Failing to update the plan after weather, access, equipment, crew, or adjacent work changes.",
    "Closing a deficiency without checking the corrective action in the field.",
    "Not telling nearby trades or the prime contractor when the hazard can affect them.",
    "Letting a familiar construction hazard continue because it has not caused an incident yet.",
  ])}\n\n## Related topics\n\n${bullets(related.map((slug) => `[[${slug}]]`))}\n\n## Official sources\n\n${bullets(citations.map((id) => `{{cite:${id}}}`))}\n\n## Reviewer notes\n\n- Tier 3 source review is still required before changing maturity to Source checked or Ready for public use. {{review:source}}\n- Reviewer should decide whether this page needs a deeper Tier 1 or Tier 2 treatment later.\n- Field reviewer should confirm that the checklist is useful for the intended construction audience.\n\n## Version history\n\n- 0.3 Tier 3 hardening: Replaced scaffold wording with practical reference-page copy, review metadata, links, and source notes.\n- 0.2 deep draft: Moved to Markdown source with wiki links and citation tokens.\n- 0.1 scaffold: Initial structured article draft.\n\n## Disclaimer\n\nPlain-language safety information for BC construction. Not legal advice, medical advice, engineering advice, or a substitute for official sources, qualified professionals, manufacturer instructions, or site-specific procedures.\n`;
}

function ensureCitations(article, sourceIds) {
  const candidates = unique([...(article.regulationRefs || []), ...(article.citationIds || []), ...sourceIds]);
  if (candidates.length >= 3) return candidates;
  return unique([...candidates, "worksafebc-ohs-regulation", "worksafebc-ohs-guidelines", "workers-compensation-act"]).slice(0, 5);
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
    "occupational-first-aid-requirements",
    "incident-investigation",
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
    "records the expected control before the task starts.",
    "shows the crew had a current instruction source for the work.",
    "supports follow-up when a deficiency, refusal, incident, or source-review question is raised.",
    "keeps the field method tied to the actual hazard, equipment, and location.",
    "helps the prime contractor and affected trades coordinate overlapping work.",
    "shows workers received task-specific instruction before doing the work.",
    "gives the crew a reference point when conditions change mid-shift.",
    "creates a review trail for the next source or safety check.",
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
