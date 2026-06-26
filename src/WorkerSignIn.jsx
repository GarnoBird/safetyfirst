import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

const STAFF_SORT_LABELS = {
  company: "Company",
  name: "Name",
  phone: "Phone",
  signed_in_at: "Signed In",
  signed_out_at: "Signed Out",
  trade: "Trade",
};

const STAFF_MOBILE_NAV_ITEMS = [
  { id: "home", label: "HOME", path: "/staff/home" },
  { id: "sign-ins-people", label: "ON SITE - PEOPLE", path: "/staff/sign-ins" },
  {
    id: "sign-ins-company",
    label: "ON SITE - COMPANY",
    path: "/staff/sign-ins/company",
  },
  { id: "forms", label: "FORMS", path: "/staff/forms" },
  { id: "workers", label: "WORKERS", path: "/staff/workers" },
  { id: "trends", label: "TRENDS", path: "/staff/trends" },
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

const TREND_PRESETS = [
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "project", label: "Project to date" },
  { id: "custom", label: "Custom" },
];

const OTHER_COMPANY = "Other";
const WORKER_REMEMBER_COOKIE = "sf_worker_signin_profile";
const WORKER_REMEMBER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const WORKER_REMEMBER_GROUP_STORAGE = "sf_worker_group_signins";
const WORKER_COMPANY_OPTIONS = [
  "Ainsworth",
  "AllWest",
  "Angels Install",
  "Appia",
  "Apple Display Products",
  "Aurora Glazing",
  "Best",
  "Britcom",
  "Centura",
  "Creekside Fire",
  "CrissCross",
  "Dell Core",
  "Dominion",
  "Enersolv",
  "Enersolv HVAC",
  "Fortis BC",
  "Fraser Shading",
  "Gabs",
  "Greer Spray Foam",
  "ICS Floor Leveling",
  "Inform",
  "JP Metal",
  "Kieth Panel Systems",
  "LMS",
  "Maple Leaf Aluminum",
  "Matakana Scaffold",
  "Mercroft",
  "Moscone",
  "Mountain Stone Work",
  "National Tile",
  "New Way",
  "New York Paint",
  "Oxford Hoist Install",
  "Pacific Water Proofing",
  "Pro-Bell",
  "Quolous",
  "Starline Windows",
  "Summit Sheet",
  "Tanti",
  "Telus",
  "TK Elevators",
  "Tucavan",
  "United Scaffold",
  "West Coast Cleaning",
  OTHER_COMPANY,
];

const EMPTY_WORKER_SIGNIN_FORM = {
  name: "",
  phone: "",
  companyName: "",
  otherCompanyName: "",
};

const SAFETY_FORM_TYPES = [
  { id: "toolbox_talk", label: "Toolbox Talk" },
  { id: "site_inspection", label: "Site Inspection" },
  { id: "daily_hazard_assessment", label: "Daily Hazard Assessment" },
];

const STAFF_FORM_SORT_LABELS = {
  submitted_at: "Submitted",
  company: "Company",
  worker_phone: "Phone",
  worker_name: "Name",
  form_type: "Form Type",
  one_drive_backup_status: "Backup",
};

const EMPTY_STAFF_WORKER_FORM = {
  name: "",
  company: "",
  phone: "",
  username: "",
  password: "",
  active: true,
};

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
  const [rememberedProfile] = useState(readRememberedWorkerProfile);
  const [form, setForm] = useState(
    rememberedProfile || EMPTY_WORKER_SIGNIN_FORM,
  );
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedProfile));
  const [groupMode, setGroupMode] = useState(false);
  const [groupNames, setGroupNames] = useState([]);
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const submitted = status.type === "success";

  const updateField = (field, value) => {
    setForm((current) => {
      const nextForm = { ...current, [field]: value };
      if (rememberMe) writeRememberedWorkerProfile(nextForm);
      return nextForm;
    });
  };

  const updateCompanyName = (value) => {
    setForm((current) => {
      const nextForm = {
        ...current,
        companyName: value,
        otherCompanyName:
          value === OTHER_COMPANY ? current.otherCompanyName : "",
      };
      if (rememberMe) writeRememberedWorkerProfile(nextForm);
      return nextForm;
    });
  };

  const updateRememberMe = (checked) => {
    setRememberMe(checked);
    if (checked) {
      writeRememberedWorkerProfile(form);
      return;
    }
    clearRememberedWorkerProfile();
    clearRememberedWorkerGroup();
  };

  const updateGroupMode = (enabled) => {
    setGroupMode(enabled);
    setGroupNameDraft("");
    if (!enabled) setGroupNames([]);
  };

  const addGroupName = (value) => {
    const name = value.trim();
    if (!name) return false;
    setGroupNames((current) => [...current, name]);
    setGroupNameDraft("");
    return true;
  };

  const removeGroupName = (indexToRemove) => {
    setGroupNames((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  };

  const handleGroupNameKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addGroupName(groupNameDraft);
  };

  const submitSignIn = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });

    const companyName =
      form.companyName === OTHER_COMPANY
        ? form.otherCompanyName.trim()
        : form.companyName;
    if (!companyName) {
      setSubmitting(false);
      setStatus({ type: "error", message: "Company name is required." });
      return;
    }

    const names = groupMode
      ? [...groupNames, groupNameDraft.trim()].filter(Boolean)
      : [form.name.trim()].filter(Boolean);
    if (!names.length) {
      setSubmitting(false);
      setStatus({ type: "error", message: "Name is required." });
      return;
    }

    const phone = formatPhoneNumber(form.phone);
    const createdSignIns = [];

    try {
      for (const name of names) {
        const response = await fetch("/api/worker-signins", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            phone,
            trade: companyName,
            company: companyName,
          }),
        });
        const responsePayload = await response.json();
        if (!response.ok) {
          throw new Error(responsePayload.error || "Sign-in failed.");
        }
        createdSignIns.push(responsePayload.signIn);
      }

      if (rememberMe) {
        writeRememberedWorkerProfile(form);
        if (createdSignIns.length > 1) {
          writeRememberedWorkerGroup(createdSignIns);
        } else {
          clearRememberedWorkerGroup();
        }
      } else {
        clearRememberedWorkerProfile();
        clearRememberedWorkerGroup();
        setForm(EMPTY_WORKER_SIGNIN_FORM);
      }
      setGroupNames([]);
      setGroupNameDraft("");
      setStatus({
        type: "success",
        message: `${names.length === 1 ? "Sign-in" : `${names.length} sign-ins`} submitted - ${formatShortDate(
          createdSignIns[createdSignIns.length - 1],
          "sign_in_date_vancouver",
          "signed_in_at",
        )}`,
      });
    } catch (error) {
      const partialMessage = createdSignIns.length
        ? `${createdSignIns.length} sign-ins were saved before this error. `
        : "";
      setStatus({ type: "error", message: `${partialMessage}${error.message}` });
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
              <label className={groupMode ? "group-name-field" : ""}>
                <span>Name</span>
                {groupMode ? (
                  <div className="group-name-entry">
                    {groupNames.map((name, index) => (
                      <button
                        aria-label={`Remove ${name}`}
                        className="group-name-chip"
                        key={`${name}-${index}`}
                        type="button"
                        onClick={() => removeGroupName(index)}
                      >
                        <span>{name}</span>
                        <strong aria-hidden="true">x</strong>
                      </button>
                    ))}
                    <input
                      required={groupNames.length === 0}
                      autoComplete="off"
                      aria-label="Worker name"
                      placeholder="Type name, press enter"
                      value={groupNameDraft}
                      onChange={(event) => setGroupNameDraft(event.target.value)}
                      onKeyDown={handleGroupNameKeyDown}
                    />
                  </div>
                ) : (
                  <input
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                  />
                )}
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
                <span>Company Name</span>
                <select
                  required
                  value={form.companyName}
                  onChange={(event) => updateCompanyName(event.target.value)}
                >
                  <option value="" disabled>
                    Select company
                  </option>
                  {WORKER_COMPANY_OPTIONS.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </label>
              {form.companyName === OTHER_COMPANY ? (
                <label>
                  <span>Company Name</span>
                  <input
                    required
                    value={form.otherCompanyName}
                    onChange={(event) =>
                      updateField("otherCompanyName", event.target.value)
                    }
                  />
                </label>
              ) : null}
              <div className="worker-form-options">
                <label className="remember-worker-field">
                  <input
                    checked={rememberMe}
                    type="checkbox"
                    onChange={(event) => updateRememberMe(event.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  aria-pressed={groupMode}
                  className={
                    groupMode
                      ? "worker-group-toggle active"
                      : "worker-group-toggle"
                  }
                  type="button"
                  onClick={() => updateGroupMode(!groupMode)}
                >
                  Group
                </button>
              </div>
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
  const [signIns, setSignIns] = useState([]);
  const [rememberedGroupIds, setRememberedGroupIds] = useState([]);
  const [signedOutSignIns, setSignedOutSignIns] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const signedOut = signedOutSignIns.length > 0;

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function loadOpenSignIns() {
      try {
        const rememberedGroup = readRememberedWorkerGroup();
        if (rememberedGroup.signIns.length) {
          const ids = rememberedGroup.signIns.map((signIn) => signIn.id);
          const params = new URLSearchParams({ ids: ids.join(",") });
          const groupPayload = await readApiJson(
            await fetch(`/api/worker-signout?${params}`, {
              credentials: "include",
            }),
          );
          if (!active) return;
          if (groupPayload.signIns?.length) {
            setRememberedGroupIds(ids);
            setSignIns(groupPayload.signIns);
            return;
          }
          clearRememberedWorkerGroup();
        }

        const payload = await readApiJson(
          await fetch("/api/worker-signout", { credentials: "include" }),
        );
        if (active) setSignIns(payload.signIn ? [payload.signIn] : []);
      } catch (error) {
        if (active) setStatus({ type: "error", message: error.message });
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOpenSignIns();

    return () => {
      active = false;
    };
  }, []);

  const submitSignOut = async () => {
    setSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const openIds = new Set(signIns.map((signIn) => signIn.id));
      const groupSignOutIds = rememberedGroupIds.filter((id) => openIds.has(id));
      const requestOptions = groupSignOutIds.length
        ? {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ signInIds: groupSignOutIds }),
          }
        : {
            method: "POST",
            credentials: "include",
          };
      const response = await fetch("/api/worker-signout", {
        ...requestOptions,
      });
      const payload = await readApiJson(response);
      const signedOutRows = payload.signIns || (payload.signIn ? [payload.signIn] : []);
      setSignedOutSignIns(signedOutRows);
      setSignIns([]);
      setRememberedGroupIds([]);
      if (groupSignOutIds.length) clearRememberedWorkerGroup();
      setStatus({
        type: "success",
        message: `${signedOutRows.length === 1 ? "Signed out" : `${signedOutRows.length} signed out`} - ${formatShortDate(
          signedOutRows[0],
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
              {!loading && signIns.length ? (
                <>
                  {signIns.length > 1 ? (
                    <div className="worker-summary-list">
                      {signIns.map((signIn) => (
                        <p className="worker-summary" key={signIn.id}>
                          {signIn.name} / {signIn.company} / {signIn.trade}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="worker-summary">
                      {signIns[0].name} / {signIns[0].company} / {signIns[0].trade}
                    </p>
                  )}
                  <p className="worker-detail">
                    {signIns.length > 1
                      ? `Sign out ${signIns.length} workers for today?`
                      : "Sign out for today?"}
                  </p>
                  <button
                    className="primary-button"
                    disabled={submitting}
                    type="button"
                    onClick={submitSignOut}
                  >
                    {submitting
                      ? "Signing out..."
                      : signIns.length > 1
                        ? "Sign out all"
                        : "Sign out"}
                  </button>
                </>
              ) : null}
              {!loading && !signIns.length ? (
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
  const [emailing, setEmailing] = useState(false);
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

  const emailTodayReport = async () => {
    setEmailing(true);
    setMessage("");

    try {
      const payload = await readApiJson(
        await fetch("/api/staff/signins/email-report", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ date: today, format: "both" }),
        }),
      );
      setMessage(
        payload.skipped
          ? "No rows to email for today."
          : `Report emailed to ${formatReportRecipientSummary(
              payload.recipientEmail || settings.report_recipient_email,
            )}.`,
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setEmailing(false);
    }
  };

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
          actionLabel="Open forms"
          eyebrow="Submissions"
          text="Review toolbox talks, site inspections, daily hazard assessments, file backups, and retry failed OneDrive uploads."
          title="Safety Forms"
          onAction={() => navigateTo("/staff/forms")}
        >
          <dl className="staff-card-listing">
            <div>
              <dt>Worker link</dt>
              <dd>/worker-login</dd>
            </div>
            <div>
              <dt>Retention</dt>
              <dd>30 days after backup</dd>
            </div>
          </dl>
        </StaffActionCard>

        <StaffActionCard
          actionLabel="Manage workers"
          eyebrow="Accounts"
          text="Create worker usernames, phone mappings, company ties, passwords, and active status."
          title="Worker Accounts"
          onAction={() => navigateTo("/staff/workers")}
        >
          <dl className="staff-card-listing">
            <div>
              <dt>Login</dt>
              <dd>Phone or username</dd>
            </div>
            <div>
              <dt>Remember me</dt>
              <dd>Long-lived session</dd>
            </div>
          </dl>
        </StaffActionCard>

        <StaffActionCard
          eyebrow="Today"
          text={`Exports today's worker sign-ins as CSV, XML, or emails both files to ${formatReportRecipientSummary(
            settings.report_recipient_email,
          )}.`}
          title="Export Reports"
        >
          <div className="staff-card-actions">
            <a href={staffExportUrl(today, "csv")}>CSV</a>
            <a href={staffExportUrl(today, "xml")}>XML</a>
            <button disabled={emailing} type="button" onClick={emailTodayReport}>
              {emailing ? "Emailing..." : "Email"}
            </button>
          </div>
        </StaffActionCard>

        <StaffActionCard
          actionLabel="Open trends"
          eyebrow="Workforce planning"
          text="Track worker counts, company activity, trade mix, and site-service planning signals over time."
          title="Trends"
          onAction={() => navigateTo("/staff/trends")}
        >
          <dl className="staff-card-listing">
            <div>
              <dt>Default</dt>
              <dd>Last 90 days</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>Aggregate only</dd>
            </div>
          </dl>
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
  const [recipientDraft, setRecipientDraft] = useState("");

  const reportRecipients = useMemo(
    () => parseReportRecipients(settings.report_recipient_email),
    [settings.report_recipient_email],
  );

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

  const addReportRecipient = (value) => {
    const emails = splitReportRecipientValues(value);
    if (!emails.length) return false;

    const invalidEmail = emails.find((email) => !isValidReportRecipientEmail(email));
    if (invalidEmail) {
      setMessage(`Enter a valid email address: ${invalidEmail}`);
      return false;
    }

    const nextRecipients = [...reportRecipients];
    emails.forEach((email) => {
      if (!nextRecipients.includes(email)) nextRecipients.push(email);
    });

    if (nextRecipients.length === reportRecipients.length) {
      setRecipientDraft("");
      return true;
    }

    updateSetting(
      "report_recipient_email",
      formatReportRecipients(nextRecipients),
    );
    setRecipientDraft("");
    setMessage("");
    return true;
  };

  const removeReportRecipient = (emailToRemove) => {
    updateSetting(
      "report_recipient_email",
      formatReportRecipients(
        reportRecipients.filter((email) => email !== emailToRemove),
      ),
    );
  };

  const handleReportRecipientKeyDown = (event) => {
    if (!["Enter", ",", "Tab"].includes(event.key)) return;
    if (!recipientDraft.trim()) return;
    event.preventDefault();
    addReportRecipient(recipientDraft);
  };

  const persistSettings = async () => {
    const settingsToSave = settleReportRecipientDraft(settings, recipientDraft);
    const payload = await readApiJson(
      await fetch("/api/staff/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settingsToSave),
      }),
    );
    setSettings(payload.settings || DEFAULT_SITE_SETTINGS);
    setSystem(payload.system || DEFAULT_SYSTEM_STATUS);
    setRecipientDraft("");
    return payload.settings || settingsToSave;
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
          : `Report emailed to ${formatReportRecipientSummary(
              payload.recipientEmail || savedSettings.report_recipient_email,
            )}.`,
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
            <div className="email-recipient-entry">
              {reportRecipients.map((email) => (
                <button
                  aria-label={`Remove ${email}`}
                  className="email-recipient-chip"
                  key={email}
                  type="button"
                  onClick={() => removeReportRecipient(email)}
                >
                  <span>{email}</span>
                  <strong aria-hidden="true">x</strong>
                </button>
              ))}
              <input
                required={reportRecipients.length === 0}
                autoComplete="email"
                inputMode="email"
                placeholder="Type email, press enter"
                value={recipientDraft}
                onChange={(event) => setRecipientDraft(event.target.value)}
                onKeyDown={handleReportRecipientKeyDown}
              />
            </div>
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
                  ? `On - sends daily after ${formatReportAutoTime(
                      settings.report_auto_time,
                    )} when sign-ins exist.`
                  : "Off - no daily automatic report."}
              </small>
            </span>
          </label>
          <label>
            <span>Auto Report time</span>
            <input
              required
              type="time"
              value={settings.report_auto_time}
              onChange={(event) =>
                updateSetting("report_auto_time", event.target.value)
              }
            />
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
  const [date, setDate] = useStaffPageDate();
  const [sort, setSort] = useState("signed_in_at");
  const [dir, setDir] = useState("asc");
  const [group, setGroup] = useState("none");
  const [search, setSearch] = useState("");
  const [selectedSignIn, setSelectedSignIn] = useState(null);
  const [records, setRecords] = useState({ rows: [], groups: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const visibleRows = useMemo(
    () => filterRowsBySearch(records.rows, search),
    [records.rows, search],
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
      body: JSON.stringify({ date, format: "both" }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "Email report failed.");
      return;
    }
    setMessage(
      payload.skipped
        ? "No rows to email for this date."
        : `Report emailed to ${formatReportRecipientSummary(
            payload.recipientEmail || staff.email,
          )}.`,
    );
  };

  const exportUrl = (format) =>
    `/api/staff/signins/export?${new URLSearchParams({ date, format })}`;

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="sign-ins-people" contentWide navigateTo={navigateTo}>
      <section className="staff-toolbar staff-toolbar-desktop">
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
            <option value="none">Grouping</option>
            <option value="trade">Trade</option>
            <option value="company">Company</option>
          </select>
        </label>
        <div className="staff-actions staff-report-buttons">
          <a className="staff-report-button" href={exportUrl("csv")}>
            Export CSV
          </a>
          <a className="staff-report-button" href={exportUrl("xml")}>
            Export XML
          </a>
          <button className="staff-report-button primary" type="button" onClick={emailReport}>
            Email report
          </button>
        </div>
      </section>

      <section className="staff-toolbar staff-toolbar-mobile">
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
            <label className="staff-date-picker">
              <span>{formatLongDate(date)}</span>
              <input
                aria-label="Choose date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
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
            <option value="none">Grouping</option>
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

export function StaffCompanySummaryPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const [date, setDate] = useStaffPageDate();
  const [records, setRecords] = useState({ rows: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const companyRows = useMemo(
    () => summarizeCompanies(records.rows),
    [records.rows],
  );

  const totalWorkers = records.rows.length;
  const totalCompanies = companyRows.length;

  useEffect(() => {
    if (!staff) return;
    let active = true;
    setLoading(true);
    setMessage("");

    const params = new URLSearchParams({
      date,
      sort: "company",
      dir: "asc",
      group: "none",
    });
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
  }, [date, staff]);

  const changeDateBy = (days) => {
    setDate((current) => addDaysToISODate(current, days));
  };

  const emailReport = async () => {
    setMessage("");
    const response = await fetch("/api/staff/signins/email-report", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ date, format: "both", type: "company" }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "Email report failed.");
      return;
    }
    setMessage(
      payload.skipped
        ? "No rows to email for this date."
        : `Report emailed to ${formatReportRecipientSummary(
            payload.recipientEmail || staff.email,
          )}.`,
    );
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="sign-ins-company" contentWide navigateTo={navigateTo}>
      <section className="staff-toolbar staff-summary-toolbar staff-toolbar-desktop">
        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <div className="staff-actions staff-report-buttons">
          <a className="staff-report-button" href={staffExportUrl(date, "csv", "company")}>
            Export CSV
          </a>
          <a className="staff-report-button" href={staffExportUrl(date, "xml", "company")}>
            Export XML
          </a>
          <button className="staff-report-button primary" type="button" onClick={emailReport}>
            Email report
          </button>
        </div>
      </section>

      <section className="staff-toolbar staff-toolbar-mobile staff-summary-toolbar-mobile">
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
            <label className="staff-date-picker">
              <span>{formatLongDate(date)}</span>
              <input
                aria-label="Choose date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <button
              aria-label="Next day"
              type="button"
              onClick={() => changeDateBy(1)}
            >
              {">"}
            </button>
          </div>
        </div>
        <details className="staff-export-menu">
          <summary>Export</summary>
          <div className="staff-export-menu-panel">
            <a href={staffExportUrl(date, "csv", "company")}>
              <strong>CSV</strong>
              <span>Download spreadsheet</span>
            </a>
            <a href={staffExportUrl(date, "xml", "company")}>
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

      <section className="staff-table-panel staff-company-summary-panel">
        <div className="staff-company-metrics">
          <div>
            <strong>{totalCompanies}</strong>
            <span>Total Companies on site</span>
          </div>
          <div>
            <strong>{totalWorkers}</strong>
            <span>Total Workers on site</span>
          </div>
        </div>

        <div className="desktop-roster">
          <div className="staff-table-heading">
            <strong>Company summary</strong>
            <span>{formatLongDate(date)}</span>
          </div>
          <CompanySummaryTable loading={loading} rows={companyRows} />
        </div>

        <div className="mobile-roster">
          <CompactCompanySummaryList
            loading={loading}
            rows={companyRows}
            totalWorkers={totalWorkers}
          />
        </div>
      </section>
    </StaffShell>
  );
}

export function StaffTrendsPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const today = useMemo(todayInVancouver, []);
  const [preset, setPreset] = useState("90");
  const [customFrom, setCustomFrom] = useState(addDaysToISODate(today, -89));
  const [customTo, setCustomTo] = useState(today);
  const [search, setSearch] = useState("");
  const [companySort, setCompanySort] = useState("latest");
  const [mappingDrafts, setMappingDrafts] = useState({});
  const [savingCompany, setSavingCompany] = useState("");
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const rangeParams = useMemo(
    () => trendRangeParams(preset, customFrom, customTo, today),
    [customFrom, customTo, preset, today],
  );

  const companyRows = useMemo(
    () => sortTrendCompanies(filterTrendCompanies(trends?.companies || [], search), companySort),
    [companySort, search, trends],
  );

  const loadTrends = async () => {
    setLoading(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/trends?${rangeParams}`, {
          credentials: "include",
        }),
      );
      setTrends(payload);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!staff) return;
    let active = true;
    setLoading(true);
    setMessage("");

    fetch(`/api/staff/trends?${rangeParams}`, { credentials: "include" })
      .then(readApiJson)
      .then((payload) => {
        if (active) setTrends(payload);
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
  }, [rangeParams, staff]);

  const saveCompanyMapping = async (company, tradeCategory) => {
    setSavingCompany(company);
    setMessage("");

    try {
      await readApiJson(
        await fetch("/api/staff/company-profiles", {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mappings: [{ companyName: company, tradeCategory }],
          }),
        }),
      );
      setMappingDrafts((current) => {
        const next = { ...current };
        delete next[company];
        return next;
      });
      setMessage(`${company} mapped to ${tradeCategory}.`);
      await loadTrends();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSavingCompany("");
    }
  };

  if (!staff) return <StaffLoadingScreen />;

  const metrics = trends?.metrics || {};
  const dataQuality = trends?.dataQuality || {};
  const tradeCategories = trends?.tradeCategories || ["Unmapped"];
  const unmappedCompanies = dataQuality.unmappedCompanies || [];

  return (
    <StaffShell active="trends" contentWide navigateTo={navigateTo}>
      <section className="trends-page-heading">
        <div>
          <p>Workforce planning</p>
          <h1>Trends</h1>
          <span>
            Aggregate worker counts by company and trade category. No worker names or phone numbers are shown here.
          </span>
        </div>
      </section>

      <section className="staff-toolbar trends-toolbar">
        <div className="trend-preset-group" aria-label="Trend date range">
          {TREND_PRESETS.map((item) => (
            <button
              className={preset === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => setPreset(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>From</span>
          <input
            disabled={preset !== "custom"}
            type="date"
            value={preset === "custom" ? customFrom : trends?.range?.from || customFrom}
            onChange={(event) => setCustomFrom(event.target.value)}
          />
        </label>
        <label className="field">
          <span>To</span>
          <input
            disabled={preset !== "custom"}
            type="date"
            value={preset === "custom" ? customTo : trends?.range?.to || today}
            onChange={(event) => setCustomTo(event.target.value)}
          />
        </label>
      </section>

      {message ? <p className="staff-message">{message}</p> : null}

      <section className="trend-metric-grid" aria-label="Trend summary">
        <TrendMetricCard
          label="Current day"
          value={formatTrendNumber(metrics.currentDay)}
          detail={trends?.range?.to ? formatLongDate(trends.range.to) : "Loading"}
        />
        <TrendMetricCard
          label="7-day average"
          value={formatTrendNumber(metrics.current7DayAverage)}
          detail="Average daily sign-ins"
        />
        <TrendMetricCard
          label="Recent peak"
          value={formatTrendNumber(metrics.recentPeak)}
          detail="Highest daily count in the last 14 days"
        />
        <TrendMetricCard
          label="Previous period"
          value={formatSignedNumber(metrics.changeFromPreviousAverage)}
          detail={
            metrics.changeFromPreviousPercent === null
              ? "No previous-period baseline"
              : `${formatSignedNumber(metrics.changeFromPreviousPercent)}% average change`
          }
        />
      </section>

      <section className="trend-panel trend-panel-large">
        <div className="trend-panel-heading">
          <div>
            <h2>Workforce load</h2>
            <p>Daily worker sign-ins with a 7-day average for planning site services.</p>
          </div>
          <strong>{loading ? "Loading" : `${trends?.range?.dayCount || 0} days`}</strong>
        </div>
        <WorkforceLineChart daily={trends?.workforce?.daily || []} loading={loading} />
      </section>

      <section className="trend-grid">
        <article className="trend-panel">
          <div className="trend-panel-heading">
            <div>
              <h2>Site services planning</h2>
              <p>Use these signals for outhouses, parking, hoist/elevator load, access control, and logistics.</p>
            </div>
          </div>
          <dl className="trend-planning-list">
            <div>
              <dt>7-day average</dt>
              <dd>{formatTrendNumber(metrics.current7DayAverage)} workers/day</dd>
            </div>
            <div>
              <dt>Recent peak</dt>
              <dd>{formatTrendNumber(metrics.recentPeak)} workers</dd>
            </div>
            <div>
              <dt>Active companies</dt>
              <dd>{formatTrendNumber(metrics.activeCompanies7Day)} in last 7 days</dd>
            </div>
          </dl>
        </article>

        <article className="trend-panel">
          <div className="trend-panel-heading">
            <div>
              <h2>Data quality</h2>
              <p>These numbers help staff judge how complete the trend data is.</p>
            </div>
          </div>
          <dl className="trend-planning-list">
            <div>
              <dt>Sign-out completion</dt>
              <dd>{formatPercent(dataQuality.signOutCompletionRate)}</dd>
            </div>
            <div>
              <dt>Open sign-ins</dt>
              <dd>{formatTrendNumber(dataQuality.openSignIns)}</dd>
            </div>
            <div>
              <dt>Avg. signed-in time</dt>
              <dd>{formatHours(dataQuality.averageSignedInHours)}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="trend-panel">
        <div className="trend-panel-heading">
          <div>
            <h2>Trade mix</h2>
            <p>Weekly sign-ins grouped by staff-managed company trade category.</p>
          </div>
        </div>
        <TradeMixChart tradeMix={trends?.tradeMix} loading={loading} />
      </section>

      <section className="trend-panel">
        <div className="trend-panel-heading">
          <div>
            <h2>Company activity</h2>
            <p>First seen, last seen, active days, peak crew size, latest count, and direction.</p>
          </div>
        </div>
        <div className="trend-company-controls">
          <label className="staff-search-field">
            <span>Search companies</span>
            <input
              placeholder="Search company"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="staff-sort-select">
            <span>Sort</span>
            <select value={companySort} onChange={(event) => setCompanySort(event.target.value)}>
              <option value="latest">Latest count</option>
              <option value="peak">Peak workers</option>
              <option value="activeDays">Active days</option>
              <option value="company">Company A-Z</option>
            </select>
          </label>
        </div>
        <CompanyActivityTable
          companies={companyRows}
          loading={loading}
          mappingDrafts={mappingDrafts}
          savingCompany={savingCompany}
          tradeCategories={tradeCategories}
          onDraftChange={(company, category) =>
            setMappingDrafts((current) => ({ ...current, [company]: category }))
          }
          onSave={saveCompanyMapping}
        />
      </section>

      <section className="trend-panel">
        <div className="trend-panel-heading">
          <div>
            <h2>Unmapped companies</h2>
            <p>Map companies to trade categories to improve trade mix charts.</p>
          </div>
          <strong>{unmappedCompanies.length}</strong>
        </div>
        {unmappedCompanies.length ? (
          <div className="unmapped-company-list">
            {unmappedCompanies.map((company) => (
              <span key={company}>{company}</span>
            ))}
          </div>
        ) : (
          <p className="empty-state">All companies in this range are mapped.</p>
        )}
      </section>
    </StaffShell>
  );
}

export function WorkerLoginPage({ navigateTo }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/worker-me", { credentials: "include" })
      .then(readApiJson)
      .then((payload) => {
        if (active && payload.worker) navigateTo("/forms");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [navigateTo]);

  const submitLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      await readApiJson(
        await fetch("/api/auth/worker-login", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ identifier, password, rememberMe }),
        }),
      );
      navigateTo("/forms");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="public-page worker-page form-platform-page">
      <section className="worker-card">
        <div className="brand-mark">APPIA</div>
        <form className="worker-form" onSubmit={submitLogin}>
          <h1>Worker Forms</h1>
          <label>
            <span>Phone or username</span>
            <input
              required
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
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
          <label className="remember-worker-field">
            <input
              checked={rememberMe}
              type="checkbox"
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Signing in..." : "Sign in"}
          </button>
          {message ? <p className="form-message error">{message}</p> : null}
        </form>
      </section>
    </main>
  );
}

export function WorkerFormsHomePage({ navigateTo }) {
  const { worker } = useWorkerSession(navigateTo);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await fetch("/api/auth/worker-logout", {
      method: "POST",
      credentials: "include",
    });
    navigateTo("/worker-login");
  };

  if (!worker) return <WorkerFormLoadingScreen />;

  return (
    <main className="public-page form-platform-page">
      <section className="form-platform-shell">
        <header className="form-platform-header">
          <div>
            <div className="brand-mark">APPIA</div>
            <h1>Submit a Safety Form</h1>
            <p>{worker.name} / {worker.company}</p>
          </div>
          <div className="form-platform-actions">
            <button type="button" onClick={() => navigateTo("/my-submissions")}>
              My submissions
            </button>
            <button disabled={signingOut} type="button" onClick={signOut}>
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </header>

        <div className="safety-form-grid">
          {SAFETY_FORM_TYPES.map((form) => (
            <button
              className="safety-form-card"
              key={form.id}
              type="button"
              onClick={() => navigateTo(`/forms/${form.id}`)}
            >
              <span>{form.label}</span>
              <strong>Open</strong>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export function WorkerFormSubmissionPage({ navigateTo, routePath }) {
  const { worker } = useWorkerSession(navigateTo);
  const formType = routePath.split("/").filter(Boolean).pop();
  const form = SAFETY_FORM_TYPES.find((item) => item.id === formType);
  const [mode, setMode] = useState("");
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "", date: "" });
  const submitted = status.type === "success";

  useEffect(() => {
    if (worker && !form) navigateTo("/forms");
  }, [form, navigateTo, worker]);

  const submitFilledForm = async (event) => {
    event.preventDefault();
    await submitSubmission({
      formType,
      submissionMode: "fill_form",
      notes,
    });
  };

  const submitFileForm = async (event) => {
    event.preventDefault();
    if (!file) {
      setStatus({ type: "error", message: "Choose a file or photo.", date: "" });
      return;
    }

    const uploadPayload = await submitUpload(file);
    await submitSubmission({
      formType,
      submissionMode: "submit_file",
      notes,
      file: {
        storagePath: uploadPayload.storagePath,
        originalFilename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
    });
  };

  const submitUpload = async (selectedFile) => {
    const payload = await readApiJson(
      await fetch("/api/worker/submissions/file-upload-url", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          formType,
          file: {
            originalFilename: selectedFile.name,
            mimeType: selectedFile.type || "application/octet-stream",
            sizeBytes: selectedFile.size,
          },
        }),
      }),
    );

    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", selectedFile);
    const uploadResponse = await fetch(payload.upload.signedUrl, {
      method: "PUT",
      body: formData,
    });
    if (!uploadResponse.ok) {
      throw new Error("File upload failed.");
    }
    return payload.upload;
  };

  const submitSubmission = async (body) => {
    setSubmitting(true);
    setStatus({ type: "", message: "", date: "" });

    try {
      const payload = await readApiJson(
        await fetch("/api/worker/submissions", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      setStatus({
        type: "success",
        message: "Your form has been submitted",
        date: formatDateString(payload.submission.submitted_date_vancouver),
      });
    } catch (error) {
      setStatus({ type: "error", message: error.message, date: "" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!worker || !form) return <WorkerFormLoadingScreen />;

  return (
    <main className="public-page form-platform-page">
      <section className="form-platform-shell">
        <header className="form-platform-header">
          <div>
            <button className="text-button" type="button" onClick={() => navigateTo("/forms")}>
              Back
            </button>
            <h1>{form.label}</h1>
            <p>{worker.name} / {worker.company}</p>
          </div>
          <button type="button" onClick={() => navigateTo("/my-submissions")}>
            My submissions
          </button>
        </header>

        <div className={submitted ? "worker-form submitted form-submit-panel" : "worker-form form-submit-panel"}>
          {submitted ? (
            <div className="worker-thank-you" role="status">
              <h1>Thank You</h1>
              <p>Your form has been submitted - {status.date}</p>
            </div>
          ) : (
            <>
              {!mode ? (
                <div className="submission-mode-grid">
                  <button type="button" onClick={() => setMode("submit_file")}>
                    <strong>Submit File</strong>
                    <span>Upload a document, photo, or camera image.</span>
                  </button>
                  <button type="button" onClick={() => setMode("fill_form")}>
                    <strong>Fill Form</strong>
                    <span>Use the simple placeholder form.</span>
                  </button>
                </div>
              ) : null}

              {mode === "submit_file" ? (
                <form className="submission-form" onSubmit={submitFileForm}>
                  <div className="file-choice-grid">
                    <FileChoice label="Upload File" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*" onFile={setFile} />
                    <FileChoice label="Upload Photo" accept="image/*" onFile={setFile} />
                    <FileChoice label="Take Photo" accept="image/*" capture="environment" onFile={setFile} />
                  </div>
                  {file ? (
                    <p className="selected-file">
                      {file.name} / {formatFileSize(file.size)}
                    </p>
                  ) : null}
                  <label>
                    <span>Notes</span>
                    <textarea
                      rows="4"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </label>
                  <div className="form-platform-actions">
                    <button type="button" onClick={() => setMode("")}>
                      Change option
                    </button>
                    <button className="primary-button" disabled={submitting} type="submit">
                      {submitting ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </form>
              ) : null}

              {mode === "fill_form" ? (
                <form className="submission-form" onSubmit={submitFilledForm}>
                  <label>
                    <span>Notes</span>
                    <textarea
                      autoFocus
                      rows="7"
                      placeholder="Optional"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </label>
                  <div className="form-placeholder-panel" aria-hidden="true" />
                  <div className="form-platform-actions">
                    <button type="button" onClick={() => setMode("")}>
                      Change option
                    </button>
                    <button className="primary-button" disabled={submitting} type="submit">
                      {submitting ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </form>
              ) : null}
            </>
          )}
          {status.type === "error" ? (
            <p className="form-message error">{status.message}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function WorkerSubmissionHistoryPage({ navigateTo }) {
  const { worker } = useWorkerSession(navigateTo);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const loadRows = async () => {
    setLoading(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch("/api/worker/submissions", { credentials: "include" }),
      );
      setRows(payload.rows || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (worker) loadRows();
  }, [worker]);

  const deleteSubmission = async (id) => {
    setDeletingId(id);
    setMessage("");
    try {
      await readApiJson(
        await fetch(`/api/worker/submissions/${id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      );
      setRows((current) => current.filter((row) => row.id !== id));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setDeletingId("");
    }
  };

  if (!worker) return <WorkerFormLoadingScreen />;

  return (
    <main className="public-page form-platform-page">
      <section className="form-platform-shell">
        <header className="form-platform-header">
          <div>
            <button className="text-button" type="button" onClick={() => navigateTo("/forms")}>
              Back
            </button>
            <h1>My Submissions</h1>
            <p>{worker.name} / {worker.company}</p>
          </div>
          <button type="button" onClick={loadRows}>
            Refresh
          </button>
        </header>

        {message ? <p className="form-message error">{message}</p> : null}
        <div className="submission-history-list">
          {loading ? <p className="empty-state">Loading submissions...</p> : null}
          {!loading && !rows.length ? (
            <p className="empty-state">No submissions yet.</p>
          ) : null}
          {rows.map((row) => (
            <article className="submission-history-item" key={row.id}>
              <div>
                <strong>{formTypeLabel(row.form_type)}</strong>
                <span>{formatDateTime(row.submitted_at)}</span>
                <small>
                  {submissionModeLabel(row.submission_mode)} / {backupStatusLabel(row.one_drive_backup_status)}
                </small>
              </div>
              <button
                disabled={deletingId === row.id}
                type="button"
                onClick={() => deleteSubmission(row.id)}
              >
                {deletingId === row.id ? "Deleting..." : "Delete"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export function StaffWorkersPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_STAFF_WORKER_FORM);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadWorkers = async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const payload = await readApiJson(
        await fetch(`/api/staff/workers?${params}`, { credentials: "include" }),
      );
      setRows(payload.rows || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staff) loadWorkers();
  }, [staff]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const startEdit = (worker) => {
    setEditingId(worker.id);
    setForm({
      name: worker.name || "",
      company: worker.company || "",
      phone: worker.phone || "",
      username: worker.username || "",
      password: "",
      active: worker.active,
    });
  };

  const resetForm = () => {
    setEditingId("");
    setForm(EMPTY_STAFF_WORKER_FORM);
  };

  const saveWorker = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { ...form, id: editingId } : form;
      if (editingId && !body.password) delete body.password;
      await readApiJson(
        await fetch("/api/staff/workers", {
          method,
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      resetForm();
      await loadWorkers();
      setMessage(editingId ? "Worker account updated." : "Worker account created.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (worker) => {
    setMessage("");
    try {
      await readApiJson(
        await fetch("/api/staff/workers", {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: worker.id, active: !worker.active }),
        }),
      );
      await loadWorkers();
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="workers" contentWide navigateTo={navigateTo}>
      {message ? <p className="staff-message">{message}</p> : null}
      <section className="staff-form-admin-grid">
        <form className="staff-admin-form" onSubmit={saveWorker}>
          <h2>{editingId ? "Edit worker" : "Create worker"}</h2>
          <label className="field">
            <span>Name</span>
            <input required value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
          </label>
          <label className="field">
            <span>Company</span>
            <input required value={form.company} onChange={(event) => updateForm("company", event.target.value)} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input required inputMode="tel" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
          </label>
          <label className="field">
            <span>Username</span>
            <input required value={form.username} onChange={(event) => updateForm("username", event.target.value)} />
          </label>
          <label className="field">
            <span>{editingId ? "New password" : "Password"}</span>
            <input
              required={!editingId}
              type="password"
              value={form.password}
              onChange={(event) => updateForm("password", event.target.value)}
            />
          </label>
          <label className="remember-worker-field">
            <input
              checked={form.active}
              type="checkbox"
              onChange={(event) => updateForm("active", event.target.checked)}
            />
            <span>Active</span>
          </label>
          <div className="staff-card-actions">
            {editingId ? <button type="button" onClick={resetForm}>Cancel</button> : null}
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? "Saving..." : editingId ? "Save worker" : "Create worker"}
            </button>
          </div>
        </form>

        <section className="staff-table-panel">
          <div className="staff-list-controls">
            <label className="staff-search-field">
              <span>Search workers</span>
              <input
                placeholder="Search workers"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") loadWorkers();
                }}
              />
            </label>
            <button type="button" onClick={loadWorkers}>Search</button>
          </div>
          <WorkerAccountsTable
            loading={loading}
            rows={rows}
            onEdit={startEdit}
            onToggleActive={toggleActive}
          />
        </section>
      </section>
    </StaffShell>
  );
}

export function StaffFormSubmissionsPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const today = useMemo(todayInVancouver, []);
  const [filters, setFilters] = useState({
    from: addDaysToISODate(today, -29),
    to: today,
    company: "",
    phone: "",
    name: "",
    formType: "",
    backupStatus: "",
    sort: "submitted_at",
    dir: "desc",
  });
  const [records, setRecords] = useState({ rows: [] });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState("");
  const [message, setMessage] = useState("");

  const loadSubmissions = async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value),
      );
      const payload = await readApiJson(
        await fetch(`/api/staff/submissions?${params}`, {
          credentials: "include",
        }),
      );
      setRecords(payload);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staff) loadSubmissions();
  }, [staff]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const changeSort = (value) => {
    const [sort, dir] = value.split(":");
    setFilters((current) => ({ ...current, sort, dir }));
  };

  const retryBackup = async (id) => {
    setRetryingId(id);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/submissions/${id}/backup-retry`, {
          method: "POST",
          credentials: "include",
        }),
      );
      setRecords((current) => ({
        ...current,
        rows: current.rows.map((row) =>
          row.id === id ? payload.submission : row,
        ),
      }));
      setMessage("Backup retry completed.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setRetryingId("");
    }
  };

  const openDetails = async (row) => {
    setSelected(row);
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/submissions/${row.id}`, {
          credentials: "include",
        }),
      );
      setSelected(payload.submission);
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="forms" contentWide navigateTo={navigateTo}>
      <section className="staff-toolbar staff-form-filter-toolbar">
        <label className="field">
          <span>From</span>
          <input type="date" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} />
        </label>
        <label className="field">
          <span>To</span>
          <input type="date" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} />
        </label>
        <label className="field">
          <span>Company</span>
          <input value={filters.company} onChange={(event) => updateFilter("company", event.target.value)} />
        </label>
        <label className="field">
          <span>Phone</span>
          <input value={filters.phone} onChange={(event) => updateFilter("phone", event.target.value)} />
        </label>
        <label className="field">
          <span>Name</span>
          <input value={filters.name} onChange={(event) => updateFilter("name", event.target.value)} />
        </label>
        <label className="field">
          <span>Form</span>
          <select value={filters.formType} onChange={(event) => updateFilter("formType", event.target.value)}>
            <option value="">All</option>
            {SAFETY_FORM_TYPES.map((form) => (
              <option key={form.id} value={form.id}>{form.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Backup</span>
          <select value={filters.backupStatus} onChange={(event) => updateFilter("backupStatus", event.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="backed_up">Backed up</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label className="field">
          <span>Sort</span>
          <select value={`${filters.sort}:${filters.dir}`} onChange={(event) => changeSort(event.target.value)}>
            <option value="submitted_at:desc">Newest</option>
            <option value="submitted_at:asc">Oldest</option>
            <option value="company:asc">Company A-Z</option>
            <option value="worker_name:asc">Name A-Z</option>
            <option value="worker_phone:asc">Phone A-Z</option>
            <option value="form_type:asc">Form type</option>
            <option value="one_drive_backup_status:asc">Backup</option>
          </select>
        </label>
        <button className="primary-button" type="button" onClick={loadSubmissions}>
          Apply
        </button>
      </section>

      {message ? <p className="staff-message">{message}</p> : null}

      <section className="staff-table-panel">
        <div className="staff-table-heading">
          <strong>{records.rows.length} form submissions</strong>
          <span>{describeStaffFormSort(filters.sort, filters.dir)}</span>
        </div>
        <FormSubmissionsTable
          loading={loading}
          retryingId={retryingId}
          rows={records.rows}
          onDetails={openDetails}
          onRetry={retryBackup}
        />
      </section>

      {selected ? (
        <SubmissionDetailsDialog
          row={selected}
          onClose={() => setSelected(null)}
          onRetry={retryBackup}
          retryingId={retryingId}
        />
      ) : null}
    </StaffShell>
  );
}

function WorkerAccountsTable({ loading, rows, onEdit, onToggleActive }) {
  if (loading) return <p className="empty-state">Loading workers...</p>;
  if (!rows.length) return <p className="empty-state">No worker accounts found.</p>;

  return (
    <div className="staff-table-scroll staff-form-table-scroll">
      <table className="staff-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Phone</th>
            <th>Username</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((worker) => (
            <tr key={worker.id}>
              <td>{worker.name}</td>
              <td>{worker.company}</td>
              <td><a href={`tel:${phoneHref(worker.phone)}`}>{worker.phone}</a></td>
              <td>{worker.username}</td>
              <td><StatusPill value={worker.active ? "Active" : "Inactive"} /></td>
              <td>
                <div className="table-action-row">
                  <button type="button" onClick={() => onEdit(worker)}>Edit</button>
                  <button type="button" onClick={() => onToggleActive(worker)}>
                    {worker.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormSubmissionsTable({ loading, retryingId, rows, onDetails, onRetry }) {
  if (loading) return <p className="empty-state">Loading form submissions...</p>;
  if (!rows.length) return <p className="empty-state">No form submissions found.</p>;

  return (
    <div className="staff-table-scroll staff-form-table-scroll">
      <table className="staff-table form-submissions-table">
        <thead>
          <tr>
            <th>Submitted</th>
            <th>Company</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Form</th>
            <th>Type</th>
            <th>Backup</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatDateTime(row.submitted_at)}</td>
              <td>{row.company}</td>
              <td>{row.worker_name}</td>
              <td><a href={`tel:${phoneHref(row.worker_phone)}`}>{row.worker_phone}</a></td>
              <td>{formTypeLabel(row.form_type)}</td>
              <td>{submissionModeLabel(row.submission_mode)}</td>
              <td><StatusPill value={backupStatusLabel(row.one_drive_backup_status)} /></td>
              <td>
                <div className="table-action-row">
                  <button type="button" onClick={() => onDetails(row)}>Details</button>
                  {row.one_drive_backup_status === "failed" ? (
                    <button disabled={retryingId === row.id} type="button" onClick={() => onRetry(row.id)}>
                      {retryingId === row.id ? "Retrying" : "Retry"}
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubmissionDetailsDialog({ onClose, onRetry, retryingId, row }) {
  const files = row.files || [];
  return (
    <div className="staff-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Submission details"
        className="staff-detail-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <div>
            <h2>{formTypeLabel(row.form_type)}</h2>
            <p>{row.worker_name} / {row.company}</p>
          </div>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <dl className="staff-detail-list">
          <div><dt>Submitted</dt><dd>{formatDateTime(row.submitted_at)}</dd></div>
          <div><dt>Phone</dt><dd>{row.worker_phone}</dd></div>
          <div><dt>Username</dt><dd>{row.worker_username}</dd></div>
          <div><dt>Mode</dt><dd>{submissionModeLabel(row.submission_mode)}</dd></div>
          <div><dt>Backup</dt><dd>{backupStatusLabel(row.one_drive_backup_status)}</dd></div>
          {row.backup_error ? <div><dt>Backup error</dt><dd>{row.backup_error}</dd></div> : null}
          {row.one_drive_web_url ? (
            <div><dt>OneDrive</dt><dd><a href={row.one_drive_web_url} target="_blank" rel="noreferrer">Open backup</a></dd></div>
          ) : null}
          {row.notes ? <div><dt>Notes</dt><dd>{row.notes}</dd></div> : null}
        </dl>
        {files.length ? (
          <div className="submission-file-list">
            <h3>Files</h3>
            {files.map((file) => (
              <div className="submission-file-row" key={file.id}>
                <span>{file.original_filename}</span>
                <small>{formatFileSize(file.size_bytes)} / {backupStatusLabel(file.backup_status)}</small>
                {file.one_drive_web_url ? (
                  <a href={file.one_drive_web_url} target="_blank" rel="noreferrer">Open</a>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {row.one_drive_backup_status === "failed" ? (
          <button
            className="primary-button"
            disabled={retryingId === row.id}
            type="button"
            onClick={() => onRetry(row.id)}
          >
            {retryingId === row.id ? "Retrying..." : "Retry backup"}
          </button>
        ) : null}
      </section>
    </div>
  );
}

function FileChoice({ accept, capture, label, onFile }) {
  return (
    <label className="file-choice">
      <input
        accept={accept}
        capture={capture}
        type="file"
        onChange={(event) => onFile(event.target.files?.[0] || null)}
      />
      <strong>{label}</strong>
    </label>
  );
}

function StatusPill({ value }) {
  return <span className={`status-pill status-${String(value).toLowerCase().replace(/\s+/g, "-")}`}>{value}</span>;
}

function WorkerFormLoadingScreen() {
  return (
    <main className="public-page worker-page">
      <section className="worker-card">
        <div className="brand-mark">APPIA</div>
        <p className="muted">Loading...</p>
      </section>
    </main>
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
      <div
        className={
          contentWide
            ? "staff-mobile-menu staff-mobile-menu-wide"
            : "staff-mobile-menu"
        }
      >
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
                  navigateTo(staffNavPath(item.path));
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

function CompanySummaryTable({ loading, rows }) {
  return (
    <div className="staff-table-scroll">
      <table className="staff-table company-summary-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Number of workers for that company</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.company}>
              <td>{row.company}</td>
              <td className="company-count-cell">{row.count}</td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan="2" className="staff-table-empty">
                {loading ? "Loading..." : "No sign-ins for this date."}
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

function CompactCompanySummaryList({ loading, rows, totalWorkers }) {
  const companyLabel = rows.length === 1 ? "1 company" : `${rows.length} companies`;
  const workerLabel =
    totalWorkers === 1 ? "1 worker" : `${totalWorkers} workers`;

  return (
    <section className="compact-signin-list company-summary-list" aria-label="Company summary">
      <div className="compact-signin-list-title">
        <h2>{companyLabel}</h2>
        <span>{workerLabel}</span>
      </div>
      <div className="compact-company-rows">
        {rows.map((row) => (
          <div className="compact-company-row" key={row.company}>
            <div className="compact-person">
              <span className="row-mark" />
              <span>
                <strong>{row.company}</strong>
              </span>
            </div>
            <strong>{row.count}</strong>
          </div>
        ))}
        {!rows.length ? (
          <p className="empty-state compact-empty">
            {loading ? "Loading..." : "No sign-ins for this date."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function CompactSignInList({ loading, rows, onSelect }) {
  const signInLabel = rows.length === 1 ? "1 sign-in" : `${rows.length} sign-ins`;

  return (
    <section className="compact-signin-list" aria-label="Compact sign-in list">
      <div className="compact-signin-list-title">
        <h2>{signInLabel}</h2>
        <span>tap any row</span>
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
                <em>{row.trade}</em>
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
            <dt>Trade</dt>
            <dd>{row.trade}</dd>
          </div>
          <div>
            <dt>Company</dt>
            <dd>{row.company}</dd>
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

function TrendMetricCard({ detail, label, value }) {
  return (
    <article className="trend-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function WorkforceLineChart({ daily, loading }) {
  if (loading) return <p className="empty-state">Loading workforce trend...</p>;
  if (!daily.length) return <p className="empty-state">No trend data for this range.</p>;

  const width = 720;
  const height = 260;
  const padding = { top: 18, right: 22, bottom: 34, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    1,
    ...daily.map((day) => Math.max(day.workerCount, day.movingAverage7 || 0)),
  );
  const xForIndex = (index) =>
    padding.left + (daily.length === 1 ? 0 : (index / (daily.length - 1)) * chartWidth);
  const yForValue = (value) =>
    padding.top + chartHeight - (Number(value || 0) / maxValue) * chartHeight;
  const workerPoints = daily
    .map((day, index) => `${xForIndex(index)},${yForValue(day.workerCount)}`)
    .join(" ");
  const averagePoints = daily
    .map((day, index) => `${xForIndex(index)},${yForValue(day.movingAverage7)}`)
    .join(" ");
  const tickIndexes = uniqueChartTickIndexes(daily.length);

  return (
    <div className="trend-chart-shell">
      <svg
        aria-label="Daily workforce load chart"
        className="trend-line-chart"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + chartHeight - ratio * chartHeight;
          return (
            <g key={ratio}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text x={12} y={y + 4}>{Math.round(maxValue * ratio)}</text>
            </g>
          );
        })}
        <polyline className="average-line" points={averagePoints} />
        <polyline className="worker-line" points={workerPoints} />
        {tickIndexes.map((index) => (
          <text
            className="x-label"
            key={daily[index].date}
            x={xForIndex(index)}
            y={height - 8}
          >
            {formatMonthDay(daily[index].date)}
          </text>
        ))}
      </svg>
      <div className="trend-chart-legend">
        <span><i className="worker" />Daily count</span>
        <span><i className="average" />7-day average</span>
      </div>
    </div>
  );
}

function TradeMixChart({ loading, tradeMix }) {
  if (loading) return <p className="empty-state">Loading trade mix...</p>;
  const weekly = tradeMix?.weekly || [];
  if (!weekly.length) return <p className="empty-state">No trade mix data for this range.</p>;

  return (
    <div className="trade-mix-chart">
      {weekly.map((week) => (
        <div className="trade-week-row" key={week.weekStart}>
          <span>{formatMonthDay(week.weekStart)}</span>
          <div className="trade-week-bar" aria-label={`Week of ${week.weekStart}, ${week.total} workers`}>
            {week.categories.map((item) => (
              <div
                key={`${week.weekStart}-${item.category}`}
                style={{
                  background: trendColor(item.category),
                  width: `${Math.max(4, (item.count / week.total) * 100)}%`,
                }}
                title={`${item.category}: ${item.count}`}
              />
            ))}
          </div>
          <strong>{week.total}</strong>
        </div>
      ))}
      <div className="trade-mix-legend">
        {(tradeMix?.totals || []).slice(0, 8).map((item) => (
          <span key={item.category}>
            <i style={{ background: trendColor(item.category) }} />
            {item.category}
          </span>
        ))}
      </div>
    </div>
  );
}

function CompanyActivityTable({
  companies,
  loading,
  mappingDrafts,
  savingCompany,
  tradeCategories,
  onDraftChange,
  onSave,
}) {
  if (loading) return <p className="empty-state">Loading company activity...</p>;
  if (!companies.length) return <p className="empty-state">No companies found for this range.</p>;

  return (
    <div className="staff-table-scroll trend-table-scroll">
      <table className="staff-table trend-company-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Trade category</th>
            <th>First seen</th>
            <th>Last seen</th>
            <th>Active days</th>
            <th>Peak</th>
            <th>Latest</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => {
            const draft = mappingDrafts[company.company] || company.tradeCategory;
            const changed = draft !== company.tradeCategory;
            return (
              <tr key={company.company}>
                <td>
                  <strong>{company.company}</strong>
                  {!company.mapped ? <span className="unmapped-pill">Unmapped</span> : null}
                </td>
                <td>
                  <div className="company-mapping-control">
                    <select
                      value={draft}
                      onChange={(event) => onDraftChange(company.company, event.target.value)}
                    >
                      {tradeCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={!changed || savingCompany === company.company}
                      type="button"
                      onClick={() => onSave(company.company, draft)}
                    >
                      {savingCompany === company.company ? "Saving" : "Save"}
                    </button>
                  </div>
                </td>
                <td>{formatLongDate(company.firstSeen)}</td>
                <td>{formatLongDate(company.lastSeen)}</td>
                <td>{company.activeDays}</td>
                <td>{company.peakWorkers}</td>
                <td>{company.latestCount}</td>
                <td><TrendDirection value={company.trend} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TrendDirection({ value }) {
  const label = value === "up" ? "Up" : value === "down" ? "Down" : "Flat";
  return <span className={`trend-direction trend-${value || "flat"}`}>{label}</span>;
}

function useWorkerSession(navigateTo) {
  const [worker, setWorker] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/worker-me", { credentials: "include" })
      .then(readApiJson)
      .then((payload) => {
        if (active) setWorker(payload.worker);
      })
      .catch(() => {
        if (active) navigateTo("/worker-login");
      });

    return () => {
      active = false;
    };
  }, [navigateTo]);

  return { worker };
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

function useStaffPageDate() {
  const [date, setDate] = useState(readStaffDateFromUrl);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("date") === date) return;
    url.searchParams.set("date", date);
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, [date]);

  return [date, setDate];
}

function readStaffDateFromUrl() {
  if (typeof window === "undefined") return todayInVancouver();
  const date = new URLSearchParams(window.location.search).get("date");
  return isISODate(date) ? date : todayInVancouver();
}

function staffNavPath(path) {
  if (!path.startsWith("/staff/sign-ins")) return path;
  const date = readStaffDateFromUrl();
  const url = new URL(path, "https://safetyfirst.local");
  url.searchParams.set("date", date);
  return `${url.pathname}${url.search}`;
}

function isISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

async function readApiJson(response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "The server could not complete the request.");
  }
  return payload;
}

function staffExportUrl(date, format, type = "people") {
  const params = { date, format };
  if (type === "company") params.type = "company";
  return `/api/staff/signins/export?${new URLSearchParams(params)}`;
}

function parseReportRecipients(value) {
  const seen = new Set();
  return splitReportRecipientValues(value)
    .filter((email) => {
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });
}

function formatReportRecipients(emails) {
  return emails.filter(Boolean).join(", ");
}

function normalizeReportRecipientInput(value) {
  return String(value || "").trim().toLowerCase();
}

function splitReportRecipientValues(value) {
  return String(value || "")
    .split(/[,\n;]/)
    .map(normalizeReportRecipientInput)
    .filter(Boolean);
}

function isValidReportRecipientEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function settleReportRecipientDraft(settings, draft) {
  const emails = parseReportRecipients(settings.report_recipient_email);
  const draftEmails = splitReportRecipientValues(draft);

  for (const draftEmail of draftEmails) {
    if (!isValidReportRecipientEmail(draftEmail)) {
      throw new Error(`Enter a valid email address: ${draftEmail}`);
    }
    if (!emails.includes(draftEmail)) emails.push(draftEmail);
  }

  if (!emails.length) {
    throw new Error("Add at least one report recipient email.");
  }

  return {
    ...settings,
    report_recipient_email: formatReportRecipients(emails),
  };
}

function formatReportRecipientSummary(value) {
  const emails = parseReportRecipients(value);
  if (!emails.length) return "no recipients";
  if (emails.length === 1) return emails[0];
  return `${emails.length} recipients`;
}

function formatReportAutoTime(value) {
  const [rawHour, rawMinute] = String(value || "08:00").slice(0, 5).split(":");
  const hour = Number(rawHour);
  const minute = /^\d{2}$/.test(rawMinute) ? rawMinute : "00";
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return "08:00 a.m.";

  const suffix = hour >= 12 ? "p.m." : "a.m.";
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${minute} ${suffix}`;
}

function trendRangeParams(preset, customFrom, customTo, today) {
  const params = new URLSearchParams({ to: today });
  if (preset === "30") {
    params.set("from", addDaysToISODate(today, -29));
  } else if (preset === "project") {
    params.set("range", "project");
  } else if (preset === "custom") {
    params.set("from", customFrom);
    params.set("to", customTo);
  } else {
    params.set("from", addDaysToISODate(today, -89));
  }
  return params;
}

function filterTrendCompanies(companies, search) {
  const query = search.trim().toLowerCase();
  if (!query) return companies;
  return companies.filter((company) =>
    [company.company, company.tradeCategory]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)),
  );
}

function sortTrendCompanies(companies, sort) {
  return [...companies].sort((a, b) => {
    if (sort === "company") return a.company.localeCompare(b.company);
    if (sort === "peak") {
      return b.peakWorkers - a.peakWorkers || a.company.localeCompare(b.company);
    }
    if (sort === "activeDays") {
      return b.activeDays - a.activeDays || a.company.localeCompare(b.company);
    }
    return b.latestCount - a.latestCount || b.peakWorkers - a.peakWorkers || a.company.localeCompare(b.company);
  });
}

function uniqueChartTickIndexes(length) {
  if (length <= 1) return [0];
  return [...new Set([0, Math.floor((length - 1) / 2), length - 1])];
}

function trendColor(value) {
  const palette = [
    "#245f5b",
    "#1e5c8a",
    "#8d5d13",
    "#7a4e8d",
    "#426b2f",
    "#8a3d35",
    "#51606d",
    "#2f7d78",
  ];
  const text = String(value || "");
  const index = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[index % palette.length];
}

function formatTrendNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "0";
  return Number(value).toLocaleString("en-CA", { maximumFractionDigits: 1 });
}

function formatSignedNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "0";
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${formatTrendNumber(number)}`;
}

function formatPercent(value) {
  if (value === null || value === undefined) return "0%";
  return `${formatTrendNumber(value)}%`;
}

function formatHours(value) {
  if (value === null || value === undefined) return "Not enough sign-outs";
  return `${formatTrendNumber(value)} hours`;
}

function formatMonthDay(value) {
  const [year, month, day] = String(value || "").slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Vancouver",
  }).format(new Date(`${year}-${month}-${day}T12:00:00-08:00`));
}

function readRememberedWorkerProfile() {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${WORKER_REMEMBER_COOKIE}=`));
  if (!cookie) return null;

  try {
    const payload = JSON.parse(decodeURIComponent(cookie.split("=").slice(1).join("=")));
    return normalizeRememberedWorkerProfile(payload);
  } catch {
    clearRememberedWorkerProfile();
    return null;
  }
}

function writeRememberedWorkerProfile(form) {
  if (typeof document === "undefined") return;
  const profile = normalizeRememberedWorkerProfile(form);
  const attributes = [
    `${WORKER_REMEMBER_COOKIE}=${encodeURIComponent(JSON.stringify(profile))}`,
    `Max-Age=${WORKER_REMEMBER_COOKIE_MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
  ];
  if (window.location.protocol === "https:") attributes.push("Secure");
  document.cookie = attributes.join("; ");
}

function clearRememberedWorkerProfile() {
  if (typeof document === "undefined") return;
  document.cookie = `${WORKER_REMEMBER_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function readRememberedWorkerGroup() {
  if (typeof window === "undefined") return { signIns: [] };
  try {
    const payload = JSON.parse(
      window.localStorage.getItem(WORKER_REMEMBER_GROUP_STORAGE) || "{}",
    );
    return normalizeRememberedWorkerGroup(payload);
  } catch {
    clearRememberedWorkerGroup();
    return { signIns: [] };
  }
}

function writeRememberedWorkerGroup(signIns) {
  if (typeof window === "undefined") return;
  const rememberedGroup = normalizeRememberedWorkerGroup({
    signIns,
    date: signIns[0]?.sign_in_date_vancouver || todayInVancouver(),
  });
  if (!rememberedGroup.signIns.length) {
    clearRememberedWorkerGroup();
    return;
  }
  window.localStorage.setItem(
    WORKER_REMEMBER_GROUP_STORAGE,
    JSON.stringify(rememberedGroup),
  );
}

function clearRememberedWorkerGroup() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WORKER_REMEMBER_GROUP_STORAGE);
}

function normalizeRememberedWorkerGroup(payload) {
  const date = String(payload?.date || "").trim();
  if (date !== todayInVancouver()) return { signIns: [] };

  const signIns = Array.isArray(payload?.signIns) ? payload.signIns : [];
  const seen = new Set();
  return {
    date,
    signIns: signIns
      .map((signIn) => ({
        id: String(signIn?.id || "").trim(),
        name: String(signIn?.name || "").trim(),
        company: String(signIn?.company || "").trim(),
        trade: String(signIn?.trade || "").trim(),
        signed_in_at: String(signIn?.signed_in_at || "").trim(),
        sign_in_date_vancouver: String(signIn?.sign_in_date_vancouver || date).trim(),
      }))
      .filter((signIn) => {
        if (!signIn.id || seen.has(signIn.id)) return false;
        seen.add(signIn.id);
        return true;
      }),
  };
}

function normalizeRememberedWorkerProfile(profile) {
  const companyValue = String(
    profile?.companyName || profile?.company || profile?.trade || "",
  ).trim();
  const rememberedCompany =
    companyValue && !WORKER_COMPANY_OPTIONS.includes(companyValue)
      ? OTHER_COMPANY
      : companyValue;
  const rememberedOtherCompany =
    rememberedCompany === OTHER_COMPANY && companyValue === OTHER_COMPANY
      ? String(profile?.otherCompanyName || "").trim()
      : rememberedCompany === OTHER_COMPANY
        ? String(profile?.otherCompanyName || companyValue || "").trim()
        : "";

  return {
    name: String(profile?.name || "").trim(),
    phone: String(profile?.phone || "").trim(),
    companyName: rememberedCompany,
    otherCompanyName: rememberedOtherCompany,
  };
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

function describeStaffFormSort(sort, dir) {
  const label = STAFF_FORM_SORT_LABELS[sort] || sort;
  return `Sort: ${label} ${dir}`;
}

function formTypeLabel(value) {
  return SAFETY_FORM_TYPES.find((form) => form.id === value)?.label || value;
}

function submissionModeLabel(value) {
  if (value === "submit_file") return "Submit File";
  if (value === "fill_form") return "Fill Form";
  return value;
}

function backupStatusLabel(value) {
  if (value === "backed_up") return "Backed up";
  if (value === "pending") return "Pending";
  if (value === "failed") return "Failed";
  return value || "Unknown";
}

function formatFileSize(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function filterRowsBySearch(rows, search) {
  const query = search.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) =>
    [row.name, row.company, row.trade, row.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query)),
  );
}

function summarizeCompanies(rows) {
  const companies = new Map();
  rows.forEach((row) => {
    const company = String(row.company || row.trade || "Unassigned").trim() || "Unassigned";
    companies.set(company, (companies.get(company) || 0) + 1);
  });

  return [...companies.entries()]
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count || a.company.localeCompare(b.company));
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
