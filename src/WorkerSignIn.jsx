import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

const SORTABLE_FIELDS = [
  { field: "name", label: "Name" },
  { field: "phone", label: "Phone" },
  { field: "trade", label: "Trade" },
  { field: "company", label: "Company" },
  { field: "signed_in_at", label: "Signed In" },
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

export function WorkerSignInPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    trade: "",
    company: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitSignIn = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await fetch("/api/worker-signins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Sign-in failed.");

      setForm({ name: "", phone: "", trade: "", company: "" });
      setStatus({
        type: "success",
        message: "Sign-in submitted.",
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
        <form className="worker-form" onSubmit={submitSignIn}>
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
            <input
              required
              value={form.trade}
              onChange={(event) => updateField("trade", event.target.value)}
            />
          </label>
          <label>
            <span>Company</span>
            <input
              required
              value={form.company}
              onChange={(event) => updateField("company", event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Submitting..." : "Submit"}
          </button>
          {status.message ? (
            <p className={`form-message ${status.type}`}>{status.message}</p>
          ) : null}
        </form>
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
  const [records, setRecords] = useState({ rows: [], groups: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
          <strong>{loading ? "Loading..." : `${records.rows.length} sign-ins`}</strong>
          <span>Sort: {sortLabel(sort)} {dir}</span>
        </div>
        {group === "none" ? (
          <SignInsTable
            dir={dir}
            rows={records.rows}
            sort={sort}
            onSort={changeSort}
          />
        ) : (
          <div className="grouped-signins">
            {records.groups.map((section) => (
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
            {!records.groups.length && !loading ? (
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
              <td>{row.phone}</td>
              <td>{row.trade}</td>
              <td>{row.company}</td>
              <td>{formatDateTime(row.signed_in_at)}</td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan="5">No sign-ins for this date.</td>
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

function sortLabel(field) {
  return SORTABLE_FIELDS.find((item) => item.field === field)?.label || field;
}

function sortAriaValue(field, sort, dir) {
  if (field !== sort) return "none";
  return dir === "asc" ? "ascending" : "descending";
}
