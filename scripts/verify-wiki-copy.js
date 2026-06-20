import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const articleDir = join(root, "content/articles");

const bannedPatterns = [
  {
    label: "robot topic intro",
    pattern: /is a BC construction safety topic for/i,
  },
  {
    label: "robot audience intro",
    pattern: /It helps supervisors, CSOs, employers, prime contractors, and workers understand/i,
  },
  {
    label: "self-referential wiki phrasing",
    pattern: /so readers can move through the topic the way they would in a practical wiki/i,
  },
  {
    label: "robot hazard transition",
    pattern: /On a real site, those hazards rarely stand alone/i,
  },
  {
    label: "robot source disclaimer",
    pattern: /Treat this page as a source-cited draft/i,
  },
  {
    label: "robot applicability sentence",
    pattern: /The work involves .+ on a BC construction site/i,
  },
  {
    label: "robot pre-job link sentence",
    pattern: /Start with a short pre-job review that links this topic to/i,
  },
  {
    label: "robot article instruction",
    pattern: /Review this article with/i,
  },
  {
    label: "robot follow-up sentence",
    pattern: /Follow-up is linked to/i,
  },
  {
    label: "robot related-topic ending",
    pattern: /or another related article when the issue is broader than this task/i,
  },
  {
    label: "robot responsibility phrase",
    pattern: /Make the responsible supervisor, competent person, or qualified person explicit/i,
  },
  {
    label: "robot field-version phrase",
    pattern: /Keep the field version concise enough/i,
  },
  {
    label: "generic document reason",
    pattern: /shows how the site chose and communicated the control/i,
  },
  {
    label: "generic document reason",
    pattern: /records who checked the condition before work started/i,
  },
  {
    label: "generic document reason",
    pattern: /keeps the article tied back to official source requirements/i,
  },
];

const entries = await readdir(articleDir, { withFileTypes: true });
const articleFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name.toLowerCase() !== "readme.md")
  .map((entry) => entry.name)
  .sort();

const errors = [];

for (const filename of articleFiles) {
  const content = await readFile(join(articleDir, filename), "utf8");
  const lines = content.split("\n");

  for (const [index, line] of lines.entries()) {
    for (const { label, pattern } of bannedPatterns) {
      if (pattern.test(line)) {
        errors.push(`${filename}:${index + 1}: ${label}: ${line.trim()}`);
      }
    }
  }
}

if (errors.length) {
  console.error("Wiki copy verification failed:");
  for (const error of errors.slice(0, 80)) console.error(`- ${error}`);
  if (errors.length > 80) console.error(`...and ${errors.length - 80} more`);
  process.exit(1);
}

console.log(`Wiki copy verification passed for ${articleFiles.length} articles.`);
