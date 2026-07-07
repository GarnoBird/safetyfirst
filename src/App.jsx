import { useEffect, useMemo, useState } from "react";
import { qrCodeToDataUrl } from "./lazyClientModules.js";
import {
  StaffHomePage,
  StaffCompanySummaryPage,
  StaffAuditPage,
  StaffBackupsPage,
  StaffCertificatesPage,
  StaffFormSubmissionsPage,
  StaffFormsToFillOutPage,
  StaffSubmissionViewerPage,
  StaffFormTemplatesPage,
  StaffHealthPage,
  StaffActionItemsPage,
  StaffAssetsPage,
  StaffAssetDetailPage,
  StaffLoginPage,
  StaffSettingsPage,
  StaffSignInsPage,
  StaffTrendsPage,
  StaffUsersPage,
  StaffWorkersPage,
  FormTemplateShareLinkPage,
  WorkerFormSubmissionPage,
  WorkerFormsHomePage,
  WorkerLoginPage,
  WorkerSignInPage,
  WorkerSignInQr,
  WorkerSubmissionDetailPage,
  WorkerSubmissionHistoryPage,
  WorkerSignOutPage,
  WorkerSignOutQr,
} from "./WorkerSignIn.jsx";

export default function App() {
  const routePath = useRoutePath();

  if (routePath === "/") {
    return <PublicLandingPage navigateTo={navigateTo} />;
  }

  if (routePath === "/worker-sign-in-qr") {
    return <WorkerSignInQr navigateTo={navigateTo} />;
  }

  if (routePath === "/worker-sign-in") {
    return <WorkerSignInPage />;
  }

  if (routePath === "/worker-login") {
    return <WorkerLoginPage navigateTo={navigateTo} />;
  }

  if (routePath === "/forms") {
    return <WorkerFormsHomePage navigateTo={navigateTo} />;
  }

  if (routePath.startsWith("/forms/")) {
    return <WorkerFormSubmissionPage routePath={routePath} navigateTo={navigateTo} />;
  }

  if (routePath.startsWith("/form-links/")) {
    return <FormTemplateShareLinkPage routePath={routePath} navigateTo={navigateTo} />;
  }

  if (routePath === "/my-submissions") {
    return <WorkerSubmissionHistoryPage navigateTo={navigateTo} />;
  }

  if (routePath.startsWith("/my-submissions/")) {
    return <WorkerSubmissionDetailPage routePath={routePath} navigateTo={navigateTo} />;
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

  if (routePath === "/staff/sign-ins/company") {
    return <StaffCompanySummaryPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/forms") {
    return <StaffFormSubmissionsPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/forms-to-fill-out") {
    return <StaffFormsToFillOutPage navigateTo={navigateTo} />;
  }

  if (routePath.startsWith("/staff/forms/")) {
    return <StaffSubmissionViewerPage routePath={routePath} navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/form-templates") {
    return <StaffFormTemplatesPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/action-items") {
    return <StaffActionItemsPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/certificates") {
    return <StaffCertificatesPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/assets") {
    return <StaffAssetsPage navigateTo={navigateTo} />;
  }

  if (routePath.startsWith("/staff/assets/")) {
    const assetId = decodeURIComponent(routePath.split("/").filter(Boolean)[2] || "");
    return <StaffAssetDetailPage assetId={assetId} navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/workers") {
    return <StaffWorkersPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/users") {
    return <StaffUsersPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/backups") {
    return <StaffBackupsPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/health") {
    return <StaffHealthPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/audit") {
    return <StaffAuditPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/trends") {
    return <StaffTrendsPage navigateTo={navigateTo} />;
  }

  if (routePath === "/staff/settings") {
    return <StaffSettingsPage navigateTo={navigateTo} />;
  }

  return <RedirectToHome />;
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
