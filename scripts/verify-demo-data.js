import { demoScenarios, riskMapRecords, siteScanSamples } from "../src/demoScenarios.js";
import { safetyPacks } from "../src/safetyPacks.js";

const errors = [];
const packIds = new Set(safetyPacks.map((pack) => pack.id));
const siteScanIds = new Set(siteScanSamples.map((sample) => sample.id));

if (!demoScenarios.length) errors.push("No demo scenarios defined.");
if (!siteScanSamples.length) errors.push("No site scan samples defined.");
if (!riskMapRecords.length) errors.push("No risk map records defined.");

requireUnique("demo scenario id", demoScenarios.map((scenario) => scenario.id));
requireUnique("site scan sample id", siteScanSamples.map((sample) => sample.id));
requireUnique("risk map record id", riskMapRecords.map((record) => record.id));

for (const scenario of demoScenarios) {
  requireField(scenario, "id");
  requireField(scenario, "title");
  requireField(scenario, "input");
  requirePack(scenario.packId, `${scenario.id}: packId`);
  if (!siteScanIds.has(scenario.siteScanId)) {
    errors.push(`${scenario.id}: unknown siteScanId "${scenario.siteScanId}"`);
  }
  if (!scenario.presenterNotes?.length) errors.push(`${scenario.id}: missing presenter notes`);
}

for (const sample of siteScanSamples) {
  requireField(sample, "id");
  requireField(sample, "title");
  requireField(sample, "location");
  requirePack(sample.packId, `${sample.id}: packId`);
  if (!sample.simulatedDetections?.length) {
    errors.push(`${sample.id}: missing simulated detections`);
  }

  for (const detection of sample.simulatedDetections || []) {
    requireField(detection, "id", `${sample.id} detection`);
    requireField(detection, "label", `${sample.id} detection ${detection.id}`);
    requirePack(detection.packId, `${sample.id}/${detection.id}: packId`);
    if (!["Low", "Medium", "High", "Critical"].includes(detection.severity)) {
      errors.push(`${sample.id}/${detection.id}: invalid severity "${detection.severity}"`);
    }
    if (!Number.isFinite(detection.x) || !Number.isFinite(detection.y)) {
      errors.push(`${sample.id}/${detection.id}: detection needs x/y coordinates`);
    }
  }
}

for (const record of riskMapRecords) {
  requireField(record, "id");
  requireField(record, "area");
  requireField(record, "trade");
  requireField(record, "hazard");
  requireField(record, "urgency");
  requireField(record, "summary");
  requirePack(record.packId, `${record.id}: packId`);
}

if (errors.length) {
  console.error("Demo data verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Demo data verification passed:");
console.log(`- ${demoScenarios.length} demo scenarios`);
console.log(`- ${siteScanSamples.length} site scan samples`);
console.log(`- ${riskMapRecords.length} risk map records`);

function requireField(item, field, label = item.id || "unknown item") {
  if (!String(item[field] || "").trim()) {
    errors.push(`${label}: missing ${field}`);
  }
}

function requirePack(id, label) {
  if (!packIds.has(id)) {
    errors.push(`${label}: unknown pack "${id}"`);
  }
}

function requireUnique(label, values) {
  const seen = new Set();

  for (const value of values) {
    if (seen.has(value)) errors.push(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}
