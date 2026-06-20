const REVIEW_DATE = "2026-06-19";

export const sourceHierarchy = [
  "WorkSafeBC OHS Regulation",
  "WorkSafeBC OHS Guidelines",
  "WorkSafeBC Prevention Manual / OHS policies",
  "Workers Compensation Act OHS provisions",
  "BC Building Code / Fire Code where relevant",
  "BCCSA resources where useful",
  "CSA / ANSI / manufacturer standards only where referenced or commonly required",
  "Field-proven procedures labelled as non-legal best practice",
];

export const wikiSources = [
  {
    id: "worksafebc-ohs-regulation",
    title: "WorkSafeBC OHS Regulation",
    publisher: "WorkSafeBC",
    type: "Regulation",
    priority: 1,
    jurisdiction: "BC",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation",
    note: "Primary legal source for BC occupational health and safety regulation.",
  },
  {
    id: "worksafebc-ohs-guidelines",
    title: "WorkSafeBC OHS Guidelines",
    publisher: "WorkSafeBC",
    type: "Guideline",
    priority: 2,
    jurisdiction: "BC",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-guidelines",
    note: "Interpretive guidance used only when the article clearly labels it as guidance.",
  },
  {
    id: "worksafebc-rights-responsibilities",
    title: "Roles, rights, and responsibilities",
    publisher: "WorkSafeBC",
    type: "Guidance",
    priority: 2,
    jurisdiction: "BC",
    url: "https://www.worksafebc.com/en/health-safety/create-manage/rights-responsibilities",
    note: "Plain-language WorkSafeBC guidance on employer, supervisor, and worker responsibilities.",
  },
  {
    id: "worksafebc-refusing-unsafe-work",
    title: "Refusing unsafe work",
    publisher: "WorkSafeBC",
    type: "Guidance",
    priority: 2,
    jurisdiction: "BC",
    url: "https://www.worksafebc.com/en/health-safety/create-manage/rights-responsibilities/refusing-unsafe-work",
    note: "Worker-facing WorkSafeBC guidance on the unsafe work refusal process.",
  },
  {
    id: "worksafebc-young-new-workers",
    title: "Young and new workers",
    publisher: "WorkSafeBC",
    type: "Guidance",
    priority: 2,
    jurisdiction: "BC",
    url: "https://www.worksafebc.com/en/health-safety/education-training-certification/young-new-worker",
    note: "WorkSafeBC guidance and resources for orientation, training, and supervision of young and new workers.",
  },
  {
    id: "worksafebc-first-aid-requirements",
    title: "First aid requirements",
    publisher: "WorkSafeBC",
    type: "Guidance",
    priority: 2,
    jurisdiction: "BC",
    url: "https://www.worksafebc.com/en/health-safety/create-manage/first-aid-requirements",
    note: "WorkSafeBC guidance on first aid assessment, supplies, facilities, attendants, and review.",
  },
  {
    id: "worksafebc-jhsc",
    title: "Joint health and safety committees",
    publisher: "WorkSafeBC",
    type: "Guidance",
    priority: 2,
    jurisdiction: "BC",
    url: "https://www.worksafebc.com/en/health-safety/create-manage/joint-health-safety-committees",
    note: "WorkSafeBC guidance on joint committee and worker representative requirements.",
  },
  {
    id: "worksafebc-workplace-inspections",
    title: "Workplace inspections",
    publisher: "WorkSafeBC",
    type: "Guidance",
    priority: 2,
    jurisdiction: "BC",
    url: "https://www.worksafebc.com/en/health-safety/create-manage/workplace-inspections",
    note: "WorkSafeBC guidance on regular workplace inspections and corrective measures.",
  },
  {
    id: "worksafebc-notice-project",
    title: "Submit a Notice of Project form",
    publisher: "WorkSafeBC",
    type: "Form guidance",
    priority: 2,
    jurisdiction: "BC",
    url: "https://www.worksafebc.com/en/for-employers/just-for-you/submit-notice-project",
    note: "WorkSafeBC guidance on when and how certain projects require written notice before work starts.",
  },
  {
    id: "worksafebc-serious-incident-reporting",
    title: "Reporting serious incidents and fatalities",
    publisher: "WorkSafeBC",
    type: "Guidance",
    priority: 2,
    jurisdiction: "BC",
    url: "https://www.worksafebc.com/en/claims/report-workplace-injury-illness/reporting-serious-accidents-fatalities",
    note: "WorkSafeBC guidance on immediate reporting, incident response, and scene protection.",
  },
  {
    id: "worksafebc-hot-work-fire",
    title: "Reducing workplace fires and explosions from hot work",
    publisher: "WorkSafeBC",
    type: "Safety bulletin",
    priority: 2,
    jurisdiction: "BC",
    url: "https://www.worksafebc.com/about-us/news-events/campaigns/2022/August/risk-workplace-fires-explosions-hot-work",
    note: "WorkSafeBC safety bulletin used for hot work fire prevention controls.",
  },
  {
    id: "worksafebc-prevention-manual",
    title: "WorkSafeBC Prevention Manual / OHS policies",
    publisher: "WorkSafeBC",
    type: "Policy",
    priority: 3,
    jurisdiction: "BC",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/policies",
    note: "Policy and prevention materials for source-backed interpretation.",
  },
  {
    id: "workers-compensation-act",
    title: "Workers Compensation Act",
    publisher: "BC Laws",
    type: "Act",
    priority: 4,
    jurisdiction: "BC",
    url: "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/19001_00",
    note: "OHS provisions and enforcement framework.",
  },
  {
    id: "bc-building-code",
    title: "BC Codes",
    publisher: "Government of British Columbia",
    type: "Code",
    priority: 5,
    jurisdiction: "BC",
    url: "https://www2.gov.bc.ca/gov/content/industry/construction-industry/building-codes-standards",
    note: "Building and fire code context where relevant to construction safety.",
  },
  {
    id: "bccsa",
    title: "BCCSA resources",
    publisher: "BC Construction Safety Alliance",
    type: "Industry resource",
    priority: 6,
    jurisdiction: "BC",
    url: "https://www.bccsa.ca/",
    note: "Useful industry tools and training resources, not treated as law by default.",
  },
  {
    id: "heart-stroke-cpr",
    title: "CPR and AED learning resources",
    publisher: "Heart & Stroke Canada",
    type: "Emergency guidance",
    priority: 7,
    jurisdiction: "Canada",
    url: "https://www.heartandstroke.ca/how-you-can-help/learn-cpr",
    note: "Used for emergency response articles; not a replacement for site first aid procedures or medical advice.",
  },
];

export const regulationRefs = [
  {
    id: "ohsr-part-3",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 3",
    title: "Rights and Responsibilities",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-03-rights-and-responsibilities",
  },
  {
    id: "ohsr-part-4",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 4",
    title: "General Conditions",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-04-general-conditions",
  },
  {
    id: "ohsr-part-5",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 5",
    title: "Chemical Agents and Biological Agents",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-05-chemical-agents-and-biological-agents",
  },
  {
    id: "ohsr-part-6",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 6",
    title: "Substance Specific Requirements",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-06-substance-specific-requirements",
  },
  {
    id: "ohsr-part-8",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 8",
    title: "Personal Protective Clothing and Equipment",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-08-personal-protective-clothing-and-equipment",
  },
  {
    id: "ohsr-part-9",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 9",
    title: "Confined Spaces",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-09-confined-spaces",
  },
  {
    id: "ohsr-part-11",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 11",
    title: "Fall Protection",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-11-fall-protection",
  },
  {
    id: "ohsr-part-12",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 12",
    title: "Tools, Machinery and Equipment",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-12-tools-machinery-and-equipment",
  },
  {
    id: "ohsr-part-13",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 13",
    title: "Ladders, Scaffolds and Temporary Work Platforms",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-13-ladders-scaffolds-and-temporary-work-platforms",
  },
  {
    id: "ohsr-part-14",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 14",
    title: "Cranes and Hoists",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-14-cranes-and-hoists",
  },
  {
    id: "ohsr-part-16",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 16",
    title: "Mobile Equipment",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-16-mobile-equipment",
  },
  {
    id: "ohsr-part-18",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 18",
    title: "Traffic Control",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-18-traffic-control",
  },
  {
    id: "ohsr-part-19",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 19",
    title: "Electrical Safety",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-19-electrical-safety",
  },
  {
    id: "ohsr-part-20",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 20",
    title: "Construction, Excavation and Demolition",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-20-construction-excavation-and-demolition",
  },
  {
    id: "ohsr-part-32",
    instrument: "WorkSafeBC OHS Regulation",
    part: "Part 32",
    title: "Evacuation and Rescue",
    url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-32-evacuation-and-rescue",
  },
];

export const wikiCategories = [
  {
    id: "duties-rights",
    title: "Duties & Rights",
    description: "Prime contractor, employer, supervisor, worker, young worker, and JHSC obligations.",
    topics: [
      "Prime contractor duties",
      "Employer duties",
      "Supervisor duties",
      "Worker rights and responsibilities",
      "Refusal of unsafe work",
      "Young/new workers",
      "Joint health and safety committees",
    ],
  },
  {
    id: "program-documentation",
    title: "Safety Program & Documentation",
    description: "The paperwork that proves the safety system exists and is being used.",
    topics: [
      "OHS program",
      "Site orientation",
      "Inspections",
      "Toolbox talks",
      "Safe work procedures",
      "Exposure control plans",
      "Emergency plans",
      "Training records",
      "Incident investigation",
    ],
  },
  {
    id: "high-risk-work",
    title: "High-Risk Work",
    description: "Tasks where planning, competency, permits, rescue, or engineering are often critical.",
    topics: [
      "Fall protection",
      "Excavation",
      "Confined spaces",
      "Cranes and hoists",
      "Rigging",
      "Electrical safety",
      "Lockout",
      "Demolition",
      "Traffic control",
      "Mobile equipment",
    ],
  },
  {
    id: "construction-activities",
    title: "Construction Activities",
    description: "Trade and task-specific construction safety topics.",
    topics: [
      "Concrete work",
      "Roofing",
      "Formwork",
      "Falsework",
      "Scaffolds",
      "Ladders",
      "Hoarding/public protection",
      "Hot work",
      "Welding and cutting",
    ],
  },
  {
    id: "health-hazards",
    title: "Health Hazards",
    description: "Exposure control topics that often need assessment, controls, training, and records.",
    topics: [
      "Silica",
      "Asbestos",
      "Lead",
      "Noise",
      "Heat stress",
      "Cold stress",
      "WHMIS",
      "Respirators",
      "Carbon monoxide",
    ],
  },
  {
    id: "ppe-equipment",
    title: "PPE & Equipment",
    description: "PPE selection, use, inspection, and limitations.",
    topics: [
      "Hard hats",
      "Eye/face protection",
      "High visibility apparel",
      "Footwear",
      "Gloves",
      "Hearing protection",
      "Respiratory protection",
      "Fall arrest equipment",
    ],
  },
  {
    id: "emergency-medical",
    title: "Emergency & Medical",
    description: "First aid, rescue, emergency access, and incident escalation.",
    topics: [
      "Occupational first aid",
      "Cardiac arrest",
      "AEDs",
      "Rescue plans",
      "Fall rescue",
      "Confined space rescue",
      "Fire prevention",
      "Evacuation",
      "Serious injury reporting",
    ],
  },
];

const baseArticle = {
  jurisdiction: "BC",
  difficulty: "Basic",
  status: "MVP draft",
  confidenceLevel: "Source-cited draft",
  review: {
    lastReviewed: REVIEW_DATE,
    nextReview: "2026-09-19",
    legalReviewStatus: "Needs qualified review",
    safetyReviewStatus: "Needs field review",
  },
};

const defaultLegal = [
  "Confirm the applicable WorkSafeBC OHS Regulation sections before the work starts.",
  "Keep legal requirements separate from site best practices and sample procedures.",
  "Use the cited official source as the authority when a conflict appears.",
];

const defaultWhenApplies = [
  "This applies when the task, hazard, equipment, worker group, or document requirement is present on a BC construction site.",
  "Confirm the site-specific facts and cited official sources before relying on this article for planning or field direction.",
];

const defaultBestPractice = [
  "Review the work with the supervisor and affected workers before the task starts.",
  "Use the most protective practical control before relying on PPE or worker behaviour alone.",
  "Update the procedure when the site condition, crew, equipment, sequence, or source requirement changes.",
];

const defaultProcedure = [
  "Identify the task, workers, location, equipment, and hazards before work starts.",
  "Confirm the required written plan, permit, procedure, training, inspection, or record is available.",
  "Set up controls before production work begins and stop work if conditions change.",
  "Document deficiencies and corrective actions.",
];

const defaultWorkerChecklist = [
  "I know the hazard and the control expected for this task.",
  "I have been instructed for the task and know who is supervising it.",
  "Required PPE and equipment are available, inspected, and used correctly.",
  "I know how to stop work and report a concern.",
];

const defaultSupervisorChecklist = [
  "Applicable regulation/source checked.",
  "Workers instructed and competent for the task.",
  "Required documents, inspections, and records are current.",
  "Controls are installed before work begins and monitored while work continues.",
];

const defaultMistakes = [
  "Using a generic procedure that does not match the site condition.",
  "Starting work before required documents or inspections are complete.",
  "Treating a best practice as a legal requirement or treating a legal requirement as optional.",
];

function createArticle(article) {
  return {
    ...baseArticle,
    ...article,
    aliases: article.aliases || [],
    trades: article.trades || ["All construction trades"],
    hazards: article.hazards || [],
    tasks: article.tasks || [],
    requiredDocuments: article.requiredDocuments || [],
    regulationRefs: article.regulationRefs || [],
    sourceIds: article.sourceIds || ["worksafebc-ohs-regulation"],
    related: article.related || [],
    sections: {
      whenApplies:
        article.sections?.whenApplies || article.whenApplies || defaultWhenApplies,
      legalRequirements:
        article.sections?.legalRequirements || article.legalRequirements || defaultLegal,
      bestPractice:
        article.sections?.bestPractice || article.bestPractice || defaultBestPractice,
      requiredDocuments:
        article.sections?.requiredDocuments ||
        article.requiredDocuments ||
        ["Site-specific records required by the cited source and the employer's OHS program."],
      procedure: article.sections?.procedure || article.procedure || defaultProcedure,
      workerChecklist:
        article.sections?.workerChecklist ||
        article.workerChecklist ||
        defaultWorkerChecklist,
      supervisorChecklist:
        article.sections?.supervisorChecklist ||
        article.supervisorChecklist ||
        defaultSupervisorChecklist,
      commonMistakes:
        article.sections?.commonMistakes || article.commonMistakes || defaultMistakes,
    },
  };
}

const mvpArticleDefinitions = [
  {
    slug: "fall-protection",
    title: "Fall Protection",
    category: "High-Risk Work",
    summary:
      "Fall protection prevents workers from falling, or limits injury if a fall happens. In BC, guardrails or fall restraint are preferred where practicable, and fall arrest must be backed by planning, rescue, training, and equipment inspection.",
    aliases: ["tie off", "working at heights", "fall arrest", "fall restraint", "edge protection"],
    hazards: ["Falls from height", "Open edges", "Floor openings", "Suspension trauma"],
    tasks: ["Roof work", "Leading edge work", "Scaffold access", "Elevated work"],
    requiredDocuments: [
      "Fall protection plan",
      "Rescue plan",
      "Equipment inspection record",
      "Training/instruction record",
      "Manufacturer instructions",
    ],
    regulationRefs: ["ohsr-part-11"],
    related: [
      "guardrails",
      "fall-arrest",
      "fall-restraint",
      "anchor-points",
      "fall-rescue-plan",
      "ladders",
      "scaffolds",
      "occupational-first-aid-requirements",
    ],
    whenApplies: [
      "Workers could fall from a roof edge, floor opening, leading edge, scaffold, work platform, ladder, formwork, or similar elevated location.",
      "A fall could occur from 3 m or more, or from a lower height where the landing condition could cause serious injury.",
    ],
    legalRequirements: [
      "Use fall protection where required by WorkSafeBC OHS Regulation Part 11.",
      "Choose guardrails or another passive control where practicable before relying on personal fall protection.",
      "When personal systems are used, workers must be instructed and the system must be appropriate for restraint, arrest, clearance, swing fall, and rescue.",
      "A written fall protection plan is required in higher-risk situations identified by Part 11, including work where permanent guardrails are not used and fall distance thresholds are met.",
      "Defective or impacted fall protection equipment must be removed from service according to the regulation and manufacturer instructions.",
    ],
    bestPractice: [
      "Design the work so a worker cannot reach the fall edge before choosing fall arrest.",
      "Treat rescue planning as part of the work setup, not as an emergency-only document.",
      "Mark anchor limits and travel restraint limits in the field when possible.",
    ],
    procedure: [
      "Identify every fall hazard before work starts.",
      "Use guardrails, covers, or other passive controls where practicable.",
      "If personal systems are needed, choose restraint before arrest where possible.",
      "Confirm anchors, harnesses, lanyards, lifelines, connectors, clearance, swing-fall risk, and rescue method.",
      "Instruct workers on the system and site-specific hazards.",
      "Inspect equipment before use and remove defective equipment.",
      "Keep the fall protection plan and rescue plan available on site.",
      "Stop work if weather, access, anchors, or work sequence changes.",
    ],
    workerChecklist: [
      "I know where the fall hazards are.",
      "I was instructed on this fall protection system.",
      "My harness, lanyard, lifeline, and connectors are inspected.",
      "My anchor is approved for this use.",
      "I can explain the rescue plan.",
      "I am not working past protected limits.",
    ],
    supervisorChecklist: [
      "Fall hazards identified.",
      "Best practicable control selected.",
      "Fall protection plan required? If yes, written and available.",
      "Rescue method ready before work starts.",
      "Workers instructed.",
      "Equipment inspected and defective gear removed.",
    ],
    commonMistakes: [
      "Treating fall arrest as the first choice.",
      "No rescue plan before work begins.",
      "Tying off to unverified anchors.",
      "Ignoring swing fall and clearance.",
      "Missing documentation for temporary lifelines or engineered systems.",
    ],
  },
  {
    slug: "fall-protection-plan",
    title: "Fall Protection Plan",
    category: "Safety Program & Documentation",
    summary:
      "A fall protection plan is the written site document that explains hazards, systems, anchors, worker instruction, rescue, and work sequencing for fall-risk work.",
    aliases: ["fall plan", "working at heights plan", "tie off plan"],
    hazards: ["Falls from height"],
    tasks: ["Work at height", "Roof work", "Leading edge work"],
    requiredDocuments: ["Fall protection plan", "Rescue plan", "Equipment inspection record"],
    regulationRefs: ["ohsr-part-11"],
    related: ["fall-protection", "fall-rescue-plan", "anchor-points", "fall-arrest", "fall-restraint"],
    legalRequirements: [
      "A written fall protection plan is required when Part 11 requires one, including specified higher fall-distance or alternate procedure situations.",
      "The plan must address the work area, fall protection system, procedures, and rescue arrangements.",
      "Workers must be instructed in the plan before they enter the fall hazard area.",
    ],
  },
  {
    slug: "fall-arrest",
    title: "Fall Arrest",
    category: "High-Risk Work",
    summary:
      "Fall arrest is a personal fall protection system intended to stop a fall after it starts. It requires verified anchorage, compatible equipment, clearance, swing-fall control, inspection, and rescue planning.",
    aliases: ["full body harness", "lanyard", "self retracting lifeline", "SRL"],
    hazards: ["Falls from height", "Suspension trauma"],
    requiredDocuments: ["Equipment inspection record", "Rescue plan", "Training/instruction record"],
    regulationRefs: ["ohsr-part-11"],
    related: ["fall-protection", "anchor-points", "fall-rescue-plan", "fall-restraint"],
  },
  {
    slug: "fall-restraint",
    title: "Fall Restraint",
    category: "High-Risk Work",
    summary:
      "Fall restraint keeps the worker from reaching a fall edge. It is often safer than fall arrest because the system is designed to prevent a fall from occurring.",
    aliases: ["travel restraint", "restraint line", "work positioning restraint"],
    hazards: ["Falls from height"],
    requiredDocuments: ["Equipment inspection record", "Training/instruction record"],
    regulationRefs: ["ohsr-part-11"],
    related: ["fall-protection", "anchor-points", "guardrails", "fall-arrest"],
  },
  {
    slug: "guardrails",
    title: "Guardrails",
    category: "High-Risk Work",
    summary:
      "Guardrails are a passive fall protection control used to protect edges, openings, platforms, ramps, and similar fall hazards.",
    aliases: ["edge protection", "handrail", "temporary rail"],
    hazards: ["Falls from height", "Floor openings"],
    requiredDocuments: ["Inspection record where required", "Site-specific guardrail standard"],
    regulationRefs: ["ohsr-part-4", "ohsr-part-11", "ohsr-part-20"],
    related: ["fall-protection", "floor-openings-and-covers", "scaffolds", "ladders"],
  },
  {
    slug: "anchor-points",
    title: "Anchor Points",
    category: "High-Risk Work",
    summary:
      "Anchor points connect fall restraint or fall arrest systems to a structure. They must be suitable for the intended use and verified before workers rely on them.",
    aliases: ["tie off point", "anchorage", "roof anchor"],
    hazards: ["Falls from height"],
    requiredDocuments: ["Anchor documentation", "Manufacturer or engineering instructions"],
    regulationRefs: ["ohsr-part-11"],
    related: ["fall-protection", "fall-arrest", "fall-restraint", "fall-protection-plan"],
  },
  {
    slug: "fall-rescue-plan",
    title: "Fall Rescue Plan",
    category: "Emergency & Medical",
    summary:
      "A fall rescue plan explains how a suspended worker will be reached, recovered, and transferred to first aid or emergency medical services without improvising during the emergency.",
    aliases: ["rescue plan", "suspension trauma plan", "fall arrest rescue"],
    hazards: ["Suspension trauma", "Falls from height"],
    requiredDocuments: ["Rescue plan", "Emergency contacts", "Equipment inspection record"],
    regulationRefs: ["ohsr-part-11", "ohsr-part-32", "ohsr-part-3"],
    related: ["fall-protection", "fall-arrest", "occupational-first-aid-requirements", "cardiac-arrest-on-site"],
  },
  {
    slug: "silica-exposure-control",
    title: "Silica Exposure Control",
    category: "Health Hazards",
    summary:
      "Respirable crystalline silica dust can be created by cutting, grinding, drilling, crushing, blasting, or disturbing concrete, stone, brick, mortar, rock, and similar materials. BC silica work needs risk assessment, controls, training, and documentation.",
    aliases: ["silica dust", "concrete dust", "RCS", "dust control", "exposure control plan"],
    hazards: ["Respirable crystalline silica", "Dust exposure"],
    tasks: ["Concrete cutting", "Grinding", "Coring", "Demolition", "Rock drilling"],
    requiredDocuments: [
      "Silica risk assessment",
      "Exposure control plan",
      "Air monitoring record or documented exception",
      "Respirator fit test/training record",
      "Written work procedure",
    ],
    regulationRefs: ["ohsr-part-5", "ohsr-part-6", "ohsr-part-8"],
    related: [
      "respirators",
      "whmis-basics",
      "incident-investigation",
      "site-orientation",
      "demolition-planning",
      "concrete-formwork",
    ],
    whenApplies: [
      "Concrete, masonry, rock, brick, tile, mortar, or similar material is cut, drilled, ground, crushed, blasted, or demolished.",
      "Dust may expose workers or nearby trades to respirable crystalline silica.",
    ],
    legalRequirements: [
      "Before silica-process work that may expose workers to respirable crystalline silica, a qualified person must complete a risk assessment.",
      "When exposure may occur, a qualified person must develop an exposure control plan and the employer must implement it.",
      "Controls must follow the hierarchy of controls, prioritizing elimination/substitution and engineering controls before administrative controls and PPE.",
      "Air monitoring is required unless a qualified person documents a valid basis for not monitoring.",
      "Workers must receive instruction and training for the hazards, controls, respirators, cleanup methods, and procedures.",
    ],
    bestPractice: [
      "Plan silica tasks away from other trades where possible.",
      "Use water or local exhaust at the point of dust generation.",
      "Treat dry sweeping and compressed air cleanup as high-risk unless a qualified procedure specifically controls the dust.",
    ],
    procedure: [
      "Identify silica-containing materials and dust-generating tasks.",
      "Have a qualified person complete the risk assessment.",
      "Select controls such as wet methods, local exhaust, HEPA vacuuming, isolation, scheduling, and respirators where required.",
      "Write the task-specific procedure and controlled area requirements.",
      "Train workers and confirm respirator fit testing where needed.",
      "Set up the controls before work starts.",
      "Clean with wet methods or HEPA vacuuming where practicable.",
      "Review the plan when the task, tools, materials, work area, or monitoring results change.",
    ],
    workerChecklist: [
      "I know which task creates silica dust.",
      "Wet control or dust extraction is working.",
      "I am using the required respirator correctly.",
      "I know the cleanup method.",
      "I know who can enter the controlled area.",
    ],
    supervisorChecklist: [
      "Risk assessment completed by a qualified person.",
      "Exposure control plan available and task-specific.",
      "Controls set up before work starts.",
      "Workers trained and fit-tested where respirators are required.",
      "Monitoring requirement or exception documented.",
      "Cleanup/disposal method ready.",
    ],
    commonMistakes: [
      "Starting concrete cutting before a risk assessment.",
      "Using dry sweeping.",
      "Relying only on nuisance dust masks.",
      "No fit test for tight-fitting respirators.",
      "Copying a generic exposure control plan that does not match the task.",
    ],
  },
  {
    slug: "respirators",
    title: "Respirators",
    category: "PPE & Equipment",
    summary:
      "Respirators reduce inhalation exposure only when selected, fitted, used, cleaned, stored, and maintained correctly as part of a respiratory protection program.",
    aliases: ["mask", "half mask", "N95", "P100", "fit test", "respiratory protection"],
    hazards: ["Dust exposure", "Chemical exposure", "Silica", "Lead", "Asbestos"],
    requiredDocuments: ["Respiratory protection program", "Fit test record", "Training record"],
    regulationRefs: ["ohsr-part-8", "ohsr-part-5", "ohsr-part-6"],
    related: ["silica-exposure-control", "whmis-basics", "ppe-basics"],
  },
  {
    slug: "whmis-basics",
    title: "WHMIS Basics",
    category: "Health Hazards",
    summary:
      "WHMIS is the Canadian hazard communication system for hazardous products. Construction sites need labels, SDS access, instruction, and safe handling procedures.",
    aliases: ["SDS", "MSDS", "hazardous products", "chemical labels"],
    hazards: ["Chemical exposure"],
    requiredDocuments: ["Safety data sheets", "Training record", "Safe handling procedure"],
    regulationRefs: ["ohsr-part-5"],
    related: ["respirators", "ppe-basics", "site-orientation"],
  },
  {
    slug: "occupational-first-aid-requirements",
    title: "Occupational First Aid Requirements",
    category: "Emergency & Medical",
    summary:
      "BC construction employers must provide first aid attendants, supplies, facilities, procedures, and emergency transport arrangements based on the workplace first aid assessment.",
    aliases: ["first aid", "first aid room", "OFA", "first aid attendant"],
    hazards: ["Workplace injury", "Medical emergency"],
    requiredDocuments: ["First aid assessment", "Written first aid procedures", "First aid records"],
    regulationRefs: ["ohsr-part-3"],
    related: ["cardiac-arrest-on-site", "site-emergency-response-plan", "site-orientation", "incident-investigation"],
  },
  {
    slug: "cardiac-arrest-on-site",
    title: "Cardiac Arrest on Site",
    category: "Emergency & Medical",
    summary:
      "Cardiac arrest is a life-threatening emergency. The site response is to call 911, activate first aid, start CPR if trained and able, get an AED, follow AED prompts, and keep access clear for paramedics.",
    aliases: ["CPR", "AED", "heart attack", "collapsed worker", "medical emergency"],
    hazards: ["Medical emergency", "Cardiac arrest"],
    tasks: ["Emergency response", "First aid response"],
    sourceIds: ["worksafebc-ohs-regulation", "heart-stroke-cpr"],
    requiredDocuments: ["Written first aid procedures", "Emergency response plan", "First aid record"],
    regulationRefs: ["ohsr-part-3", "ohsr-part-32"],
    related: [
      "occupational-first-aid-requirements",
      "site-emergency-response-plan",
      "site-orientation",
      "incident-investigation",
      "fall-rescue-plan",
    ],
    whenApplies: [
      "A person collapses, is unresponsive, is not breathing normally, or cardiac arrest is suspected.",
      "The event occurs on or near a construction site and emergency access must be managed.",
    ],
    legalRequirements: [
      "The employer must provide required first aid attendants, supplies, facilities, services, and additional resources needed for prompt first aid and transport.",
      "The employer must keep up-to-date written first aid procedures, including how to call first aid, how attendants respond, and how access or movement barriers are handled.",
      "The first aid attendant has authority over first aid until care is transferred according to WorkSafeBC requirements.",
    ],
    bestPractice: [
      "Use named assignments during an emergency: one person calls 911, one gets the AED, one meets the ambulance.",
      "Keep AED locations visible in orientation, muster information, and high-traffic site areas.",
      "Practice emergency access routes during site drills.",
    ],
    procedure: [
      "Stop nearby work and make the scene safe.",
      "Call 911 immediately or direct a named person to call.",
      "Send a named person for the first aid attendant and AED.",
      "Start CPR if trained and able; follow dispatcher instructions.",
      "Turn on the AED and follow device prompts as soon as it is available.",
      "Assign someone to meet the ambulance at the site entrance.",
      "Clear access routes, hoists, elevators, gates, and muster interference.",
      "Preserve privacy and document according to first aid and incident procedures.",
    ],
    workerChecklist: [
      "Call 911.",
      "Get first aid and the AED.",
      "Do not crowd the patient.",
      "Keep access clear.",
      "Follow first aid attendant directions.",
    ],
    supervisorChecklist: [
      "Work stopped and scene safe.",
      "Emergency access opened.",
      "First aid attendant and AED dispatched.",
      "Ambulance guide assigned.",
      "Incident reporting and first aid records completed after the emergency.",
    ],
    commonMistakes: [
      "Searching for a supervisor before calling 911.",
      "Not knowing the AED location.",
      "Locked gates or blocked access.",
      "Crowd control failure.",
      "Treating emergency response as a toolbox-talk-only topic instead of practicing it.",
    ],
  },
  {
    slug: "site-emergency-response-plan",
    title: "Site Emergency Response Plan",
    category: "Emergency & Medical",
    summary:
      "A site emergency response plan explains how workers report emergencies, evacuate or shelter, get first aid, guide emergency services, and account for people.",
    aliases: ["ERP", "emergency plan", "evacuation plan"],
    hazards: ["Fire", "Medical emergency", "Rescue", "Evacuation"],
    requiredDocuments: ["Emergency response plan", "Site map", "Emergency contact list"],
    regulationRefs: ["ohsr-part-3", "ohsr-part-32"],
    related: [
      "cardiac-arrest-on-site",
      "occupational-first-aid-requirements",
      "site-orientation",
      "fire-prevention-plan",
    ],
  },
  {
    slug: "excavation-and-trenching",
    title: "Excavation and Trenching",
    category: "High-Risk Work",
    summary:
      "Excavation and trenching work must control cave-in, utility, mobile equipment, access, water, atmosphere, and public protection hazards before workers enter.",
    aliases: ["trench", "digging", "shoring", "slope", "utilities"],
    hazards: ["Cave-in", "Underground utilities", "Mobile equipment", "Water accumulation"],
    requiredDocuments: ["Excavation plan", "Utility locate record", "Inspection record", "Engineered shoring where required"],
    regulationRefs: ["ohsr-part-20"],
    related: [
      "mobile-equipment",
      "traffic-control",
      "confined-space-entry",
      "hoarding-and-public-protection",
    ],
  },
  {
    slug: "confined-space-entry",
    title: "Confined Space Entry",
    category: "High-Risk Work",
    summary:
      "Confined space entry requires identification, hazard assessment, written procedures, testing, ventilation, standby/rescue arrangements, and worker training before entry.",
    aliases: ["confined space", "entry permit", "tank entry", "vault entry"],
    hazards: ["Oxygen deficiency", "Toxic atmosphere", "Engulfment", "Entrapment"],
    requiredDocuments: ["Confined space hazard assessment", "Entry permit", "Rescue plan", "Atmospheric testing record"],
    regulationRefs: ["ohsr-part-9"],
    related: ["confined-space-rescue", "respirators", "site-emergency-response-plan", "occupational-first-aid-requirements"],
  },
  {
    slug: "confined-space-rescue",
    title: "Confined Space Rescue",
    category: "Emergency & Medical",
    summary:
      "Confined space rescue must be planned before entry. Rescue workers must be trained, equipped, and protected from the same hazards as entrants.",
    aliases: ["rescue plan", "standby rescue", "non-entry rescue"],
    hazards: ["Toxic atmosphere", "Oxygen deficiency", "Engulfment"],
    requiredDocuments: ["Rescue plan", "Training record", "Rescue equipment inspection"],
    regulationRefs: ["ohsr-part-9", "ohsr-part-32"],
    related: ["confined-space-entry", "site-emergency-response-plan", "occupational-first-aid-requirements"],
  },
  {
    slug: "ladders",
    title: "Ladders",
    category: "Construction Activities",
    summary:
      "Ladders are temporary access tools, not default work platforms. Selection, setup, angle, extension, securing, inspection, and three-point contact matter.",
    aliases: ["step ladder", "extension ladder", "access ladder"],
    hazards: ["Falls from height", "Access/egress"],
    requiredDocuments: ["Inspection record where required", "Manufacturer instructions"],
    regulationRefs: ["ohsr-part-13"],
    related: ["fall-protection", "scaffolds", "site-orientation"],
  },
  {
    slug: "scaffolds",
    title: "Scaffolds",
    category: "Construction Activities",
    summary:
      "Scaffolds must be suitable for the work, erected and altered by competent workers, inspected, accessed safely, and protected with guardrails or other controls.",
    aliases: ["scaffold", "frame scaffold", "rolling scaffold", "work platform"],
    hazards: ["Falls from height", "Collapse", "Falling objects"],
    requiredDocuments: ["Scaffold inspection record", "Manufacturer or engineering instructions"],
    regulationRefs: ["ohsr-part-13"],
    related: ["fall-protection", "guardrails", "ladders", "fall-rescue-plan"],
  },
  {
    slug: "cranes-and-hoists",
    title: "Cranes and Hoists",
    category: "High-Risk Work",
    summary:
      "Crane and hoist work needs competent operators, inspected equipment, load control, communication, exclusion zones, and planning for site-specific hazards.",
    aliases: ["crane pick", "tower crane", "mobile crane", "hoist"],
    hazards: ["Dropped load", "Crushing", "Power lines", "Overload"],
    requiredDocuments: ["Lift plan where required", "Inspection record", "Operator documentation", "Maintenance records"],
    regulationRefs: ["ohsr-part-14"],
    related: ["rigging-basics", "electrical-safety-near-power-lines", "mobile-equipment", "traffic-control"],
  },
  {
    slug: "rigging-basics",
    title: "Rigging Basics",
    category: "High-Risk Work",
    summary:
      "Rigging connects the load to the lifting device. Safe rigging depends on competent selection, inspection, load weight, angles, balance, communication, and exclusion zones.",
    aliases: ["sling", "shackle", "signal person", "load chart"],
    hazards: ["Dropped load", "Crushing", "Struck-by"],
    requiredDocuments: ["Rigging inspection record", "Lift plan where required", "Training/competency record"],
    regulationRefs: ["ohsr-part-14"],
    related: ["cranes-and-hoists", "mobile-equipment", "site-orientation"],
  },
  {
    slug: "mobile-equipment",
    title: "Mobile Equipment",
    category: "High-Risk Work",
    summary:
      "Mobile equipment safety includes operator competency, inspection, seat belts, traffic separation, spotters, alarms, maintenance, and ground conditions.",
    aliases: ["equipment", "telehandler", "skid steer", "excavator", "forklift"],
    hazards: ["Struck-by", "Rollover", "Crushing", "Backing incidents"],
    requiredDocuments: ["Pre-use inspection", "Operator record", "Traffic control plan where required"],
    regulationRefs: ["ohsr-part-16"],
    related: ["traffic-control", "excavation-and-trenching", "cranes-and-hoists"],
  },
  {
    slug: "traffic-control",
    title: "Traffic Control",
    category: "High-Risk Work",
    summary:
      "Traffic control protects workers, drivers, pedestrians, cyclists, and the public around construction activity, deliveries, lane closures, and mobile equipment movement.",
    aliases: ["TCP", "traffic plan", "lane closure", "pedestrian detour"],
    hazards: ["Vehicle strike", "Public interface", "Mobile equipment"],
    requiredDocuments: ["Traffic control plan", "TCP training record", "Inspection record"],
    regulationRefs: ["ohsr-part-18"],
    related: ["mobile-equipment", "hoarding-and-public-protection", "site-orientation"],
  },
  {
    slug: "electrical-safety-near-power-lines",
    title: "Electrical Safety Near Power Lines",
    category: "High-Risk Work",
    summary:
      "Work near energized power lines requires planning, minimum approach controls, utility coordination where needed, and clear communication to workers and equipment operators.",
    aliases: ["power lines", "overhead lines", "limits of approach", "electrical hazard"],
    hazards: ["Electric shock", "Arc flash", "Equipment contact"],
    requiredDocuments: ["Electrical hazard assessment", "Utility confirmation where required", "Work procedure"],
    regulationRefs: ["ohsr-part-19"],
    related: ["cranes-and-hoists", "mobile-equipment", "site-orientation"],
  },
  {
    slug: "site-orientation",
    title: "Site Orientation",
    category: "Safety Program & Documentation",
    summary:
      "Site orientation gives workers the site-specific hazards, rules, emergency information, reporting process, and required training checks before work starts.",
    aliases: ["new worker orientation", "worker orientation", "site induction"],
    hazards: ["New worker risk", "Uncontrolled site hazard"],
    requiredDocuments: ["Orientation record", "Training verification", "Emergency contact information"],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "young-new-worker-orientation",
      "worker-rights-and-responsibilities",
      "occupational-first-aid-requirements",
    ],
  },
  {
    slug: "incident-investigation",
    title: "Incident Investigation",
    category: "Safety Program & Documentation",
    summary:
      "Incident investigation identifies what happened, why controls failed, and what corrective actions are needed to prevent recurrence.",
    aliases: ["accident investigation", "near miss", "serious injury report", "corrective action"],
    hazards: ["Recurring incidents", "Uncorrected hazards"],
    requiredDocuments: ["Incident report", "Investigation record", "Corrective action log"],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "workplace-inspections",
      "corrective-actions",
      "supervisor-duties",
      "worker-rights-and-responsibilities",
    ],
  },
  {
    slug: "prime-contractor-duties",
    title: "Prime Contractor Duties",
    category: "Duties & Rights",
    summary:
      "A prime contractor coordinates health and safety at a multiple-employer construction workplace so overlapping work does not create unmanaged hazards.",
    aliases: ["prime contractor", "site prime", "prime", "construction manager", "multiple-employer workplace"],
    hazards: ["Uncoordinated work", "Overlapping trades", "Public interface"],
    tasks: ["Site coordination", "Subcontractor coordination", "Project startup"],
    requiredDocuments: [
      "Prime contractor designation or coordination record",
      "Site-specific safety plan",
      "Emergency response plan",
      "Inspection and corrective action records",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "workers-compensation-act",
      "worksafebc-rights-responsibilities",
    ],
    regulationRefs: ["ohsr-part-3", "ohsr-part-20"],
    related: [
      "employer-duties",
      "supervisor-duties",
      "worker-rights-and-responsibilities",
      "ohs-program",
      "workplace-inspections",
      "corrective-actions",
      "site-orientation",
    ],
    legalRequirements: [
      "Identify who is coordinating health and safety before multiple employers or self-employed persons work at the same construction workplace.",
      "Coordinate employer activities, site rules, emergency arrangements, inspections, and communication so hazards created by one employer do not endanger others.",
      "Keep prime contractor coordination separate from each employer's continuing duty to protect its own workers.",
    ],
  },
  {
    slug: "employer-duties",
    title: "Employer Duties",
    category: "Duties & Rights",
    summary:
      "An employer must ensure the health and safety of its workers by providing safe work, instruction, supervision, equipment, first aid, and an effective OHS system.",
    aliases: ["employer responsibilities", "company duties", "contractor duties"],
    hazards: ["Uncontrolled hazards", "Inadequate supervision", "Missing training"],
    tasks: ["Hiring", "Planning", "Worker instruction", "Subcontractor work"],
    requiredDocuments: [
      "OHS program or safety plan",
      "Training and orientation records",
      "First aid assessment and procedures",
      "Inspection and incident records",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "workers-compensation-act",
      "worksafebc-rights-responsibilities",
    ],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "prime-contractor-duties",
      "supervisor-duties",
      "worker-rights-and-responsibilities",
      "ohs-program",
      "training-records",
      "first-aid-assessment",
    ],
    legalRequirements: [
      "Provide and maintain a workplace, equipment, and work processes that protect workers from known or reasonably foreseeable hazards.",
      "Give workers the information, instruction, training, and supervision needed to do the work safely.",
      "Make sure required first aid, inspections, incident investigations, and OHS program elements are in place for the workplace.",
    ],
  },
  {
    slug: "supervisor-duties",
    title: "Supervisor Duties",
    category: "Duties & Rights",
    summary:
      "A supervisor is the field link between the safety program and the work. Supervisors need to know the hazards, instruct workers, enforce controls, and act on unsafe conditions.",
    aliases: ["foreman duties", "foreperson duties", "site supervisor", "lead hand"],
    hazards: ["Unsafe work direction", "Uncorrected hazards", "Inadequate instruction"],
    tasks: ["Pre-job planning", "Task supervision", "Hazard correction"],
    requiredDocuments: [
      "Supervisor inspection notes",
      "Toolbox talk or pre-job briefing record",
      "Corrective action record",
      "Training or competency records",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "workers-compensation-act",
      "worksafebc-rights-responsibilities",
    ],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "employer-duties",
      "worker-rights-and-responsibilities",
      "toolbox-talks",
      "workplace-inspections",
      "corrective-actions",
      "refusal-of-unsafe-work",
    ],
    legalRequirements: [
      "Ensure workers under direct supervision work safely and follow applicable WorkSafeBC requirements.",
      "Make workers aware of known or reasonably foreseeable hazards in their work area.",
      "Confirm required PPE, equipment, procedures, and training are in place before directing the work.",
    ],
  },
  {
    slug: "worker-rights-and-responsibilities",
    title: "Worker Rights and Responsibilities",
    category: "Duties & Rights",
    summary:
      "Workers have the right to know hazards, participate in health and safety, and refuse unsafe work. They also have duties to take reasonable care, follow procedures, use PPE, and report hazards.",
    aliases: ["worker rights", "worker duties", "right to know", "right to participate"],
    hazards: ["Unreported hazards", "Unsafe work", "Lack of participation"],
    tasks: ["Daily work", "Hazard reporting", "Safety participation"],
    requiredDocuments: [
      "Orientation record",
      "Training record",
      "Hazard report or refusal record where applicable",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "workers-compensation-act",
      "worksafebc-rights-responsibilities",
    ],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "refusal-of-unsafe-work",
      "site-orientation",
      "young-new-worker-orientation",
      "jhsc-requirements",
      "supervisor-duties",
    ],
    legalRequirements: [
      "Take reasonable care to protect your own health and safety and the health and safety of others affected by your work.",
      "Follow safe work procedures, use required PPE, and report hazards, injuries, incidents, and unsafe conditions.",
      "Do not perform work you have reasonable cause to believe would create an undue hazard; follow the unsafe work refusal process.",
    ],
  },
  {
    slug: "refusal-of-unsafe-work",
    title: "Refusal of Unsafe Work",
    category: "Duties & Rights",
    summary:
      "A worker who has reasonable cause to believe a task would create an undue hazard must stop and report it. The employer must investigate and follow the WorkSafeBC refusal process before the work continues.",
    aliases: ["right to refuse", "unsafe work refusal", "stop work", "undue hazard"],
    hazards: ["Undue hazard", "Retaliation risk", "Unsafe reassignment"],
    tasks: ["Unsafe task reporting", "Supervisor investigation", "Work refusal follow-up"],
    requiredDocuments: [
      "Unsafe work refusal record",
      "Investigation notes",
      "Corrective action record",
      "Written notice if another worker is assigned to the refused work",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "workers-compensation-act",
      "worksafebc-refusing-unsafe-work",
      "worksafebc-rights-responsibilities",
    ],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "worker-rights-and-responsibilities",
      "supervisor-duties",
      "corrective-actions",
      "incident-investigation",
      "jhsc-requirements",
    ],
    legalRequirements: [
      "A worker must not perform a task if they have reasonable cause to believe it would create an undue hazard to anyone.",
      "The worker must immediately report the refusal to the supervisor or employer, who must investigate and either remedy the hazard or explain why the work is not unsafe.",
      "If another worker may be assigned to the refused work, confirm the current WorkSafeBC written notice requirements before assigning the work.",
    ],
  },
  {
    slug: "young-new-worker-orientation",
    title: "Young/New Worker Orientation",
    category: "Duties & Rights",
    summary:
      "Young and new workers need site-specific orientation, training, and close supervision because they may be unfamiliar with the workplace, task, crew, tools, or hazards.",
    aliases: ["young worker", "new worker", "site induction", "new hire orientation", "under 25"],
    hazards: ["New worker risk", "Unfamiliar hazards", "Inadequate supervision"],
    tasks: ["Orientation", "Onboarding", "Task assignment"],
    requiredDocuments: [
      "Young/new worker orientation record",
      "Site orientation record",
      "Training verification",
      "Supervisor follow-up notes",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "worksafebc-young-new-workers",
      "worksafebc-rights-responsibilities",
    ],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "site-orientation",
      "worker-rights-and-responsibilities",
      "supervisor-duties",
      "training-records",
      "toolbox-talks",
    ],
    legalRequirements: [
      "Provide orientation and training before a young or new worker starts work that may expose them to workplace hazards.",
      "Cover site hazards, rights and responsibilities, emergency procedures, PPE, reporting, and task-specific safe work procedures.",
      "Confirm supervision is suitable for the worker's experience, task, and changing site conditions.",
    ],
  },
  {
    slug: "jhsc-requirements",
    title: "JHSC Requirements",
    category: "Duties & Rights",
    summary:
      "A joint health and safety committee gives workers and employers a structured way to identify hazards, review incidents, inspect the workplace, and recommend improvements.",
    aliases: ["joint committee", "JOHSC", "JHSC", "safety committee", "worker representative"],
    hazards: ["Weak worker participation", "Missed hazards", "Untracked recommendations"],
    tasks: ["Committee meetings", "Inspections", "Incident review", "Recommendations"],
    requiredDocuments: [
      "Committee member list",
      "Meeting minutes",
      "Inspection reports",
      "Recommendation and response records",
      "Committee training records",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "workers-compensation-act",
      "worksafebc-jhsc",
    ],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "worker-rights-and-responsibilities",
      "workplace-inspections",
      "incident-investigation",
      "corrective-actions",
      "ohs-program",
    ],
    legalRequirements: [
      "Confirm whether the workplace requires a joint committee or worker health and safety representative based on the current WorkSafeBC thresholds and any WorkSafeBC order.",
      "Keep committee membership, meetings, inspections, recommendations, and employer responses documented.",
      "Provide required training and allow committee members to perform their health and safety functions.",
    ],
  },
  {
    slug: "workplace-inspections",
    title: "Workplace Inspections",
    category: "Safety Program & Documentation",
    summary:
      "Workplace inspections find unsafe conditions and activities before they injure someone. Construction inspections must be regular, documented, and followed by corrective action.",
    aliases: ["site inspection", "safety inspection", "walkthrough", "inspection checklist"],
    hazards: ["Uncorrected hazards", "Housekeeping issues", "Changing site conditions"],
    tasks: ["Daily inspections", "Weekly inspections", "Pre-use checks", "Committee inspections"],
    requiredDocuments: [
      "Inspection checklist",
      "Deficiency list",
      "Corrective action log",
      "Follow-up record",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "worksafebc-workplace-inspections",
      "workers-compensation-act",
    ],
    regulationRefs: ["ohsr-part-3", "ohsr-part-4"],
    related: [
      "corrective-actions",
      "incident-investigation",
      "supervisor-duties",
      "jhsc-requirements",
      "ohs-program",
    ],
    legalRequirements: [
      "Inspect the workplace at intervals suitable for the work, hazards, and site conditions.",
      "Record unsafe conditions, assign corrective actions, and verify that corrections are completed.",
      "Involve the joint committee or worker representative where required by the OHS system and current WorkSafeBC requirements.",
    ],
  },
  {
    slug: "corrective-actions",
    title: "Corrective Actions",
    category: "Safety Program & Documentation",
    summary:
      "Corrective actions turn findings into fixes. A useful corrective action names the hazard, owner, due date, interim control, verification step, and close-out evidence.",
    aliases: ["action item", "deficiency", "close out", "CAPA", "fix list"],
    hazards: ["Repeat incidents", "Unclosed deficiencies", "Paper-only safety"],
    tasks: ["Inspection follow-up", "Incident follow-up", "Hazard correction"],
    requiredDocuments: [
      "Corrective action log",
      "Inspection or incident reference",
      "Close-out evidence",
      "Supervisor verification",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "worksafebc-workplace-inspections",
      "workers-compensation-act",
    ],
    regulationRefs: ["ohsr-part-3", "ohsr-part-4"],
    related: [
      "workplace-inspections",
      "incident-investigation",
      "supervisor-duties",
      "prime-contractor-duties",
      "ohs-program",
    ],
    legalRequirements: [
      "Correct unsafe conditions without delay and use interim controls when a permanent fix cannot be completed immediately.",
      "Track corrective actions from inspections, investigations, worker reports, and committee recommendations until verified closed.",
      "Escalate overdue or ineffective actions to the responsible employer, supervisor, prime contractor, or committee process.",
    ],
  },
  {
    slug: "ohs-program",
    title: "OHS Program",
    category: "Safety Program & Documentation",
    summary:
      "An OHS program is the written and active safety management system for the workplace. It connects responsibilities, inspections, training, incident investigation, emergency response, and records.",
    aliases: ["safety program", "health and safety program", "site safety program", "OHS manual"],
    hazards: ["Unmanaged hazards", "Missing records", "Inconsistent supervision"],
    tasks: ["Program setup", "Site safety planning", "Employer safety management"],
    requiredDocuments: [
      "OHS program",
      "Written safe work procedures",
      "Inspection schedule",
      "Training matrix",
      "Incident investigation process",
      "Emergency and first aid procedures",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "workers-compensation-act",
      "worksafebc-rights-responsibilities",
    ],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "employer-duties",
      "supervisor-duties",
      "site-orientation",
      "workplace-inspections",
      "training-records",
      "incident-investigation",
    ],
    legalRequirements: [
      "Confirm whether the employer requires a formal OHS program, less formal program elements, or project-specific program requirements under current WorkSafeBC rules.",
      "Include responsibilities, inspections, training, safe work procedures, incident investigations, emergency response, and records suitable for the workplace.",
      "Keep the program active in the field; written procedures must match the actual work and be reviewed when conditions change.",
    ],
  },
  {
    slug: "toolbox-talks",
    title: "Toolbox Talks",
    category: "Safety Program & Documentation",
    summary:
      "A toolbox talk is a short crew discussion used to connect a current task with a specific hazard, control, and worker question before work starts.",
    aliases: ["tailgate meeting", "safety meeting", "crew talk", "pre-job talk"],
    hazards: ["Missed task hazards", "Poor communication", "Routine drift"],
    tasks: ["Pre-job briefing", "Crew communication", "Daily planning"],
    requiredDocuments: [
      "Toolbox talk record",
      "Crew attendance/sign-off",
      "Topic source or safe work procedure reference",
      "Follow-up action notes",
    ],
    sourceIds: ["worksafebc-ohs-regulation", "bccsa", "worksafebc-rights-responsibilities"],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "supervisor-duties",
      "young-new-worker-orientation",
      "training-records",
      "site-orientation",
      "workplace-inspections",
    ],
    legalRequirements: [
      "Do not treat a toolbox talk alone as proof of competency or as a substitute for required training.",
      "Use toolbox talks to support required instruction, supervision, hazard communication, and worker participation.",
      "Record the topic, date, crew, key hazard, controls discussed, and any follow-up action.",
    ],
  },
  {
    slug: "training-records",
    title: "Training Records",
    category: "Safety Program & Documentation",
    summary:
      "Training records show who was instructed, what was covered, who delivered it, when it happened, and what evidence supports competence for the assigned work.",
    aliases: ["competency record", "ticket record", "certification record", "orientation record"],
    hazards: ["Unverified competency", "Expired tickets", "Missing instruction"],
    tasks: ["Onboarding", "Task assignment", "Competency tracking"],
    requiredDocuments: [
      "Orientation and training records",
      "Equipment competency records",
      "Certificate or ticket copies where applicable",
      "Refresher schedule",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "worksafebc-young-new-workers",
      "worksafebc-rights-responsibilities",
    ],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "site-orientation",
      "young-new-worker-orientation",
      "supervisor-duties",
      "ohs-program",
      "toolbox-talks",
    ],
    legalRequirements: [
      "Keep records for required orientation, training, instruction, certification, and competency checks.",
      "Confirm records match the specific task, equipment, hazard, and worker assignment.",
      "Update records when work changes, training expires, a worker changes roles, or supervision identifies a competency gap.",
    ],
  },
  {
    slug: "notice-of-project",
    title: "Notice of Project",
    category: "Safety Program & Documentation",
    summary:
      "A Notice of Project is written notice to WorkSafeBC before certain construction work starts. The requirement depends on the project type, activity, timing, and current regulation.",
    aliases: ["NOP", "notice to worksafebc", "project notice", "construction notice"],
    hazards: ["Unreported regulated project", "Missing project startup controls"],
    tasks: ["Project startup", "Tower crane activity", "Construction planning"],
    requiredDocuments: [
      "Submitted Notice of Project where required",
      "Project details used for submission",
      "Updated notice if key project information changes",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "worksafebc-notice-project",
      "workers-compensation-act",
    ],
    regulationRefs: ["ohsr-part-20", "ohsr-part-14"],
    related: [
      "prime-contractor-duties",
      "ohs-program",
      "cranes-and-hoists",
      "site-orientation",
      "workplace-inspections",
    ],
    legalRequirements: [
      "Before starting certain projects or activities, confirm whether an owner, prime contractor, or employer must submit a Notice of Project to WorkSafeBC.",
      "Submit the required notice using current WorkSafeBC instructions and timelines for the project type.",
      "Update the notice when required information changes significantly.",
    ],
  },
  {
    slug: "serious-injury-reporting",
    title: "Serious Injury Reporting",
    category: "Safety Program & Documentation",
    summary:
      "Fatalities, serious injuries, and certain serious incidents must be reported to WorkSafeBC immediately. The site also needs to protect people, secure the scene, and start the required investigation process.",
    aliases: ["serious incident", "fatality reporting", "emergency reporting", "preserve the scene"],
    hazards: ["Delayed reporting", "Scene disturbance", "Repeat incident"],
    tasks: ["Emergency response", "Incident notification", "Scene protection"],
    requiredDocuments: [
      "Emergency report record",
      "Incident investigation record",
      "Scene preservation notes",
      "Corrective action log",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "workers-compensation-act",
      "worksafebc-serious-incident-reporting",
    ],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "incident-investigation",
      "corrective-actions",
      "occupational-first-aid-requirements",
      "site-emergency-response-plan",
      "supervisor-duties",
    ],
    legalRequirements: [
      "Immediately notify WorkSafeBC when a fatality, serious injury, or other reportable serious incident occurs.",
      "Protect injured people first, prevent further injury, and preserve the incident scene except where disturbance is necessary for safety, rescue, or legal authorization.",
      "Start and document the required incident investigation and corrective action process.",
    ],
  },
  {
    slug: "first-aid-assessment",
    title: "First Aid Assessment",
    category: "Emergency & Medical",
    summary:
      "A first aid assessment determines the attendants, supplies, facilities, procedures, and emergency transportation needed for the workplace.",
    aliases: ["first aid risk assessment", "OFA assessment", "Schedule 3-A", "first aid worksheet"],
    hazards: ["Delayed treatment", "Insufficient first aid", "Remote access"],
    tasks: ["Project startup", "Annual review", "First aid planning"],
    requiredDocuments: [
      "Written first aid assessment",
      "First aid procedures",
      "Emergency transportation plan",
      "Annual or change-triggered review record",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "worksafebc-first-aid-requirements",
      "worksafebc-jhsc",
    ],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "occupational-first-aid-requirements",
      "first-aid-room",
      "emergency-transportation",
      "aeds-on-construction-sites",
      "site-emergency-response-plan",
    ],
    legalRequirements: [
      "Complete a written assessment for each workplace to determine required first aid equipment, supplies, facilities, attendants, procedures, and transport arrangements.",
      "Consider worker count, workplace hazard rating, accessibility, emergency response time, and unique site risks.",
      "Review the assessment at least annually and when operations, hazards, location, access, or worker count change significantly.",
    ],
  },
  {
    slug: "first-aid-room",
    title: "First Aid Room",
    category: "Emergency & Medical",
    summary:
      "A first aid room is a designated space for first aid treatment when the workplace assessment requires it. It must be accessible, stocked, identifiable, and suitable for the site.",
    aliases: ["first aid facility", "OFA room", "medical room", "treatment room"],
    hazards: ["Delayed treatment", "Blocked access", "Missing supplies"],
    tasks: ["First aid setup", "Emergency response", "Site layout planning"],
    requiredDocuments: [
      "First aid assessment",
      "First aid room inspection checklist",
      "Supply inventory",
      "Emergency access map",
    ],
    sourceIds: ["worksafebc-ohs-regulation", "worksafebc-first-aid-requirements"],
    regulationRefs: ["ohsr-part-3"],
    related: [
      "occupational-first-aid-requirements",
      "first-aid-assessment",
      "emergency-transportation",
      "cardiac-arrest-on-site",
      "site-orientation",
    ],
    legalRequirements: [
      "Provide a first aid facility or room when the workplace first aid assessment and current WorkSafeBC requirements call for one.",
      "Keep the room accessible, clearly identified, adequately supplied, clean, and available for first aid use.",
      "Make sure workers know how to contact first aid and how to direct the first aid attendant to the injured worker.",
    ],
  },
  {
    slug: "emergency-transportation",
    title: "Emergency Transportation",
    category: "Emergency & Medical",
    summary:
      "Emergency transportation planning explains how an injured worker will be moved to medical care when ambulance access, distance, traffic, terrain, or site layout could delay treatment.",
    aliases: ["transport plan", "ambulance access", "BCEHS access", "emergency vehicle route"],
    hazards: ["Delayed medical care", "Blocked access", "Remote work"],
    tasks: ["First aid planning", "Emergency response", "Site logistics"],
    requiredDocuments: [
      "Emergency transportation arrangements",
      "Site access map",
      "Emergency contact list",
      "First aid procedures",
    ],
    sourceIds: ["worksafebc-ohs-regulation", "worksafebc-first-aid-requirements"],
    regulationRefs: ["ohsr-part-3", "ohsr-part-32"],
    related: [
      "first-aid-assessment",
      "occupational-first-aid-requirements",
      "site-emergency-response-plan",
      "cardiac-arrest-on-site",
      "traffic-control",
    ],
    legalRequirements: [
      "Plan emergency transportation based on the first aid assessment, workplace class, access constraints, and expected ambulance response conditions.",
      "Keep access routes, gates, hoists, elevators, and muster points managed so emergency services can reach the patient.",
      "Review transportation arrangements when site access, staging, road closures, or work location changes.",
    ],
  },
  {
    slug: "aeds-on-construction-sites",
    title: "AEDs on Construction Sites",
    category: "Emergency & Medical",
    summary:
      "An AED can support cardiac arrest response when it is visible, maintained, easy to access, and included in the site emergency plan and orientation.",
    aliases: ["AED", "defibrillator", "automated external defibrillator", "cardiac arrest equipment"],
    hazards: ["Cardiac arrest", "Delayed defibrillation", "Unknown AED location"],
    tasks: ["Emergency response", "First aid planning", "Site orientation"],
    requiredDocuments: [
      "AED inspection record",
      "AED location map",
      "Emergency response procedure",
      "First aid assessment note",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "worksafebc-first-aid-requirements",
      "heart-stroke-cpr",
    ],
    regulationRefs: ["ohsr-part-3", "ohsr-part-32"],
    related: [
      "cardiac-arrest-on-site",
      "occupational-first-aid-requirements",
      "first-aid-assessment",
      "first-aid-room",
      "site-emergency-response-plan",
    ],
    legalRequirements: [
      "Confirm whether AED provision is required by the first aid assessment, owner/client policy, project requirement, or another applicable rule.",
      "If an AED is provided, include it in the written emergency response procedure and make its location known to workers.",
      "Maintain AED pads, battery, signage, access, and inspection records according to the device instructions and site procedure.",
    ],
  },
  {
    slug: "fire-prevention-plan",
    title: "Fire Prevention Plan",
    category: "Emergency & Medical",
    summary:
      "A fire prevention plan identifies ignition sources, combustibles, temporary services, hot work, fire protection, access, alarms, evacuation, and fire department interface on a construction site.",
    aliases: ["fire plan", "construction fire safety plan", "fire safety plan"],
    hazards: ["Fire", "Explosion", "Blocked emergency access", "Combustible storage"],
    tasks: ["Site setup", "Hot work", "Temporary heating", "Emergency planning"],
    requiredDocuments: [
      "Fire prevention or fire safety plan",
      "Hot work permit where used",
      "Fire extinguisher inspection records",
      "Evacuation and muster procedure",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "bc-building-code",
      "worksafebc-hot-work-fire",
    ],
    regulationRefs: ["ohsr-part-4", "ohsr-part-12", "ohsr-part-20", "ohsr-part-32"],
    related: [
      "hot-work",
      "fire-extinguishers",
      "evacuation",
      "site-emergency-response-plan",
      "emergency-transportation",
    ],
    legalRequirements: [
      "Confirm fire prevention, fire code, construction, hot work, emergency response, and owner/municipal requirements before work starts.",
      "Control ignition sources, combustible storage, temporary heating, temporary power, smoking, hot work, alarms, access, and evacuation routes.",
      "Keep firefighting equipment, emergency access, and evacuation information available and maintained.",
    ],
  },
  {
    slug: "hot-work",
    title: "Hot Work",
    category: "Construction Activities",
    summary:
      "Hot work includes tasks such as welding, cutting, grinding, soldering, torch work, and other work that can create heat, sparks, slag, or ignition sources.",
    aliases: ["welding", "cutting", "grinding", "torch work", "fire watch", "hot work permit"],
    hazards: ["Fire", "Burns", "Explosion", "Fumes", "Eye injury"],
    tasks: ["Welding", "Cutting", "Grinding", "Fire watch"],
    requiredDocuments: [
      "Hot work permit where used or required",
      "Fire watch assignment",
      "Fire extinguisher inspection",
      "Safe work procedure",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "worksafebc-hot-work-fire",
      "bc-building-code",
    ],
    regulationRefs: ["ohsr-part-12", "ohsr-part-4", "ohsr-part-20"],
    related: [
      "fire-prevention-plan",
      "fire-extinguishers",
      "whmis-basics",
      "ppe-basics",
      "site-emergency-response-plan",
    ],
    legalRequirements: [
      "Assess the work area for combustibles, flammable materials, lower-level openings, fumes, cylinders, and adjacent workers before hot work starts.",
      "Provide suitable fire extinguishing equipment and make fire extinguisher locations known where hot work such as welding or cutting is done.",
      "Use a fire watch, permit, isolation, ventilation, or other controls where the task, site procedure, or code requirement calls for them.",
    ],
  },
  {
    slug: "fire-extinguishers",
    title: "Fire Extinguishers",
    category: "Emergency & Medical",
    summary:
      "Fire extinguishers must be the right type, easy to find, inspected, maintained, and matched to the fire risks created by construction activity.",
    aliases: ["extinguisher", "ABC extinguisher", "fire bottle", "fire protection station"],
    hazards: ["Fire", "Delayed response", "Wrong extinguisher type"],
    tasks: ["Hot work", "Temporary heating", "Fuel storage", "Site emergency response"],
    requiredDocuments: [
      "Extinguisher inspection record",
      "Location map or signage plan",
      "Hot work procedure",
      "Fire prevention plan",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "worksafebc-hot-work-fire",
      "bc-building-code",
    ],
    regulationRefs: ["ohsr-part-12", "ohsr-part-4", "ohsr-part-20"],
    related: [
      "fire-prevention-plan",
      "hot-work",
      "evacuation",
      "site-emergency-response-plan",
      "site-orientation",
    ],
    legalRequirements: [
      "Provide fire extinguishers where required by WorkSafeBC regulation, fire code, the fire prevention plan, hot work controls, or site-specific hazard assessment.",
      "Mark locations, keep access clear, and make workers aware of extinguisher locations for the work area.",
      "Inspect and maintain extinguishers according to the applicable code, manufacturer instructions, and site procedure.",
    ],
  },
  {
    slug: "evacuation",
    title: "Evacuation",
    category: "Emergency & Medical",
    summary:
      "Evacuation planning explains how workers leave the work area, where they muster, how head counts are handled, and how emergency services are guided into the site.",
    aliases: ["muster", "evacuation drill", "alarm", "assembly area", "emergency exit"],
    hazards: ["Fire", "Collapse", "Gas release", "Medical emergency", "Blocked exit"],
    tasks: ["Emergency response", "Site orientation", "Fire planning"],
    requiredDocuments: [
      "Evacuation procedure",
      "Muster location map",
      "Emergency contact list",
      "Drill or review record",
    ],
    sourceIds: ["worksafebc-ohs-regulation", "bc-building-code"],
    regulationRefs: ["ohsr-part-32", "ohsr-part-4", "ohsr-part-20"],
    related: [
      "site-emergency-response-plan",
      "fire-prevention-plan",
      "emergency-transportation",
      "site-orientation",
      "occupational-first-aid-requirements",
    ],
    legalRequirements: [
      "Provide emergency procedures suitable for the workplace hazards, layout, access, and worker locations.",
      "Keep exits, routes, gates, stairs, hoists, and muster areas usable and known to workers.",
      "Review evacuation procedures during orientation and when site layout, floors, access, or emergency controls change.",
    ],
  },
  {
    slug: "suspension-trauma",
    title: "Suspension Trauma",
    category: "Emergency & Medical",
    summary:
      "Suspension trauma, also called suspension intolerance, is a serious risk after a fall arrest when a worker remains hanging in a harness. It must be managed through rescue planning, not improvised response.",
    aliases: ["suspension intolerance", "harness trauma", "hanging in harness", "fall arrest rescue"],
    hazards: ["Suspension intolerance", "Delayed rescue", "Falls from height"],
    tasks: ["Fall arrest work", "Rescue planning", "Emergency response"],
    requiredDocuments: [
      "Fall rescue plan",
      "Fall protection plan",
      "Rescue equipment inspection",
      "First aid response notes",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "worksafebc-ohs-guidelines",
      "heart-stroke-cpr",
    ],
    regulationRefs: ["ohsr-part-11", "ohsr-part-32", "ohsr-part-3"],
    related: [
      "fall-rescue-plan",
      "fall-arrest",
      "fall-protection",
      "occupational-first-aid-requirements",
      "cardiac-arrest-on-site",
    ],
    legalRequirements: [
      "Plan prompt rescue before workers use fall arrest equipment.",
      "Do not rely on emergency services alone if the site cannot reasonably ensure prompt rescue from the suspended position.",
      "Treat post-rescue care as a first aid and emergency medical matter; this article is not medical advice.",
    ],
  },
  {
    slug: "roof-work",
    title: "Roof Work",
    category: "Construction Activities",
    summary:
      "Roof work combines fall hazards, weather, access, fragile surfaces, materials handling, openings, leading edges, and rescue planning.",
    aliases: ["roofing", "flat roof", "sloped roof", "roof access", "roofer"],
    hazards: ["Falls from height", "Fragile surfaces", "Weather exposure", "Material handling"],
    tasks: ["Roofing", "Membrane work", "Roof access", "Material staging"],
    requiredDocuments: [
      "Fall protection plan",
      "Roof access plan",
      "Rescue plan",
      "Weather and surface condition check",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "worksafebc-ohs-guidelines",
      "bccsa",
    ],
    regulationRefs: ["ohsr-part-11", "ohsr-part-20", "ohsr-part-13"],
    related: [
      "fall-protection",
      "guardrails",
      "fall-restraint",
      "fall-rescue-plan",
      "leading-edge-work",
      "ladders",
    ],
    legalRequirements: [
      "Control roof fall hazards using guardrails, covers, restraint, arrest, safety nets, or other controls required for the roof condition and task.",
      "Plan safe roof access, material loading, weather limits, rescue, and protection from openings or skylights before work starts.",
      "Confirm special requirements for steep roofs, fragile surfaces, temporary work platforms, and site-specific roof work procedures.",
    ],
  },
  {
    slug: "leading-edge-work",
    title: "Leading Edge Work",
    category: "High-Risk Work",
    summary:
      "Leading edge work happens where the unprotected edge moves as floors, roofs, decking, formwork, or similar work advances. Controls must move with the work.",
    aliases: ["leading edge", "deck edge", "open edge", "advancing edge", "edge work"],
    hazards: ["Falls from height", "Changing edge location", "Swing fall", "Falling objects"],
    tasks: ["Decking", "Formwork", "Roof work", "Concrete edge work"],
    requiredDocuments: [
      "Fall protection plan",
      "Rescue plan",
      "Anchor or lifeline documentation",
      "Work sequence plan",
    ],
    sourceIds: [
      "worksafebc-ohs-regulation",
      "worksafebc-ohs-guidelines",
      "bccsa",
    ],
    regulationRefs: ["ohsr-part-11", "ohsr-part-20"],
    related: [
      "fall-protection",
      "fall-protection-plan",
      "anchor-points",
      "fall-restraint",
      "fall-arrest",
      "roof-work",
      "floor-openings-and-covers",
    ],
    legalRequirements: [
      "Identify the leading edge and update fall protection as the edge changes with the work sequence.",
      "Use passive controls or restraint where practicable before relying on fall arrest at a moving edge.",
      "Confirm anchors, clearance, swing fall, dropped-object exposure, and rescue access before workers approach the edge.",
    ],
  },
];

const scaffoldedArticleSlugs = new Set(mvpArticleDefinitions.map((article) => article.slug));

export const articleRoadmap = [
  "Fall Protection",
  "Fall Protection Plan",
  "Fall Arrest",
  "Fall Restraint",
  "Guardrails",
  "Anchor Points",
  "Fall Rescue Plan",
  "Silica Exposure Control",
  "Respirators",
  "WHMIS Basics",
  "Occupational First Aid Requirements",
  "Cardiac Arrest on Site",
  "Site Emergency Response Plan",
  "Excavation and Trenching",
  "Confined Space Entry",
  "Confined Space Rescue",
  "Ladders",
  "Scaffolds",
  "Cranes and Hoists",
  "Rigging Basics",
  "Mobile Equipment",
  "Traffic Control",
  "Electrical Safety Near Power Lines",
  "Site Orientation",
  "Incident Investigation",
  "Prime Contractor Duties",
  "Employer Duties",
  "Supervisor Duties",
  "Worker Rights and Responsibilities",
  "Refusal of Unsafe Work",
  "Young/New Worker Orientation",
  "JHSC Requirements",
  "Workplace Inspections",
  "Corrective Actions",
  "OHS Program",
  "Toolbox Talks",
  "Training Records",
  "Notice of Project",
  "Serious Injury Reporting",
  "First Aid Assessment",
  "First Aid Room",
  "Emergency Transportation",
  "AEDs on Construction Sites",
  "Fire Prevention Plan",
  "Hot Work",
  "Fire Extinguishers",
  "Evacuation",
  "Suspension Trauma",
  "Roof Work",
  "Leading Edge Work",
  "Floor Openings and Covers",
  "Swing Stages",
  "Rope Access",
  "Work Platforms",
  "Mobile Elevating Work Platforms",
  "Scaffold Inspection",
  "Ladder Inspection",
  "Concrete Formwork",
  "Falsework",
  "Concrete Pumping",
  "Rebar Impalement Protection",
  "Tilt-Up Construction",
  "Demolition Planning",
  "Hazardous Materials Before Demolition",
  "Asbestos Basics",
  "Lead Exposure Control",
  "Mould in Restoration",
  "Noise Exposure",
  "Hearing Protection",
  "Heat Stress",
  "Cold Stress",
  "Carbon Monoxide",
  "Ventilation",
  "Dust Control Methods",
  "Wet Cutting",
  "HEPA Vacuums",
  "Housekeeping",
  "PPE Basics",
  "Hard Hats",
  "Eye and Face Protection",
  "High Visibility Apparel",
  "Safety Footwear",
  "Gloves",
  "Lockout",
  "De-Energization",
  "Temporary Power",
  "Power Tools",
  "Powder-Actuated Tools",
  "Welding and Cutting",
  "Compressed Gas Cylinders",
  "Material Handling",
  "Hoarding and Public Protection",
  "Traffic Control Persons",
  "Traffic Control Plans",
  "Excavation Spoil Piles",
  "Underground Utilities",
  "Cranes Near Power Lines",
  "Lift Plans",
  "Crane Operator/Signaller Responsibilities",
  "Site-Specific Safety Plan",
].map((title, index) => ({
  order: index + 1,
  title,
  slug: slugify(title),
  phase: index < 25 ? "MVP 25" : index < 50 ? "Batch 2" : "Roadmap 100",
  status: scaffoldedArticleSlugs.has(slugify(title)) ? "Article page scaffolded" : "Planned",
}));

export const wikiArticles = mvpArticleDefinitions.map(createArticle);

export const sourceMap = Object.fromEntries(wikiSources.map((source) => [source.id, source]));
export const regulationMap = Object.fromEntries(regulationRefs.map((ref) => [ref.id, ref]));
export const articleMap = Object.fromEntries(wikiArticles.map((article) => [article.slug, article]));

export const synonymIndex = [
  { term: "tie off", target: "fall-protection" },
  { term: "working at heights", target: "fall-protection" },
  { term: "hole cover", target: "guardrails" },
  { term: "fall rescue", target: "fall-rescue-plan" },
  { term: "concrete dust", target: "silica-exposure-control" },
  { term: "silica dust", target: "silica-exposure-control" },
  { term: "dust mask", target: "respirators" },
  { term: "fit test", target: "respirators" },
  { term: "SDS", target: "whmis-basics" },
  { term: "first aid room", target: "first-aid-room" },
  { term: "heart attack", target: "cardiac-arrest-on-site" },
  { term: "AED", target: "aeds-on-construction-sites" },
  { term: "emergency plan", target: "site-emergency-response-plan" },
  { term: "trench", target: "excavation-and-trenching" },
  { term: "entry permit", target: "confined-space-entry" },
  { term: "step ladder", target: "ladders" },
  { term: "frame scaffold", target: "scaffolds" },
  { term: "crane pick", target: "cranes-and-hoists" },
  { term: "sling", target: "rigging-basics" },
  { term: "telehandler", target: "mobile-equipment" },
  { term: "TCP", target: "traffic-control" },
  { term: "power lines", target: "electrical-safety-near-power-lines" },
  { term: "site induction", target: "site-orientation" },
  { term: "near miss", target: "incident-investigation" },
  { term: "toolbox talk", target: "toolbox-talks" },
  { term: "prime", target: "prime-contractor-duties" },
  { term: "site prime", target: "prime-contractor-duties" },
  { term: "employer responsibilities", target: "employer-duties" },
  { term: "foreman duties", target: "supervisor-duties" },
  { term: "worker rights", target: "worker-rights-and-responsibilities" },
  { term: "right to refuse", target: "refusal-of-unsafe-work" },
  { term: "unsafe work refusal", target: "refusal-of-unsafe-work" },
  { term: "stop work", target: "refusal-of-unsafe-work" },
  { term: "young worker", target: "young-new-worker-orientation" },
  { term: "new worker", target: "young-new-worker-orientation" },
  { term: "safety committee", target: "jhsc-requirements" },
  { term: "JOHSC", target: "jhsc-requirements" },
  { term: "site inspection", target: "workplace-inspections" },
  { term: "walkthrough", target: "workplace-inspections" },
  { term: "deficiency", target: "corrective-actions" },
  { term: "action item", target: "corrective-actions" },
  { term: "safety program", target: "ohs-program" },
  { term: "safety meeting", target: "toolbox-talks" },
  { term: "tailgate meeting", target: "toolbox-talks" },
  { term: "ticket record", target: "training-records" },
  { term: "competency record", target: "training-records" },
  { term: "NOP", target: "notice-of-project" },
  { term: "notice to worksafebc", target: "notice-of-project" },
  { term: "preserve the scene", target: "serious-injury-reporting" },
  { term: "serious incident", target: "serious-injury-reporting" },
  { term: "first aid assessment", target: "first-aid-assessment" },
  { term: "first aid worksheet", target: "first-aid-assessment" },
  { term: "ambulance access", target: "emergency-transportation" },
  { term: "transport plan", target: "emergency-transportation" },
  { term: "defibrillator", target: "aeds-on-construction-sites" },
  { term: "fire plan", target: "fire-prevention-plan" },
  { term: "fire safety plan", target: "fire-prevention-plan" },
  { term: "fire watch", target: "hot-work" },
  { term: "hot work permit", target: "hot-work" },
  { term: "extinguisher", target: "fire-extinguishers" },
  { term: "muster", target: "evacuation" },
  { term: "assembly area", target: "evacuation" },
  { term: "suspension trauma", target: "suspension-trauma" },
  { term: "harness trauma", target: "suspension-trauma" },
  { term: "roofing", target: "roof-work" },
  { term: "open edge", target: "leading-edge-work" },
  { term: "deck edge", target: "leading-edge-work" },
];

export const productStrategy = {
  whatItIs:
    "A public BC construction safety wiki that turns official sources and practical field knowledge into concise linked articles, checklists, sample procedures, and source-backed topic maps.",
  whoItIsFor: [
    "Construction safety officers",
    "Supervisors and forepersons",
    "Workers and apprentices",
    "Small contractors",
    "Prime contractors and employers",
    "JHSC members and safety reviewers",
  ],
  problemsSolved: [
    "Find BC-specific safety answers without reading a full regulation part during field work.",
    "Understand which items are legal requirements and which are best practices.",
    "Find required documents, checklists, and related hazards from one article.",
    "Search using worker language such as tie off, crane pick, silica dust, and toolbox talk.",
  ],
  mustNotBecome: [
    "A copied regulation mirror.",
    "A private company safety manual.",
    "A substitute for legal advice, professional engineering, first aid training, or manufacturer instructions.",
    "An AI-published content farm.",
    "A generic non-BC safety encyclopedia.",
  ],
};

export const technicalRecommendation = [
  {
    stack: "Current implementation: Vite + React + structured wiki data",
    verdict: "Implemented now",
    reason:
      "Fits the existing repository without a new framework install. Keeps the current CSO app routes intact and adds the public wiki under /wiki.",
  },
  {
    stack: "Astro Starlight + Markdown/MDX + Git + Pagefind",
    verdict: "Recommended durable v2",
    reason:
      "Best static content platform when this moves from prototype to large editorial publishing.",
  },
  {
    stack: "MediaWiki",
    verdict: "Possible later",
    reason:
      "Strong wiki features, weaker structured review/citation workflow without customization.",
  },
  {
    stack: "Database-backed custom app",
    verdict: "Defer",
    reason:
      "Useful only after public contributions, complex graph search, or non-technical editorial workflows justify the overhead.",
  },
];

export const databaseSchema = `articles(
  id, slug, title, summary, status, jurisdiction, difficulty_level,
  legal_review_status, safety_review_status, confidence_level,
  last_reviewed_at, next_review_at, last_legal_review_at,
  owner_id, created_at, updated_at
)

article_versions(
  id, article_id, version, git_commit, change_summary,
  author_id, reviewed_by_id, published_at
)

sources(
  id, title, source_type, publisher, url, jurisdiction,
  effective_date, last_checked_at, copyright_note
)

citations(
  id, article_id, source_id, source_locator,
  citation_purpose, supports_claim, quote_used_boolean
)

regulation_refs(
  id, source_id, jurisdiction, instrument, part, section,
  title, url, effective_date, status
)

article_regulation_refs(article_id, regulation_ref_id, relevance)
tags(id, name, type)
article_tags(article_id, tag_id)
related_articles(from_article_id, to_article_id, relation_type, confidence, reviewed_boolean)
glossary_terms(id, term, definition, source_article_id, jurisdiction, status)
synonyms(id, term, normalized_term, target_article_id)
redirects(id, from_slug, to_slug, reason)
required_documents(id, name, document_type, description, template_slug)
article_required_documents(article_id, required_document_id, required_when)
forms_templates(id, title, slug, template_type, status, source_article_id)`;

export const contentStructure = `/content
  /articles
    /fall-protection/fall-protection.mdx
    /silica/silica-exposure-control.mdx
    /first-aid/cardiac-arrest-on-site.mdx
  /glossary
  /redirects
  /templates
  /checklists
  /procedures
  /source-notes
/data
  sources.yaml
  regulation-index.yaml
  synonym-index.yaml
  topic-graph.yaml
/scripts
  validate-frontmatter.ts
  check-citations.ts
  suggest-links.ts
  build-search-index.ts
  monitor-sources.ts`;

export const articleTemplate = [
  "Plain-English summary",
  "When this applies",
  "Legal requirements",
  "Best practice",
  "Required documents",
  "Step-by-step safe procedure",
  "Worker checklist",
  "Supervisor checklist",
  "Common mistakes",
  "Related topics",
  "Official sources",
  "Last reviewed date",
  "Version history",
  "Disclaimer",
];

export const governanceModel = [
  "Public readers can browse and submit corrections.",
  "Contributors can propose edits but cannot publish directly.",
  "Content editors check clarity, structure, links, and duplicate topics.",
  "Safety reviewers check field practicality and missing hazard controls.",
  "Legal/source reviewers check citations and legal-vs-best-practice separation.",
  "Admins control publishing, source-monitoring configuration, and reviewer access.",
  "Every legal claim needs a citation. Every article needs visible review status.",
];

export const linkingModel = [
  "Manual article links are written directly into article sections and reviewed before publishing.",
  "Related topics are stored as typed article relationships such as requires, related_to, procedure_for, document_required_for, emergency_for, and regulates.",
  "Glossary terms and synonyms map worker language to article slugs, such as tie off -> Fall Protection and crane pick -> Cranes and Hoists.",
  "Redirects should preserve common alternate names and spelling variants.",
  "Auto-suggested links are generated from the glossary and accepted only after editor review.",
  "Article dependency maps identify upstream topics a reader should understand before using a procedure.",
];

export const searchStrategy = [
  "Search title, article summary, aliases, glossary terms, hazard tags, trade tags, task tags, required documents, and regulation references.",
  "Support worker-language searches such as tie off, silica dust, crane pick, hole cover, first aid room, fall rescue, confined space, and toolbox talk.",
  "Let readers browse by topic, trade, hazard, regulation section, required document, job task, and emergency.",
  "Rank exact title matches first, then aliases/synonyms, then body text.",
  "Keep redirects and synonyms reviewed so search does not invent legal meaning from slang.",
];

export const contentCreationPipeline = [
  "Gather official sources and record source URLs, publisher, source type, and last checked date.",
  "Extract regulation and guideline notes as short paraphrases, not copied passages.",
  "Map topics, aliases, redirects, dependencies, and related article links.",
  "Draft the article using the standard template with legal requirements separated from best practice.",
  "Run citation/link validation before review.",
  "Complete human safety review for field practicality.",
  "Complete legal/source citation review for authority and wording boundaries.",
  "Publish through reviewed changes only.",
  "Schedule high-risk/legal articles for 90-day review and normal articles for 180-day review.",
  "Monitor WorkSafeBC, BC Laws, BC Codes, and BCCSA source changes and open review issues when a source changes.",
];

export const buildPhases = [
  {
    title: "Foundation",
    tasks: [
      "Add public wiki route and data model.",
      "Create source hierarchy, article template, topic graph, synonym index, and validation script.",
      "Keep existing Safety First admin app operational.",
    ],
  },
  {
    title: "MVP Content",
    tasks: [
      "Publish the first 25 article pages as source-cited drafts.",
      "Fully draft Fall Protection, Silica Exposure Control, and Cardiac Arrest on Site.",
      "Add first 100 roadmap and category browsing.",
    ],
  },
  {
    title: "Search & Linking",
    tasks: [
      "Search title, summary, aliases, tags, tasks, hazards, documents, and regulation refs.",
      "Show related topics and source references on article pages.",
      "Use synonym redirects to support worker-language searches.",
    ],
  },
  {
    title: "Review & Launch",
    tasks: [
      "Run citation and link validation.",
      "Add correction process, public disclaimer, and confidence badges.",
      "Launch after qualified safety/source review of the MVP 25.",
    ],
  },
];

export const codexExecutionTasks = [
  "Scaffold the wiki route inside the current Vite app.",
  "Define structured article/source/regulation data.",
  "Create category, roadmap, strategy, governance, and database model pages.",
  "Implement full-text client search over article metadata and body sections.",
  "Render article pages with the standard template and print-friendly checklists.",
  "Add validation script for missing citations, duplicate slugs, and broken related links.",
  "Document the content folder structure and editorial template.",
  "Run build and validation.",
];

export function getArticleBySlug(slug) {
  return articleMap[slug];
}

export function getSourceById(id) {
  return sourceMap[id];
}

export function getRegulationById(id) {
  return regulationMap[id];
}

export function getRoadmapByPhase(phase) {
  return articleRoadmap.filter((item) => item.phase === phase);
}

export function searchWiki(query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return wikiArticles;

  const synonymTargets = synonymIndex
    .filter((entry) => normalize(entry.term).includes(normalizedQuery))
    .map((entry) => entry.target);

  return wikiArticles
    .map((article) => {
      const text = normalize(
        [
          article.title,
          article.summary,
          article.category,
          article.aliases.join(" "),
          article.trades.join(" "),
          article.hazards.join(" "),
          article.tasks.join(" "),
          article.requiredDocuments.join(" "),
          Object.values(article.sections)
            .flat()
            .join(" "),
        ].join(" "),
      );
      const exactTitle = normalize(article.title) === normalizedQuery ? 30 : 0;
      const alias = article.aliases.some((item) => normalize(item).includes(normalizedQuery))
        ? 20
        : 0;
      const synonym = synonymTargets.includes(article.slug) ? 18 : 0;
      const body = text.includes(normalizedQuery) ? 10 : 0;
      return { article, score: exactTitle + alias + synonym + body };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title))
    .map((result) => result.article);
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
