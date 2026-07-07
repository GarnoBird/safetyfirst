import { Suspense, lazy } from "react";

const FormTemplateShareLinkPage = lazy(() => import("./FormLinkRoute.jsx"));
const StaffLoginPage = lazyAuthRoute("StaffLoginPage");
const WorkerLoginPage = lazyAuthRoute("WorkerLoginPage");
const WorkerSignInQr = lazyWorkerRoute("WorkerSignInQr");
const WorkerSignOutQr = lazyWorkerRoute("WorkerSignOutQr");
const WorkerSignInPage = lazyWorkerRoute("WorkerSignInPage");
const WorkerSignOutPage = lazyWorkerRoute("WorkerSignOutPage");
const StaffHomePage = lazyWorkerRoute("StaffHomePage");
const StaffSettingsPage = lazyWorkerRoute("StaffSettingsPage");
const StaffSignInsPage = lazyWorkerRoute("StaffSignInsPage");
const StaffCompanySummaryPage = lazyWorkerRoute("StaffCompanySummaryPage");
const StaffTrendsPage = lazyWorkerRoute("StaffTrendsPage");
const WorkerFormsHomePage = lazyWorkerRoute("WorkerFormsHomePage");
const WorkerFormSubmissionPage = lazyWorkerRoute("WorkerFormSubmissionPage");
const StaffFormsToFillOutPage = lazyWorkerRoute("StaffFormsToFillOutPage");
const WorkerSubmissionHistoryPage = lazyWorkerRoute("WorkerSubmissionHistoryPage");
const WorkerSubmissionDetailPage = lazyWorkerRoute("WorkerSubmissionDetailPage");
const StaffCertificatesPage = lazyWorkerRoute("StaffCertificatesPage");
const StaffAssetsPage = lazyWorkerRoute("StaffAssetsPage");
const StaffAssetDetailPage = lazyWorkerRoute("StaffAssetDetailPage");
const StaffWorkersPage = lazyWorkerRoute("StaffWorkersPage");
const StaffUsersPage = lazyWorkerRoute("StaffUsersPage");
const StaffBackupsPage = lazyWorkerRoute("StaffBackupsPage");
const StaffHealthPage = lazyWorkerRoute("StaffHealthPage");
const StaffAuditPage = lazyWorkerRoute("StaffAuditPage");
const StaffFormSubmissionsPage = lazyWorkerRoute("StaffFormSubmissionsPage");
const StaffSubmissionViewerPage = lazyWorkerRoute("StaffSubmissionViewerPage");
const StaffFormTemplatesPage = lazyWorkerRoute("StaffFormTemplatesPage");
const StaffActionItemsPage = lazyWorkerRoute("StaffActionItemsPage");

function lazyWorkerRoute(exportName) {
  return lazy(() =>
    import("./WorkerSignIn.jsx").then((module) => ({
      default: module[exportName],
    })),
  );
}

function lazyAuthRoute(exportName) {
  return lazy(() =>
    import("./AuthRoutes.jsx").then((module) => ({
      default: module[exportName],
    })),
  );
}

export default function AppRoutes({ navigateTo, routePath }) {
  return (
    <Suspense fallback={<RouteLoadingScreen />}>
      {renderRoute({ navigateTo, routePath })}
    </Suspense>
  );
}

function renderRoute({ navigateTo, routePath }) {
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

  return null;
}

function RouteLoadingScreen() {
  return (
    <main className="public-page">
      <p className="empty-state">Loading...</p>
    </main>
  );
}
