import fs from "node:fs";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import {
  buildSubmittedFormPrintHtml,
  submittedFormPdfFileName,
} from "../../src/submissionPrintRenderer.js";

const LOCAL_CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

export async function renderSubmittedFormPdf(submission) {
  const html = buildSubmittedFormPrintHtml(submission, { includePrintButton: false });
  const browser = await launchPdfBrowser();
  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.emulateMediaType("print");
    const buffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: true,
      margin: {
        top: "0.45in",
        right: "0.45in",
        bottom: "0.56in",
        left: "0.45in",
      },
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#657973;padding:0 0.45in;text-align:right;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
    });
    return {
      buffer: Buffer.from(buffer),
      fileName: submittedFormPdfFileName(submission),
    };
  } finally {
    await browser.close();
  }
}

async function launchPdfBrowser() {
  const executablePath = await findChromiumExecutablePath();
  return await puppeteer.launch({
    args: [
      ...chromium.args,
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-sandbox",
    ],
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });
}

async function findChromiumExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const local = LOCAL_CHROME_PATHS.find((path) => fs.existsSync(path));
  if (local) return local;
  const serverlessPath = await chromium.executablePath();
  if (serverlessPath) return serverlessPath;
  throw new Error("Chromium is not available for PDF generation.");
}
