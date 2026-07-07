import { Suspense, lazy, useEffect, useMemo, useState } from "react";

const FormSubmissionExperience = lazy(() =>
  import("./WorkerSignIn.jsx").then((module) => ({
    default: module.FormSubmissionExperience,
  })),
);

export default function FormLinkRoute({ navigateTo, routePath }) {
  const linkIdentifier = routePath.split("/").filter(Boolean)[1] || "";
  const returnTo = useMemo(() => currentRouteReturnPath(routePath), [routePath]);
  const [linkPayload, setLinkPayload] = useState(null);
  const [linkLoading, setLinkLoading] = useState(true);
  const [linkError, setLinkError] = useState("");
  const [auth, setAuth] = useState({ worker: null, staff: null });
  const [authLoading, setAuthLoading] = useState(true);
  const [submitterKind, setSubmitterKind] = useState("");

  useEffect(() => {
    let active = true;
    setLinkLoading(true);
    setLinkError("");
    fetch(`/api/form-links/${linkIdentifier}`, { credentials: "include" })
      .then(readApiJson)
      .then((payload) => {
        if (active) setLinkPayload(payload);
      })
      .catch((error) => {
        if (active) setLinkError(error.message);
      })
      .finally(() => {
        if (active) setLinkLoading(false);
      });
    return () => {
      active = false;
    };
  }, [linkIdentifier]);

  useEffect(() => {
    let active = true;
    setAuthLoading(true);
    fetch(`/api/form-links/${linkIdentifier}/session`, { credentials: "include" })
      .then(readApiJson)
      .then((payload) => {
        if (!active) return;
        const nextAuth = {
          worker: payload.worker || null,
          staff: payload.staff || null,
        };
        setAuth(nextAuth);
        if (nextAuth.worker && !nextAuth.staff) setSubmitterKind("worker");
        if (nextAuth.staff && !nextAuth.worker) setSubmitterKind("staff");
      })
      .catch(() => {
        if (active) setAuth({ worker: null, staff: null });
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, [linkIdentifier]);

  const template = linkPayload?.template || null;
  const workerSubmitter = auth.worker || null;
  const staffSubmitter = useMemo(() => staffFormSubmitter(auth.staff), [auth.staff]);
  const selectedSubmitter = submitterKind === "staff" ? staffSubmitter : workerSubmitter;

  if (linkLoading) return <WorkerFormLoadingScreen />;

  if (linkError || !template) {
    return (
      <main className="public-page form-platform-page">
        <section className="form-platform-shell form-link-auth-panel">
          <div className="brand-mark">APPIA</div>
          <h1>Form link unavailable</h1>
          <p>{linkError || "This QR link is not available."}</p>
        </section>
      </main>
    );
  }

  if (authLoading) return <WorkerFormLoadingScreen />;

  if (!auth.worker && !auth.staff) {
    return (
      <main className="public-page form-platform-page">
        <section className="form-platform-shell form-link-auth-panel">
          <div className="brand-mark">APPIA</div>
          <h1>{template.label}</h1>
          <p>Sign in to fill and submit this form.</p>
          <div className="form-link-auth-actions">
            <button type="button" onClick={() => navigateTo(loginPathWithReturn("/worker-login", returnTo))}>
              Company worker
            </button>
            <button className="primary-button" type="button" onClick={() => navigateTo(loginPathWithReturn("/staff-login", returnTo))}>
              Appia staff
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (auth.worker && auth.staff && !submitterKind) {
    return (
      <main className="public-page form-platform-page">
        <section className="form-platform-shell form-link-auth-panel">
          <div className="brand-mark">APPIA</div>
          <h1>{template.label}</h1>
          <p>Choose how to submit this form.</p>
          <div className="form-link-auth-actions">
            <button type="button" onClick={() => setSubmitterKind("worker")}>
              {auth.worker.name} / {auth.worker.company}
            </button>
            <button className="primary-button" type="button" onClick={() => setSubmitterKind("staff")}>
              {staffSubmitter.name} / {staffSubmitter.company}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!selectedSubmitter) return <WorkerFormLoadingScreen />;

  const submitterParam = encodeURIComponent(submitterKind);
  return (
    <Suspense fallback={<WorkerFormLoadingScreen />}>
      <FormSubmissionExperience
        allowOfflineQueue={submitterKind === "worker"}
        formType={template.form_type}
        navigateTo={navigateTo}
        redirectUnknownForm={false}
        submissionEndpoint={`/api/form-links/${linkIdentifier}/submissions?submitter=${submitterParam}`}
        submitter={selectedSubmitter}
        submitterKind={submitterKind}
        templateEndpoint={`/api/form-links/${linkIdentifier}/published?submitter=${submitterParam}`}
        uploadEndpoint={`/api/form-links/${linkIdentifier}/submissions/file-upload-url?submitter=${submitterParam}`}
      />
    </Suspense>
  );
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

function currentRouteReturnPath(routePath) {
  if (typeof window === "undefined") return routePath || "/";
  return safeAppReturnPath(`${routePath || window.location.pathname}${window.location.search || ""}`, routePath || "/");
}

function loginPathWithReturn(path, returnTo) {
  const params = new URLSearchParams({ returnTo: safeAppReturnPath(returnTo, "/forms") });
  return `${path}?${params.toString()}`;
}

function safeAppReturnPath(value, fallback) {
  const path = String(value || "").trim();
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/api/") || path.includes("://")) {
    return fallback;
  }
  return path;
}

function staffFormSubmitter(staff) {
  if (!staff) return null;
  const name = staffSubmitterName(staff);
  return {
    id: `staff-${staff.id}`,
    name,
    phone: staff.phone || "",
    username: staff.username || staff.email || "staff",
    user_name: staff.username || staff.email || "staff",
    company: staffSubmitterCompany(staff, name),
  };
}

function staffSubmitterName(staff) {
  return String(staff?.display_name || staff?.username || staff?.email || "Staff").trim();
}

function staffSubmitterCompany(staff, name = staffSubmitterName(staff)) {
  return `Appia ${staffSubmitterRoleLabel(staff?.role)} (${name})`;
}

function staffSubmitterRoleLabel(role) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Staff";
}

async function readApiJson(response) {
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw new Error("The server returned an invalid response.");
      }
      if (response.status === 413) {
        throw new Error("The request was too large for the server to accept.");
      }
      throw new Error(text.trim() || response.statusText || "The server could not complete the request.");
    }
  }
  if (!response.ok) {
    throw new Error(payload.error || response.statusText || "The server could not complete the request.");
  }
  return payload;
}
