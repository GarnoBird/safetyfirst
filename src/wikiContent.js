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
];

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
  phase: index < 25 ? "MVP 25" : "Roadmap 100",
  status: index < 25 ? "Article page scaffolded" : "Planned",
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
  { term: "first aid room", target: "occupational-first-aid-requirements" },
  { term: "heart attack", target: "cardiac-arrest-on-site" },
  { term: "AED", target: "cardiac-arrest-on-site" },
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
  { term: "toolbox talk", target: "site-orientation" },
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
