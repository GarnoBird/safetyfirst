import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

const SORTABLE_FIELDS = [
  { field: "name", label: "Name" },
  { field: "phone", label: "Phone" },
  { field: "trade", label: "Trade" },
  { field: "company", label: "Company" },
  { field: "signed_in_at", label: "Signed In" },
  { field: "signed_out_at", label: "Signed Out" },
];

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "signedIn", label: "Currently signed in" },
  { id: "signedOut", label: "Signed out" },
];

const OTHER_TRADE = "Other";
const WORKER_TRADE_OPTIONS = [
  "General contractor",
  "Construction labourer",
  "Carpentry",
  "Concrete forming",
  "Concrete finishing",
  "Rebar / ironworker",
  "Crane / rigging",
  "Equipment operator",
  "Electrical",
  "Mechanical",
  "Plumbing",
  "HVAC",
  "Sprinkler fitting",
  "Sheet metal",
  "Drywall",
  "Insulation",
  "Painting",
  "Flooring",
  "Tile setting",
  "Glazing",
  "Roofing",
  "Waterproofing",
  "Masonry",
  "Elevator",
  "Traffic control",
  "Safety",
  OTHER_TRADE,
];

export function WorkerSignInQr({ navigateTo }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const formUrl = useMemo(() => {
    if (typeof window === "undefined") return "/worker-sign-in";
    return new URL("/worker-sign-in", window.location.origin).href;
  }, []);

  useEffect(() => {
    QRCode.toDataURL(formUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
      width: 280,
      color: {
        dark: "#111111",
        light: "#ffffff",
      },
    }).then(setQrDataUrl);
  }, [formUrl]);

  return (
    <main className="public-page qr-page">
      <section className="qr-card" aria-label="Worker sign-in QR code">
        <h1>Worker Sign-In</h1>
        {qrDataUrl ? <img alt="Worker sign-in QR code" src={qrDataUrl} /> : null}
        <button type="button" onClick={() => navigateTo("/worker-sign-in")}>
          Open form
        </button>
      </section>
    </main>
  );
}

export function WorkerSignOutQr({ navigateTo }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const formUrl = useMemo(() => {
    if (typeof window === "undefined") return "/worker-sign-out";
    return new URL("/worker-sign-out", window.location.origin).href;
  }, []);

  useEffect(() => {
    QRCode.toDataURL(formUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
      width: 280,
      color: {
        dark: "#111111",
        light: "#ffffff",
      },
    }).then(setQrDataUrl);
  }, [formUrl]);

  return (
    <main className="public-page qr-page">
      <section className="qr-card" aria-label="Worker sign-out QR code">
        <h1>Worker Sign-Out</h1>
        {qrDataUrl ? <img alt="Worker sign-out QR code" src={qrDataUrl} /> : null}
        <button type="button" onClick={() => navigateTo("/worker-sign-out")}>
          Open form
        </button>
      </section>
    </main>
  );
}

export function WorkerSignInPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    trade: "",
    otherTrade: "",
    company: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const submitted = status.type === "success";

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateTrade = (value) => {
    setForm((current) => ({
      ...current,
      trade: value,
      otherTrade: value === OTHER_TRADE ? current.otherTrade : "",
    }));
  };

  const submitSignIn = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });

    const trade =
      form.trade === OTHER_TRADE ? form.otherTrade.trim() : form.trade;
    if (!trade) {
      setSubmitting(false);
      setStatus({ type: "error", message: "Trade is required." });
      return;
    }

    const payload = {
      name: form.name,
      phone: formatPhoneNumber(form.phone),
      trade,
      company: form.company,
    };

    try {
      const response = await fetch("/api/worker-signins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json();
      if (!response.ok) {
        throw new Error(responsePayload.error || "Sign-in failed.");
      }

      setForm({ name: "", phone: "", trade: "", otherTrade: "", company: "" });
      setStatus({
        type: "success",
        message: `Sign-in submitted - ${formatShortDate(
          responsePayload.signIn,
          "sign_in_date_vancouver",
          "signed_in_at",
        )}`,
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="public-page worker-page">
      <section className="worker-card">
        <div className="brand-mark">APPIA</div>
        <form
          className={submitted ? "worker-form submitted" : "worker-form"}
          onSubmit={submitSignIn}
        >
          {submitted ? (
            <div className="worker-thank-you" role="status">
              <h1>Thank you</h1>
            </div>
          ) : (
            <>
              <label>
                <span>Name</span>
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
              </label>
              <label>
                <span>Trade</span>
                <select
                  required
                  value={form.trade}
                  onChange={(event) => updateTrade(event.target.value)}
                >
                  <option value="" disabled>
                    Select trade
                  </option>
                  {WORKER_TRADE_OPTIONS.map((trade) => (
                    <option key={trade} value={trade}>
                      {trade}
                    </option>
                  ))}
                </select>
              </label>
              {form.trade === OTHER_TRADE ? (
                <label>
                  <span>Specific trade</span>
                  <input
                    required
                    value={form.otherTrade}
                    onChange={(event) =>
                      updateField("otherTrade", event.target.value)
                    }
                  />
                </label>
              ) : null}
              <label>
                <span>Company</span>
                <input
                  required
                  value={form.company}
                  onChange={(event) => updateField("company", event.target.value)}
                />
              </label>
              <button
                className="primary-button"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </>
          )}
          {status.message ? (
            <p className={`form-message ${status.type}`}>{status.message}</p>
          ) : null}
        </form>
      </section>
    </main>
  );
}

export function WorkerSignOutPage({ navigateTo }) {
  const [signIn, setSignIn] = useState(null);
  const [signedOut, setSignedOut] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch("/api/worker-signout", { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Sign-out failed.");
        if (active) setSignIn(payload.signIn || null);
      })
      .catch((error) => {
        if (active) setStatus({ type: "error", message: error.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const submitSignOut = async () => {
    setSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch("/api/worker-signout", {
        method: "POST",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Sign-out failed.");
      setSignedOut(payload.signIn);
      setSignIn(null);
      setStatus({
        type: "success",
        message: `Signed out - ${formatShortDate(
          payload.signIn,
          "sign_out_date_vancouver",
          "signed_out_at",
        )}`,
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="public-page worker-page">
      <section className="worker-card">
        <div className="brand-mark">APPIA</div>
        <div className="worker-confirmation">
          <h1>Worker Sign-Out</h1>
          {loading ? <p className="muted">Loading...</p> : null}
          {!loading && signIn ? (
            <>
              <p className="worker-summary">
                {signIn.name} / {signIn.company} / {signIn.trade}
              </p>
              <p className="worker-detail">Sign out for today?</p>
              <button
                className="primary-button"
                disabled={submitting}
                type="button"
                onClick={submitSignOut}
              >
                {submitting ? "Signing out..." : "Sign out"}
              </button>
            </>
          ) : null}
          {!loading && !signIn && !signedOut ? (
            <div className="worker-status-panel">
              <p>No open sign-in was found on this phone for today.</p>
              <button type="button" onClick={() => navigateTo("/worker-sign-in")}>
                Open sign-in
              </button>
            </div>
          ) : null}
          {signedOut ? (
            <div className="worker-status-panel">
              <p className="worker-summary">
                {signedOut.name} / {signedOut.company} / {signedOut.trade}
              </p>
              <p>Signed out.</p>
            </div>
          ) : null}
          {status.message ? (
            <p className={`form-message ${status.type}`}>{status.message}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function StaffLoginPage({ navigateTo }) {
  const [username, setUsername] = useState("lbird");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Login failed.");
      navigateTo("/staff/sign-ins");
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="staff-auth-page">
      <section className="staff-login-card">
        <div className="brand-mark">APPIA</div>
        <h1>Staff Login</h1>
        <form className="worker-form" onSubmit={submitLogin}>
          <label>
            <span>Username</span>
            <input
              required
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              required
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Signing in..." : "Sign in"}
          </button>
          {error ? <p className="form-message error">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}

export function StaffSignInsPage({ navigateTo }) {
  const [staff, setStaff] = useState(null);
  const [date, setDate] = useState(todayInVancouver());
  const [sort, setSort] = useState("signed_in_at");
  const [dir, setDir] = useState("asc");
  const [group, setGroup] = useState("none");
  const [statusFilter, setStatusFilter] = useState("all");
  const [records, setRecords] = useState({ rows: [], groups: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const statusCounts = useMemo(
    () => ({
      all: records.rows.length,
      signedIn: records.rows.filter(isSignedIn).length,
      signedOut: records.rows.filter(isSignedOut).length,
    }),
    [records.rows],
  );

  const visibleRows = useMemo(
    () => filterRowsByStatus(records.rows, statusFilter),
    [records.rows, statusFilter],
  );

  const visibleGroups = useMemo(
    () => groupSignInRows(visibleRows, group),
    [group, visibleRows],
  );

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error("login_required");
        if (active) setStaff(payload.staff);
      })
      .catch(() => navigateTo("/staff-login"));
    return () => {
      active = false;
    };
  }, [navigateTo]);

  useEffect(() => {
    if (!staff) return;
    let active = true;
    setLoading(true);
    setMessage("");

    const params = new URLSearchParams({ date, sort, dir, group });
    fetch(`/api/staff/signins?${params}`, { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Records failed to load.");
        if (active) setRecords(payload);
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date, dir, group, sort, staff]);

  const changeSort = (field) => {
    if (field === sort) {
      setDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSort(field);
    setDir("asc");
  };

  const emailReport = async () => {
    setMessage("");
    const response = await fetch("/api/staff/signins/email-report", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "Email report failed.");
      return;
    }
    setMessage(
      payload.skipped
        ? "No rows to email for this date."
        : `Report emailed to ${staff.email}.`,
    );
  };

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    navigateTo("/staff-login");
  };

  const exportUrl = (format) =>
    `/api/staff/signins/export?${new URLSearchParams({ date, format })}`;

  return (
    <main className="staff-shell">
      <header className="staff-header">
        <div>
          <div className="brand-mark">APPIA</div>
          <h1>Worker Sign-Ins</h1>
          {staff ? <p>{staff.username} | {staff.email}</p> : null}
        </div>
        <div className="button-row">
          <button type="button" onClick={() => navigateTo("/")}>
            Safety app
          </button>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <section className="staff-toolbar">
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Group</span>
          <select value={group} onChange={(event) => setGroup(event.target.value)}>
            <option value="none">No grouping</option>
            <option value="trade">Trade</option>
            <option value="company">Company</option>
          </select>
        </label>
        <div className="staff-actions">
          <a className="button-link" href={exportUrl("csv")}>
            Export CSV
          </a>
          <a className="button-link" href={exportUrl("xml")}>
            Export XML
          </a>
          <button className="primary-button" type="button" onClick={emailReport}>
            Email report
          </button>
        </div>
      </section>

      {message ? <p className="staff-message">{message}</p> : null}

      <section className="staff-table-panel">
        <div className="staff-table-heading">
          <strong>{loading ? "Loading..." : `${visibleRows.length} sign-ins`}</strong>
          <span>Sort: {sortLabel(sort)} {dir}</span>
        </div>
        <div className="staff-status-filters" aria-label="Sign-in status filter">
          {STATUS_FILTERS.map((filter) => (
            <button
              className={
                statusFilter === filter.id
                  ? "status-filter-chip active"
                  : "status-filter-chip"
              }
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
            >
              <span>{filter.label}</span>
              <strong>{statusCounts[filter.id]}</strong>
            </button>
          ))}
        </div>
        {group === "none" ? (
          <SignInsTable
            dir={dir}
            rows={visibleRows}
            sort={sort}
            onSort={changeSort}
          />
        ) : (
          <div className="grouped-signins">
            {visibleGroups.map((section) => (
              <section className="signin-group" key={section.label}>
                <h2>{section.label} <span>{section.count}</span></h2>
                <SignInsTable
                  dir={dir}
                  rows={section.items}
                  sort={sort}
                  onSort={changeSort}
                />
              </section>
            ))}
            {!visibleGroups.length && !loading ? (
              <p className="empty-state">No sign-ins for this date.</p>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}

function SignInsTable({ rows, sort, dir, onSort }) {
  return (
    <div className="table-scroll staff-table-scroll">
      <table className="staff-table">
        <thead>
          <tr>
            {SORTABLE_FIELDS.map((column) => (
              <th
                key={column.field}
                aria-sort={sortAriaValue(column.field, sort, dir)}
              >
                <div className="staff-sort-header">
                  <span>{column.label}</span>
                  <button
                    aria-label={`Sort by ${column.label}`}
                    aria-pressed={sort === column.field}
                    className={
                      sort === column.field
                        ? "sort-chip sort-chip-active"
                        : "sort-chip"
                    }
                    type="button"
                    onClick={() => onSort(column.field)}
                  >
                    {sort === column.field ? dir.toUpperCase() : "Sort"}
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{formatPhoneNumber(row.phone)}</td>
              <td>{row.trade}</td>
              <td>{row.company}</td>
              <td>{formatDateTime(row.signed_in_at)}</td>
              <td>
                {row.signed_out_at ? (
                  <div className="signin-status-cell">
                    <span className="signin-status-badge signed-out">
                      Signed out
                    </span>
                    <span>{formatDateTime(row.signed_out_at)}</span>
                  </div>
                ) : (
                  <span className="signin-status-badge signed-in">
                    Signed in
                  </span>
                )}
              </td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={SORTABLE_FIELDS.length}>No sign-ins for this date.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function todayInVancouver() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Vancouver",
  }).format(new Date(value));
}

function formatShortDate(record, dateField, timestampField) {
  if (record?.[dateField]) {
    return formatDateString(record[dateField]);
  }
  if (record?.[timestampField]) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Vancouver",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(record[timestampField]));
  }
  return formatDateString(todayInVancouver());
}

function formatDateString(value) {
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${month}/${day}/${year}`;
}

function formatPhoneNumber(value) {
  const raw = String(value || "").trim().replace(/\s+/g, " ");
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return raw;
}

function isSignedIn(row) {
  return !row.signed_out_at;
}

function isSignedOut(row) {
  return Boolean(row.signed_out_at);
}

function filterRowsByStatus(rows, statusFilter) {
  if (statusFilter === "signedIn") return rows.filter(isSignedIn);
  if (statusFilter === "signedOut") return rows.filter(isSignedOut);
  return rows;
}

function groupSignInRows(rows, group) {
  if (group === "none") return [];
  const groups = new Map();
  rows.forEach((row) => {
    const label = row[group] || "Unassigned";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(row);
  });
  return [...groups.entries()]
    .map(([label, items]) => ({ label, count: items.length, items }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function sortLabel(field) {
  return SORTABLE_FIELDS.find((item) => item.field === field)?.label || field;
}

function sortAriaValue(field, sort, dir) {
  if (field !== sort) return "none";
  return dir === "asc" ? "ascending" : "descending";
}
