import { wikiArticles } from "../src/wikiContent.js";

const errors = [];
const articleMap = new Map(wikiArticles.map((article) => [article.slug, article]));

for (const article of wikiArticles) {
  const outbound = article.outboundArticleLinks || [];
  const backlinks = article.backlinks || [];

  if (outbound.length < 8) {
    errors.push(`${article.slug}: expected at least 8 outbound article links; found ${outbound.length}`);
  }

  if (!backlinks.length) {
    errors.push(`${article.slug}: expected at least 1 inbound backlink; found 0`);
  }

  for (const linkedSlug of outbound) {
    if (!articleMap.has(linkedSlug)) {
      errors.push(`${article.slug}: outbound link "${linkedSlug}" does not resolve to an article`);
    }
  }

  for (const backlink of backlinks) {
    if (!articleMap.has(backlink.slug)) {
      errors.push(`${article.slug}: backlink "${backlink.slug}" does not resolve to an article`);
    }
  }
}

if (errors.length) {
  console.error("Wiki link verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Wiki link verification passed for ${wikiArticles.length} articles.`);
