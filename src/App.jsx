import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { qrCodeToDataUrl } from "./lazyClientModules.js";

const AppRoutes = lazy(() => import("./AppRoutes.jsx"));

export default function App() {
  const routePath = useRoutePath();

  if (routePath === "/") {
    return <PublicLandingPage navigateTo={navigateTo} />;
  }

  if (isAppRoutePath(routePath)) {
    return (
      <Suspense fallback={<AppRouteLoadingScreen />}>
        <AppRoutes navigateTo={navigateTo} routePath={routePath} />
      </Suspense>
    );
  }

  return <RedirectToHome />;
}

function AppRouteLoadingScreen() {
  return (
    <main className="public-page">
      <p className="empty-state">Loading...</p>
    </main>
  );
}

function PublicLandingPage({ navigateTo }) {
  return (
    <main className="public-landing-page">
      <nav className="public-landing-nav" aria-label="Public links">
        <button type="button" onClick={() => navigateTo("/worker-login")}>
          Company Login
        </button>
        <button type="button" onClick={() => navigateTo("/staff-login")}>
          Staff
        </button>
      </nav>
      <section className="public-landing-grid" aria-label="Worker QR links">
        <LandingQrCard
          label="Worker Sign-In"
          path="/worker-sign-in"
          navigateTo={navigateTo}
        />
        <LandingQrCard
          label="Worker Sign-Out"
          path="/worker-sign-out"
          navigateTo={navigateTo}
        />
      </section>
    </main>
  );
}

function LandingQrCard({ label, navigateTo, path }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const formUrl = useMemo(() => {
    if (typeof window === "undefined") return path;
    return new URL(path, window.location.origin).href;
  }, [path]);

  useEffect(() => {
    let cancelled = false;
    qrCodeToDataUrl(formUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
      width: 300,
      color: {
        dark: "#111111",
        light: "#ffffff",
      },
    }).then((dataUrl) => {
      if (!cancelled) setQrDataUrl(dataUrl);
    }).catch(() => {
      if (!cancelled) setQrDataUrl("");
    });
    return () => {
      cancelled = true;
    };
  }, [formUrl]);

  return (
    <article className="public-landing-card">
      <h1>{label}</h1>
      {qrDataUrl ? <img alt={`${label} QR code`} src={qrDataUrl} /> : <div className="public-qr-placeholder" />}
      <button type="button" onClick={() => navigateTo(path)}>
        Open form
      </button>
    </article>
  );
}

function RedirectToHome() {
  useEffect(() => {
    replaceRoute("/");
  }, []);

  return <PublicLandingPage navigateTo={navigateTo} />;
}

function isAppRoutePath(routePath) {
  return (
    [
      "/worker-sign-in-qr",
      "/worker-sign-in",
      "/worker-login",
      "/forms",
      "/my-submissions",
      "/worker-sign-out-qr",
      "/worker-sign-out",
      "/staff-login",
      "/staff/home",
      "/staff/sign-ins",
      "/staff/sign-ins/company",
      "/staff/forms",
      "/staff/forms-to-fill-out",
      "/staff/form-templates",
      "/staff/action-items",
      "/staff/certificates",
      "/staff/assets",
      "/staff/workers",
      "/staff/users",
      "/staff/backups",
      "/staff/health",
      "/staff/audit",
      "/staff/trends",
      "/staff/settings",
    ].includes(routePath) ||
    routePath.startsWith("/forms/") ||
    routePath.startsWith("/form-links/") ||
    routePath.startsWith("/my-submissions/") ||
    routePath.startsWith("/staff/forms/") ||
    routePath.startsWith("/staff/assets/")
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

function replaceRoute(path) {
  const prefix =
    window.location.pathname.startsWith("/safetyfirst") ? "/safetyfirst" : "";
  window.history.replaceState({}, "", `${prefix}${path}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
