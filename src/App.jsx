import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  DEFICIENCY_STATUSES,
  HAZARD_CATEGORIES,
  HIGH_RISK_STATUSES,
  HIGH_RISK_TYPES,
  RISK_LEVELS,
  TOOLBOX_TOPICS,
  TRADE_OPTIONS,
  blankDeficiency,
  blankHighRiskDoc,
  blankTrainingRecord,
} from "./data.js";
import { loadSafetyData, resetSafetyData, saveSafetyData } from "./storage.js";
import {
  StaffHomePage,
  StaffLoginPage,
  StaffSettingsPage,
  StaffSignInsPage,
  WorkerSignInPage,
  WorkerSignInQr,
  WorkerSignOutPage,
  WorkerSignOutQr,
} from "./WorkerSignIn.jsx";
import WikiApp from "./WikiApp.jsx";
import {
  csvFieldsFor,
  daysUntil,
  downloadCsv,
  escapeHtml,
  getDashboardMetrics,
  isOpenDeficiency,
  isOverdue,
  normalizeImportedRows,
  openPrintableDocument,
  parseCsv,
  todayISO,
} from "./utils.js";

const VIEWS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "deficiencies", label: "Deficiencies" },
  { id: "toolbox", label: "Toolbox Talk" },
  { id: "training", label: "Training" },
  { id: "highRisk", label: "High-Risk Board" },
  { id: "reports", label: "Reports" },
  { id: "data", label: "Data" },
];

const SafetyLabApp = lazy(() => import("./SafetyLabApp.jsx"));
const TrainingQuizApp = lazy(() => import("./TrainingQuizApp.jsx"));
const DemoApp = lazy(() => import("./DemoApp.jsx"));

export default function App() {
  const routePath = useRoutePath();

  if (routePath === "/worker-sign-in-qr") {
    return <WorkerSignInQr navigateTo={navigateTo} />;
  }

  if (routePath === "/worker-sign-in") {
    return <WorkerSignInPage />;
  }

  if (routePath === "/worker-sign-out-qr") {
    return <WorkerSignOutQr navigateTo={navigateTo} />;
  }

  if (routePath === "/worker-sign-out") {
    return <WorkerSignOutPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff-login") {
    return <StaffLoginPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/home") {
    return <StaffHomePage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/sign-ins") {
    return <StaffSignInsPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/settings") {
    return <StaffSettingsPage navigateTo={navigateTo} />;
  }

  if (routePath === "/wiki" || routePath.startsWith("/wiki/")) {
    return <WikiApp routePath={routePath} navigateTo={navigateTo} />;
  }

  if (routePath === "/safety-lab" || routePath.startsWith("/safety-lab/")) {
    return (
      <Suspense fallback={<div className="route-loading">Loading Safety Lab...</div>}>
        <SafetyLabApp routePath={routePath} navigateTo={navigateTo} />
      </Suspense>
    );
  }

  if (routePath === "/training-quiz" || routePath.startsWith("/training-quiz/")) {
    return (
      <Suspense fallback={<div className="route-loading">Loading Training Quiz...</div>}>
        <TrainingQuizApp routePath={routePath} navigateTo={navigateTo} />
      </Suspense>
    );
  }

  if (routePath === "/demo") {
    return (
      <Suspense fallback={<div className="route-loading">Loading Demo...</div>}>
        <DemoApp navigateTo={navigateTo} />
      </Suspense>
    );
  }

  return <SafetyFirstApp navigateTo={navigateTo} />;
}

function SafetyFirstApp({ navigateTo }) {
  const [data, setData] = useState(loadSafetyData);
  const [activeView, setActiveView] = useState("dashboard");

  useEffect(() => {
    saveSafetyData(data);
  }, [data]);

  const metrics = useMemo(
    () => getDashboardMetrics(data.deficiencies),
    [data.deficiencies],
  );

  const updateCollection = (collection, updater) => {
    setData((current) => ({
      ...current,
      [collection]:
        typeof updater === "function" ? updater(current[collection]) : updater,
    }));
  };

  const renderActiveView = () => {
    switch (activeView) {
      case "deficiencies":
        return (
          <DeficiencyTracker
            deficiencies={data.deficiencies}
            updateDeficiencies={(updater) =>
              updateCollection("deficiencies", updater)
            }
          />
        );
      case "toolbox":
        return <ToolboxTalkGenerator deficiencies={data.deficiencies} />;
      case "training":
        return (
          <TrainingTracker
            records={data.trainingRecords}
            updateRecords={(updater) =>
              updateCollection("trainingRecords", updater)
            }
          />
        );
      case "highRisk":
        return (
          <HighRiskBoard
            records={data.highRiskDocs}
            updateRecords={(updater) => updateCollection("highRiskDocs", updater)}
          />
        );
      case "reports":
        return <Reports data={data} metrics={metrics} />;
      case "data":
        return <DataTools data={data} setData={setData} />;
      default:
        return <Dashboard data={data} metrics={metrics} />;
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Vancouver condo tower site</p>
          <h1>Safety First</h1>
          <p className="header-copy">
            Local-first CSO documentation for inspections, deficiencies,
            training checks, toolbox talks, and high-risk work.
          </p>
        </div>
        <div className="header-panel">
          <strong>Admin aid only</strong>
          <span>No final legal or safety decisions. Do not record medical or private first aid details.</span>
        </div>
      </header>

      <nav className="view-tabs" aria-label="Safety app sections">
        {VIEWS.map((view) => (
          <button
            className={view.id === activeView ? "tab-button active" : "tab-button"}
            key={view.id}
            type="button"
            onClick={() => setActiveView(view.id)}
          >
            {view.label}
          </button>
        ))}
        <button
          className="tab-button"
          type="button"
          onClick={() => navigateTo("/worker-sign-in-qr")}
        >
          Sign-In QR
        </button>
        <button
          className="tab-button"
          type="button"
          onClick={() => navigateTo("/worker-sign-out-qr")}
        >
          Sign-Out QR
        </button>
        <button
          className="tab-button"
          type="button"
          onClick={() => navigateTo("/staff-login")}
        >
          Staff
        </button>
      </nav>

      <main className="app-main">{renderActiveView()}</main>
    </div>
  );
}

function useRoutePath() {
  const [path, setPath] = useState(getRoutePath);

  useEffect(() => {
    const handlePopState = () => setPath(getRoutePath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return path;
}

function getRoutePath() {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  return path.startsWith("/safetyfirst")
    ? path.replace(/^\/safetyfirst/, "") || "/"
    : path;
}

function navigateTo(path) {
  const prefix =
    window.location.pathname.startsWith("/safetyfirst") ? "/safetyfirst" : "";
  window.history.pushState({}, "", `${prefix}${path}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Dashboard({ data, metrics }) {
  const openDeficiencies = data.deficiencies.filter(isOpenDeficiency);
  const overdue = data.deficiencies.filter(isOverdue);
  const activeHighRisk = data.highRiskDocs.filter((item) =>
    ["Active", "Needs review", "On hold"].includes(item.status),
  );

  return (
    <section className="screen stack">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Today</p>
          <h2>Site safety dashboard</h2>
        </div>
        <p className="muted">{todayISO()}</p>
      </div>

      <div className="metric-grid">
        <MetricCard label="Open items" value={metrics.openCount} tone="blue" />
        <MetricCard label="Overdue items" value={metrics.overdueCount} tone="red" />
        <MetricCard label="High-risk open" value={metrics.highRiskCount} tone="amber" />
        <MetricCard
          label="Avg closeout"
          value={`${metrics.averageCloseoutDays}d`}
          tone="green"
        />
      </div>

      <div className="dashboard-grid">
        <Panel title="Open deficiencies">
          <CompactDeficiencyList rows={openDeficiencies.slice(0, 6)} />
        </Panel>
        <Panel title="Overdue focus">
          {overdue.length ? (
            <CompactDeficiencyList rows={overdue.slice(0, 6)} />
          ) : (
            <EmptyState text="No overdue sample items in the current view." />
          )}
        </Panel>
        <Panel title="Repeat trades">
          <CountList rows={metrics.repeatTrades} />
        </Panel>
        <Panel title="Repeat hazard types">
          <CountList rows={metrics.repeatHazards} />
        </Panel>
      </div>

      <Panel title="High-risk work needing attention">
        <div className="risk-board-mini">
          {activeHighRisk.map((item) => (
            <div className="risk-strip" key={item.id}>
              <div>
                <strong>{item.type}</strong>
                <span>{item.location || "Location not set"}</span>
              </div>
              <StatusPill value={item.status} />
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function DeficiencyTracker({ deficiencies, updateDeficiencies }) {
  const [form, setForm] = useState(blankDeficiency);
  const [editingId, setEditingId] = useState("");
  const [filters, setFilters] = useState({
    status: "All",
    riskLevel: "All",
    tradeCompany: "All",
  });

  const filteredDeficiencies = deficiencies.filter((item) => {
    const statusMatch = filters.status === "All" || item.status === filters.status;
    const riskMatch =
      filters.riskLevel === "All" || item.riskLevel === filters.riskLevel;
    const tradeMatch =
      filters.tradeCompany === "All" ||
      item.tradeCompany === filters.tradeCompany;
    return statusMatch && riskMatch && tradeMatch;
  });

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const prepared = {
      ...form,
      closedAt:
        form.status === "Closed" ? form.closedAt || todayISO() : form.closedAt,
    };

    if (editingId) {
      updateDeficiencies((rows) =>
        rows.map((item) => (item.id === editingId ? prepared : item)),
      );
    } else {
      updateDeficiencies((rows) => [prepared, ...rows]);
    }

    setForm(blankDeficiency());
    setEditingId("");
  };

  const editItem = (item) => {
    setForm(item);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeItem = (id) => {
    updateDeficiencies((rows) =>
      rows.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Closed",
              closedAt: item.closedAt || todayISO(),
              closeoutNotes:
                item.closeoutNotes || "Closed in local sample tracker.",
            }
          : item,
      ),
    );
  };

  const deleteItem = (id) => {
    if (!window.confirm("Delete this local deficiency record?")) return;
    updateDeficiencies((rows) => rows.filter((item) => item.id !== id));
  };

  return (
    <section className="screen stack">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Inspection log</p>
          <h2>Deficiency tracker</h2>
        </div>
        <span className="count-chip">{filteredDeficiencies.length} shown</span>
      </div>

      <Panel title={editingId ? "Edit deficiency" : "Add deficiency"}>
        <form className="form-grid" onSubmit={handleSubmit}>
          <Field label="Floor / location">
            <input
              required
              value={form.floorLocation}
              onChange={(event) =>
                handleChange("floorLocation", event.target.value)
              }
              placeholder="Level 18 east slab edge"
            />
          </Field>
          <Field label="Trade / company">
            <select
              value={form.tradeCompany}
              onChange={(event) =>
                handleChange("tradeCompany", event.target.value)
              }
            >
              {TRADE_OPTIONS.map((trade) => (
                <option key={trade}>{trade}</option>
              ))}
            </select>
          </Field>
          <Field label="Hazard category">
            <select
              value={form.hazardCategory}
              onChange={(event) =>
                handleChange("hazardCategory", event.target.value)
              }
            >
              {HAZARD_CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </Field>
          <Field label="Risk level">
            <select
              value={form.riskLevel}
              onChange={(event) => handleChange("riskLevel", event.target.value)}
            >
              {RISK_LEVELS.map((risk) => (
                <option key={risk}>{risk}</option>
              ))}
            </select>
          </Field>
          <Field label="Description" wide>
            <textarea
              required
              rows="3"
              value={form.description}
              onChange={(event) =>
                handleChange("description", event.target.value)
              }
              placeholder="Observed condition, expected control, and immediate action."
            />
          </Field>
          <Field label="Photo placeholder">
            <input
              value={form.photoPlaceholder}
              onChange={(event) =>
                handleChange("photoPlaceholder", event.target.value)
              }
              placeholder="Photo ref or filename"
            />
          </Field>
          <Field label="Assigned to">
            <input
              value={form.assignedTo}
              onChange={(event) => handleChange("assignedTo", event.target.value)}
              placeholder="Foreperson or supervisor"
            />
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => handleChange("dueDate", event.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) => handleChange("status", event.target.value)}
            >
              {DEFICIENCY_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Closeout notes" wide>
            <textarea
              rows="2"
              value={form.closeoutNotes}
              onChange={(event) =>
                handleChange("closeoutNotes", event.target.value)
              }
              placeholder="Corrective action, verification, or reason still open."
            />
          </Field>
          <div className="form-actions">
            <button className="primary-button" type="submit">
              {editingId ? "Save changes" : "Add item"}
            </button>
            {editingId ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setForm(blankDeficiency());
                  setEditingId("");
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </Panel>

      <Panel title="Filter and review">
        <div className="filter-row">
          <Field label="Status">
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option>All</option>
              {DEFICIENCY_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Risk">
            <select
              value={filters.riskLevel}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  riskLevel: event.target.value,
                }))
              }
            >
              <option>All</option>
              {RISK_LEVELS.map((risk) => (
                <option key={risk}>{risk}</option>
              ))}
            </select>
          </Field>
          <Field label="Trade">
            <select
              value={filters.tradeCompany}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  tradeCompany: event.target.value,
                }))
              }
            >
              <option>All</option>
              {TRADE_OPTIONS.map((trade) => (
                <option key={trade}>{trade}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Location</th>
                <th>Trade</th>
                <th>Hazard</th>
                <th>Risk</th>
                <th>Due</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeficiencies.map((item) => (
                <tr key={item.id} className={isOverdue(item) ? "row-alert" : ""}>
                  <td>
                    <strong>{item.floorLocation}</strong>
                    <span className="table-note">{item.description}</span>
                  </td>
                  <td>{item.tradeCompany}</td>
                  <td>{item.hazardCategory}</td>
                  <td>
                    <RiskBadge value={item.riskLevel} />
                  </td>
                  <td>{item.dueDate || "Not set"}</td>
                  <td>
                    <StatusPill value={item.status} />
                  </td>
                  <td>{item.assignedTo || "Unassigned"}</td>
                  <td>
                    <div className="button-row">
                      <button type="button" onClick={() => editItem(item)}>
                        Edit
                      </button>
                      {item.status !== "Closed" ? (
                        <button type="button" onClick={() => closeItem(item.id)}>
                          Close
                        </button>
                      ) : null}
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => deleteItem(item.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}

function ToolboxTalkGenerator({ deficiencies }) {
  const recentIssueSummary = deficiencies
    .filter(isOpenDeficiency)
    .slice(0, 3)
    .map((item) => `${item.hazardCategory}: ${item.floorLocation}`)
    .join("; ");

  const [form, setForm] = useState({
    topic: TOOLBOX_TOPICS[0],
    trade: TRADE_OPTIONS[0],
    activeWork: "Concrete forming and material landing on upper tower levels",
    recentIssues: recentIssueSummary,
  });

  const talk = useMemo(() => buildToolboxTalk(form), [form]);
  const talkHtml = buildToolboxTalkHtml(talk);

  const copyTalk = async () => {
    await navigator.clipboard.writeText(buildToolboxTalkText(talk));
  };

  return (
    <section className="screen stack">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Crew meeting</p>
          <h2>Toolbox talk generator</h2>
        </div>
        <div className="button-row">
          <button type="button" onClick={copyTalk}>
            Copy talk
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => openPrintableDocument(talk.title, talkHtml)}
          >
            Print PDF
          </button>
        </div>
      </div>

      <Panel title="Talk inputs">
        <div className="form-grid">
          <Field label="Topic">
            <select
              value={form.topic}
              onChange={(event) =>
                setForm((current) => ({ ...current, topic: event.target.value }))
              }
            >
              {TOOLBOX_TOPICS.map((topic) => (
                <option key={topic}>{topic}</option>
              ))}
            </select>
          </Field>
          <Field label="Trade">
            <select
              value={form.trade}
              onChange={(event) =>
                setForm((current) => ({ ...current, trade: event.target.value }))
              }
            >
              {TRADE_OPTIONS.map((trade) => (
                <option key={trade}>{trade}</option>
              ))}
            </select>
          </Field>
          <Field label="Active work" wide>
            <textarea
              rows="2"
              value={form.activeWork}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  activeWork: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Recent issues" wide>
            <textarea
              rows="2"
              value={form.recentIssues}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  recentIssues: event.target.value,
                }))
              }
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Generated 5-minute talk">
        <ToolboxTalkPreview talk={talk} />
      </Panel>
    </section>
  );
}

function TrainingTracker({ records, updateRecords }) {
  const [form, setForm] = useState(blankTrainingRecord);
  const [editingId, setEditingId] = useState("");

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (editingId) {
      updateRecords((rows) =>
        rows.map((item) => (item.id === editingId ? form : item)),
      );
    } else {
      updateRecords((rows) => [form, ...rows]);
    }
    setForm(blankTrainingRecord());
    setEditingId("");
  };

  const deleteRecord = (id) => {
    if (!window.confirm("Delete this local training record?")) return;
    updateRecords((rows) => rows.filter((item) => item.id !== id));
  };

  return (
    <section className="screen stack">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Orientation</p>
          <h2>Training tracker</h2>
        </div>
        <span className="count-chip">{records.length} sample workers</span>
      </div>

      <Panel title={editingId ? "Edit worker record" : "Add worker record"}>
        <form className="form-grid" onSubmit={handleSubmit}>
          <Field label="Worker name placeholder">
            <input
              required
              value={form.workerName}
              onChange={(event) => handleChange("workerName", event.target.value)}
              placeholder="Worker name or site badge placeholder"
            />
          </Field>
          <Field label="Employer / trade">
            <select
              value={form.employerTrade}
              onChange={(event) =>
                handleChange("employerTrade", event.target.value)
              }
            >
              {TRADE_OPTIONS.map((trade) => (
                <option key={trade}>{trade}</option>
              ))}
            </select>
          </Field>
          <Field label="Supervisor">
            <input
              value={form.supervisorName}
              onChange={(event) =>
                handleChange("supervisorName", event.target.value)
              }
              placeholder="Supervisor name"
            />
          </Field>
          <Field label="Expiry">
            <input
              type="date"
              value={form.expiryDate}
              onChange={(event) => handleChange("expiryDate", event.target.value)}
            />
          </Field>
          <Field label="Reminder">
            <input
              type="date"
              value={form.reminderDate}
              onChange={(event) =>
                handleChange("reminderDate", event.target.value)
              }
            />
          </Field>
          <div className="check-group">
            <CheckboxField
              checked={form.orientationComplete}
              label="Orientation complete"
              onChange={(checked) => handleChange("orientationComplete", checked)}
            />
            <CheckboxField
              checked={form.fallProtectionVerified}
              label="Fall protection verified"
              onChange={(checked) =>
                handleChange("fallProtectionVerified", checked)
              }
            />
            <CheckboxField
              checked={form.silicaTrainingVerified}
              label="Silica training verified"
              onChange={(checked) =>
                handleChange("silicaTrainingVerified", checked)
              }
            />
          </div>
          <Field label="Notes" wide>
            <textarea
              rows="2"
              value={form.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
              placeholder="Administrative reminders only. No medical or private first aid details."
            />
          </Field>
          <div className="form-actions">
            <button className="primary-button" type="submit">
              {editingId ? "Save changes" : "Add record"}
            </button>
            {editingId ? (
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setForm(blankTrainingRecord());
                  setEditingId("");
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </Panel>

      <Panel title="Training records">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Employer / trade</th>
                <th>Orientation</th>
                <th>Fall protection</th>
                <th>Silica</th>
                <th>Expiry</th>
                <th>Reminder</th>
                <th>Supervisor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className={daysUntil(record.reminderDate) === 0 ? "row-alert" : ""}
                >
                  <td>
                    <strong>{record.workerName}</strong>
                    <span className="table-note">{record.notes}</span>
                  </td>
                  <td>{record.employerTrade}</td>
                  <td>{yesNo(record.orientationComplete)}</td>
                  <td>{yesNo(record.fallProtectionVerified)}</td>
                  <td>{yesNo(record.silicaTrainingVerified)}</td>
                  <td>{record.expiryDate || "Not set"}</td>
                  <td>{reminderLabel(record.reminderDate)}</td>
                  <td>{record.supervisorName || "Not set"}</td>
                  <td>
                    <div className="button-row">
                      <button
                        type="button"
                        onClick={() => {
                          setForm(record);
                          setEditingId(record.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => deleteRecord(record.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </section>
  );
}

function HighRiskBoard({ records, updateRecords }) {
  const boardRecords = HIGH_RISK_TYPES.map(
    (type) => records.find((record) => record.type === type) || blankHighRiskDoc(type),
  );

  const updateRecord = (type, field, value) => {
    updateRecords((rows) => {
      const existing = rows.find((record) => record.type === type);
      if (!existing) return [...rows, { ...blankHighRiskDoc(type), [field]: value }];
      return rows.map((record) =>
        record.type === type ? { ...record, [field]: value } : record,
      );
    });
  };

  return (
    <section className="screen stack">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Planning board</p>
          <h2>High-risk work documentation</h2>
        </div>
        <span className="count-chip">{HIGH_RISK_TYPES.length} categories</span>
      </div>

      <div className="high-risk-grid">
        {boardRecords.map((record) => (
          <section className="work-card" key={record.type}>
            <div className="work-card-header">
              <h3>{record.type}</h3>
              <StatusPill value={record.status} />
            </div>
            <div className="work-form">
              <Field label="Status">
                <select
                  value={record.status}
                  onChange={(event) =>
                    updateRecord(record.type, "status", event.target.value)
                  }
                >
                  {HIGH_RISK_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </Field>
              <Field label="Location">
                <input
                  value={record.location}
                  onChange={(event) =>
                    updateRecord(record.type, "location", event.target.value)
                  }
                  placeholder="Work area"
                />
              </Field>
              <Field label="Responsible">
                <input
                  value={record.responsible}
                  onChange={(event) =>
                    updateRecord(record.type, "responsible", event.target.value)
                  }
                  placeholder="Supervisor or coordinator"
                />
              </Field>
              <Field label="Permit / doc ref">
                <input
                  value={record.permitRef}
                  onChange={(event) =>
                    updateRecord(record.type, "permitRef", event.target.value)
                  }
                  placeholder="Reference"
                />
              </Field>
              <Field label="Review date">
                <input
                  type="date"
                  value={record.reviewDate}
                  onChange={(event) =>
                    updateRecord(record.type, "reviewDate", event.target.value)
                  }
                />
              </Field>
              <Field label="Notes">
                <textarea
                  rows="3"
                  value={record.notes}
                  onChange={(event) =>
                    updateRecord(record.type, "notes", event.target.value)
                  }
                  placeholder="Required checks, pending signatures, or review notes."
                />
              </Field>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

function Reports({ data, metrics }) {
  const [reportType, setReportType] = useState("weekly");
  const [trade, setTrade] = useState(TRADE_OPTIONS[0]);
  const [deficiencyId, setDeficiencyId] = useState(
    data.deficiencies[0]?.id || "",
  );

  const report = useMemo(() => {
    if (reportType === "trade") {
      const text = buildTradeEmailText(data.deficiencies, trade);
      return {
        title: `${trade} followup email draft`,
        html: `<h1>${escapeHtml(trade)} followup email draft</h1><pre>${escapeHtml(text)}</pre>`,
        emailText: text,
      };
    }

    if (reportType === "corrective") {
      const deficiency =
        data.deficiencies.find((item) => item.id === deficiencyId) ||
        data.deficiencies[0];
      return buildCorrectiveActionReport(deficiency);
    }

    return buildWeeklySafetySummary(data, metrics);
  }, [data, deficiencyId, metrics, reportType, trade]);

  const copyEmail = async () => {
    if (report.emailText) await navigator.clipboard.writeText(report.emailText);
  };

  return (
    <section className="screen stack">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Exports</p>
          <h2>Reports</h2>
        </div>
        <div className="button-row">
          {report.emailText ? (
            <button type="button" onClick={copyEmail}>
              Copy email
            </button>
          ) : null}
          <button
            className="primary-button"
            type="button"
            onClick={() => openPrintableDocument(report.title, report.html)}
          >
            Print PDF
          </button>
        </div>
      </div>

      <Panel title="Report type">
        <div className="filter-row">
          <Field label="Report">
            <select
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
            >
              <option value="weekly">Weekly safety summary</option>
              <option value="trade">Trade followup email draft</option>
              <option value="corrective">Corrective action report</option>
            </select>
          </Field>
          {reportType === "trade" ? (
            <Field label="Trade">
              <select value={trade} onChange={(event) => setTrade(event.target.value)}>
                {TRADE_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
          ) : null}
          {reportType === "corrective" ? (
            <Field label="Deficiency">
              <select
                value={deficiencyId}
                onChange={(event) => setDeficiencyId(event.target.value)}
              >
                {data.deficiencies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.floorLocation}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
      </Panel>

      <Panel title="Preview">
        <article
          className="report-preview"
          dangerouslySetInnerHTML={{ __html: report.html }}
        />
      </Panel>
    </section>
  );
}

function DataTools({ data, setData }) {
  const [importType, setImportType] = useState("deficiencies");
  const [message, setMessage] = useState("");

  const exportCollection = (type) => {
    const filename = `${type}-${todayISO()}.csv`;
    downloadCsv(filename, data[type], csvFieldsFor(type));
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = normalizeImportedRows(importType, parseCsv(text));
    setData((current) => ({
      ...current,
      [importType]: [...rows, ...current[importType]],
    }));
    setMessage(`${rows.length} rows imported into ${labelForCollection(importType)}.`);
    event.target.value = "";
  };

  const handleReset = () => {
    if (!window.confirm("Replace local data with the original sample data?")) return;
    setData(resetSafetyData());
    setMessage("Sample data restored.");
  };

  return (
    <section className="screen stack">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Local storage</p>
          <h2>CSV export and import</h2>
        </div>
        <button className="danger-button" type="button" onClick={handleReset}>
          Reset sample data
        </button>
      </div>

      <div className="data-grid">
        <Panel title="Export CSV">
          <div className="button-row wrap">
            <button type="button" onClick={() => exportCollection("deficiencies")}>
              Export deficiencies
            </button>
            <button
              type="button"
              onClick={() => exportCollection("trainingRecords")}
            >
              Export training
            </button>
            <button type="button" onClick={() => exportCollection("highRiskDocs")}>
              Export high-risk docs
            </button>
          </div>
        </Panel>

        <Panel title="Import CSV">
          <div className="form-grid compact-form">
            <Field label="Import into">
              <select
                value={importType}
                onChange={(event) => setImportType(event.target.value)}
              >
                <option value="deficiencies">Deficiencies</option>
                <option value="trainingRecords">Training records</option>
                <option value="highRiskDocs">High-risk docs</option>
              </select>
            </Field>
            <Field label="CSV file">
              <input accept=".csv,text/csv" type="file" onChange={handleImport} />
            </Field>
          </div>
          {message ? <p className="success-text">{message}</p> : null}
        </Panel>

        <Panel title="Storage snapshot">
          <dl className="snapshot-list">
            <div>
              <dt>Deficiencies</dt>
              <dd>{data.deficiencies.length}</dd>
            </div>
            <div>
              <dt>Training records</dt>
              <dd>{data.trainingRecords.length}</dd>
            </div>
            <div>
              <dt>High-risk docs</dt>
              <dd>{data.highRiskDocs.length}</dd>
            </div>
            <div>
              <dt>Browser key</dt>
              <dd>safety-first-vancouver-condo-v1</dd>
            </div>
          </dl>
        </Panel>
      </div>
    </section>
  );
}

function MetricCard({ label, value, tone }) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <label className={wide ? "field wide" : "field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function CheckboxField({ checked, label, onChange }) {
  return (
    <label className="checkbox-field">
      <input
        checked={checked}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function RiskBadge({ value }) {
  return <span className={`risk-badge risk-${slug(value)}`}>{value}</span>;
}

function StatusPill({ value }) {
  return <span className={`status-pill status-${slug(value)}`}>{value}</span>;
}

function CompactDeficiencyList({ rows }) {
  if (!rows.length) return <EmptyState text="No matching deficiency items." />;

  return (
    <div className="compact-list">
      {rows.map((item) => (
        <div className="compact-item" key={item.id}>
          <div>
            <strong>{item.floorLocation}</strong>
            <span>{item.tradeCompany}</span>
          </div>
          <div className="compact-meta">
            <RiskBadge value={item.riskLevel} />
            <StatusPill value={item.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CountList({ rows }) {
  if (!rows.length) return <EmptyState text="No open repeat trends yet." />;
  const max = Math.max(...rows.map((row) => row.count));

  return (
    <div className="count-list">
      {rows.map((row) => (
        <div className="count-row" key={row.label}>
          <div>
            <strong>{row.label}</strong>
            <span>{row.count} open</span>
          </div>
          <div className="count-track" aria-hidden="true">
            <span style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="empty-state">{text}</p>;
}

function ToolboxTalkPreview({ talk }) {
  return (
    <div className="talk-preview">
      <h3>{talk.title}</h3>
      <p className="muted">{talk.context}</p>
      <ol className="talk-points">
        {talk.points.map((point) => (
          <li key={point.heading}>
            <strong>{point.heading}</strong>
            <span>{point.body}</span>
          </li>
        ))}
      </ol>

      <h4>Sign-in sheet</h4>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, index) => (
              <tr key={index}>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4>Quiz questions</h4>
      <ol className="quiz-list">
        {talk.quiz.map((question) => (
          <li key={question.question}>
            <strong>{question.question}</strong>
            <span>{question.answer}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function buildToolboxTalk(form) {
  const topicGuidance = {
    "Fall protection":
      "Confirm edge protection, anchor points, travel restraint, rescue planning, and restricted access before work starts.",
    "Silica dust control":
      "Use the selected exposure control method, wet cutting or HEPA collection, and keep dry sweeping out of the work area.",
    "Housekeeping and access":
      "Keep cords, offcuts, materials, and debris out of walk routes, stairs, hoist entries, and emergency access paths.",
    "Crane and material handling":
      "Plan the lift path, communication method, exclusion zone, rigging check, and landing area before each pick.",
    "Hot work fire watch":
      "Check permits, remove combustibles, cover openings, keep extinguishers ready, and assign fire watch after work.",
    "Electrical energization":
      "Confirm lockout boundaries, access control, test-before-touch expectations, and supervisor authorization.",
    "Traffic control":
      "Confirm traffic control layout, pedestrian detours, spotter locations, delivery timing, and public interface controls.",
  };

  return {
    title: `${form.topic} toolbox talk`,
    context: `${form.trade} crew. Active work: ${form.activeWork || "Not specified"}. Recent site issues: ${form.recentIssues || "None entered"}.`,
    points: [
      {
        heading: "1 minute: Work today",
        body: `Review the planned ${form.trade} work and the exact areas where the crew will be working.`,
      },
      {
        heading: "1 minute: Main hazard",
        body: topicGuidance[form.topic],
      },
      {
        heading: "1 minute: Recent issue",
        body: `Tie today's controls back to recent site observations: ${form.recentIssues || "No recent issues entered"}.`,
      },
      {
        heading: "1 minute: Stop and ask",
        body: "Pause work if the condition changes, controls are missing, or another trade creates a new exposure.",
      },
      {
        heading: "1 minute: Sign-off",
        body: "Confirm who is responsible for checks, who to contact, and that every attendee signs the sheet.",
      },
    ],
    quiz: [
      {
        question: "What control must be confirmed before this task starts?",
        answer: `Expected answer: the control discussed for ${form.topic}.`,
      },
      {
        question: "Who do you contact if conditions change?",
        answer: "Expected answer: supervisor, foreperson, CSO, or the site contact named in the talk.",
      },
      {
        question: "What should you do if the control is missing or damaged?",
        answer: "Expected answer: stop, make the area safe, and report it before continuing.",
      },
    ],
  };
}

function buildToolboxTalkText(talk) {
  return [
    talk.title,
    talk.context,
    "",
    ...talk.points.map((point) => `${point.heading}: ${point.body}`),
    "",
    "Quiz",
    ...talk.quiz.map(
      (question, index) =>
        `${index + 1}. ${question.question} ${question.answer}`,
    ),
  ].join("\n");
}

function buildToolboxTalkHtml(talk) {
  const pointRows = talk.points
    .map(
      (point) =>
        `<li><strong>${escapeHtml(point.heading)}</strong><br>${escapeHtml(point.body)}</li>`,
    )
    .join("");
  const quizRows = talk.quiz
    .map(
      (question) =>
        `<li><strong>${escapeHtml(question.question)}</strong><br>${escapeHtml(question.answer)}</li>`,
    )
    .join("");
  const signRows = Array.from({ length: 12 })
    .map(() => "<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>")
    .join("");

  return `<h1>${escapeHtml(talk.title)}</h1>
<p class="meta">${escapeHtml(talk.context)}</p>
<div class="notice">Administrative aid only. Use current site procedures, supervisor direction, and applicable regulatory requirements.</div>
<h2>5-minute talk</h2>
<ol>${pointRows}</ol>
<h2>Sign-in sheet</h2>
<table><thead><tr><th>Name</th><th>Company</th><th>Signature</th></tr></thead><tbody>${signRows}</tbody></table>
<h2>Quiz questions</h2>
<ol>${quizRows}</ol>`;
}

function buildWeeklySafetySummary(data, metrics) {
  const openRows = data.deficiencies.filter(isOpenDeficiency).slice(0, 10);
  const overdueRows = data.deficiencies.filter(isOverdue);
  const highRiskRows = data.highRiskDocs.filter((item) => item.status !== "Complete");

  return {
    title: "Weekly safety summary",
    html: `<h1>Weekly safety summary</h1>
<p class="meta">Vancouver condo tower site | Generated ${escapeHtml(todayISO())}</p>
<div class="notice">Documentation aid only. This summary does not make final legal or safety decisions.</div>
<h2>Snapshot</h2>
${htmlTable(["Metric", "Value"], [
      ["Open deficiencies", metrics.openCount],
      ["Overdue deficiencies", metrics.overdueCount],
      ["High-risk open deficiencies", metrics.highRiskCount],
      ["Average closeout time", `${metrics.averageCloseoutDays} days`],
    ])}
<h2>Open deficiency focus</h2>
${htmlTable(
      ["Location", "Trade", "Hazard", "Risk", "Due", "Status"],
      openRows.map((item) => [
        item.floorLocation,
        item.tradeCompany,
        item.hazardCategory,
        item.riskLevel,
        item.dueDate || "Not set",
        item.status,
      ]),
    )}
<h2>Overdue items</h2>
${htmlTable(
      ["Location", "Assigned to", "Due", "Risk"],
      overdueRows.map((item) => [
        item.floorLocation,
        item.assignedTo || "Unassigned",
        item.dueDate,
        item.riskLevel,
      ]),
    )}
<h2>High-risk work board</h2>
${htmlTable(
      ["Type", "Location", "Status", "Responsible", "Review date"],
      highRiskRows.map((item) => [
        item.type,
        item.location,
        item.status,
        item.responsible,
        item.reviewDate,
      ]),
    )}`,
  };
}

function buildTradeEmailText(deficiencies, trade) {
  const openItems = deficiencies.filter(
    (item) => item.tradeCompany === trade && isOpenDeficiency(item),
  );
  const lines = openItems.length
    ? openItems.map(
        (item, index) =>
          `${index + 1}. ${item.floorLocation} | ${item.hazardCategory} | ${item.riskLevel} | due ${item.dueDate || "not set"} | ${item.description}`,
      )
    : ["No open sample items are currently assigned to this trade."];

  return `Subject: Safety followup items - ${trade}

Hello,

Please review the current open safety followup items for ${trade}.

${lines.join("\n")}

Please reply with the corrective action status, target closeout time, and any support needed from the site team.

This is an administrative documentation aid only. Follow current site procedures and supervisor direction.

Thank you.`;
}

function buildCorrectiveActionReport(deficiency) {
  if (!deficiency) {
    return {
      title: "Corrective action report",
      html: "<h1>Corrective action report</h1><p>No deficiency selected.</p>",
    };
  }

  return {
    title: `Corrective action report - ${deficiency.floorLocation}`,
    html: `<h1>Corrective action report</h1>
<p class="meta">Generated ${escapeHtml(todayISO())}</p>
<div class="notice">Administrative closeout record only. Verification requirements remain with site leadership and applicable procedures.</div>
${htmlTable(["Field", "Value"], [
      ["Floor / location", deficiency.floorLocation],
      ["Trade / company", deficiency.tradeCompany],
      ["Hazard category", deficiency.hazardCategory],
      ["Risk level", deficiency.riskLevel],
      ["Description", deficiency.description],
      ["Photo placeholder", deficiency.photoPlaceholder || "Not provided"],
      ["Assigned to", deficiency.assignedTo || "Unassigned"],
      ["Created", deficiency.createdAt],
      ["Due date", deficiency.dueDate || "Not set"],
      ["Status", deficiency.status],
      ["Closed date", deficiency.closedAt || "Not closed"],
      ["Closeout notes", deficiency.closeoutNotes || "No notes entered"],
    ])}`,
  };
}

function htmlTable(headers, rows) {
  if (!rows.length) return "<p>No matching rows.</p>";
  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rowHtml = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowHtml}</tbody></table>`;
}

function yesNo(value) {
  return value ? <span className="yes-text">Yes</span> : <span className="no-text">No</span>;
}

function reminderLabel(date) {
  const remaining = daysUntil(date);
  if (!date) return "Not set";
  if (remaining === null) return date;
  if (remaining < 0) return `${date} overdue`;
  if (remaining === 0) return `${date} today`;
  return `${date} in ${remaining}d`;
}

function labelForCollection(type) {
  return {
    deficiencies: "deficiencies",
    trainingRecords: "training records",
    highRiskDocs: "high-risk docs",
  }[type];
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
