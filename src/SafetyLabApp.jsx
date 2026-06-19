import { useEffect, useMemo, useState } from "react";
import { safetyLabData } from "./safetyLabData.js";

const LAB_NAV = [
  { label: "Lab home", path: "/safety-lab" },
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

function unique(items) {
  return [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function searchText(row) {
  return normalize(JSON.stringify(row));
}
