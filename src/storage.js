import { STORAGE_KEY, sampleData } from "./data.js";

const cloneSampleData = () => JSON.parse(JSON.stringify(sampleData));

// One localStorage document keeps the app easy to back up, reset, and migrate later.
export function loadSafetyData() {
  if (typeof window === "undefined") return cloneSampleData();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSampleData();

    const parsed = JSON.parse(raw);
    return {
      deficiencies: Array.isArray(parsed.deficiencies)
        ? parsed.deficiencies
        : cloneSampleData().deficiencies,
      trainingRecords: Array.isArray(parsed.trainingRecords)
        ? parsed.trainingRecords
        : cloneSampleData().trainingRecords,
      highRiskDocs: Array.isArray(parsed.highRiskDocs)
        ? parsed.highRiskDocs
        : cloneSampleData().highRiskDocs,
    };
  } catch {
    return cloneSampleData();
  }
}

export function saveSafetyData(data) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetSafetyData() {
  const fresh = cloneSampleData();
  saveSafetyData(fresh);
  return fresh;
}
