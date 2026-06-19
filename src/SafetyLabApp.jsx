import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { demoScenarios, riskMapRecords, siteScanSamples } from "./demoScenarios.js";
import { safetyLabData } from "./safetyLabData.js";
import { getSafetyPackById, safetyPacks, searchSafetyPacks } from "./safetyPacks.js";
import { getArticleBySlug, getRegulationById, getSourceById } from "./wikiContent.js";

const LAB_NAV = [
  { label: "Lab home", path: "/safety-lab" },
  { label: "Safety pack", path: "/safety-lab/safety-pack" },
  { label: "Site scan", path: "/safety-lab/site-scan" },
  { label: "Risk map", path: "/safety-lab/risk-map" },
  { label: "Crew mode", path: "/safety-lab/crew-mode" },
  { label: "Metrics", path: "/safety-lab/investor-metrics" },
  { label: "Toolbox talks", path: "/safety-lab/toolbox-talks" },
  { label: "Flash quiz", path: "/safety-lab/flash-quiz" },
  { label: "Checklists", path: "/safety-lab/checklists" },
  { label: "Forms", path: "/safety-lab/forms" },
];

export default function SafetyLabApp({ routePath, navigateTo }) {
  const normalizedPath = routePath.replace(/\/$/, "") || "/safety-lab";

  useEffect(() => {
    document.title = "Safety Lab";
  }, []);

  const navigateWithinLab = (path) => {
    navigateTo(path);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const page = (() => {
    switch (normalizedPath) {
      case "/safety-lab/toolbox-talks":
        return <ToolboxTalksTool />;
      case "/safety-lab/safety-pack":
        return <SafetyPackTool navigateTo={navigateWithinLab} />;
      case "/safety-lab/site-scan":
        return <SiteScanTool navigateTo={navigateWithinLab} />;
      case "/safety-lab/risk-map":
        return <RiskMapTool navigateTo={navigateWithinLab} />;
      case "/safety-lab/crew-mode":
        return <CrewModeTool navigateTo={navigateWithinLab} />;
      case "/safety-lab/investor-metrics":
        return <InvestorMetricsTool navigateTo={navigateWithinLab} />;
      case "/safety-lab/flash-quiz":
        return <FlashQuizTool />;
      case "/safety-lab/checklists":
        return <ChecklistTool />;
      case "/safety-lab/forms":
        return <FormLibraryTool />;
      case "/safety-lab":
        return <SafetyLabHome navigateTo={navigateWithinLab} />;
      default:
        return <LabNotFound path={normalizedPath} navigateTo={navigateWithinLab} />;
    }
  })();

  return (
    <div className="lab-root">
      <header className="lab-header">
        <div>
          <p className="lab-kicker">Experimental construction safety tools</p>
          <h1>Safety Lab</h1>
          <p>
            Draft tools generated from the safety content library. Use them for
            product exploration, not legal compliance.
          </p>
        </div>
        <div className="lab-warning">
          Draft content. Needs human safety and source review before field use as policy.
        </div>
      </header>

      <nav className="lab-nav" aria-label="Safety Lab tools">
        {LAB_NAV.map((item) => (
          <a
            className={item.path === normalizedPath ? "active" : ""}
            href={item.path}
            key={item.path}
            onClick={(event) => {
              event.preventDefault();
              navigateWithinLab(item.path);
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <main className="lab-main">{page}</main>
    </div>
  );
}

function SafetyLabHome({ navigateTo }) {
  const cards = [
    {
      title: "Safety Pack Generator",
      path: "/safety-lab/safety-pack",
      count: safetyPacks.length,
      label: "packs",
      text: "Type a job task and assemble a complete draft pack: wiki links, talk, checklist, quiz, forms, sources, print, and QR handoff.",
    },
    {
      title: "Simulated Site Scan",
      path: "/safety-lab/site-scan",
      count: siteScanSamples.length,
      label: "scans",
      text: "Select a sample jobsite scene, click simulated hazard detections, and open the matching safety pack.",
    },
    {
      title: "Risk Map",
      path: "/safety-lab/risk-map",
      count: riskMapRecords.length,
      label: "risks",
      text: "Group demo risks by area, trade, hazard, and urgency, then jump into the source-aware workflow.",
    },
    {
      title: "Crew Mode",
      path: "/safety-lab/crew-mode",
      count: 3,
      label: "actions",
      text: "Mobile-first worker handoff with a talk, mini quiz, checklist, and visible review warning.",
    },
    {
      title: "Investor Metrics",
      path: "/safety-lab/investor-metrics",
      count: demoScenarios.length,
      label: "scenarios",
      text: "Demo-only metrics for hazard coverage, documents assembled, source links, and review backlog.",
    },
    {
      title: "Toolbox Talk Generator",
      path: "/safety-lab/toolbox-talks",
      count: safetyLabData.counts.toolboxTalks,
      label: "talks",
      text: "Pick a topic, filter by keyword, print a crew-ready talk, and keep the source/review note visible.",
    },
    {
      title: "Training Pop Flash Quiz",
      path: "/safety-lab/flash-quiz",
      count: safetyLabData.counts.quizzes,
      label: "quizzes",
      text: "Run fast question-by-question refreshers with answer reveal, score, and explanations.",
    },
    {
      title: "Checklist Builder",
      path: "/safety-lab/checklists",
      count: safetyLabData.counts.checklists,
      label: "checklists",
      text: "Open a field checklist, tick items, add deficiency notes, and print a clean copy.",
    },
    {
      title: "Form Library",
      path: "/safety-lab/forms",
      count: safetyLabData.counts.forms,
      label: "forms",
      text: "Browse draft safety form templates with privacy and source-review notes.",
    },
  ];

  return (
    <section className="lab-screen">
      <div className="lab-title-row">
        <div>
          <h2>Prototype gallery</h2>
          <p>Separate experiments using the same generated Markdown safety content.</p>
        </div>
      </div>

      <div className="lab-card-grid">
        {cards.map((card) => (
          <article className="lab-card" key={card.path}>
            <div className="lab-card-count">
              <strong>{card.count}</strong>
              <span>{card.label}</span>
            </div>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <button type="button" onClick={() => navigateTo(card.path)}>
              Open prototype
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function SafetyPackTool({ navigateTo }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(getInitialSafetyPackId);
  const rankedPacks = useMemo(() => searchSafetyPacks(query), [query]);
  const selectedPack =
    rankedPacks.find((pack) => pack.id === selectedId) || rankedPacks[0] || safetyPacks[0];
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!query.trim() || !rankedPacks[0]?.score) return;
    setSelectedId(rankedPacks[0].id);
  }, [query, rankedPacks]);

  useEffect(() => {
    if (!selectedPack) return;

    let cancelled = false;
    QRCode.toDataURL(crewModeUrl(selectedPack.id), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedPack]);

  const selectPack = (packId) => {
    setSelectedId(packId);
    navigateTo(`/safety-lab/safety-pack?pack=${encodeURIComponent(packId)}`);
  };

  return (
    <section className="lab-screen">
      <ToolHeader
        title="Safety Pack Generator"
        description="Type a job task and assemble a draft field pack from the local wiki, talks, checklists, quizzes, forms, and source notes."
      />
      <div className="lab-tool-layout">
        <aside className="lab-picker">
          <LabSearch
            query={query}
            setQuery={setQuery}
            placeholder="Try cutting concrete, tie off, crane pick..."
          />
          <div className="lab-example-grid" aria-label="Demo searches">
            {safetyPacks.slice(0, 6).map((pack) => (
              <button type="button" key={pack.id} onClick={() => setQuery(pack.demoQuery)}>
                {pack.demoQuery}
              </button>
            ))}
          </div>
          <ResultList
            rows={rankedPacks}
            selectedId={selectedPack?.id}
            onSelect={selectPack}
            meta={(pack) =>
              pack.score
                ? `Matched: ${pack.matchedTerms.join(", ")}`
                : "Demo-ready source pack"
            }
          />
        </aside>
        {selectedPack ? (
          <SafetyPackPreview
            navigateTo={navigateTo}
            pack={selectedPack}
            comparisonPacks={rankedPacks.slice(0, 3)}
            qrDataUrl={qrDataUrl}
            query={query}
          />
        ) : (
          <EmptyTool />
        )}
      </div>
    </section>
  );
}

function SafetyPackPreview({ navigateTo, pack, comparisonPacks, qrDataUrl, query }) {
  const articles = findByIds(pack.wikiSlugs, (slug) => getArticleBySlug(slug));
  const talks = findByIds(pack.toolboxTalkIds, (id) =>
    safetyLabData.toolboxTalks.find((talk) => talk.id === id),
  );
  const checklists = findByIds(pack.checklistIds, (id) =>
    safetyLabData.checklists.find((checklist) => checklist.id === id),
  );
  const quizzes = findByIds(pack.quizIds, (id) =>
    safetyLabData.quizzes.find((quiz) => quiz.id === id),
  );
  const forms = findByIds(pack.formIds, (id) =>
    safetyLabData.forms.find((form) => form.id === id),
  );
  const primaryTalk = talks[0];
  const primaryChecklist = checklists[0];
  const primaryQuiz = quizzes[0];
  const sourceLinks = officialLinksForArticles(articles);

  return (
    <article className="lab-preview lab-print-surface lab-pack-preview">
      <div className="lab-preview-heading">
        <div>
          <p>Draft safety workflow pack</p>
          <h3>{pack.title}</h3>
        </div>
        <div className="lab-button-row">
          {primaryQuiz ? (
            <button
              type="button"
              onClick={() => navigateTo(`/training-quiz/${primaryQuiz.id}`)}
            >
              Launch quiz
            </button>
          ) : null}
          <button type="button" onClick={() => window.print()}>
            Print safety pack
          </button>
          <button type="button" onClick={() => window.print()}>
            Export demo packet
          </button>
        </div>
      </div>

      <div className="lab-export-cover">
        <p>Demo packet cover</p>
        <strong>{pack.title}</strong>
        <span>{pack.scenario}</span>
        <span>Draft / needs human safety and source review / not legal advice</span>
      </div>

      <div className="lab-pack-alert">
        <strong>Offline-safe demo engine.</strong>
        <span>
          This pack was selected by local keyword matching against curated draft content. No
          live AI/API call is used.
        </span>
      </div>

      <dl className="lab-meta-list">
        <div>
          <dt>Pack</dt>
          <dd>{pack.id}</dd>
        </div>
        <div>
          <dt>Matched terms</dt>
          <dd>{pack.matchedTerms?.length ? pack.matchedTerms.join(", ") : query ? "No strong match" : "Ready"}</dd>
        </div>
        <div>
          <dt>Review</dt>
          <dd>Needs human safety/source review</dd>
        </div>
      </dl>

      <LabSection title="Scenario summary">
        <p>{pack.scenario}</p>
      </LabSection>

      <LabSection title="Hazards">
        <div className="lab-chip-list">
          {pack.hazards.map((hazard) => (
            <span key={hazard}>{hazard}</span>
          ))}
        </div>
      </LabSection>

      <LabSection title="Required documents">
        <BulletList items={pack.requiredDocuments} />
      </LabSection>

      <LabSection title="Why this matched">
        <div className="lab-compare-grid">
          {comparisonPacks.map((candidate) => (
            <div className={candidate.id === pack.id ? "active" : ""} key={candidate.id}>
              <strong>{candidate.title}</strong>
              <span>
                {candidate.score
                  ? `Score ${candidate.score}: ${candidate.matchedTerms.join(", ")}`
                  : "Available source pack"}
              </span>
              <small>Confidence: demo match, needs source review</small>
            </div>
          ))}
        </div>
      </LabSection>

      <LabSection title="Wiki and source links">
        <div className="lab-link-grid">
          {articles.map((article) => (
            <a
              href={`/wiki/articles/${article.slug}`}
              key={article.slug}
              onClick={(event) => {
                event.preventDefault();
                navigateTo(`/wiki/articles/${article.slug}`);
              }}
            >
              <strong>{article.title}</strong>
              <span>{article.summary}</span>
            </a>
          ))}
        </div>
        {sourceLinks.length ? (
          <ul className="lab-source-list">
            {sourceLinks.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </LabSection>

      {primaryTalk ? (
        <LabSection title="Toolbox talk preview">
          <div className="lab-pack-panel">
            <h5>{primaryTalk.title}</h5>
            <p>{primaryTalk.keyMessage}</p>
            <BulletList items={primaryTalk.discussionPoints.slice(0, 4)} />
          </div>
          {talks.length > 1 ? (
            <p className="lab-note">
              Also included: {talks.slice(1).map((talk) => talk.title).join(", ")}
            </p>
          ) : null}
        </LabSection>
      ) : null}

      {primaryChecklist ? (
        <LabSection title="Checklist preview">
          <div className="lab-checklist compact">
            {primaryChecklist.items.slice(0, 7).map((item) => (
              <label key={item}>
                <input type="checkbox" readOnly />
                <span>{item}</span>
              </label>
            ))}
          </div>
          {checklists.length > 1 ? (
            <p className="lab-note">
              Also included: {checklists.slice(1).map((checklist) => checklist.title).join(", ")}
            </p>
          ) : null}
        </LabSection>
      ) : null}

      {primaryQuiz ? (
        <LabSection title="Training quiz">
          <div className="lab-pack-action">
            <div>
              <strong>{primaryQuiz.title}</strong>
              <span>
                {primaryQuiz.questions.length} questions. Practice only, not proof of
                training or competency.
              </span>
            </div>
            <button type="button" onClick={() => navigateTo(`/training-quiz/${primaryQuiz.id}`)}>
              Open quiz
            </button>
          </div>
        </LabSection>
      ) : null}

      <LabSection title="Form templates">
        <div className="lab-form-pack-grid">
          {forms.map((form) => (
            <div className="lab-pack-panel" key={form.id}>
              <h5>{form.title}</h5>
              <p>{form.fields.slice(0, 5).join(", ")}</p>
            </div>
          ))}
        </div>
      </LabSection>

      <LabSection title="Printable field output">
        <BulletList items={pack.printableSections} />
      </LabSection>

      <LabSection title="QR crew handoff">
        <div className="lab-qr-panel">
          {qrDataUrl ? <img alt={`QR code for ${pack.title}`} src={qrDataUrl} /> : null}
          <div>
            <strong>Scan to open crew mode</strong>
            <span>{crewModeUrl(pack.id)}</span>
            {primaryQuiz ? (
              <button type="button" onClick={() => navigateTo(`/safety-lab/crew-mode?pack=${pack.id}`)}>
                Open crew mode
              </button>
            ) : null}
          </div>
        </div>
      </LabSection>

      <LabSection title="Source/review warning">
        <p>{pack.reviewNotice}</p>
      </LabSection>
    </article>
  );
}

function SiteScanTool({ navigateTo }) {
  const [selectedId, setSelectedId] = useState(getInitialSiteScanId);
  const sample = siteScanSamples.find((item) => item.id === selectedId) || siteScanSamples[0];
  const [selectedDetectionId, setSelectedDetectionId] = useState(sample.simulatedDetections[0]?.id || "");
  const selectedDetection =
    sample.simulatedDetections.find((detection) => detection.id === selectedDetectionId) ||
    sample.simulatedDetections[0];
  const selectedPack = getSafetyPackById(selectedDetection?.packId) || getSafetyPackById(sample.packId);
  const selectedContent = selectedPack ? getPackContent(selectedPack) : null;
  const severityCounts = topCounts(sample.simulatedDetections, "severity");
  const criticalCount = sample.simulatedDetections.filter((detection) =>
    ["Critical", "High"].includes(detection.severity),
  ).length;

  useEffect(() => {
    setSelectedDetectionId(sample.simulatedDetections[0]?.id || "");
  }, [sample.id]);

  const openPack = (packId) => {
    navigateTo(`/safety-lab/safety-pack?pack=${encodeURIComponent(packId)}`);
  };

  return (
    <section className="lab-screen">
      <ToolHeader
        title="Simulated Site Scan"
        description="Select a sample jobsite scene and click simulated hazard detections that route into source-aware safety packs."
      />
      <div className="lab-tool-layout">
        <aside className="lab-picker">
          <label className="lab-field">
            <span>Sample scene</span>
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              {siteScanSamples.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <div className="lab-pack-alert">
            <strong>Simulated demo intelligence.</strong>
            <span>This is not live computer vision and does not inspect real photos.</span>
          </div>
          <ResultList
            rows={sample.simulatedDetections.map((detection) => ({
              ...detection,
              title: detection.label,
            }))}
            selectedId={selectedDetection?.id}
            onSelect={setSelectedDetectionId}
            meta={(detection) => `${detection.severity}: ${detection.note}`}
          />
        </aside>
        <article className="lab-preview lab-scan-preview">
          <div className="lab-preview-heading">
            <div>
              <p>{sample.location}</p>
              <h3>{sample.title}</h3>
            </div>
            <div className="lab-button-row">
              <button type="button" onClick={() => openPack(sample.packId)}>
                Open primary pack
              </button>
              {selectedPack ? (
                <button type="button" onClick={() => navigateTo(`/safety-lab/crew-mode?pack=${selectedPack.id}`)}>
                  Crew handoff
                </button>
              ) : null}
            </div>
          </div>
          <div className="lab-scan-explainer">
            <strong>What this is showing</strong>
            <p>
              Site Scan is a demo of the product workflow: a future photo/video scan would
              flag visible hazard patterns, rank them, and connect each one to the right
              safety pack. This prototype uses hand-authored sample scenes so the demo is
              reliable and does not pretend to inspect real photos.
            </p>
          </div>
          <div className="lab-scan-summary">
            <div>
              <strong>{sample.simulatedDetections.length}</strong>
              <span>simulated detections</span>
            </div>
            <div>
              <strong>{criticalCount}</strong>
              <span>high / critical</span>
            </div>
            {severityCounts.map((item) => (
              <div key={item.label}>
                <strong>{item.count}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <p className="lab-scan-scenario">{sample.scenario}</p>
          <div className="lab-scan-stage" aria-label={`${sample.title} simulated site scan`}>
            <div className="lab-scan-lane horizontal" />
            <div className="lab-scan-lane vertical" />
            <div className="lab-scan-zone zone-a">Work zone</div>
            <div className="lab-scan-zone zone-b">Access route</div>
            <div className="lab-scan-zone zone-c">Public edge</div>
            {sample.simulatedDetections.map((detection) => (
              <button
                className={[
                  "lab-scan-marker",
                  `severity-${slugifyClass(detection.severity)}`,
                  detection.id === selectedDetection?.id ? "active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={detection.id}
                style={{ left: `${detection.x}%`, top: `${detection.y}%` }}
                type="button"
                onClick={() => setSelectedDetectionId(detection.id)}
              >
                <strong>{detection.label}</strong>
                <span>{detection.severity}</span>
              </button>
            ))}
          </div>
          {selectedDetection && selectedPack ? (
            <div className="lab-scan-detail">
              <div>
                <p>{selectedDetection.severity} priority</p>
                <h4>{selectedDetection.label}</h4>
                <span>{selectedDetection.note}</span>
              </div>
              <div className="lab-scan-workflow">
                <section>
                  <strong>Recommended pack</strong>
                  <span>{selectedPack.title}</span>
                </section>
                <section>
                  <strong>Next field actions</strong>
                  <ul>
                    {selectedPack.printableSections.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <strong>Workflow assets</strong>
                  <span>
                    {selectedContent?.talks.length || 0} talks, {selectedContent?.checklists.length || 0} checklists,{" "}
                    {selectedContent?.quizzes.length || 0} quizzes, {selectedContent?.forms.length || 0} forms
                  </span>
                </section>
              </div>
              <div className="lab-button-row">
                <button type="button" onClick={() => openPack(selectedPack.id)}>
                  Open safety pack
                </button>
                <button type="button" onClick={() => navigateTo(`/safety-lab/risk-map`)}>
                  View risk map
                </button>
              </div>
            </div>
          ) : null}
          <LabSection title="All detection notes">
            <BulletList items={sample.simulatedDetections.map((detection) => `${detection.label}: ${detection.note}`)} />
          </LabSection>
        </article>
      </div>
    </section>
  );
}

function RiskMapTool({ navigateTo }) {
  const [area, setArea] = useState("All");
  const [trade, setTrade] = useState("All");
  const [hazard, setHazard] = useState("All");
  const [urgency, setUrgency] = useState("All");

  const filtered = riskMapRecords.filter((record) => {
    return (
      (area === "All" || record.area === area) &&
      (trade === "All" || record.trade === trade) &&
      (hazard === "All" || record.hazard === hazard) &&
      (urgency === "All" || record.urgency === urgency)
    );
  });
  const urgencyCounts = topCounts(riskMapRecords, "urgency");

  return (
    <section className="lab-screen">
      <ToolHeader
        title="Risk Map"
        description="Demo-only risk records grouped by area, trade, hazard, and urgency with links back to packs and source content."
      />
      <div className="lab-risk-toolbar">
        <FilterSelect label="Area" value={area} setValue={setArea} options={unique(riskMapRecords.map((record) => record.area))} />
        <FilterSelect label="Trade" value={trade} setValue={setTrade} options={unique(riskMapRecords.map((record) => record.trade))} />
        <FilterSelect label="Hazard" value={hazard} setValue={setHazard} options={unique(riskMapRecords.map((record) => record.hazard))} />
        <FilterSelect label="Urgency" value={urgency} setValue={setUrgency} options={["Critical", "High", "Medium", "Low"]} />
      </div>
      <div className="lab-metric-strip">
        <div>
          <strong>{filtered.length}</strong>
          <span>visible demo risks</span>
        </div>
        {urgencyCounts.map((item) => (
          <div key={item.label}>
            <strong>{item.count}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="lab-risk-grid">
        {filtered.map((record) => {
          const pack = getSafetyPackById(record.packId);
          return (
            <article className={`lab-risk-card urgency-${slugifyClass(record.urgency)}`} key={record.id}>
              <div>
                <span>{record.area}</span>
                <strong>{record.hazard}</strong>
              </div>
              <p>{record.summary}</p>
              <dl>
                <div>
                  <dt>Trade</dt>
                  <dd>{record.trade}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{record.status}</dd>
                </div>
                <div>
                  <dt>Pack</dt>
                  <dd>{pack?.title || record.packId}</dd>
                </div>
              </dl>
              <button type="button" onClick={() => navigateTo(`/safety-lab/safety-pack?pack=${record.packId}`)}>
                Open workflow
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CrewModeTool({ navigateTo }) {
  const [packId, setPackId] = useState(getInitialSafetyPackId);
  const pack = getSafetyPackById(packId) || safetyPacks[0];
  const content = getPackContent(pack);
  const questions = content.primaryQuiz?.questions.slice(0, 3) || [];
  const items = content.primaryChecklist?.items.slice(0, 5) || pack.printableSections;
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState({});

  useEffect(() => {
    setAnswers({});
    setChecked({});
  }, [packId]);

  const score = questions.filter((question) => answers[question.number] === question.answer).length;

  return (
    <section className="lab-screen">
      <div className="lab-crew-shell">
        <header className="lab-crew-header">
          <p>Mobile crew handoff</p>
          <h2>{pack.title}</h2>
          <span>Practice only. No worker names. No permanent records. Not proof of competency.</span>
        </header>
        <label className="lab-field">
          <span>Pack</span>
          <select value={packId} onChange={(event) => setPackId(event.target.value)}>
            {safetyPacks.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <LabSection title="Today's talk">
          <p>{content.primaryTalk?.keyMessage || pack.scenario}</p>
        </LabSection>
        <LabSection title="Mini quiz">
          <div className="lab-crew-quiz">
            {questions.map((question) => (
              <div key={question.number}>
                <strong>{question.prompt}</strong>
                {question.choices.slice(0, 4).map((choice) => {
                  const selected = answers[question.number];
                  return (
                    <button
                      className={[
                        selected === choice.letter ? "selected" : "",
                        selected && choice.letter === question.answer ? "correct" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={Boolean(selected)}
                      key={choice.letter}
                      type="button"
                      onClick={() => setAnswers((current) => ({ ...current, [question.number]: choice.letter }))}
                    >
                      {choice.letter}. {choice.text}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="lab-note">Score {score}/{Object.keys(answers).length || 0}. Practice only.</p>
        </LabSection>
        <LabSection title="Checklist">
          <div className="lab-checklist">
            {items.map((item, index) => (
              <label key={item}>
                <input
                  checked={Boolean(checked[index])}
                  type="checkbox"
                  onChange={(event) => setChecked((current) => ({ ...current, [index]: event.target.checked }))}
                />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </LabSection>
        <div className="lab-pack-alert">
          <strong>Needs human safety/source review.</strong>
          <span>{pack.reviewNotice}</span>
        </div>
        <div className="lab-button-row">
          <button type="button" onClick={() => navigateTo(`/safety-lab/safety-pack?pack=${pack.id}`)}>
            Open full pack
          </button>
          <button type="button" onClick={() => window.print()}>
            Print crew handoff
          </button>
        </div>
      </div>
    </section>
  );
}

function InvestorMetricsTool({ navigateTo }) {
  const metrics = getInvestorDemoMetrics();
  const reviewBacklog = safetyPacks.length + safetyLabData.counts.toolboxTalks + safetyLabData.counts.quizzes;

  return (
    <section className="lab-screen">
      <ToolHeader
        title="Investor Metrics"
        description="Demo-only product metrics for the Monday story. These are not audited customer metrics."
      />
      <div className="lab-metric-strip investor">
        <div>
          <strong>{safetyPacks.length}</strong>
          <span>safety packs</span>
        </div>
        <div>
          <strong>{metrics.uniqueHazards}</strong>
          <span>hazard labels</span>
        </div>
        <div>
          <strong>{metrics.documents}</strong>
          <span>documents assembled</span>
        </div>
        <div>
          <strong>{metrics.sourceLinks}</strong>
          <span>source-linked articles</span>
        </div>
        <div>
          <strong>{reviewBacklog}</strong>
          <span>review backlog items</span>
        </div>
      </div>
      <div className="lab-investor-grid">
        {demoScenarios.map((scenario) => {
          const pack = getSafetyPackById(scenario.packId);
          return (
            <article className="lab-pack-panel" key={scenario.id}>
              <h3>{scenario.title}</h3>
              <p>{scenario.headline}</p>
              <dl className="lab-mini-dl">
                <div>
                  <dt>Pack</dt>
                  <dd>{pack?.title}</dd>
                </div>
                <div>
                  <dt>Estimated time saved</dt>
                  <dd>{scenario.riskSummary.timeSavedMinutes} min</dd>
                </div>
              </dl>
              <button type="button" onClick={() => navigateTo(`/safety-lab/safety-pack?pack=${scenario.packId}`)}>
                Open scenario pack
              </button>
            </article>
          );
        })}
      </div>
      <LabSection title="Guardrails">
        <BulletList
          items={[
            "Demo calculations only, not audited customer data.",
            "All content remains draft and needs human safety/source review.",
            "No legal compliance, medical advice, or proof-of-competency claim is made.",
            "The simulated site scan does not inspect real photos or video.",
          ]}
        />
      </LabSection>
    </section>
  );
}

function ToolboxTalksTool() {
  const topics = unique(safetyLabData.toolboxTalks.map((talk) => talk.topicArea));
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All");
  const filtered = useMemo(
    () =>
      safetyLabData.toolboxTalks.filter((talk) => {
        const queryMatch = searchText(talk).includes(normalize(query));
        const topicMatch = topic === "All" || talk.topicArea === topic;
        return queryMatch && topicMatch;
      }),
    [query, topic],
  );
  const [selectedId, setSelectedId] = useState(safetyLabData.toolboxTalks[0]?.id || "");
  const selected = safetyLabData.toolboxTalks.find((talk) => talk.id === selectedId) || filtered[0];

  useEffect(() => {
    if (filtered.length && !filtered.some((talk) => talk.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  return (
    <section className="lab-screen">
      <ToolHeader
        title="Toolbox Talk Generator"
        description="Filter the 50 draft talks, choose one for the crew, and print a field-ready outline."
      />
      <div className="lab-tool-layout">
        <aside className="lab-picker">
          <LabSearch query={query} setQuery={setQuery} placeholder="Search talks, topics, hazards..." />
          <label className="lab-field">
            <span>Topic</span>
            <select value={topic} onChange={(event) => setTopic(event.target.value)}>
              <option>All</option>
              {topics.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <ResultList
            rows={filtered}
            selectedId={selected?.id}
            onSelect={setSelectedId}
            meta={(talk) => talk.topicArea}
          />
        </aside>
        {selected ? <ToolboxTalkPreview talk={selected} /> : <EmptyTool />}
      </div>
    </section>
  );
}

function ToolboxTalkPreview({ talk }) {
  return (
    <article className="lab-preview lab-print-surface">
      <div className="lab-preview-heading">
        <div>
          <p>{talk.topicArea}</p>
          <h3>{talk.title}</h3>
        </div>
        <button type="button" onClick={() => window.print()}>
          Print talk
        </button>
      </div>
      <dl className="lab-meta-list">
        <div>
          <dt>Duration</dt>
          <dd>{talk.duration}</dd>
        </div>
        <div>
          <dt>Audience</dt>
          <dd>{talk.audience}</dd>
        </div>
        <div>
          <dt>Review</dt>
          <dd>{talk.reviewStatus}</dd>
        </div>
      </dl>
      <LabSection title="Key message">
        <p>{talk.keyMessage}</p>
      </LabSection>
      <LabSection title="Discussion points">
        <BulletList items={talk.discussionPoints} />
      </LabSection>
      <LabSection title="Questions for crew">
        <BulletList items={talk.questionsForCrew} />
      </LabSection>
      <LabSection title="Supervisor demonstration">
        <p>{talk.supervisorDemo}</p>
      </LabSection>
      <LabSection title="Sign-off prompt">
        <p>{talk.signOffPrompt}</p>
      </LabSection>
      <LabSection title="Source/review note">
        <BulletList items={talk.sourceReviewNote} />
      </LabSection>
    </article>
  );
}

function FlashQuizTool() {
  const [quizId, setQuizId] = useState(safetyLabData.quizzes[0]?.id || "");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const quiz = safetyLabData.quizzes.find((item) => item.id === quizId) || safetyLabData.quizzes[0];
  const current = quiz?.questions[currentIndex];
  const selected = current ? answers[current.number] : "";
  const score = quiz
    ? quiz.questions.filter((question) => answers[question.number] === question.answer).length
    : 0;
  const complete = quiz ? Object.keys(answers).length === quiz.questions.length : false;

  const resetQuiz = (nextId = quizId) => {
    setQuizId(nextId);
    setCurrentIndex(0);
    setAnswers({});
  };

  const selectAnswer = (letter) => {
    if (!current) return;
    setAnswers((currentAnswers) => {
      if (currentAnswers[current.number]) return currentAnswers;
      return {
        ...currentAnswers,
        [current.number]: letter,
      };
    });
  };

  return (
    <section className="lab-screen">
      <ToolHeader
        title="Training Pop Flash Quiz"
        description="Run a fast one-question-at-a-time refresher. This is not proof of competency."
      />
      <div className="lab-tool-layout">
        <aside className="lab-picker">
          <label className="lab-field">
            <span>Quiz topic</span>
            <select value={quizId} onChange={(event) => resetQuiz(event.target.value)}>
              {safetyLabData.quizzes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title.replace(/ Quiz$/, "")}
                </option>
              ))}
            </select>
          </label>
          <div className="lab-score">
            <strong>
              {score}/{quiz?.questions.length || 0}
            </strong>
            <span>{complete ? "Complete" : "In progress"}</span>
          </div>
          <p className="lab-note">{quiz?.reviewFlag}</p>
          <p className="lab-note">Suggested threshold: {quiz?.passThreshold}</p>
        </aside>

        {quiz && current ? (
          <article className="lab-preview">
            <div className="lab-progress">
              <span>
                Question {currentIndex + 1} of {quiz.questions.length}
              </span>
              <progress value={currentIndex + 1} max={quiz.questions.length} />
            </div>
            <h3>{current.prompt}</h3>
            <div className="lab-answer-grid">
              {current.choices.map((choice) => {
                const isSelected = selected === choice.letter;
                const isCorrect = selected && choice.letter === current.answer;
                const isWrong = isSelected && selected !== current.answer;
                return (
                  <button
                    className={[
                      isSelected ? "selected" : "",
                      isCorrect ? "correct" : "",
                      isWrong ? "wrong" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={choice.letter}
                    type="button"
                    disabled={Boolean(selected)}
                    onClick={() => selectAnswer(choice.letter)}
                  >
                    <b>{choice.letter}.</b> {choice.text}
                  </button>
                );
              })}
            </div>
            {selected ? (
              <div className="lab-answer-explanation">
                <strong>{selected === current.answer ? "Correct" : `Answer: ${current.answer}`}</strong>
                <p>{current.explanation}</p>
              </div>
            ) : null}
            <div className="lab-button-row">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentIndex === quiz.questions.length - 1}
                onClick={() =>
                  setCurrentIndex((index) => Math.min(quiz.questions.length - 1, index + 1))
                }
              >
                Next
              </button>
              <button type="button" onClick={() => resetQuiz()}>
                Reset
              </button>
            </div>
            {complete ? (
              <div className="lab-result">
                <strong>{score >= 8 ? "Pass threshold met" : "Review recommended"}</strong>
                <span>
                  Score {score}/{quiz.questions.length}. This quiz remains a draft and is not
                  proof of legal competency.
                </span>
              </div>
            ) : null}
          </article>
        ) : (
          <EmptyTool />
        )}
      </div>
    </section>
  );
}

function ChecklistTool() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => safetyLabData.checklists.filter((checklist) => searchText(checklist).includes(normalize(query))),
    [query],
  );
  const [selectedId, setSelectedId] = useState(safetyLabData.checklists[0]?.id || "");
  const selected = safetyLabData.checklists.find((item) => item.id === selectedId) || filtered[0];
  const [checked, setChecked] = useState({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setChecked({});
    setNotes("");
  }, [selectedId]);

  useEffect(() => {
    if (filtered.length && !filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  return (
    <section className="lab-screen">
      <ToolHeader
        title="Checklist Builder"
        description="Open a draft checklist, tick field items, add notes, and print the result."
      />
      <div className="lab-tool-layout">
        <aside className="lab-picker">
          <LabSearch query={query} setQuery={setQuery} placeholder="Search checklists..." />
          <ResultList
            rows={filtered}
            selectedId={selected?.id}
            onSelect={setSelectedId}
            meta={(item) => item.reviewStatus}
          />
        </aside>
        {selected ? (
          <article className="lab-preview lab-print-surface">
            <div className="lab-preview-heading">
              <div>
                <p>{selected.status}</p>
                <h3>{selected.title}</h3>
              </div>
              <button type="button" onClick={() => window.print()}>
                Print checklist
              </button>
            </div>
            <p>{selected.use}</p>
            <div className="lab-checklist">
              {selected.items.map((item, index) => (
                <label key={item}>
                  <input
                    type="checkbox"
                    checked={Boolean(checked[index])}
                    onChange={(event) =>
                      setChecked((current) => ({ ...current, [index]: event.target.checked }))
                    }
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
            <label className="lab-field">
              <span>Notes / deficiencies</span>
              <textarea
                rows="5"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add field notes, deficiencies, assigned person, due date, or closeout evidence."
              />
            </label>
            <LabSection title="Sources / review needed">
              <BulletList items={selected.sourceReviewNote} />
            </LabSection>
          </article>
        ) : (
          <EmptyTool />
        )}
      </div>
    </section>
  );
}

function FormLibraryTool() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => safetyLabData.forms.filter((form) => searchText(form).includes(normalize(query))),
    [query],
  );
  const [selectedId, setSelectedId] = useState(safetyLabData.forms[0]?.id || "");
  const selected = safetyLabData.forms.find((item) => item.id === selectedId) || filtered[0];

  useEffect(() => {
    if (filtered.length && !filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  return (
    <section className="lab-screen">
      <ToolHeader
        title="Form Library"
        description="Browse draft safety forms with privacy notes and source-review warnings."
      />
      <div className="lab-tool-layout">
        <aside className="lab-picker">
          <LabSearch query={query} setQuery={setQuery} placeholder="Search forms..." />
          <ResultList
            rows={filtered}
            selectedId={selected?.id}
            onSelect={setSelectedId}
            meta={(item) => item.reviewStatus}
          />
        </aside>
        {selected ? (
          <article className="lab-preview lab-print-surface">
            <div className="lab-preview-heading">
              <div>
                <p>{selected.status}</p>
                <h3>{selected.title}</h3>
              </div>
              <button type="button" onClick={() => window.print()}>
                Print form
              </button>
            </div>
            <div className="lab-form-fields">
              {selected.fields.map((field) => (
                <label className="lab-form-line" key={field}>
                  <span>{field}</span>
                  <input aria-label={field} />
                </label>
              ))}
            </div>
            <LabSection title="Privacy and sensitivity note">
              <p>{selected.privacyNote}</p>
            </LabSection>
            <LabSection title="Source/review note">
              <BulletList items={selected.sourceReviewNote} />
            </LabSection>
          </article>
        ) : (
          <EmptyTool />
        )}
      </div>
    </section>
  );
}

function ToolHeader({ title, description }) {
  return (
    <div className="lab-title-row">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span>Draft / needs review</span>
    </div>
  );
}

function LabSearch({ query, setQuery, placeholder }) {
  return (
    <label className="lab-field">
      <span>Search</span>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function FilterSelect({ label, options, setValue, value }) {
  return (
    <label className="lab-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => setValue(event.target.value)}>
        <option>All</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ResultList({ rows, selectedId, onSelect, meta }) {
  return (
    <div className="lab-result-list">
      {rows.map((row) => (
        <button
          className={row.id === selectedId ? "active" : ""}
          key={row.id}
          type="button"
          onClick={() => onSelect(row.id)}
        >
          <strong>{row.title.replace(/ (Checklist|Form Template|Quiz)$/, "")}</strong>
          <span>{meta(row)}</span>
        </button>
      ))}
      {!rows.length ? <p>No matches.</p> : null}
    </div>
  );
}

function LabSection({ title, children }) {
  return (
    <section className="lab-section">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function BulletList({ items }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function EmptyTool() {
  return <div className="lab-preview">No content selected.</div>;
}

function LabNotFound({ path, navigateTo }) {
  return (
    <section className="lab-screen">
      <h2>Prototype not found</h2>
      <p>No Safety Lab route exists at {path}.</p>
      <button type="button" onClick={() => navigateTo("/safety-lab")}>
        Back to Safety Lab
      </button>
    </section>
  );
}

function getInitialSafetyPackId() {
  if (typeof window === "undefined") return safetyPacks[0]?.id || "";
  const packId = new URLSearchParams(window.location.search).get("pack");
  return getSafetyPackById(packId)?.id || safetyPacks[0]?.id || "";
}

function getInitialSiteScanId() {
  if (typeof window === "undefined") return siteScanSamples[0]?.id || "";
  const sampleId = new URLSearchParams(window.location.search).get("sample");
  return siteScanSamples.some((sample) => sample.id === sampleId)
    ? sampleId
    : siteScanSamples[0]?.id || "";
}

function crewModeUrl(packId) {
  if (typeof window === "undefined") return `/safety-lab/crew-mode?pack=${packId}`;
  const prefix = window.location.pathname.startsWith("/safetyfirst") ? "/safetyfirst" : "";
  return new URL(
    `${prefix}/safety-lab/crew-mode?pack=${encodeURIComponent(packId)}`,
    window.location.origin,
  ).href;
}

function getPackContent(pack) {
  const articles = findByIds(pack.wikiSlugs, (slug) => getArticleBySlug(slug));
  const talks = findByIds(pack.toolboxTalkIds, (id) =>
    safetyLabData.toolboxTalks.find((talk) => talk.id === id),
  );
  const checklists = findByIds(pack.checklistIds, (id) =>
    safetyLabData.checklists.find((checklist) => checklist.id === id),
  );
  const quizzes = findByIds(pack.quizIds, (id) =>
    safetyLabData.quizzes.find((quiz) => quiz.id === id),
  );
  const forms = findByIds(pack.formIds, (id) =>
    safetyLabData.forms.find((form) => form.id === id),
  );

  return {
    articles,
    talks,
    checklists,
    quizzes,
    forms,
    primaryTalk: talks[0],
    primaryChecklist: checklists[0],
    primaryQuiz: quizzes[0],
  };
}

function getInvestorDemoMetrics() {
  const uniqueHazards = unique(safetyPacks.flatMap((pack) => pack.hazards)).length;
  const documents = safetyPacks.reduce((total, pack) => total + pack.requiredDocuments.length, 0);
  const sourceLinks = unique(safetyPacks.flatMap((pack) => pack.wikiSlugs)).length;
  return { uniqueHazards, documents, sourceLinks };
}

function topCounts(rows, field) {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row[field], (counts.get(row[field]) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function slugifyClass(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findByIds(ids, resolve) {
  return ids.map(resolve).filter(Boolean);
}

function officialLinksForArticles(articles) {
  const links = [];

  for (const article of articles) {
    for (const refId of article.regulationRefs || []) {
      const ref = getRegulationById(refId);
      if (ref) {
        links.push({
          label: `${ref.instrument} ${ref.part}: ${ref.title}`,
          url: ref.url,
        });
      }
    }

    for (const sourceId of article.sourceIds || []) {
      const source = getSourceById(sourceId);
      if (source) {
        links.push({
          label: `${source.title} (${source.publisher})`,
          url: source.url,
        });
      }
    }
  }

  const seenUrls = new Set();
  return links.filter((link) => {
    if (seenUrls.has(link.url)) return false;
    seenUrls.add(link.url);
    return true;
  });
}

function unique(items) {
  return [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function searchText(row) {
  return normalize(JSON.stringify(row));
}
