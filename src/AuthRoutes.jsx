import { useEffect, useMemo, useState } from "react";

const WORKER_SESSION_CACHE_KEY = "sf_worker_session_cache_v1";

export function StaffLoginPage({ navigateTo }) {
  const [username, setUsername] = useState("lbird");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const returnTo = useMemo(() => readLoginReturnPath("/staff/home"), []);

  const submitLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = await readApiJson(
        await fetch("/api/auth/login", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username, password }),
        }),
      );
      if (payload.staff) navigateTo(returnTo);
      else throw new Error("Login failed.");
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

export function WorkerLoginPage({ navigateTo }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const returnTo = useMemo(() => readLoginReturnPath("/forms"), []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/worker-me", { credentials: "include" })
      .then(readApiJson)
      .then((payload) => {
        if (payload.worker) writeCachedWorkerSession(payload.worker);
        if (active && payload.worker) navigateTo(returnTo);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [navigateTo, returnTo]);

  const submitLogin = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const payload = await readApiJson(
        await fetch("/api/auth/worker-login", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ identifier, password, rememberMe }),
        }),
      );
      writeCachedWorkerSession(payload.worker);
      navigateTo(returnTo);
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

function readLoginReturnPath(fallback) {
  if (typeof window === "undefined") return fallback;
  return safeAppReturnPath(new URLSearchParams(window.location.search).get("returnTo"), fallback);
}

function safeAppReturnPath(value, fallback) {
  const path = String(value || "").trim();
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/api/") || path.includes("://")) {
    return fallback;
  }
  return path;
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
      throw new Error(text.trim() || response.statusText || "The server could not complete the request.");
    }
  }
  if (!response.ok) {
    throw new Error(payload.error || response.statusText || "The server could not complete the request.");
  }
  return payload;
}

function writeCachedWorkerSession(worker) {
  if (!worker?.id || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      WORKER_SESSION_CACHE_KEY,
      JSON.stringify({
        worker,
        cachedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Login still succeeds if the browser refuses local storage.
  }
}
