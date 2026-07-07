export async function qrCodeToDataUrl(value, options) {
  const module = await import("qrcode");
  const qrCode = module.default || module;
  return qrCode.toDataURL(value, options);
}

export async function renderHtmlToCanvas(element, options) {
  const module = await import("html2canvas");
  const html2canvas = module.default || module;
  return html2canvas(element, options);
}

export async function loadSubmissionPrintRenderer() {
  return await import("./submissionPrintRenderer.js");
}

export async function loadSubmittedFormPhrasebook() {
  return await import("./submittedFormPhrasebook.js");
}
