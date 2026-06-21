import { useEffect, useMemo, useState } from "react";
import {
  articleRoadmap,
  articleTemplate,
  buildPhases,
  codexExecutionTasks,
  contentCreationPipeline,
  contentStructure,
  databaseSchema,
  getArticleBySlug,
  getArticleDraftBlockers,
  getArticleReviewChecklist,
  getCitationById,
  getRedirectTarget,
  getRegulationById,
  getRoadmapByPhase,
  getSearchSuggestion,
  getSourceById,
  getSourceNoteById,
  getSourceNotesForArticle,
  getWikiFilterOptions,
  getWikiQualityMetric,
  getWikiReviewBacklog,
  getWikiReviewIssuesForArticle,
  glossaryTerms,
  governanceModel,
  linkingModel,
  productStrategy,
  searchStrategy,
  searchWiki,
  sourceHierarchy,
  synonymIndex,
  technicalRecommendation,
  wikiArticles,
  wikiCategories,
  wikiQualityMetrics,
  wikiRedirects,
  wikiReviewIssues,
  wikiSimpleReviews,
  wikiSourceCoverage,
  wikiSourceNotes,
  wikiSources,
} from "./wikiContent.js";

const WIKI_NAV_GROUPS = [
  {
    title: "Wiki",
    open: true,
    items: [
      { label: "Main page", path: "/wiki" },
      { label: "Article index", path: "/wiki/articles" },
      { label: "Categories", path: "/wiki/categories" },
      { label: "Glossary", path: "/wiki/glossary" },
      { label: "Redirects", path: "/wiki/redirects" },
    ],
  },
  {
    title: "Sources and quality",
    open: true,
    items: [
      { label: "Sources", path: "/wiki/sources" },
      { label: "Source notes", path: "/wiki/source-notes" },
      { label: "Article quality", path: "/wiki/quality" },
      { label: "Roadmap", path: "/wiki/roadmap" },
    ],
  },
  {
    title: "Review",
    open: true,
    items: [{ label: "Review", path: "/wiki/review" }],
  },
  {
    title: "Site governance",
    open: false,
    items: [
      { label: "Corrections", path: "/wiki/corrections" },
      { label: "Governance", path: "/wiki/governance" },
      { label: "Technical plan", path: "/wiki/technical" },
    ],
  },
];

const ARTICLE_SECTIONS = [
  ["When this applies", "whenApplies", false, false],
  ["Legal requirements", "legalRequirements", true, false],
  ["Best practice", "bestPractice", false, false],
  ["Required documents", "requiredDocuments", false, false],
  ["Step-by-step safe procedure", "procedure", true, false],
  ["Worker checklist", "workerChecklist", false, true],
  ["Supervisor checklist", "supervisorChecklist", false, true],
  ["Common mistakes", "commonMistakes", false, false],
];

export default function WikiApp({ routePath, navigateTo }) {
  const normalizedPath = routePath.replace(/\/$/, "") || "/wiki";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(getInitialSearch());
  const [activeSearch, setActiveSearch] = useState(getInitialSearch());
  const [filters, setFilters] = useState(getInitialFilters());

  const navigateWithinWiki = (path) => {
    setMenuOpen(false);
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
      document.title = article ? `${article.title} - BC Construction Safety Wiki` : "BC Construction Safety Wiki";
      return;
    }
    document.title = "BC Construction Safety Wiki";
  }, [normalizedPath]);

  useEffect(() => {
    scrollToCurrentHash();
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
    if (normalizedPath === "/wiki/articles") return <ArticleIndex navigateTo={navigateWithinWiki} />;
    if (normalizedPath.startsWith("/wiki/articles/")) {
      return <ArticlePage slug={normalizedPath.replace("/wiki/articles/", "")} navigateTo={navigateWithinWiki} />;
    }
    if (normalizedPath === "/wiki/categories") return <CategoriesPage navigateTo={navigateWithinWiki} />;
    if (normalizedPath.startsWith("/wiki/categories/")) {
      return <CategoryPage categoryId={normalizedPath.replace("/wiki/categories/", "")} navigateTo={navigateWithinWiki} />;
    }
    if (normalizedPath === "/wiki/sources") return <SourcesPage />;
    if (normalizedPath === "/wiki/source-notes") return <SourceNotesPage navigateTo={navigateWithinWiki} />;
    if (normalizedPath.startsWith("/wiki/source-notes/")) {
      return <SourceNotePage id={normalizedPath.replace("/wiki/source-notes/", "")} navigateTo={navigateWithinWiki} />;
    }
    if (normalizedPath === "/wiki/glossary") return <GlossaryPage navigateTo={navigateWithinWiki} />;
    if (normalizedPath.startsWith("/wiki/glossary/")) {
      return <GlossaryTermPage slug={normalizedPath.replace("/wiki/glossary/", "")} navigateTo={navigateWithinWiki} />;
    }
    if (normalizedPath === "/wiki/redirects") return <RedirectsPage navigateTo={navigateWithinWiki} />;
    if (normalizedPath === "/wiki/quality") return <ArticleQualityPage navigateTo={navigateWithinWiki} />;
    if (normalizedPath === "/wiki/review") return <SimpleReviewPage navigateTo={navigateWithinWiki} />;
    if (normalizedPath.startsWith("/wiki/review/item/")) {
      return <SimpleReviewItemPage slug={normalizedPath.replace("/wiki/review/item/", "")} navigateTo={navigateWithinWiki} />;
    }
    if (normalizedPath === "/wiki/roadmap") return <RoadmapPage navigateTo={navigateWithinWiki} />;
    if (normalizedPath === "/wiki/review-backlog") return <ReviewBacklogPage navigateTo={navigateWithinWiki} />;
    if (normalizedPath === "/wiki/corrections") return <CorrectionsPage navigateTo={navigateWithinWiki} />;
    if (normalizedPath === "/wiki/governance") return <GovernancePage />;
    if (normalizedPath === "/wiki/technical") return <TechnicalPage />;
    return <NotFoundPage path={normalizedPath} navigateTo={navigateWithinWiki} />;
  }, [activeSearch, filters, normalizedPath]);

  const submitSearch = (event) => {
    event.preventDefault();
    setActiveSearch(searchValue);
    navigateWithinWiki(`/wiki?search=${encodeURIComponent(searchValue)}`);
  };

  return (
    <div className="wiki-root">
      <header className="wiki-masthead">
        <a href="/wiki" onClick={makeNavigate(navigateWithinWiki, "/wiki")} className="wiki-wordmark">
          <span>BC Construction Safety Wiki</span>
          <small>Plain-language safety reference</small>
        </a>
        <form className="wiki-search" onSubmit={submitSearch}>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search the wiki"
            aria-label="Search the wiki"
          />
          <button type="submit">Search</button>
        </form>
        <button className="wiki-menu-button" type="button" onClick={() => setMenuOpen((open) => !open)}>
          Menu
        </button>
      </header>
      <div className="wiki-page">
        <aside className={menuOpen ? "wiki-sidebar open" : "wiki-sidebar"}>
          <nav aria-label="Wiki navigation">
            <h2>Navigation</h2>
            {WIKI_NAV_GROUPS.map((group) => (
              <details className="wiki-nav-group" key={group.title} open={group.open}>
                <summary>{group.title}</summary>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.path}>
                      <a href={item.path} onClick={makeNavigate(navigateWithinWiki, item.path)}>
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </nav>
          <nav aria-label="Wiki categories">
            <h2>Categories</h2>
            <ul>
              {wikiCategories.map((category) => (
                <li key={category.id}>
                  <a href={`/wiki/categories/${category.id}`} onClick={makeNavigate(navigateWithinWiki, `/wiki/categories/${category.id}`)}>
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
  const activeQuery = query || "";
  const results = useMemo(() => searchWiki(activeQuery, filters), [activeQuery, filters]);
  const suggestion = useMemo(() => getSearchSuggestion(activeQuery), [activeQuery]);

  return (
    <article className="wiki-article">
      <PageTitle title="BC Construction Safety Wiki" subtitle="Plain-language BC construction safety reference" />
      <div className="wiki-notice">
        Draft public beta. Articles are source-cited, wiki-linked, and still require qualified source and field review.
      </div>
      <SearchFilters filters={filters} setFilters={setFilters} />
      {activeQuery || hasActiveFilters(filters) ? (
        <section className="wiki-section">
          <h2>Search results</h2>
          {suggestion ? (
            <p className="wiki-small">
              Did you mean{" "}
              <a href={`/wiki/articles/${suggestion.article.slug}`} onClick={makeNavigate(navigateTo, `/wiki/articles/${suggestion.article.slug}`)}>
                {suggestion.article.title}
              </a>
              ?
            </p>
          ) : null}
          <ArticleList articles={results} navigateTo={navigateTo} empty="No matching articles." />
        </section>
      ) : (
        <>
          <section className="wiki-section">
            <h2>Product concept</h2>
            <p>{productStrategy.whatItIs}</p>
            <h3>Who it is for</h3>
            <SimpleList items={productStrategy.whoItIsFor} />
            <h3>What it solves</h3>
            <SimpleList items={productStrategy.problemsSolved} />
          </section>
          <section className="wiki-section">
            <h2>Start browsing</h2>
            <ArticleList articles={wikiArticles.slice(0, 20)} navigateTo={navigateTo} />
          </section>
        </>
      )}
    </article>
  );
}

function ArticlePage({ slug, navigateTo }) {
  const directArticle = getArticleBySlug(slug);
  const redirectTarget = !directArticle ? getRedirectTarget(slug) : null;
  const article = directArticle || (redirectTarget ? getArticleBySlug(redirectTarget) : null);

  if (!article) return <NotFoundPage path={`/wiki/articles/${slug}`} navigateTo={navigateTo} />;

  const sourceNotes = getSourceNotesForArticle(article.slug);
  const reviewIssues = getWikiReviewIssuesForArticle(article.slug);
  const qualityMetric = getWikiQualityMetric(article.slug);
  const [simpleReviews] = useState(() => loadSimpleWikiReviews());
  const simpleReviewRecord = normalizeSimpleReviewRecord(simpleReviews[article.slug], reviewIssues);
  const repoSimpleReviewRecord = normalizeSimpleReviewRecord(wikiSimpleReviews?.[article.slug], reviewIssues);
  const effectiveReviewState = getEffectiveArticleReviewState(article, reviewIssues, simpleReviewRecord, repoSimpleReviewRecord);
  const showReviewAdmin = !effectiveReviewState.isRepoBackedReady;
  const draftBlockers = getEffectiveArticleDraftBlockers(article, effectiveReviewState);
  const relatedFieldTools = [
    ...(article.relatedToolboxTalks || []),
    ...(article.relatedChecklists || []),
    ...(article.relatedQuizzes || []),
    ...(article.relatedForms || []),
  ];
  const sectionHeadings = [
    showReviewAdmin ? "Simple review result" : "",
    "Summary",
    showReviewAdmin ? "Review status" : "",
    showReviewAdmin ? "Why this is still Draft" : "",
    showReviewAdmin ? "What a human reviewer must verify" : "",
    ...ARTICLE_SECTIONS.map(([title]) => title),
    "Related topics",
    relatedFieldTools.length ? "Related field tools" : "",
    article.backlinks?.length ? "Pages that link here" : "",
    "Official sources",
    article.citations?.length ? "Official citations" : "",
    sourceNotes.length ? "Source notes" : "",
    showReviewAdmin ? "Article quality" : "",
    showReviewAdmin && article.reviewerNotes?.length ? "Reviewer notes" : "",
    "Report an issue with this article",
    "Version history",
    "Disclaimer",
  ].filter(Boolean);

  return (
    <article className="wiki-article">
      <PageTitle title={article.title} subtitle="From BC Construction Safety Wiki" />
      <div className="wiki-article-meta">
        <span>{article.jurisdiction}</span>
        {!effectiveReviewState.isRepoBackedReady ? <span>{article.status}</span> : null}
        <span>{effectiveReviewState.displayMaturity}</span>
        {effectiveReviewState.reviewScopeLabel ? <span>{effectiveReviewState.reviewScopeLabel}</span> : null}
        {!effectiveReviewState.isRepoBackedReady ? <span>{article.reviewTier || "Tier 3"}</span> : null}
        {!effectiveReviewState.isRepoBackedReady ? <span>{article.confidenceLevel}</span> : null}
        <span>Last reviewed {article.review?.lastReviewed || "not reviewed"}</span>
      </div>
      {redirectTarget ? (
        <div className="wiki-notice wiki-redirect-notice">
          Redirected from <b>{slug}</b>. This worker-language term points to <b>{article.title}</b>.
        </div>
      ) : null}
      <TableOfContents items={sectionHeadings} />
      {showReviewAdmin ? <ArticleSimpleReviewStatus article={article} record={simpleReviewRecord} issueCount={reviewIssues.length} navigateTo={navigateTo} effectiveReviewState={effectiveReviewState} /> : null}
      <section className="wiki-section" id="summary">
        <h2>Summary</h2>
        {(article.summaryParagraphs?.length ? article.summaryParagraphs : [article.summary]).map((paragraph, index) => {
          const issueId = reviewIssueId(article.slug, "summary", index + 1);
          const decision = getSavedIssueDecision(simpleReviewRecord, issueId);
          if (isRemoveDecision(decision)) return null;
          return (
            <div key={paragraph} id={reviewIssueAnchor(article.slug, "summary", index + 1)} className={reviewDecisionClassName(decision)}>
              <p>
                <RichText
                  text={paragraph}
                  navigateTo={navigateTo}
                  reviewHref={`/wiki/review/item/${article.slug}#${reviewIssueAnchor(article.slug, "summary", index + 1)}`}
                />
              </p>
              <PendingReviewDecision decision={decision} />
            </div>
          );
        })}
        {article.aliases?.length ? (
          <p className="wiki-small">
            <b>Also searched as:</b> {article.aliases.join(", ")}
          </p>
        ) : null}
      </section>
      {showReviewAdmin ? <ReviewBox article={article} effectiveReviewState={effectiveReviewState} /> : null}
      {showReviewAdmin ? <DraftBlockersSection blockers={draftBlockers} /> : null}
      {showReviewAdmin ? <HumanReviewQuestionsSection article={article} navigateTo={navigateTo} reviewRecord={simpleReviewRecord} /> : null}
      {ARTICLE_SECTIONS.map(([title, sectionKey, ordered, checklist]) =>
        checklist ? (
          <ChecklistSection
            key={sectionKey}
            title={title}
            sectionKey={sectionKey}
            articleSlug={article.slug}
            items={article.sections?.[sectionKey] || []}
            navigateTo={navigateTo}
            reviewRecord={simpleReviewRecord}
          />
        ) : (
          <ArticleSection
            key={sectionKey}
            title={title}
            sectionKey={sectionKey}
            articleSlug={article.slug}
            items={article.sections?.[sectionKey] || []}
            navigateTo={navigateTo}
            ordered={ordered}
            reviewRecord={simpleReviewRecord}
          />
        ),
      )}
      <RelatedTopics article={article} navigateTo={navigateTo} />
      {relatedFieldTools.length ? <RelatedFieldTools article={article} /> : null}
      {article.backlinks?.length ? <Backlinks article={article} navigateTo={navigateTo} /> : null}
      <OfficialSources article={article} />
      {article.citations?.length ? <OfficialCitations citations={article.citations} /> : null}
      {sourceNotes.length ? <SourceNotesSection sourceNotes={sourceNotes} navigateTo={navigateTo} /> : null}
      {showReviewAdmin ? <ArticleQualitySection article={article} qualityMetric={qualityMetric} /> : null}
      {showReviewAdmin && article.reviewerNotes?.length ? (
        <ArticleSection title="Reviewer notes" sectionKey="reviewerNotes" articleSlug={article.slug} items={article.reviewerNotes} navigateTo={navigateTo} />
      ) : null}
      <CorrectionForm article={article} />
      <VersionHistory article={article} />
      <section className="wiki-section" id="disclaimer">
        <h2>Disclaimer</h2>
        <p>{articleDisclaimerText(effectiveReviewState)}</p>
      </section>
    </article>
  );
}

function SimpleReviewPage({ navigateTo }) {
  const [simpleReviews, setSimpleReviews] = useState(() => loadSimpleWikiReviews());
  const [filter, setFilter] = useState("open");
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const rows = useMemo(() => buildSimpleReviewRows(wikiReviewIssues, simpleReviews), [simpleReviews]);
  const visibleRows = useMemo(() => filterSimpleReviewRows(rows, filter), [rows, filter]);
  const reviewSummary = useMemo(() => buildSimpleReviewSummary(rows), [rows]);
  const reviewExportText = useMemo(() => buildSimpleReviewExportText(simpleReviews), [simpleReviews]);
  const importPreview = useMemo(() => parseSimpleReviewImport(importText), [importText]);
  const nextOpenRow = reviewSummary.openRows[0] || rows[0];
  const completedAnswerCount = rows.reduce((sum, row) => sum + row.completedIssueCount, 0);
  const remainingAnswerCount = rows.reduce((sum, row) => sum + row.remainingIssueCount, 0);
  const remainingArticleCheckCount = rows.reduce((sum, row) => sum + row.remainingArticleCheckCount, 0);
  const remainingClaimReviewCount = rows.reduce((sum, row) => sum + row.remainingClaimReviewCount, 0);

  return (
    <article className="wiki-article">
      <PageTitle title="Review" subtitle="Pick an article and answer what you can" />
      <div className="wiki-notice">
        Simple review mode: complete the article checks and any unresolved source-claim issues you know now. Saved answers
        disappear from the item page; unfinished answers stay open.
      </div>
      <section className="wiki-section wiki-review-box wiki-simple-review-start">
        <h2>What to do</h2>
        <ol>
          <li>Click one article below.</li>
          <li>Review the article checks and any unresolved claim bullets.</li>
          <li>Answer the checks or issues you know now.</li>
          <li>Use Pass when a whole-article check is acceptable.</li>
          <li>Use Not applicable only when that check truly does not apply.</li>
          <li>Use Remove item when the bullet should be deleted.</li>
          <li>Use Request article change when Codex or a maintainer needs to correct the article before the check can pass.</li>
          <li>Click Save completed answers. Unanswered issues stay open for later.</li>
        </ol>
        <div className="wiki-notice">
          Saving records review decisions in this browser and previews them on article pages. It does not permanently edit
          the Markdown source on Vercel until the review export is applied by Codex or a maintainer.
        </div>
        {nextOpenRow ? (
          <p className="wiki-inline-actions">
            <a href={`/wiki/review/item/${nextOpenRow.slug}`} onClick={makeNavigate(navigateTo, `/wiki/review/item/${nextOpenRow.slug}`)}>
              Review next open item
            </a>
          </p>
        ) : null}
      </section>
      <section className="wiki-section wiki-review-box wiki-simple-review-summary">
        <h2>Review results</h2>
        <table className="wiki-table">
          <tbody>
            <tr>
              <th>Open</th>
              <td>{reviewSummary.openCount} articles; {remainingAnswerCount} items left</td>
            </tr>
            <tr>
              <th>Open item types</th>
              <td>{remainingArticleCheckCount} article checks; {remainingClaimReviewCount} source claims</td>
            </tr>
            <tr>
              <th>Saved answers</th>
              <td>{completedAnswerCount}</td>
            </tr>
            <tr>
              <th>Ready</th>
              <td>{reviewSummary.readyCount}</td>
            </tr>
            <tr>
              <th>Change requests</th>
              <td>{reviewSummary.needsChangeCount}</td>
            </tr>
            <tr>
              <th>Next action</th>
              <td>{reviewSummary.nextAction}</td>
            </tr>
          </tbody>
        </table>
        <p className="wiki-inline-actions">
          <CopyButton text={buildSimpleReviewSummaryText(reviewSummary)}>Copy review results</CopyButton>
          <CopyButton text={reviewExportText}>Copy review export</CopyButton>
        </p>
      </section>
      <section className="wiki-section wiki-review-box wiki-simple-review-transfer">
        <h2>Import review results</h2>
        <label className="wiki-review-note-field">
          <span>Paste review export</span>
          <textarea
            value={importText}
            onChange={(event) => {
              setImportText(event.target.value);
              setImportMessage("");
            }}
            placeholder="Paste copied review export JSON here."
          />
        </label>
        <p className="wiki-small">
          {importText
            ? importPreview.ok
              ? `${importPreview.count} valid review record${importPreview.count === 1 ? "" : "s"} ready to import.`
              : importPreview.message
            : "No import pasted."}
        </p>
        <button
          type="button"
          className="wiki-button"
          disabled={!importPreview.ok || !importPreview.count}
          onClick={() => {
            if (!importPreview.ok) return;
            const next = { ...simpleReviews, ...importPreview.reviews };
            saveSimpleWikiReviews(next);
            setSimpleReviews(next);
            setImportMessage(`Imported ${importPreview.count} review record${importPreview.count === 1 ? "" : "s"}.`);
            setImportText("");
          }}
        >
          Import review results
        </button>
        {importMessage ? <div className="wiki-notice">{importMessage}</div> : null}
      </section>
      <section className="wiki-section">
        <h2>Review queue</h2>
        <p className="wiki-inline-actions">
          {[
            ["open", "Open"],
            ["progress", "In progress"],
            ["changes", "Change requests"],
            ["ready", "Ready"],
            ["all", "All"],
          ].map(([id, label]) => (
            <button key={id} type="button" className="wiki-small-button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </p>
        <table className="wiki-table">
          <thead>
            <tr>
              <th>Article</th>
              <th>Status</th>
              <th>Review state</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.slug}>
                <td>
                  <strong>{row.title}</strong>
                  <br />
                  <span className="wiki-small">{row.reviewTier}; {row.prepStatus}</span>
                </td>
                <td>{reviewStatusDisplayLabel(row.status)}</td>
                <td>
                  {row.remainingIssueCount} left; {row.completedIssueCount} saved.
                  <br />
                  <span className="wiki-small">{row.remainingArticleCheckCount} article check{row.remainingArticleCheckCount === 1 ? "" : "s"}; {row.remainingClaimReviewCount} source claim{row.remainingClaimReviewCount === 1 ? "" : "s"}. {reviewReasonDisplayText(row)}</span>
                </td>
                <td>
                  <a href={`/wiki/review/item/${row.slug}`} onClick={makeNavigate(navigateTo, `/wiki/review/item/${row.slug}`)}>
                    Review this item
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}

function SimpleReviewItemPage({ slug, navigateTo }) {
  const article = getArticleBySlug(slug);
  const issueArticle = wikiReviewIssues.find((row) => row.slug === slug);
  const issues = issueArticle?.issues || [];
  const [simpleReviews, setSimpleReviews] = useState(() => loadSimpleWikiReviews());
  const existing = normalizeSimpleReviewRecord(simpleReviews[slug], issues);
  const [issueDecisions, setIssueDecisions] = useState(existing.issues || {});
  const [reviewerName, setReviewerName] = useState(existing.reviewerName || "");
  const [reviewerRole, setReviewerRole] = useState(existing.reviewerRole || "Safety reviewer");
  const [saved, setSaved] = useState(false);
  const [lastSavedCount, setLastSavedCount] = useState(0);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [saveError, setSaveError] = useState("");
  const simpleRows = useMemo(() => buildSimpleReviewRows(wikiReviewIssues, simpleReviews), [simpleReviews]);
  const nextOpenRow = useMemo(
    () => simpleRows.find((row) => (row.remainingIssueCount > 0 || row.status === "Reviewed: needs changes") && row.slug !== slug),
    [simpleRows, slug],
  );

  if (!article || !issueArticle) return <NotFoundPage path={`/wiki/review/item/${slug}`} navigateTo={navigateTo} />;

  const activeIssueAnchor = getCurrentHash();
  const visibleIssues = issues.filter((issue) => !isCompleteSimpleReviewDecision(existing.issues?.[issue.id]) || issue.contextAnchor === activeIssueAnchor);
  const hasForgettableLocalReview = hasLocalSimpleReviewRecord(slug);
  const completedNowIssues = visibleIssues.filter((issue) => isCompleteSimpleReviewDecision(issueDecisions[issue.id] || {}));
  const unansweredIssues = visibleIssues.filter((issue) => !isRecognizedReviewAnswer(issueDecisions[issue.id]?.answer));
  const changeIssuesMissingNotes = visibleIssues.filter((issue) => {
    const decision = issueDecisions[issue.id] || {};
    return normalizeReviewAnswer(decision.answer) === "change" && !String(decision.note || "").trim();
  });
  const visibleArticleChecks = visibleIssues.filter((issue) => issue.issueType === "article-check").length;
  const visibleClaimIssues = visibleIssues.filter((issue) => issue.issueType === "claim-review").length;

  const saveReview = () => {
    setSaveAttempted(true);
    setSaveError("");
    if (!completedNowIssues.length) {
      setSaveError("Answer at least one issue before saving. Unanswered issues can stay open for later.");
      return;
    }
    const completedDecisions = filterCompleteSimpleReviewDecisions(issueDecisions, issues);
    const record = {
      slug,
      title: article.title,
      issues: completedDecisions,
      reviewerName: reviewerName.trim(),
      reviewerRole,
      reviewedAt: new Date().toISOString(),
      status: reviewStatusFromIssueDecisions(issues, completedDecisions),
    };
    const next = { ...simpleReviews, [slug]: record };
    try {
      saveSimpleWikiReviews(next);
    } catch {
      setSaveError("This browser blocked local saving. Copy the review export from the Review page after trying another browser or storage setting.");
      return;
    }
    setSimpleReviews(next);
    setLastSavedCount(completedNowIssues.length);
    setSaved(true);
  };

  const forgetSavedReview = () => {
    setSaveError("");
    try {
      const next = forgetLocalSimpleWikiReview(slug);
      setSimpleReviews(next);
      setIssueDecisions({});
      setReviewerName("");
      setReviewerRole("Safety reviewer");
      setSaved(false);
      setLastSavedCount(0);
      setSaveAttempted(false);
    } catch {
      setSaveError("This browser blocked local review cleanup. Clear site data for this page if the saved review should be removed.");
    }
  };

  return (
    <article className="wiki-article">
      <PageTitle title={`Review: ${article.title}`} subtitle={`${visibleIssues.length} item${visibleIssues.length === 1 ? "" : "s"} left: ${visibleArticleChecks} article check${visibleArticleChecks === 1 ? "" : "s"}, ${visibleClaimIssues} source claim${visibleClaimIssues === 1 ? "" : "s"}`} />
      <p className="wiki-inline-actions">
        <a href="/wiki/review" onClick={makeNavigate(navigateTo, "/wiki/review")}>Back to review list</a>
        <a href={`/wiki/articles/${slug}`} onClick={makeNavigate(navigateTo, `/wiki/articles/${slug}`)}>Read article</a>
      </p>
      <section className="wiki-section wiki-review-box wiki-simple-review-question">
        <h2>Review unresolved items</h2>
        {existing.status ? (
          <div className="wiki-notice">
            Current saved review: {reviewStatusDisplayLabel(existing.status)}
            {existing.reviewerRole ? ` (${[existing.reviewerName, existing.reviewerRole].filter(Boolean).join(", ")})` : ""}
          </div>
        ) : null}
        {hasForgettableLocalReview ? (
          <p className="wiki-inline-actions">
            <button className="wiki-small-button" type="button" onClick={forgetSavedReview}>
              Forget saved review for this article
            </button>
            <span className="wiki-small">Removes only this browser's saved answers for this article.</span>
          </p>
        ) : null}
        <p className="wiki-small">
          Answer the checks and issues you can answer now, then save. Saved answers disappear from this page. Anything unanswered stays here for later.
          Saved removals and wording-change requests are previewed on the article page, but the source Markdown still needs to be applied by Codex or a maintainer.
        </p>
        <div className="wiki-form-grid">
          <label>
            Reviewer name or initials
            <input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="Optional" />
          </label>
          <label>
            Reviewer role
            <select value={reviewerRole} onChange={(event) => setReviewerRole(event.target.value)}>
              <option>Safety reviewer</option>
              <option>Source/legal reviewer</option>
              <option>Field reviewer</option>
              <option>Plain-language editor</option>
              <option>Maintainer</option>
            </select>
          </label>
        </div>
        {visibleIssues.length ? (
          <ol className="wiki-review-issue-list">
            {visibleIssues.map((issue) => (
              <IssueReviewControl
                key={issue.id}
                issue={issue}
                value={issueDecisions[issue.id] || {}}
                showValidation={saveAttempted}
                navigateTo={navigateTo}
                onChange={(nextDecision) => {
                  setSaved(false);
                  setLastSavedCount(0);
                  setSaveError("");
                  setIssueDecisions((current) => ({ ...current, [issue.id]: nextDecision }));
                }}
              />
            ))}
          </ol>
        ) : (
          <div className="wiki-notice">All review issues for this article have saved answers in this browser.</div>
        )}
        {saveError ? (
          <div className="wiki-notice wiki-simple-review-error">Cannot save yet: {saveError}.</div>
        ) : visibleIssues.length ? (
          <p className="wiki-small">
            Save will store {completedNowIssues.length} completed answer{completedNowIssues.length === 1 ? "" : "s"} now.
            {unansweredIssues.length || changeIssuesMissingNotes.length ? (
              <> Left for later: {unansweredIssues.length} unanswered; {changeIssuesMissingNotes.length} change request{changeIssuesMissingNotes.length === 1 ? "" : "s"} without notes.</>
            ) : null}
          </p>
        ) : (
          <p className="wiki-small">There are no open issues left on this article in this browser.</p>
        )}
        <p className="wiki-inline-actions">
          <button className="wiki-button" type="button" onClick={saveReview}>Save completed answers</button>
          <a href={`/wiki/articles/${slug}`} onClick={makeNavigate(navigateTo, `/wiki/articles/${slug}`)}>Re-open article</a>
        </p>
        {saved ? (
          <div className="wiki-notice">
            Saved {lastSavedCount} completed answer{lastSavedCount === 1 ? "" : "s"}. Finished answers are removed from this review page; unfinished issues stay open.
            {nextOpenRow ? (
              <>
                {" "}
                <a href={`/wiki/review/item/${nextOpenRow.slug}`} onClick={makeNavigate(navigateTo, `/wiki/review/item/${nextOpenRow.slug}`)}>
                  Review next open item
                </a>.
              </>
            ) : (
              " No other open item is currently queued."
            )}
          </div>
        ) : null}
      </section>
    </article>
  );
}

function IssueReviewControl({ issue, value, onChange, showValidation = false, navigateTo }) {
  const answer = normalizeReviewAnswer(value.answer);
  const note = value.note || "";
  const [contextOpen, setContextOpen] = useState(false);
  const isArticleCheck = issue.issueType === "article-check";
  const missingAnswer = showValidation && !isRecognizedReviewAnswer(answer);
  const missingNote = showValidation && answer === "change" && !String(note || "").trim();
  const articleContextHref = `${issue.articlePath || `/wiki/articles/${issue.articleSlug}`}#${issue.contextAnchor}`;
  return (
    <li className={`wiki-review-issue-item ${isArticleCheck ? "wiki-review-article-check" : ""}`} id={issue.contextAnchor}>
      <p>
        <strong>{issue.sectionTitle || formatReviewSectionName(issue.section)}:</strong> {issue.statement}
      </p>
      <p className="wiki-inline-actions wiki-review-context-actions">
        <button type="button" className="wiki-small-button" onClick={() => setContextOpen((current) => !current)}>
          {contextOpen ? "Hide context" : "Show context"}
        </button>
        <a href={articleContextHref} onClick={makeNavigate(navigateTo, articleContextHref)}>Open in article</a>
      </p>
      {contextOpen ? (
        <div className="wiki-review-context-preview">
          <p className="wiki-small"><b>Article context:</b> {issue.articleTitle} / {issue.sectionTitle || formatReviewSectionName(issue.section)}</p>
          {issue.beforeText ? <p className="wiki-review-context-nearby"><span>Before:</span> {issue.beforeText}</p> : null}
          <p className="wiki-review-context-current"><span>Current:</span> {issue.statement}</p>
          {issue.afterText ? <p className="wiki-review-context-nearby"><span>After:</span> {issue.afterText}</p> : null}
        </div>
      ) : null}
      <p className="wiki-small"><b>Question:</b> {reviewIssueQuestionText(issue)}</p>
      <p className="wiki-small"><b>{isArticleCheck ? "Why this is required" : "Why AI left this for review"}:</b> {issue.reason}</p>
      {issue.citations?.length ? (
        <p className="wiki-small">
          <b>Source:</b>{" "}
          {issue.citations.map((citation, index) => (
            <span key={citation.id}>
              {index ? ", " : ""}
              {citation.url ? <a href={citation.url}>{citation.id}</a> : citation.id}
            </span>
          ))}
        </p>
      ) : null}
      <div className="wiki-review-preset-grid">
        <button type="button" className={`wiki-review-preset ${answer === "yes" ? "active" : ""}`} onClick={() => onChange({ answer: "yes", note: "" })}>
          <strong>{isArticleCheck ? "Pass" : "Yes, keep it"}</strong>
          <span>{isArticleCheck ? "This whole-article check passes." : "This wording is correct enough to keep."}</span>
        </button>
        <button type="button" className={`wiki-review-preset ${answer === "change" ? "active" : ""}`} onClick={() => onChange({ answer: "change", note })}>
          <strong>{isArticleCheck ? "Request article change" : "Change wording"}</strong>
          <span>{isArticleCheck ? "Ask Codex or a maintainer to correct the article before this check passes." : "Keep the topic, but rewrite this item."}</span>
        </button>
        {isArticleCheck ? (
          <button type="button" className={`wiki-review-preset ${answer === "na" ? "active" : ""}`} onClick={() => onChange({ answer: "na", note: "" })}>
            <strong>Not applicable</strong>
            <span>This check does not apply to this article.</span>
          </button>
        ) : (
          <button type="button" className={`wiki-review-preset danger ${answer === "remove" ? "active" : ""}`} onClick={() => onChange({ answer: "remove", note })}>
            <strong>Remove item</strong>
            <span>Delete this bullet or sentence from the article.</span>
          </button>
        )}
      </div>
      {answer === "change" ? (
        <label className="wiki-review-note-field">
          <span>{isArticleCheck ? "What should Codex or a maintainer change?" : "What should it say instead?"}</span>
          <textarea value={note} onChange={(event) => onChange({ answer: "change", note: event.target.value })} placeholder={isArticleCheck ? "Write the article problem or correction needed before this check can pass." : "Write the exact replacement wording or correction needed."} />
        </label>
      ) : null}
      {answer === "remove" ? (
        <label className="wiki-review-note-field">
          <span>Why remove it? Optional.</span>
          <textarea value={note} onChange={(event) => onChange({ answer: "remove", note: event.target.value })} placeholder="Optional reason for deleting this item." />
        </label>
      ) : null}
      {missingAnswer ? <p className="wiki-small wiki-simple-review-error">Choose {isArticleCheck ? "Pass, Request article change, or Not applicable" : "Keep, Change wording, or Remove item"} for this item.</p> : null}
      {missingNote ? <p className="wiki-small wiki-simple-review-error">Write the requested correction before saving this change request.</p> : null}
    </li>
  );
}

function ArticleIndex({ navigateTo }) {
  return (
    <article className="wiki-article">
      <PageTitle title="Article index" subtitle={`${wikiArticles.length} draft wiki articles`} />
      <ArticleList articles={[...wikiArticles].sort((a, b) => a.title.localeCompare(b.title))} navigateTo={navigateTo} />
    </article>
  );
}

function CategoriesPage({ navigateTo }) {
  return (
    <article className="wiki-article">
      <PageTitle title="Categories" subtitle="Browse by construction safety area" />
      {wikiCategories.map((category) => (
        <section className="wiki-section" id={category.id} key={category.id}>
          <h2>{category.title}</h2>
          <p>{category.description}</p>
          <ArticleList articles={articlesForCategory(category)} navigateTo={navigateTo} compact />
        </section>
      ))}
    </article>
  );
}

function CategoryPage({ categoryId, navigateTo }) {
  const category = wikiCategories.find((item) => item.id === categoryId);
  if (!category) return <NotFoundPage path={`/wiki/categories/${categoryId}`} navigateTo={navigateTo} />;
  return (
    <article className="wiki-article">
      <PageTitle title={category.title} subtitle="Category page" />
      <p>{category.description}</p>
      <ArticleList articles={articlesForCategory(category)} navigateTo={navigateTo} empty="No articles in this category yet." />
    </article>
  );
}

function SourcesPage() {
  return (
    <article className="wiki-article">
      <PageTitle title="Sources" subtitle="Official source hierarchy and source registry" />
      <section className="wiki-section">
        <h2>Source hierarchy</h2>
        <ol>{sourceHierarchy.map((source) => <li key={source}>{source}</li>)}</ol>
      </section>
      <section className="wiki-section">
        <h2>Source registry</h2>
        <table className="wiki-table">
          <thead><tr><th>Source</th><th>Publisher</th><th>Type</th><th>Priority</th></tr></thead>
          <tbody>
            {wikiSources.map((source) => (
              <tr key={source.id}>
                <td><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></td>
                <td>{source.publisher}</td>
                <td>{source.type}</td>
                <td>{source.priority}</td>
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
      <PageTitle title="Source notes" subtitle={`${wikiSourceNotes.length} source-note records`} />
      <table className="wiki-table">
        <thead><tr><th>Source note</th><th>Publisher</th><th>Last checked</th><th>Related articles</th></tr></thead>
        <tbody>
          {wikiSourceNotes.map((note) => (
            <tr key={note.id}>
              <td><a href={`/wiki/source-notes/${note.id}`} onClick={makeNavigate(navigateTo, `/wiki/source-notes/${note.id}`)}>{note.title}</a></td>
              <td>{note.publisher}</td>
              <td>{note.lastChecked}</td>
              <td>{note.relatedArticles?.length || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function SourceNotePage({ id, navigateTo }) {
  const note = getSourceNoteById(id);
  if (!note) return <NotFoundPage path={`/wiki/source-notes/${id}`} navigateTo={navigateTo} />;
  return (
    <article className="wiki-article">
      <PageTitle title={note.title} subtitle={`${note.publisher}; last checked ${note.lastChecked || "unknown"}`} />
      <p>{note.summary}</p>
      <p><a href={note.url} target="_blank" rel="noreferrer">Open official source</a></p>
      <section className="wiki-section">
        <h2>Related articles</h2>
        <ArticleList articles={(note.relatedArticles || []).map(getArticleBySlug).filter(Boolean)} navigateTo={navigateTo} compact />
      </section>
    </article>
  );
}

function GlossaryPage({ navigateTo }) {
  return (
    <article className="wiki-article">
      <PageTitle title="Glossary" subtitle={`${glossaryTerms.length} linked terms`} />
      <table className="wiki-table">
        <thead><tr><th>Term</th><th>Definition</th><th>Article</th></tr></thead>
        <tbody>
          {glossaryTerms.map((term) => {
            const article = getArticleBySlug(term.targetArticle);
            return (
              <tr key={term.slug}>
                <td><a href={`/wiki/glossary/${term.slug}`} onClick={makeNavigate(navigateTo, `/wiki/glossary/${term.slug}`)}>{term.term}</a></td>
                <td>{term.definition}</td>
                <td>{article ? <a href={`/wiki/articles/${article.slug}`} onClick={makeNavigate(navigateTo, `/wiki/articles/${article.slug}`)}>{article.title}</a> : term.targetArticle}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}

function GlossaryTermPage({ slug, navigateTo }) {
  const term = glossaryTerms.find((item) => item.slug === slug);
  if (!term) return <NotFoundPage path={`/wiki/glossary/${slug}`} navigateTo={navigateTo} />;
  const article = getArticleBySlug(term.targetArticle);
  return (
    <article className="wiki-article">
      <PageTitle title={term.term} subtitle="Glossary term" />
      <p>{term.definition}</p>
      {article ? (
        <p><a href={`/wiki/articles/${article.slug}`} onClick={makeNavigate(navigateTo, `/wiki/articles/${article.slug}`)}>Read {article.title}</a></p>
      ) : null}
    </article>
  );
}

function RedirectsPage({ navigateTo }) {
  return (
    <article className="wiki-article">
      <PageTitle title="Redirects" subtitle={`${wikiRedirects.length} worker-language redirects`} />
      <table className="wiki-table">
        <thead><tr><th>Worker term</th><th>Redirect</th></tr></thead>
        <tbody>
          {wikiRedirects.map((redirect) => {
            const article = getArticleBySlug(redirect.to);
            return (
              <tr key={`${redirect.from}-${redirect.to}`}>
                <td>{redirect.term || redirect.from}</td>
                <td>{article ? <a href={`/wiki/articles/${article.slug}`} onClick={makeNavigate(navigateTo, `/wiki/articles/${article.slug}`)}>{article.title}</a> : redirect.to}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}

function ArticleQualityPage({ navigateTo }) {
  return (
    <article className="wiki-article">
      <PageTitle title="Article quality" subtitle="Generated quality and source coverage" />
      <section className="wiki-section">
        <h2>Coverage summary</h2>
        <ul className="wiki-inline-list">
          <li><b>Articles</b>: {wikiArticles.length}</li>
          <li><b>Metrics</b>: {wikiQualityMetrics.length}</li>
          <li><b>Tier 1 citation gaps</b>: {wikiSourceCoverage.weakTierOne?.length || 0}</li>
          <li><b>Tier 2 citation gaps</b>: {wikiSourceCoverage.weakTierTwo?.length || 0}</li>
        </ul>
      </section>
      <table className="wiki-table">
        <thead><tr><th>Article</th><th>Tier</th><th>Citations</th><th>Source flags</th><th>Links</th><th>Tools</th></tr></thead>
        <tbody>
          {wikiQualityMetrics.map((metric) => (
            <tr key={metric.slug}>
              <td><a href={`/wiki/articles/${metric.slug}`} onClick={makeNavigate(navigateTo, `/wiki/articles/${metric.slug}`)}>{metric.title}</a></td>
              <td>{metric.reviewTier}</td>
              <td>{metric.exactCitationCount}</td>
              <td>{metric.sourceReviewFlagCount}</td>
              <td>{metric.outboundLinkCount} out / {metric.inboundLinkCount} in</td>
              <td>{metric.relatedToolCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function RoadmapPage({ navigateTo }) {
  const phases = [...new Set(articleRoadmap.map((item) => item.phase))];
  return (
    <article className="wiki-article">
      <PageTitle title="Roadmap" subtitle="Review and completion roadmap" />
      {phases.map((phase) => (
        <section className="wiki-section" key={phase}>
          <h2>{phase}</h2>
          <table className="wiki-table">
            <thead><tr><th>#</th><th>Article</th><th>Status</th></tr></thead>
            <tbody>
              {getRoadmapByPhase(phase).map((item) => {
                const article = getArticleBySlug(item.slug);
                return (
                  <tr key={item.slug}>
                    <td>{item.order}</td>
                    <td>{article ? <a href={`/wiki/articles/${article.slug}`} onClick={makeNavigate(navigateTo, `/wiki/articles/${article.slug}`)}>{article.title}</a> : item.title}</td>
                    <td>{item.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </article>
  );
}

function ReviewBacklogPage({ navigateTo }) {
  const backlog = getWikiReviewBacklog();
  const rows = [
    ["Source review flags", backlog.sourceReview],
    ["Weak Tier 1 citations", backlog.weakCitations],
    ["Oldest review dates", backlog.oldestReview?.slice(0, 20)],
    ["Low backlinks", backlog.lowBacklinks],
    ["Ready with flags", backlog.readyWithFlags],
  ];
  return (
    <article className="wiki-article">
      <PageTitle title="Review backlog" subtitle="Simple article review backlog" />
      {rows.map(([title, articles]) => (
        <section className="wiki-section" key={title}>
          <h2>{title}</h2>
          <ArticleList articles={articles || []} navigateTo={navigateTo} compact empty="No articles in this group." />
        </section>
      ))}
    </article>
  );
}

function CorrectionsPage() {
  return (
    <article className="wiki-article">
      <PageTitle title="Corrections" subtitle="Public correction flow draft" />
      <p>Use article-level correction forms to report broken links, unclear wording, source issues, unsafe suggestions, or outdated regulation references.</p>
      <p>This prototype does not submit corrections to a backend yet.</p>
    </article>
  );
}

function GovernancePage() {
  return (
    <article className="wiki-article">
      <PageTitle title="Governance" subtitle="Trust and review rules" />
      <SimpleList items={governanceModel} />
    </article>
  );
}

function TechnicalPage() {
  return (
    <article className="wiki-article">
      <PageTitle title="Technical plan" subtitle="Implementation model" />
      <section className="wiki-section"><h2>Recommendation</h2><ObjectList rows={technicalRecommendation} /></section>
      <section className="wiki-section"><h2>Database schema</h2><pre>{databaseSchema}</pre></section>
      <section className="wiki-section"><h2>Content structure</h2><pre>{contentStructure}</pre></section>
      <section className="wiki-section"><h2>Article template</h2><SimpleList items={articleTemplate} /></section>
      <section className="wiki-section"><h2>Linking model</h2><SimpleList items={linkingModel} /></section>
      <section className="wiki-section"><h2>Search strategy</h2><SimpleList items={searchStrategy} /></section>
      <section className="wiki-section"><h2>Content pipeline</h2><SimpleList items={contentCreationPipeline} /></section>
      <section className="wiki-section"><h2>Build phases</h2><ObjectList rows={buildPhases} /></section>
      <section className="wiki-section"><h2>Codex tasks</h2><SimpleList items={codexExecutionTasks} /></section>
      <section className="wiki-section"><h2>Synonyms</h2><ObjectList rows={synonymIndex.slice(0, 80)} /></section>
    </article>
  );
}

function ReviewBox({ article, effectiveReviewState }) {
  return (
    <section className="wiki-section wiki-review-box" id="review-status">
      <h2>Review status</h2>
      <table className="wiki-table">
        <tbody>
          <tr><th>Article status</th><td>{effectiveReviewState?.displayMaturity || article.maturity || "Draft"}</td></tr>
          <tr><th>Review tracker</th><td>{effectiveReviewState?.status || "Needs review"}</td></tr>
          <tr><th>Saved review source</th><td>{effectiveReviewState?.reviewSourceLabel || "No saved review"}</td></tr>
          <tr><th>Markdown maturity</th><td>{article.maturity || "Draft"}</td></tr>
          <tr><th>Review tier</th><td>{article.reviewTier || "Tier 3"}</td></tr>
          <tr><th>Review priority</th><td>{article.reviewPriority || "Support/reference review"}</td></tr>
          <tr><th>AI prep status</th><td>{article.prepStatus || "Needs AI prep"}{article.prepReviewedDate ? `; prepped ${article.prepReviewedDate}` : ""}</td></tr>
          <tr><th>Legal/source review</th><td>{effectiveReviewState?.isReadyForPublicUse ? "Source checked by completed review" : article.review?.legalReviewStatus || "Needs qualified review"}</td></tr>
          <tr><th>Safety review</th><td>{effectiveReviewState?.isReadyForPublicUse ? "Safety reviewed by completed review" : article.review?.safetyReviewStatus || "Needs field review"}</td></tr>
          <tr><th>Open source flags</th><td>{article.sourceReviewFlagCount || 0}</td></tr>
        </tbody>
      </table>
    </section>
  );
}

function ArticleSimpleReviewStatus({ article, record, issueCount, navigateTo, effectiveReviewState }) {
  const status = effectiveReviewState?.status || record?.status || "Needs review";
  const savedIssueCount = Object.values(record?.issues || {}).filter(isCompleteSimpleReviewDecision).length;
  const remainingIssueCount = Math.max(issueCount - savedIssueCount, 0);
  const reviewEdits = Object.entries(record?.issues || {})
    .filter(([, decision]) => isNeedsChangeDecision(decision))
    .map(([issueId, decision]) => ({ issueId, decision: normalizeSimpleReviewDecision(decision) }));
  const removeCount = reviewEdits.filter(({ decision }) => decision.answer === "remove").length;
  const changeCount = reviewEdits.filter(({ decision }) => decision.answer === "change").length;
  return (
    <section className="wiki-section wiki-review-box wiki-article-simple-review-status" id="simple-review-result">
      <h2>Simple review result</h2>
      <table className="wiki-table">
        <tbody>
          <tr><th>Status</th><td>{reviewStatusDisplayLabel(status)}</td></tr>
          <tr><th>Public status</th><td>{effectiveReviewState?.displayMaturity || "Draft"}</td></tr>
          <tr><th>Items left</th><td>{remainingIssueCount}</td></tr>
          <tr><th>Saved answers</th><td>{savedIssueCount}</td></tr>
          {reviewEdits.length ? <tr><th>Requested article edits</th><td>{changeCount} change request{changeCount === 1 ? "" : "s"}; {removeCount} removal{removeCount === 1 ? "" : "s"}</td></tr> : null}
        </tbody>
      </table>
      {reviewEdits.length ? (
        <div className="wiki-notice">
          This article is showing saved review decisions. Removed items are hidden in this browser, and wording-change requests are shown as pending notes. The Markdown source still needs Codex or a maintainer to apply the review export.
        </div>
      ) : effectiveReviewState?.isReadyForPublicUse ? (
        <div className="wiki-notice">
          This article has completed all generated review checks and has no open source-review flags.
          {effectiveReviewState.isRepoBackedReady ? " This public status comes from repo-backed review results." : " This status is local to this browser until the review export is applied to the repo and deployed."}
        </div>
      ) : null}
      {reviewEdits.length ? (
        <ul className="wiki-review-edit-list">
          {reviewEdits.map(({ issueId, decision }) => (
            <li key={issueId}>
              <b>{reviewAnswerLabel(decision)}:</b> {issueId}
              {decision.note ? ` - ${decision.note}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="wiki-inline-actions">
        <a href={`/wiki/review/item/${article.slug}`} onClick={makeNavigate(navigateTo, `/wiki/review/item/${article.slug}`)}>Open article review</a>
        <a href="/wiki/review" onClick={makeNavigate(navigateTo, "/wiki/review")}>Open review queue</a>
      </p>
    </section>
  );
}

function DraftBlockersSection({ blockers }) {
  return (
    <section className="wiki-section wiki-review-box" id="why-this-is-still-draft">
      <h2>Why this is still Draft</h2>
      <SimpleList items={blockers.length ? blockers : ["No generated draft blockers."]} />
    </section>
  );
}

function articleDisclaimerText(effectiveReviewState) {
  if (effectiveReviewState?.isRepoBackedReady) {
    return "Plain-language safety information for BC construction. It is not legal advice, engineering advice, medical advice, occupational hygiene approval, or proof of WorkSafeBC compliance.";
  }
  return "This article is a draft plain-language aid. It is not legal advice, engineering advice, medical advice, occupational hygiene approval, or proof of WorkSafeBC compliance.";
}

function HumanReviewQuestionsSection({ article, navigateTo, reviewRecord }) {
  const questions = article.humanReviewQuestions || article.reviewQuestions || [];
  if (!questions.length) return null;
  return (
    <section className="wiki-section wiki-review-box" id="what-a-human-reviewer-must-verify">
      <h2>What a human reviewer must verify</h2>
      <ol className="wiki-human-review-checklist">
        {questions.map((question, index) => {
          const itemIndex = index + 1;
          const issueId = humanReviewIssueId(article.slug, itemIndex);
          const anchor = humanReviewAnchor(article.slug, itemIndex);
          const decision = getSavedIssueDecision(reviewRecord, issueId);
          return (
            <li key={issueId} id={anchor} className={reviewDecisionClassName(decision)}>
              <p><b>{humanReviewLabel(question, itemIndex)}:</b> {humanReviewQuestionBody(question, itemIndex)}</p>
              <p className="wiki-small">
                <b>Status:</b> {reviewAnswerLabel(decision) || "Not reviewed"}
                {decision?.note ? ` - ${decision.note}` : ""}
              </p>
              <p className="wiki-inline-actions">
                <a href={`/wiki/review/item/${article.slug}#${anchor}`} onClick={makeNavigate(navigateTo, `/wiki/review/item/${article.slug}#${anchor}`)}>
                  Review this check
                </a>
              </p>
              <PendingReviewDecision decision={decision} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ArticleSection({ title, items, navigateTo, ordered = false, articleSlug = "", sectionKey = "", reviewRecord = null }) {
  if (!items?.length) return null;
  const List = ordered ? "ol" : "ul";
  const renderedItems = items
    .map((item, index) => {
      const issueId = reviewIssueId(articleSlug, sectionKey, index + 1);
      const decision = getSavedIssueDecision(reviewRecord, issueId);
      if (isRemoveDecision(decision)) return null;
      return (
        <li key={`${sectionKey}-${index}`} id={articleSlug && sectionKey ? reviewIssueAnchor(articleSlug, sectionKey, index + 1) : undefined} className={reviewDecisionClassName(decision)}>
          <RichText
            text={item}
            navigateTo={navigateTo}
            reviewHref={articleSlug && sectionKey ? `/wiki/review/item/${articleSlug}#${reviewIssueAnchor(articleSlug, sectionKey, index + 1)}` : ""}
          />
          <PendingReviewDecision decision={decision} />
        </li>
      );
    })
    .filter(Boolean);
  if (!renderedItems.length) return null;
  return (
    <section className="wiki-section" id={anchorFor(title)}>
      <h2>{title}</h2>
      <List>{renderedItems}</List>
    </section>
  );
}

function ChecklistSection({ title, items, navigateTo, articleSlug = "", sectionKey = "", reviewRecord = null }) {
  if (!items?.length) return null;
  const renderedItems = items
    .map((item, index) => {
      const issueId = reviewIssueId(articleSlug, sectionKey, index + 1);
      const decision = getSavedIssueDecision(reviewRecord, issueId);
      if (isRemoveDecision(decision)) return null;
      return (
        <li key={`${sectionKey}-${index}`} id={articleSlug && sectionKey ? reviewIssueAnchor(articleSlug, sectionKey, index + 1) : undefined} className={reviewDecisionClassName(decision)}>
          <span aria-hidden="true" />{" "}
          <RichText
            text={item}
            navigateTo={navigateTo}
            reviewHref={articleSlug && sectionKey ? `/wiki/review/item/${articleSlug}#${reviewIssueAnchor(articleSlug, sectionKey, index + 1)}` : ""}
          />
          <PendingReviewDecision decision={decision} />
        </li>
      );
    })
    .filter(Boolean);
  if (!renderedItems.length) return null;
  return (
    <section className="wiki-section wiki-checklist" id={anchorFor(title)}>
      <h2>{title}</h2>
      <ul>{renderedItems}</ul>
    </section>
  );
}

function PendingReviewDecision({ decision }) {
  const normalized = normalizeSimpleReviewDecision(decision);
  if (!normalized || normalized.answer === "yes" || normalized.answer === "na") return null;
  const isRemoval = normalized.answer === "remove";
  return (
    <div className={`wiki-pending-review-edit ${isRemoval ? "remove" : "change"}`}>
      <b>{isRemoval ? "Reviewer marked for removal" : "Reviewer change requested"}:</b>{" "}
      {normalized.note || (isRemoval ? "Delete this item from the article." : "Rewrite this item before publication.")}
    </div>
  );
}

function RelatedTopics({ article, navigateTo }) {
  return (
    <section className="wiki-section" id="related-topics">
      <h2>Related topics</h2>
      <ArticleList articles={(article.related || []).map(getArticleBySlug).filter(Boolean)} navigateTo={navigateTo} compact />
    </section>
  );
}

function RelatedFieldTools({ article }) {
  const groups = [
    ["Toolbox talks", article.relatedToolboxTalks || [], "/safety-lab/toolbox-talks"],
    ["Checklists", article.relatedChecklists || [], "/safety-lab/checklists"],
    ["Quizzes", article.relatedQuizzes || [], "/training-quiz"],
    ["Forms", article.relatedForms || [], "/safety-lab/forms"],
  ].filter(([, items]) => items.length);
  return (
    <section className="wiki-section" id="related-field-tools">
      <h2>Related field tools</h2>
      {groups.map(([title, items, href]) => (
        <p key={title}>
          <b>{title}:</b> {items.join(", ")} <a href={href}>open</a>
        </p>
      ))}
    </section>
  );
}

function Backlinks({ article, navigateTo }) {
  return (
    <section className="wiki-section" id="pages-that-link-here">
      <h2>Pages that link here</h2>
      <ArticleList articles={(article.backlinks || []).map((backlink) => getArticleBySlug(backlink.slug)).filter(Boolean)} navigateTo={navigateTo} compact />
    </section>
  );
}

function OfficialSources({ article }) {
  const refs = [...(article.regulationRefs || []), ...(article.sourceIds || [])];
  return (
    <section className="wiki-section" id="official-sources">
      <h2>Official sources</h2>
      <ul>
        {refs.map((id) => {
          const ref = getRegulationById(id) || getSourceById(id) || getCitationById(id);
          return ref ? (
            <li key={id}>
              <a href={ref.url} target="_blank" rel="noreferrer">{ref.title || ref.instrument || id}</a>
              {ref.publisher ? <span className="wiki-small"> ({ref.publisher})</span> : null}
            </li>
          ) : (
            <li key={id}>{id}</li>
          );
        })}
      </ul>
    </section>
  );
}

function OfficialCitations({ citations }) {
  return (
    <section className="wiki-section" id="official-citations">
      <h2>Official citations</h2>
      <ul>
        {citations.map((citation) => (
          <li key={citation.id}>
            {citation.url ? <a href={citation.url} target="_blank" rel="noreferrer">{citation.title}</a> : citation.title}
            <span className="wiki-small"> {citation.publisher}{citation.locator ? ` - ${citation.locator}` : ""}</span>
          </li>
        ))}
      </ul>
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
            <a href={`/wiki/source-notes/${note.id}`} onClick={makeNavigate(navigateTo, `/wiki/source-notes/${note.id}`)}>{note.title}</a>
            <span className="wiki-small"> ({note.publisher}; checked {note.lastChecked || "unknown"})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticleQualitySection({ article, qualityMetric }) {
  const checklist = getArticleReviewChecklist(article);
  return (
    <section className="wiki-section" id="article-quality">
      <h2>Article quality</h2>
      {qualityMetric ? (
        <table className="wiki-table">
          <tbody>
            <tr><th>Exact citations</th><td>{qualityMetric.exactCitationCount}</td></tr>
            <tr><th>Source flags</th><td>{qualityMetric.sourceReviewFlagCount}</td></tr>
            <tr><th>Links</th><td>{qualityMetric.outboundLinkCount} out / {qualityMetric.inboundLinkCount} in</td></tr>
            <tr><th>Related tools</th><td>{qualityMetric.relatedToolCount}</td></tr>
            <tr><th>Word count</th><td>{qualityMetric.wordCount}</td></tr>
          </tbody>
        </table>
      ) : null}
      <ul>
        {checklist.map((item) => (
          <li key={item.id}>
            <b>{item.label}:</b> {item.complete ? "OK" : "Needs work"} - {item.detail}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CorrectionForm({ article }) {
  return (
    <section className="wiki-section" id="report-an-issue-with-this-article">
      <h2>Report an issue with this article</h2>
      <p className="wiki-small">Prototype only. This does not submit to a backend yet.</p>
      <form className="wiki-correction-form">
        <input type="hidden" value={article.slug} readOnly />
        <label>Issue type <select><option>Source issue</option><option>Broken link</option><option>Unclear wording</option><option>Unsafe suggestion</option><option>Outdated regulation</option></select></label>
        <label>What should be checked? <textarea placeholder="Describe the issue." /></label>
      </form>
    </section>
  );
}

function VersionHistory({ article }) {
  return (
    <section className="wiki-section" id="version-history">
      <h2>Version history</h2>
      <table className="wiki-table">
        <tbody>
          <tr><th>Last reviewed</th><td>{article.review?.lastReviewed || "not reviewed"}</td></tr>
          <tr><th>Next review</th><td>{article.review?.nextReview || "not scheduled"}</td></tr>
          <tr><th>Legal/source review</th><td>{article.review?.legalReviewStatus || "Needs qualified review"}</td></tr>
          <tr><th>Safety review</th><td>{article.review?.safetyReviewStatus || "Needs field review"}</td></tr>
        </tbody>
      </table>
      <SimpleList items={article.versionHistory || []} />
    </section>
  );
}

function SearchFilters({ filters, setFilters }) {
  const options = getWikiFilterOptions();
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  return (
    <section className="wiki-section wiki-search-filters" aria-label="Search filters">
      <h2>Filters</h2>
      <div className="wiki-filter-grid">
        <FilterSelect label="Hazard group" value={filters.hazardGroup} options={options.hazardGroups} onChange={(value) => updateFilter("hazardGroup", value)} />
        <FilterSelect label="Trade" value={filters.trade} options={options.trades} onChange={(value) => updateFilter("trade", value)} />
        <FilterSelect label="Document group" value={filters.documentGroup} options={options.documentGroups} onChange={(value) => updateFilter("documentGroup", value)} />
      </div>
      {hasActiveFilters(filters) ? <button className="wiki-small-button" type="button" onClick={() => setFilters(emptyFilters())}>Clear filters</button> : null}
    </section>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="wiki-filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function RichText({ text, navigateTo, reviewHref = "" }) {
  const parts = String(text || "").split(/(\[\[[^\]]+\]\]|\{\{cite:[^}]+\}\}|\{\{review:source\}\})/g);
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
        <a key={`${part}-${index}`} href={`/wiki/articles/${targetSlug}`} onClick={makeNavigate(navigateTo, `/wiki/articles/${targetSlug}`)}>{label}</a>
      ) : (
        <span className="wiki-missing-link" key={`${part}-${index}`}>{label}</span>
      );
    }
    const citationMatch = part.match(/^\{\{cite:([^}]+)\}\}$/);
    if (citationMatch) {
      const citation = getCitationById(citationMatch[1].trim());
      return citation?.url ? (
        <sup className="wiki-citation" key={`${part}-${index}`}><a href={citation.url} target="_blank" rel="noreferrer" title={citation.title}>[{citation.id}]</a></sup>
      ) : (
        <sup className="wiki-citation missing" key={`${part}-${index}`}>[{citationMatch[1].trim()}]</sup>
      );
    }
    if (part === "{{review:source}}") {
      return reviewHref ? (
        <a className="wiki-source-review" key={`${part}-${index}`} href={reviewHref} onClick={makeNavigate(navigateTo, reviewHref)}>source review needed</a>
      ) : (
        <span className="wiki-source-review" key={`${part}-${index}`}>source review needed</span>
      );
    }
    return part;
  });
}

function ArticleList({ articles, compact = false, empty = "No articles.", navigateTo }) {
  if (!articles.length) return <p>{empty}</p>;
  return (
    <ul className={compact ? "wiki-article-list compact" : "wiki-article-list"}>
      {articles.map((article) => (
        <li key={article.slug}>
          <a href={`/wiki/articles/${article.slug}`} onClick={makeNavigate(navigateTo, `/wiki/articles/${article.slug}`)}>{article.title}</a>
          {compact ? null : <p>{article.searchSnippet || stripReviewMarkup(article.summary || "")}</p>}
        </li>
      ))}
    </ul>
  );
}

function TableOfContents({ items }) {
  return (
    <nav className="wiki-toc" aria-label="Contents">
      <h2>Contents</h2>
      <ol>{items.map((item) => <li key={item}><a href={`#${anchorFor(item)}`}>{item}</a></li>)}</ol>
    </nav>
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

function NotFoundPage({ path, navigateTo }) {
  return (
    <article className="wiki-article">
      <PageTitle title="Page not found" subtitle="BC Construction Safety Wiki" />
      <p>No wiki page exists at {path}.</p>
      <p><a href="/wiki" onClick={navigateTo ? makeNavigate(navigateTo, "/wiki") : undefined}>Return to the main page</a></p>
    </article>
  );
}

function SimpleList({ items }) {
  return <ul>{(items || []).map((item) => <li key={String(item)}>{String(item)}</li>)}</ul>;
}

function ObjectList({ rows }) {
  return (
    <ul>
      {(rows || []).map((row, index) => (
        <li key={row.id || row.title || row.stack || row.term || index}>
          {Object.entries(row).map(([key, value]) => (
            <span key={key}>
              <b>{key}</b>: {Array.isArray(value) ? value.join(", ") : String(value)}{" "}
            </span>
          ))}
        </li>
      ))}
    </ul>
  );
}

function CopyButton({ text, children }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="wiki-small-button"
      onClick={async () => {
        await navigator.clipboard?.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : children}
    </button>
  );
}

function articlesForCategory(category) {
  const topicSlugs = new Set((category.topics || []).map((topic) => anchorFor(topic)));
  return wikiArticles
    .filter((article) => article.category === category.title || article.category === category.id || topicSlugs.has(article.slug))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function emptyFilters() {
  return { hazardGroup: "", trade: "", documentGroup: "" };
}

function getInitialFilters() {
  if (typeof window === "undefined") return emptyFilters();
  const params = new URLSearchParams(window.location.search);
  return {
    hazardGroup: params.get("hazardGroup") || params.get("hazard") || "",
    trade: params.get("trade") || "",
    documentGroup: params.get("documentGroup") || params.get("document") || "",
  };
}

function getInitialSearch() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("search") || "";
}

function hasActiveFilters(filters) {
  return Object.values(filters).some(Boolean);
}

function loadSimpleWikiReviews() {
  const repoBackedReviews = wikiSimpleReviews || {};
  if (typeof window === "undefined") return repoBackedReviews;
  return { ...repoBackedReviews, ...loadLocalSimpleWikiReviews() };
}

function loadLocalSimpleWikiReviews() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem("wiki-simple-review-results");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSimpleWikiReviews(reviews) {
  if (typeof window === "undefined") return;
  const localReviews = {};
  for (const [slug, record] of Object.entries(reviews || {})) {
    if (isSameSimpleReviewRecord(record, wikiSimpleReviews?.[slug])) continue;
    localReviews[slug] = record;
  }
  saveLocalSimpleWikiReviews(localReviews);
}

function saveLocalSimpleWikiReviews(reviews) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("wiki-simple-review-results", JSON.stringify(reviews || {}));
}

function forgetLocalSimpleWikiReview(slug) {
  const localReviews = loadLocalSimpleWikiReviews();
  delete localReviews[slug];
  saveLocalSimpleWikiReviews(localReviews);
  return loadSimpleWikiReviews();
}

function hasLocalSimpleReviewRecord(slug) {
  if (!slug || typeof window === "undefined") return false;
  return Boolean(loadLocalSimpleWikiReviews()?.[slug]);
}

function isSameSimpleReviewRecord(left, right) {
  if (!left || !right) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildSimpleReviewExportText(reviews) {
  return JSON.stringify({ type: "bc-construction-safety-wiki-simple-review-results", version: 2, exportedAt: new Date().toISOString(), reviews }, null, 2);
}

function parseSimpleReviewImport(text) {
  if (!text.trim()) return { ok: false, message: "No import pasted.", reviews: {}, count: 0 };
  try {
    const parsed = JSON.parse(text);
    if (parsed?.type !== "bc-construction-safety-wiki-simple-review-results" || ![1, 2].includes(parsed?.version)) {
      return { ok: false, message: "This is not a simple wiki review export.", reviews: {}, count: 0 };
    }
    const issueRows = new Map(wikiReviewIssues.map((row) => [row.slug, row]));
    const reviews = {};
    for (const [slug, record] of Object.entries(parsed.reviews || {})) {
      const issueRow = issueRows.get(slug);
      if (!issueRow) continue;
      const normalized = normalizeSimpleReviewRecord(record, issueRow.issues || []);
      if (!Object.keys(normalized.issues || {}).length) continue;
      reviews[slug] = { ...normalized, slug, title: String(record.title || getArticleBySlug(slug)?.title || slug) };
    }
    const count = Object.keys(reviews).length;
    if (!count) return { ok: false, message: "No valid review records found in this export.", reviews: {}, count: 0 };
    return { ok: true, message: "Review export is valid.", reviews, count };
  } catch {
    return { ok: false, message: "Could not read the pasted review export. Check that the whole JSON block was copied.", reviews: {}, count: 0 };
  }
}

function buildSimpleReviewRows(issueRows, simpleReviews) {
  return [...issueRows]
    .filter((row) => row.issueCount > 0)
    .sort((a, b) => reviewTierWeight(a.reviewTier) - reviewTierWeight(b.reviewTier) || a.title.localeCompare(b.title))
    .map((row) => {
      const article = getArticleBySlug(row.slug);
      const record = normalizeSimpleReviewRecord(simpleReviews[row.slug], row.issues || []);
      const repoRecord = normalizeSimpleReviewRecord(wikiSimpleReviews?.[row.slug], row.issues || []);
      const effectiveReviewState = getEffectiveArticleReviewState(article, row.issues || [], record, repoRecord);
      const editDecision = Object.values(record.issues || {}).find((decision) => isNeedsChangeDecision(decision));
      const completedIssueCount = Object.keys(record.issues || {}).length;
      const remainingIssueCount = Math.max((row.issues || []).length - completedIssueCount, 0);
      const remainingIssues = (row.issues || []).filter((issue) => !isCompleteSimpleReviewDecision(record.issues?.[issue.id]));
      const remainingArticleCheckCount = remainingIssues.filter((issue) => issue.issueType === "article-check").length;
      const remainingClaimReviewCount = remainingIssues.filter((issue) => issue.issueType === "claim-review").length;
      return {
        slug: row.slug,
        title: row.title,
        reviewTier: row.reviewTier,
        prepStatus: row.prepStatus || "Needs AI prep",
        issueCount: remainingIssueCount,
        totalIssueCount: row.issueCount,
        articleCheckCount: row.articleCheckCount || 0,
        claimReviewCount: row.claimReviewCount || 0,
        completedIssueCount,
        remainingIssueCount,
        remainingArticleCheckCount,
        remainingClaimReviewCount,
        status: effectiveReviewState.status,
        isReadyForPublicUse: effectiveReviewState.isReadyForPublicUse,
        reason: editDecision?.note || (normalizeReviewAnswer(editDecision?.answer) === "remove" ? "Reviewer marked an item for removal." : remainingIssueCount ? "Human article checks or source claims still need review." : "All generated review items have saved answers."),
      };
    });
}

function getEffectiveArticleReviewState(article, issues = [], record = {}, repoRecord = {}) {
  const decisions = record?.issues || {};
  const repoDecisions = repoRecord?.issues || {};
  const completedIssueCount = Object.values(decisions).filter(isCompleteSimpleReviewDecision).length;
  const remainingIssueCount = Math.max((issues || []).length - completedIssueCount, 0);
  const hasNeedsChanges = Object.values(decisions).some(isNeedsChangeDecision);
  const allReviewItemsReady = (issues || []).length > 0 && (issues || []).every((issue) => isReadyReviewDecision(decisions[issue.id]));
  const repoReviewItemsReady = (issues || []).length > 0 && (issues || []).every((issue) => isReadyReviewDecision(repoDecisions[issue.id]));
  const sourceFlagCount = article?.sourceReviewFlagCount || 0;
  const hasLocalOnlyDecisions = hasLocalReviewDecisions(article?.slug, decisions);
  const isReadyForPublicUse = Boolean(allReviewItemsReady && !hasNeedsChanges && sourceFlagCount === 0);
  const isRepoBackedReady = Boolean(repoReviewItemsReady && sourceFlagCount === 0);
  let status = "Needs review";
  if (hasNeedsChanges) status = "Reviewed: needs changes";
  else if (isReadyForPublicUse) status = "Ready for public use";
  else if (completedIssueCount > 0 || sourceFlagCount > 0) status = "In progress";

  const reviewSourceLabel = !completedIssueCount
    ? "No saved review"
    : hasLocalOnlyDecisions
      ? "Local browser review"
      : "Repo-backed review";

  return {
    status,
    displayMaturity: isReadyForPublicUse ? "Ready for public use" : article?.maturity || "Draft",
    reviewScopeLabel: isReadyForPublicUse && hasLocalOnlyDecisions ? "local review only" : "",
    reviewSourceLabel,
    completedIssueCount,
    remainingIssueCount,
    sourceFlagCount,
    isReadyForPublicUse,
    isRepoBackedReady,
    hasNeedsChanges,
  };
}

function getEffectiveArticleDraftBlockers(article, effectiveReviewState) {
  if (effectiveReviewState?.isReadyForPublicUse) return [];
  const blockers = getArticleDraftBlockers(article);
  if (effectiveReviewState?.status === "Reviewed: needs changes") blockers.unshift("reviewer requested one or more article edits for Codex or a maintainer to apply");
  if (effectiveReviewState?.remainingIssueCount > 0) blockers.unshift(`${effectiveReviewState.remainingIssueCount} review item${effectiveReviewState.remainingIssueCount === 1 ? "" : "s"} still open`);
  if (effectiveReviewState?.sourceFlagCount > 0 && effectiveReviewState.remainingIssueCount === 0) blockers.unshift("source-review flags still need maintainer cleanup in the article source");
  return [...new Set(blockers)];
}

function hasLocalReviewDecisions(slug, decisions = {}) {
  if (!slug) return false;
  const repoDecisions = wikiSimpleReviews?.[slug]?.issues || {};
  const issueIds = new Set([...Object.keys(decisions), ...Object.keys(repoDecisions)]);
  return [...issueIds].some((issueId) => {
    const decision = decisions[issueId];
    const repoDecision = normalizeSimpleReviewDecision(repoDecisions[issueId]);
    const normalizedDecision = normalizeSimpleReviewDecision(decision);
    return JSON.stringify(repoDecision || null) !== JSON.stringify(normalizedDecision || null);
  });
}

function normalizeSimpleReviewRecord(record, issues = []) {
  const knownIds = new Set(issues.map((issue) => issue.id));
  const decisions = {};
  for (const [issueId, decision] of Object.entries(record?.issues || {})) {
    const normalized = normalizeSimpleReviewDecision(decision);
    if (!knownIds.has(issueId) || !isCompleteSimpleReviewDecision(normalized)) continue;
    decisions[issueId] = normalized;
  }
  return { ...record, issues: decisions, status: reviewStatusFromIssueDecisions(issues, decisions) };
}

function isCompleteSimpleReviewDecision(decision) {
  const normalized = normalizeSimpleReviewDecision(decision);
  if (!normalized) return false;
  if (normalized.answer === "yes" || normalized.answer === "remove" || normalized.answer === "na") return true;
  return normalized.answer === "change" && String(normalized.note || "").trim().length > 0;
}

function filterCompleteSimpleReviewDecisions(decisions = {}, issues = []) {
  const knownIds = new Set(issues.map((issue) => issue.id));
  return Object.fromEntries(
    Object.entries(decisions)
      .map(([issueId, decision]) => [issueId, normalizeSimpleReviewDecision(decision)])
      .filter(([issueId, decision]) => knownIds.has(issueId) && isCompleteSimpleReviewDecision(decision)),
  );
}

function reviewStatusFromIssueDecisions(issues = [], decisions = {}) {
  if (!issues.length) return "Reviewed: ready";
  const values = issues.map((issue) => decisions[issue.id]).filter(isCompleteSimpleReviewDecision);
  if (!values.length) return "Needs review";
  if (values.length === issues.length && values.every(isReadyReviewDecision)) return "Reviewed: ready";
  if (values.some(isNeedsChangeDecision)) return "Reviewed: needs changes";
  return "In progress";
}

function reviewStatusDisplayLabel(status) {
  if (status === "Reviewed: needs changes") return "Change requested";
  if (status === "Reviewed: ready") return "Ready";
  return status || "Needs review";
}

function reviewReasonDisplayText(row) {
  if (row?.status === "Reviewed: needs changes") {
    return `Waiting for Codex or a maintainer to apply this requested article edit: ${row.reason}`;
  }
  return row?.reason || "";
}

function filterSimpleReviewRows(rows, filter) {
  if (filter === "ready") return rows.filter((row) => row.isReadyForPublicUse || row.status === "Reviewed: ready");
  if (filter === "changes") return rows.filter((row) => row.status === "Reviewed: needs changes");
  if (filter === "progress") return rows.filter((row) => row.status === "In progress");
  if (filter === "all") return rows;
  return rows.filter((row) => row.remainingIssueCount > 0 || row.status === "Reviewed: needs changes");
}

function buildSimpleReviewSummary(rows) {
  const readyRows = rows.filter((row) => row.isReadyForPublicUse || row.status === "Reviewed: ready");
  const needsChangeRows = rows.filter((row) => row.status === "Reviewed: needs changes");
  const openRows = rows.filter((row) => row.remainingIssueCount > 0 || row.status === "Reviewed: needs changes");
  const remainingArticleCheckCount = rows.reduce((sum, row) => sum + row.remainingArticleCheckCount, 0);
  const remainingClaimReviewCount = rows.reduce((sum, row) => sum + row.remainingClaimReviewCount, 0);
  let nextAction = "Pick the first open item and review it.";
  if (needsChangeRows.length) nextAction = "Apply the first requested article edit in Markdown, then send it back for a simple pass/fail re-review.";
  else if (readyRows.length && openRows.length) nextAction = "Publish or stage ready items, then keep reviewing the open queue.";
  else if (readyRows.length && !openRows.length) nextAction = "All locally reviewed items are ready. Export this review log before publishing.";
  return { openCount: openRows.length, readyCount: readyRows.length, needsChangeCount: needsChangeRows.length, remainingArticleCheckCount, remainingClaimReviewCount, readyRows, needsChangeRows, openRows, nextAction };
}

function buildSimpleReviewSummaryText(summary) {
  return [
    "Simple wiki review results",
    "",
    `Open: ${summary.openCount}`,
    `Open article checks: ${summary.remainingArticleCheckCount}`,
    `Open source claims: ${summary.remainingClaimReviewCount}`,
    `Ready: ${summary.readyCount}`,
    `Change requests: ${summary.needsChangeCount}`,
    `Next action: ${summary.nextAction}`,
    "",
    "Ready articles:",
    ...(summary.readyRows.length ? summary.readyRows.map((row) => `- ${row.title}`) : ["- None"]),
    "",
    "Change requests:",
    ...(summary.needsChangeRows.length ? summary.needsChangeRows.map((row) => `- ${row.title}: ${row.reason}`) : ["- None"]),
  ].join("\n");
}

function reviewTierWeight(tier) {
  if (tier === "Tier 1") return 1;
  if (tier === "Tier 2") return 2;
  return 3;
}

function normalizeSimpleReviewDecision(decision) {
  if (!decision) return null;
  const answer = normalizeReviewAnswer(decision.answer);
  if (!isRecognizedReviewAnswer(answer)) return null;
  return {
    answer,
    note: answer === "change" || answer === "remove" ? String(decision.note || "").trim() : "",
  };
}

function normalizeReviewAnswer(answer) {
  if (answer === "no") return "change";
  if (answer === "pass") return "yes";
  if (answer === "not-applicable" || answer === "n/a") return "na";
  if (answer === "yes" || answer === "change" || answer === "remove" || answer === "na") return answer;
  return "";
}

function isRecognizedReviewAnswer(answer) {
  const normalized = normalizeReviewAnswer(answer);
  return normalized === "yes" || normalized === "change" || normalized === "remove" || normalized === "na";
}

function isReadyReviewDecision(decision) {
  const answer = normalizeReviewAnswer(decision?.answer);
  return answer === "yes" || answer === "na";
}

function isNeedsChangeDecision(decision) {
  const answer = normalizeReviewAnswer(decision?.answer);
  return answer === "change" || answer === "remove";
}

function getSavedIssueDecision(record, issueId) {
  if (!record?.issues || !issueId) return null;
  return normalizeSimpleReviewDecision(record.issues[issueId]);
}

function isRemoveDecision(decision) {
  return normalizeReviewAnswer(decision?.answer) === "remove";
}

function reviewDecisionClassName(decision) {
  const answer = normalizeReviewAnswer(decision?.answer);
  if (answer === "change") return "wiki-item-pending-change";
  if (answer === "remove") return "wiki-item-pending-removal";
  if (answer === "yes" || answer === "na") return "wiki-item-review-passed";
  return undefined;
}

function reviewAnswerLabel(decision) {
  const answer = normalizeReviewAnswer(decision?.answer);
  if (answer === "yes") return "Passed";
  if (answer === "na") return "Not applicable";
  if (answer === "change") return "Change requested";
  if (answer === "remove") return "Remove item";
  return "";
}

function humanReviewLabel(text, index) {
  const label = String(text || "").split(":")[0]?.trim();
  if (label && label.length <= 40 && label !== String(text || "").trim()) return label;
  if (index === 1) return "Legal/source";
  if (index === 2) return "Field safety";
  if (index === 3) return "Plain-language/copyright";
  return `Check ${index}`;
}

function humanReviewQuestionBody(text, index) {
  const raw = String(text || "").trim();
  const label = humanReviewLabel(raw, index);
  const prefix = `${label}:`;
  if (raw.toLowerCase().startsWith(prefix.toLowerCase())) return raw.slice(prefix.length).trim();
  return raw;
}

function reviewIssueQuestionText(issue) {
  if (issue?.issueType !== "article-check") return issue?.question || "";
  return humanReviewQuestionBody(issue.question || issue.originalText || "", issue.index || 1);
}

function formatReviewSectionName(section) {
  return String(section || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (char) => char.toUpperCase());
}

function stripReviewMarkup(text) {
  return String(text || "")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{cite:[^}]+\}\}/g, "")
    .replace(/\{\{review:source\}\}/g, "source review needed")
    .trim();
}

function makeNavigate(navigateTo, path) {
  return (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateTo(path);
    if (path.includes("#")) {
      window.setTimeout(() => scrollToCurrentHash(), 0);
      window.setTimeout(() => scrollToCurrentHash(), 80);
      window.setTimeout(() => scrollToCurrentHash(), 200);
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  };
}

function scrollToCurrentHash() {
  if (typeof window === "undefined") return;
  const hash = getCurrentHash();
  if (!hash) return;
  window.setTimeout(() => {
    const target = document.getElementById(hash);
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "auto" });
    if (typeof target.focus === "function") target.focus({ preventScroll: true });
  }, 0);
}

function getCurrentHash() {
  if (typeof window === "undefined") return "";
  return decodeURIComponent(window.location.hash.replace(/^#/, ""));
}

function anchorFor(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function reviewIssueAnchor(articleSlug, section, index) {
  return `review-issue-${articleSlug}-${section}-${index}`;
}

function reviewIssueId(articleSlug, section, index) {
  return `${articleSlug}:${section}:${index}`;
}

function humanReviewAnchor(articleSlug, index) {
  return `human-review-${articleSlug}-${index}`;
}

function humanReviewIssueId(articleSlug, index) {
  return `${articleSlug}:humanReview:${index}`;
}
