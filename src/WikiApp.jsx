import { useEffect, useMemo, useState } from "react";
import {
  articleRoadmap,
  articleTemplate,
  buildPhases,
  codexExecutionTasks,
  contentStructure,
  contentCreationPipeline,
  databaseSchema,
  getArticleBySlug,
  getRegulationById,
  getRoadmapByPhase,
  getSourceById,
  governanceModel,
  linkingModel,
  productStrategy,
  searchWiki,
  searchStrategy,
  sourceHierarchy,
  synonymIndex,
  technicalRecommendation,
  wikiArticles,
  wikiCategories,
  wikiSources,
} from "./wikiContent.js";

const WIKI_NAV = [
  { label: "Main page", path: "/wiki" },
  { label: "Article index", path: "/wiki/articles" },
  { label: "Categories", path: "/wiki/categories" },
  { label: "Sources", path: "/wiki/sources" },
  { label: "Roadmap", path: "/wiki/roadmap" },
  { label: "Governance", path: "/wiki/governance" },
  { label: "Technical plan", path: "/wiki/technical" },
];

export default function WikiApp({ routePath, navigateTo }) {
  const normalizedPath = routePath.replace(/\/$/, "") || "/wiki";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(getInitialSearch());
  const [activeSearch, setActiveSearch] = useState(getInitialSearch());
  const navigateWithinWiki = (path) => {
    if (!path.includes("?search=")) {
      setActiveSearch("");
      setSearchValue("");
    }
    navigateTo(path);
  };

  useEffect(() => {
    if (normalizedPath.startsWith("/wiki/articles/")) {
      const slug = normalizedPath.replace("/wiki/articles/", "");
      const article = getArticleBySlug(slug);
      document.title = article
        ? `${article.title} - BC Construction Safety Wiki`
        : "BC Construction Safety Wiki";
      return;
    }

    document.title = "BC Construction Safety Wiki";
  }, [normalizedPath]);

  const page = useMemo(() => {
    if (normalizedPath === "/wiki" || normalizedPath === "/wiki/main") {
      return <WikiHome query={activeSearch} navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath === "/wiki/articles") {
      return <ArticleIndex />;
    }

    if (normalizedPath.startsWith("/wiki/articles/")) {
      const slug = normalizedPath.replace("/wiki/articles/", "");
      return <ArticlePage slug={slug} navigateTo={navigateWithinWiki} />;
    }

    if (normalizedPath === "/wiki/categories") {
      return <CategoriesPage />;
    }

    if (normalizedPath === "/wiki/sources") {
      return <SourcesPage />;
    }

    if (normalizedPath === "/wiki/roadmap") {
      return <RoadmapPage />;
    }

    if (normalizedPath === "/wiki/governance") {
      return <GovernancePage />;
    }

    if (normalizedPath === "/wiki/technical") {
      return <TechnicalPage />;
    }

    return <NotFoundPage path={normalizedPath} />;
  }, [activeSearch, navigateWithinWiki, normalizedPath]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchValue.trim();
    setActiveSearch(query);
    navigateTo(query ? `/wiki?search=${encodeURIComponent(query)}` : "/wiki");
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
                  <a href={`/wiki/categories#${category.id}`}>{category.title}</a>
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

function WikiHome({ query, navigateTo }) {
  const results = searchWiki(query);
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
          <ArticleList articles={results} empty="No matching articles found." />
        </section>
      ) : null}

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
        <ArticleList articles={featured} />
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
        <ArticleList articles={wikiArticles} compact />
        <p className="wiki-more">
          <a href="/wiki/roadmap" onClick={makeNavigate(navigateTo, "/wiki/roadmap")}>
            View the full 100-topic roadmap
          </a>
        </p>
      </section>
    </article>
  );
}

function ArticlePage({ slug, navigateTo }) {
  const article = getArticleBySlug(slug);

  if (!article) {
    return <NotFoundPage path={`/wiki/articles/${slug}`} />;
  }

  const sectionHeadings = [
    "Summary",
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
    "Review and version history",
    "Disclaimer",
  ];

  return (
    <article className="wiki-article">
      <PageTitle title={article.title} subtitle="From BC Construction Safety Wiki" />
      <div className="wiki-article-meta">
        <span>{article.jurisdiction}</span>
        <span>{article.status}</span>
        <span>{article.confidenceLevel}</span>
        <span>Last reviewed {article.review.lastReviewed}</span>
      </div>

      <TableOfContents items={sectionHeadings} />

      <section className="wiki-section" id="summary">
        <h2>Summary</h2>
        <p>{article.summary}</p>
        {article.aliases.length ? (
          <p className="wiki-small">
            <b>Also searched as:</b> {article.aliases.join(", ")}
          </p>
        ) : null}
      </section>

      <ArticleSection title="When this applies" items={article.sections.whenApplies} />
      <ArticleSection title="Legal requirements" items={article.sections.legalRequirements} ordered />
      <ArticleSection title="Best practice" items={article.sections.bestPractice} />
      <ArticleSection title="Required documents" items={article.sections.requiredDocuments} />
      <ArticleSection
        title="Step-by-step safe procedure"
        items={article.sections.procedure}
        ordered
      />
      <ChecklistSection title="Worker checklist" items={article.sections.workerChecklist} />
      <ChecklistSection title="Supervisor checklist" items={article.sections.supervisorChecklist} />
      <ArticleSection title="Common mistakes" items={article.sections.commonMistakes} />

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

      <section className="wiki-section" id="review-and-version-history">
        <h2>Review and version history</h2>
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
            <tr>
              <th>Version</th>
              <td>0.1 source-cited draft</td>
            </tr>
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

function ArticleIndex() {
  const grouped = groupBy(wikiArticles, "category");

  return (
    <article className="wiki-article">
      <PageTitle title="Article index" subtitle="Source-cited MVP articles" />
      {Object.entries(grouped).map(([category, articles]) => (
        <section className="wiki-section" key={category}>
          <h2>{category}</h2>
          <ArticleList articles={articles} />
        </section>
      ))}
    </article>
  );
}

function CategoriesPage() {
  return (
    <article className="wiki-article">
      <PageTitle title="Categories" subtitle="Information architecture" />
      {wikiCategories.map((category) => (
        <section className="wiki-section" id={category.id} key={category.id}>
          <h2>{category.title}</h2>
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

function RoadmapPage() {
  return (
    <article className="wiki-article">
      <PageTitle title="Roadmap" subtitle="Published draft batches and the full 100-topic plan" />
      <section className="wiki-section">
        <h2>First public launch criteria</h2>
        <ul>
          <li>100 article pages published as source-cited drafts for the first public content base.</li>
          <li>Every article has official sources, related topics, aliases, review dates, and checklists.</li>
          <li>Search works for worker-language terms such as tie off, silica dust, crane pick, and toolbox talk.</li>
          <li>Correction process, disclaimer, and review badges are visible.</li>
          <li>Qualified safety/source review is completed before treating content as public launch ready.</li>
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

function ArticleSection({ title, items, ordered = false }) {
  if (!items?.length) return null;
  const List = ordered ? "ol" : "ul";
  return (
    <section className="wiki-section" id={anchorFor(title)}>
      <h2>{title}</h2>
      <List>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </List>
    </section>
  );
}

function ChecklistSection({ title, items }) {
  return (
    <section className="wiki-section wiki-checklist" id={anchorFor(title)}>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <span aria-hidden="true" /> {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticleList({ articles, compact = false, empty = "No articles." }) {
  if (!articles.length) return <p>{empty}</p>;
  return (
    <ul className={compact ? "wiki-article-list compact" : "wiki-article-list"}>
      {articles.map((article) => (
        <li key={article.slug}>
          <a href={`/wiki/articles/${article.slug}`}>{article.title}</a>
          {compact ? null : <p>{article.summary}</p>}
        </li>
      ))}
    </ul>
  );
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
