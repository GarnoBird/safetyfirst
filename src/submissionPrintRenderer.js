const VANCOUVER_TIME_ZONE = "America/Vancouver";
const TEMPLATE_FIELD_TYPES = new Set([
  "short_text",
  "long_text",
  "number",
  "date",
  "time",
  "yes_no",
  "boolean",
  "toggle",
  "media_upload",
  "asset_picker",
  "dropdown",
  "multi_select",
  "checkbox",
  "signature",
  "instructions",
  "toolbox_meeting_info",
  "toolbox_topics",
  "toolbox_incident_review",
  "toolbox_safety_concerns",
  "toolbox_attendance",
  "toolbox_final_confirmation",
  "site_deficiencies",
  "action_item_rows",
]);
const TEMPLATE_OPTION_FIELD_TYPES = new Set(["dropdown", "multi_select"]);
const TEMPLATE_SPECIAL_BLOCK_TYPES = new Set([
  "toolbox_meeting_info",
  "toolbox_topics",
  "toolbox_incident_review",
  "toolbox_safety_concerns",
  "toolbox_attendance",
  "toolbox_final_confirmation",
  "site_deficiencies",
  "action_item_rows",
]);
const ACTION_ITEM_ROW_BLOCK_TYPES = new Set(["site_deficiencies", "action_item_rows"]);
const SIGNATURE_DATA_URL_PATTERN = /^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/;
const MAX_SIGNATURE_DATA_URL_LENGTH = 750000;

export function submittedFormPdfFileName(row) {
  return submittedFormFileName(row, "pdf");
}

export function submittedFormPrintTitle(row) {
  const data = row?.form_data || {};
  if (data?.kind === "template_submission_v1") {
    const schema = normalizeClientTemplateSchema(data.schemaSnapshot || row?.form_schema_snapshot);
    return schema.title || formTypeLabel(row?.form_type);
  }
  return formTypeLabel(row?.form_type);
}

export function buildSubmittedFormPrintHtml(row, options = {}) {
  const submission = row && typeof row === "object" ? row : {};
  const title = submittedFormPrintTitle(submission);
  const bodyHtml = isFileUploadSubmission(submission)
    ? filePackageHtml(submission)
    : digitalSubmissionHtml(submission);
  const signoffHtml = staffSignoffSectionHtml(submission.staff_signoffs);
  const printButton = options.includePrintButton === false
    ? ""
    : `<div class="print-actions" data-print-ignore><button type="button" onclick="window.print()">Print</button></div>`;
  const autoPrintScript = options.autoPrint
    ? "<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>"
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(documentTitle(submission))}</title>
    <style>${printDocumentCss()}</style>
  </head>
  <body>
    ${printButton}
    <main class="print-document" data-submission-id="${escapeHtml(submission.id || "")}">
      ${documentHeaderHtml(submission, title)}
      ${bodyHtml}
      ${signoffHtml}
      <footer class="document-footer">
        <span>Submission ${escapeHtml(submission.id || "-")}</span>
        <span>${escapeHtml(formatDateTime(submission.submitted_at) || "Not submitted")}</span>
      </footer>
    </main>
    ${autoPrintScript}
  </body>
</html>`;
}

function documentHeaderHtml(row, title) {
  const submitted = formatDateTime(row?.submitted_at);
  const metadata = [
    ["Submitted", submitted || "-"],
    ["Submitted By", row?.worker_name || "-"],
    ["Company", row?.company || "-"],
    ["Phone", row?.worker_phone || "-"],
    ["Username", row?.worker_username || "-"],
    ["Mode", submissionModeLabel(row?.submission_mode)],
    ["Backup", backupStatusLabel(row?.one_drive_backup_status)],
  ];
  if (row?.backup_error) metadata.push(["Backup Error", row.backup_error]);

  return `<header class="document-header">
    <div class="document-title-block">
      <p class="document-brand">APPIA</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="document-subtitle">${escapeHtml([row?.worker_name, row?.company].filter(Boolean).join(" / "))}</p>
    </div>
    <dl class="document-meta">
      ${metadata.map(([label, value]) => definitionHtml(label, value)).join("")}
    </dl>
    ${row?.notes ? `<div class="document-notes"><strong>Notes</strong><span>${escapeHtml(row.notes)}</span></div>` : ""}
  </header>`;
}

function digitalSubmissionHtml(row) {
  const data = row?.form_data || {};
  if (data.kind === "template_submission_v1") return templateSubmissionHtml(row, data);
  if (data.kind === "toolbox_talk_v1") return toolboxTalkSubmissionHtml(row, data);
  if (data.kind === "site_inspection_v1") return siteInspectionSubmissionHtml(row, data);
  return emptySubmissionHtml("No structured form data was saved with this submission.");
}

function templateSubmissionHtml(row, data) {
  const schema = normalizeClientTemplateSchema(data?.schemaSnapshot || row?.form_schema_snapshot);
  const answers = data?.answers || {};
  const actionItemBlocks = data?.actionItemBlocks || {};
  const sections = getVisibleTemplateSections(schema, answers, null, { includeHiddenFields: false });
  if (!sections.length) return emptySubmissionHtml("No visible answers were saved with this submission.");

  return sections.map((section) => {
    const fields = section.fields || [];
    const renderedFields = fields.map((field) => templateFieldHtml(field, answers[field.id], actionItemBlocks?.[field.id])).join("");
    return `<section class="document-section">
      <h2>${escapeHtml(section.title || "Section")}</h2>
      ${section.description ? `<p class="section-description">${escapeHtml(section.description)}</p>` : ""}
      <div class="field-grid">${renderedFields || answerFieldHtml("Details", "-")}</div>
    </section>`;
  }).join("");
}

function templateFieldHtml(field, value, actionItemBlock) {
  if (field.type === "instructions") return instructionFieldHtml(field);
  if (ACTION_ITEM_ROW_BLOCK_TYPES.has(field.type)) return actionItemRowsFieldHtml(field, actionItemBlock);
  if (field.type === "signature") return signatureFieldHtml(field.label, value, widthClass(field));
  if (field.type === "media_upload") {
    const files = normalizeMediaUploadAnswer(value);
    const text = files.map((file) => file.originalFilename || "Attachment").join(", ");
    return answerFieldHtml(field.label, text || "-", widthClass(field));
  }
  if (field.type === "asset_picker") {
    return answerFieldHtml(field.label, assetPickerAnswerText(value) || "-", widthClass(field));
  }
  if (isChoiceField(field)) return choiceFieldHtml(field, value);

  return answerFieldHtml(field.label, templateAnswerText(field, value) || "-", widthClass(field));
}

function instructionFieldHtml(field) {
  const style = normalizeInstructionStyle(field);
  const content = policyTextHtml(field.label || field.helperText || "");
  return `<div class="instruction-block instruction-${escapeHtml(style)} ${widthClass(field)}">
    ${content}
  </div>`;
}

function policyTextHtml(value) {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "";

  const chunks = [];
  let bulletLines = [];
  const flushBullets = () => {
    if (!bulletLines.length) return;
    chunks.push(`<ul>${bulletLines.map((line) => `<li>${escapeHtml(cleanBulletLine(line))}</li>`).join("")}</ul>`);
    bulletLines = [];
  };

  lines.forEach((line) => {
    if (isBulletLine(line)) {
      bulletLines.push(line);
      return;
    }
    flushBullets();
    chunks.push(`<p>${escapeHtml(line)}</p>`);
  });
  flushBullets();
  return chunks.join("");
}

function isBulletLine(value) {
  return /^[\s\u2022*-]+/.test(String(value || ""));
}

function cleanBulletLine(value) {
  return String(value || "").replace(/^[\s\u2022-]+/, "").trim();
}

function actionItemRowsFieldHtml(field, block) {
  const normalized = normalizeActionItemBlockValue(block);
  if (normalized.noItems) {
    return `<div class="action-row-block ${widthClass(field)}"><p>No action items needed.</p></div>`;
  }
  const rows = normalized.rows.filter((row) => Object.values(row || {}).some((value) => String(value || "").trim()));
  if (!rows.length) {
    return `<div class="action-row-block ${widthClass(field)}"><p>No action items recorded.</p></div>`;
  }
  return `<div class="action-row-block ${widthClass(field)}">
    ${rows.map((row, index) => `<article class="action-row">
      <h3>${escapeHtml(row.description || `Action item ${index + 1}`)}</h3>
      <dl>
        ${definitionHtml("Category", row.category || "-")}
        ${definitionHtml("Location", row.location || "-")}
        ${definitionHtml("Priority", priorityLabel(row.priority))}
        ${definitionHtml("Assignee", row.suggestedAssignee || row.assignedTo || "-")}
        ${definitionHtml("Immediate Control", row.immediateControl || "-")}
        ${definitionHtml("Recommended Action", row.recommendedAction || "-")}
        ${definitionHtml("Due", row.dueDate ? formatDateString(row.dueDate) : "-")}
      </dl>
    </article>`).join("")}
  </div>`;
}

function isChoiceField(field) {
  return ["yes_no", "boolean", "toggle", "checkbox", "dropdown", "multi_select"].includes(field?.type);
}

function choiceFieldHtml(field, value) {
  const options = choiceOptions(field);
  const selectedValues = selectedChoiceValues(field, value);
  const className = choiceWidthClass(field);
  if (!options.length) return answerFieldHtml(field.label, templateAnswerText(field, value) || "-", className);

  return `<div class="choice-field ${className}">
    <dt>${escapeHtml(field.label || "Question")}</dt>
    <dd>
      <div class="choice-options">
        ${options.map((option) => {
          const selected = selectedValues.includes(normalizeChoiceValue(option));
          return `<span class="choice-pill ${selected ? "selected" : ""}">${selected ? "✓ " : ""}${escapeHtml(option)}</span>`;
        }).join("")}
      </div>
    </dd>
  </div>`;
}

function choiceWidthClass(field) {
  const label = String(field?.label || "");
  const hasLongOption = choiceOptions(field).some((option) => String(option || "").length > 24);
  return label.length > 58 || hasLongOption ? "span-full" : widthClass(field);
}

function choiceOptions(field) {
  if (field.type === "boolean" || field.type === "toggle" || field.type === "checkbox" || field.type === "yes_no") {
    return ["Yes", "No"];
  }
  return Array.isArray(field.options) ? field.options.filter(Boolean) : [];
}

function selectedChoiceValues(field, value) {
  if (field.type === "boolean" || field.type === "toggle" || field.type === "checkbox") {
    return [value ? "yes" : "no"];
  }
  if (field.type === "yes_no") return [normalizeChoiceValue(value)];
  if (field.type === "multi_select") {
    return Array.isArray(value) ? value.map(normalizeChoiceValue) : [];
  }
  return [normalizeChoiceValue(value)];
}

function normalizeChoiceValue(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "true" || normalized === "on" || normalized === "1") return "yes";
  if (normalized === "false" || normalized === "off" || normalized === "0") return "no";
  return normalized;
}

function answerFieldHtml(label, value, className = "") {
  const displayValue = value === null || value === undefined || value === "" ? "-" : String(value);
  return `<div class="answer-field ${escapeHtml(className)}">
    <dt>${escapeHtml(label || "Answer")}</dt>
    <dd>${escapeHtml(displayValue)}</dd>
  </div>`;
}

function signatureFieldHtml(label, value, className = "") {
  const src = cleanSignatureDataUrl(value);
  if (!src) return answerFieldHtml(label, "-", className);
  const safeLabel = escapeHtml(label || "Signature");
  return `<div class="answer-field signature-field ${escapeHtml(className)}">
    <dt>${safeLabel}</dt>
    <dd><img alt="${safeLabel} signature" src="${src}" /></dd>
  </div>`;
}

function toolboxTalkSubmissionHtml(row, data) {
  const header = data?.header || {};
  const incident = data?.incidentReview || {};
  const topics = Array.isArray(data?.topics?.selected) ? data.topics.selected : [];
  const concerns = Array.isArray(data?.safetyConcerns) ? data.safetyConcerns : [];
  const attendance = Array.isArray(data?.attendance) ? data.attendance : [];
  const confirmation = data?.confirmation || {};

  return [
    simpleSectionHtml("Meeting Info", [
      ["Project", header.projectName],
      ["Address", header.address],
      ["Date", header.date ? formatDateString(header.date) : ""],
      ["Time", header.time],
      ["Presenter", header.presenter],
      ["Supervisor", header.supervisor],
    ]),
    `<section class="document-section">
      <h2>Topics Discussed</h2>
      ${topics.length ? `<table><thead><tr><th>Category</th><th>Topic</th></tr></thead><tbody>${topics.map((topic) => `<tr><td>${escapeHtml(topic.categoryLabel || "-")}</td><td>${escapeHtml(topic.label || "-")}</td></tr>`).join("")}</tbody></table>` : `<p class="empty-copy">No selected topics recorded.</p>`}
      ${data?.topics?.other ? `<p class="text-answer">${escapeHtml(data.topics.other)}</p>` : ""}
    </section>`,
    simpleSectionHtml("Incident / Review", [
      ["First aid count", displayOptionalNumber(incident.firstAidCount)],
      ["Medical aid count", displayOptionalNumber(incident.medicalAidCount)],
      ["Near miss reviewed", nearMissLabel(incident.nearMissReviewed)],
      ["Near miss description", incident.nearMissDescription],
      ["Lessons learned", incident.lessonsLearned],
    ]),
    concernsTableHtml(concerns),
    `<section class="document-section">
      <h2>Attendance</h2>
      ${attendance.length ? `<table><thead><tr><th>#</th><th>Name</th></tr></thead><tbody>${attendance.map((person, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(person.name || "-")}</td></tr>`).join("")}</tbody></table>` : `<p class="empty-copy">No attendees recorded.</p>`}
    </section>`,
    simpleSectionHtml("Final Check", [
      ["Confirmed By", confirmation.name],
      ["Confirmation Date", confirmation.date ? formatDateString(confirmation.date) : ""],
      ["Participation Confirmed", confirmation.confirmed ? "Yes" : "No"],
      ["Additional Comments", data?.additionalComments],
    ]),
  ].join("");
}

function siteInspectionSubmissionHtml(row, data) {
  const header = data?.header || {};
  const observations = data?.observations || {};
  const deficiencies = Array.isArray(data?.deficiencies) ? data.deficiencies : [];
  return [
    simpleSectionHtml("Inspection Info", [
      ["Project", header.project],
      ["Address", header.address],
      ["Area", header.areaInspected],
      ["Date", header.date ? formatDateString(header.date) : ""],
      ["Time", header.time],
      ["Inspector", header.inspector],
      ["Trades", header.tradesPresent],
      ["Reviewer", header.reviewer],
    ]),
    simpleSectionHtml("Observations", [
      ["Positive", observations.positive],
      ["High-risk work", observations.highRiskWork],
      ["Immediate controls", observations.immediateControls],
      ["Follow-up", observations.followUpNotes],
    ]),
    `<section class="document-section">
      <h2>Deficiencies</h2>
      ${data?.noDeficiencies ? `<p class="empty-copy">No deficiencies found during this inspection.</p>` : deficienciesTableHtml(deficiencies)}
    </section>`,
  ].join("");
}

function simpleSectionHtml(title, rows) {
  const definitions = rows
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([label, value]) => answerFieldHtml(label, value || "-"))
    .join("");
  return `<section class="document-section">
    <h2>${escapeHtml(title)}</h2>
    <div class="field-grid">${definitions || answerFieldHtml("Details", "-")}</div>
  </section>`;
}

function concernsTableHtml(rows) {
  if (!rows.length) {
    return `<section class="document-section"><h2>Safety Concerns</h2><p class="empty-copy">No safety concerns recorded.</p></section>`;
  }
  return `<section class="document-section">
    <h2>Safety Concerns</h2>
    <table>
      <thead><tr><th>Concern</th><th>Action to take</th><th>Date taken</th></tr></thead>
      <tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.concern || "-")}</td><td>${escapeHtml(row.actionToTake || "-")}</td><td>${escapeHtml(row.dateTaken ? formatDateString(row.dateTaken) : "-")}</td></tr>`).join("")}</tbody>
    </table>
  </section>`;
}

function deficienciesTableHtml(rows) {
  if (!rows.length) return `<p class="empty-copy">No deficiencies recorded.</p>`;
  return `<table>
    <thead><tr><th>Description</th><th>Location</th><th>Priority</th><th>Corrective action</th><th>Due</th></tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td>${escapeHtml(row.description || "-")}</td>
      <td>${escapeHtml(row.location || "-")}</td>
      <td>${escapeHtml(priorityLabel(row.priority))}</td>
      <td>${escapeHtml(row.recommendedAction || row.immediateControl || "-")}</td>
      <td>${escapeHtml(row.dueDate ? formatDateString(row.dueDate) : "-")}</td>
    </tr>`).join("")}</tbody>
  </table>`;
}

function filePackageHtml(row) {
  const files = Array.isArray(row?.files) ? row.files : Array.isArray(row?.submission_files) ? row.submission_files : [];
  const totalSize = files.reduce((sum, file) => sum + Number(file?.size_bytes || file?.sizeBytes || 0), 0);
  return `<section class="document-section file-package-section">
    <h2>Submitted File Package</h2>
    <div class="file-summary">
      <strong>${files.length ? `${files.length} uploaded ${files.length === 1 ? "file" : "files"}` : "No files uploaded"}</strong>
      <span>${escapeHtml(formatFileSize(totalSize))} total</span>
      <span>${escapeHtml(backupStatusLabel(row?.one_drive_backup_status))}</span>
    </div>
    ${files.length ? `<div class="file-card-grid">${files.map(fileCardHtml).join("")}</div>` : `<p class="empty-copy">No attachment records were saved with this submission.</p>`}
  </section>`;
}

function fileCardHtml(file) {
  const typeLabel = mediaUploadFileTypeLabel(file);
  const fileName = file?.original_filename || file?.originalFilename || "Attachment";
  return `<article class="file-card">
    <div class="file-icon">${escapeHtml(submittedFileTypeInitial(typeLabel))}</div>
    <div>
      <h3>${escapeHtml(fileName)}</h3>
      <p>${escapeHtml(typeLabel)} / ${escapeHtml(formatFileSize(file?.size_bytes || file?.sizeBytes))}</p>
      <small>Backup: ${escapeHtml(backupStatusLabel(file?.backup_status || file?.backupStatus))}</small>
    </div>
    ${file?.one_drive_web_url ? `<a href="${escapeHtml(file.one_drive_web_url)}">Open backup</a>` : ""}
  </article>`;
}

function staffSignoffSectionHtml(value) {
  const signoffs = normalizeStaffSignoffsForDisplay(value);
  if (!signoffs.length) {
    return `<section class="staff-signoff-section">
      <h2>Staff Review</h2>
      <p class="empty-copy">No staff sign-off recorded.</p>
    </section>`;
  }
  return `<section class="staff-signoff-section">
    <h2>Staff Sign-Offs</h2>
    <div class="staff-signoff-grid">
      ${signoffs.map((signoff) => `<article class="staff-signoff-card">
        <div>
          <strong>${escapeHtml(signoff.staff_name)}</strong>
          <span>${escapeHtml(formatDateTime(signoff.signed_at) || "-")}</span>
        </div>
        <img alt="${escapeHtml(signoff.staff_name)} signature" src="${signoff.signature_data_url}" />
        ${signoff.comments ? `<p>${escapeHtml(signoff.comments)}</p>` : ""}
      </article>`).join("")}
    </div>
  </section>`;
}

function emptySubmissionHtml(message) {
  return `<section class="document-section"><h2>Form Details</h2><p class="empty-copy">${escapeHtml(message)}</p></section>`;
}

function definitionHtml(label, value) {
  const displayValue = value === null || value === undefined || value === "" ? "-" : String(value);
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(displayValue)}</dd></div>`;
}

function widthClass(field) {
  const width = String(field?.settings?.layout?.width || field?.settings?.width || "").trim();
  if (width === "full") return "span-full";
  if (width === "third") return "span-third";
  return "span-half";
}

function normalizeClientTemplateSchema(schema) {
  const source = schema && typeof schema === "object" && !Array.isArray(schema) ? schema : {};
  const sections = Array.isArray(source.sections) ? source.sections : [];
  return {
    schemaVersion: 1,
    formType: String(source.formType || source.form_type || "").trim(),
    title: source && Object.prototype.hasOwnProperty.call(source, "title") ? String(source.title || "") : "Form",
    description: String(source.description || ""),
    sections: sections.map((section, sectionIndex) => ({
      id: slugifyTemplateId(section?.id) || `section_${sectionIndex + 1}`,
      title: section && Object.prototype.hasOwnProperty.call(section, "title")
        ? String(section.title || "")
        : `Section ${sectionIndex + 1}`,
      description: String(section?.description || ""),
      settings: cloneSettings(section?.settings),
      fields: (Array.isArray(section?.fields) ? section.fields : [])
        .map((field, fieldIndex) => normalizeTemplateField(field, sectionIndex, fieldIndex))
        .filter(Boolean),
    })),
  };
}

function normalizeTemplateField(field, sectionIndex = 0, fieldIndex = 0) {
  const type = TEMPLATE_FIELD_TYPES.has(field?.type) ? field.type : "short_text";
  const label = Object.prototype.hasOwnProperty.call(field || {}, "label")
    ? String(field.label || "")
    : `Field ${fieldIndex + 1}`;
  const id = slugifyTemplateId(field?.id || label) || `section_${sectionIndex + 1}_field_${fieldIndex + 1}`;
  const options = TEMPLATE_OPTION_FIELD_TYPES.has(type)
    ? (Array.isArray(field?.options) ? field.options : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];
  return {
    id,
    type,
    label,
    helperText: String(field?.helperText || field?.helper_text || ""),
    required: TEMPLATE_SPECIAL_BLOCK_TYPES.has(type) || type === "instructions" ? false : Boolean(field?.required),
    default: String(field?.default || ""),
    options,
    settings: cloneSettings(field?.settings),
  };
}

function getVisibleTemplateSections(schema, answers = {}, worker = null, { includeHiddenFields = false } = {}) {
  const normalized = normalizeClientTemplateSchema(schema);
  return (normalized.sections || [])
    .filter((section) => templateBlockConditionIsVisible(section, normalized, answers, worker))
    .map((section) => ({
      ...section,
      fields: (section.fields || []).filter((field) =>
        templateBlockConditionIsVisible(field, normalized, answers, worker) &&
        (includeHiddenFields || !templateFieldIsHidden(field)),
      ),
    }))
    .filter((section) => section.fields.length);
}

function templateBlockConditionIsVisible(block, schema, answers = {}, worker = null) {
  const visibility = normalizeTemplateVisibilitySettings(block?.settings);
  if (!visibility.enabled) return true;
  const sourceField = collectTemplateFields(schema).find((field) => field.id === visibility.sourceFieldId);
  if (!sourceField) return true;
  const rawValue = answers?.[sourceField.id] ?? templateFieldDefaultValue(sourceField, worker, schema);
  const expected = normalizeTemplateVisibilityValueForField(sourceField, visibility.value);
  if (Array.isArray(rawValue)) {
    const values = rawValue.map((item) => String(item));
    const contains = values.includes(String(expected));
    return visibility.operator === "not_contains" || visibility.operator === "not_equals" ? !contains : contains;
  }
  const actual = normalizeTemplateVisibilityValueForField(sourceField, rawValue);
  const matches = actual === expected;
  return visibility.operator === "not_equals" || visibility.operator === "not_contains" ? !matches : matches;
}

function normalizeTemplateVisibilitySettings(settings = {}) {
  const raw = settings?.visibility && typeof settings.visibility === "object" && !Array.isArray(settings.visibility)
    ? settings.visibility
    : {};
  const sourceFieldId = slugifyTemplateId(raw.sourceFieldId || raw.fieldId || raw.source || "");
  const operators = new Set(["equals", "not_equals", "contains", "not_contains"]);
  let value = raw.value;
  if (Array.isArray(value)) value = value[0] ?? "";
  if (value === null || value === undefined) value = "";
  return {
    enabled: Boolean(raw.enabled && sourceFieldId),
    sourceFieldId,
    operator: operators.has(raw.operator) ? raw.operator : "equals",
    value: typeof value === "boolean" ? value : String(value),
  };
}

function normalizeTemplateVisibilityValueForField(field, value) {
  if (["boolean", "toggle", "checkbox"].includes(field?.type)) {
    if (value === true || value === false) return value;
    const text = String(value || "").trim().toLowerCase();
    return ["true", "yes", "1", "on"].includes(text);
  }
  return String(value ?? "");
}

function templateFieldDefaultValue(field, worker, schema) {
  const workerDefault = templateWorkerDefaultValue(field.default, worker);
  if (workerDefault) return workerDefault;
  const staticDefault = normalizeTemplateStaticDefaultForField(field, templateStaticDefaultValue(field));
  if (staticDefault !== "") return staticDefault;
  if (field.type === "multi_select" || field.type === "media_upload") return [];
  if (field.type === "asset_picker") return null;
  if (["boolean", "toggle", "checkbox"].includes(field.type)) return false;
  return "";
}

function templateWorkerDefaultValue(defaultKey, worker) {
  if (defaultKey === "worker_name") return worker?.name || "";
  if (defaultKey === "worker_phone") return worker?.phone || "";
  if (defaultKey === "worker_username") return worker?.username || worker?.user_name || "";
  if (defaultKey === "worker_company") return worker?.company || "";
  if (defaultKey === "today") return todayInVancouver();
  return "";
}

function templateStaticDefaultValue(field) {
  const value = field?.settings?.defaultValue;
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizeTemplateStaticDefaultForField(field, value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (field?.type === "yes_no") {
    const normalized = text.toLowerCase();
    return ["yes", "no"].includes(normalized) ? normalized : "";
  }
  if (field?.type === "dropdown") return (field.options || []).includes(text) ? text : "";
  return text;
}

function templateFieldIsHidden(field) {
  return field?.settings?.hidden === true;
}

function collectTemplateFields(schema) {
  return (schema?.sections || []).flatMap((section) => section.fields || []);
}

function normalizeMediaUploadAnswer(value) {
  const source = Array.isArray(value) ? value : Array.isArray(value?.files) ? value.files : [];
  return source.map(cleanMediaUploadAnswerFile).filter(Boolean);
}

function cleanMediaUploadAnswerFile(file) {
  if (!file || typeof file !== "object" || Array.isArray(file)) return null;
  const originalFilename = String(file.originalFilename || file.original_filename || file.name || "").trim();
  const storagePath = String(file.storagePath || file.storage_path || "").trim();
  const mimeType = String(file.mimeType || file.mime_type || file.type || "").trim().toLowerCase();
  const sizeBytes = Number(file.sizeBytes || file.size_bytes || file.size || 0);
  if (!originalFilename && !storagePath) return null;
  return {
    storagePath,
    originalFilename: originalFilename || "Attachment",
    mimeType: mimeType || "application/octet-stream",
    sizeBytes: Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : 0,
  };
}

function normalizeActionItemBlockValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { noItems: false, rows: [] };
  return {
    noItems: value.noItems === true || value.no_items === true,
    rows: Array.isArray(value.rows) ? value.rows : [],
  };
}

function templateAnswerText(field, value) {
  if (field.type === "boolean" || field.type === "toggle" || field.type === "checkbox") return value ? "Yes" : "No";
  if (field.type === "asset_picker") return assetPickerAnswerText(value);
  if (field.type === "yes_no") {
    if (String(value).toLowerCase() === "yes") return "Yes";
    if (String(value).toLowerCase() === "no") return "No";
    return "";
  }
  if (field.type === "multi_select") return Array.isArray(value) ? value.filter(Boolean).join(", ") : "";
  if (field.type === "date" && value) return formatDateString(String(value));
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function normalizeAssetPickerAnswer(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const assetId = String(source.assetId || source.asset_id || source.id || "").trim();
  const name = String(source.name || source.assetName || source.asset_name || "").trim();
  const assetType = String(source.assetType || source.asset_type || source.type || "").trim();
  const serialNumber = String(source.serialNumber || source.serial_number || source.vin || source.serial || "").trim();
  const currentSite = String(source.currentSite || source.current_site || source.site || "").trim();
  const status = String(source.status || "").trim();
  const model = String(source.model || "").trim();
  const year = String(source.year || "").trim();
  const rawHours = source.hours === "" || source.hours === null || source.hours === undefined ? "" : Number(source.hours);
  const kmsMiles = String(source.kmsMiles || source.kms_miles || "").trim();
  if (!assetId && !name && !serialNumber) return null;
  return {
    assetId,
    name,
    assetType,
    serialNumber,
    currentSite,
    status,
    model,
    year,
    hours: Number.isFinite(rawHours) ? rawHours : "",
    kmsMiles,
  };
}

function assetPickerAnswerText(value) {
  const asset = normalizeAssetPickerAnswer(value);
  if (!asset) return "";
  const details = [];
  if (asset.assetType) details.push(asset.assetType);
  if (asset.model) details.push(`Model: ${asset.model}`);
  if (asset.serialNumber) details.push(`Serial/VIN: ${asset.serialNumber}`);
  if (asset.year) details.push(`Year: ${asset.year}`);
  if (asset.hours !== "" && asset.hours !== null && asset.hours !== undefined) details.push(`Hours: ${asset.hours}`);
  if (asset.kmsMiles) details.push(`Kms/Miles: ${asset.kmsMiles}`);
  if (asset.currentSite) details.push(`Site: ${asset.currentSite}`);
  if (asset.status) details.push(asset.status);
  return [asset.name || "Selected asset", details.join(" / ")].filter(Boolean).join(" / ");
}

function normalizeInstructionStyle(field) {
  const value = String(field?.settings?.instructionStyle || "").trim();
  return ["plain", "heading", "notice", "warning", "policy"].includes(value) ? value : "plain";
}

function cleanSignatureDataUrl(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > MAX_SIGNATURE_DATA_URL_LENGTH) return "";
  return SIGNATURE_DATA_URL_PATTERN.test(text) ? text : "";
}

function normalizeStaffSignoffsForDisplay(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const signature = cleanSignatureDataUrl(item?.signature_data_url);
      if (!signature) return null;
      return {
        id: item.id || `${item.staff_id || "staff"}-${item.signed_at || index}`,
        staff_id: item.staff_id || "",
        staff_name: item.staff_name || item.staff_username || "Staff",
        staff_username: item.staff_username || "",
        signature_data_url: signature,
        comments: item.comments || "",
        signed_at: item.signed_at || "",
      };
    })
    .filter(Boolean);
}

function isFileUploadSubmission(row) {
  return row?.submission_mode === "submit_file";
}

function formTypeLabel(value) {
  const labels = {
    toolbox_talk: "Toolbox Talk",
    site_inspection: "Site Inspection",
    daily_hazard_assessment: "Daily Hazard Assessment",
  };
  return labels[value] || humanizeFormType(value);
}

function humanizeFormType(value) {
  return String(value || "Form")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function submissionModeLabel(value) {
  if (value === "submit_file") return "Submit File";
  if (value === "fill_form") return "Fill Form";
  return value || "Unknown";
}

function backupStatusLabel(value) {
  if (value === "backed_up") return "Backed up";
  if (value === "pending") return "Pending";
  if (value === "failed") return "Failed";
  return value || "Unknown";
}

function priorityLabel(value) {
  const labels = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };
  return labels[value] || value || "Unknown";
}

function mediaUploadFileTypeLabel(file) {
  const mimeType = String(file?.mimeType || file?.mime_type || "").toLowerCase();
  const extension = fileExtension(file?.originalFilename || file?.original_filename || "");
  if (mimeType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].includes(extension)) return "Image";
  if (mimeType === "application/pdf" || extension === ".pdf") return "PDF";
  if ([".xls", ".xlsx"].includes(extension)) return "Excel";
  if ([".doc", ".docx"].includes(extension)) return "Word";
  return "File";
}

function submittedFileTypeInitial(typeLabel) {
  if (typeLabel === "Image") return "IMG";
  if (typeLabel === "PDF") return "PDF";
  if (typeLabel === "Excel") return "XLS";
  if (typeLabel === "Word") return "DOC";
  return "FILE";
}

function fileExtension(value) {
  const text = String(value || "").trim().toLowerCase();
  const index = text.lastIndexOf(".");
  return index >= 0 ? text.slice(index) : "";
}

function formatFileSize(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function displayOptionalNumber(value) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function nearMissLabel(value) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "Not selected";
}

function documentTitle(row) {
  const date = row?.submitted_date_vancouver
    ? formatDateString(row.submitted_date_vancouver)
    : row?.submitted_at
      ? formatShortDate(row.submitted_at)
      : formatDateString(todayInVancouver());
  return `${submittedFormPrintTitle(row)} - ${row?.company || "Company"} - ${date}`;
}

function submittedFormFileName(row, extension) {
  const date = row?.submitted_date_vancouver || todayInVancouver();
  return `${slugifyFilePart(row?.company || "company")}-${slugifyFilePart(submittedFormPrintTitle(row))}-${slugifyFilePart(date)}.${extension}`;
}

function slugifyFilePart(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "form";
}

function slugifyTemplateId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function cloneSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  try {
    return JSON.parse(JSON.stringify(settings));
  } catch {
    return {};
  }
}

function todayInVancouver() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VANCOUVER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: VANCOUVER_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: VANCOUVER_TIME_ZONE,
  }).format(new Date(value));
}

function formatDateString(value) {
  const [year, month, day] = String(value || "").slice(0, 10).split("-");
  if (!year || !month || !day) return String(value || "");
  return `${month}/${day}/${year}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printDocumentCss() {
  return `
    :root {
      color: #0b2636;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
    }
    * { box-sizing: border-box; }
    html, body { min-height: 100%; }
    body {
      margin: 0;
      background: #75858c;
      color: #0b2636;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-actions {
      display: flex;
      justify-content: center;
      padding: 14px;
      background: #f5f8f7;
      border-bottom: 1px solid #d8e4df;
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .print-actions button {
      min-height: 38px;
      border: 1px solid #b9d0c8;
      border-radius: 7px;
      padding: 0 16px;
      background: #ffffff;
      color: #173b38;
      font: inherit;
      font-weight: 800;
    }
    .print-document {
      width: 8.5in;
      min-height: 11in;
      margin: 0.34in auto;
      padding: 0.52in 0.56in 0.48in;
      background: #ffffff;
      box-shadow: 0 18px 50px rgba(7, 28, 38, 0.28);
    }
    .document-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 14px;
      margin-bottom: 18px;
      break-inside: avoid;
    }
    .document-brand {
      margin: 0 0 7px;
      color: #236b66;
      font-size: 8.5pt;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      color: #08283a;
      font-size: 26pt;
      line-height: 1.05;
      letter-spacing: 0;
    }
    .document-subtitle {
      margin: 6px 0 0;
      color: #236b66;
      font-size: 13pt;
      font-weight: 800;
    }
    .document-meta {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px 10px;
      margin: 0;
      padding: 12px 0 0;
      border-top: 2px solid #dbe8e4;
    }
    .document-meta > div,
    .answer-field {
      min-width: 0;
      border: 1px solid #9fafb7;
      border-radius: 5px;
      padding: 7px 9px 8px;
      background: #ffffff;
      break-inside: avoid;
    }
    dt {
      margin: 0 0 4px;
      color: #657973;
      font-size: 7.8pt;
      font-weight: 900;
      line-height: 1.1;
      text-transform: uppercase;
    }
    dd {
      margin: 0;
      color: #102b3a;
      font-size: 11pt;
      font-weight: 700;
      line-height: 1.28;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    .document-notes {
      display: grid;
      gap: 4px;
      border-top: 1px solid #e5eeeb;
      padding-top: 10px;
      color: #102b3a;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .document-section,
    .staff-signoff-section {
      margin: 0 0 16px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .document-section h2,
    .staff-signoff-section h2 {
      margin: 0 0 12px;
      padding: 7px 8px 8px;
      border-bottom: 2px solid #08283a;
      background: #eaf3ff;
      color: #2c8cff;
      font-size: 17pt;
      line-height: 1.08;
      font-weight: 800;
      text-transform: uppercase;
      break-after: avoid;
    }
    .section-description {
      margin: -4px 0 10px;
      color: #53645f;
      font-size: 10pt;
      font-weight: 700;
    }
    .field-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 8px;
      align-items: start;
    }
    .span-full { grid-column: 1 / -1; }
    .span-half { grid-column: span 3; }
    .span-third { grid-column: span 2; }
    .instruction-block {
      grid-column: 1 / -1;
      border: 1px solid #d6e4df;
      border-left: 4px solid #236b66;
      border-radius: 6px;
      padding: 10px 12px;
      background: #fbfdfc;
      color: #102b3a;
      break-inside: avoid;
    }
    .instruction-block p {
      margin: 0 0 6px;
      font-weight: 700;
      line-height: 1.35;
    }
    .instruction-block p:last-child { margin-bottom: 0; }
    .instruction-block ul {
      columns: 2;
      column-gap: 24px;
      margin: 0;
      padding-left: 16px;
    }
    .instruction-block li {
      margin: 0 0 3px;
      line-height: 1.28;
      break-inside: avoid;
    }
    .instruction-heading {
      border: 0;
      border-radius: 0;
      padding: 0;
      background: transparent;
      color: #102b3a;
      font-size: 12pt;
      font-weight: 900;
    }
    .instruction-heading p {
      font-size: 12pt;
      line-height: 1.25;
    }
    .choice-field {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      min-width: 0;
      border-bottom: 1px solid #e5eeeb;
      padding: 7px 0;
      break-inside: avoid;
    }
    .choice-field dt {
      margin: 0;
      color: #102b3a;
      font-size: 10pt;
      line-height: 1.25;
      text-transform: none;
    }
    .choice-field dd {
      margin: 0;
    }
    .choice-options {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px;
    }
    .choice-pill {
      min-width: 58px;
      border: 1px solid #bacbc5;
      border-radius: 999px;
      padding: 4px 9px;
      color: #5f706b;
      background: #ffffff;
      font-size: 9.5pt;
      font-weight: 800;
      text-align: center;
    }
    .choice-pill.selected {
      border-color: #2f8cff;
      color: #0b5bb4;
      background: #eaf3ff;
    }
    .signature-field img,
    .staff-signoff-card img {
      display: block;
      width: 100%;
      height: 86px;
      object-fit: contain;
      border: 1px dashed #8cbab1;
      border-radius: 5px;
      background: #ffffff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      break-inside: avoid;
    }
    th, td {
      border: 1px solid #cfddd8;
      padding: 7px;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    th {
      background: #eef7f3;
      color: #53645f;
      font-size: 8pt;
      font-weight: 900;
      text-transform: uppercase;
    }
    .text-answer,
    .empty-copy {
      margin: 8px 0 0;
      color: #53645f;
      font-weight: 700;
      line-height: 1.35;
    }
    .file-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
    }
    .file-summary span,
    .file-summary strong {
      border: 1px solid #c9ddd7;
      border-radius: 999px;
      padding: 5px 9px;
      background: #ffffff;
      color: #236b66;
      font-size: 8.8pt;
      font-weight: 900;
    }
    .file-card-grid {
      display: grid;
      gap: 8px;
    }
    .file-card {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      border: 1px solid #d6e4df;
      border-radius: 7px;
      padding: 10px;
      background: #fbfdfc;
      break-inside: avoid;
    }
    .file-icon {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 7px;
      background: #e9f4f1;
      color: #236b66;
      font-size: 7.5pt;
      font-weight: 900;
    }
    .file-card h3 {
      margin: 0;
      font-size: 11pt;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    .file-card p,
    .file-card small {
      display: block;
      margin: 2px 0 0;
      color: #657973;
      font-weight: 700;
    }
    .file-card a {
      color: #236b66;
      font-weight: 900;
      text-decoration: none;
    }
    .action-row {
      border: 1px solid #d6e4df;
      border-radius: 6px;
      padding: 9px;
      break-inside: avoid;
    }
    .action-row h3 {
      margin: 0 0 7px;
      font-size: 11pt;
    }
    .action-row dl {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      margin: 0;
    }
    .staff-signoff-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .staff-signoff-card {
      display: grid;
      gap: 8px;
      border: 1px solid #d6e4df;
      border-radius: 7px;
      padding: 10px;
      break-inside: avoid;
    }
    .staff-signoff-card div {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: #102b3a;
      font-weight: 800;
    }
    .staff-signoff-card span {
      color: #657973;
      font-size: 8.5pt;
    }
    .staff-signoff-card p {
      margin: 0;
      color: #53645f;
      font-weight: 700;
      line-height: 1.3;
    }
    .document-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border-top: 1px solid #d6e4df;
      padding-top: 8px;
      color: #657973;
      font-size: 8pt;
      font-weight: 800;
    }
    @page {
      size: letter portrait;
      margin: 0.45in 0.45in 0.56in;
    }
    @media print {
      body { background: #ffffff; }
      [data-print-ignore], .print-actions { display: none !important; }
      .print-document {
        width: auto;
        min-height: 0;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
      h1 { font-size: 23pt; }
      .document-section h2,
      .staff-signoff-section h2 { font-size: 15pt; }
    }
    @media screen and (max-width: 820px) {
      .print-document {
        width: auto;
        min-height: 0;
        margin: 0;
        padding: 22px;
      }
      .document-meta,
      .field-grid,
      .staff-signoff-grid {
        grid-template-columns: 1fr;
      }
      .span-full,
      .span-half,
      .span-third {
        grid-column: 1 / -1;
      }
      .instruction-block ul {
        columns: 1;
      }
    }
  `;
}
