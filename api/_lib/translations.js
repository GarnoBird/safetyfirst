import { getRequiredEnv } from "./http.js";
import { getSubmissionById } from "./form-submissions.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_TRANSLATION_MODEL = "gpt-5.4-mini";
const MAX_TRANSLATION_TEXTS = 360;
const MAX_TRANSLATION_TEXT_LENGTH = 1200;
const MAX_TRANSLATION_TOTAL_LENGTH = 42000;

const TRANSLATION_LANGUAGES = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "en", label: "English" },
  { code: "ru", label: "Russian" },
  { code: "ko", label: "Korean" },
  { code: "tl", label: "Tagalog" },
  { code: "hi", label: "Hindi" },
];

export async function translateSubmissionTexts(staff, submissionId, body = {}) {
  const submission = await getSubmissionById(submissionId, { includeDeleted: true });
  const language = cleanTranslationLanguage(body.targetLanguage || body.language || body.languageCode);
  const texts = cleanTranslationTexts(body.texts);
  if (!texts.length) {
    return {
      language: language.code,
      languageLabel: language.label,
      model: null,
      submissionId: submission.id,
      translatedCount: 0,
      translations: [],
    };
  }

  assertTranslationConfig();
  const model = process.env.OPENAI_TRANSLATION_MODEL || DEFAULT_TRANSLATION_MODEL;
  const translations = await requestOpenAITranslations({
    language,
    model,
    submission,
    texts,
  });

  return {
    language: language.code,
    languageLabel: language.label,
    model,
    submissionId: submission.id,
    translatedCount: translations.length,
    translations,
  };
}

export function translationLanguageOptions() {
  return TRANSLATION_LANGUAGES.map((language) => ({ ...language }));
}

function cleanTranslationLanguage(value) {
  const raw = String(value || "").trim().toLowerCase();
  const language = TRANSLATION_LANGUAGES.find(
    (item) => item.code === raw || item.label.toLowerCase() === raw,
  );
  if (!language) throwBadRequest("Choose a supported translation language.");
  return language;
}

function cleanTranslationTexts(value) {
  if (!Array.isArray(value)) throwBadRequest("Translation text is required.");
  const seen = new Set();
  const texts = [];
  let totalLength = 0;

  value.forEach((item) => {
    const text = String(item || "").replace(/\s+/g, " ").trim();
    if (!text || seen.has(text)) return;
    if (text.length > MAX_TRANSLATION_TEXT_LENGTH) {
      throwBadRequest("One or more form text blocks are too long to translate.");
    }
    totalLength += text.length;
    if (totalLength > MAX_TRANSLATION_TOTAL_LENGTH) {
      throwBadRequest("This form has too much text to translate at once.");
    }
    seen.add(text);
    texts.push(text);
  });

  if (texts.length > MAX_TRANSLATION_TEXTS) {
    throwBadRequest("This form has too many text blocks to translate at once.");
  }
  return texts;
}

function assertTranslationConfig() {
  if (process.env.OPENAI_API_KEY) return;
  const error = new Error("AI translation is not configured yet. Missing: OPENAI_API_KEY.");
  error.statusCode = 503;
  error.exposeMessage = true;
  throw error;
}

async function requestOpenAITranslations({ language, model, submission, texts }) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${getRequiredEnv("OPENAI_API_KEY")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            "You translate submitted construction safety forms.",
            "Return only JSON that matches the requested schema.",
            "Translate user-facing text into the target language.",
            "Preserve names, company names, addresses, phone numbers, dates, IDs, file names, units, standards, acronyms, and regulatory references unless a common target-language equivalent is obvious.",
            "Do not add commentary, legal interpretation, or safety advice.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            formType: submission.form_type,
            targetLanguage: language.label,
            targetLanguageCode: language.code,
            texts,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "submitted_form_translation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              translations: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    source: { type: "string" },
                    text: { type: "string" },
                  },
                  required: ["source", "text"],
                },
              },
            },
            required: ["translations"],
          },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw createTranslationProviderError(payload, response.status);

  const outputText = extractResponseOutputText(payload);
  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    const parseError = new Error("AI translation returned an unreadable response.");
    parseError.statusCode = 502;
    parseError.exposeMessage = true;
    parseError.cause = error;
    throw parseError;
  }

  return normalizeProviderTranslations(parsed?.translations, texts);
}

function normalizeProviderTranslations(value, sourceTexts) {
  if (!Array.isArray(value)) return [];
  const sourceSet = new Set(sourceTexts);
  const translations = [];
  const seen = new Set();

  value.forEach((item) => {
    const source = String(item?.source || "").replace(/\s+/g, " ").trim();
    const text = String(item?.text || "").trim();
    if (!source || !text || !sourceSet.has(source) || seen.has(source)) return;
    seen.add(source);
    translations.push({ source, text: text.slice(0, MAX_TRANSLATION_TEXT_LENGTH * 2) });
  });

  return translations;
}

function extractResponseOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload?.output) ? payload.output : [];
  return output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .map((content) => content?.text || "")
    .join("")
    .trim();
}

function createTranslationProviderError(payload, statusCode) {
  const providerMessage = String(payload?.error?.message || payload?.message || "").trim();
  const message = providerMessage
    ? `AI translation failed. Provider said: ${providerMessage.slice(0, 280)}`
    : "AI translation failed.";
  const error = new Error(message);
  error.statusCode = statusCode >= 500 ? 502 : 400;
  error.exposeMessage = true;
  return error;
}

function throwBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.exposeMessage = true;
  throw error;
}
