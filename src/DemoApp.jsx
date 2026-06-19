import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { demoScenarios, riskMapRecords, siteScanSamples } from "./demoScenarios.js";
import { safetyLabData } from "./safetyLabData.js";
import { getSafetyPackById, searchSafetyPacks } from "./safetyPacks.js";
import { getArticleBySlug, getRegulationById, getSourceById } from "./wikiContent.js";

const DEMO_STEPS = [
  "Scenario",
  "Safety pack",
  "Crew QR",
  "Crew action",
  "Risk summary",
];

export default function DemoApp({ navigateTo }) {
  const [scenarioId, setScenarioId] = useState(demoScenarios[0].id);
  const [query, setQuery] = useState(demoScenarios[0].input);
  const [step, setStep] = useState(0);
  const [checkedItems, setCheckedItems] = useState({});
  const [answers, setAnswers] = useState({});
  const [qrDataUrl, setQrDataUrl] = useState("");

  const scenario = demoScenarios.find((item) => item.id === scenarioId) || demoScenarios[0];
  const rankedPacks = useMemo(() => searchSafetyPacks(query), [query]);
  const selectedPack = rankedPacks[0] || getSafetyPackById(scenario.packId);
  const pack = getSafetyPackById(selectedPack?.id || scenario.packId);
  const resolved = useMemo(() => resolvePackContent(pack), [pack]);
  const siteScan = siteScanSamples.find((sample) => sample.id === scenario.siteScanId) || siteScanSamples[0];
  const relatedRisk = riskMapRecords.filter((record) => record.packId === pack.id || record.hazard === resolved.primaryHazard);
  const miniQuestions = resolved.primaryQuiz?.questions.slice(0, 3) || [];
  const checklistItems = resolved.primaryChecklist?.items.slice(0, 4) || [];
  const completedChecks = Object.values(checkedItems).filter(Boolean).length;
  const completedAnswers = Object.keys(answers).length;

  useEffect(() => {
    document.title = "Safety First Investor Demo";
  }, []);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(crewModeUrl(pack.id), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [pack.id]);

  const chooseScenario = (nextScenarioId) => {
    const nextScenario = demoScenarios.find((item) => item.id === nextScenarioId) || demoScenarios[0];
    setScenarioId(nextScenario.id);
    setQuery(nextScenario.input);
    setStep(0);
    setCheckedItems({});
    setAnswers({});
  };

  return (
    <div className="demo-root">
      <header className="demo-hero">
        <div>
          <p className="demo-kicker">Monday investor demo</p>
          <h1>Source-aware safety workflows from one jobsite scenario</h1>
          <p>
            A supervisor enters plain jobsite language. Safety First assembles a draft
            pack, crew handoff, mini training loop, and risk view from local cited content.
          </p>
        </div>
        <div className="demo-guardrail">
          Offline-safe. Draft content. Needs human safety/source review. Not legal advice
          or proof of competency.
        </div>
      </header>

      <main className="demo-main">
        <nav className="demo-stepper" aria-label="Demo steps">
          {DEMO_STEPS.map((label, index) => (
            <button
              className={index === step ? "active" : ""}
              key={label}
              type="button"
              onClick={() => setStep(index)}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          ))}
        </nav>

        <section className="demo-layout">
          <aside className="demo-sidebar">
            <h2>Script</h2>
            <div className="demo-scenario-list">
              {demoScenarios.map((item) => (
                <button
                  className={item.id === scenario.id ? "active" : ""}
                  key={item.id}
                  type="button"
                  onClick={() => chooseScenario(item.id)}
                >
                  <strong>{item.title}</strong>
                  <span>{item.headline}</span>
                </button>
              ))}
            </div>
            <div className="demo-note">
              <strong>Presenter notes</strong>
              <ul>
                {scenario.presenterNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </aside>

          <article className="demo-stage">
            {step === 0 ? (
              <ScenarioStep
                pack={pack}
                query={query}
                rankedPacks={rankedPacks.slice(0, 3)}
                setQuery={setQuery}
              />
            ) : null}
            {step === 1 ? (
              <SafetyPackStep navigateTo={navigateTo} pack={pack} resolved={resolved} />
            ) : null}
            {step === 2 ? (
              <CrewQrStep navigateTo={navigateTo} pack={pack} qrDataUrl={qrDataUrl} />
            ) : null}
            {step === 3 ? (
              <CrewActionStep
                answers={answers}
                checklistItems={checklistItems}
                checkedItems={checkedItems}
                completedAnswers={completedAnswers}
                completedChecks={completedChecks}
                miniQuestions={miniQuestions}
                pack={pack}
                resolved={resolved}
                setAnswers={setAnswers}
                setCheckedItems={setCheckedItems}
              />
            ) : null}
            {step === 4 ? (
              <RiskSummaryStep
                navigateTo={navigateTo}
                pack={pack}
                relatedRisk={relatedRisk}
                resolved={resolved}
                scenario={scenario}
                siteScan={siteScan}
              />
            ) : null}
          </article>
        </section>
      </main>
    </div>
  );
}

function ScenarioStep({ pack, query, rankedPacks, setQuery }) {
  return (
    <div className="demo-card">
      <p className="demo-kicker">Step 1</p>
      <h2>Enter the jobsite task</h2>
      <label className="demo-field">
        <span>Supervisor input</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="demo-match-card">
        <span>Top match</span>
        <strong>{pack.title}</strong>
        <p>{pack.scenario}</p>
      </div>
      <div className="demo-compare-grid">
        {rankedPacks.map((candidate) => (
          <section key={candidate.id}>
            <strong>{candidate.title}</strong>
            <span>
              {candidate.score ? `Matched: ${candidate.matchedTerms.join(", ")}` : "Demo-ready source pack"}
            </span>
          </section>
        ))}
      </div>
    </div>
  );
}

function SafetyPackStep({ navigateTo, pack, resolved }) {
  return (
    <div className="demo-card">
      <p className="demo-kicker">Step 2</p>
      <h2>Generated safety pack</h2>
      <div className="demo-metric-row">
        <Metric label="Wiki articles" value={resolved.articles.length} />
        <Metric label="Talks" value={resolved.talks.length} />
        <Metric label="Checklists" value={resolved.checklists.length} />
        <Metric label="Forms" value={resolved.forms.length} />
      </div>
      <section className="demo-pack-summary">
        <h3>{pack.title}</h3>
        <p>{pack.reviewNotice}</p>
        <ul>
          {pack.requiredDocuments.map((documentName) => (
            <li key={documentName}>{documentName}</li>
          ))}
        </ul>
      </section>
      <div className="demo-link-grid">
        {resolved.articles.slice(0, 4).map((article) => (
          <button
            key={article.slug}
            type="button"
            onClick={() => navigateTo(`/wiki/articles/${article.slug}`)}
          >
            {article.title}
          </button>
        ))}
        <button type="button" onClick={() => navigateTo(`/safety-lab/safety-pack?pack=${pack.id}`)}>
          Open full pack
        </button>
      </div>
    </div>
  );
}

function CrewQrStep({ navigateTo, pack, qrDataUrl }) {
  return (
    <div className="demo-card">
      <p className="demo-kicker">Step 3</p>
      <h2>QR crew handoff</h2>
      <div className="demo-qr-layout">
        {qrDataUrl ? <img alt={`QR code for ${pack.title}`} src={qrDataUrl} /> : null}
        <div>
          <strong>{pack.title}</strong>
          <p>
            This QR opens a mobile crew-mode page for the same draft pack. No worker
            names, permanent records, or competency claims are created.
          </p>
          <button type="button" onClick={() => navigateTo(`/safety-lab/crew-mode?pack=${pack.id}`)}>
            Open crew mode
          </button>
        </div>
      </div>
    </div>
  );
}

function CrewActionStep({
  answers,
  checklistItems,
  checkedItems,
  completedAnswers,
  completedChecks,
  miniQuestions,
  pack,
  resolved,
  setAnswers,
  setCheckedItems,
}) {
  return (
    <div className="demo-card">
      <p className="demo-kicker">Step 4</p>
      <h2>Crew action loop</h2>
      <section className="demo-pack-summary">
        <h3>{resolved.primaryTalk?.title || pack.title}</h3>
        <p>{resolved.primaryTalk?.keyMessage || pack.scenario}</p>
      </section>
      <div className="demo-action-grid">
        <section>
          <h3>Checklist</h3>
          {checklistItems.map((item, index) => (
            <label className="demo-check" key={item}>
              <input
                checked={Boolean(checkedItems[index])}
                type="checkbox"
                onChange={(event) =>
                  setCheckedItems((current) => ({ ...current, [index]: event.target.checked }))
                }
              />
              <span>{item}</span>
            </label>
          ))}
          <p>{completedChecks}/{checklistItems.length} checklist items checked</p>
        </section>
        <section>
          <h3>Mini quiz</h3>
          {miniQuestions.map((question) => (
            <div className="demo-mini-question" key={question.number}>
              <strong>{question.prompt}</strong>
              <div>
                {question.choices.slice(0, 2).map((choice) => (
                  <button
                    className={answers[question.number] === choice.letter ? "active" : ""}
                    disabled={Boolean(answers[question.number])}
                    key={choice.letter}
                    type="button"
                    onClick={() =>
                      setAnswers((current) => ({ ...current, [question.number]: choice.letter }))
                    }
                  >
                    {choice.letter}. {choice.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p>{completedAnswers}/{miniQuestions.length} questions answered. Practice only.</p>
        </section>
      </div>
    </div>
  );
}

function RiskSummaryStep({ navigateTo, pack, relatedRisk, resolved, scenario, siteScan }) {
  const sourceCount = officialLinksForArticles(resolved.articles).length;
  return (
    <div className="demo-card">
      <p className="demo-kicker">Step 5</p>
      <h2>Risk visibility</h2>
      <div className="demo-metric-row">
        <Metric label="Hazards" value={scenario.riskSummary.hazards} />
        <Metric label="Docs" value={scenario.riskSummary.documents} />
        <Metric label="Source links" value={sourceCount || scenario.riskSummary.sourceLinks} />
        <Metric label="Minutes saved" value={scenario.riskSummary.timeSavedMinutes} />
      </div>
      <div className="demo-risk-grid">
        <section>
          <h3>Simulated scan</h3>
          <p>{siteScan.title}: {siteScan.scenario}</p>
          <button type="button" onClick={() => navigateTo(`/safety-lab/site-scan?sample=${siteScan.id}`)}>
            Open site scan
          </button>
        </section>
        <section>
          <h3>Risk records</h3>
          <p>{relatedRisk.length} related demo risks connect back to {pack.title}.</p>
          <button type="button" onClick={() => navigateTo("/safety-lab/risk-map")}>
            Open risk map
          </button>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="demo-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function resolvePackContent(pack) {
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
    primaryHazard: pack.hazards[0] || "",
  };
}

function officialLinksForArticles(articles) {
  const links = [];

  for (const article of articles) {
    for (const refId of article.regulationRefs || []) {
      const ref = getRegulationById(refId);
      if (ref) links.push(ref.url);
    }

    for (const sourceId of article.sourceIds || []) {
      const source = getSourceById(sourceId);
      if (source) links.push(source.url);
    }
  }

  return [...new Set(links)];
}

function findByIds(ids, resolve) {
  return ids.map(resolve).filter(Boolean);
}

function crewModeUrl(packId) {
  if (typeof window === "undefined") return `/safety-lab/crew-mode?pack=${packId}`;
  const prefix = window.location.pathname.startsWith("/safetyfirst") ? "/safetyfirst" : "";
  return new URL(
    `${prefix}/safety-lab/crew-mode?pack=${encodeURIComponent(packId)}`,
    window.location.origin,
  ).href;
}
