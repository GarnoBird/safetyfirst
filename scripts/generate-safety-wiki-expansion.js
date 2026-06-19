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
  part7:
    "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-07-noise-vibration-radiation-and-temperature",
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

const checklistBriefs = [
  checklistBrief("Daily site inspection", ["part3", "part4"], "Use this as a general site walk prompt at the start of shift or after major site changes.", [
    "Access routes, stairs, ramps, ladders, and emergency paths are clear.",
    "Open edges, floor openings, excavations, and public-interface areas are protected.",
    "Housekeeping, material storage, waste, cords, hoses, and slip/trip hazards are controlled.",
    "Mobile equipment routes, delivery zones, and pedestrian separation are understood.",
    "First aid, fire extinguishers, muster information, and site notices are accessible.",
    "Active high-risk work areas are identified and controlled before nearby work proceeds.",
    "Deficiencies are assigned, dated, and communicated to affected supervisors.",
    "Items needing immediate correction are stopped or isolated before work continues.",
  ]),
  checklistBrief("Fall protection", ["part11", "part32"], "Use before work at height, edge work, floor openings, leading-edge work, or fall-arrest/restraint use.", [
    "Fall hazards, floor openings, edge locations, and affected workers are identified.",
    "Guardrails, covers, restraint, fall arrest, or other reviewed controls are selected before work starts.",
    "Anchors, lifelines, connectors, harnesses, and lanyards are inspected and matched to the task.",
    "Travel restraint limits, swing-fall exposure, sharp edges, and clearance are checked.",
    "Rescue method, equipment, emergency contact, and access route are confirmed.",
    "Workers can explain their tie-off point, stop-work trigger, and rescue contact.",
    "Temporary removal of rails/covers is controlled and communicated.",
    "Changes in weather, sequence, access, or materials trigger supervisor review.",
  ]),
  checklistBrief("Ladders", ["part13", "part11"], "Use before ladders are used for access, short-duration work, or movement between levels.", [
    "Correct ladder type, length, duty rating, and setup location are selected.",
    "Feet are on firm level footing and the top is supported or secured where required.",
    "Side rails, rungs, feet, spreaders, labels, and hardware are free of visible damage.",
    "Workers can maintain three-point contact and avoid overreaching.",
    "Tools/materials are moved without overloading the climber.",
    "Ladders are protected from doors, equipment routes, electrical hazards, and public access.",
    "Top steps, makeshift extensions, and unstable bases are not used.",
    "Damaged or questionable ladders are removed from service.",
  ]),
  checklistBrief("Scaffolds", ["part13", "part11"], "Use before workers access, load, move, or work from scaffold platforms.", [
    "Scaffold status tag or site approval system is checked before use.",
    "Base plates, mudsills, leveling, ties, braces, planks, guardrails, and toe boards are visually checked.",
    "Safe access is provided and workers do not climb frames or cross-bracing.",
    "Platform load, material storage, and tool placement are controlled.",
    "Missing, damaged, modified, or moved components are reported before use.",
    "Rolling scaffold wheels are locked and workers are off before movement.",
    "Overhead hazards, floor openings, slopes, and nearby equipment routes are controlled.",
    "Only authorized workers alter scaffold components.",
  ]),
  checklistBrief("Excavations", ["part20", "part16", "part19"], "Use before excavation, trench entry, utility exposure, or work beside an excavation.", [
    "Current locate information, utility markings, drawings, and dig limits are reviewed.",
    "Soil condition, water, cracks, sloughing, vibration, weather, and nearby loading are checked.",
    "Sloping, shoring, shielding, or other protective systems are confirmed before entry.",
    "Spoil piles, materials, and equipment are kept back from excavation edges as planned.",
    "Safe access/egress is provided and maintained.",
    "Workers are kept clear of suspended loads, swing radius, and equipment backing paths.",
    "Unknown utilities or changed ground conditions trigger stop-work review.",
    "Public protection, barricades, and night visibility are checked where applicable.",
  ]),
  checklistBrief("Confined space pre-entry", ["part9", "part10", "part32"], "Use before any confined space entry or when a space could contain atmospheric, engulfment, or rescue hazards.", [
    "The space, entry purpose, entrants, attendant, supervisor, and entry limits are identified.",
    "Atmospheric testing, ventilation, isolation, lockout, and engulfment controls are confirmed.",
    "Entry permit or written procedure is available if required by the employer/site process.",
    "Communication between entrant and attendant is tested.",
    "Rescue plan, equipment, responders, and access path are confirmed before entry.",
    "Unauthorized entry is prevented with signs, barriers, or control of openings.",
    "Exit triggers are explained, including alarm, symptoms, lost communication, or changed conditions.",
    "Post-entry closeout confirms entrants are out and controls are restored.",
  ]),
  checklistBrief("PPE", ["part8"], "Use when selecting, issuing, inspecting, or replacing PPE for a task.", [
    "Task hazards are identified before selecting PPE.",
    "PPE type matches the hazard, not just the trade or habit.",
    "Fit, size, compatibility, comfort, and worker limitations are considered.",
    "Hard hats, eye/face protection, hearing protection, gloves, footwear, respiratory protection, and high-visibility apparel are inspected where used.",
    "PPE is not used as the only control where stronger controls are practical.",
    "Damaged, contaminated, expired, poorly fitting, or wrong-type PPE is replaced.",
    "Workers know cleaning, storage, and replacement expectations.",
    "Special PPE requirements are verified against SDS, manufacturer instructions, or site procedure.",
  ]),
  checklistBrief("First aid kit / first aid room", ["part3", "part32"], "Use when checking first aid access, supplies, communication, privacy, and emergency transport readiness.", [
    "First aid attendant, contact method, room/kit location, and hours of coverage are posted or communicated.",
    "First aid supplies, AED access if present, stretcher route, and emergency equipment are accessible.",
    "Room, kit, or station is clean, stocked, marked, and not blocked by materials.",
    "Emergency address, gate, floor, stair, hoist/elevator, and guide-in instructions are available.",
    "Transport route is clear for attendants, ambulance, or site vehicle as applicable.",
    "Privacy is protected and unnecessary medical details are not recorded in general logs.",
    "Injury reporting and escalation process is understood by supervisors.",
    "Deficiencies in supplies, access, or communication are corrected before high-risk work proceeds.",
  ]),
  checklistBrief("Emergency response", ["part32", "part3"], "Use to check evacuation, muster, rescue, severe weather, spill, fire, or medical emergency readiness.", [
    "Current emergency plan, alarm method, muster area, and alternate route are communicated.",
    "Exits, stairs, gates, hoarding doors, emergency lanes, and muster routes are clear.",
    "Headcount process covers workers, visitors, subcontractors, and remote work areas.",
    "Emergency contact numbers, site address, and access instructions are posted where needed.",
    "Fire extinguishers, spill kits, rescue equipment, and first aid access are not blocked.",
    "Workers know who calls 911, who guides responders, and who controls the area.",
    "High-risk rescue plans are checked before the related work begins.",
    "Changes to hoarding, traffic, weather, access, or work sequence are reflected in the plan.",
  ]),
  checklistBrief("Silica/dust", ["part6", "part5", "part8"], "Use before cutting, grinding, drilling, chipping, sweeping, or cleaning concrete, masonry, rock, tile, or mortar dust.", [
    "Dust-producing material and task are identified before work starts.",
    "Wet method, local exhaust, HEPA vacuum, isolation, ventilation, or other reviewed control is active.",
    "Nearby workers, public areas, intakes, and adjacent spaces are protected from dust migration.",
    "Dry sweeping, compressed-air cleanup, and uncontrolled dust release are prohibited.",
    "Respiratory protection, fit, filters, and storage are verified where required by the exposure control plan.",
    "Slurry, filters, waste, and contaminated surfaces are handled under site procedure.",
    "Visible dust or failed water/vacuum control triggers stop-work review.",
    "Records, exposure control plan, or task-specific instructions are available for review.",
  ]),
  checklistBrief("WHMIS/SDS", ["part5"], "Use before hazardous products are used, transferred, stored, or cleaned up.", [
    "Product identity, label, hazard pictograms, and workplace label needs are checked.",
    "Current SDS is available and workers know how to access it.",
    "Required PPE, ventilation, handling, storage, spill, and first aid information is reviewed.",
    "Incompatible products are separated and containers are closed when not in use.",
    "Secondary containers are labelled before use.",
    "Mystery products, damaged labels, or leaking containers are isolated and reported.",
    "Spill kit, disposal method, and emergency contact are known.",
    "Workers are instructed before using unfamiliar products.",
  ]),
  checklistBrief("Housekeeping", ["part4", "part20"], "Use to control access routes, waste, stored materials, cords, hoses, and emergency access.", [
    "Walkways, stairs, ladders, ramps, exits, fire equipment, and first aid access are clear.",
    "Materials are stacked so they cannot roll, slide, tip, or hide floor openings.",
    "Scrap, nails, banding, packaging, cords, hoses, and debris are removed or controlled.",
    "Wet, icy, dusty, or uneven surfaces are treated or isolated.",
    "Waste streams, hazardous products, and sharps are separated as required by site procedure.",
    "Work areas are cleaned progressively, not only at end of shift.",
    "Housekeeping responsibilities are assigned by trade or area.",
    "Blocked emergency or public routes are corrected immediately.",
  ]),
  checklistBrief("Mobile equipment", ["part16", "part18"], "Use before operating or working around excavators, loaders, forklifts, telehandlers, skid steers, or similar equipment.", [
    "Operator, equipment type, attachment, task, route, and exclusion zone are identified.",
    "Pre-use inspection, alarms, lights, mirrors/cameras, tires/tracks, hydraulics, and seat belt are checked.",
    "Ground conditions, slopes, edges, ramps, excavations, and overhead hazards are reviewed.",
    "Pedestrian separation, spotter use, radio/hand signals, and stop command are agreed.",
    "Loads are kept stable and within the equipment's reviewed capacity and configuration.",
    "Workers stay out of blind spots, swing radius, backing paths, and suspended load zones.",
    "Equipment is parked, secured, and de-energized when unattended as required.",
    "Any defect, near miss, contact, or uncontrolled pedestrian entry is reported.",
  ]),
  checklistBrief("Hot work", ["part32", "part4"], "Use before welding, cutting, grinding, torching, or other spark/heat-producing work.", [
    "Hot work authorization, permit, or site approval is checked before work starts.",
    "Combustibles are removed, covered, wetted, shielded, or otherwise controlled.",
    "Spark travel to lower levels, wall cavities, hoarding, tarps, insulation, and adjacent spaces is checked.",
    "Fire extinguisher, alarm access, emergency route, and fire watch are confirmed.",
    "Ventilation, gas cylinders, hoses, regulators, and ignition sources are controlled.",
    "Fire watch duration and post-work inspection are assigned.",
    "Hot work stops if fire watch, extinguisher, permit, or spark control is missing.",
    "Nearby trades and public interfaces are notified where smoke, fumes, or sparks could affect them.",
  ]),
  checklistBrief("Power tools", ["part12", "part19"], "Use before hand-held power tools, grinders, saws, drills, powder-actuated tools, or temporary power are used.", [
    "Tool, accessory, guard, handle, switch, cord/battery, and attachment are inspected.",
    "Blade, wheel, bit, or accessory matches tool speed, material, and manufacturer instructions.",
    "Guards are not removed, tied back, wedged, taped, or bypassed.",
    "Line of fire, kickback, pinch points, dust, noise, sparks, and flying particles are controlled.",
    "Power is disconnected or battery removed before blade/wheel changes or jam clearing.",
    "Cords and hoses are routed away from water, sharp edges, doorways, and vehicle paths.",
    "Damaged tools, missing guards, or questionable accessories are removed from service.",
    "Workers using specialized tools are trained or directly supervised.",
  ]),
  checklistBrief("Traffic control", ["part18", "part16"], "Use before work affects vehicles, pedestrians, cyclists, deliveries, or public road/site traffic.", [
    "Traffic control plan, signage, cones, barriers, and worker positions match the current work area.",
    "Delivery routes, backing paths, staging areas, and pedestrian crossings are reviewed.",
    "High-visibility apparel, lighting, radios, and stop/slow or spotter communication are checked.",
    "Public pedestrians, cyclists, neighbours, and site workers are separated from vehicle movement.",
    "Emergency access and transit, sidewalk, or driveway impacts are considered.",
    "Traffic control setup changes when weather, darkness, congestion, or work sequence changes.",
    "Workers know the stop command and who controls vehicle movement.",
    "Deficiencies are corrected before vehicles are allowed through the work zone.",
  ]),
  checklistBrief("Incident follow-up", ["part3", "act"], "Use after an incident, injury, near miss, dangerous condition, or high-potential event.", [
    "Immediate care, emergency response, and hazard isolation are complete before follow-up starts.",
    "Scene information, photos if appropriate, equipment, location, time, and witnesses are preserved.",
    "Supervisor, employer, prime contractor, first aid, and reporting contacts are notified as required by site procedure.",
    "Facts are separated from opinions, blame, or speculation.",
    "Root causes, contributing conditions, and failed controls are identified.",
    "Corrective actions have responsible persons, due dates, and verification method.",
    "Affected workers and supervisors are briefed before similar work resumes.",
    "Privacy, reporting, and record-retention needs are reviewed before forms are shared.",
  ]),
];

const formBriefs = [
  formBrief("Incident report", ["Project", "Date/time of incident", "Exact location", "Employer/trade", "Person reporting", "Supervisor notified", "Incident type", "Task underway", "What happened", "Immediate controls taken", "First aid/emergency response contacted if applicable", "Witnesses", "Photos/evidence reference", "Corrective action required", "Responsible person", "Due date", "Reviewer"]),
  formBrief("Near miss report", ["Project", "Date/time", "Location", "Reporter", "Employer/trade", "Near miss description", "What could have happened", "Immediate control applied", "Potential severity", "Recurring condition", "Suggested corrective action", "Responsible person", "Due date", "Closeout evidence", "Reviewer"]),
  formBrief("Hazard report", ["Project", "Date/time observed", "Location", "Hazard category", "Description of hazard", "Who could be affected", "Immediate stop/control taken", "Reported to", "Recommended corrective action", "Priority", "Responsible person", "Due date", "Closeout notes", "Reviewer"]),
  formBrief("Corrective action log", ["Project", "Action number", "Source of action", "Date opened", "Hazard/deficiency", "Required corrective action", "Interim control", "Assigned to", "Due date", "Status", "Verification method", "Closeout date", "Closeout evidence", "Reviewer"]),
  formBrief("Worker orientation", ["Project", "Worker name", "Employer/trade", "Start date", "Supervisor", "Emergency/muster reviewed", "First aid location reviewed", "Hazard reporting reviewed", "Site rules reviewed", "High-risk work restrictions", "Required training verified", "Questions answered", "Worker acknowledgment", "Orienter", "Review date"]),
  formBrief("Toolbox talk attendance", ["Project", "Date/time", "Talk title", "Topic area", "Supervisor/leader", "Crew/trade", "Key hazard discussed", "Control demonstrated", "Crew questions raised", "Follow-up actions", "Printed source/review note attached", "Attendee names/signatures", "Leader sign-off"]),
  formBrief("Equipment inspection", ["Project", "Date/time", "Equipment ID", "Equipment type", "Operator/inspector", "Pre-use checks completed", "Defects found", "Removed from service yes/no", "Immediate control", "Maintenance notified", "Repair required", "Return-to-service authorization", "Closeout evidence", "Reviewer"]),
  formBrief("Site safety inspection", ["Project", "Inspection date/time", "Inspector", "Area inspected", "Trades present", "Positive observations", "Deficiencies", "High-risk work observed", "Immediate controls", "Photos/evidence reference", "Assigned corrective actions", "Due dates", "Follow-up date", "Reviewer"]),
  formBrief("Training matrix", ["Project", "Worker name", "Employer/trade", "Role/task", "Training topic", "Provider/instructor", "Date completed", "Expiry/review date if applicable", "Competency verification needed", "Restrictions/limitations", "Document location", "Reviewer"]),
  formBrief("Investigation witness statement", ["Project", "Incident reference", "Statement date/time", "Witness name", "Employer/trade", "Contact through employer/supervisor", "Where witness was located", "What witness saw/heard", "Sequence of events", "Other people present", "Photos/documents referenced", "Statement taken by", "Witness review/acknowledgment"]),
  formBrief("Subcontractor safety onboarding", ["Project", "Subcontractor", "Scope of work", "Site contact", "Supervisor/foreperson", "Crew size", "Orientation completed", "Prime contractor coordination contact", "High-risk work expected", "Required permits/plans", "Insurance/clearance reference if applicable", "Training records reviewed", "Emergency information shared", "Deficiency reporting method", "Authorized start date", "Reviewer"]),
];

const checklistTitles = checklistBriefs.map((checklist) => checklist.title);
const formTitles = formBriefs.map((form) => form.title);

const toolboxTalkBriefs = [
  talkBrief(
    "Tie-off planning before edge work",
    "Fall protection",
    ["part11", "part32", "part3"],
    "Before edge work starts, the crew must know the fall hazard, the selected fall protection method, and how rescue would start if a worker falls.",
    [
      "Identify the exact edge, opening, or leading edge exposure for today's task.",
      "Confirm whether guardrails, restraint, fall arrest, or another reviewed control is being used.",
      "Point out anchor locations, travel limits, swing-fall hazards, and sharp-edge concerns.",
      "Check that required equipment is inspected, connected correctly, and fits the worker using it.",
      "Confirm the rescue plan, communication method, and who has authority to stop the work.",
    ],
    [
      "Where could a fall happen on this task?",
      "What keeps you from reaching the edge or what arrests the fall?",
      "Who starts rescue and how do they call for help?",
    ],
    "Walk the crew to the edge and physically point out the anchor, travel path, edge exposure, access route, and rescue equipment location.",
    "Workers sign only after they can identify their tie-off point, the fall hazard, and the rescue contact for this task.",
  ),
  talkBrief(
    "Guardrails and floor openings",
    "Fall protection",
    ["part11", "part20", "part4"],
    "A guardrail or opening cover only protects workers when it is complete, secured, visible, and left in place until another control is ready.",
    [
      "Find every nearby floor opening, shaft, stair opening, balcony edge, or incomplete guardrail.",
      "Check that covers are secured, marked, and strong enough for expected site loads after review by the employer.",
      "Do not remove guardrails or covers without a replacement control and supervisor approval.",
      "Keep materials from hiding floor openings or blocking inspection of guardrails.",
      "Report damaged rails, loose covers, missing midrails, and unprotected edges immediately.",
    ],
    [
      "Which opening or edge is closest to our work today?",
      "What should you do before moving a cover or rail?",
      "How can a floor opening become hidden during normal work?",
    ],
    "Show one guardrail or cover and have the crew point out how it is secured, marked, and kept visible.",
    "Crew members sign after they can explain the rule for not removing a guardrail or cover without an alternate control.",
  ),
  talkBrief(
    "Fall rescue readiness",
    "Fall protection",
    ["part11", "part32", "part3"],
    "Fall protection is incomplete if the crew cannot explain how a suspended worker will be reached quickly and safely.",
    [
      "Review where a fallen worker could hang after using fall arrest equipment.",
      "Confirm rescue equipment, access, and trained responders are available before work starts.",
      "Keep emergency access routes clear for ladders, lifts, or rescue equipment.",
      "Do not rely on unplanned worker-to-worker rescue from an exposed edge.",
      "Treat rescue planning as part of the job setup, not as a paperwork step after work begins.",
    ],
    [
      "Where would a worker end up if they fell from this location?",
      "What equipment or access would be used for rescue?",
      "What condition means this work pauses until rescue planning is fixed?",
    ],
    "Stand at the work area and trace the rescue route from the fallen-worker location to the equipment and emergency access point.",
    "Workers sign after they can name the rescue method and the person to contact if a fall occurs.",
  ),
  talkBrief(
    "Harness inspection",
    "Fall protection",
    ["part11", "part8"],
    "A harness that is damaged, altered, contaminated, or missing required information is not a reliable fall protection control.",
    [
      "Inspect webbing for cuts, burns, chemical damage, pulled stitching, or heavy wear.",
      "Check D-rings, buckles, labels, lanyards, snap hooks, and self-retracting devices before use.",
      "Remove equipment from service if damage, impact loading, missing labels, or uncertainty is found.",
      "Match the harness, connector, anchor, and task before starting work.",
      "Store harnesses so they are not crushed, wet, contaminated, or left in direct damage paths.",
    ],
    [
      "What damage would make you stop using a harness?",
      "Where do you check labels and hardware?",
      "Who do you tell if inspection results are unclear?",
    ],
    "Hold up a harness and walk through webbing, stitching, hardware, label, and connector checks in order.",
    "Workers sign after they inspect their own harness or explain why a damaged harness must be removed from service.",
  ),
  talkBrief(
    "Ladder setup and three-point contact",
    "Ladders and scaffolds",
    ["part13", "part11"],
    "A ladder is only a safe access tool when it is the right ladder, set on stable footing, secured when needed, and used without overreaching.",
    [
      "Choose a ladder that suits the height, work duration, surface, and materials being carried.",
      "Set feet on firm, level ground and keep the top supported before climbing.",
      "Maintain three points of contact and keep belt buckle between the side rails.",
      "Do not use damaged ladders, makeshift extensions, top steps, or unstable bases.",
      "Keep ladders out of vehicle routes, door swings, overhead hazards, and wet or cluttered areas.",
    ],
    [
      "Is this ladder being used for access or as a work platform?",
      "What makes this setup unstable?",
      "How will tools or materials be moved without overloading the climber?",
    ],
    "Set a ladder in the work area and ask the crew to identify footing, angle, top support, access path, and overreach hazards.",
    "Workers sign after they can identify one ladder defect and one setup condition that would stop the climb.",
  ),
  talkBrief(
    "Scaffold access and tagging",
    "Ladders and scaffolds",
    ["part13", "part11"],
    "Workers must know whether a scaffold is ready to use before they climb it, load it, or change anything on it.",
    [
      "Check the scaffold status tag or other site system before using the scaffold.",
      "Use proper access and do not climb cross-bracing, frames, or guardrails.",
      "Look for missing planks, guardrails, toe boards, base plates, ties, or damaged components.",
      "Do not move, remove, or modify scaffold parts unless authorized and competent to do so.",
      "Keep platform loads, materials, and tools within the reviewed setup for that scaffold.",
    ],
    [
      "What does the scaffold tag or site status system tell you?",
      "What missing part would make you stay off the scaffold?",
      "Who can change the scaffold setup?",
    ],
    "Show the access point and status tag, then have workers identify one component they must check before stepping on.",
    "Crew members sign after they can explain when to stay off a scaffold and who to notify.",
  ),
  talkBrief(
    "Rolling scaffold movement",
    "Ladders and scaffolds",
    ["part13", "part11"],
    "A rolling scaffold becomes hazardous when it is moved with people, tools, uneven ground, overhead hazards, or unlocked wheels involved.",
    [
      "Remove workers from the platform before moving the scaffold.",
      "Check the floor for holes, slopes, debris, cords, and soft surfaces along the travel path.",
      "Lower or secure loose tools and materials before movement.",
      "Lock wheels and verify level setup before anyone climbs back on.",
      "Watch for overhead lines, pipes, door frames, and other strike hazards during movement.",
    ],
    [
      "What must happen before the scaffold is moved?",
      "Where could a wheel drop, catch, or roll unexpectedly?",
      "How do we confirm it is ready to use after moving?",
    ],
    "Walk the intended travel path and point out floor, overhead, wheel-lock, and leveling checks.",
    "Workers sign after they can describe the move-clear-lock-level sequence.",
  ),
  talkBrief(
    "Trench cave-in warning signs",
    "Excavation and trenching",
    ["part20", "part16"],
    "No one enters a trench until cave-in, water, spoil pile, access, and equipment hazards have been reviewed and controlled.",
    [
      "Look for cracking, sloughing, bulging, water seepage, vibration, or changing soil conditions.",
      "Keep spoil piles, materials, and mobile equipment away from the excavation edge as required by the reviewed plan.",
      "Confirm sloping, shoring, shielding, or other protective systems before entry.",
      "Keep ladders or other safe access in place and clear.",
      "Stop work if weather, groundwater, utilities, or nearby loading changes the trench condition.",
    ],
    [
      "What warning sign means everyone gets out?",
      "Where are spoil piles and equipment located relative to the edge?",
      "What protective system is being used today?",
    ],
    "From outside the trench, identify soil condition, spoil location, access, protective system, and nearby equipment paths.",
    "Workers sign after they can name one cave-in warning sign and the escape route.",
  ),
  talkBrief(
    "Underground utility awareness",
    "Excavation and trenching",
    ["part20", "part19"],
    "Digging starts only after the crew understands the utility locate information, exposure method, and stop point for unknown services.",
    [
      "Review current locate information, markings, drawings, and known service conflicts before digging.",
      "Expose utilities using the site-approved method before mechanical excavation near them.",
      "Treat unmarked, abandoned, or unusual lines as unknown until verified.",
      "Keep workers clear of strike zones and stored-energy release paths.",
      "Stop when markings are missing, confusing, damaged, or inconsistent with the excavation.",
    ],
    [
      "Which utility is closest to today's dig?",
      "What is our exposure method before equipment digs near it?",
      "What would make you stop and call the supervisor?",
    ],
    "Show the crew the locate markings and compare them to the planned excavation limits and equipment path.",
    "Workers sign after they can identify the nearest utility and the stop-work trigger for uncertainty.",
  ),
  talkBrief(
    "Confined space entry basics",
    "Confined spaces",
    ["part9", "part32", "part3"],
    "A confined space entry is not routine work; entry waits until hazards, atmosphere, isolation, communication, attendants, and rescue are confirmed.",
    [
      "Confirm the space is identified and the entry conditions match the reviewed procedure.",
      "Check atmospheric testing, ventilation, isolation, lockout, and engulfment controls before entry.",
      "Keep an attendant, communication method, and rescue plan in place for the entry.",
      "Do not enter for a quick look when permits, testing, or rescue support are missing.",
      "Leave the space if alarms, symptoms, communication failures, or changed conditions occur.",
    ],
    [
      "What makes this space a confined space?",
      "Who is the attendant and how do entrants communicate?",
      "What condition means entrants leave immediately?",
    ],
    "Point out the entry point, attendant position, communication method, testing record, and rescue access without entering the space.",
    "Workers sign after they can explain the entry control and the immediate exit trigger.",
  ),
  talkBrief(
    "Atmospheric testing awareness",
    "Confined spaces",
    ["part9", "part5"],
    "Atmospheric testing is a control signal: if the result, tester, instrument, or timing is uncertain, the crew does not enter.",
    [
      "Confirm the atmosphere is tested by a qualified person using the site-required instrument and method.",
      "Understand what is being checked, such as oxygen level, flammable atmosphere, or toxic contaminants.",
      "Test before entry and continue monitoring when the procedure requires it.",
      "Keep ventilation and isolation controls matched to the testing results.",
      "Leave or stay out if an alarm sounds, readings change, or the instrument status is unclear.",
    ],
    [
      "What readings or alarms are being watched today?",
      "Where is the monitor placed and who responds to it?",
      "What do we do if the reading changes?",
    ],
    "Show the monitor location, alarm response, and where readings are documented for this entry.",
    "Workers sign after they can explain what an alarm means and who controls entry.",
  ),
  talkBrief(
    "Silica dust controls",
    "Silica and dust",
    ["part6", "part5", "part8"],
    "Concrete, masonry, rock, and similar dust-producing work needs planned dust control before cutting, grinding, drilling, sweeping, or cleanup starts.",
    [
      "Identify which task will create respirable dust and who could be exposed nearby.",
      "Use reviewed controls such as water, local exhaust, isolation, ventilation, and suitable cleanup methods.",
      "Do not dry sweep, blow down dust, or remove controls for convenience.",
      "Confirm respiratory protection requirements, fit, cartridges, and limits before relying on a respirator.",
      "Keep adjacent workers and public areas out of the dust path.",
    ],
    [
      "What material are we disturbing today?",
      "What dust control is active before the tool starts?",
      "Who else could be exposed if the wind or work direction changes?",
    ],
    "Show the water feed, vacuum, enclosure, or exclusion area that will control dust before the first cut or grind.",
    "Workers sign after they can identify the dust source, control, and stop point if dust becomes visible or uncontrolled.",
  ),
  talkBrief(
    "Wet cutting and HEPA cleanup",
    "Silica and dust",
    ["part6", "part5", "part8"],
    "Wet cutting and HEPA cleanup only work when water, capture, cleanup, and slurry handling are planned as one system.",
    [
      "Confirm water reaches the blade or bit at the dust source before cutting starts.",
      "Keep hoses, cords, and slurry from creating slip, trip, or electrical hazards.",
      "Use HEPA-filtered vacuum equipment and compatible attachments where the procedure calls for capture.",
      "Do not use compressed air or dry sweeping for silica-containing dust cleanup.",
      "Plan how slurry and filters will be handled, bagged, labelled, or disposed under site procedure.",
    ],
    [
      "Where does the dust or slurry go during this task?",
      "What cleanup method is allowed here?",
      "What would tell us the water or vacuum control is failing?",
    ],
    "Start at the tool and trace water, vacuum, slurry, cord routing, and cleanup equipment before work begins.",
    "Workers sign after they can explain how dust is captured and how cleanup will be done.",
  ),
  talkBrief(
    "Respirator fit and seal checks",
    "Silica and dust",
    ["part8", "part5", "part6"],
    "A respirator does not protect a worker unless it is the right type, fits the worker, seals correctly, and is used within the reviewed exposure-control plan.",
    [
      "Confirm the selected respirator type matches the hazard and current site procedure.",
      "Check fit-test status, model, size, filters, cartridges, and condition before use.",
      "Perform a user seal check each time the tight-fitting respirator is put on.",
      "Keep face seal areas clear according to the respirator program and manufacturer instructions.",
      "Replace damaged, dirty, saturated, expired, or wrong filters before work continues.",
    ],
    [
      "Which respirator and filter are assigned for this task?",
      "How do you do a seal check?",
      "What condition means the respirator comes out of service?",
    ],
    "Have workers demonstrate a seal check and point out filter, strap, facepiece, and storage condition checks.",
    "Workers sign after they can complete a seal check or identify why their respirator cannot be used.",
  ),
  talkBrief(
    "WHMIS labels and SDS access",
    "WHMIS/SDS",
    ["part5"],
    "Hazardous products must be identifiable before use; workers need the label, SDS access, and site instructions for safe handling.",
    [
      "Check that original and workplace containers are labelled before the product is used.",
      "Know where the current SDS is available and how to read key hazards, PPE, storage, spill, and first aid sections.",
      "Do not use mystery containers, damaged labels, or transferred products without required information.",
      "Keep incompatible products separated according to the reviewed SDS and site storage plan.",
      "Report spills, leaks, symptoms, or missing SDS information before continuing work.",
    ],
    [
      "What product are we using today?",
      "Where is its SDS and what hazard symbol or warning applies?",
      "What would make you stop using the container?",
    ],
    "Show one product container and have the crew locate the label, SDS access point, PPE note, and storage instruction.",
    "Workers sign after they can find the SDS and identify one hazard for the product being used.",
  ),
  talkBrief(
    "Chemical storage on site",
    "WHMIS/SDS",
    ["part5", "part4"],
    "Chemical storage must prevent leaks, incompatible mixing, ignition, and unidentified containers from becoming a site-wide hazard.",
    [
      "Keep containers closed, labelled, upright, and protected from impact or weather damage.",
      "Separate incompatible products using SDS and site storage instructions.",
      "Keep ignition sources away from flammable or reactive products.",
      "Use secondary containment or spill controls where the site procedure requires them.",
      "Do not store chemicals in exits, stairways, electrical rooms, lunch areas, or unapproved work zones.",
    ],
    [
      "Which products here must be separated?",
      "What spill control is available?",
      "What container condition must be reported before use?",
    ],
    "Walk the storage area and identify labels, incompatible products, spill kit, ventilation, and access controls.",
    "Crew members sign after they can identify one storage problem and the reporting path.",
  ),
  talkBrief(
    "Eye and face protection",
    "PPE",
    ["part8", "part12"],
    "Eye and face protection must match the actual hazard: flying particles, splash, dust, arc, heat, or grinding sparks are not controlled by one generic pair of glasses.",
    [
      "Identify whether the task creates chips, dust, splash, sparks, UV, or pressure-release hazards.",
      "Choose safety glasses, goggles, face shields, or task-specific protection according to site review and manufacturer instructions.",
      "Use a face shield with suitable eye protection underneath when the task requires both.",
      "Replace scratched, cracked, loose, or contaminated lenses before starting.",
      "Protect nearby workers from line-of-fire hazards with screens, barriers, or exclusion zones.",
    ],
    [
      "What could hit or splash into your eyes today?",
      "Is a face shield enough by itself for this task?",
      "Who nearby also needs protection or separation?",
    ],
    "Hold up the selected protection and compare it to the hazard source, direction of travel, and nearby workers.",
    "Workers sign after they can explain why the selected eye or face protection matches the task.",
  ),
  talkBrief(
    "High visibility apparel",
    "PPE",
    ["part8", "part16", "part18"],
    "High visibility apparel helps only when it is worn correctly, visible from the equipment path, and supported by traffic controls.",
    [
      "Identify vehicle, equipment, delivery, and pedestrian movement near the work.",
      "Wear the required class or type of high visibility apparel for the site condition after review.",
      "Keep reflective striping visible and replace apparel that is dirty, torn, covered, or faded.",
      "Do not treat high visibility clothing as a substitute for separation, spotters, or traffic control.",
      "Use lighting, barricades, signs, and communication when visibility is reduced.",
    ],
    [
      "Where could equipment approach from today?",
      "Can operators see you from their normal travel path?",
      "What other control separates people from equipment?",
    ],
    "Stand in the work area and have the crew identify blind approaches, lighting issues, and separation controls.",
    "Workers sign after they can name the vehicle path and the control beyond clothing.",
  ),
  talkBrief(
    "Hearing protection",
    "PPE",
    ["part8", "part7", "part12"],
    "Hearing protection must be selected, fitted, and worn before noisy work begins, not after the noise is already uncomfortable.",
    [
      "Identify loud tools, equipment, impact work, compressed air, and nearby noise sources.",
      "Use the site-required hearing protection and fit it correctly before exposure starts.",
      "Keep communication methods clear when hearing protection reduces normal speech or warning sounds.",
      "Replace damaged, dirty, loose, or poorly fitting plugs or muffs.",
      "Move non-essential workers away from high-noise zones where practical.",
    ],
    [
      "What is the loudest task in this area today?",
      "How will we communicate warnings while protection is worn?",
      "What makes earplugs or earmuffs ineffective?",
    ],
    "Demonstrate fitting the selected hearing protection and point out the noisy work boundary.",
    "Workers sign after they can fit their protection and explain how warnings will be communicated.",
  ),
  talkBrief(
    "Glove selection",
    "PPE",
    ["part8", "part12", "part5"],
    "The wrong glove can create a new hazard; glove choice must match cuts, chemicals, heat, puncture, wet work, or rotating equipment exposure.",
    [
      "Identify the contact hazard: sharp edge, chemical, heat, vibration, abrasion, wet concrete, or biological exposure.",
      "Select gloves that match the hazard and check manufacturer or SDS guidance where relevant.",
      "Inspect for holes, contamination, stiffness, saturation, or loss of grip before use.",
      "Avoid loose gloves near rotating or pinch-point equipment where they can be caught.",
      "Change gloves when the task changes or contamination is suspected.",
    ],
    [
      "What is your hand hazard today?",
      "Could this glove get caught, soaked, cut, or degraded?",
      "When should the glove be replaced?",
    ],
    "Compare two glove types and ask the crew which one matches the task hazard and which one does not.",
    "Workers sign after they can explain why their glove choice fits the task.",
  ),
  talkBrief(
    "First aid access and reporting",
    "First aid",
    ["part3", "part32"],
    "First aid works best when workers know where to go, who to call, how to guide help in, and what must be reported immediately.",
    [
      "Identify the first aid attendant, first aid room or kit location, and communication method for today's area.",
      "Keep access routes clear for attendants, stretchers, vehicles, and emergency responders.",
      "Report injuries, symptoms, and near misses promptly using the site process.",
      "Do not record unnecessary private medical details in general safety documents.",
      "Make sure workers know the address, gate, level, stair, or zone for emergency response.",
    ],
    [
      "Where is first aid from this work area?",
      "How do we call or guide the attendant here?",
      "What information should not be written in a public sign-off sheet?",
    ],
    "Walk the route from the task area to first aid and identify the fastest communication point.",
    "Workers sign after they can state how to contact first aid and where help should enter.",
  ),
  talkBrief(
    "AED location and emergency access",
    "First aid",
    ["part3", "part32"],
    "An AED is only useful if workers can find it quickly, call emergency help, and keep the access route open.",
    [
      "Point out the AED location, signage, access hours, and any locked doors or elevator issues.",
      "Confirm who calls emergency services and who guides responders to the patient.",
      "Keep gates, stairs, elevators, corridors, and muster routes clear.",
      "Do not move emergency equipment or block AED cabinets with materials.",
      "Follow training and site emergency procedures when using first aid equipment.",
    ],
    [
      "Where is the nearest AED?",
      "Who meets emergency responders at the access point?",
      "What could delay the AED or responders from reaching this area?",
    ],
    "Have the crew physically point to the AED route, emergency access point, and person assigned to guide responders.",
    "Workers sign after they can identify the AED location and emergency access path.",
  ),
  talkBrief(
    "Cardiac arrest response basics",
    "First aid",
    ["part3", "part32"],
    "If someone collapses and is not responding normally, the crew must activate emergency response immediately and follow first aid training and site procedure.",
    [
      "Call emergency services and site first aid immediately according to the emergency plan.",
      "Send someone to get the AED and another person to guide responders to the exact location.",
      "Follow CPR and AED training only if trained and safe to do so.",
      "Clear the work area so responders have room and equipment access.",
      "Protect privacy and avoid unnecessary discussion or recording of medical details.",
    ],
    [
      "Who calls emergency services and who gets the AED?",
      "How do responders find this exact location?",
      "What should bystanders do to keep the response area clear?",
    ],
    "Assign sample roles for caller, AED runner, guide, and area control, then walk the access path.",
    "Workers sign after they can name their emergency role and the AED route.",
  ),
  talkBrief(
    "Incident and near miss reporting",
    "Incident reporting",
    ["part3", "act"],
    "Near misses and incidents are warning signs; the site needs prompt reporting, preservation of useful facts, and corrective action before work repeats.",
    [
      "Report incidents, injuries, near misses, and dangerous conditions through the site process immediately.",
      "Make the area safe before collecting information or restarting work.",
      "Preserve relevant evidence when it is safe and appropriate to do so.",
      "Record facts, time, location, equipment, conditions, and immediate controls without blame or speculation.",
      "Track corrective actions to closeout so the same condition does not repeat.",
    ],
    [
      "What near miss would be easy to ignore on this task?",
      "Who needs to be notified first?",
      "What evidence helps fix the hazard without blaming workers?",
    ],
    "Use a sample near miss from the task area and walk through report, control, review, and closeout.",
    "Workers sign after they can name one reportable near miss and the reporting route.",
  ),
  talkBrief(
    "Refusing unsafe work",
    "Refusing unsafe work",
    ["part3", "act"],
    "Workers must stop and speak up when they believe the work creates an undue hazard, and supervisors must handle that concern through the current BC/site process.",
    [
      "Workers should tell the supervisor immediately if they believe work is unsafe.",
      "Stay available, explain the concern clearly, and avoid creating a new hazard while the concern is reviewed.",
      "Supervisors must take the concern seriously and follow the required review process.",
      "Do not pressure a worker to continue before the concern is resolved through the proper process.",
      "Document the hazard, controls, and decision path without retaliation or blame.",
    ],
    [
      "What would make you refuse this task today?",
      "Who do you tell first?",
      "What should the supervisor do after hearing the concern?",
    ],
    "Role-play a worker reporting an unsafe condition and a supervisor stopping the task for review.",
    "Workers sign after they can state the first step for refusing unsafe work on this site.",
  ),
  talkBrief(
    "New worker questions",
    "Young/new workers",
    ["part3", "act"],
    "New and young workers need direct permission to ask questions before they guess, copy others, or continue without understanding the hazard.",
    [
      "Point out task hazards that may not be obvious to someone new to construction.",
      "Assign a supervisor, lead hand, or experienced worker for questions during the shift.",
      "Explain that asking for clarification is expected, not a sign of weakness.",
      "Check understanding by asking the worker to repeat the task, hazard, and control.",
      "Use extra supervision when the worker is new to the task, tool, crew, or site area.",
    ],
    [
      "What part of this task is unclear?",
      "Who is your go-to person for questions today?",
      "What should you do if you feel rushed but unsure?",
    ],
    "Ask a new-worker-style question out loud and model the expected supervisor response.",
    "Workers sign after they can name the person they will ask before guessing.",
  ),
  talkBrief(
    "Site orientation refresh",
    "Site orientation",
    ["part3"],
    "Orientation information must stay useful after day one; workers need current emergency, access, reporting, and high-risk work information for today's site.",
    [
      "Review current muster area, emergency access, first aid contact, and site map changes.",
      "Identify restricted areas, public interfaces, high-risk work zones, and active permits.",
      "Confirm how workers report hazards, injuries, near misses, and changed conditions.",
      "Update workers when gates, stairs, elevators, traffic routes, or supervisor contacts change.",
      "Check that new or returning workers understand the information before starting work.",
    ],
    [
      "What changed on site since your last shift?",
      "Where do you go in an emergency from this area?",
      "How do you report a hazard today?",
    ],
    "Use the current site board or map to point out emergency, access, restricted, and reporting locations.",
    "Workers sign after they can identify one changed site condition and the emergency route.",
  ),
  talkBrief(
    "Power tool guards",
    "Tool and equipment safety",
    ["part12", "part19"],
    "A power tool guard is a control, not an inconvenience; damaged, missing, tied-back, or wrong guards stop the task.",
    [
      "Check guards, handles, switches, cords, blades, wheels, and attachments before use.",
      "Use only tool accessories that match the tool, speed rating, material, and manufacturer instructions.",
      "Do not remove, wedge, tape, tie back, or bypass guards.",
      "Keep hands, clothing, cords, and nearby workers out of the line of fire.",
      "Disconnect power or remove the battery before changing blades, bits, wheels, or clearing jams.",
    ],
    [
      "What does the guard protect you from on this tool?",
      "What accessory mismatch could fail during use?",
      "When must the tool be unplugged or battery removed?",
    ],
    "Inspect one tool with the crew and point out the guard, switch, cord, accessory, and line of fire.",
    "Workers sign after they can identify one defect that takes the tool out of service.",
  ),
  talkBrief(
    "Extension cords and temporary power",
    "Electrical safety",
    ["part19", "part12"],
    "Temporary power must be routed and inspected so cords do not become shock, fire, trip, or equipment-damage hazards.",
    [
      "Inspect cords for cuts, crushed insulation, missing ground pins, exposed conductors, and damaged plugs.",
      "Keep cords out of water, pinch points, sharp edges, vehicle paths, and doorways.",
      "Use power sources, protection, and equipment suited to the task and site conditions.",
      "Do not daisy-chain, overload, repair with tape, or use damaged cords.",
      "Route cords to reduce trips and protect them from falling materials or mobile equipment.",
    ],
    [
      "Where could this cord be damaged today?",
      "What cord condition means it comes out of service?",
      "How are we keeping cords away from water and traffic?",
    ],
    "Walk the cord route from panel to tool and point out protection, trip hazards, water, and damage checks.",
    "Workers sign after they can identify one cord defect and one safer routing choice.",
  ),
  talkBrief(
    "Overhead power line awareness",
    "Electrical safety",
    ["part19", "part16", "part14"],
    "Work near overhead power lines needs planning before equipment, materials, ladders, or loads enter the area.",
    [
      "Identify overhead lines before moving equipment, ladders, scaffolds, pipe, rebar, or crane loads.",
      "Confirm approach limits, dedicated travel routes, barriers, and spotter needs under the reviewed plan.",
      "Treat all overhead lines as energized unless the utility and site plan confirm otherwise.",
      "Keep workers out of line-contact and step-potential danger areas.",
      "Stop if the route, boom position, load path, or weather creates uncertainty.",
    ],
    [
      "Where are the closest overhead lines?",
      "What equipment or material could reach them?",
      "Who controls movement near the line today?",
    ],
    "Stand at the travel or lift route and trace the closest line, equipment envelope, and stop point.",
    "Workers sign after they can identify the overhead line hazard and the controller for movement.",
  ),
  talkBrief(
    "Lockout before maintenance",
    "Lockout/tagout",
    ["part10", "part19"],
    "Maintenance, clearing jams, or servicing waits until hazardous energy is isolated, locked out, and verified according to the site procedure.",
    [
      "Identify all energy sources: electrical, mechanical, hydraulic, pneumatic, gravity, thermal, or stored pressure.",
      "Shut down and isolate using the approved procedure before hands enter danger zones.",
      "Apply personal locks or the site-required lockout method before work starts.",
      "Verify zero energy or safe state before maintenance begins.",
      "Do not remove another worker's lock or restart equipment until the lockout process is complete.",
    ],
    [
      "What energy sources are present on this equipment?",
      "How do we verify the equipment cannot start or move?",
      "What is the rule for someone else's lock?",
    ],
    "Use an equipment example to point out isolation points, lock placement, try-start or verification step, and restart control.",
    "Workers sign after they can name one energy source and the verification step.",
  ),
  talkBrief(
    "Stored energy hazards",
    "Lockout/tagout",
    ["part10", "part12"],
    "Stored energy can move, drop, spray, release, or strike even after normal power is off.",
    [
      "Look for gravity loads, raised attachments, springs, pressure lines, capacitors, hydraulic pressure, and compressed air.",
      "Block, bleed, lower, release, or secure stored energy using the reviewed procedure.",
      "Stay out of pinch, crush, release, and line-of-fire zones while energy is being controlled.",
      "Confirm gauges, pins, blocks, and restraints before reaching into equipment.",
      "Stop when the energy state is not understood or the procedure does not match the equipment.",
    ],
    [
      "What could still move after power is off?",
      "How is gravity or pressure controlled?",
      "Where is the line of fire during release?",
    ],
    "Point to a raised, pressurized, or spring-loaded example and describe how stored energy is controlled.",
    "Workers sign after they can identify one stored-energy source and one body position to avoid.",
  ),
  talkBrief(
    "Mobile equipment blind spots",
    "Mobile equipment",
    ["part16", "part18"],
    "Operators and ground workers must treat blind spots as expected, not exceptional, and use separation before relying on eye contact.",
    [
      "Identify the equipment operating area, swing radius, backing path, and pedestrian crossings.",
      "Use physical separation, exclusion zones, traffic control, and spotters where required by the plan.",
      "Do not walk behind, beside, or under equipment without operator acknowledgement and a clear route.",
      "Remember that mirrors, cameras, alarms, and horns do not remove blind spots.",
      "Stop work when pedestrians or other trades enter the equipment zone unexpectedly.",
    ],
    [
      "Where can the operator not see you?",
      "What separates workers from equipment today?",
      "What is the stop signal if someone enters the zone?",
    ],
    "Stand at the equipment and mark out the backing path, swing area, blind side, and worker exclusion line.",
    "Workers sign after they can identify the no-go zone around the equipment.",
  ),
  talkBrief(
    "Spotter communication",
    "Mobile equipment",
    ["part16", "part18"],
    "A spotter only helps when the operator and spotter agree on signals, position, stop command, and lost-contact procedure before movement.",
    [
      "Confirm hand signals, radio channel, names, and the stop command before equipment moves.",
      "Keep the spotter visible to the operator and outside the crush or backing path.",
      "Use one designated spotter unless the plan clearly assigns more communication roles.",
      "Stop movement immediately if visual or radio contact is lost.",
      "Keep pedestrians and unrelated workers out of the movement zone.",
    ],
    [
      "What is today's stop signal?",
      "Where will the spotter stand?",
      "What happens if the operator loses sight of the spotter?",
    ],
    "Have the operator and spotter demonstrate start, stop, turn, distance, and lost-contact signals before movement.",
    "Workers sign after they can state the stop signal and lost-contact rule.",
  ),
  talkBrief(
    "Seat belts and rollover risk",
    "Mobile equipment",
    ["part16"],
    "Seat belts and rollover protection work together; skipping the belt can turn a survivable tip or rollover into a fatal event.",
    [
      "Wear the seat belt when operating equipment fitted with rollover protection unless the reviewed procedure states otherwise.",
      "Check slopes, edges, ramps, soft ground, excavations, and sudden drop-offs before travel.",
      "Keep loads low and travel at a speed suited to ground conditions.",
      "Avoid sharp turns, side-hill travel, and raised-load travel where practical.",
      "Report missing belts, damaged latches, poor seat condition, or rollover protection concerns.",
    ],
    [
      "Where is rollover risk highest on this site today?",
      "What travel condition means slow down or stop?",
      "What defect makes the equipment unsafe to operate?",
    ],
    "Point out the seat belt, rollover protection, travel route, slope, edge, and soft-ground risks before operation.",
    "Operators sign after they can identify the rollover hazard and confirm belt use.",
  ),
  talkBrief(
    "Crane pick communication",
    "Cranes/rigging",
    ["part14", "part19"],
    "Every lift needs clear communication before the load moves: who signals, who rigs, who controls the area, and what stops the lift.",
    [
      "Confirm lift roles: operator, signal person, rigger, supervisor, and exclusion-zone controller.",
      "Review load weight, radius, path, landing area, wind, power lines, and nearby work.",
      "Use agreed hand signals or radio communication before the first movement.",
      "Stop the lift if communication is unclear, the load changes, or someone enters the danger area.",
      "Keep non-essential workers out from under and around the load path.",
    ],
    [
      "Who is the signal person for this pick?",
      "Where is the load travelling and landing?",
      "What is the stop command?",
    ],
    "Before the pick, have the lift team point out the load path, landing point, exclusion area, and communication method.",
    "Crew members sign after they can identify the signal person and stop command.",
  ),
  talkBrief(
    "Rigging inspection basics",
    "Cranes/rigging",
    ["part14"],
    "Rigging must be inspected and matched to the load before tension is applied; damaged or unknown gear stays out of service.",
    [
      "Check slings, shackles, hooks, tags, stitching, wires, chains, pins, and latches before use.",
      "Confirm the rigging choice matches load weight, center of gravity, angle, edge protection, and lift method.",
      "Protect rigging from sharp edges, crushing, heat, chemicals, and pinch points.",
      "Do not use untagged, damaged, modified, or questionable rigging.",
      "Keep hands out of pinch points while tension is taken and the load settles.",
    ],
    [
      "What damage takes this sling or shackle out of service?",
      "Where is the load's center of gravity?",
      "What edge or pinch point needs protection?",
    ],
    "Inspect one sling and shackle with the crew, then trace the rigging angle, edge contact, and hand-clear zone.",
    "Workers sign after they can identify one rigging defect and one pinch point.",
  ),
  talkBrief(
    "Exclusion zones under suspended loads",
    "Cranes/rigging",
    ["part14", "part16"],
    "No schedule pressure justifies standing under or beside a suspended load path; the lift area must be controlled before the load moves.",
    [
      "Mark the load path, swing area, landing area, and drop zone before the lift.",
      "Use barricades, spotters, radios, or other controls to keep people out.",
      "Keep hands off the load until it is landed or controlled as planned.",
      "Use tag lines only when they are part of the reviewed lift method and do not pull workers into danger.",
      "Stop the lift if a worker, vehicle, or public interface enters the exclusion zone.",
    ],
    [
      "Where is the suspended load danger area?",
      "How are workers kept out?",
      "When is it safe to approach the load?",
    ],
    "Have the crew physically mark the no-go area and safe approach point for the lift.",
    "Workers sign after they can identify the exclusion zone and the stop trigger.",
  ),
  talkBrief(
    "Traffic control around deliveries",
    "Traffic control",
    ["part18", "part16"],
    "Delivery traffic creates changing hazards, so routes, backing, pedestrians, unloading, and public interfaces must be controlled before the truck arrives.",
    [
      "Review the delivery route, staging area, backing path, unloading zone, and exit path.",
      "Separate pedestrians, workers, and public traffic from delivery vehicles.",
      "Assign spotters or traffic control roles before backing or unloading starts.",
      "Keep loads secured until the unloading method and exclusion zone are ready.",
      "Stop deliveries when the route is blocked, communication fails, or public exposure changes.",
    ],
    [
      "Where does the truck enter, back, unload, and exit?",
      "Who controls pedestrians during the delivery?",
      "What makes us stop the truck movement?",
    ],
    "Walk the delivery route from gate to unloading area and identify backing, pedestrian, and public-interface controls.",
    "Workers sign after they can name the truck route and the person controlling movement.",
  ),
  talkBrief(
    "Pedestrian detours",
    "Traffic control",
    ["part18", "part20"],
    "A pedestrian detour must be clear, continuous, protected, and understandable before construction activity blocks the normal route.",
    [
      "Check that signs, barriers, lighting, ramps, and surfaces match the current pedestrian route.",
      "Keep pedestrians separated from equipment, open excavations, falling-object zones, and vehicle traffic.",
      "Maintain access for mobility devices, deliveries, emergency response, and nearby businesses where applicable.",
      "Do not store materials, cords, hoses, or debris in the detour path.",
      "Update the detour immediately when work sequence, weather, hoarding, or public flow changes.",
    ],
    [
      "Where does the public walk today?",
      "What protects pedestrians from our work?",
      "What would make the detour confusing or blocked?",
    ],
    "Walk the detour as a pedestrian and point out signs, barriers, surface changes, and conflict points.",
    "Workers sign after they can identify the public route and who to notify if it is blocked.",
  ),
  talkBrief(
    "Heat stress early signs",
    "Heat/cold stress",
    ["regulation", "guidelines"],
    "Heat stress controls must start before workers feel sick; early signs and workload changes need quick reporting and supervisor response.",
    [
      "Review heat conditions, workload, clothing, hydration, shade, and rest opportunities for the shift.",
      "Use buddy checks for early signs such as unusual fatigue, dizziness, confusion, cramps, or heavy sweating concerns.",
      "Adjust pace, timing, shade, and water access as conditions change.",
      "Report symptoms early and involve first aid according to site procedure.",
      "Pay extra attention to new workers, returning workers, and workers doing heavy tasks in PPE.",
    ],
    [
      "Where can workers cool down and get water?",
      "What early sign should be reported immediately?",
      "How will supervisors adjust work if heat increases?",
    ],
    "Point out water, shade, rest location, first aid contact, and the hottest work areas for the shift.",
    "Workers sign after they can name one early sign and where to get help.",
  ),
  talkBrief(
    "Cold stress and wet clothing",
    "Heat/cold stress",
    ["regulation", "guidelines"],
    "Cold, wind, and wet clothing can reduce judgment and hand function before a worker realizes how much performance has dropped.",
    [
      "Review forecast, wind, wet work, ground conditions, and warm-up options for the shift.",
      "Keep spare dry gloves, socks, and layers available when work is wet or exposed.",
      "Watch for shivering, numbness, clumsy hands, confusion, or workers hiding symptoms to keep working.",
      "Plan warm-up breaks and task rotation when conditions require it.",
      "Report symptoms early and involve first aid according to site procedure.",
    ],
    [
      "What task will make workers wet or cold today?",
      "Where can workers warm up or change dry gear?",
      "What early sign means stop and get help?",
    ],
    "Show the warm-up location, dry-gear storage, and the wettest or windiest work area.",
    "Workers sign after they can identify one cold-stress sign and the warm-up plan.",
  ),
  talkBrief(
    "Violence and harassment reporting",
    "Violence/harassment",
    ["part4", "act"],
    "Threats, harassment, intimidation, and escalating conflict are safety issues that must be reported through the site process.",
    [
      "Define unacceptable conduct using the employer's current policy and site expectations.",
      "Report threats, intimidation, harassment, or violent behaviour promptly.",
      "Do not handle escalating conflict alone when support is available.",
      "Preserve facts, witnesses, time, location, and messages without spreading rumours.",
      "Supervisors must respond without retaliation and follow the reporting process.",
    ],
    [
      "What behaviour must be reported immediately?",
      "Who receives a report on this site?",
      "How do we keep the report factual and private?",
    ],
    "Walk through a sample report: what happened, where, who was present, and who receives it.",
    "Workers sign after they can identify the reporting path for threats or harassment.",
  ),
  talkBrief(
    "Respectful site communication",
    "Violence/harassment",
    ["part4", "part3"],
    "Clear, respectful communication prevents safety information from being ignored, misunderstood, or hidden by intimidation.",
    [
      "Give task instructions in plain language and confirm understanding before work starts.",
      "Use interpreters, diagrams, demonstration, or a buddy when language or literacy barriers exist.",
      "Do not use insults, threats, jokes, or pressure that stops workers from asking safety questions.",
      "Separate safety correction from personal criticism or blame.",
      "Escalate repeated communication problems before they become conflict or unsafe work.",
    ],
    [
      "What instruction today needs a repeat-back?",
      "How do workers ask for clarification here?",
      "What behaviour would stop someone from speaking up?",
    ],
    "Demonstrate a short instruction, then have a worker repeat the task, hazard, and control in their own words.",
    "Workers sign after they can explain how to ask for clarification without being dismissed.",
  ),
  talkBrief(
    "Supervisor stop-work expectations",
    "Supervisor duties",
    ["part3", "act"],
    "Supervisors set the tone: stopping work for an uncontrolled hazard is expected and must be supported, not treated as delay.",
    [
      "Explain who can stop work and what conditions trigger an immediate pause.",
      "Verify controls in the field before relying on paperwork or assumptions.",
      "Respond to worker concerns without blame, retaliation, or pressure to continue.",
      "Document the hazard, temporary control, corrective action, and restart decision.",
      "Communicate changes to affected trades before work resumes.",
    ],
    [
      "What hazard today would make the supervisor stop the task?",
      "How should workers raise a concern?",
      "What must be checked before restart?",
    ],
    "Use a current work area and ask the supervisor to identify the stop-work trigger and restart criteria.",
    "Crew signs after they can state one stop-work trigger and the supervisor response.",
  ),
  talkBrief(
    "Prime contractor coordination",
    "Prime contractor/site coordination",
    ["part3", "part20", "act"],
    "Overlapping work needs coordination so one employer's task does not create hidden hazards for another crew or the public.",
    [
      "Identify all trades, employers, deliveries, public interfaces, and high-risk work in the same area.",
      "Review who controls access, permits, sequencing, traffic, emergency routes, and communication.",
      "Communicate changes before moving work, opening edges, energizing systems, or changing access.",
      "Resolve conflicts before crews improvise around each other.",
      "Keep coordination notes, permits, and contact information available to affected supervisors.",
    ],
    [
      "Which other crew can affect our work today?",
      "Who controls the area if two tasks conflict?",
      "How do we communicate a change before it reaches the field?",
    ],
    "Use the site coordination board or daily plan to point out overlapping work and the contact for each affected crew.",
    "Workers sign after they can identify one overlapping task and the coordination contact.",
  ),
  talkBrief(
    "Emergency muster and headcount",
    "Emergency response",
    ["part32", "part3"],
    "A muster plan only works when workers know where to go, how headcount is checked, and who reports missing or extra people.",
    [
      "Review the alarm signal, evacuation route, muster location, and alternate route for this area.",
      "Keep exits, stairs, gates, hoarding doors, and muster paths clear.",
      "Use sign-in, crew lists, visitor logs, or supervisor counts according to site procedure.",
      "Report missing workers, visitors, or subcontractors immediately to the assigned coordinator.",
      "Do not leave muster or re-enter the work area until the site process allows it.",
    ],
    [
      "Where do you muster from this work area?",
      "Who counts your crew?",
      "What do you do if someone is missing?",
    ],
    "Walk the evacuation route and identify the muster point, alternate route, and headcount person.",
    "Workers sign after they can identify the muster point and headcount process.",
  ),
  talkBrief(
    "Fire extinguisher access",
    "Emergency response",
    ["part32", "part4"],
    "Fire extinguishers and exit routes must stay visible and reachable; blocked emergency equipment is the same as missing equipment in an emergency.",
    [
      "Identify extinguisher locations, exit routes, pull stations, alarms, and fire department access points.",
      "Keep extinguishers mounted or stored where the site plan requires, not buried behind materials.",
      "Check that access is not blocked by lifts, hoarding, debris, locked gates, or stored tools.",
      "Only use extinguishers if trained, safe, and consistent with site emergency procedure.",
      "Evacuate and call emergency help when fire conditions are beyond safe incipient response.",
    ],
    [
      "Where is the nearest extinguisher?",
      "What is blocking emergency access today?",
      "When should workers evacuate instead of trying to fight a fire?",
    ],
    "Walk to the nearest extinguisher and exit path, then remove or identify one access obstruction.",
    "Workers sign after they can point to the extinguisher and exit route.",
  ),
  talkBrief(
    "Hot work fire watch",
    "Emergency response",
    ["part32", "part4"],
    "Hot work is controlled before, during, and after sparks are made; the fire watch must know the area, timing, and stop conditions.",
    [
      "Review the hot work permit or site authorization before grinding, welding, cutting, or torch work starts.",
      "Remove, cover, wet, or shield combustibles in the spark and heat travel area.",
      "Check for hidden openings, wall cavities, lower levels, and adjacent spaces where sparks can travel.",
      "Assign fire watch duties, extinguisher access, and post-work monitoring under the site procedure.",
      "Stop hot work if fire watch, permit, ventilation, access, or extinguisher controls are missing.",
    ],
    [
      "Where could sparks travel from this task?",
      "Who is the fire watch and how long do they stay?",
      "What condition stops hot work immediately?",
    ],
    "Trace the spark path, combustible materials, extinguisher, permit location, and fire watch position.",
    "Workers sign after they can identify the fire watch and spark travel hazard.",
  ),
  talkBrief(
    "Housekeeping and access routes",
    "Housekeeping",
    ["part4", "part20"],
    "Housekeeping is a production control and an emergency control: clear routes prevent trips, blocked exits, delayed first aid, and poor material handling.",
    [
      "Keep stairs, ladders, ramps, corridors, exits, fire equipment, and first aid access clear.",
      "Store materials so they cannot roll, slide, collapse, block views, or hide floor openings.",
      "Remove scrap, nails, banding, cords, hoses, and packaging before they become trip or puncture hazards.",
      "Separate waste streams and hazardous materials according to site procedure.",
      "Clean as the task progresses instead of waiting for the end of shift.",
    ],
    [
      "Which access route must stay clear today?",
      "What material pile could shift or hide a hazard?",
      "Who removes waste before the next trade arrives?",
    ],
    "Walk one route from task area to exit or first aid and identify three items that must be moved or controlled.",
    "Workers sign after they can identify their cleanup responsibility and the route that must stay open.",
  ),
];

const talkTitles = toolboxTalkBriefs.map((talk) => talk.title);

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

function talkBrief(title, topicArea, sourceKeys, keyMessage, discussionPoints, questionsForCrew, supervisorDemo, signOffPrompt) {
  return {
    title,
    topicArea,
    sourceKeys,
    keyMessage,
    discussionPoints,
    questionsForCrew,
    supervisorDemo,
    signOffPrompt,
  };
}

function checklistBrief(title, sourceKeys, use, items) {
  return {
    title,
    sourceKeys,
    use,
    items,
  };
}

function formBrief(title, fields, sourceKeys = ["part3", "act"]) {
  return {
    title,
    fields,
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

function sourceCandidateLines(keys) {
  const selected = keys.length ? keys : ["regulation"];
  return selected.map((key) => `- Source candidate: ${sourceLinks[key] || sourceLinks.regulation}`).join("\n");
}

function quizQuestions(topicItem) {
  const topic = topicItem.title;
  const lowerTopic = topic.toLowerCase();
  const hazardA = topicItem.hazards[0].toLowerCase();
  const hazardB = topicItem.hazards[1].toLowerCase();
  const hazardC = topicItem.hazards[2].toLowerCase();
  const sourceName = sourceLabel(topicItem.sourceKeys[0]);
  return [
    [
      `For ${lowerTopic}, what should be confirmed before work starts?`,
      `The task, location, affected workers, supervisor, and controls for ${hazardA}.`,
      "Only the planned production target for the shift.",
      "That another crew used the area safely yesterday.",
      "That paperwork can be completed after the task.",
    ],
    [
      `Which condition is a stop-work trigger for ${lowerTopic}?`,
      `${capitalize(hazardB)} is present and the planned control is missing, damaged, or unclear.`,
      "The crew finishes orientation early.",
      "The task is familiar to experienced workers.",
      "The supervisor is in a meeting but can be called later.",
    ],
    [
      `What should a worker do if the ${lowerTopic} control is unclear?`,
      "Stop and ask the supervisor before starting or continuing the task.",
      "Continue slowly and watch what other trades do.",
      "Wait until the end of shift to mention it.",
      "Choose any available PPE and keep working.",
    ],
    [
      `Which field evidence is most useful for ${lowerTopic} follow-up?`,
      "The inspection result, assigned corrective action, responsible person, due date, and closeout proof.",
      "A verbal promise that the issue is probably fixed.",
      "A photo with no location, date, or assigned action.",
      "No record because the hazard was corrected quickly.",
    ],
    [
      `Which source should be checked first before treating a ${lowerTopic} statement as a BC legal requirement?`,
      `${sourceName}, then related WorkSafeBC guidance or Workers Compensation Act provisions where relevant.`,
      "A private manual from another province with no BC source link.",
      "A supplier advertisement or product brochure by itself.",
      "A social media post from another jobsite.",
    ],
    [
      `What needs review before assigning workers to ${lowerTopic} work?`,
      "Current source requirements, task instruction, competency, direct supervision needs, and site-specific procedure.",
      "Only whether the worker is available today.",
      "Only whether the work was completed on a previous project.",
      "Only whether the worker brought basic PPE.",
    ],
    [
      `How should nearby workers or public areas be handled during ${lowerTopic} work?`,
      `Identify who could be exposed to ${hazardC} and set barriers, communication, scheduling, or access controls before work starts.`,
      "Assume people will stay away if the task looks risky.",
      "Warn nearby workers only after the work has started.",
      "Rely on one sign without checking the actual work area.",
    ],
    [
      `When should the ${lowerTopic} procedure or checklist be updated?`,
      "When site conditions, tools, crew, sequence, weather, adjacent work, or source requirements change.",
      "Only once each calendar year regardless of task changes.",
      "Only after an injury has already occurred.",
      "Never after the first reviewed version is printed.",
    ],
    [
      `How should best practice be labelled in ${lowerTopic} material?`,
      "Clearly separate best practice, sample procedure, field checklist, and legal requirement wording.",
      "Label all advice as law to make workers take it seriously.",
      "Hide best practice inside the checklist without review.",
      "Remove source notes once the content sounds practical.",
    ],
    [
      `What does "needs source review" mean on this ${lowerTopic} quiz?`,
      "A qualified reviewer still has to verify current WorkSafeBC/OHS sources before it is used as mandatory training.",
      "The quiz is official proof of competency.",
      "No further review is needed because the answers are visible.",
      "The employer can ignore site-specific conditions.",
    ],
  ];
}

function sourceLabel(key) {
  const labels = {
    regulation: "the current WorkSafeBC OHS Regulation",
    guidelines: "the current WorkSafeBC OHS Guidelines",
    act: "the Workers Compensation Act OHS provisions",
    bccsa: "relevant BCCSA material",
  };
  if (labels[key]) return labels[key];
  if (key?.startsWith("part")) return `WorkSafeBC OHS Regulation ${key.replace("part", "Part ")}`;
  return "the current WorkSafeBC/OHS source";
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
  const brief = toolboxTalkBriefs[index] || toolboxTalkBriefs.find((item) => item.title === title);
  return `# ${brief.title}

Duration: 5 to 10 minutes
Audience: Construction workers and supervisors
Topic area: ${brief.topicArea}
Review status: Needs human safety/source review

## Key message

${brief.keyMessage}

## Discussion points

${mdList(brief.discussionPoints)}

## Questions for crew

${mdList(brief.questionsForCrew)}

## Supervisor demonstration

${brief.supervisorDemo}

## Sign-off prompt

${brief.signOffPrompt}

## Source/review note

${sourceCandidateLines(brief.sourceKeys)}
- ${reviewPhrase}
- This talk is a practical draft, not official policy or legal advice.
`;
}

function checklist(title) {
  const brief = checklistBriefs.find((item) => item.title === title);
  return `# ${brief.title} Checklist

Status: Draft field checklist
Jurisdiction: British Columbia, Canada
Review status: Needs human safety/source review

## Use

${brief.use} It does not replace WorkSafeBC requirements, manufacturer instructions, engineered documents, or site-specific procedures.

## Checklist

${mdChecklist(brief.items)}

## Notes / deficiencies

- 
- 
- 

## Sources / review needed

${sourceCandidateLines(brief.sourceKeys)}
- ${reviewPhrase}
- Verify this checklist against the current WorkSafeBC OHS Regulation and any applicable guideline before using it as a required inspection record.
`;
}

function formTemplate(title) {
  const brief = formBriefs.find((item) => item.title === title);
  return `# ${brief.title} Form Template

Status: Draft form template
Review status: Needs human safety/source review

## Form fields

${mdList(brief.fields.map((field) => `${field}:`))}

## Privacy and sensitivity note

Do not record unnecessary medical details, private personal information, direct contact/payment identifiers, or speculation. Keep only the information needed for safety follow-up, reporting, and corrective action.

## Source/review note

${sourceCandidateLines(brief.sourceKeys)}
- ${reviewPhrase}
- Confirm legal reporting, investigation, privacy, and retention requirements before using this as an official company form.
`;
}

function quiz(topicItem) {
  const questions = quizQuestions(topicItem);

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
