import { useEffect, useMemo, useState } from "react";
import {
  articleRoadmap,
  articleTemplate,
  buildPhases,
  codexExecutionTasks,
  contentStructure,
  contentCreationPipeline,
  databaseSchema,
  getArticleDraftBlockers,
  getArticleReviewChecklist,
  getArticleBySlug,
  getCitationById,
  getRedirectTarget,
  getRegulationById,
  getRoadmapByPhase,
  getSearchSuggestion,
  getSourceNoteById,
  getSourceNotesForArticle,
  getSourceById,
  getWikiFilterOptions,
  getWikiQualityMetric,
  getWikiReviewPackBySlug,
  getWikiReviewerQueues,
  getWikiReviewBacklog,
  governanceModel,
  glossaryTerms,
  linkingModel,
  productStrategy,
  reviewChecklistTemplates,
  reviewQueueDefinitions,
  reviewerChecklist,
  searchWiki,
  searchStrategy,
  sourceHierarchy,
  synonymIndex,
  technicalRecommendation,
  wikiRedirects,
  wikiArticles,
  wikiCategories,
  wikiQualityMetrics,
  wikiReviewPacks,
  wikiSourceCoverage,
  wikiSourceNotes,
  wikiSources,
} from "./wikiContent.js";

const WIKI_NAV = [
  { label: "Main page", path: "/wiki" },
  { label: "Article index", path: "/wiki/articles" },
  { label: "Categories", path: "/wiki/categories" },
  { label: "Sources", path: "/wiki/sources" },
  { label: "Source notes", path: "/wiki/source-notes" },
  { label: "Glossary", path: "/wiki/glossary" },
  { label: "Redirects", path: "/wiki/redirects" },
  { label: "Article quality", path: "/wiki/quality" },
  { label: "Review packs", path: "/wiki/review-packs" },
  { label: "Roadmap", path: "/wiki/roadmap" },
  { label: "Review backlog", path: "/wiki/review-backlog" },
  { label: "Reviewer", path: "/wiki/reviewer" },
  { label: "Governance", path: "/wiki/governance" },
  { label: "Technical plan", path: "/wiki/technical" },
];

export default function WikiApp({ routePath, navigateTo }) {
  const normalizedPath = routePath.replace(/\/$/, "") || "/wiki";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(getInitialSearch());
  const [activeSearch, setActiveSearch] = useState(getInitialSearch());
  const [filters, setFilters] = useState(getInitialFilters());
  const navigateWithinWiki = (path) => {
    if (!path.includes("?")) {
      setActiveSearch("");
      setSearchValue("");
      setFilters(emptyFilters());
    }
    navigateTo(path);
  };

  useEffect(() => {
    if (normalizedPath.startsWith("/wiki/articles/")) {
      const slug = normalizedPath.replace("/wiki/articles/", "");
      const redirectTarget = getRedirectTarget(slug);
      const article = getArticleBySlug(slug) || (redirectTarget ? getArticleBySlug(redirectTarget) : null);
      document.title = article
        ? `${article.title} - BC Construction Safety Wiki`
        : "BC Construction Safety Wiki";
      return;
    }

    document.title = "BC Construction Safety Wiki";
  }, [normalizedPath]);

  const page = useMemo(() => {
    if (normalizedPath === "/wiki" || normalizedPath === "/wiki/main") {
      return (
        <WikiHome
          query={activeSearch}
          filters={filters}
          setFilters={setFilters}
          navigateTo={navigateWithinWiki}
        />
      );
    }

    if (normalizedPath === "/wiki/articles") {
      return <ArticleIndex navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath.startsWith("/wiki/articles/")) {
      const slug = normalizedPath.replace("/wiki/articles/", "");
      return <ArticlePage slug={slug} navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath === "/wiki/categories") {
      return <CategoriesPage navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath.startsWith("/wiki/categories/")) {
      const categoryId = normalizedPath.replace("/wiki/categories/", "");
      return <CategoryPage categoryId={categoryId} navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath === "/wiki/sources") {
      return <SourcesPage />;
    }

    if (normalizedPath === "/wiki/source-notes") {
      return <SourceNotesPage navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath.startsWith("/wiki/source-notes/")) {
      const id = normalizedPath.replace("/wiki/source-notes/", "");
      return <SourceNotePage id={id} navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath === "/wiki/glossary") {
      return <GlossaryPage navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath.startsWith("/wiki/glossary/")) {
      const slug = normalizedPath.replace("/wiki/glossary/", "");
      return <GlossaryTermPage slug={slug} navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath === "/wiki/redirects") {
      return <RedirectsPage navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath === "/wiki/quality") {
      return <ArticleQualityPage navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath === "/wiki/review-packs") {
      return <ReviewPacksPage navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath.startsWith("/wiki/review-packs/")) {
      const slug = normalizedPath.replace("/wiki/review-packs/", "");
      return <ReviewPackPage slug={slug} navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath === "/wiki/roadmap") {
      return <RoadmapPage />;
    }

    if (normalizedPath === "/wiki/review-backlog") {
      return <ReviewBacklogPage navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath === "/wiki/reviewer") {
      return <ReviewerPage navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath === "/wiki/governance") {
      return <GovernancePage />;
    }

    if (normalizedPath === "/wiki/technical") {
      return <TechnicalPage />;
    }

    return <NotFoundPage path={normalizedPath} />;
  }, [activeSearch, filters, navigateWithinWiki, normalizedPath]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchValue.trim();
    setActiveSearch(query);
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    const queryString = params.toString();
    navigateTo(queryString ? `/wiki?${queryString}` : "/wiki");
  };

  return (
    <div className="wiki-root">
      <header className="wiki-masthead">
        <button
          className="wiki-menu-button"
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
        >
          Contents
        </button>
        <a className="wiki-wordmark" href="/wiki" onClick={makeNavigate(navigateWithinWiki, "/wiki")}>
          <span>BC Construction Safety Wiki</span>
          <small>Free public safety knowledge base</small>
        </a>
        <form className="wiki-search" onSubmit={handleSearchSubmit} role="search">
          <input
            aria-label="Search BC Construction Safety Wiki"
            placeholder="Search the wiki"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </header>

      <div className="wiki-page">
        <aside className={menuOpen ? "wiki-sidebar open" : "wiki-sidebar"}>
          <nav aria-label="Wiki navigation">
            <h2>Navigation</h2>
            <ul>
              {WIKI_NAV.map((item) => (
                <li key={item.path}>
                  <a href={item.path} onClick={makeNavigate(navigateWithinWiki, item.path)}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Wiki categories">
            <h2>Categories</h2>
            <ul>
              {wikiCategories.map((category) => (
                <li key={category.id}>
                  <a
                    href={`/wiki/categories/${category.id}`}
                    onClick={makeNavigate(navigateWithinWiki, `/wiki/categories/${category.id}`)}
                  >
                    {category.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main className="wiki-main">{page}</main>
      </div>
    </div>
  );
}

function WikiHome({ query, filters, setFilters, navigateTo }) {
  const results = searchWiki(query, filters);
  const suggestion = query ? getSearchSuggestion(query) : null;
  const featured = ["fall-protection", "silica-exposure-control", "cardiac-arrest-on-site"]
    .map(getArticleBySlug)
    .filter(Boolean);

  return (
    <article className="wiki-article">
      <PageTitle title="BC Construction Safety Wiki" subtitle="From BC Construction Safety Wiki" />
      <div className="wiki-notice">
        This is a BC-first construction safety reference. It separates legal requirements,
        best practices, sample procedures, and field checklists. It is not legal advice.
      </div>

      {query ? (
        <section className="wiki-section">
          <h2>Search results for "{query}"</h2>
          {suggestion ? (
            <p className="wiki-small">
              Did you mean{" "}
              <a
                href={`/wiki/articles/${suggestion.article.slug}`}
                onClick={makeNavigate(navigateTo, `/wiki/articles/${suggestion.article.slug}`)}
              >
                {suggestion.article.title}
              </a>
              ? Matched worker term "{suggestion.term}".
            </p>
          ) : null}
          <ArticleList articles={results} empty="No matching articles found." />
        </section>
      ) : null}

      <SearchFilters filters={filters} setFilters={setFilters} />

      <section className="wiki-section">
        <h2>Product concept</h2>
        <p>{productStrategy.whatItIs}</p>
        <div className="wiki-columns">
          <WikiList title="Who it is for" items={productStrategy.whoItIsFor} />
          <WikiList title="Problems it solves" items={productStrategy.problemsSolved} />
          <WikiList title="What it must not become" items={productStrategy.mustNotBecome} />
        </div>
      </section>

      <section className="wiki-section">
        <h2>Featured articles</h2>
        <ArticleList articles={featured} navigateTo={navigateTo} />
      </section>

      <section className="wiki-section">
        <h2>Category structure</h2>
        <div className="wiki-category-grid">
          {wikiCategories.map((category) => (
            <section className="wiki-category-box" id={category.id} key={category.id}>
              <h3>{category.title}</h3>
              <p>{category.description}</p>
              <ul>
                {category.topics.slice(0, 9).map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
              <p className="wiki-more">
                <a
                  href={`/wiki/categories/${category.id}`}
                  onClick={makeNavigate(navigateTo, `/wiki/categories/${category.id}`)}
                >
                  View category page
                </a>
              </p>
            </section>
          ))}
        </div>
      </section>

      <section className="wiki-section">
        <h2>Browse all draft articles</h2>
        <p>
          The current wiki includes {wikiArticles.length} source-cited draft article pages with
          worker-language search terms, related topic links, checklists, review status, and
          official source notes.
        </p>
        <ArticleList articles={wikiArticles} compact navigateTo={navigateTo} />
        <p className="wiki-more">
          <a href="/wiki/roadmap" onClick={makeNavigate(navigateTo, "/wiki/roadmap")}>
            View the 100-article review roadmap
          </a>
        </p>
      </section>
    </article>
  );
}

function ArticlePage({ slug, navigateTo }) {
  const directArticle = getArticleBySlug(slug);
  const redirectTarget = !directArticle ? getRedirectTarget(slug) : null;
  const article = directArticle || (redirectTarget ? getArticleBySlug(redirectTarget) : null);

  if (!article) {
    return <NotFoundPage path={`/wiki/articles/${slug}`} />;
  }

  const redirectedFrom = directArticle ? "" : slug;
  const relatedFieldTools = [
    ...(article.relatedToolboxTalks || []),
    ...(article.relatedChecklists || []),
    ...(article.relatedQuizzes || []),
    ...(article.relatedForms || []),
  ];
  const sourceNotes = getSourceNotesForArticle(article.slug);
  const qualityMetric = getWikiQualityMetric(article.slug);
  const draftBlockers = getArticleDraftBlockers(article);
  const reviewPack = getWikiReviewPackBySlug(article.slug);
  const sectionHeadings = [
    "Summary",
    "Review status",
    "Why this is still Draft",
    ...(reviewPack ? ["Review pack"] : []),
    "When this applies",
    "Legal requirements",
    "Best practice",
    "Required documents",
    "Step-by-step safe procedure",
    "Worker checklist",
    "Supervisor checklist",
    "Common mistakes",
    "Related topics",
    "Related field tools",
    "Pages that link here",
    "Official sources",
    "Official citations",
    "Source notes",
    "Article quality",
    "Reviewer notes",
    "Report an issue with this article",
    "Version history",
    "Disclaimer",
  ];

  return (
    <article className="wiki-article">
      <PageTitle title={article.title} subtitle="From BC Construction Safety Wiki" />
      <div className="wiki-article-meta">
        <span>{article.jurisdiction}</span>
        <span>{article.status}</span>
        <span>{article.maturity || "Draft"}</span>
        <span>{article.reviewTier || "Tier 3"}</span>
        <span>{article.confidenceLevel}</span>
        <span>Last reviewed {article.review.lastReviewed}</span>
      </div>

      {redirectedFrom ? (
        <div className="wiki-notice wiki-redirect-notice">
          Redirected from <b>{redirectedFrom}</b>. This worker-language term points to{" "}
          <b>{article.title}</b>.
        </div>
      ) : null}

      <TableOfContents items={sectionHeadings} />

      <section className="wiki-section" id="summary">
        <h2>Summary</h2>
        {(article.summaryParagraphs?.length ? article.summaryParagraphs : [article.summary]).map((paragraph) => (
          <p key={paragraph}>
            <RichText text={paragraph} navigateTo={navigateTo} />
          </p>
        ))}
        {article.aliases.length ? (
          <p className="wiki-small">
            <b>Also searched as:</b> {article.aliases.join(", ")}
          </p>
        ) : null}
      </section>

      <ReviewBox article={article} />
      <DraftBlockersSection article={article} blockers={draftBlockers} />
      {reviewPack ? <ReviewPackCallout pack={reviewPack} navigateTo={navigateTo} /> : null}

      <ArticleSection title="When this applies" items={article.sections.whenApplies} navigateTo={navigateTo} />
      <ArticleSection
        title="Legal requirements"
        items={article.sections.legalRequirements}
        navigateTo={navigateTo}
        ordered
      />
      <ArticleSection title="Best practice" items={article.sections.bestPractice} navigateTo={navigateTo} />
      <ArticleSection title="Required documents" items={article.sections.requiredDocuments} navigateTo={navigateTo} />
      <ArticleSection
        title="Step-by-step safe procedure"
        items={article.sections.procedure}
        navigateTo={navigateTo}
        ordered
      />
      <ChecklistSection title="Worker checklist" items={article.sections.workerChecklist} navigateTo={navigateTo} />
      <ChecklistSection title="Supervisor checklist" items={article.sections.supervisorChecklist} navigateTo={navigateTo} />
      <ArticleSection title="Common mistakes" items={article.sections.commonMistakes} navigateTo={navigateTo} />

      <section className="wiki-section" id="related-topics">
        <h2>Related topics</h2>
        <ul>
          {article.related.map((relatedSlug) => {
            const related = getArticleBySlug(relatedSlug);
            return (
              <li key={relatedSlug}>
                {related ? (
                  <a
                    href={`/wiki/articles/${related.slug}`}
                    onClick={makeNavigate(navigateTo, `/wiki/articles/${related.slug}`)}
                  >
                    {related.title}
                  </a>
                ) : (
                  relatedSlug
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {relatedFieldTools.length ? (
        <RelatedFieldTools article={article} navigateTo={navigateTo} />
      ) : null}

      {article.backlinks?.length ? (
        <section className="wiki-section" id="pages-that-link-here">
          <h2>Pages that link here</h2>
          <ul>
            {article.backlinks.map((backlink) => (
              <li key={backlink.slug}>
                <a
                  href={`/wiki/articles/${backlink.slug}`}
                  onClick={makeNavigate(navigateTo, `/wiki/articles/${backlink.slug}`)}
                >
                  {backlink.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="wiki-section" id="official-sources">
        <h2>Official sources</h2>
        <ul>
          {article.regulationRefs.map((refId) => {
            const ref = getRegulationById(refId);
            return ref ? (
              <li key={ref.id}>
                <a href={ref.url} target="_blank" rel="noreferrer">
                  {ref.instrument} {ref.part}: {ref.title}
                </a>
              </li>
            ) : null;
          })}
          {article.sourceIds.map((sourceId) => {
            const source = getSourceById(sourceId);
            return source ? (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>{" "}
                <span className="wiki-small">({source.publisher})</span>
              </li>
            ) : null;
          })}
        </ul>
      </section>

      {article.citations?.length ? (
        <section className="wiki-section" id="official-citations">
          <h2>Official citations</h2>
          <ul>
            {article.citations.map((citation) => (
              <li key={citation.id}>
                {citation.url ? (
                  <a href={citation.url} target="_blank" rel="noreferrer">
                    {citation.title}
                  </a>
                ) : (
                  citation.title
                )}{" "}
                <span className="wiki-small">
                  {citation.publisher}
                  {citation.locator ? ` - ${citation.locator}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sourceNotes.length ? (
        <SourceNotesSection sourceNotes={sourceNotes} navigateTo={navigateTo} />
      ) : null}

      <ArticleQualitySection article={article} qualityMetric={qualityMetric} />

      {article.reviewerNotes?.length ? (
        <ArticleSection title="Reviewer notes" items={article.reviewerNotes} navigateTo={navigateTo} />
      ) : null}

      <CorrectionForm article={article} />

      <section className="wiki-section" id="version-history">
        <h2>Version history</h2>
        <table className="wiki-table">
          <tbody>
            <tr>
              <th>Last reviewed</th>
              <td>{article.review.lastReviewed}</td>
            </tr>
            <tr>
              <th>Next review</th>
              <td>{article.review.nextReview}</td>
            </tr>
            <tr>
              <th>Legal/source review</th>
              <td>{article.review.legalReviewStatus}</td>
            </tr>
            <tr>
              <th>Safety review</th>
              <td>{article.review.safetyReviewStatus}</td>
            </tr>
            {(article.versionHistory?.length ? article.versionHistory : ["0.1 source-cited draft"]).map(
              (entry, index) => (
                <tr key={`${entry}-${index}`}>
                  <th>{index === 0 ? "Version notes" : ""}</th>
                  <td>{entry}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </section>

      <section className="wiki-section" id="disclaimer">
        <h2>Disclaimer</h2>
        <p>
          Plain-language safety information for BC construction. Not legal advice,
          medical advice, engineering advice, or a substitute for official sources,
          qualified professionals, manufacturer instructions, or site-specific procedures.
        </p>
      </section>

      <button className="wiki-print-button" type="button" onClick={() => window.print()}>
        Print checklist
      </button>
    </article>
  );
}

function ArticleIndex({ navigateTo }) {
  const grouped = groupBy(wikiArticles, "category");

  return (
    <article className="wiki-article">
      <PageTitle title="Article index" subtitle="Source-cited MVP articles" />
      {Object.entries(grouped).map(([category, articles]) => (
        <section className="wiki-section" key={category}>
          <h2>{category}</h2>
          <ArticleList articles={articles} navigateTo={navigateTo} />
        </section>
      ))}
    </article>
  );
}

function CategoriesPage({ navigateTo }) {
  return (
    <article className="wiki-article">
      <PageTitle title="Categories" subtitle="Information architecture" />
      {wikiCategories.map((category) => (
        <section className="wiki-section" id={category.id} key={category.id}>
          <h2>
            <a
              href={`/wiki/categories/${category.id}`}
              onClick={makeNavigate(navigateTo, `/wiki/categories/${category.id}`)}
            >
              {category.title}
            </a>
          </h2>
          <p>{category.description}</p>
          <ul className="wiki-columns-list">
            {category.topics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}

function CategoryPage({ categoryId, navigateTo }) {
  const category = wikiCategories.find((item) => item.id === categoryId);
  if (!category) return <NotFoundPage path={`/wiki/categories/${categoryId}`} />;

  const articles = wikiArticles.filter((article) => article.category === category.title);

  return (
    <article className="wiki-article">
      <PageTitle title={`Category: ${category.title}`} subtitle="BC Construction Safety Wiki category page" />
      <section className="wiki-section">
        <h2>About this category</h2>
        <p>{category.description}</p>
      </section>
      <section className="wiki-section">
        <h2>Key topics</h2>
        <ul className="wiki-columns-list">
          {category.topics.map((topic) => {
            const article = articleByTitle(topic);
            return (
              <li key={topic}>
                {article ? (
                  <a
                    href={`/wiki/articles/${article.slug}`}
                    onClick={makeNavigate(navigateTo, `/wiki/articles/${article.slug}`)}
                  >
                    {article.title}
                  </a>
                ) : (
                  topic
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="wiki-section">
        <h2>Pages in this category</h2>
        <ArticleList articles={articles} navigateTo={navigateTo} />
      </section>
    </article>
  );
}

function SourcesPage() {
  return (
    <article className="wiki-article">
      <PageTitle title="Sources" subtitle="Source hierarchy and official references" />
      <section className="wiki-section">
        <h2>Primary source hierarchy</h2>
        <ol>
          {sourceHierarchy.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ol>
      </section>
      <section className="wiki-section">
        <h2>Source registry</h2>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Priority</th>
              <th>Source</th>
              <th>Type</th>
              <th>Use</th>
            </tr>
          </thead>
          <tbody>
            {wikiSources.map((source) => (
              <tr key={source.id}>
                <td>{source.priority}</td>
                <td>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                  <br />
                  <span className="wiki-small">{source.publisher}</span>
                </td>
                <td>{source.type}</td>
                <td>{source.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}

function SourceNotesPage({ navigateTo }) {
  return (
    <article className="wiki-article">
      <PageTitle title="Source notes" subtitle="Paraphrased review notes for official and supporting sources" />
      <section className="wiki-section">
        <h2>Coverage summary</h2>
        <ul className="wiki-inline-list">
          <li>
            <b>Articles</b>: {wikiSourceCoverage.articleCount}
          </li>
          <li>
            <b>Source notes</b>: {wikiSourceCoverage.sourceNoteCount}
          </li>
          <li>
            <b>Articles with source notes</b>: {wikiSourceCoverage.articlesWithSourceNotes}
          </li>
          <li>
            <b>Open source-review articles</b>: {wikiSourceCoverage.unresolvedSourceReviewArticles.length}
          </li>
        </ul>
      </section>
      <section className="wiki-section">
        <h2>Source note index</h2>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Source note</th>
              <th>Type</th>
              <th>Last checked</th>
              <th>Related articles</th>
            </tr>
          </thead>
          <tbody>
            {wikiSourceNotes.map((note) => (
              <tr key={note.id}>
                <td>
                  <a
                    href={`/wiki/source-notes/${note.id}`}
                    onClick={makeNavigate(navigateTo, `/wiki/source-notes/${note.id}`)}
                  >
                    {note.title}
                  </a>
                  <br />
                  <span className="wiki-small">{note.publisher}</span>
                </td>
                <td>{note.sourceType}</td>
                <td>{note.lastChecked}</td>
                <td>{note.relatedArticles.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}

function SourceNotePage({ id, navigateTo }) {
  const note = getSourceNoteById(id);
  if (!note) return <NotFoundPage path={`/wiki/source-notes/${id}`} />;

  return (
    <article className="wiki-article">
      <PageTitle title={note.title} subtitle="Source note" />
      <section className="wiki-section">
        <h2>Source details</h2>
        <table className="wiki-table">
          <tbody>
            <tr>
              <th>Publisher</th>
              <td>{note.publisher}</td>
            </tr>
            <tr>
              <th>Type</th>
              <td>{note.sourceType}</td>
            </tr>
            <tr>
              <th>Jurisdiction</th>
              <td>{note.jurisdiction}</td>
            </tr>
            <tr>
              <th>Last checked</th>
              <td>{note.lastChecked}</td>
            </tr>
            <tr>
              <th>Official link</th>
              <td>
                <a href={note.url} target="_blank" rel="noreferrer">
                  {note.url}
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <section className="wiki-section">
        <h2>Plain-language review note</h2>
        <p>{note.summary}</p>
        <p className="wiki-small">
          Source notes support human review. They are not legal advice and do not replace the official source.
        </p>
      </section>
      <section className="wiki-section">
        <h2>Related articles</h2>
        <ArticleList
          articles={note.relatedArticles.map((slug) => getArticleBySlug(slug)).filter(Boolean)}
          compact
          navigateTo={navigateTo}
        />
      </section>
    </article>
  );
}

function RoadmapPage() {
  return (
    <article className="wiki-article">
      <PageTitle title="Roadmap" subtitle="100 deep draft articles moving through qualified review" />
      <section className="wiki-section">
        <h2>Current state</h2>
        <p>
          The roadmap now tracks review and completion work. All 100 planned articles have Markdown
          source files, generated wiki data, related-topic links, backlinks, checklists, and official
          citation tokens. They remain deep drafts until qualified BC safety/source reviewers confirm
          the exact legal references and field wording.
        </p>
      </section>
      <section className="wiki-section">
        <h2>Completion criteria</h2>
        <ul>
          <li>100 article pages pass depth, citation, link, backlink, and source validation.</li>
          <li>Every article has official sources, exact citation tokens, related topics, aliases, review dates, and checklists.</li>
          <li>Search works across worker-language terms such as tie off, silica dust, crane pick, and toolbox talk.</li>
          <li>Highest-risk articles receive qualified source/legal review before being treated as launch-ready.</li>
          <li>Correction process, disclaimer, and review badges are visible.</li>
          <li>Regulation and guideline changes trigger scheduled article review.</li>
        </ul>
      </section>
      <RoadmapTable title="First 25 articles" rows={getRoadmapByPhase("MVP 25")} />
      <RoadmapTable title="Batch 2 articles" rows={getRoadmapByPhase("Batch 2")} />
      <RoadmapTable title="Batch 3 articles" rows={getRoadmapByPhase("Batch 3")} />
      <RoadmapTable title="Batch 4 articles" rows={getRoadmapByPhase("Batch 4")} />
      <RoadmapTable title="Full 100-topic roadmap" rows={articleRoadmap} />
    </article>
  );
}

function GlossaryPage({ navigateTo }) {
  return (
    <article className="wiki-article">
      <PageTitle title="Glossary" subtitle="Worker-language terms and wiki meanings" />
      <section className="wiki-section">
        <h2>Glossary terms</h2>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Term</th>
              <th>Plain meaning</th>
              <th>Main article</th>
            </tr>
          </thead>
          <tbody>
            {glossaryTerms.map((term) => {
              const article = getArticleBySlug(term.targetArticle);
              return (
                <tr key={term.slug}>
                  <td>
                    <a
                      href={`/wiki/glossary/${term.slug}`}
                      onClick={makeNavigate(navigateTo, `/wiki/glossary/${term.slug}`)}
                    >
                      {term.term}
                    </a>
                  </td>
                  <td>{term.definition}</td>
                  <td>
                    {article ? (
                      <a
                        href={`/wiki/articles/${article.slug}`}
                        onClick={makeNavigate(navigateTo, `/wiki/articles/${article.slug}`)}
                      >
                        {article.title}
                      </a>
                    ) : (
                      term.targetArticle
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </article>
  );
}

function GlossaryTermPage({ slug, navigateTo }) {
  const term = glossaryTerms.find((item) => item.slug === slug);
  if (!term) return <NotFoundPage path={`/wiki/glossary/${slug}`} />;
  const article = getArticleBySlug(term.targetArticle);
  const relatedTerms = glossaryTerms
    .filter((item) => item.targetArticle === term.targetArticle && item.slug !== term.slug)
    .slice(0, 12);

  return (
    <article className="wiki-article">
      <PageTitle title={term.term} subtitle="Glossary term" />
      <section className="wiki-section">
        <h2>Plain meaning</h2>
        <p>{term.definition}</p>
      </section>
      <section className="wiki-section">
        <h2>Main article</h2>
        {article ? (
          <p>
            <a
              href={`/wiki/articles/${article.slug}`}
              onClick={makeNavigate(navigateTo, `/wiki/articles/${article.slug}`)}
            >
              {article.title}
            </a>
          </p>
        ) : (
          <p>{term.targetArticle}</p>
        )}
      </section>
      {relatedTerms.length ? (
        <section className="wiki-section">
          <h2>Related glossary terms</h2>
          <ul>
            {relatedTerms.map((item) => (
              <li key={item.slug}>
                <a
                  href={`/wiki/glossary/${item.slug}`}
                  onClick={makeNavigate(navigateTo, `/wiki/glossary/${item.slug}`)}
                >
                  {item.term}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function RedirectsPage({ navigateTo }) {
  return (
    <article className="wiki-article">
      <PageTitle title="Redirects" subtitle="Common worker terms that point to main articles" />
      <section className="wiki-section">
        <h2>Worker-language redirects</h2>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Search term</th>
              <th>Redirect page</th>
              <th>Target article</th>
            </tr>
          </thead>
          <tbody>
            {wikiRedirects.map((redirect) => {
              const target = getArticleBySlug(redirect.to);
              return (
                <tr key={redirect.from}>
                  <td>{redirect.term}</td>
                  <td>
                    <a
                      href={`/wiki/articles/${redirect.from}`}
                      onClick={makeNavigate(navigateTo, `/wiki/articles/${redirect.from}`)}
                    >
                      {redirect.from}
                    </a>
                  </td>
                  <td>
                    {target ? (
                      <a
                        href={`/wiki/articles/${target.slug}`}
                        onClick={makeNavigate(navigateTo, `/wiki/articles/${target.slug}`)}
                      >
                        {target.title}
                      </a>
                    ) : (
                      redirect.to
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </article>
  );
}

function ArticleQualityPage({ navigateTo }) {
  const rows = [...wikiQualityMetrics].sort(
    (a, b) => b.issues.length - a.issues.length || a.reviewTier.localeCompare(b.reviewTier) || a.title.localeCompare(b.title),
  );

  return (
    <article className="wiki-article">
      <PageTitle title="Article quality" subtitle="Generated completion metrics for maintainers" />
      <section className="wiki-section">
        <h2>Quality summary</h2>
        <ul className="wiki-inline-list">
          <li>
            <b>Articles</b>: {wikiArticles.length}
          </li>
          <li>
            <b>Tier 1 citation gaps</b>: {wikiSourceCoverage.weakTierOne.length}
          </li>
          <li>
            <b>Tier 2 citation gaps</b>: {wikiSourceCoverage.weakTierTwo.length}
          </li>
          <li>
            <b>Missing source notes</b>: {wikiSourceCoverage.articlesMissingSourceNotes.length}
          </li>
        </ul>
      </section>
      <section className="wiki-section">
        <h2>Article quality table</h2>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Tier</th>
              <th>Exact citations</th>
              <th>Source flags</th>
              <th>Links</th>
              <th>Tools</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((metric) => (
              <tr key={metric.slug}>
                <td>
                  <a
                    href={`/wiki/articles/${metric.slug}`}
                    onClick={makeNavigate(navigateTo, `/wiki/articles/${metric.slug}`)}
                  >
                    {metric.title}
                  </a>
                </td>
                <td>{metric.reviewTier}</td>
                <td>{metric.exactCitationCount}</td>
                <td>{metric.sourceReviewFlagCount}</td>
                <td>
                  {metric.outboundLinkCount} out / {metric.inboundLinkCount} in
                </td>
                <td>{metric.relatedToolCount}</td>
                <td>{metric.issues.length ? metric.issues.join("; ") : "No generated issues"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}

function ReviewerPage({ navigateTo }) {
  const queues = getWikiReviewerQueues();
  const [selectedQueue, setSelectedQueue] = useState("tier-1-source-review");
  const activeQueue = reviewQueueDefinitions.find((queue) => queue.id === selectedQueue) || reviewQueueDefinitions[0];
  const rows = queues[activeQueue.id] || [];

  return (
    <article className="wiki-article">
      <PageTitle title="Reviewer" subtitle="Static maintainer workspace for source and safety review" />
      <div className="wiki-notice">
        This page does not approve articles. It organizes Draft pages for qualified human review and keeps
        source-review flags visible until a reviewer clears them in Markdown.
      </div>

      <section className="wiki-section">
        <h2>Review queues</h2>
        <div className="wiki-inline-actions">
          {reviewQueueDefinitions.map((queue) => (
            <button
              className="wiki-small-button"
              type="button"
              key={queue.id}
              aria-pressed={queue.id === selectedQueue}
              onClick={() => setSelectedQueue(queue.id)}
            >
              {queue.title}
            </button>
          ))}
        </div>
        <p className="wiki-small">
          <b>{activeQueue.title}:</b> {activeQueue.description}
        </p>
      </section>

      <section className="wiki-section">
        <h2>{activeQueue.title}</h2>
        {rows.length ? (
          <table className="wiki-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Status</th>
                <th>Checklist</th>
                <th>Blockers</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 60).map(({ article, metric, checklist, blockers }) => (
                <tr key={article.slug}>
                  <td>
                    <a
                      href={`/wiki/articles/${article.slug}`}
                      onClick={makeNavigate(navigateTo, `/wiki/articles/${article.slug}`)}
                    >
                      {article.title}
                    </a>
                    <br />
                    <span className="wiki-small">
                      {article.reviewTier}; next review {article.review?.nextReview || "not set"}
                    </span>
                    {getWikiReviewPackBySlug(article.slug) ? (
                      <>
                        <br />
                        <a
                          className="wiki-small"
                          href={`/wiki/review-packs/${article.slug}`}
                          onClick={makeNavigate(navigateTo, `/wiki/review-packs/${article.slug}`)}
                        >
                          Open review pack
                        </a>
                      </>
                    ) : null}
                  </td>
                  <td>
                    {article.maturity}
                    <br />
                    <span className="wiki-small">
                      {metric?.exactCitationCount || 0} exact citations; {article.sourceReviewFlagCount || 0} source flags
                    </span>
                  </td>
                  <td>
                    <ReviewChecklistSummary checklist={checklist} />
                  </td>
                  <td>
                    {blockers.length ? (
                      <ul>
                        {blockers.slice(0, 5).map((blocker) => (
                          <li key={blocker}>{blocker}</li>
                        ))}
                      </ul>
                    ) : (
                      "No generated blockers"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No articles currently match this queue.</p>
        )}
      </section>

      <section className="wiki-section">
        <h2>Review checklist templates</h2>
        {reviewChecklistTemplates.map((template) => (
          <section className="wiki-subsection" key={template.id}>
            <h3>{template.title}</h3>
            <p className="wiki-small">{template.audience}</p>
            <ul>
              {template.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </article>
  );
}

function ReviewPacksPage({ navigateTo }) {
  const rows = [...wikiReviewPacks].sort((a, b) => a.title.localeCompare(b.title));
  const totals = rows.reduce(
    (summary, pack) => {
      summary.claims += pack.claimsNeedingReview?.length || 0;
      summary.sourceFlags += pack.sourceReviewFlagCount || 0;
      summary.citations += pack.exactCitationIds?.length || 0;
      return summary;
    },
    { claims: 0, sourceFlags: 0, citations: 0 },
  );

  return (
    <article className="wiki-article">
      <PageTitle title="Tier 1 review packs" subtitle="Source-review packets for the highest-risk draft articles" />
      <div className="wiki-notice">
        Review packs do not approve articles. They collect the legal claims, citation coverage, source notes,
        related field tools, and blockers a qualified reviewer needs before changing article maturity.
      </div>

      <section className="wiki-section">
        <h2>Summary</h2>
        <table className="wiki-table">
          <tbody>
            <tr>
              <th>Review packs</th>
              <td>{rows.length}</td>
            </tr>
            <tr>
              <th>Open source-review flags</th>
              <td>{totals.sourceFlags}</td>
            </tr>
            <tr>
              <th>Claims needing source review</th>
              <td>{totals.claims}</td>
            </tr>
            <tr>
              <th>Exact official citations</th>
              <td>{totals.citations}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="wiki-section">
        <h2>Review pack index</h2>
        {rows.length ? (
          <table className="wiki-table">
            <thead>
              <tr>
                <th>Article</th>
                <th>Review status</th>
                <th>Review load</th>
                <th>Related tools</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((pack) => (
                <tr key={pack.slug}>
                  <td>
                    <a
                      href={`/wiki/review-packs/${pack.slug}`}
                      onClick={makeNavigate(navigateTo, `/wiki/review-packs/${pack.slug}`)}
                    >
                      {pack.title}
                    </a>
                    <br />
                    <a
                      className="wiki-small"
                      href={`/wiki/articles/${pack.slug}`}
                      onClick={makeNavigate(navigateTo, `/wiki/articles/${pack.slug}`)}
                    >
                      Open article
                    </a>
                  </td>
                  <td>
                    {pack.maturity}; {pack.review?.legalReviewStatus || "source review open"}
                    <br />
                    <span className="wiki-small">{pack.review?.safetyReviewStatus || "safety review open"}</span>
                  </td>
                  <td>
                    {(pack.claimsNeedingReview || []).length} claims need source review
                    <br />
                    <span className="wiki-small">
                      {(pack.exactCitationIds || []).length} exact citations; {pack.sourceNotes?.length || 0} source notes
                    </span>
                  </td>
                  <td>{reviewPackToolCount(pack)} field-tool links</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No review packs have been generated yet. Run <code>npm run build:wiki-review-packs</code>.</p>
        )}
      </section>
    </article>
  );
}

function ReviewPackPage({ slug, navigateTo }) {
  const pack = getWikiReviewPackBySlug(slug);
  const article = getArticleBySlug(slug);

  if (!pack || !article) {
    return <NotFoundPage path={`/wiki/review-packs/${slug}`} />;
  }

  const sectionHeadings = [
    "Article review status",
    "Reviewer checklist",
    "Claims needing source review",
    "Citation coverage",
    "Source notes",
    "Related field-use content",
    "Draft blocker summary",
    "Reviewer notes",
    "Print packet",
  ];

  return (
    <article className="wiki-article">
      <PageTitle title={`${pack.title} review pack`} subtitle="Tier 1 source and safety review packet" />
      <div className="wiki-article-meta">
        <span>{pack.reviewTier}</span>
        <span>{pack.maturity}</span>
        <span>{pack.review?.legalReviewStatus}</span>
        <span>{pack.sourceReviewFlagCount} source flags</span>
        <span>Generated {pack.generatedAt}</span>
      </div>
      <div className="wiki-notice">
        This packet is a reviewer aid. It keeps unresolved source-review flags visible and does not mark the
        article as source checked, safety reviewed, or ready for public use.
      </div>

      <p>
        <a href={`/wiki/articles/${pack.slug}`} onClick={makeNavigate(navigateTo, `/wiki/articles/${pack.slug}`)}>
          Open the article
        </a>
      </p>

      <TableOfContents items={sectionHeadings} />

      <section className="wiki-section" id="article-review-status">
        <h2>Article review status</h2>
        <table className="wiki-table">
          <tbody>
            <tr>
              <th>Article maturity</th>
              <td>{pack.maturity}</td>
            </tr>
            <tr>
              <th>Legal/source review</th>
              <td>{pack.review?.legalReviewStatus}</td>
            </tr>
            <tr>
              <th>Safety review</th>
              <td>{pack.review?.safetyReviewStatus}</td>
            </tr>
            <tr>
              <th>Review window</th>
              <td>
                Last reviewed {pack.review?.lastReviewed}; next review {pack.review?.nextReview}
              </td>
            </tr>
            <tr>
              <th>Quality metrics</th>
              <td>
                {pack.qualityMetric?.exactCitationCount || 0} exact citations;{" "}
                {pack.qualityMetric?.outboundLinkCount || 0} outbound article links;{" "}
                {pack.qualityMetric?.relatedToolCount || 0} related field tools
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="wiki-section" id="reviewer-checklist">
        <h2>Reviewer checklist</h2>
        <ReviewChecklistSummary checklist={pack.reviewChecklist || []} />
        <h3>Checklist templates</h3>
        <ul>
          {(pack.reviewChecklistTemplates || []).map((template) => (
            <li key={template.id}>
              <b>{template.title}</b>: {template.audience}
            </li>
          ))}
        </ul>
      </section>

      <section className="wiki-section" id="claims-needing-source-review">
        <h2>Claims needing source review</h2>
        {(pack.claimsNeedingReview || []).length ? (
          <ol>
            {pack.claimsNeedingReview.map((claim) => (
              <li key={claim.id || `${claim.section}-${claim.index}`}>
                {claim.section ? <span className="wiki-small">{formatSectionName(claim.section)}: </span> : null}
                <RichText text={claim.text} navigateTo={navigateTo} />
                {(claim.citationIds || []).length ? (
                  <div className="wiki-small">Citation tokens: {claim.citationIds.join(", ")}</div>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p>No source-review claims are currently listed. Do not promote the article without human review.</p>
        )}
      </section>

      <section className="wiki-section" id="citation-coverage">
        <h2>Citation coverage</h2>
        <p className="wiki-small">
          Exact OHSR citation IDs: {(pack.exactCitationIds || []).join(", ") || "none"}
        </p>
        <ul>
          {(pack.citations || []).map((citation) => (
            <li key={citation.id}>
              {citation.url ? (
                <a href={citation.url} target="_blank" rel="noreferrer">
                  {citation.title}
                </a>
              ) : (
                citation.title
              )}{" "}
              <span className="wiki-small">
                {citation.publisher}
                {citation.locator ? ` - ${citation.locator}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="wiki-section" id="source-notes">
        <h2>Source notes</h2>
        <ul>
          {(pack.sourceNotes || []).map((note) => (
            <li key={note.id}>
              <a
                href={`/wiki/source-notes/${note.id}`}
                onClick={makeNavigate(navigateTo, `/wiki/source-notes/${note.id}`)}
              >
                {note.title}
              </a>{" "}
              <span className="wiki-small">
                {note.publisher}; {note.sourceType}; last checked {note.lastChecked}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="wiki-section" id="related-field-use-content">
        <h2>Related field-use content</h2>
        <div className="wiki-tool-grid">
          <ReviewPackToolList
            title="Toolbox talks"
            items={pack.relatedTools?.toolboxTalks}
            hrefFor={() => "/safety-lab/toolbox-talks"}
            navigateTo={navigateTo}
          />
          <ReviewPackToolList
            title="Checklists"
            items={pack.relatedTools?.checklists}
            hrefFor={() => "/safety-lab/checklists"}
            navigateTo={navigateTo}
          />
          <ReviewPackToolList
            title="Quizzes"
            items={pack.relatedTools?.quizzes}
            hrefFor={(item) => `/training-quiz/${item.id}`}
            navigateTo={navigateTo}
          />
          <ReviewPackToolList
            title="Forms"
            items={pack.relatedTools?.forms}
            hrefFor={() => "/safety-lab/forms"}
            navigateTo={navigateTo}
          />
          <ReviewPackToolList
            title="Safety packs"
            items={pack.relatedTools?.safetyPacks}
            hrefFor={(item) => `/safety-lab/safety-pack?pack=${item.id}`}
            navigateTo={navigateTo}
          />
        </div>
      </section>

      <section className="wiki-section" id="draft-blocker-summary">
        <h2>Draft blocker summary</h2>
        <ul>
          {(pack.draftBlockers || []).map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      </section>

      {(pack.reviewerNotes || []).length ? (
        <ArticleSection title="Reviewer notes" items={pack.reviewerNotes} navigateTo={navigateTo} />
      ) : null}

      <section className="wiki-section" id="print-packet">
        <h2>Print packet</h2>
        <p>
          Print this packet for source/legal review. It is not a worker handout and it is not a compliance
          certificate.
        </p>
        <button className="wiki-small-button" type="button" onClick={() => window.print()}>
          Print review pack
        </button>
      </section>
    </article>
  );
}

function ReviewPackCallout({ pack, navigateTo }) {
  return (
    <section className="wiki-section wiki-review-box" id="review-pack">
      <h2>Review pack</h2>
      <p>
        A Tier 1 review packet is available for this article. It collects legal claims, citations, source notes,
        field-tool links, and draft blockers for qualified review.
      </p>
      <p>
        <a
          href={`/wiki/review-packs/${pack.slug}`}
          onClick={makeNavigate(navigateTo, `/wiki/review-packs/${pack.slug}`)}
        >
          Open review pack
        </a>
      </p>
    </section>
  );
}

function ReviewPackToolList({ title, items = [], hrefFor, navigateTo }) {
  if (!items.length) return null;
  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => {
          const href = hrefFor(item);
          return (
            <li key={item.id}>
              <a href={href} onClick={makeNavigate(navigateTo, href)}>
                {item.title || formatResourceId(item.id)}
              </a>
              {item.topic || item.scenario ? (
                <>
                  <br />
                  <span className="wiki-small">{item.topic || item.scenario}</span>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function reviewPackToolCount(pack) {
  const tools = pack.relatedTools || {};
  return (
    (tools.toolboxTalks || []).length +
    (tools.checklists || []).length +
    (tools.quizzes || []).length +
    (tools.forms || []).length +
    (tools.safetyPacks || []).length
  );
}

function ReviewChecklistSummary({ checklist }) {
  return (
    <ul>
      {checklist.map((item) => (
        <li key={item.id}>
          <b>{item.complete ? "OK" : "Open"}</b>: {item.label}
          <br />
          <span className="wiki-small">{item.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function ReviewBacklogPage({ navigateTo }) {
  const backlog = getWikiReviewBacklog();

  return (
    <article className="wiki-article">
      <PageTitle title="Review backlog" subtitle="Maintenance view for source and safety review" />
      <div className="wiki-notice">
        This page is for maintainers. It identifies draft articles that need citation review,
        copy hardening, backlink improvement, or maturity decisions before public-ready use.
      </div>
      <section className="wiki-section">
        <h2>Review tiers</h2>
        <ul className="wiki-inline-list">
          {Object.entries(backlog.tierCounts).map(([tier, count]) => (
            <li key={tier}>
              <b>{tier}</b>: {count}
            </li>
          ))}
        </ul>
      </section>
      <section className="wiki-section">
        <h2>Reviewer checklist</h2>
        <ul>
          {reviewerChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <BacklogList
        title="Most source-review flags"
        articles={backlog.sourceReview.slice(0, 25)}
        getNote={(article) => `${article.sourceReviewFlagCount} source-review flags`}
        navigateTo={navigateTo}
      />
      <BacklogList
        title="Tier 1 articles with weak citation coverage"
        articles={backlog.weakCitations}
        getNote={(article) => `${article.citationIds?.length || 0} citation ids`}
        navigateTo={navigateTo}
      />
      <BacklogList
        title="Low-backlink pages"
        articles={backlog.lowBacklinks.slice(0, 25)}
        getNote={(article) => `${article.backlinks?.length || 0} inbound backlinks`}
        navigateTo={navigateTo}
      />
      <BacklogList
        title="Oldest review dates"
        articles={backlog.oldestReview.slice(0, 25)}
        getNote={(article) => `Last reviewed ${article.review?.lastReviewed || "unknown"}`}
        navigateTo={navigateTo}
      />
    </article>
  );
}

function GovernancePage() {
  return (
    <article className="wiki-article">
      <PageTitle title="Governance" subtitle="Trust, corrections, review, and AI use" />
      <section className="wiki-section">
        <h2>Roles and review</h2>
        <ul>
          {governanceModel.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="wiki-section">
        <h2>AI-assisted workflow</h2>
        <p>
          AI may draft summaries, suggest links, detect duplicate topics, generate draft
          checklists, flag missing citations, and compare article text against source
          notes. AI output is never published without human safety and source review.
        </p>
      </section>
      <section className="wiki-section">
        <h2>Content creation pipeline</h2>
        <ol>
          {contentCreationPipeline.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
      <section className="wiki-section">
        <h2>Legal and copyright risk controls</h2>
        <ul>
          <li>Do not copy WorkSafeBC, BCCSA, CSA, manufacturer, or private manual text heavily.</li>
          <li>Paraphrase in original plain language and cite the official source.</li>
          <li>Label best practice, sample procedure, and field checklist separately from law.</li>
          <li>Flag stale sources and review high-risk articles on a 90-day cadence.</li>
          <li>Do not provide medical advice beyond emergency escalation and recognized first aid direction.</li>
        </ul>
      </section>
    </article>
  );
}

function TechnicalPage() {
  return (
    <article className="wiki-article">
      <PageTitle title="Technical plan" subtitle="Durable structure for the wiki" />
      <section className="wiki-section">
        <h2>Stack recommendation</h2>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Option</th>
              <th>Verdict</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {technicalRecommendation.map((item) => (
              <tr key={item.stack}>
                <td>{item.stack}</td>
                <td>{item.verdict}</td>
                <td>{item.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="wiki-section">
        <h2>Article template</h2>
        <ol>
          {articleTemplate.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
      <section className="wiki-section">
        <h2>Linking model</h2>
        <ul>
          {linkingModel.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="wiki-section">
        <h2>Search strategy</h2>
        <ul>
          {searchStrategy.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="wiki-section">
        <h2>Proposed database schema</h2>
        <pre className="wiki-pre">{databaseSchema}</pre>
      </section>
      <section className="wiki-section">
        <h2>Proposed folder/content structure</h2>
        <pre className="wiki-pre">{contentStructure}</pre>
      </section>
      <section className="wiki-section">
        <h2>Build phases</h2>
        {buildPhases.map((phase) => (
          <section className="wiki-subsection" key={phase.title}>
            <h3>{phase.title}</h3>
            <ul>
              {phase.tasks.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </section>
        ))}
      </section>
      <section className="wiki-section">
        <h2>Task list Codex can execute</h2>
        <ol>
          {codexExecutionTasks.map((task) => (
            <li key={task}>{task}</li>
          ))}
        </ol>
      </section>
    </article>
  );
}

function NotFoundPage({ path }) {
  return (
    <article className="wiki-article">
      <PageTitle title="Page not found" subtitle="BC Construction Safety Wiki" />
      <p>No wiki page exists at {path}.</p>
      <p>
        <a href="/wiki">Return to the main page</a>
      </p>
    </article>
  );
}

function PageTitle({ title, subtitle }) {
  return (
    <header className="wiki-title">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}

function TableOfContents({ items }) {
  return (
    <nav className="wiki-toc" aria-label="Contents">
      <h2>Contents</h2>
      <ol>
        {items.map((item) => (
          <li key={item}>
            <a href={`#${anchorFor(item)}`}>{item}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ArticleSection({ title, items, navigateTo, ordered = false }) {
  if (!items?.length) return null;
  const List = ordered ? "ol" : "ul";
  return (
    <section className="wiki-section" id={anchorFor(title)}>
      <h2>{title}</h2>
      <List>
        {items.map((item) => (
          <li key={item}>
            <RichText text={item} navigateTo={navigateTo} />
          </li>
        ))}
      </List>
    </section>
  );
}

function ChecklistSection({ title, items, navigateTo }) {
  return (
    <section className="wiki-section wiki-checklist" id={anchorFor(title)}>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <span aria-hidden="true" /> <RichText text={item} navigateTo={navigateTo} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticleList({ articles, compact = false, empty = "No articles.", navigateTo }) {
  if (!articles.length) return <p>{empty}</p>;
  return (
    <ul className={compact ? "wiki-article-list compact" : "wiki-article-list"}>
      {articles.map((article) => (
        <li key={article.slug}>
          <a
            href={`/wiki/articles/${article.slug}`}
            onClick={navigateTo ? makeNavigate(navigateTo, `/wiki/articles/${article.slug}`) : undefined}
          >
            {article.title}
          </a>
          {compact ? null : <p>{plainWikiText(article.searchSnippet || article.summary)}</p>}
        </li>
      ))}
    </ul>
  );
}

function SearchFilters({ filters, setFilters }) {
  const options = getWikiFilterOptions();
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <section className="wiki-section wiki-search-filters" aria-label="Search filters">
      <h2>Search filters</h2>
      <div className="wiki-filter-grid">
        <FilterSelect label="Hazard" value={filters.hazard} options={options.hazards} onChange={(value) => updateFilter("hazard", value)} />
        <FilterSelect label="Trade" value={filters.trade} options={options.trades} onChange={(value) => updateFilter("trade", value)} />
        <FilterSelect label="Required document" value={filters.document} options={options.documents} onChange={(value) => updateFilter("document", value)} />
        <FilterSelect label="Regulation section" value={filters.regulation} options={options.regulations} onChange={(value) => updateFilter("regulation", value)} />
        <FilterSelect label="Article maturity" value={filters.maturity} options={options.maturities} onChange={(value) => updateFilter("maturity", value)} />
      </div>
      {hasActiveFilters(filters) ? (
        <button className="wiki-small-button" type="button" onClick={() => setFilters(emptyFilters())}>
          Clear filters
        </button>
      ) : null}
    </section>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="wiki-filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReviewBox({ article }) {
  return (
    <section className="wiki-section wiki-review-box" id="review-status">
      <h2>Review status</h2>
      <table className="wiki-table">
        <tbody>
          <tr>
            <th>Article maturity</th>
            <td>{article.maturity || "Draft"}</td>
          </tr>
          <tr>
            <th>Review tier</th>
            <td>{article.reviewTier || "Tier 3"}</td>
          </tr>
          <tr>
            <th>Review priority</th>
            <td>{article.reviewPriority || "Support/reference review"}</td>
          </tr>
          <tr>
            <th>Legal/source review</th>
            <td>{article.review.legalReviewStatus}</td>
          </tr>
          <tr>
            <th>Safety review</th>
            <td>{article.review.safetyReviewStatus}</td>
          </tr>
          <tr>
            <th>Review window</th>
            <td>
              Last reviewed {article.review.lastReviewed}; next review {article.review.nextReview}
            </td>
          </tr>
          <tr>
            <th>Open source flags</th>
            <td>{article.sourceReviewFlagCount || 0}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function DraftBlockersSection({ article, blockers }) {
  if (article.maturity !== "Draft" && !blockers.length) return null;

  return (
    <section className="wiki-section wiki-review-box" id="why-this-is-still-draft">
      <h2>Why this is still Draft</h2>
      {blockers.length ? (
        <ul>
          {blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : (
        <p>This article has no generated blockers, but it still needs a maintainer to update the maturity label.</p>
      )}
      <p className="wiki-small">
        Draft status stays in place until qualified source/legal review and field safety review are both complete.
      </p>
    </section>
  );
}

function RelatedFieldTools({ article, navigateTo }) {
  return (
    <section className="wiki-section" id="related-field-tools">
      <h2>Related field tools</h2>
      <div className="wiki-tool-grid">
        <ResourceList title="Related toolbox talks" ids={article.relatedToolboxTalks} path="/safety-lab/toolbox-talks" navigateTo={navigateTo} />
        <ResourceList title="Related forms" ids={article.relatedForms} path="/safety-lab/forms" navigateTo={navigateTo} />
        <ResourceList title="Related quizzes" ids={article.relatedQuizzes} path="/training-quiz" navigateTo={navigateTo} />
        <ResourceList title="Related checklists" ids={article.relatedChecklists} path="/safety-lab/checklists" navigateTo={navigateTo} />
      </div>
    </section>
  );
}

function SourceNotesSection({ sourceNotes, navigateTo }) {
  return (
    <section className="wiki-section" id="source-notes">
      <h2>Source notes</h2>
      <ul>
        {sourceNotes.map((note) => (
          <li key={note.id}>
            <a
              href={`/wiki/source-notes/${note.id}`}
              onClick={makeNavigate(navigateTo, `/wiki/source-notes/${note.id}`)}
            >
              {note.title}
            </a>{" "}
            <span className="wiki-small">
              {note.publisher}; last checked {note.lastChecked}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticleQualitySection({ article, qualityMetric }) {
  if (!qualityMetric) return null;

  return (
    <section className="wiki-section" id="article-quality">
      <h2>Article quality</h2>
      <table className="wiki-table">
        <tbody>
          <tr>
            <th>Exact official citations</th>
            <td>{qualityMetric.exactCitationCount}</td>
          </tr>
          <tr>
            <th>Outbound / inbound links</th>
            <td>
              {qualityMetric.outboundLinkCount} outbound; {qualityMetric.inboundLinkCount} inbound
            </td>
          </tr>
          <tr>
            <th>Related field tools</th>
            <td>{qualityMetric.relatedToolCount}</td>
          </tr>
          <tr>
            <th>Source notes</th>
            <td>{qualityMetric.sourceNoteCount}</td>
          </tr>
          <tr>
            <th>Open source-review flags</th>
            <td>{article.sourceReviewFlagCount || qualityMetric.sourceReviewFlagCount}</td>
          </tr>
          <tr>
            <th>Generated issues</th>
            <td>{qualityMetric.issues.length ? qualityMetric.issues.join("; ") : "No generated issues"}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function ResourceList({ title, ids = [], path, navigateTo }) {
  if (!ids.length) return null;
  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {ids.map((id) => {
          const href = path === "/training-quiz" ? `/training-quiz/${id}` : path;
          return (
            <li key={id}>
              <a href={href} onClick={makeNavigate(navigateTo, href)}>
                {formatResourceId(id)}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CorrectionForm({ article }) {
  const [category, setCategory] = useState("source issue");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="wiki-section" id="report-an-issue-with-this-article">
      <h2>Report an issue with this article</h2>
      <form className="wiki-correction-form" onSubmit={submit}>
        <label>
          <span>Issue category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option>broken link</option>
            <option>source issue</option>
            <option>unclear wording</option>
            <option>unsafe suggestion</option>
            <option>outdated regulation</option>
          </select>
        </label>
        <label>
          <span>What should be checked?</span>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows="4"
            placeholder={`Example: ${article.title} legal requirement 3 needs source review.`}
          />
        </label>
        <button className="wiki-small-button" type="submit">Prepare correction note</button>
      </form>
      {submitted ? (
        <div className="wiki-notice">
          Correction note prepared for article <b>{article.title}</b>. Category: <b>{category}</b>.
          This prototype does not submit public edits yet; it records the workflow shape for the review queue.
        </div>
      ) : null}
    </section>
  );
}

function BacklogList({ title, articles, getNote, navigateTo }) {
  return (
    <section className="wiki-section">
      <h2>{title}</h2>
      {articles.length ? (
        <table className="wiki-table">
          <tbody>
            {articles.map((article) => (
              <tr key={`${title}-${article.slug}`}>
                <th>
                  <a
                    href={`/wiki/articles/${article.slug}`}
                    onClick={makeNavigate(navigateTo, `/wiki/articles/${article.slug}`)}
                  >
                    {article.title}
                  </a>
                </th>
                <td>{getNote(article)}</td>
                <td>{article.maturity || "Draft"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No articles in this backlog group.</p>
      )}
    </section>
  );
}

function RichText({ text, navigateTo }) {
  const value = String(text || "");
  const parts = value.split(/(\[\[[^\]]+\]\]|\{\{cite:[^}]+\}\}|\{\{review:source\}\})/g);

  return parts.map((part, index) => {
    if (!part) return null;

    const wikiMatch = part.match(/^\[\[([^|\]]+)(?:\|([^\]]+))?\]\]$/);
    if (wikiMatch) {
      const slug = wikiMatch[1].trim();
      const redirectTarget = getRedirectTarget(slug);
      const article = getArticleBySlug(slug) || (redirectTarget ? getArticleBySlug(redirectTarget) : null);
      const targetSlug = article?.slug || slug;
      const label = wikiMatch[2]?.trim() || article?.title || slug;
      return article ? (
        <a
          key={`${part}-${index}`}
          href={`/wiki/articles/${targetSlug}`}
          onClick={makeNavigate(navigateTo, `/wiki/articles/${targetSlug}`)}
        >
          {label}
        </a>
      ) : (
        <span className="wiki-missing-link" key={`${part}-${index}`}>
          {label}
        </span>
      );
    }

    const citationMatch = part.match(/^\{\{cite:([^}]+)\}\}$/);
    if (citationMatch) {
      const citation = getCitationById(citationMatch[1].trim());
      return citation?.url ? (
        <sup className="wiki-citation" key={`${part}-${index}`}>
          <a href={citation.url} target="_blank" rel="noreferrer" title={citation.title}>
            [{citation.id}]
          </a>
        </sup>
      ) : (
        <sup className="wiki-citation missing" key={`${part}-${index}`}>
          [{citationMatch[1].trim()}]
        </sup>
      );
    }

    if (part === "{{review:source}}") {
      return (
        <span className="wiki-source-review" key={`${part}-${index}`}>
          source review needed
        </span>
      );
    }

    return part;
  });
}

function plainWikiText(text) {
  return String(text || "")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{cite:[^}]+\}\}/g, "")
    .replace(/\{\{review:source\}\}/g, "source review needed")
    .replace(/\s+/g, " ")
    .trim();
}

function WikiList({ title, items }) {
  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function RoadmapTable({ title, rows }) {
  return (
    <section className="wiki-section">
      <h2>{title}</h2>
      <table className="wiki-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Article</th>
            <th>Phase</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.order}-${row.slug}`}>
              <td>{row.order}</td>
              <td>{row.title}</td>
              <td>{row.phase}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function makeNavigate(navigateTo, path) {
  return (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateTo(path);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
}

function getInitialSearch() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("search") || "";
}

function emptyFilters() {
  return {
    hazard: "",
    trade: "",
    document: "",
    regulation: "",
    maturity: "",
  };
}

function getInitialFilters() {
  if (typeof window === "undefined") return emptyFilters();
  const params = new URLSearchParams(window.location.search);
  return {
    hazard: params.get("hazard") || "",
    trade: params.get("trade") || "",
    document: params.get("document") || "",
    regulation: params.get("regulation") || "",
    maturity: params.get("maturity") || "",
  };
}

function hasActiveFilters(filters) {
  return Object.values(filters).some(Boolean);
}

function articleByTitle(title) {
  const normalizedTitle = normalizeText(title);
  return wikiArticles.find((article) => normalizeText(article.title) === normalizedTitle);
}

function formatResourceId(id) {
  return String(id || "")
    .replace(/-quiz$/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSectionName(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function groupBy(rows, key) {
  return rows.reduce((groups, row) => {
    const value = row[key] || "Other";
    groups[value] = groups[value] || [];
    groups[value].push(row);
    return groups;
  }, {});
}

function anchorFor(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
