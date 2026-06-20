export const maturityLevels = [
  "Draft",
  "Source checked",
  "Safety reviewed",
  "Ready for public use",
  "Needs update",
];

export const tierOneArticleSlugs = [
  "fall-protection",
  "fall-protection-plan",
  "fall-arrest",
  "guardrails",
  "silica-exposure-control",
  "respirators",
  "asbestos-basics",
  "excavation-and-trenching",
  "confined-space-entry",
  "confined-space-rescue",
  "cranes-and-hoists",
  "rigging-basics",
  "electrical-safety-near-power-lines",
  "occupational-first-aid-requirements",
  "traffic-control",
];

export const tierTwoArticleSlugs = [
  "ppe-basics",
  "ladders",
  "scaffolds",
  "hot-work",
  "housekeeping",
  "site-orientation",
  "workplace-inspections",
  "mobile-equipment",
  "lockout",
  "demolition-planning",
  "site-emergency-response-plan",
  "first-aid-assessment",
  "traffic-control-plans",
  "traffic-control-persons",
];

export const articleWorkflow = Object.fromEntries([
  ...tierOneArticleSlugs.map((slug) => [
    slug,
    {
      reviewTier: "Tier 1",
      maturity: "Draft",
      reviewPriority: "High-risk legal/source hardening",
    },
  ]),
  ...tierTwoArticleSlugs.map((slug) => [
    slug,
    {
      reviewTier: "Tier 2",
      maturity: "Draft",
      reviewPriority: "Common field-use review",
    },
  ]),
]);

export const wikiRedirects = [
  { from: "tie-off", term: "tie off", to: "fall-protection" },
  { from: "tie-off-plan", term: "tie off plan", to: "fall-protection-plan" },
  { from: "hole-cover", term: "hole cover", to: "floor-openings-and-covers" },
  { from: "floor-hole", term: "floor hole", to: "floor-openings-and-covers" },
  { from: "dust-mask", term: "dust mask", to: "respirators" },
  { from: "mask-fit-test", term: "mask fit test", to: "respirators" },
  { from: "toolbox-talk", term: "toolbox talk", to: "toolbox-talks" },
  { from: "tailgate-meeting", term: "tailgate meeting", to: "toolbox-talks" },
  { from: "silica-dust", term: "silica dust", to: "silica-exposure-control" },
  { from: "concrete-dust", term: "concrete dust", to: "silica-exposure-control" },
  { from: "crane-pick", term: "crane pick", to: "cranes-and-hoists" },
  { from: "pick-plan", term: "pick plan", to: "lift-plans" },
  { from: "first-aid-room", term: "first aid room", to: "first-aid-room" },
  { from: "fall-rescue", term: "fall rescue", to: "fall-rescue-plan" },
  { from: "confined-space-permit", term: "confined space permit", to: "confined-space-entry" },
  { from: "entry-permit", term: "entry permit", to: "confined-space-entry" },
  { from: "power-line", term: "power line", to: "electrical-safety-near-power-lines" },
  { from: "30m33", term: "30M33", to: "electrical-safety-near-power-lines" },
];

export const glossaryTerms = [
  {
    term: "competent person",
    slug: "competent-person",
    targetArticle: "supervisor-duties",
    definition:
      "A person who has enough training, experience, and knowledge of the work and hazards to carry out an assigned safety duty.",
  },
  {
    term: "qualified person",
    slug: "qualified-person",
    targetArticle: "supervisor-duties",
    definition:
      "A person whose education, training, experience, or professional status is suitable for the specific work or assessment being assigned.",
  },
  {
    term: "prime contractor",
    slug: "prime-contractor",
    targetArticle: "prime-contractor-duties",
    definition:
      "The party responsible for coordinating health and safety activities at a multiple-employer construction workplace.",
  },
  {
    term: "exposure control plan",
    slug: "exposure-control-plan",
    targetArticle: "silica-exposure-control",
    definition:
      "A written plan describing exposure hazards, controls, training, monitoring, and review for a hazardous substance or process.",
  },
  {
    term: "rescue plan",
    slug: "rescue-plan",
    targetArticle: "fall-rescue-plan",
    definition:
      "A planned method for summoning help, reaching a worker, controlling hazards, and moving the worker to first aid or medical care.",
  },
  {
    term: "safe work procedure",
    slug: "safe-work-procedure",
    targetArticle: "site-specific-safety-plan",
    definition:
      "A written procedure that tells workers how to do a task safely for the site conditions, hazards, equipment, and crew involved.",
  },
];

export const searchSuggestionTerms = [
  "tie off",
  "silica dust",
  "crane pick",
  "first aid room",
  "fall rescue",
  "confined space permit",
];

export const articleResourceLinks = {
  "fall-protection": {
    toolboxTalks: ["tie-off-planning-before-edge-work", "harness-inspection", "fall-rescue-readiness"],
    checklists: ["fall-protection"],
    quizzes: ["fall-protection-quiz"],
    forms: ["toolbox-talk-attendance", "training-matrix", "hazard-report"],
  },
  "fall-protection-plan": {
    toolboxTalks: ["tie-off-planning-before-edge-work", "fall-rescue-readiness"],
    checklists: ["fall-protection"],
    quizzes: ["fall-protection-quiz"],
    forms: ["toolbox-talk-attendance", "hazard-report"],
  },
  "fall-arrest": {
    toolboxTalks: ["harness-inspection", "fall-rescue-readiness"],
    checklists: ["fall-protection"],
    quizzes: ["fall-protection-quiz"],
    forms: ["equipment-inspection", "training-matrix"],
  },
  guardrails: {
    toolboxTalks: ["guardrails-and-floor-openings", "tie-off-planning-before-edge-work"],
    checklists: ["fall-protection", "daily-site-inspection"],
    quizzes: ["fall-protection-quiz"],
    forms: ["site-safety-inspection", "hazard-report"],
  },
  "silica-exposure-control": {
    toolboxTalks: ["silica-dust-controls", "wet-cutting-and-hepa-cleanup", "respirator-fit-and-seal-checks"],
    checklists: ["silica-dust"],
    quizzes: ["silica-and-dust-quiz"],
    forms: ["hazard-report", "training-matrix", "site-safety-inspection"],
  },
  respirators: {
    toolboxTalks: ["respirator-fit-and-seal-checks", "silica-dust-controls"],
    checklists: ["ppe", "silica-dust"],
    quizzes: ["ppe-quiz", "silica-and-dust-quiz"],
    forms: ["training-matrix", "equipment-inspection"],
  },
  "asbestos-basics": {
    toolboxTalks: ["whmis-labels-and-sds-access", "respirator-fit-and-seal-checks"],
    checklists: ["whmis-sds", "ppe"],
    quizzes: ["whmis-sds-quiz", "silica-and-dust-quiz"],
    forms: ["hazard-report", "training-matrix", "site-safety-inspection"],
  },
  "excavation-and-trenching": {
    toolboxTalks: ["trench-cave-in-warning-signs", "underground-utility-awareness"],
    checklists: ["excavations"],
    quizzes: ["excavation-and-trenching-quiz"],
    forms: ["hazard-report", "site-safety-inspection"],
  },
  "confined-space-entry": {
    toolboxTalks: ["confined-space-entry-basics", "atmospheric-testing-awareness"],
    checklists: ["confined-space-pre-entry"],
    quizzes: ["confined-spaces-quiz"],
    forms: ["hazard-report", "training-matrix"],
  },
  "confined-space-rescue": {
    toolboxTalks: ["confined-space-entry-basics", "atmospheric-testing-awareness"],
    checklists: ["confined-space-pre-entry", "emergency-response"],
    quizzes: ["confined-spaces-quiz", "emergency-response-quiz"],
    forms: ["hazard-report", "incident-report"],
  },
  "cranes-and-hoists": {
    toolboxTalks: ["crane-pick-communication", "exclusion-zones-under-suspended-loads"],
    checklists: ["mobile-equipment"],
    quizzes: ["cranes-rigging-quiz"],
    forms: ["equipment-inspection", "hazard-report"],
  },
  "rigging-basics": {
    toolboxTalks: ["rigging-inspection-basics", "exclusion-zones-under-suspended-loads"],
    checklists: ["mobile-equipment"],
    quizzes: ["cranes-rigging-quiz"],
    forms: ["equipment-inspection", "hazard-report"],
  },
  "electrical-safety-near-power-lines": {
    toolboxTalks: ["overhead-power-line-awareness", "extension-cords-and-temporary-power"],
    checklists: ["daily-site-inspection", "mobile-equipment"],
    quizzes: ["electrical-safety-quiz"],
    forms: ["hazard-report", "site-safety-inspection"],
  },
  "occupational-first-aid-requirements": {
    toolboxTalks: ["first-aid-access-and-reporting", "aed-location-and-emergency-access"],
    checklists: ["first-aid-kit-first-aid-room", "emergency-response"],
    quizzes: ["first-aid-quiz"],
    forms: ["incident-report", "near-miss-report"],
  },
  "traffic-control": {
    toolboxTalks: ["traffic-control-around-deliveries", "pedestrian-detours"],
    checklists: ["traffic-control"],
    quizzes: ["traffic-control-quiz"],
    forms: ["site-safety-inspection", "hazard-report"],
  },
};

export const reviewerChecklist = [
  "Legal citations checked against current WorkSafeBC/OHS source",
  "Wording does not overstate law or remove required judgement",
  "Best practice is separated from legal requirement",
  "Procedure is practical for BC construction field use",
  "Worker and supervisor checklists match the article content",
  "Related links, forms, toolbox talks, and quizzes are relevant",
  "No proprietary manual text or excessive source copying",
];

export function workflowForArticle(slug) {
  return articleWorkflow[slug] || {
    reviewTier: "Tier 3",
    maturity: "Draft",
    reviewPriority: "Support/reference review",
  };
}
