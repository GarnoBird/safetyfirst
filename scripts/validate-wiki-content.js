import {
  articleRoadmap,
  regulationRefs,
  wikiArticles,
  wikiSources,
} from "../src/wikiContent.js";

const errors = [];
const sourceIds = new Set(wikiSources.map((source) => source.id));
const regulationIds = new Set(regulationRefs.map((ref) => ref.id));
const articleSlugs = new Set();
const roadmapSlugs = new Set(articleRoadmap.map((item) => item.slug));

for (const article of wikiArticles) {
  if (articleSlugs.has(article.slug)) {
    errors.push(`Duplicate article slug: ${article.slug}`);
  }
  articleSlugs.add(article.slug);

  if (!article.title || !article.summary) {
    errors.push(`${article.slug}: missing title or summary`);
  }

  if (!article.sourceIds?.length && !article.regulationRefs?.length) {
    errors.push(`${article.slug}: missing official source or regulation reference`);
  }

  for (const sourceId of article.sourceIds || []) {
    if (!sourceIds.has(sourceId)) {
      errors.push(`${article.slug}: unknown source id "${sourceId}"`);
    }
  }

  for (const refId of article.regulationRefs || []) {
    if (!regulationIds.has(refId)) {
      errors.push(`${article.slug}: unknown regulation reference "${refId}"`);
    }
  }

  for (const relatedSlug of article.related || []) {
    if (!articleSlugs.has(relatedSlug) && !roadmapSlugs.has(relatedSlug)) {
      errors.push(`${article.slug}: related topic "${relatedSlug}" is not an article or roadmap topic`);
    }
  }

  for (const [section, items] of Object.entries(article.sections || {})) {
    if (!Array.isArray(items) || items.length === 0) {
      errors.push(`${article.slug}: empty section "${section}"`);
    }
  }

  if (!article.review?.lastReviewed || !article.review?.nextReview) {
    errors.push(`${article.slug}: missing review dates`);
  }
}

if (wikiArticles.length < 25) {
  errors.push(`MVP requires at least 25 articles; found ${wikiArticles.length}`);
}

if (errors.length) {
  console.error("Wiki content validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Wiki content validation passed for ${wikiArticles.length} articles.`);
