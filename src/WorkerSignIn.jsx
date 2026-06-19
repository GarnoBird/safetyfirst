import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "signedIn", label: "In" },
  { id: "signedOut", label: "Out" },
];

const STAFF_SORT_LABELS = {
  company: "Company",
  name: "Name",
  phone: "Phone",
  signed_in_at: "Signed In",
  signed_out_at: "Signed Out",
  trade: "Trade",
};

const STAFF_NAV_ITEMS = [
  { id: "home", label: "Home", path: "/staff/home" },
  { id: "sign-ins", label: "Who's Here", path: "/staff/sign-ins" },
  { id: "settings", label: "Settings", path: "/staff/settings" },
];

const STAFF_MOBILE_NAV_ITEMS = [
  { id: "home", label: "HOME", path: "/staff/home" },
  { id: "sign-ins", label: "ON SITE", path: "/staff/sign-ins" },
  { id: "settings", label: "SETTINGS", path: "/staff/settings" },
];

const DEFAULT_SITE_SETTINGS = {
  site_name: "Safety First",
  site_location: "Vancouver condo tower site",
  timezone: "America/Vancouver",
  signout_cutoff_time: "16:30",
  signout_reminders_enabled: false,
  signout_reminder_message:
    "Hello {{name}}, APPIA records show you are still signed in on site today. If you have left site, please sign out here: {{signout_link}}. If you are still on site, no action is needed.",
  report_recipient_email: "garnobird@gmail.com",
  report_auto_enabled: true,
  report_auto_time: "08:00",
  report_format: "both",
};

const DEFAULT_SYSTEM_STATUS = {
  database: "checking",
  email: "checking",
  sms: "not connected",
};

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
        <div
          className={
            signedOut
              ? "worker-confirmation submitted"
              : "worker-confirmation"
          }
        >
          {signedOut ? (
            <div className="worker-thank-you" role="status">
              <h1>Thank you</h1>
            </div>
          ) : (
            <>
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
              {!loading && !signIn ? (
                <div className="worker-status-panel">
                  <p>No open sign-in was found on this phone for today.</p>
                  <button
                    type="button"
                    onClick={() => navigateTo("/worker-sign-in")}
                  >
                    Open sign-in
                  </button>
                </div>
              ) : null}
            </>
          )}
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
      navigateTo("/staff/home");
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

export function StaffHomePage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const today = useMemo(todayInVancouver, []);
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [records, setRecords] = useState({ rows: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const counts = useMemo(
    () => ({
      all: records.rows.length,
      signedIn: records.rows.filter(isSignedIn).length,
      signedOut: records.rows.filter(isSignedOut).length,
    }),
    [records.rows],
  );

  useEffect(() => {
    if (!staff) return;
    let active = true;
    setLoading(true);
    setMessage("");

    Promise.all([
      fetch(`/api/staff/signins?${new URLSearchParams({ date: today })}`, {
        credentials: "include",
      }).then(readApiJson),
      fetch("/api/staff/settings", { credentials: "include" }).then(readApiJson),
    ])
      .then(([signIns, settingsPayload]) => {
        if (!active) return;
        setRecords({ rows: signIns.rows || [] });
        setSettings(settingsPayload.settings || DEFAULT_SITE_SETTINGS);
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
  }, [staff, today]);

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="home" navigateTo={navigateTo}>
      {message ? <p className="staff-message">{message}</p> : null}
      <section className="staff-home-grid" aria-label="Staff home actions">
        <StaffActionCard
          actionLabel="Open roster"
          eyebrow="Live roster"
          text={
            loading
              ? "Loading today's worker sign-ins."
              : `${counts.signedIn} on site, ${counts.signedOut} signed out, ${counts.all} total today.`
          }
          title="Who's Here"
          onAction={() => navigateTo("/staff/sign-ins")}
        >
          <div className="staff-mini-metrics">
            <span><strong>{counts.signedIn}</strong> On site</span>
            <span><strong>{counts.signedOut}</strong> Out</span>
            <span><strong>{counts.all}</strong> Total</span>
          </div>
        </StaffActionCard>

        <StaffActionCard
          eyebrow="Worker links"
          text="Open clean sign-in and sign-out QR pages for printing or tablet display."
          title="QR Posters"
        >
          <div className="staff-card-actions">
            <button type="button" onClick={() => navigateTo("/worker-sign-in-qr")}>
              Sign-In QR
            </button>
            <button type="button" onClick={() => navigateTo("/worker-sign-out-qr")}>
              Sign-Out QR
            </button>
          </div>
        </StaffActionCard>

        <StaffActionCard
          eyebrow="Today"
          text={`Email today's worker sign-ins to ${settings.report_recipient_email}.`}
          title="Email Reports"
        >
          <div className="staff-card-actions">
            <a href={staffExportUrl(today, "csv")}>CSV</a>
            <a href={staffExportUrl(today, "xml")}>XML</a>
            <button type="button" onClick={() => navigateTo("/staff/sign-ins")}>
              Email
            </button>
          </div>
        </StaffActionCard>

        <StaffActionCard
          actionLabel="Open settings"
          eyebrow="Setup"
          text="Review site identity, QR links, report delivery, reminder copy, and privacy notes."
          title="Settings"
          onAction={() => navigateTo("/staff/settings")}
        >
          <dl className="staff-card-listing">
            <div>
              <dt>Site</dt>
              <dd>{settings.site_location}</dd>
            </div>
            <div>
              <dt>Reminder SMS</dt>
              <dd>Not connected</dd>
            </div>
          </dl>
        </StaffActionCard>
      </section>
    </StaffShell>
  );
}

export function StaffSettingsPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [system, setSystem] = useState(DEFAULT_SYSTEM_STATUS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!staff) return;
    let active = true;
    setLoading(true);
    setMessage("");

    fetch("/api/staff/settings", { credentials: "include" })
      .then(readApiJson)
      .then((payload) => {
        if (!active) return;
        setSettings(payload.settings || DEFAULT_SITE_SETTINGS);
        setSystem(payload.system || DEFAULT_SYSTEM_STATUS);
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
  }, [staff]);

  const updateSetting = (field, value) => {
    setSettings((current) => ({ ...current, [field]: value }));
  };

  const persistSettings = async () => {
    const payload = await readApiJson(
      await fetch("/api/staff/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      }),
    );
    setSettings(payload.settings || DEFAULT_SITE_SETTINGS);
    setSystem(payload.system || DEFAULT_SYSTEM_STATUS);
    return payload.settings || settings;
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await persistSettings();
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const emailReportNow = async () => {
    setEmailing(true);
    setMessage("");

    try {
      const savedSettings = await persistSettings();
      const payload = await readApiJson(
        await fetch("/api/staff/signins/email-report", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ date: todayInVancouver() }),
        }),
      );
      setMessage(
        payload.skipped
          ? "No rows to email for today."
          : `Report emailed to ${
              payload.recipientEmail || savedSettings.report_recipient_email
            }.`,
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setEmailing(false);
    }
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="settings" navigateTo={navigateTo}>
      {message ? <p className="staff-message">{message}</p> : null}
      <form className="staff-settings-grid" onSubmit={saveSettings}>
        <SettingsSection
          description="Basic jobsite identity shown around the staff area."
          title="Site"
        >
          <label>
            <span>Site display name</span>
            <input
              required
              value={settings.site_name}
              onChange={(event) => updateSetting("site_name", event.target.value)}
            />
          </label>
          <label>
            <span>Location label</span>
            <input
              required
              value={settings.site_location}
              onChange={(event) => updateSetting("site_location", event.target.value)}
            />
          </label>
          <label>
            <span>Timezone</span>
            <input
              required
              value={settings.timezone}
              onChange={(event) => updateSetting("timezone", event.target.value)}
            />
          </label>
        </SettingsSection>

        <SettingsSection
          description="Public worker links and the notice workers should understand."
          title="Worker Sign-In"
        >
          <div className="settings-link-row">
            <span>Sign-in link</span>
            <a href="/worker-sign-in">{publicUrl("/worker-sign-in")}</a>
          </div>
          <div className="settings-link-row">
            <span>Sign-out link</span>
            <a href="/worker-sign-out">{publicUrl("/worker-sign-out")}</a>
          </div>
          <div className="staff-card-actions">
            <button type="button" onClick={() => navigateTo("/worker-sign-in-qr")}>
              Sign-In QR
            </button>
            <button type="button" onClick={() => navigateTo("/worker-sign-out-qr")}>
              Sign-Out QR
            </button>
          </div>
          <p className="settings-note">
            Phone numbers are used for site sign-in records and sign-out reminders only.
          </p>
        </SettingsSection>

        <SettingsSection
          description="Choose where roster emails go, whether Auto Report is on, and which attachments are included."
          title="Email Reports"
        >
          <label>
            <span>Send reports to</span>
            <input
              required
              type="email"
              value={settings.report_recipient_email}
              onChange={(event) =>
                updateSetting("report_recipient_email", event.target.value)
              }
            />
          </label>
          <label className="settings-checkbox">
            <input
              checked={Boolean(settings.report_auto_enabled)}
              type="checkbox"
              onChange={(event) =>
                updateSetting("report_auto_enabled", event.target.checked)
              }
            />
            <span>
              <strong>Auto Report</strong>
              <small>
                {settings.report_auto_enabled
                  ? "On - sends daily at 8:00 a.m. when sign-ins exist."
                  : "Off - no daily automatic report."}
              </small>
            </span>
          </label>
          <label>
            <span>Email attachment format</span>
            <select
              value={settings.report_format}
              onChange={(event) => updateSetting("report_format", event.target.value)}
            >
              <option value="both">CSV and XML</option>
              <option value="csv">CSV only</option>
              <option value="xml">XML only</option>
            </select>
          </label>
          <div className="settings-report-actions">
            <button
              className="primary-button"
              disabled={loading || saving || emailing}
              type="button"
              onClick={emailReportNow}
            >
              {emailing ? "Emailing..." : "Email Report Now"}
            </button>
          </div>
        </SettingsSection>

        <SettingsSection
          description="SMS is planned, but not connected in this build."
          title="Sign-Out Reminders"
        >
          <div className="settings-status-line">
            <span>SMS provider</span>
            <strong>Not connected</strong>
          </div>
          <label>
            <span>Cutoff time</span>
            <input
              required
              type="time"
              value={settings.signout_cutoff_time}
              onChange={(event) =>
                updateSetting("signout_cutoff_time", event.target.value)
              }
            />
          </label>
          <label>
            <span>Reminder message</span>
            <textarea
              required
              rows="5"
              value={settings.signout_reminder_message}
              onChange={(event) =>
                updateSetting("signout_reminder_message", event.target.value)
              }
            />
          </label>
          <div className="settings-preview">
            <span>Preview</span>
            <p>{previewReminderMessage(settings.signout_reminder_message)}</p>
          </div>
        </SettingsSection>

        <SettingsSection
          description="Current guardrails for worker records."
          title="Data & Privacy"
        >
          <ul className="settings-list">
            <li>No medical information or private first aid details.</li>
            <li>Worker phone numbers are personal information and stay staff-only.</li>
            <li>Records are kept for safe keeping until a retention policy is added.</li>
            <li>CSV and XML export are available to staff users.</li>
          </ul>
        </SettingsSection>

        <SettingsSection description="Current service connection status." title="System">
          <div className="system-status-grid">
            <SystemStatus label="Database" value={system.database} />
            <SystemStatus label="Email" value={system.email} />
            <SystemStatus label="SMS" value={system.sms} />
          </div>
        </SettingsSection>

        <div className="staff-settings-save">
          <button
            className="primary-button"
            disabled={loading || saving || emailing}
            type="submit"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>
    </StaffShell>
  );
}

export function StaffSignInsPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const [date, setDate] = useState(todayInVancouver());
  const [sort, setSort] = useState("signed_in_at");
  const [dir, setDir] = useState("asc");
  const [group, setGroup] = useState("none");
  const [statusFilter, setStatusFilter] = useState("signedIn");
  const [search, setSearch] = useState("");
  const [selectedSignIn, setSelectedSignIn] = useState(null);
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
    () => filterRowsBySearch(filterRowsByStatus(records.rows, statusFilter), search),
    [records.rows, search, statusFilter],
  );

  const visibleGroups = useMemo(
    () => groupSignInRows(visibleRows, group),
    [group, visibleRows],
  );

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

  const changeSortOption = (value) => {
    const [field, direction] = value.split(":");
    setSort(field);
    setDir(direction === "desc" ? "desc" : "asc");
  };

  const changeDateBy = (days) => {
    setDate((current) => addDaysToISODate(current, days));
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
        : `Report emailed to ${payload.recipientEmail || staff.email}.`,
    );
  };

  const exportUrl = (format) =>
    `/api/staff/signins/export?${new URLSearchParams({ date, format })}`;

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="sign-ins" contentWide navigateTo={navigateTo}>
      <section className="staff-scorebar" aria-label="Daily sign-in summary">
        <div>
          <strong>{statusCounts.signedIn}</strong>
          <span>On site</span>
        </div>
        <div>
          <strong>{statusCounts.signedOut}</strong>
          <span>Out</span>
        </div>
        <div>
          <strong>{statusCounts.all}</strong>
          <span>Total</span>
        </div>
      </section>

      <section className="staff-toolbar">
        <div className="field staff-date-field">
          <span>Date</span>
          <div className="staff-date-stepper">
            <button
              aria-label="Previous day"
              type="button"
              onClick={() => changeDateBy(-1)}
            >
              {"<"}
            </button>
            <span>{formatLongDate(date)}</span>
            <button
              aria-label="Next day"
              type="button"
              onClick={() => changeDateBy(1)}
            >
              {">"}
            </button>
          </div>
        </div>
        <label className="field staff-group-field">
          <span>Group</span>
          <select value={group} onChange={(event) => setGroup(event.target.value)}>
            <option value="none">No grouping</option>
            <option value="trade">Trade</option>
            <option value="company">Company</option>
          </select>
        </label>
        <details className="staff-export-menu">
          <summary>Export</summary>
          <div className="staff-export-menu-panel">
            <a href={exportUrl("csv")}>
              <strong>CSV</strong>
              <span>Download spreadsheet</span>
            </a>
            <a href={exportUrl("xml")}>
              <strong>XML</strong>
              <span>Download XML file</span>
            </a>
            <button type="button" onClick={emailReport}>
              <strong>Email Report</strong>
              <span>Send this roster</span>
            </button>
          </div>
        </details>
      </section>

      {message ? <p className="staff-message">{message}</p> : null}

      <section className="staff-table-panel">
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
        <div className="staff-list-controls">
          <label className="staff-search-field">
            <span>Search people</span>
            <input
              placeholder="Search people"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="staff-sort-select">
            <span>Sort</span>
            <select
              value={`${sort}:${dir}`}
              onChange={(event) => changeSortOption(event.target.value)}
            >
              <option value="signed_in_at:asc">Time ↑</option>
              <option value="signed_in_at:desc">Time ↓</option>
              <option value="signed_out_at:asc">Out time ↑</option>
              <option value="signed_out_at:desc">Out time ↓</option>
              <option value="name:asc">Name A-Z</option>
              <option value="name:desc">Name Z-A</option>
              <option value="company:asc">Company A-Z</option>
              <option value="company:desc">Company Z-A</option>
              <option value="trade:asc">Trade A-Z</option>
              <option value="trade:desc">Trade Z-A</option>
            </select>
          </label>
        </div>
        <div className="desktop-roster">
          <div className="staff-table-heading">
            <strong>{visibleRows.length} sign-ins</strong>
            <span>{describeSort(sort, dir)}</span>
          </div>
          {group === "none" ? (
            <DesktopSignInTable
              dir={dir}
              loading={loading}
              rows={visibleRows}
              sort={sort}
              onSelect={setSelectedSignIn}
              onSort={changeSortOption}
            />
          ) : (
            <div className="desktop-grouped-signins">
              {visibleGroups.map((section) => (
                <section className="desktop-signin-group" key={section.label}>
                  <h2>{section.label} <span>{section.count}</span></h2>
                  <DesktopSignInTable
                    dir={dir}
                    loading={loading}
                    rows={section.items}
                    sort={sort}
                    onSelect={setSelectedSignIn}
                    onSort={changeSortOption}
                  />
                </section>
              ))}
              {!visibleGroups.length && !loading ? (
                <p className="empty-state">No sign-ins for this date.</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="mobile-roster">
          {group === "none" ? (
            <CompactSignInList
              loading={loading}
              rows={visibleRows}
              onSelect={setSelectedSignIn}
            />
          ) : (
            <div className="grouped-signins">
              {visibleGroups.map((section) => (
                <section className="signin-group" key={section.label}>
                  <h2>{section.label} <span>{section.count}</span></h2>
                  <CompactSignInList
                    loading={loading}
                    rows={section.items}
                    onSelect={setSelectedSignIn}
                  />
                </section>
              ))}
              {!visibleGroups.length && !loading ? (
                <p className="empty-state">No sign-ins for this date.</p>
              ) : null}
            </div>
          )}
        </div>
      </section>
      {selectedSignIn ? (
        <SignInDetailsDialog
          row={selectedSignIn}
          onClose={() => setSelectedSignIn(null)}
        />
      ) : null}
    </StaffShell>
  );
}

function StaffShell({ active, children, contentWide = false, navigateTo }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeMobileItem =
    STAFF_MOBILE_NAV_ITEMS.find((item) => item.id === active) ||
    STAFF_MOBILE_NAV_ITEMS[0];

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    navigateTo("/staff-login");
  };

  return (
    <main className="staff-shell">
      <div className="brand-mark staff-shell-brand">APPIA</div>
      <div className="staff-mobile-menu">
        <button
          aria-expanded={mobileMenuOpen}
          className="staff-mobile-menu-trigger"
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span className="brand-mark">APPIA</span>
          <span aria-hidden="true">|</span>
          <strong>{activeMobileItem.label}</strong>
        </button>
        {mobileMenuOpen ? (
          <div className="staff-mobile-menu-panel" role="menu">
            {STAFF_MOBILE_NAV_ITEMS.map((item) => (
              <button
                className={active === item.id ? "active" : ""}
                key={item.id}
                role="menuitem"
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigateTo(item.path);
                }}
              >
                {item.label}
              </button>
            ))}
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
            >
              LOGOUT
            </button>
          </div>
        ) : null}
      </div>
      <nav className="staff-nav-actions" aria-label="Staff navigation">
        {STAFF_NAV_ITEMS.map((item) => (
          <button
            className={
              active === item.id
                ? "staff-quiet-button active"
                : "staff-quiet-button"
            }
            key={item.id}
            type="button"
            onClick={() => navigateTo(item.path)}
          >
            {item.label}
          </button>
        ))}
        <button className="staff-quiet-button" type="button" onClick={logout}>
          Logout
        </button>
      </nav>
      <div className={contentWide ? "staff-content staff-content-wide" : "staff-content"}>
        {children}
      </div>
    </main>
  );
}

function StaffActionCard({ actionLabel, children, eyebrow, onAction, text, title }) {
  return (
    <article className="staff-action-card">
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        <span>{text}</span>
      </div>
      {children}
      {actionLabel ? (
        <button className="primary-button" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}

function SettingsSection({ children, description, title }) {
  return (
    <section className="settings-section">
      <div className="settings-section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="settings-section-body">{children}</div>
    </section>
  );
}

function SystemStatus({ label, value }) {
  const connected = ["connected", "configured"].includes(String(value).toLowerCase());
  return (
    <div className={connected ? "system-status connected" : "system-status"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StaffLoadingScreen() {
  return (
    <main className="staff-shell">
      <section className="staff-loading-card">
        <div className="brand-mark">APPIA</div>
        <p>Loading staff area...</p>
      </section>
    </main>
  );
}

function DesktopSignInTable({ dir, loading, rows, sort, onSelect, onSort }) {
  const sortColumn = (field) => {
    const nextDirection = sort === field && dir === "asc" ? "desc" : "asc";
    onSort(`${field}:${nextDirection}`);
  };

  return (
    <div className="staff-table-scroll">
      <table className="staff-table">
        <thead>
          <tr>
            <th>
              <SortableStaffHeader
                activeDir={dir}
                field="name"
                label="Name"
                sort={sort}
                onSort={sortColumn}
              />
            </th>
            <th>
              <SortableStaffHeader
                activeDir={dir}
                field="phone"
                label="Phone"
                sort={sort}
                onSort={sortColumn}
              />
            </th>
            <th>
              <SortableStaffHeader
                activeDir={dir}
                field="trade"
                label="Trade"
                sort={sort}
                onSort={sortColumn}
              />
            </th>
            <th>
              <SortableStaffHeader
                activeDir={dir}
                field="company"
                label="Company"
                sort={sort}
                onSort={sortColumn}
              />
            </th>
            <th>
              <SortableStaffHeader
                activeDir={dir}
                field="signed_in_at"
                label="Signed In"
                sort={sort}
                onSort={sortColumn}
              />
            </th>
            <th>
              <SortableStaffHeader
                activeDir={dir}
                field="signed_out_at"
                label="Signed Out"
                sort={sort}
                onSort={sortColumn}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={0}
              onClick={() => onSelect(row)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(row);
                }
              }}
            >
              <td>{row.name}</td>
              <td>
                <a
                  href={`tel:${phoneHref(row.phone)}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  {formatPhoneNumber(row.phone)}
                </a>
              </td>
              <td>{row.trade}</td>
              <td>{row.company}</td>
              <td>{formatDateTime(row.signed_in_at)}</td>
              <td>
                <div className="signin-status-cell">
                  {row.signed_out_at ? (
                    <>
                      <span className="signin-status-badge signed-out">Signed out</span>
                      <span>{formatDateTime(row.signed_out_at)}</span>
                    </>
                  ) : (
                    <span className="signin-status-badge signed-in">Signed in</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan="6" className="staff-table-empty">
                {loading ? "Loading..." : "No sign-ins for this view."}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function SortableStaffHeader({ activeDir, field, label, sort, onSort }) {
  const active = sort === field;
  return (
    <div className="staff-sort-header">
      <span>{label}</span>
      <button
        className={active ? "sort-chip sort-chip-active" : "sort-chip"}
        type="button"
        onClick={() => onSort(field)}
      >
        {active ? activeDir : "Sort"}
      </button>
    </div>
  );
}

function CompactSignInList({ loading, rows, onSelect }) {
  return (
    <section className="compact-signin-list" aria-label="Compact sign-in list">
      <div className="compact-signin-list-title">
        <h2>Compact list</h2>
        <span>tap any row</span>
      </div>
      <div className="compact-signin-list-head">
        <span>Person / company</span>
        <span>Time</span>
        <span>Status</span>
      </div>
      <div className="compact-signin-rows">
        {rows.map((row) => (
          <button
            className="compact-signin-row"
            key={row.id}
            type="button"
            onClick={() => onSelect(row)}
          >
            <div className="compact-person">
              <span className={row.signed_out_at ? "row-mark out" : "row-mark"} />
              <span>
                <strong>{row.name}</strong>
                <em>{row.company}</em>
              </span>
            </div>
            <time>{formatCompactTime(row.signed_out_at || row.signed_in_at)}</time>
            {row.signed_out_at ? (
              <span className="compact-status out">Out</span>
            ) : (
              <span className="compact-status in">In</span>
            )}
          </button>
        ))}
        {!rows.length ? (
          <p className="empty-state compact-empty">
            {loading ? "Loading..." : "No sign-ins for this view."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function SignInDetailsDialog({ row, onClose }) {
  return (
    <div className="signin-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Worker sign-in details"
        aria-modal="true"
        className="signin-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="signin-dialog-header">
          <div>
            <p>{row.signed_out_at ? "Signed out" : "On site"}</p>
            <h2>{row.name}</h2>
          </div>
          <button aria-label="Close details" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <dl className="signin-dialog-details">
          <div>
            <dt>Company</dt>
            <dd>{row.company}</dd>
          </div>
          <div>
            <dt>Trade</dt>
            <dd>{row.trade}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>
              <a href={`tel:${phoneHref(row.phone)}`}>{formatPhoneNumber(row.phone)}</a>
            </dd>
          </div>
          <div>
            <dt>Signed in</dt>
            <dd>{formatDateTime(row.signed_in_at)}</dd>
          </div>
          <div>
            <dt>Signed out</dt>
            <dd>{row.signed_out_at ? formatDateTime(row.signed_out_at) : "Still on site"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{row.signed_out_at ? "Out" : "In"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function useStaffSession(navigateTo) {
  const [staff, setStaff] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then(readApiJson)
      .then((payload) => {
        if (active) setStaff(payload.staff);
      })
      .catch(() => {
        if (active) navigateTo("/staff-login");
      });

    return () => {
      active = false;
    };
  }, [navigateTo]);

  return { staff };
}

async function readApiJson(response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "The server could not complete the request.");
  }
  return payload;
}

function staffExportUrl(date, format) {
  return `/api/staff/signins/export?${new URLSearchParams({ date, format })}`;
}

function publicUrl(path) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).href;
}

function previewReminderMessage(template) {
  return String(template || "")
    .replaceAll("{{name}}", "Garnet")
    .replaceAll("{{signout_link}}", publicUrl("/worker-sign-out"));
}

function todayInVancouver() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysToISODate(value, days) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return todayInVancouver();
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatLongDate(value) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Vancouver",
  }).format(new Date(`${year}-${month}-${day}T12:00:00-08:00`));
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Vancouver",
  }).format(new Date(value));
}

function formatCompactTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Vancouver",
  }).format(new Date(value));
}

function describeSort(sort, dir) {
  const label = STAFF_SORT_LABELS[sort] || sort;
  return `Sort: ${label} ${dir}`;
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

function phoneHref(value) {
  return String(value || "").replace(/[^\d+]/g, "");
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

function filterRowsBySearch(rows, search) {
  const query = search.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) =>
    [row.name, row.company, row.trade, row.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)),
  );
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
