export const safetyPacks = [
  {
    id: "concrete-cutting-silica",
    title: "Concrete cutting / silica dust",
    scenario: "Cutting, grinding, coring, or drilling concrete in a parkade, suite, corridor, or other enclosed work area.",
    demoQuery: "cutting concrete in parkade",
    keywords: [
      "cutting concrete",
      "concrete cutting",
      "parkade",
      "silica",
      "dust",
      "grinding",
      "core drilling",
      "saw cutting",
      "hepa",
      "respirator",
      "wet cutting",
      "concrete drilling",
    ],
    hazards: [
      "Respirable crystalline silica",
      "Visible dust migration",
      "Respirator or fit-check gaps",
      "Noise, eye, and face exposure",
      "Poor cleanup or dry sweeping",
    ],
    requiredDocuments: [
      "Silica exposure control plan or reviewed task procedure",
      "Tool and dust-control setup check",
      "Respirator and PPE verification where required",
      "Toolbox talk attendance record",
      "Deficiency or hazard report if controls are missing",
    ],
    wikiSlugs: ["silica-exposure-control", "respirators", "whmis-basics", "site-emergency-response-plan"],
    toolboxTalkIds: ["silica-dust-controls", "wet-cutting-and-hepa-cleanup", "respirator-fit-and-seal-checks"],
    checklistIds: ["silica-dust", "ppe", "daily-site-inspection"],
    quizIds: ["silica-and-dust-quiz", "ppe-quiz"],
    formIds: ["hazard-report", "site-safety-inspection", "toolbox-talk-attendance"],
    printableSections: [
      "Confirm the exact dust-generating task, tool, work area, and affected nearby crews.",
      "Verify water delivery, HEPA vacuum capture, isolation, ventilation, and cleanup method before cutting starts.",
      "Stop the task if dust becomes visible outside the controlled work area or cleanup shifts to dry sweeping.",
      "Record the talk, checklist findings, deficiencies, and source-review status with the safety pack.",
    ],
    reviewNotice:
      "Draft safety pack only. Verify current WorkSafeBC silica requirements, exposure-control details, respirator requirements, and site-specific procedure before field use.",
  },
  {
    id: "open-slab-edge-fall-protection",
    title: "Open slab edge / fall protection",
    scenario: "Work near an open slab edge, floor opening, guardrail gap, roof edge, leading edge, or temporary material landing.",
    demoQuery: "tie off at open slab edge",
    keywords: [
      "tie off",
      "tie-off",
      "slab edge",
      "open edge",
      "fall protection",
      "fall arrest",
      "fall restraint",
      "guardrail",
      "hole cover",
      "anchor point",
      "leading edge",
      "rescue plan",
    ],
    hazards: [
      "Unprotected edge or opening",
      "Removed guardrail or cover",
      "Unverified anchor or connector",
      "Swing-fall exposure",
      "No prompt rescue method",
    ],
    requiredDocuments: [
      "Fall protection plan where required by the work",
      "Anchor, equipment, and harness inspection notes",
      "Rescue plan for fall arrest use",
      "Toolbox talk attendance record",
      "Hazard report if guards, covers, or anchors are not ready",
    ],
    wikiSlugs: [
      "fall-protection",
      "fall-protection-plan",
      "fall-arrest",
      "fall-restraint",
      "guardrails",
      "anchor-points",
      "fall-rescue-plan",
    ],
    toolboxTalkIds: [
      "tie-off-planning-before-edge-work",
      "guardrails-and-floor-openings",
      "fall-rescue-readiness",
      "harness-inspection",
    ],
    checklistIds: ["fall-protection", "daily-site-inspection"],
    quizIds: ["fall-protection-quiz"],
    formIds: ["hazard-report", "site-safety-inspection", "toolbox-talk-attendance"],
    printableSections: [
      "Walk the work area and identify the exact edge, opening, access path, and landing zone.",
      "Confirm the control method: guardrail, cover, restraint, fall arrest, or another reviewed control.",
      "Point out anchors, travel limits, rescue equipment, and who can stop the work.",
      "Document any missing guardrail, loose cover, or unverified anchor before workers enter the exposure.",
    ],
    reviewNotice:
      "Draft safety pack only. Verify current WorkSafeBC fall protection requirements, rescue planning, equipment use, and site-specific fall protection plan before field use.",
  },
  {
    id: "excavation-trenching",
    title: "Excavation and trenching",
    scenario: "Digging, entering, or working beside an excavation, trench, utility cut, service connection, or shored work area.",
    demoQuery: "trench entry near utilities",
    keywords: [
      "excavation",
      "trench",
      "trenching",
      "utility",
      "utilities",
      "shoring",
      "sloping",
      "shielding",
      "cave in",
      "cave-in",
      "spoil pile",
      "underground",
    ],
    hazards: [
      "Cave-in or sloughing",
      "Underground utility contact",
      "Equipment loading near the edge",
      "Water, vibration, or changing soil conditions",
      "Poor access or emergency egress",
    ],
    requiredDocuments: [
      "Excavation or trench review notes",
      "Utility locate or service confirmation records",
      "Protective system and access plan where required",
      "Traffic or mobile equipment control notes",
      "Emergency response contacts and rescue restrictions",
    ],
    wikiSlugs: ["excavation-and-trenching", "mobile-equipment", "traffic-control", "site-emergency-response-plan"],
    toolboxTalkIds: ["trench-cave-in-warning-signs", "underground-utility-awareness", "mobile-equipment-blind-spots"],
    checklistIds: ["excavations", "traffic-control", "emergency-response"],
    quizIds: ["excavation-and-trenching-quiz", "mobile-equipment-quiz"],
    formIds: ["hazard-report", "site-safety-inspection", "near-miss-report"],
    printableSections: [
      "Confirm soil, water, weather, utility, spoil pile, access, and equipment-loading conditions before entry.",
      "Verify protective systems and keep workers out until competent review is complete.",
      "Keep equipment, materials, and pedestrians controlled around the excavation edge.",
      "Stop work if cracking, sloughing, water, vibration, or utility uncertainty appears.",
    ],
    reviewNotice:
      "Draft safety pack only. Verify current WorkSafeBC excavation requirements, utility procedures, protective-system needs, and any engineered instructions before field use.",
  },
  {
    id: "confined-space-entry",
    title: "Confined space entry",
    scenario: "Entry into a vault, tank, sump, pit, manhole, shaft, crawl space, or other space with restricted access or atmospheric risk.",
    demoQuery: "confined space entry",
    keywords: [
      "confined space",
      "confined",
      "atmospheric test",
      "gas test",
      "vault",
      "tank",
      "sump",
      "pit",
      "manhole",
      "rescue",
      "ventilation",
      "entry permit",
    ],
    hazards: [
      "Oxygen deficiency or enrichment",
      "Toxic or flammable atmosphere",
      "Engulfment or restricted rescue access",
      "Uncontrolled energy or adjacent work",
      "Unplanned entry by unassigned workers",
    ],
    requiredDocuments: [
      "Confined space assessment and entry procedure",
      "Atmospheric testing and ventilation records",
      "Rescue plan and standby worker assignment",
      "Lockout or isolation records where needed",
      "Entry authorization and communication plan",
    ],
    wikiSlugs: [
      "confined-space-entry",
      "confined-space-rescue",
      "occupational-first-aid-requirements",
      "site-emergency-response-plan",
      "respirators",
    ],
    toolboxTalkIds: ["confined-space-entry-basics", "atmospheric-testing-awareness", "first-aid-access-and-reporting"],
    checklistIds: ["confined-space-pre-entry", "emergency-response"],
    quizIds: ["confined-spaces-quiz", "first-aid-quiz"],
    formIds: ["hazard-report", "incident-report", "toolbox-talk-attendance"],
    printableSections: [
      "Confirm the space classification, entry reason, assigned workers, and no-go conditions.",
      "Verify testing, ventilation, isolation, communication, standby, and rescue arrangements before entry.",
      "Keep the entry record current as conditions, workers, or nearby tasks change.",
      "Stop entry if testing, communication, ventilation, rescue, or supervision is interrupted.",
    ],
    reviewNotice:
      "Draft safety pack only. Verify current WorkSafeBC confined space requirements, rescue plan, atmospheric testing, and site-specific entry procedures before field use.",
  },
  {
    id: "crane-pick-rigging",
    title: "Crane pick / rigging",
    scenario: "Planning or performing a crane pick, hoist lift, rigged material movement, suspended load, or delivery lift.",
    demoQuery: "crane pick with rigging",
    keywords: [
      "crane pick",
      "crane",
      "hoist",
      "rigging",
      "suspended load",
      "lift plan",
      "signal",
      "tag line",
      "load chart",
      "exclusion zone",
      "slinger",
      "rigger",
    ],
    hazards: [
      "Suspended load over workers",
      "Poor signal or radio communication",
      "Damaged or mismatched rigging",
      "Load path conflict with pedestrians or equipment",
      "Weather, visibility, or ground condition changes",
    ],
    requiredDocuments: [
      "Lift plan or reviewed hoisting procedure where required",
      "Rigging and equipment inspection notes",
      "Signal, radio, and exclusion zone briefing",
      "Traffic or delivery control plan where relevant",
      "Toolbox talk attendance record",
    ],
    wikiSlugs: ["cranes-and-hoists", "rigging-basics", "mobile-equipment", "traffic-control"],
    toolboxTalkIds: [
      "crane-pick-communication",
      "rigging-inspection-basics",
      "exclusion-zones-under-suspended-loads",
      "spotter-communication",
    ],
    checklistIds: ["mobile-equipment", "daily-site-inspection", "ppe"],
    quizIds: ["cranes-rigging-quiz", "mobile-equipment-quiz"],
    formIds: ["equipment-inspection", "hazard-report", "toolbox-talk-attendance"],
    printableSections: [
      "Confirm the load, rigging method, travel path, exclusion zone, signal method, and stop-work authority.",
      "Inspect rigging and confirm workers understand the no-go area under and around the load.",
      "Pause the lift if communication, visibility, wind, ground conditions, or the load path changes.",
      "Record inspection notes, briefing completion, and any blocked access or interference.",
    ],
    reviewNotice:
      "Draft safety pack only. Verify current WorkSafeBC crane, hoist, rigging, certification, inspection, and lift-planning requirements before field use.",
  },
  {
    id: "hot-work-fire-watch",
    title: "Hot work / fire watch",
    scenario: "Welding, grinding, torch work, cutting, soldering, or other spark/heat-producing work near combustibles or shared work areas.",
    demoQuery: "hot work fire watch",
    keywords: [
      "hot work",
      "fire watch",
      "welding",
      "grinding sparks",
      "torch",
      "cutting",
      "combustible",
      "fire extinguisher",
      "flammable",
      "gas cylinder",
      "spark",
    ],
    hazards: [
      "Ignition of combustibles",
      "Inadequate fire watch or extinguisher access",
      "Poor cylinder, hose, or regulator condition",
      "Smoke, fumes, or ventilation gaps",
      "Adjacent workers not warned about sparks or heat",
    ],
    requiredDocuments: [
      "Hot work permit or reviewed hot work authorization where used",
      "Fire watch and post-work monitoring notes",
      "Extinguisher and combustible-control check",
      "WHMIS/SDS review for products involved",
      "Toolbox talk attendance record",
    ],
    wikiSlugs: ["site-emergency-response-plan", "whmis-basics", "occupational-first-aid-requirements", "electrical-safety-near-power-lines"],
    toolboxTalkIds: ["hot-work-fire-watch", "fire-extinguisher-access", "chemical-storage-on-site", "extension-cords-and-temporary-power"],
    checklistIds: ["hot-work", "emergency-response", "whmis-sds"],
    quizIds: ["emergency-response-quiz", "whmis-sds-quiz", "electrical-safety-quiz"],
    formIds: ["hazard-report", "site-safety-inspection", "toolbox-talk-attendance"],
    printableSections: [
      "Clear or protect combustibles, check openings, and confirm extinguisher access before hot work starts.",
      "Assign fire watch and confirm post-work monitoring expectations.",
      "Control cylinders, hoses, power cords, ventilation, and nearby pedestrian exposure.",
      "Stop work if fire watch, extinguishers, ventilation, or combustible controls are not in place.",
    ],
    reviewNotice:
      "Draft safety pack only. Verify current WorkSafeBC fire prevention, WHMIS, ventilation, hot work, and site emergency requirements before field use.",
  },
  {
    id: "mobile-equipment-deliveries",
    title: "Mobile equipment and deliveries",
    scenario: "Forklift, telehandler, skid steer, loader, delivery truck, concrete truck, or other mobile equipment moving near workers or the public.",
    demoQuery: "mobile equipment delivery gate",
    keywords: [
      "mobile equipment",
      "delivery",
      "truck",
      "forklift",
      "telehandler",
      "loader",
      "skid steer",
      "spotter",
      "blind spot",
      "backing",
      "traffic control",
      "pedestrian detour",
    ],
    hazards: [
      "Blind spots and backing equipment",
      "Pedestrian or public interface",
      "Unclear spotter signals",
      "Seat belt or rollover risk",
      "Congested access and delivery routes",
    ],
    requiredDocuments: [
      "Traffic or delivery control notes",
      "Equipment inspection record where used",
      "Spotter and communication briefing",
      "Public protection or pedestrian detour check",
      "Hazard report for route conflicts",
    ],
    wikiSlugs: ["mobile-equipment", "traffic-control", "site-orientation", "site-emergency-response-plan"],
    toolboxTalkIds: [
      "mobile-equipment-blind-spots",
      "spotter-communication",
      "traffic-control-around-deliveries",
      "pedestrian-detours",
      "seat-belts-and-rollover-risk",
    ],
    checklistIds: ["mobile-equipment", "traffic-control", "daily-site-inspection"],
    quizIds: ["mobile-equipment-quiz", "traffic-control-quiz"],
    formIds: ["equipment-inspection", "hazard-report", "site-safety-inspection"],
    printableSections: [
      "Walk the delivery route and identify workers, public access, backing zones, blind spots, and pinch points.",
      "Confirm spotter signals, radio use, exclusion areas, and who controls the gate or pedestrian hold.",
      "Inspect equipment condition and pause movement if route conditions change.",
      "Document route deficiencies, damaged controls, or public-interface concerns.",
    ],
    reviewNotice:
      "Draft safety pack only. Verify current WorkSafeBC mobile equipment, traffic control, public protection, and operator competency requirements before field use.",
  },
  {
    id: "scaffold-ladder-access",
    title: "Scaffold or ladder access",
    scenario: "Using ladders, rolling scaffolds, frame scaffolds, temporary access, or elevated work platforms for access or light work.",
    demoQuery: "scaffold ladder access",
    keywords: [
      "ladder",
      "ladders",
      "scaffold",
      "scaffolds",
      "rolling scaffold",
      "access",
      "three point contact",
      "platform",
      "tag",
      "guardrail",
      "plank",
    ],
    hazards: [
      "Unstable ladder setup",
      "Missing scaffold components",
      "Unauthorized scaffold changes",
      "Falls from access or platform edges",
      "Rolling scaffold movement with workers or loose material",
    ],
    requiredDocuments: [
      "Scaffold status or inspection record where used",
      "Ladder or access inspection notes",
      "Fall protection review where exposure exists",
      "Toolbox talk attendance record",
      "Equipment deficiency report if components are damaged or missing",
    ],
    wikiSlugs: ["ladders", "scaffolds", "fall-protection", "guardrails"],
    toolboxTalkIds: [
      "ladder-setup-and-three-point-contact",
      "scaffold-access-and-tagging",
      "rolling-scaffold-movement",
      "guardrails-and-floor-openings",
    ],
    checklistIds: ["ladders", "scaffolds", "fall-protection"],
    quizIds: ["ladders-and-scaffolds-quiz", "fall-protection-quiz"],
    formIds: ["equipment-inspection", "site-safety-inspection", "toolbox-talk-attendance"],
    printableSections: [
      "Choose the right access method for the task, height, duration, material handling, and work surface.",
      "Inspect ladder feet, top support, scaffold tag/status, guardrails, planks, ties, and access points.",
      "Keep workers off damaged, incomplete, untagged, unstable, or unauthorized access equipment.",
      "Document missing components, changed setups, and who is responsible for correction.",
    ],
    reviewNotice:
      "Draft safety pack only. Verify current WorkSafeBC ladder, scaffold, access, and fall protection requirements before field use.",
  },
  {
    id: "new-worker-orientation",
    title: "New worker orientation",
    scenario: "A new, young, transferred, returning, or subcontracted worker starts on site or changes tasks, supervisors, or work areas.",
    demoQuery: "new worker orientation",
    keywords: [
      "new worker",
      "young worker",
      "orientation",
      "site orientation",
      "subcontractor",
      "training",
      "first day",
      "rights",
      "refuse unsafe work",
      "whmis",
      "ppe",
    ],
    hazards: [
      "Worker unfamiliar with site-specific hazards",
      "Unclear supervision or stop-work process",
      "Missing PPE, WHMIS, or task-specific training",
      "No emergency route or first aid awareness",
      "Young/new worker questions not encouraged",
    ],
    requiredDocuments: [
      "Worker orientation form",
      "Training matrix or verification notes",
      "Subcontractor onboarding record where relevant",
      "Emergency response and first aid briefing",
      "Task-specific safety talk or checklist before assignment",
    ],
    wikiSlugs: ["site-orientation", "occupational-first-aid-requirements", "fall-protection", "whmis-basics", "incident-investigation"],
    toolboxTalkIds: [
      "new-worker-questions",
      "site-orientation-refresh",
      "refusing-unsafe-work",
      "first-aid-access-and-reporting",
      "whmis-labels-and-sds-access",
    ],
    checklistIds: ["daily-site-inspection", "ppe", "whmis-sds", "emergency-response"],
    quizIds: ["site-orientation-quiz", "young-new-workers-quiz", "refusing-unsafe-work-quiz"],
    formIds: ["worker-orientation", "subcontractor-safety-onboarding", "training-matrix"],
    printableSections: [
      "Confirm the worker's employer, supervisor, task, work area, emergency contacts, and site rules.",
      "Review worker rights, stop-work expectations, first aid, emergency routes, PPE, WHMIS/SDS, and reporting.",
      "Assign direct supervision and task-specific instruction before high-risk or unfamiliar work starts.",
      "Record orientation, gaps, restrictions, and follow-up verification dates.",
    ],
    reviewNotice:
      "Draft safety pack only. Verify current WorkSafeBC young/new worker orientation, training, supervision, and employer documentation requirements before field use.",
  },
  {
    id: "cardiac-arrest-emergency-response",
    title: "Cardiac arrest / emergency response",
    scenario: "A worker collapses, is unresponsive, has abnormal breathing, or a crew needs a rapid first aid, AED, muster, and emergency-access refresher.",
    demoQuery: "cardiac arrest on site",
    keywords: [
      "cardiac arrest",
      "aed",
      "first aid",
      "emergency",
      "collapse",
      "unresponsive",
      "muster",
      "headcount",
      "911",
      "ambulance",
      "rescue",
    ],
    hazards: [
      "Delayed first aid activation",
      "AED not found quickly",
      "Blocked emergency access",
      "Poor muster or headcount control",
      "Unclear incident reporting and witness notes",
    ],
    requiredDocuments: [
      "Emergency response plan or site emergency procedure",
      "First aid location and AED check",
      "Muster and access route confirmation",
      "Incident report and witness statement if an event occurs",
      "Post-event corrective action or debrief notes",
    ],
    wikiSlugs: ["cardiac-arrest-on-site", "occupational-first-aid-requirements", "site-emergency-response-plan", "incident-investigation"],
    toolboxTalkIds: [
      "cardiac-arrest-response-basics",
      "aed-location-and-emergency-access",
      "emergency-muster-and-headcount",
      "first-aid-access-and-reporting",
    ],
    checklistIds: ["emergency-response", "first-aid-kit-first-aid-room"],
    quizIds: ["first-aid-quiz", "emergency-response-quiz"],
    formIds: ["incident-report", "investigation-witness-statement", "near-miss-report"],
    printableSections: [
      "Show the crew where first aid, AED, emergency access, and muster points are located.",
      "Confirm who calls emergency services, who meets responders, and who controls the work area.",
      "Do not turn the pack into medical instruction beyond the reviewed site emergency procedure and trained first aid response.",
      "Record incident facts, witnesses, corrective actions, and source-review status after the event.",
    ],
    reviewNotice:
      "Draft safety pack only. Verify current WorkSafeBC first aid requirements and site emergency procedures. This pack is not medical advice or a substitute for trained first aid response.",
  },
];

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "for",
  "in",
  "near",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

export function getSafetyPackById(id) {
  return safetyPacks.find((pack) => pack.id === id) || null;
}

export function searchSafetyPacks(query) {
  const normalizedQuery = normalizeSearchText(query);
  const queryTerms = tokenize(query);
  const ranked = safetyPacks.map((pack) => {
    const searchable = normalizeSearchText(
      [
        pack.title,
        pack.scenario,
        pack.demoQuery,
        ...pack.keywords,
        ...pack.hazards,
        ...pack.requiredDocuments,
      ].join(" "),
    );

    const phraseMatches = pack.keywords.filter((keyword) => {
      const normalizedKeyword = normalizeSearchText(keyword);
      return normalizedQuery && normalizedQuery.includes(normalizedKeyword);
    });
    const termMatches = queryTerms.filter((term) => searchable.includes(term));
    const matchedTerms = unique([...phraseMatches, ...termMatches]).slice(0, 8);
    const score = phraseMatches.length * 5 + termMatches.length * 2;

    return {
      ...pack,
      matchedTerms,
      score,
    };
  });

  const matches = ranked.filter((pack) => pack.score > 0);
  return (matches.length ? matches : ranked).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

function tokenize(value) {
  return normalizeSearchText(value)
    .split(" ")
    .filter((term) => term.length > 2 && !stopWords.has(term));
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}
