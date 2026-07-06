import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import {
  buildSubmittedFormPrintHtml,
  submittedFormPdfFileName,
} from "./submissionPrintRenderer.js";
import {
  SUBMITTED_FORM_TRANSLATION_LANGUAGES,
  translateSubmittedFormTexts,
} from "./submittedFormPhrasebook.js";

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
  { id: "form-templates", label: "FORM TEMPLATES", path: "/staff/form-templates" },
  { id: "action-items", label: "ACTIONS", path: "/staff/action-items", adminOnly: true },
  { id: "certificates", label: "CERTIFICATES", path: "/staff/certificates" },
  { id: "assets", label: "ASSETS", path: "/staff/assets" },
  { id: "workers", label: "WORKERS", path: "/staff/workers" },
  { id: "users", label: "STAFF", path: "/staff/users" },
  { id: "backups", label: "BACKUPS", path: "/staff/backups", adminOnly: true },
  { id: "health", label: "HEALTH", path: "/staff/health", adminOnly: true },
  { id: "audit", label: "AUDIT", path: "/staff/audit", adminOnly: true },
  { id: "trends", label: "TRENDS", path: "/staff/trends", adminOnly: true },
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
  one_drive_backup_enabled: false,
};

const DEFAULT_SYSTEM_STATUS = {
  database: "checking",
  email: "checking",
  sms: "not connected",
  oneDrive: "checking",
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
const LOCKED_DEFAULT_FORM_TYPES = new Set([
  "toolbox_talk",
  "site_inspection",
  "daily_hazard_assessment",
]);
const CUSTOM_FORM_TYPES = new Set(["toolbox_talk", "site_inspection"]);
const TEMPLATE_FIELD_TYPES = [
  { id: "short_text", label: "Short answer" },
  { id: "long_text", label: "Long answer" },
  { id: "number", label: "Number" },
  { id: "date", label: "Date" },
  { id: "time", label: "Time" },
  { id: "yes_no", label: "Yes / No" },
  { id: "boolean", label: "Boolean" },
  { id: "toggle", label: "Toggle" },
  { id: "media_upload", label: "Media upload" },
  { id: "asset_picker", label: "Asset picker" },
  { id: "dropdown", label: "Dropdown" },
  { id: "multi_select", label: "Multi-select chips" },
  { id: "checkbox", label: "Checkbox confirmation" },
  { id: "signature", label: "Drawn signature" },
  { id: "instructions", label: "Instructions" },
  { id: "toolbox_meeting_info", label: "Toolbox meeting info" },
  { id: "toolbox_topics", label: "Toolbox topic picker" },
  { id: "toolbox_incident_review", label: "Toolbox incident review" },
  { id: "toolbox_safety_concerns", label: "Toolbox safety concerns" },
  { id: "toolbox_attendance", label: "Toolbox attendance" },
  { id: "toolbox_final_confirmation", label: "Toolbox final confirmation" },
  { id: "site_deficiencies", label: "Site deficiencies" },
  { id: "action_item_rows", label: "Action item rows" },
];
const TEMPLATE_OPTION_FIELD_TYPES = new Set(["dropdown", "multi_select"]);
const TEMPLATE_LAYOUT_WIDTH_OPTIONS = [
  { id: "", label: "Default" },
  { id: "full", label: "Full width" },
  { id: "half", label: "Half width" },
  { id: "third", label: "Third width" },
];
const TEMPLATE_INSTRUCTION_STYLE_OPTIONS = [
  { id: "plain", label: "Plain" },
  { id: "heading", label: "Heading" },
  { id: "notice", label: "Notice" },
  { id: "warning", label: "Warning" },
  { id: "policy", label: "Policy" },
];
const TEMPLATE_NUMBER_MODE_OPTIONS = [
  { id: "decimal", label: "Decimal" },
  { id: "integer", label: "Whole number only" },
];
const TEMPLATE_DROPDOWN_DISPLAY_OPTIONS = [
  { id: "dropdown", label: "Dropdown" },
  { id: "radio", label: "Radio buttons" },
];
const TEMPLATE_MULTI_SELECT_DISPLAY_OPTIONS = [
  { id: "chips", label: "Chips" },
  { id: "checklist", label: "Checklist" },
];
const TEMPLATE_OPTION_PRESETS = [
  { id: "", label: "Custom options", options: null },
  { id: "yes_no", label: "Yes / No", options: ["Yes", "No"] },
  { id: "yes_no_na", label: "Yes / No / N/A", options: ["Yes", "No", "N/A"] },
  { id: "training_status", label: "Training status", options: ["Current", "Required", "N/A"] },
  { id: "certification_status", label: "Certification status", options: ["Provided", "Will provide", "Not required"] },
  { id: "understood_ack", label: "Acknowledgement", options: ["I understand", "I need clarification", "N/A"] },
];
const TEMPLATE_DEFAULT_VALUE_OPTIONS = [
  { id: "", label: "Blank" },
  { id: "worker_name", label: "Worker name" },
  { id: "worker_phone", label: "Worker phone" },
  { id: "worker_username", label: "Worker username" },
  { id: "worker_company", label: "Worker company" },
  { id: "worker_address", label: "Worker address" },
  { id: "today", label: "Today", fieldTypes: ["date", "short_text"] },
  { id: "now", label: "Current time", fieldTypes: ["time", "short_text"] },
];
const TEMPLATE_DEFAULT_VALUES = new Set(TEMPLATE_DEFAULT_VALUE_OPTIONS.map((option) => option.id));
const TEMPLATE_VISIBILITY_SOURCE_TYPES = new Set([
  "yes_no",
  "boolean",
  "toggle",
  "checkbox",
  "dropdown",
  "multi_select",
]);
const TEMPLATE_VISIBILITY_OPERATORS = [
  { id: "equals", label: "is" },
  { id: "not_equals", label: "is not" },
  { id: "contains", label: "includes" },
  { id: "not_contains", label: "does not include" },
];
const MAX_SIGNATURE_DATA_URL_LENGTH = 750000;
const SIGNATURE_DATA_URL_PATTERN = /^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/;
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
const TOOLBOX_TALK_SPECIAL_BLOCK_ORDER = [
  "toolbox_meeting_info",
  "toolbox_topics",
  "toolbox_incident_review",
  "toolbox_safety_concerns",
  "toolbox_attendance",
  "toolbox_final_confirmation",
];
const TEMPLATE_BLOCK_GROUPS = [
  {
    title: "Common",
    fields: ["instructions", "short_text", "long_text"],
  },
  {
    title: "Fast inputs",
    fields: ["date", "time", "number", "yes_no", "boolean", "toggle", "media_upload", "asset_picker"],
  },
  {
    title: "Choices",
    fields: ["dropdown", "multi_select", "checkbox"],
  },
];
const TEMPLATE_V3_FIELD_GROUPS = [
  {
    id: "basics",
    label: "Basics",
    fields: [
      { type: "instructions", title: "Instructions", hint: "Read-only text", icon: "i", label: "Instructions" },
      { type: "short_text", title: "Short answer", hint: "One-line text", icon: "Ab", label: "" },
      { type: "long_text", title: "Long answer", hint: "Multi-line notes", icon: "T", label: "" },
      { type: "number", title: "Number", hint: "Numeric entry", icon: "#", label: "" },
      { type: "date", title: "Date", hint: "Date picker", icon: "D", label: "Date", default: "today" },
      { type: "time", title: "Time", hint: "Time picker", icon: "T", label: "Time", default: "now" },
      { type: "yes_no", title: "Yes / No", hint: "Two-choice answer", icon: "Y/N", label: "" },
      { type: "boolean", title: "Boolean", hint: "Checked or not checked", icon: "B", label: "Boolean question" },
      { type: "toggle", title: "Toggle", hint: "On / off switch", icon: "On", label: "Toggle setting" },
      { type: "checkbox", title: "Confirmation", hint: "Required acknowledgement", icon: "OK", label: "I confirm this information is correct." },
      { type: "signature", title: "Drawn signature", hint: "Finger or mouse signature", icon: "Sig", label: "Signature" },
    ],
  },
  {
    id: "media",
    label: "Media",
    fields: [
      { type: "media_upload", title: "Media upload", hint: "Images, PDF, Excel", icon: "Up", label: "Media upload" },
      {
        type: "asset_picker",
        title: "Asset picker",
        hint: "Search saved assets",
        icon: "A",
        label: "Select asset",
        settings: { assetPicker: { typeFilter: "", siteFilter: "", statusFilter: "active" } },
      },
    ],
  },
  {
    id: "choices",
    label: "Choices",
    fields: [
      { type: "dropdown", title: "Dropdown", hint: "Choose one option", icon: "V", label: "", options: ["Option 1", "Option 2"] },
      { type: "dropdown", title: "Radio group", hint: "Visible one-choice list", icon: "O", label: "", options: ["Yes", "No"], settings: { choiceDisplay: "radio", optionPreset: "yes_no" } },
      { type: "multi_select", title: "Multi-select chips", hint: "Choose multiple options", icon: "+", label: "", options: ["Option 1", "Option 2"] },
      { type: "multi_select", title: "Checklist", hint: "Visible multi-choice list", icon: "Chk", label: "", options: ["Option 1", "Option 2"], settings: { choiceDisplay: "checklist" } },
    ],
  },
  {
    id: "helpers",
    label: "Safety Helpers",
    fields: [
      { type: "short_text", title: "Worker name", hint: "Prefill signed-in worker", icon: "W", label: "Worker name", default: "worker_name", required: true },
      { type: "short_text", title: "Company", hint: "Company or subcontractor", icon: "Co", label: "Company" },
      { type: "short_text", title: "Project", hint: "Project or site name", icon: "P", label: "Project" },
      { type: "checkbox", title: "Final confirmation", hint: "Worker must check it", icon: "OK", label: "I confirm this form is complete.", required: true },
    ],
  },
  {
    id: "special",
    label: "Special Blocks",
    fields: [
      {
        type: "toolbox_topics",
        title: "Toolbox topics",
        hint: "Expandable APPIA topic picker",
        icon: "T",
        label: "Topics Discussed",
        settings: {
          showCommon: true,
          showSearch: true,
          enabledCategoryIds: "all",
          commonTopicLabels: "default",
        },
      },
      {
        type: "toolbox_incident_review",
        title: "Incident review",
        hint: "FA, medical aids, near miss, lessons",
        icon: "IR",
        label: "Incident / Review",
        settings: { defaultCollapsed: true },
      },
      {
        type: "toolbox_safety_concerns",
        title: "Safety concerns",
        hint: "Concern, action, date rows",
        icon: "SC",
        label: "Safety Concerns",
        settings: { defaultCollapsed: true },
      },
      { type: "toolbox_attendance", title: "Attendance list", hint: "Fast typed attendee chips", icon: "A", label: "Attendance" },
      { type: "toolbox_final_confirmation", title: "Final confirmation", hint: "Presenter comments and participation check", icon: "OK", label: "Final Confirmation" },
      {
        type: "site_deficiencies",
        title: "Site deficiencies",
        hint: "No-deficiency check and corrective action rows",
        icon: "SI",
        label: "Deficiencies",
      },
      {
        type: "action_item_rows",
        title: "Action item rows",
        hint: "Creates draft Action Items",
        icon: "AI",
        label: "Action item rows",
      },
    ],
  },
];
const TEMPLATE_STARTER_TEMPLATES = [
  {
    id: "blank",
    title: "Blank form",
    description: "Start with an empty canvas.",
    schema: null,
  },
  {
    id: "daily_hazard",
    title: "Daily Hazard Assessment",
    description: "Project, work area, hazards, controls, and confirmation.",
    schema: {
      title: "Daily Hazard Assessment",
      description: "Fast mobile hazard review.",
      sections: [
        {
          id: "job_info",
          title: "Job Info",
          description: "",
          fields: [
            { id: "project", type: "short_text", label: "Project", required: true, remember: true },
            { id: "area", type: "short_text", label: "Work area", required: true },
            { id: "date", type: "date", label: "Date", required: true, default: "today" },
            { id: "time", type: "time", label: "Time", required: true, default: "now" },
            { id: "completed_by", type: "short_text", label: "Completed by", required: true, default: "worker_name" },
          ],
        },
        {
          id: "hazards_controls",
          title: "Hazards and Controls",
          description: "",
          fields: [
            {
              id: "hazards",
              type: "multi_select",
              label: "Hazards observed",
              required: true,
              options: ["Fall protection", "Tools / equipment", "Traffic", "Electrical", "Housekeeping"],
            },
            { id: "controls", type: "long_text", label: "Controls in place", required: true },
            { id: "safe_to_start", type: "yes_no", label: "Safe to start work?", required: true },
          ],
        },
      ],
    },
  },
  {
    id: "pre_task",
    title: "Pre-Task Plan",
    description: "Plan the work, crew, risks, and controls before starting.",
    schema: {
      title: "Pre-Task Plan",
      description: "Quick pre-task planning record.",
      sections: [
        {
          id: "work_plan",
          title: "Work Plan",
          description: "",
          fields: [
            { id: "project", type: "short_text", label: "Project", required: true, remember: true },
            { id: "task", type: "long_text", label: "Task / scope of work", required: true },
            { id: "crew", type: "short_text", label: "Crew lead", required: true, default: "worker_name" },
            { id: "date", type: "date", label: "Date", required: true, default: "today" },
          ],
        },
        {
          id: "risk_review",
          title: "Risk Review",
          description: "",
          fields: [
            { id: "critical_risks", type: "long_text", label: "Main risks", required: true },
            { id: "controls", type: "long_text", label: "Controls / permits", required: true },
            { id: "ready", type: "checkbox", label: "I confirm the crew reviewed this plan.", required: true },
          ],
        },
      ],
    },
  },
  {
    id: "near_miss",
    title: "Incident / Near Miss Report",
    description: "Capture what happened, where, and what was done.",
    schema: {
      title: "Incident / Near Miss Report",
      description: "Initial incident or near miss details.",
      sections: [
        {
          id: "event_details",
          title: "Event Details",
          description: "",
          fields: [
            { id: "project", type: "short_text", label: "Project", required: true, remember: true },
            { id: "location", type: "short_text", label: "Location", required: true },
            { id: "date", type: "date", label: "Date", required: true, default: "today" },
            { id: "time", type: "time", label: "Time", required: true, default: "now" },
            {
              id: "event_type",
              type: "dropdown",
              label: "Type",
              required: true,
              options: ["Near miss", "Incident", "Property damage", "First aid"],
            },
          ],
        },
        {
          id: "response",
          title: "Response",
          description: "",
          fields: [
            { id: "description", type: "long_text", label: "What happened?", required: true },
            { id: "immediate_action", type: "long_text", label: "Immediate action taken", required: false },
            { id: "reported_by", type: "short_text", label: "Reported by", required: true, default: "worker_name" },
          ],
        },
      ],
    },
  },
  {
    id: "equipment",
    title: "Equipment Inspection",
    description: "Check equipment condition and readiness.",
    schema: {
      title: "Equipment Inspection",
      description: "Fast equipment inspection checklist.",
      sections: [
        {
          id: "equipment",
          title: "Equipment",
          description: "",
          fields: [
            { id: "equipment_name", type: "short_text", label: "Equipment name / number", required: true },
            { id: "project", type: "short_text", label: "Project", required: true, remember: true },
            { id: "inspected_by", type: "short_text", label: "Inspected by", required: true, default: "worker_name" },
            { id: "date", type: "date", label: "Date", required: true, default: "today" },
          ],
        },
        {
          id: "condition",
          title: "Condition",
          description: "",
          fields: [
            { id: "pre_use_complete", type: "yes_no", label: "Pre-use check complete?", required: true },
            { id: "defects", type: "long_text", label: "Defects or concerns", required: false },
            { id: "safe_to_use", type: "yes_no", label: "Safe to use?", required: true },
          ],
        },
      ],
    },
  },
  {
    id: "training_attendance",
    title: "Training Attendance",
    description: "Topic, trainer, attendee names, and acknowledgement.",
    schema: {
      title: "Training Attendance",
      description: "Simple training attendance record.",
      sections: [
        {
          id: "training",
          title: "Training",
          description: "",
          fields: [
            { id: "topic", type: "short_text", label: "Training topic", required: true },
            { id: "trainer", type: "short_text", label: "Trainer", required: true, default: "worker_name" },
            { id: "date", type: "date", label: "Date", required: true, default: "today" },
            { id: "attendees", type: "long_text", label: "Attendees", required: true, helperText: "Type one name per line." },
            { id: "confirmed", type: "checkbox", label: "I confirm these workers attended.", required: true },
          ],
        },
      ],
    },
  },
];
const SCANNED_COPY_ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt";
const MEDIA_UPLOAD_KIND_CONFIGS = {
  image: {
    label: "Images",
    helper: "JPG, PNG, WEBP, HEIC",
    extensions: [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  },
  pdf: {
    label: "PDF",
    helper: "PDF",
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
  },
  excel: {
    label: "Excel",
    helper: "XLS, XLSX",
    extensions: [".xls", ".xlsx"],
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
};
const DEFAULT_MEDIA_UPLOAD_KINDS = Object.keys(MEDIA_UPLOAD_KIND_CONFIGS);
const MEDIA_UPLOAD_ACCEPT = DEFAULT_MEDIA_UPLOAD_KINDS
  .flatMap((kind) => [
    ...MEDIA_UPLOAD_KIND_CONFIGS[kind].mimeTypes,
    ...MEDIA_UPLOAD_KIND_CONFIGS[kind].extensions,
  ])
  .join(",");
const MAX_MEDIA_UPLOAD_FILES = 5;
const MAX_MEDIA_UPLOAD_FILE_BYTES = 50 * 1024 * 1024;
const MEDIA_UPLOAD_ALLOWED_EXTENSIONS = new Set(
  DEFAULT_MEDIA_UPLOAD_KINDS.flatMap((kind) => MEDIA_UPLOAD_KIND_CONFIGS[kind].extensions),
);
const MEDIA_UPLOAD_ALLOWED_MIME_TYPES = new Set(
  DEFAULT_MEDIA_UPLOAD_KINDS.flatMap((kind) => MEDIA_UPLOAD_KIND_CONFIGS[kind].mimeTypes),
);

const TOOLBOX_TALK_DEFAULTS_KEY = "sf_toolbox_talk_defaults";
const SITE_INSPECTION_DEFAULTS_KEY = "sf_site_inspection_defaults";
const WORKER_SESSION_CACHE_KEY = "sf_worker_session_cache_v1";
const WORKER_FORM_DRAFTS_KEY = "sf_worker_form_drafts_v1";
const WORKER_SUBMISSION_QUEUE_KEY = "sf_worker_submission_queue_v1";
const WORKER_SUBMISSION_QUEUE_EVENT = "sf_worker_submission_queue_changed";
const DRAFT_SAVE_DELAY_MS = 350;
const TOOLBOX_TALK_RECENTS_KEY = "sf_toolbox_talk_recents_v1";
const TOOLBOX_TALK_QUICK_TOPIC_LABELS = [
  "Housekeeping / clean-up",
  "When needed",
  "Anchors",
  "Pre-use inspection",
  "Head / eye / face",
  "Safe Access",
  "Report all incidents",
  "Safeguards",
  "WHMIS",
];
const EMPTY_SAFETY_CONCERN = { concern: "", actionToTake: "", dateTaken: "" };
const EMPTY_ATTENDEE = { name: "" };
const EMPTY_SITE_DEFICIENCY = {
  category: "",
  location: "",
  description: "",
  priority: "medium",
  immediateControl: "",
  recommendedAction: "",
  suggestedAssignee: "",
  dueDate: "",
};
const SITE_INSPECTION_CATEGORIES = [
  "Access / egress",
  "Fall protection",
  "Housekeeping",
  "PPE",
  "Tools / equipment",
  "Electrical",
  "Scaffolds / ladders",
  "Excavation",
  "Traffic control",
  "Material handling",
  "High-risk work",
  "Other",
];
const ACTION_ITEM_PRIORITY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "critical", label: "Critical" },
];
const ACTION_ITEM_ROW_FIELD_CONFIGS = [
  { key: "category", input: "category", siteLabel: "Category", genericLabel: "Category", optional: true },
  { key: "location", input: "text", siteLabel: "Location / area", genericLabel: "Location / area", optional: true },
  { key: "priority", input: "priority", siteLabel: "Priority", genericLabel: "Priority", optional: true, defaultValue: "medium" },
  { key: "suggestedAssignee", input: "text", siteLabel: "Suggested assignee", genericLabel: "Suggested assignee", optional: true },
  { key: "description", input: "textarea", siteLabel: "Deficiency / hazard", genericLabel: "Action item / issue", lockedVisible: true },
  { key: "immediateControl", input: "textarea", siteLabel: "Immediate control taken", genericLabel: "Immediate control taken", optional: true },
  { key: "recommendedAction", input: "textarea", siteLabel: "Recommended corrective action", genericLabel: "Recommended corrective action", optional: true },
  { key: "dueDate", input: "date", siteLabel: "Suggested due date", genericLabel: "Suggested due date", optional: true },
];
const TOOLBOX_INCIDENT_REVIEW_FIELD_CONFIGS = [
  { key: "firstAidCount", input: "number", label: "# of FA since last meeting" },
  { key: "medicalAidCount", input: "number", label: "# of Medical Aids" },
  { key: "nearMissReviewed", input: "yes_no", label: "Near miss / accident to review?" },
  {
    key: "nearMissDescription",
    input: "textarea",
    label: "Near miss / accident description",
    conditionalKey: "nearMissReviewed",
    conditionalValue: "yes",
  },
  { key: "lessonsLearned", input: "textarea", label: "Lessons that can be learnt from the above numbers" },
];
const TOOLBOX_SAFETY_CONCERN_FIELD_CONFIGS = [
  { key: "concern", input: "text", label: "Concern" },
  { key: "actionToTake", input: "text", label: "Action to take" },
  { key: "dateTaken", input: "date", label: "Date taken" },
];
const TOOLBOX_COMPOSITE_BLOCK_CONFIGS = {
  toolbox_incident_review: {
    settingsKey: "toolboxIncidentReview",
    subfieldsLabel: "Review fields",
    openButtonLabel: "Add incident / review notes",
    hideButtonLabel: "Hide",
    fieldConfigs: TOOLBOX_INCIDENT_REVIEW_FIELD_CONFIGS,
  },
  toolbox_safety_concerns: {
    settingsKey: "toolboxSafetyConcerns",
    subfieldsLabel: "Row fields",
    openButtonLabel: "Add safety concern",
    hideButtonLabel: "Hide",
    addRowButtonLabel: "Add another concern",
    fieldConfigs: TOOLBOX_SAFETY_CONCERN_FIELD_CONFIGS,
  },
};
const ACTION_ITEM_STATUS_OPTIONS = [
  { id: "draft", label: "Draft" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "ready_for_review", label: "Ready for review" },
  { id: "closed", label: "Closed" },
  { id: "void", label: "Void" },
];
const ACTION_ITEM_SORT_LABELS = {
  created_at: "Created",
  updated_at: "Updated",
  due_date: "Due date",
  status: "Status",
  priority: "Priority",
  company: "Company",
  project: "Project",
};

const TOOLBOX_TALK_TOPIC_GROUPS = [
  {
    id: "rights_responsibilities",
    label: "Rights and Responsibilities",
    topics: [
      "Young workers / Supervisors / Workers",
      "Inspections / corrective actions",
      "Housekeeping / clean-up",
      "Refusal of work",
      "Circumvention of safeguards",
      "Impairment",
      "Work alone",
      "Bullying and Harassment",
      "Guardrails / handrails",
      "Lighting",
    ],
  },
  {
    id: "general_conditions",
    label: "General Conditions",
    topics: ["Dropped / falling objects", "Smoking / vaping", "Pers. hygiene"],
  },
  {
    id: "chemical_biological",
    label: "Chemical Agents and Biological Agents",
    topics: ["WHMIS", "Storage / spills", "Flammable / pressure", "Indoor use of engines"],
  },
  {
    id: "substance_specific",
    label: "Substance Specific Requirements",
    topics: ["Asbestos", "Biological", "Lead", "Silica"],
  },
  {
    id: "noise_vibration_temperature",
    label: "Noise, Vibration, Radiation and Temperature",
    topics: ["Exposure", "Vibration / Impact", "Hearing test", "High / low temp work"],
  },
  {
    id: "ppe",
    label: "Personal Protective Clothing and Equipment",
    topics: ["Head / eye / face", "Respiratory", "Footwear", "High Vis. / flame resist."],
  },
  {
    id: "confined_spaces",
    label: "Confined Spaces",
    topics: ["Identification", "Assessment", "Procedure", "Trained / approved"],
  },
  {
    id: "lockout",
    label: "De-energization and Lockout",
    topics: ["When required", "Locations on this site", "Who is responsible"],
  },
  {
    id: "fall_protection",
    label: "Fall Protection",
    topics: ["When needed", "Hierarchy", "Anchors", "Pre-use inspection"],
  },
  {
    id: "tools_equipment",
    label: "Tools, Machinery and Equipment",
    topics: ["Safeguards", "Removal from service", "Instructions"],
  },
  {
    id: "ladders_platforms",
    label: "Ladders, Scaffolds and Temporary Work Platforms",
    topics: ["Short duration work", "Pre-use inspection", "Right ladder", "3 x base height / pre-use"],
  },
  {
    id: "cranes_hoists",
    label: "Cranes and Hoists",
    topics: ["Certified operator", "Look up and listen", "High voltage", "No fly"],
  },
  {
    id: "rigging",
    label: "Rigging",
    topics: ["Qualified rigger", "Certified lifting device", "Pre-use inspections", "Bulk bags"],
  },
  {
    id: "mobile_equipment",
    label: "Mobile Equipment",
    topics: ["Pre-use inspection", "Competent operator", "Unobstructed / unattended", "Secure loads"],
  },
  {
    id: "traffic_control",
    label: "Traffic Control",
    topics: ["Plan", "Order of controls", "TCP"],
  },
  {
    id: "electrical_safety",
    label: "Electrical Safety",
    topics: ["Low voltage - LOA", "High voltage - LOA", "30M33", "Call before dig"],
  },
  {
    id: "construction_excavation_demolition",
    label: "Construction, Excavation and Demolition",
    topics: [
      "Prime Contractor",
      "After hours work",
      "Report all injuries",
      "Report all incidents",
      "Safe Access",
      "Excavations",
      "Fly forms",
      "Deck turnover",
      "Thrust out platforms",
      "Stacking material",
    ],
  },
  {
    id: "evacuation_rescue",
    label: "Evacuation and Rescue",
    topics: ["Muster station", "Fire plan", "Notify if leave site", "DEP"],
  },
  {
    id: "psychological_health_safety",
    label: "Psychological health and safety",
    topics: [
      "Ask for help and offer to help",
      "Have a tolerant, non-judgemental attitude toward others",
      "Report Bullying and Harassment situations",
      "Encourage respectful behaviors",
      "Talk to a professional when needed",
    ],
  },
];

const TOOLBOX_TALK_HEADER_FIELD_CONFIGS = [
  {
    key: "projectName",
    id: "toolbox_project_name",
    label: "Project Name",
    type: "short_text",
    required: true,
    remember: true,
  },
  {
    key: "address",
    id: "toolbox_address",
    label: "Address",
    type: "short_text",
    required: true,
    remember: true,
  },
  {
    key: "date",
    id: "toolbox_date",
    label: "Date",
    type: "date",
    required: true,
    default: "today",
  },
  {
    key: "time",
    id: "toolbox_time",
    label: "Time",
    type: "time",
    required: true,
    default: "now",
  },
  {
    key: "presenter",
    id: "toolbox_presenter",
    label: "Presenter",
    type: "short_text",
    required: true,
    default: "worker_name",
  },
  {
    key: "supervisor",
    id: "toolbox_supervisor",
    label: "Supervisor",
    type: "short_text",
    required: true,
    remember: true,
  },
];

const TOOLBOX_TALK_HEADER_FIELD_ALIASES = {
  address: "address",
  project: "projectName",
  project_name: "projectName",
  projectname: "projectName",
  supervisor: "supervisor",
  presenter: "presenter",
  date: "date",
  time: "time",
  toolbox_address: "address",
  toolbox_project_name: "projectName",
  toolbox_supervisor: "supervisor",
  toolbox_presenter: "presenter",
  toolbox_date: "date",
  toolbox_time: "time",
};

const SITE_INSPECTION_HEADER_FIELD_CONFIGS = [
  {
    key: "project",
    id: "site_project",
    label: "Project",
    type: "short_text",
    required: true,
    remember: true,
  },
  {
    key: "areaInspected",
    id: "site_area_inspected",
    label: "Area inspected",
    type: "short_text",
    required: true,
  },
  {
    key: "address",
    id: "site_address",
    label: "Address",
    type: "short_text",
    required: false,
    remember: true,
  },
  {
    key: "date",
    id: "site_date",
    label: "Date",
    type: "date",
    required: true,
    default: "today",
  },
  {
    key: "time",
    id: "site_time",
    label: "Time",
    type: "time",
    required: true,
    default: "now",
  },
  {
    key: "inspector",
    id: "site_inspector",
    label: "Inspector",
    type: "short_text",
    required: true,
    default: "worker_name",
  },
  {
    key: "tradesPresent",
    id: "site_trades_present",
    label: "Trades present",
    type: "short_text",
    required: false,
    remember: true,
  },
  {
    key: "reviewer",
    id: "site_reviewer",
    label: "Reviewer / Supervisor",
    type: "short_text",
    required: false,
    remember: true,
  },
];

const SITE_INSPECTION_HEADER_FIELD_ALIASES = {
  address: "address",
  area: "areaInspected",
  area_inspected: "areaInspected",
  areainspected: "areaInspected",
  date: "date",
  inspector: "inspector",
  project: "project",
  project_name: "project",
  reviewer: "reviewer",
  reviewer_supervisor: "reviewer",
  site_address: "address",
  site_area_inspected: "areaInspected",
  site_date: "date",
  site_inspector: "inspector",
  site_project: "project",
  site_reviewer: "reviewer",
  site_time: "time",
  site_trades_present: "tradesPresent",
  supervisor: "reviewer",
  time: "time",
  trades: "tradesPresent",
  trades_present: "tradesPresent",
  tradespresent: "tradesPresent",
};

const SITE_INSPECTION_OBSERVATION_FIELD_CONFIGS = [
  {
    key: "positive",
    id: "site_positive_observations",
    label: "Positive observations",
    sectionTitle: "Positive observations",
    type: "long_text",
    defaultCollapsed: true,
  },
  {
    key: "highRiskWork",
    id: "site_high_risk_work",
    label: "High-risk work observed",
    sectionTitle: "High-risk work observed",
    type: "long_text",
    defaultCollapsed: true,
  },
  {
    key: "immediateControls",
    id: "site_immediate_controls",
    label: "Immediate controls",
    sectionTitle: "Immediate controls",
    type: "long_text",
    defaultCollapsed: true,
  },
  {
    key: "followUpNotes",
    id: "site_follow_up_notes",
    label: "Follow-up notes",
    sectionTitle: "Follow-up notes",
    type: "long_text",
    defaultCollapsed: true,
  },
];

const SITE_INSPECTION_OBSERVATION_FIELD_ALIASES = {
  follow_up: "followUpNotes",
  follow_up_notes: "followUpNotes",
  followup: "followUpNotes",
  followup_notes: "followUpNotes",
  high_risk: "highRiskWork",
  high_risk_work: "highRiskWork",
  high_risk_work_observed: "highRiskWork",
  highriskwork: "highRiskWork",
  immediate_control: "immediateControls",
  immediate_controls: "immediateControls",
  positive: "positive",
  positive_observations: "positive",
  site_follow_up_notes: "followUpNotes",
  site_high_risk_work: "highRiskWork",
  site_immediate_controls: "immediateControls",
  site_positive_observations: "positive",
};

const TOOLBOX_TALK_TOPIC_GROUP_IDS = TOOLBOX_TALK_TOPIC_GROUPS.map((group) => group.id);

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

const EMPTY_STAFF_WORKER_FILTERS = {
  company: "",
  active: "all",
  sort: "company_name",
};

const EMPTY_STAFF_USER_FORM = {
  display_name: "",
  email: "",
  phone: "",
  username: "",
  password: "",
  role: "staff",
  active: true,
};

const EMPTY_STAFF_PROFILE_FORM = {
  display_name: "",
  email: "",
  phone: "",
  username: "",
  password: "",
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
  const [groupMode, setGroupMode] = useState(Boolean(rememberedProfile?.groupMode));
  const [groupNames, setGroupNames] = useState(
    rememberedProfile?.groupMode ? rememberedProfile.groupNames || [] : [],
  );
  const [groupNameDraft, setGroupNameDraft] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const submitted = status.type === "success";
  const displayGroupNames = useMemo(
    () => normalizeGroupNameEntries(groupNames),
    [groupNames],
  );

  const rememberProfile = (
    nextForm = form,
    nextGroupMode = groupMode,
    nextGroupNames = groupNames,
  ) => {
    writeRememberedWorkerProfile(nextForm, {
      groupMode: nextGroupMode,
      groupNames: nextGroupMode ? normalizeGroupNameEntries(nextGroupNames) : [],
    });
  };

  const updateField = (field, value) => {
    setForm((current) => {
      const nextForm = { ...current, [field]: value };
      if (rememberMe) rememberProfile(nextForm);
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
      if (rememberMe) rememberProfile(nextForm);
      return nextForm;
    });
  };

  const updateRememberMe = (checked) => {
    setRememberMe(checked);
    if (checked) {
      rememberProfile(
        form,
        groupMode,
        groupMode ? [...groupNames, groupNameDraft] : [],
      );
      return;
    }
    clearRememberedWorkerProfile();
    clearRememberedWorkerGroup();
  };

  const updateGroupMode = (enabled) => {
    setGroupMode(enabled);
    setGroupNameDraft("");
    if (rememberMe) {
      rememberProfile(form, enabled, enabled ? groupNames : []);
    }
    if (!enabled) {
      setGroupNames([]);
    }
  };

  const addGroupNames = (value) => {
    const names = normalizeGroupNameEntries([value]);
    if (!names.length) return false;
    setGroupNames((current) => {
      const nextNames = normalizeGroupNameEntries([...current, ...names]);
      if (rememberMe) rememberProfile(form, groupMode, nextNames);
      return nextNames;
    });
    setGroupNameDraft("");
    return true;
  };

  const updateGroupNameDraft = (value) => {
    if (!value.includes(",")) {
      setGroupNameDraft(value);
      if (rememberMe) rememberProfile(form, groupMode, [...groupNames, value]);
      return;
    }
    const parts = value.split(",");
    const completedNames = normalizeGroupNameEntries(parts.slice(0, -1));
    const nextDraft = (parts[parts.length - 1] || "").trimStart();
    if (completedNames.length) {
      setGroupNames((current) => {
        const nextNames = normalizeGroupNameEntries([...current, ...completedNames]);
        if (rememberMe) rememberProfile(form, groupMode, [...nextNames, nextDraft]);
        return nextNames;
      });
    } else if (rememberMe) {
      rememberProfile(form, groupMode, [...groupNames, nextDraft]);
    }
    setGroupNameDraft(nextDraft);
  };

  const removeGroupName = (indexToRemove) => {
    setGroupNames((current) => {
      const nextNames = normalizeGroupNameEntries(current).filter(
        (_, index) => index !== indexToRemove,
      );
      if (rememberMe) rememberProfile(form, groupMode, [...nextNames, groupNameDraft]);
      return nextNames;
    });
  };

  const handleGroupNameKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addGroupNames(groupNameDraft);
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
      ? normalizeGroupNameEntries([...groupNames, groupNameDraft])
      : [form.name.trim()].filter(Boolean);
    if (!names.length) {
      setSubmitting(false);
      setStatus({ type: "error", message: "Name is required." });
      return;
    }

    const phone = formatPhoneNumber(form.phone);
    const submittedSignIns = [];
    let createdCount = 0;
    let reusedCount = 0;

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
        if (!responsePayload.signIn) throw new Error("Sign-in failed.");
        submittedSignIns.push({
          ...responsePayload.signIn,
          signOutToken: responsePayload.signOutToken || responsePayload.signIn.signOutToken || "",
        });
        if (responsePayload.created === false) {
          reusedCount += 1;
        } else {
          createdCount += 1;
        }
      }

      if (rememberMe) {
        rememberProfile(form, groupMode, groupMode ? names : []);
        if (submittedSignIns.length > 1) {
          writeRememberedWorkerGroup(submittedSignIns);
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
      const statusParts = [];
      if (createdCount) statusParts.push(`${createdCount} new`);
      if (reusedCount) statusParts.push(`${reusedCount} already signed in`);
      const statusSuffix = statusParts.length ? ` (${statusParts.join(", ")})` : "";
      setStatus({
        type: "success",
        message: `${names.length === 1 ? "Sign-in" : `${names.length} sign-ins`} submitted${statusSuffix} - ${formatShortDate(
          submittedSignIns[submittedSignIns.length - 1],
          "sign_in_date_vancouver",
          "signed_in_at",
        )}`,
      });
    } catch (error) {
      const partialMessage = submittedSignIns.length
        ? `${submittedSignIns.length} sign-ins were saved or already open before this error. `
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
                    {displayGroupNames.map((name, index) => (
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
                      required={displayGroupNames.length === 0}
                      autoComplete="off"
                      aria-label="Worker name"
                      placeholder="Type name, press enter or comma"
                      value={groupNameDraft}
                      onChange={(event) => updateGroupNameDraft(event.target.value)}
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
          const signOutTokens = rememberedGroup.signIns
            .map((signIn) => signIn.signOutToken)
            .filter(Boolean);
          if (signOutTokens.length !== ids.length) {
            clearRememberedWorkerGroup();
          } else {
            const params = new URLSearchParams({
              ids: ids.join(","),
              signOutTokens: signOutTokens.join(","),
            });
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
      const rememberedGroup = readRememberedWorkerGroup();
      const signOutTokens = rememberedGroup.signIns
        .filter((signIn) => groupSignOutIds.includes(signIn.id))
        .map((signIn) => signIn.signOutToken)
        .filter(Boolean);
      const requestOptions = groupSignOutIds.length
        ? {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ signInIds: groupSignOutIds, signOutTokens }),
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
  const returnTo = useMemo(() => readLoginReturnPath("/staff/home"), []);

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
      navigateTo(returnTo);
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
  const [sharingExport, setSharingExport] = useState("");

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

  const shareTodayReport = async (format) => {
    setSharingExport(format);
    setMessage("");
    try {
      await shareStaffExportFile(today, format);
    } catch (error) {
      if (error.name !== "AbortError") setMessage(error.message || "This report could not be exported.");
    } finally {
      setSharingExport("");
    }
  };

  if (!staff) return <StaffLoadingScreen />;
  const canManageStaffUsers = isAdminOrOwner(staff);

  return (
    <StaffShell active="home" navigateTo={navigateTo} staff={staff}>
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
          onAction={() => navigateTo("/staff/sign-ins/company")}
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
          eyebrow="Submissions"
          text="Review toolbox talks, site inspections, daily hazard assessments, file backups, and retry failed OneDrive uploads."
          title="Safety Forms"
        >
          <div className="staff-card-actions staff-card-actions-stacked">
            <button className="primary-button" type="button" onClick={() => navigateTo("/staff/forms")}>
              Submitted Forms
            </button>
            <button className="primary-button" type="button" onClick={() => navigateTo("/staff/forms-to-fill-out")}>
              Fill a Form
            </button>
            <button className="primary-button" type="button" onClick={() => navigateTo("/staff/form-templates")}>
              Form Templates / QR Codes
            </button>
          </div>
        </StaffActionCard>

        <StaffActionCard
          actionLabel={canManageStaffUsers ? "Manage staff" : "View staff"}
          eyebrow={canManageStaffUsers ? "Staff security" : "Staff directory"}
          text={
            canManageStaffUsers
              ? "Create named staff accounts, assign owner/admin/staff roles, deactivate accounts, and reset passwords."
              : "View staff names, roles, and account status for this site."
          }
          title="Staff"
          onAction={() => navigateTo("/staff/users")}
        />

        {isAdminOrOwner(staff) ? (
          <StaffActionCard
            actionLabel="Open backups"
            eyebrow="OneDrive readiness"
            text="Review pending and failed form backups, retry failed items, and run retention maintenance."
            title="Backup Queue"
            onAction={() => navigateTo("/staff/backups")}
          >
            <dl className="staff-card-listing">
              <div>
                <dt>OneDrive</dt>
                <dd>{settings.one_drive_backup_enabled ? "Enabled" : "Off"}</dd>
              </div>
              <div>
                <dt>Cleanup</dt>
                <dd>After backup</dd>
              </div>
            </dl>
          </StaffActionCard>
        ) : null}

        {isAdminOrOwner(staff) ? (
          <StaffActionCard
            actionLabel="Open health"
            eyebrow="Operations"
            text="Check database, storage, email, OneDrive readiness, active alerts, and recent job runs."
            title="System Health"
            onAction={() => navigateTo("/staff/health")}
          >
            <dl className="staff-card-listing">
              <div>
                <dt>Alerts</dt>
                <dd>Critical emails only</dd>
              </div>
              <div>
                <dt>Audit</dt>
                <dd>Permanent log</dd>
              </div>
            </dl>
          </StaffActionCard>
        ) : null}

        <StaffActionCard
          eyebrow="Today"
          text={`Exports today's worker sign-ins as CSV, XML, or emails both files to ${formatReportRecipientSummary(
            settings.report_recipient_email,
          )}.`}
          title="Export Reports"
        >
          <div className="staff-card-actions">
            <button disabled={Boolean(sharingExport)} type="button" onClick={() => shareTodayReport("csv")}>
              {sharingExport === "csv" ? "Opening..." : "CSV"}
            </button>
            <button disabled={Boolean(sharingExport)} type="button" onClick={() => shareTodayReport("xml")}>
              {sharingExport === "xml" ? "Opening..." : "XML"}
            </button>
            <button disabled={emailing} type="button" onClick={emailTodayReport}>
              {emailing ? "Emailing..." : "Email"}
            </button>
          </div>
        </StaffActionCard>

        <StaffActionCard
          actionLabel="Open settings"
          eyebrow="Setup"
          text={
            isAdminOrOwner(staff)
              ? "Review site identity, QR links, report delivery, reminder copy, and privacy notes."
              : "Open worker QR links and review privacy notes."
          }
          title="Settings"
          onAction={() => navigateTo("/staff/settings")}
        />

        {isAdminOrOwner(staff) ? (
          <StaffActionCard
            actionLabel="Open audit"
            eyebrow="Accountability"
            text="Search staff actions, login failures, settings updates, worker changes, and backup operations."
            title="Audit Log"
            onAction={() => navigateTo("/staff/audit")}
          >
            <dl className="staff-card-listing">
              <div>
                <dt>Retention</dt>
                <dd>Indefinite</dd>
              </div>
              <div>
                <dt>Access</dt>
                <dd>Owner / Admin</dd>
              </div>
            </dl>
          </StaffActionCard>
        ) : null}
      </section>
    </StaffShell>
  );
}

export function StaffSettingsPage({ navigateTo }) {
  const { staff, setStaff } = useStaffSession(navigateTo);
  const canManageSettings = isAdminOrOwner(staff);
  const [settings, setSettings] = useState(DEFAULT_SITE_SETTINGS);
  const [system, setSystem] = useState(DEFAULT_SYSTEM_STATUS);
  const [profileForm, setProfileForm] = useState(EMPTY_STAFF_PROFILE_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [message, setMessage] = useState("");
  const [recipientDraft, setRecipientDraft] = useState("");

  const reportRecipients = useMemo(
    () => parseReportRecipients(settings.report_recipient_email),
    [settings.report_recipient_email],
  );

  useEffect(() => {
    if (!staff) return;
    setProfileForm({
      display_name: staff.display_name || "",
      email: staff.email || "",
      phone: staff.phone || "",
      username: staff.username || "",
      password: "",
    });
  }, [staff?.id]);

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

  const updateProfileForm = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setMessage("");
    try {
      const body = { ...profileForm };
      if (!body.password) delete body.password;
      const payload = await readApiJson(
        await fetch("/api/staff/profile", {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      setStaff(payload.staff);
      setProfileForm({
        display_name: payload.staff.display_name || "",
        email: payload.staff.email || "",
        phone: payload.staff.phone || "",
        username: payload.staff.username || "",
        password: "",
      });
      setMessage("Personal info saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setProfileSaving(false);
    }
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

  if (!canManageSettings) {
    return (
      <StaffShell active="settings" navigateTo={navigateTo} staff={staff}>
        {message ? <p className="staff-message">{message}</p> : null}
        <div className="staff-settings-grid">
          <StaffProfileSettingsCard
            form={profileForm}
            saving={profileSaving}
            onChange={updateProfileForm}
            onSubmit={saveProfile}
          />

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
              Phone numbers are used for site sign-in records and stay staff-only.
            </p>
          </SettingsSection>
        </div>
      </StaffShell>
    );
  }

  return (
    <StaffShell active="settings" navigateTo={navigateTo} staff={staff}>
      {message ? <p className="staff-message">{message}</p> : null}
      <StaffProfileSettingsCard
        form={profileForm}
        saving={profileSaving}
        onChange={updateProfileForm}
        onSubmit={saveProfile}
      />
      <form className="staff-settings-grid" onSubmit={saveSettings}>
        {canManageSettings ? (
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
        ) : null}

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

        {canManageSettings ? (
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
        ) : null}

        {canManageSettings ? (
          <SettingsSection
            description="Controls whether completed safety forms are copied to the staff OneDrive backup folder."
            title="OneDrive Backup"
          >
            <label className="settings-checkbox">
              <input
                checked={Boolean(settings.one_drive_backup_enabled)}
                type="checkbox"
                onChange={(event) =>
                  updateSetting("one_drive_backup_enabled", event.target.checked)
                }
              />
              <span>
                <strong>OneDrive Backup</strong>
                <small>
                  {settings.one_drive_backup_enabled
                    ? "On - submissions will attempt OneDrive backup when Microsoft settings are configured."
                    : "Off - submissions stay in app storage with backup marked Pending."}
                </small>
              </span>
            </label>
            <div className="settings-status-line">
              <span>Microsoft Graph</span>
              <strong>{system.oneDrive}</strong>
            </div>
            <p className="settings-note">
              Leave this off until the Microsoft tenant, app, drive, and folder values are added.
              Pending backups can be retried later.
            </p>
          </SettingsSection>
        ) : null}

        {canManageSettings ? (
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
        ) : null}

        <SettingsSection
          description="Current guardrails for worker records."
          title="Data & Privacy"
        >
          <ul className="settings-list">
            <li>No medical information or private first aid details.</li>
            <li>Worker phone numbers are personal information and stay staff-only.</li>
            <li>App-side form copies purge after backup and retention rules allow it.</li>
            <li>CSV and XML export are available to staff users.</li>
          </ul>
        </SettingsSection>

        {canManageSettings ? (
          <SettingsSection description="Current service connection status." title="System">
            <div className="system-status-grid">
              <SystemStatus label="Database" value={system.database} />
              <SystemStatus label="Email" value={system.email} />
              <SystemStatus label="SMS" value={system.sms} />
              <SystemStatus label="OneDrive" value={system.oneDrive} />
            </div>
          </SettingsSection>
        ) : null}

        {canManageSettings ? (
          <div className="staff-settings-save">
            <button
              className="primary-button"
              disabled={loading || saving || emailing}
              type="submit"
            >
              {saving ? "Saving..." : "Save settings"}
            </button>
          </div>
        ) : null}
      </form>
    </StaffShell>
  );
}

export function StaffSignInsPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const [date, setDate] = useStaffPageDate();
  const [sort, setSort] = useState("signed_in_at");
  const [dir, setDir] = useState("asc");
  const [group, setGroup] = useState(readStaffRosterGroupFromUrl);
  const [companyFilter, setCompanyFilter] = useState(readStaffRosterCompanyFromUrl);
  const [search, setSearch] = useState("");
  const [selectedSignIn, setSelectedSignIn] = useState(null);
  const [records, setRecords] = useState({ rows: [], groups: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sharingExport, setSharingExport] = useState("");

  const companyOptions = useMemo(
    () => getCheckedInCompanyOptions(records.rows),
    [records.rows],
  );

  const visibleRows = useMemo(
    () => {
      const searchedRows = filterRowsBySearch(records.rows, search);
      if (group !== "company" || !companyFilter) return searchedRows;
      return searchedRows.filter((row) => row.company === companyFilter);
    },
    [companyFilter, group, records.rows, search],
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

  useEffect(() => {
    if (group !== "company") {
      setCompanyFilter("");
      return;
    }
    if (!loading && companyFilter && !companyOptions.includes(companyFilter)) {
      setCompanyFilter("");
    }
  }, [companyFilter, companyOptions, group, loading]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const nextGroup = group === "company" ? group : "";
    const nextCompany = group === "company" && companyFilter ? companyFilter : "";

    if (nextGroup) {
      url.searchParams.set("group", nextGroup);
    } else {
      url.searchParams.delete("group");
    }

    if (nextCompany) {
      url.searchParams.set("company", nextCompany);
    } else {
      url.searchParams.delete("company");
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, [companyFilter, group]);

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

  const shareReport = async (format) => {
    setSharingExport(format);
    setMessage("");
    try {
      await shareStaffExportFile(date, format);
    } catch (error) {
      if (error.name !== "AbortError") setMessage(error.message || "This report could not be exported.");
    } finally {
      setSharingExport("");
    }
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="sign-ins-people" contentWide navigateTo={navigateTo} staff={staff}>
      <section className="staff-toolbar staff-roster-toolbar staff-toolbar-desktop">
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
            <option value="company">Company</option>
          </select>
        </label>
        {group === "company" ? (
          <label className="field">
            <span>Company</span>
            <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
              <option value="">All companies</option>
              {companyOptions.map((company) => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="staff-actions staff-report-buttons">
          <button className="staff-report-button" disabled={Boolean(sharingExport)} type="button" onClick={() => shareReport("csv")}>
            {sharingExport === "csv" ? "Opening..." : "Export CSV"}
          </button>
          <button className="staff-report-button" disabled={Boolean(sharingExport)} type="button" onClick={() => shareReport("xml")}>
            {sharingExport === "xml" ? "Opening..." : "Export XML"}
          </button>
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
            <option value="company">Company</option>
          </select>
        </label>
        {group === "company" ? (
          <label className="field staff-group-field">
            <span>Company</span>
            <select value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)}>
              <option value="">All companies</option>
              {companyOptions.map((company) => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </label>
        ) : null}
        <details className="staff-export-menu">
          <summary>Export</summary>
          <div className="staff-export-menu-panel">
            <button disabled={Boolean(sharingExport)} type="button" onClick={() => shareReport("csv")}>
              <strong>{sharingExport === "csv" ? "Opening..." : "CSV"}</strong>
              <span>Download spreadsheet</span>
            </button>
            <button disabled={Boolean(sharingExport)} type="button" onClick={() => shareReport("xml")}>
              <strong>{sharingExport === "xml" ? "Opening..." : "XML"}</strong>
              <span>Download XML file</span>
            </button>
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
  const [sharingExport, setSharingExport] = useState("");

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

  const openCompanyPeople = (company) => {
    const params = new URLSearchParams({
      date,
      group: "company",
      company,
    });
    navigateTo(`/staff/sign-ins?${params}`);
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

  const shareReport = async (format) => {
    setSharingExport(format);
    setMessage("");
    try {
      await shareStaffExportFile(date, format, "company");
    } catch (error) {
      if (error.name !== "AbortError") setMessage(error.message || "This report could not be exported.");
    } finally {
      setSharingExport("");
    }
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="sign-ins-company" contentWide navigateTo={navigateTo} staff={staff}>
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
          <button className="staff-report-button" disabled={Boolean(sharingExport)} type="button" onClick={() => shareReport("csv")}>
            {sharingExport === "csv" ? "Opening..." : "Export CSV"}
          </button>
          <button className="staff-report-button" disabled={Boolean(sharingExport)} type="button" onClick={() => shareReport("xml")}>
            {sharingExport === "xml" ? "Opening..." : "Export XML"}
          </button>
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
            <button disabled={Boolean(sharingExport)} type="button" onClick={() => shareReport("csv")}>
              <strong>{sharingExport === "csv" ? "Opening..." : "CSV"}</strong>
              <span>Download spreadsheet</span>
            </button>
            <button disabled={Boolean(sharingExport)} type="button" onClick={() => shareReport("xml")}>
              <strong>{sharingExport === "xml" ? "Opening..." : "XML"}</strong>
              <span>Download XML file</span>
            </button>
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
          <CompanySummaryTable
            loading={loading}
            rows={companyRows}
            onSelectCompany={openCompanyPeople}
          />
        </div>

        <div className="mobile-roster">
          <CompactCompanySummaryList
            loading={loading}
            rows={companyRows}
            totalWorkers={totalWorkers}
            onSelectCompany={openCompanyPeople}
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
    <StaffShell active="trends" contentWide navigateTo={navigateTo} staff={staff}>
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

export function FormTemplateShareLinkPage({ navigateTo, routePath }) {
  const token = routePath.split("/").filter(Boolean)[1] || "";
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
    fetch(`/api/form-links/${token}`, { credentials: "include" })
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
  }, [token]);

  useEffect(() => {
    let active = true;
    setAuthLoading(true);
    Promise.all([
      readOptionalSession("/api/auth/worker-me", "worker"),
      readOptionalSession("/api/auth/me", "staff"),
    ])
      .then(([worker, staff]) => {
        if (!active) return;
        setAuth({ worker, staff });
        if (worker && !staff) setSubmitterKind("worker");
        if (staff && !worker) setSubmitterKind("staff");
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
              {staffSubmitter.name} / Appia Staff
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!selectedSubmitter) return <WorkerFormLoadingScreen />;

  const submitterParam = encodeURIComponent(submitterKind);
  return (
    <FormSubmissionExperience
      allowOfflineQueue={submitterKind === "worker"}
      formType={template.form_type}
      navigateTo={navigateTo}
      redirectUnknownForm={false}
      submissionEndpoint={`/api/form-links/${token}/submissions?submitter=${submitterParam}`}
      submitter={selectedSubmitter}
      submitterKind={submitterKind}
      templateEndpoint={`/api/form-links/${token}/published?submitter=${submitterParam}`}
      uploadEndpoint={`/api/form-links/${token}/submissions/file-upload-url?submitter=${submitterParam}`}
    />
  );
}

export function WorkerFormsHomePage({ navigateTo }) {
  const { worker } = useWorkerSession(navigateTo);
  const {
    queuedCount,
    queueMessage,
    syncing,
    syncNow,
  } = useWorkerSubmissionQueue(worker);
  const [forms, setForms] = useState(SAFETY_FORM_TYPES);
  const [formsLoading, setFormsLoading] = useState(true);
  const [formsMessage, setFormsMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    const loadForms = async () => {
      if (!worker) return;
      setFormsLoading(true);
      setFormsMessage("");
      try {
        const payload = await readApiJson(
          await fetch("/api/worker/form-templates", { credentials: "include" }),
        );
        const rows = (payload.rows || []).map((row) => ({
          id: row.form_type,
          label: row.label,
          description: row.description || "",
          rendererType: row.renderer_type,
        }));
        if (active) setForms(rows.length ? rows : SAFETY_FORM_TYPES);
      } catch (error) {
        if (active) {
          setForms(SAFETY_FORM_TYPES);
          setFormsMessage(error.message);
        }
      } finally {
        if (active) setFormsLoading(false);
      }
    };
    loadForms();
    return () => {
      active = false;
    };
  }, [worker]);

  const signOut = async () => {
    setSigningOut(true);
    await fetch("/api/auth/worker-logout", {
      method: "POST",
      credentials: "include",
    });
    clearCachedWorkerSession();
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

        {queuedCount ? (
          <OfflineQueueBanner
            count={queuedCount}
            message={queueMessage}
            syncing={syncing}
            onSync={syncNow}
          />
        ) : null}

        {formsMessage ? <p className="form-message error">{formsMessage}</p> : null}
        <div className="safety-form-grid">
          {formsLoading ? <p className="empty-state">Loading forms...</p> : null}
          {!formsLoading && forms.map((form) => (
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

  if (!worker) return <WorkerFormLoadingScreen />;

  return (
    <FormSubmissionExperience
      allowOfflineQueue
      formType={formType}
      navigateTo={navigateTo}
      submitter={worker}
      submitterKind="worker"
    />
  );
}

export function StaffFormsToFillOutPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const [forms, setForms] = useState([]);
  const [formsLoading, setFormsLoading] = useState(true);
  const [formsMessage, setFormsMessage] = useState("");

  useEffect(() => {
    let active = true;
    const loadForms = async () => {
      if (!staff) return;
      setFormsLoading(true);
      setFormsMessage("");
      try {
        const payload = await readApiJson(
          await fetch("/api/staff/form-templates", { credentials: "include" }),
        );
        const rows = (payload.rows || []).filter(isStaffFillableFormTemplate);
        if (active) setForms(rows);
      } catch (error) {
        if (active) setFormsMessage(error.message);
      } finally {
        if (active) setFormsLoading(false);
      }
    };
    loadForms();
    return () => {
      active = false;
    };
  }, [staff]);

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="form-templates" contentWide navigateTo={navigateTo} staff={staff}>
      {formsMessage ? <p className="staff-message">{formsMessage}</p> : null}
      <section className="staff-table-panel staff-fill-forms-panel">
        <div className="staff-page-heading">
          <div>
            <p>Form templates</p>
            <h1>Forms To Fill Out</h1>
          </div>
          <div className="staff-page-heading-actions">
            <button type="button" onClick={() => navigateTo("/staff/form-templates")}>
              Manage templates
            </button>
          </div>
        </div>

        {formsLoading ? (
          <p className="empty-state">Loading forms...</p>
        ) : forms.length ? (
          <div className="staff-fill-form-grid" aria-label="Forms to fill out">
            {forms.map((form) => (
              <button
                className="staff-fill-form-card"
                key={form.form_type}
                type="button"
                onClick={() => navigateTo(form.shareLink.urlPath)}
              >
                <span>{form.renderer_type === "template" ? "Template form" : "Special form"}</span>
                <strong>{form.label}</strong>
                {form.description ? <small>{form.description}</small> : null}
                <em>Open form</em>
              </button>
            ))}
          </div>
        ) : (
          <div className="staff-fill-forms-empty">
            <p className="empty-state">
              No forms are ready to fill out. Publish a template, show it to workers, and its QR link will appear here.
            </p>
            <button className="primary-button" type="button" onClick={() => navigateTo("/staff/form-templates")}>
              Manage templates
            </button>
          </div>
        )}
      </section>
    </StaffShell>
  );
}

function FormSubmissionExperience({
  allowOfflineQueue = false,
  formType,
  navigateTo,
  redirectUnknownForm = true,
  submissionEndpoint = "/api/worker/submissions",
  submitter,
  submitterKind = "worker",
  templateEndpoint,
  uploadEndpoint = "/api/worker/submissions/file-upload-url",
}) {
  const worker = submitter;
  const isToolboxTalk = formType === "toolbox_talk";
  const isSiteInspection = formType === "site_inspection";
  const {
    queuedCount,
    queueMessage,
    refreshQueue,
    syncing,
    syncNow,
  } = useWorkerSubmissionQueue(allowOfflineQueue ? worker : null);
  const [formTemplate, setFormTemplate] = useState(null);
  const [formLoading, setFormLoading] = useState(true);
  const [formError, setFormError] = useState("");
  const isTemplateDriven = formTemplate?.renderer_type === "template";
  const formTemplateSchema = formTemplate?.publishedVersion?.schema || formTemplate?.draftVersion?.schema || formTemplate?.schema;
  const isToolboxTalkDigital =
    isToolboxTalk || (isTemplateDriven && isToolboxTalkTemplateSchema(formTemplateSchema, formTemplate));
  const isSiteInspectionDigital =
    isSiteInspection || (isTemplateDriven && isSiteInspectionTemplateSchema(formTemplateSchema, formTemplate));
  const form = formTemplate
    ? { id: formTemplate.form_type, label: formTemplate.label, description: formTemplate.description || "" }
    : SAFETY_FORM_TYPES.find((item) => item.id === formType);
  const [mode, setMode] = useState(() =>
    isToolboxTalk || isSiteInspection ? "fill_form" : "",
  );
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "", date: "" });
  const scannedCopyInputRef = useRef(null);
  const submitted = status.type === "success" || status.type === "queued";
  const formTypeClass = slugifyTemplateId(formType);
  const hideDuplicateHeaderTitle =
    isTemplateDriven &&
    normalizeComparableText(form?.label) &&
    Array.isArray(formTemplateSchema?.sections) &&
    formTemplateSchema.sections.some(
      (section) => normalizeComparableText(section?.title) === normalizeComparableText(form?.label),
    );

  useEffect(() => {
    let active = true;
    const loadFormTemplate = async () => {
      if (!worker || !formType) return;
      setFormLoading(true);
      setFormError("");
      try {
        const endpoint = templateEndpoint || `/api/worker/form-templates/${formType}/published`;
        const payload = await readApiJson(
          await fetch(endpoint, {
            credentials: "include",
          }),
        );
        if (active) setFormTemplate(payload.template || null);
      } catch (error) {
        if (active) {
          setFormTemplate(null);
          setFormError(error.message);
        }
      } finally {
        if (active) setFormLoading(false);
      }
    };
    loadFormTemplate();
    return () => {
      active = false;
    };
  }, [formType, templateEndpoint, worker]);

  useEffect(() => {
    if (!worker || formLoading) return;
    if (redirectUnknownForm && !formTemplate && !SAFETY_FORM_TYPES.some((item) => item.id === formType)) {
      navigateTo("/forms");
    }
  }, [formLoading, formTemplate, formType, navigateTo, redirectUnknownForm, worker]);

  useEffect(() => {
    setMode(isToolboxTalkDigital || isSiteInspectionDigital || isTemplateDriven ? "fill_form" : "");
    setFile(null);
    setNotes("");
    setStatus({ type: "", message: "", date: "" });
  }, [formType, isSiteInspectionDigital, isTemplateDriven, isToolboxTalkDigital]);

  useEffect(() => {
    if (
      !worker ||
      !form ||
      mode !== "fill_form" ||
      isToolboxTalkDigital ||
      formType === "site_inspection" ||
      isTemplateDriven
    ) {
      return;
    }
    const draft = readWorkerFormDraft(worker, formType, "fill_form");
    if (typeof draft?.notes === "string") setNotes(draft.notes);
  }, [form, formType, isTemplateDriven, mode, worker]);

  useEffect(() => {
    if (
      !worker ||
      !form ||
      mode !== "fill_form" ||
      isToolboxTalkDigital ||
      formType === "site_inspection" ||
      isTemplateDriven
    ) {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      if (notes.trim()) {
        writeWorkerFormDraft(worker, formType, "fill_form", { notes });
      } else {
        clearWorkerFormDraft(worker, formType, "fill_form");
      }
    }, DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [form, formType, isTemplateDriven, mode, notes, worker]);

  const submitFilledForm = async (event) => {
    event.preventDefault();
    await submitSubmission({
      formType,
      submissionMode: "fill_form",
      notes,
    });
  };

  const submitToolboxTalkForm = async (formData) => {
    await submitSubmission({
      formType,
      submissionMode: "fill_form",
      formData,
    });
  };

  const submitSiteInspectionForm = async (formData) => {
    await submitSubmission({
      formType,
      submissionMode: "fill_form",
      formData,
    });
  };

  const submitTemplateForm = async (formData) => {
    await submitSubmission({
      formType,
      submissionMode: "fill_form",
      formData,
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

  const handleScannedCopyFile = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    event.target.value = "";
    if (!selectedFile) return;
    setCameraOpen(false);
    setFile(selectedFile);
    setMode("submit_file");
    setStatus({ type: "", message: "", date: "" });
  };

  const openScannedCopyPicker = () => {
    setStatus({ type: "", message: "", date: "" });
    scannedCopyInputRef.current?.click();
  };

  const submitUpload = async (selectedFile) => {
    const payload = await readApiJson(
      await fetch(uploadEndpoint, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          formType,
          submitterKind,
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
        await fetch(submissionEndpoint, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...body, submitterKind }),
        }),
      );
      clearWorkerFormDraft(worker, body.formType, body.submissionMode);
      setStatus({
        type: "success",
        message: "Your form has been submitted",
        date: formatDateString(payload.submission.submitted_date_vancouver),
      });
    } catch (error) {
      if (allowOfflineQueue && body.submissionMode === "fill_form" && shouldQueueWorkerSubmission(error)) {
        try {
          const queued = queueWorkerSubmission(worker, body);
          clearWorkerFormDraft(worker, body.formType, body.submissionMode);
          refreshQueue();
          setStatus({
            type: "queued",
            message: "Your form has been saved on this device",
            date: formatDateString(queued.submittedDateVancouver),
          });
        } catch (queueError) {
          setStatus({ type: "error", message: queueError.message, date: "" });
        }
      } else {
        setStatus({ type: "error", message: error.message, date: "" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!worker || formLoading) return <WorkerFormLoadingScreen />;

  if (!form) {
    return (
      <main className="public-page form-platform-page">
        <section className="form-platform-shell">
          <p className="form-message error">{formError || "This form is not available."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="public-page form-platform-page">
      <section
        className={[
          "form-platform-shell",
          formTypeClass ? `form-platform-shell-${formTypeClass}` : "",
        ].filter(Boolean).join(" ")}
      >
        <input
          ref={scannedCopyInputRef}
          accept={SCANNED_COPY_ACCEPT}
          className="native-file-input"
          type="file"
          onChange={handleScannedCopyFile}
        />
        <header className="form-platform-header">
          <div>
            <h1 aria-hidden={hideDuplicateHeaderTitle ? "true" : undefined}>{form.label}</h1>
            <p>{worker.name} / {worker.company}</p>
          </div>
        </header>

        {queuedCount ? (
          <OfflineQueueBanner
            count={queuedCount}
            message={queueMessage}
            syncing={syncing}
            onSync={syncNow}
          />
        ) : null}

        {formError ? <p className="form-message error">{formError}</p> : null}
        <div
          className={[
            submitted ? "worker-form submitted form-submit-panel" : "worker-form form-submit-panel",
            formTypeClass ? `form-submit-panel-${formTypeClass}` : "",
          ].filter(Boolean).join(" ")}
        >
          {submitted ? (
            <div className="worker-thank-you" role="status">
              <h1>Thank You</h1>
              {status.type === "queued" ? (
                <>
                  <p>{status.message} - {status.date}</p>
                  <p>It will submit automatically when this device is online.</p>
                </>
              ) : (
                <p>Your form has been submitted - {status.date}</p>
              )}
            </div>
          ) : (
            <>
              {!mode && !isToolboxTalkDigital && !isTemplateDriven ? (
                <div className="submission-mode-grid">
                  <button type="button" onClick={() => setMode("submit_file")}>
                    <strong>Submit File</strong>
                    <span>Upload a document, photo, or camera image.</span>
                  </button>
                  <button type="button" onClick={() => setMode("fill_form")}>
                    <strong>Fill Form</strong>
                    <span>{isSiteInspection ? "Use the fast digital inspection." : "Use the simple placeholder form."}</span>
                  </button>
                </div>
              ) : null}

              {mode === "submit_file" ? (
                <form className="submission-form" onSubmit={submitFileForm}>
                  {isToolboxTalkDigital ? (
                    <div className="scanned-copy-picker">
                      <button type="button" onClick={openScannedCopyPicker}>
                        {file ? "Change scanned copy" : "Choose scanned copy"}
                      </button>
                    </div>
                  ) : (
                    <div className="file-choice-grid">
                      <FileChoice label="Upload File" accept={SCANNED_COPY_ACCEPT} onFile={setFile} />
                      <FileChoice label="Upload Photo" accept="image/*" onFile={setFile} />
                      <button className="file-choice" type="button" onClick={() => setCameraOpen(true)}>
                        <strong>Take Photo</strong>
                        <span>Open camera</span>
                      </button>
                    </div>
                  )}
                  {cameraOpen ? (
                    <CameraCaptureDialog
                      onCapture={(capturedFile) => {
                        setFile(capturedFile);
                        setCameraOpen(false);
                      }}
                      onClose={() => setCameraOpen(false)}
                    />
                  ) : null}
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
                    <button
                      type="button"
                      onClick={() => setMode(isToolboxTalkDigital || isSiteInspectionDigital || isTemplateDriven ? "fill_form" : "")}
                    >
                      {isToolboxTalkDigital || isSiteInspectionDigital || isTemplateDriven ? "Back to digital form" : "Change option"}
                    </button>
                    <button className="primary-button" disabled={submitting} type="submit">
                      {submitting ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </form>
              ) : null}

              {mode === "fill_form" ? (
                isToolboxTalkDigital ? (
                  <>
                    <div className="toolbox-fast-actions">
                      <div>
                        <strong>Digital form</strong>
                        <span>Fast mobile version</span>
                      </div>
                      <button type="button" onClick={openScannedCopyPicker}>
                        Submit scanned copy
                      </button>
                    </div>
                    <ToolboxTalkDigitalForm
                      formType={formType}
                      formTemplate={formTemplate}
                      onUploadFile={submitUpload}
                      submitting={submitting}
                      worker={worker}
                      onSubmit={submitToolboxTalkForm}
                    />
                  </>
                ) : isSiteInspectionDigital ? (
                  <>
                    <div className="toolbox-fast-actions">
                      <div>
                        <strong>Digital inspection</strong>
                        <span>Fast mobile version</span>
                      </div>
                      <button type="button" onClick={openScannedCopyPicker}>
                        Submit scanned copy
                      </button>
                    </div>
                    <SiteInspectionDigitalForm
                      formType={formType}
                      formTemplate={formTemplate}
                      onUploadFile={submitUpload}
                      submitting={submitting}
                      worker={worker}
                      onSubmit={submitSiteInspectionForm}
                    />
                  </>
                ) : isTemplateDriven ? (
                  <TemplateDrivenWorkerForm
                    formTemplate={formTemplate}
                    formType={formType}
                    formLabel={form.label}
                    openScannedCopyPicker={openScannedCopyPicker}
                    onUploadFile={submitUpload}
                    submitting={submitting}
                    templateEndpoint={templateEndpoint}
                    worker={worker}
                    onSubmit={submitTemplateForm}
                  />
                ) : (
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
                )
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

function OfflineQueueBanner({ count, message, onSync, syncing }) {
  return (
    <aside className="offline-queue-banner" role="status">
      <div>
        <strong>{count} saved form{count === 1 ? "" : "s"} waiting to sync</strong>
        <span>{message || "This device will submit them automatically when it is online."}</span>
      </div>
      <button disabled={syncing || !isBrowserOnline()} type="button" onClick={onSync}>
        {syncing ? "Syncing..." : "Sync now"}
      </button>
    </aside>
  );
}

function ToolboxTalkDigitalForm({ formTemplate, formType = "toolbox_talk", onSubmit, onUploadFile, submitting, worker }) {
  const draftFormType = formType || formTemplate?.form_type || "toolbox_talk";
  const restoredDraftRef = useRef(readWorkerFormDraft(worker, draftFormType, "fill_form"));
  const optionalLayoutAppliedRef = useRef(false);
  const validationTargetsRef = useRef({});
  const [form, setForm] = useState(
    () => restoredDraftRef.current?.form || initialToolboxTalkForm(worker),
  );
  const [draftRestored, setDraftRestored] = useState(Boolean(restoredDraftRef.current?.form));
  const [draftSavedAt, setDraftSavedAt] = useState(restoredDraftRef.current?.savedAt || "");
  const [error, setError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const selectedTopicKeys = useMemo(
    () => new Set(form.topics.selected.map((topic) => topicKey(topic))),
    [form.topics.selected],
  );
  const recentToolbox = useMemo(readToolboxTalkRecents, []);
  const savedDefaults = useMemo(readToolboxTalkDefaults, []);
  const [topicSearch, setTopicSearch] = useState("");
  const [attendeeNameInput, setAttendeeNameInput] = useState("");
  const toolboxLayout = useMemo(
    () =>
      getToolboxTalkLayout(
        formTemplate?.publishedVersion?.schema || formTemplate?.draftVersion?.schema || formTemplate?.schema,
      ),
    [formTemplate],
  );
  const enabledBlocks = toolboxLayout.enabledBlocks;
  const genericSchema = toolboxLayout.genericSchema || createGenericTemplateSchemaFromSections(
    formTemplate?.publishedVersion?.schema || formTemplate?.draftVersion?.schema || formTemplate?.schema,
    [],
    "toolbox_talk",
  );
  const topicSettings = toolboxLayout.blockSettings.toolbox_topics || getToolboxTopicSettings();
  const incidentReviewSettings = normalizeToolboxCompositeSettings(
    toolboxLayout.blockSettings.toolbox_incident_review,
    "toolbox_incident_review",
  );
  const safetyConcernSettings = normalizeToolboxCompositeSettings(
    toolboxLayout.blockSettings.toolbox_safety_concerns,
    "toolbox_safety_concerns",
  );
  const enabledTopicCategoryIds = topicSettings.enabledCategoryIds;
  const [optionalOpen, setOptionalOpen] = useState(() => {
    const draftForm = restoredDraftRef.current?.form;
    return {
      review: toolboxIncidentHasValues(draftForm?.incidentReview),
      concerns: toolboxConcernsHaveValues(draftForm?.safetyConcerns),
      comments: hasTextValue(draftForm?.additionalComments),
    };
  });
  const recentTopicLabels = useMemo(
    () =>
      recentToolbox.topicLabels
        .filter((label) => findToolboxTopic(label, enabledTopicCategoryIds))
        .filter((label, index, labels) => labels.indexOf(label) === index)
        .slice(0, 6),
    [enabledTopicCategoryIds, recentToolbox.topicLabels],
  );
  const quickTopicLabels = useMemo(
    () =>
      topicSettings.commonTopicLabels
        .filter((label) => findToolboxTopic(label, enabledTopicCategoryIds))
        .filter((label) => !recentTopicLabels.includes(label)),
    [enabledTopicCategoryIds, recentTopicLabels, topicSettings.commonTopicLabels],
  );
  const filteredTopicGroups = useMemo(
    () => filterToolboxTopicGroups(topicSearch, enabledTopicCategoryIds),
    [enabledTopicCategoryIds, topicSearch],
  );
  const enabledBlockSet = useMemo(() => new Set(enabledBlocks), [enabledBlocks]);
  const attendeeNames = useMemo(
    () =>
      normalizeToolboxAttendanceRows(form.attendance).map((row) => row.name),
    [form.attendance],
  );
  const missingFieldKeys = useMemo(
    () => (submitAttempted ? getToolboxTalkMissingFields(form, attendeeNameInput, toolboxLayout, worker) : []),
    [attendeeNameInput, form, submitAttempted, toolboxLayout, worker],
  );
  const missingFieldSet = useMemo(() => new Set(missingFieldKeys), [missingFieldKeys]);
  const hasSavedDefaults = Boolean(
    savedDefaults.projectName || savedDefaults.address || savedDefaults.supervisor,
  );
  const registerValidationTarget = (field) => (element) => {
    if (element) {
      validationTargetsRef.current[field] = element;
      return;
    }
    delete validationTargetsRef.current[field];
  };
  const isFieldInvalid = (field) => missingFieldSet.has(field);
  const meetingInfoInvalid = missingFieldKeys.some((field) => field.startsWith("header."));
  const topicsInvalid = isFieldInvalid("topics");
  const attendanceInvalid = isFieldInvalid("attendance");
  const finalCheckInvalid = missingFieldKeys.some((field) => field.startsWith("confirmation."));
  const topicLabelIsSelected = (label) => {
    const match = findToolboxTopic(label, enabledTopicCategoryIds);
    return match ? selectedTopicKeys.has(topicKey(createToolboxTopic(match.group, match.label))) : false;
  };

  useEffect(() => {
    if (!submitAttempted) return;
    const nextMissing = getToolboxTalkMissingFields(form, attendeeNameInput, toolboxLayout, worker);
    setError(nextMissing.length ? toolboxValidationMessage(nextMissing[0], toolboxLayout) : "");
  }, [attendeeNameInput, form, submitAttempted, toolboxLayout, worker]);

  useEffect(() => {
    if (optionalLayoutAppliedRef.current || restoredDraftRef.current?.form) return;
    optionalLayoutAppliedRef.current = true;
    setOptionalOpen((current) => ({
      ...current,
      review: toolboxLayout.blockSettings.toolbox_incident_review?.defaultCollapsed === false,
      concerns: toolboxLayout.blockSettings.toolbox_safety_concerns?.defaultCollapsed === false,
    }));
  }, [toolboxLayout]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (isToolboxTalkDraftMeaningful(form, genericSchema, worker)) {
        const savedAt = writeWorkerFormDraft(worker, draftFormType, "fill_form", { form });
        setDraftSavedAt(savedAt);
        return;
      }
      clearWorkerFormDraft(worker, draftFormType, "fill_form");
      setDraftSavedAt("");
    }, DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [draftFormType, form, genericSchema, worker]);

  const updateHeader = (field, value) => {
    setForm((current) => ({
      ...current,
      header: { ...current.header, [field]: value },
    }));
  };

  const updateGenericAnswers = (answers) => {
    setForm((current) => ({
      ...current,
      answers,
    }));
  };

  const updateTopics = (field, value) => {
    setForm((current) => ({
      ...current,
      topics: { ...current.topics, [field]: value },
    }));
  };

  const updateIncident = (field, value) => {
    setForm((current) => ({
      ...current,
      incidentReview: { ...current.incidentReview, [field]: value },
    }));
  };

  const updateConcern = (index, field, value) => {
    setForm((current) => ({
      ...current,
      safetyConcerns: current.safetyConcerns.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const updateConfirmation = (field, value) => {
    setForm((current) => ({
      ...current,
      confirmation: { ...current.confirmation, [field]: value },
    }));
  };

  const toggleTopic = (group, label) => {
    const topic = {
      categoryId: group.id,
      categoryLabel: group.label,
      topicId: slugifyTopic(label),
      label,
    };
    const key = topicKey(topic);
    setForm((current) => {
      const selected = current.topics.selected.some((item) => topicKey(item) === key)
        ? current.topics.selected.filter((item) => topicKey(item) !== key)
        : [...current.topics.selected, topic];
      return {
        ...current,
        topics: { ...current.topics, selected },
      };
    });
  };

  const toggleTopicByLabel = (label) => {
    const match = findToolboxTopic(label, enabledTopicCategoryIds);
    if (!match) return;
    toggleTopic(match.group, match.label);
  };

  const addTopicLabels = (labels) => {
    const topics = labels.map((label) => findToolboxTopic(label, enabledTopicCategoryIds)).filter(Boolean);
    if (!topics.length) return;
    setForm((current) => {
      const existing = new Set(current.topics.selected.map(topicKey));
      const next = [...current.topics.selected];
      topics.forEach(({ group, label }) => {
        const topic = createToolboxTopic(group, label);
        if (!existing.has(topicKey(topic))) {
          next.push(topic);
          existing.add(topicKey(topic));
        }
      });
      return {
        ...current,
        topics: { ...current.topics, selected: next },
      };
    });
  };

  const toggleOptional = (section) => {
    setOptionalOpen((current) => ({ ...current, [section]: !current[section] }));
  };

  const applyLastJobSetup = () => {
    setForm((current) => ({
      ...current,
      header: {
        ...current.header,
        projectName: savedDefaults.projectName || current.header.projectName,
        address: savedDefaults.address || current.header.address,
        supervisor: savedDefaults.supervisor || current.header.supervisor,
      },
    }));
  };

  const addAttendeeNames = (value) => {
    const names = splitToolboxAttendeeNames(value);
    if (!names.length) return;
    setForm((current) => addAttendeeNameToToolboxForm(current, names));
  };

  const submitAttendeeName = () => {
    const names = splitToolboxAttendeeNames(attendeeNameInput);
    if (!names.length) return;
    addAttendeeNames(names);
    setAttendeeNameInput("");
    setError("");
  };

  const handleAttendeeNameKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitAttendeeName();
  };

  const addConcern = () => {
    setForm((current) => ({
      ...current,
      safetyConcerns: [...current.safetyConcerns, { ...EMPTY_SAFETY_CONCERN }],
    }));
  };

  const removeConcern = (index) => {
    setForm((current) => ({
      ...current,
      safetyConcerns:
        current.safetyConcerns.length === 1
          ? [{ ...EMPTY_SAFETY_CONCERN }]
          : current.safetyConcerns.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const removeAttendee = (index) => {
    setForm((current) => ({
      ...current,
      attendance: normalizeToolboxAttendanceRows(current.attendance)
        .filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const startFresh = () => {
    clearWorkerFormDraft(worker, draftFormType, "fill_form");
    setForm(initialToolboxTalkForm(worker));
    setAttendeeNameInput("");
    setDraftRestored(false);
    setDraftSavedAt("");
    setError("");
    setSubmitAttempted(false);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const formForSubmit = splitToolboxAttendeeNames(attendeeNameInput).length
      ? addAttendeeNameToToolboxForm(form, attendeeNameInput)
      : form;
    if (formForSubmit !== form) {
      setForm(formForSubmit);
      setAttendeeNameInput("");
    }
    const nextMissingFields = getToolboxTalkMissingFields(formForSubmit, "", toolboxLayout, worker);
    if (nextMissingFields.length) {
      setSubmitAttempted(true);
      setError(toolboxValidationMessage(nextMissingFields[0], toolboxLayout));
      scrollToToolboxValidationTarget(validationTargetsRef.current, nextMissingFields[0]);
      return;
    }
    setError("");
    setSubmitAttempted(false);
    rememberToolboxTalkDefaults(formForSubmit);
    rememberToolboxTalkRecents(formForSubmit);
    await onSubmit(cleanToolboxTalkClientForm(formForSubmit, genericSchema, worker, toolboxLayout));
  };

  return (
    <form className="submission-form toolbox-talk-form" noValidate onSubmit={submitForm}>
      {draftRestored || draftSavedAt ? (
        <div className="offline-draft-status">
          <div>
            <strong>{draftRestored ? "Draft restored" : "Draft saved"}</strong>
            {draftSavedAt ? <span>Saved {formatCompactTime(draftSavedAt)}</span> : null}
          </div>
          {draftRestored ? (
            <button type="button" onClick={startFresh}>
              Start fresh
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="template-runtime-section-grid">
      {toolboxLayout.headerFields.length ? (
        <section
          className={templateRuntimeSectionClassName(
            "toolbox_meeting_info",
            toolboxLayout.meetingInfo,
            meetingInfoInvalid ? "toolbox-section-invalid" : "",
          )}
        >
          <div className="toolbox-section-heading">
            <h2>{toolboxLayout.meetingInfo.title || "Meeting Info"}</h2>
            {hasSavedDefaults ? (
              <button type="button" onClick={applyLastJobSetup}>
                Use last job
              </button>
            ) : (
              <span>
                {toolboxLayout.headerFields.some((field) => field.required) ? "Required" : "Optional"}
              </span>
            )}
          </div>
          {toolboxLayout.meetingInfo.description ? (
            <p className="toolbox-section-description">{toolboxLayout.meetingInfo.description}</p>
          ) : null}
          <div className="toolbox-field-grid">
            {toolboxLayout.headerFields.map((field) => {
              const fieldName = `header.${field.key}`;
              const invalid = isFieldInvalid(fieldName);
              const inputType = field.type === "date" || field.type === "time" ? field.type : "text";
              return (
                <label className={invalid ? "toolbox-field-invalid" : ""} key={field.id || field.key}>
                  <span>{field.label || field.key}</span>
                  <input
                    aria-invalid={invalid ? "true" : undefined}
                    ref={registerValidationTarget(fieldName)}
                    required={Boolean(field.required)}
                    type={inputType}
                    value={form.header[field.key] || ""}
                    onChange={(event) => updateHeader(field.key, event.target.value)}
                  />
                  {field.helperText ? <small>{field.helperText}</small> : null}
                </label>
              );
            })}
          </div>
        </section>
        ) : null}

        {enabledBlockSet.has("toolbox_topics") ? (
      <section
        className={templateRuntimeSectionClassName(
          "toolbox_topics",
          { settings: toolboxLayout.blockSettings.toolbox_topics },
          topicsInvalid ? "toolbox-section-invalid" : "",
        )}
        ref={registerValidationTarget("topics")}
      >
        <div className="toolbox-section-heading">
          <h2>{toolboxLayout.blockLabels.toolbox_topics || "Topics Discussed"}</h2>
          <span>{form.topics.selected.length} selected</span>
        </div>
        <div className="toolbox-topic-shortcuts">
          {topicSettings.showCommon && recentTopicLabels.length ? (
            <div className="toolbox-shortcut-group">
              <div>
                <strong>Recent</strong>
                <button type="button" onClick={() => addTopicLabels(recentTopicLabels)}>
                  Use recent
                </button>
              </div>
              <div className="toolbox-chip-row">
                {recentTopicLabels.map((label) => (
                  <button
                    className={topicLabelIsSelected(label) ? "topic-chip active" : "topic-chip"}
                    key={`recent-${label}`}
                    type="button"
                    onClick={() => toggleTopicByLabel(label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {topicSettings.showCommon && quickTopicLabels.length ? (
            <div className="toolbox-shortcut-group">
              <div>
                <strong>Common</strong>
              </div>
              <div className="toolbox-chip-row">
                {quickTopicLabels.map((label) => (
                  <button
                    className={topicLabelIsSelected(label) ? "topic-chip active" : "topic-chip"}
                    key={`quick-${label}`}
                    type="button"
                    onClick={() => toggleTopicByLabel(label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {topicSettings.showSearch ? (
            <label className="toolbox-search-field">
              <span>Search topics</span>
              <input
                inputMode="search"
                placeholder="Fall, WHMIS, access..."
                type="search"
                value={topicSearch}
                onChange={(event) => setTopicSearch(event.target.value)}
              />
            </label>
          ) : null}
        </div>
        <div className="toolbox-topic-list">
          {filteredTopicGroups.map((group) => (
            <details
              className="toolbox-topic-group"
              key={group.id}
              open={topicSearch.trim() ? true : undefined}
            >
              <summary>{group.label}</summary>
              <div className="toolbox-topic-chip-grid">
                {group.topics.map((label) => {
                  const active = selectedTopicKeys.has(
                    topicKey({ categoryId: group.id, topicId: slugifyTopic(label) }),
                  );
                  return (
                    <button
                      className={active ? "topic-chip active" : "topic-chip"}
                      key={label}
                      type="button"
                      onClick={() => toggleTopic(group, label)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
        {!filteredTopicGroups.length ? (
          <p className="empty-state">No topics match that search.</p>
        ) : null}
        <label className={topicsInvalid ? "toolbox-field-invalid" : ""}>
          <span>Additional topics / procedures reviewed</span>
          <textarea
            aria-invalid={topicsInvalid ? "true" : undefined}
            rows="4"
            placeholder="Procedure name, revision/date, or other topic details"
            value={form.topics.other}
            onChange={(event) => updateTopics("other", event.target.value)}
          />
        </label>
      </section>
        ) : null}

        {enabledBlockSet.has("toolbox_incident_review") ? (
      <section
        className={templateRuntimeSectionClassName(
          "toolbox_incident_review",
          { settings: toolboxLayout.blockSettings.toolbox_incident_review },
          optionalOpen.review ? "" : "collapsed",
        )}
      >
        <div className="toolbox-section-heading">
          <h2>{toolboxLayout.blockLabels.toolbox_incident_review || "Review Notes"}</h2>
          <button type="button" onClick={() => toggleOptional("review")}>
            {optionalOpen.review ? incidentReviewSettings.hideButtonLabel : incidentReviewSettings.openButtonLabel}
          </button>
        </div>
        {optionalOpen.review ? (
          <div className="toolbox-field-grid compact">
            {visibleToolboxCompositeFields(incidentReviewSettings).map((field) => {
              if (
                field.conditionalKey &&
                (!toolboxCompositeFieldIsVisible(incidentReviewSettings, field.conditionalKey) ||
                  form.incidentReview[field.conditionalKey] !== field.conditionalValue)
              ) {
                return null;
              }
              return (
                <ToolboxIncidentReviewField
                  field={field}
                  key={field.key}
                  value={form.incidentReview[field.key]}
                  onChange={(value) => updateIncident(field.key, value)}
                />
              );
            })}
          </div>
        ) : null}
      </section>
        ) : null}

        {enabledBlockSet.has("toolbox_safety_concerns") ? (
      <section
        className={templateRuntimeSectionClassName(
          "toolbox_safety_concerns",
          { settings: toolboxLayout.blockSettings.toolbox_safety_concerns },
          optionalOpen.concerns ? "" : "collapsed",
        )}
      >
        <div className="toolbox-section-heading">
          <h2>{toolboxLayout.blockLabels.toolbox_safety_concerns || "Safety Concerns"}</h2>
          <button type="button" onClick={() => toggleOptional("concerns")}>
            {optionalOpen.concerns ? safetyConcernSettings.hideButtonLabel : safetyConcernSettings.openButtonLabel}
          </button>
        </div>
        {optionalOpen.concerns ? (
          <>
            <div className="toolbox-row-list">
              {form.safetyConcerns.map((row, index) => (
                <div className="toolbox-repeat-row" key={`concern-${index}`}>
                  {visibleToolboxCompositeFields(safetyConcernSettings).map((field) => (
                    <ToolboxSafetyConcernField
                      field={field}
                      key={field.key}
                      value={row[field.key]}
                      onChange={(value) => updateConcern(index, field.key, value)}
                    />
                  ))}
                  <button type="button" onClick={() => removeConcern(index)}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addConcern}>{safetyConcernSettings.addRowButtonLabel}</button>
          </>
        ) : null}
      </section>
        ) : null}

        {enabledBlockSet.has("toolbox_attendance") ? (
      <section
        className={templateRuntimeSectionClassName(
          "toolbox_attendance",
          { settings: toolboxLayout.blockSettings.toolbox_attendance },
          attendanceInvalid ? "toolbox-section-invalid" : "",
        )}
        ref={registerValidationTarget("attendance")}
      >
        <div className="toolbox-section-heading">
          <h2>{toolboxLayout.blockLabels.toolbox_attendance || "Attendance"}</h2>
          <span>{attendeeNames.length ? `${attendeeNames.length} listed` : "Required"}</span>
        </div>
        <label className={attendanceInvalid ? "attendance-entry-field toolbox-field-invalid" : "attendance-entry-field"}>
          <span>Name</span>
          <input
            aria-invalid={attendanceInvalid ? "true" : undefined}
            autoCapitalize="words"
            enterKeyHint="done"
            placeholder="Worker name or comma-separated names"
            value={attendeeNameInput}
            onChange={(event) => setAttendeeNameInput(event.target.value)}
            onKeyDown={handleAttendeeNameKeyDown}
          />
        </label>
        <div className="attendance-tag-list" aria-label="Attendance list">
          {attendeeNames.map((name, index) => (
            <button
              className="attendance-tag"
              key={`${name}-${index}`}
              type="button"
              aria-label={`Remove ${name}`}
              onClick={() => removeAttendee(index)}
            >
              <span aria-hidden="true">X</span>
              {name}
            </button>
          ))}
        </div>
      </section>
        ) : null}

        {enabledBlockSet.has("toolbox_final_confirmation") ? (
      <section
        className={templateRuntimeSectionClassName(
          "toolbox_final_confirmation",
          { settings: toolboxLayout.blockSettings.toolbox_final_confirmation },
          finalCheckInvalid ? "toolbox-section-invalid" : "",
        )}
      >
        <div className="toolbox-section-heading">
          <h2>{toolboxLayout.blockLabels.toolbox_final_confirmation || "Final Check"}</h2>
          <span>Completed by presenter</span>
        </div>
        <button type="button" onClick={() => toggleOptional("comments")}>
          {optionalOpen.comments ? "Hide comments" : "Add comments"}
        </button>
        {optionalOpen.comments ? (
          <label>
            <span>Additional comments</span>
            <textarea
              rows="4"
              value={form.additionalComments}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  additionalComments: event.target.value,
                }))
              }
            />
          </label>
        ) : null}
        <div className="toolbox-field-grid compact">
          <label className={isFieldInvalid("confirmation.name") ? "toolbox-field-invalid" : ""}>
            <span>Presenter / Supervisor name</span>
            <input
              aria-invalid={isFieldInvalid("confirmation.name") ? "true" : undefined}
              ref={registerValidationTarget("confirmation.name")}
              required
              value={form.confirmation.name}
              onChange={(event) => updateConfirmation("name", event.target.value)}
            />
          </label>
          <label className={isFieldInvalid("confirmation.date") ? "toolbox-field-invalid" : ""}>
            <span>Date</span>
            <input
              aria-invalid={isFieldInvalid("confirmation.date") ? "true" : undefined}
              ref={registerValidationTarget("confirmation.date")}
              required
              type="date"
              value={form.confirmation.date}
              onChange={(event) => updateConfirmation("date", event.target.value)}
            />
          </label>
        </div>
        <label
          className={isFieldInvalid("confirmation.confirmed") ? "toolbox-confirmation toolbox-field-invalid" : "toolbox-confirmation"}
        >
          <input
            aria-invalid={isFieldInvalid("confirmation.confirmed") ? "true" : undefined}
            ref={registerValidationTarget("confirmation.confirmed")}
            required
            checked={form.confirmation.confirmed}
            type="checkbox"
            onChange={(event) => updateConfirmation("confirmed", event.target.checked)}
          />
          <span>I confirm the listed workers participated in this toolbox talk.</span>
        </label>
      </section>
        ) : null}
      </div>

      {genericSchema.sections.length ? (
        <TemplateRuntimeSections
          answers={form.answers || {}}
          invalidFields={missingFieldSet}
          registerValidationTarget={registerValidationTarget}
          schema={genericSchema}
          sections={genericSchema.sections}
          worker={worker}
          onUploadFile={onUploadFile}
          onChange={updateGenericAnswers}
        />
      ) : null}

      {error ? <p className="form-message error">{error}</p> : null}

      <div className="toolbox-submit-actions">
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Submitting..." : "Submit Toolbox Talk"}
        </button>
      </div>
    </form>
  );
}

function SiteInspectionDigitalForm({ formTemplate, formType = "site_inspection", onSubmit, onUploadFile, submitting, worker }) {
  const draftFormType = formType || formTemplate?.form_type || "site_inspection";
  const restoredDraftRef = useRef(readWorkerFormDraft(worker, draftFormType, "fill_form"));
  const optionalLayoutAppliedRef = useRef(false);
  const validationTargetsRef = useRef({});
  const [form, setForm] = useState(
    () => restoredDraftRef.current?.form || initialSiteInspectionForm(worker),
  );
  const [draftRestored, setDraftRestored] = useState(Boolean(restoredDraftRef.current?.form));
  const [draftSavedAt, setDraftSavedAt] = useState(restoredDraftRef.current?.savedAt || "");
  const [error, setError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const savedDefaults = useMemo(readSiteInspectionDefaults, []);
  const siteLayout = useMemo(
    () =>
      getSiteInspectionLayout(
        formTemplate?.publishedVersion?.schema || formTemplate?.draftVersion?.schema || formTemplate?.schema,
      ),
    [formTemplate],
  );
  const genericSchema = siteLayout.genericSchema || createGenericTemplateSchemaFromSections(
    formTemplate?.publishedVersion?.schema || formTemplate?.draftVersion?.schema || formTemplate?.schema,
    [],
    draftFormType,
  );
  const [optionalOpen, setOptionalOpen] = useState(() => {
    return createInitialSiteInspectionOptionalOpen(restoredDraftRef.current?.form, siteLayout);
  });
  const missingFieldKeys = useMemo(
    () => (submitAttempted ? getSiteInspectionMissingFields(form, siteLayout, worker) : []),
    [form, siteLayout, submitAttempted, worker],
  );
  const missingFieldSet = useMemo(() => new Set(missingFieldKeys), [missingFieldKeys]);
  const hasSavedDefaults = siteLayout.headerFields.some(
    (field) => field.remember && hasTextValue(savedDefaults[field.key]),
  );
  const enabledBlockSet = useMemo(() => new Set(siteLayout.enabledBlocks), [siteLayout.enabledBlocks]);

  const registerValidationTarget = (field) => (element) => {
    if (element) {
      validationTargetsRef.current[field] = element;
      return;
    }
    delete validationTargetsRef.current[field];
  };
  const isFieldInvalid = (field) => missingFieldSet.has(field);
  const inspectionInfoInvalid = missingFieldKeys.some((field) => field.startsWith("header."));
  const deficienciesInvalid = missingFieldKeys.some((field) => field.startsWith("deficiencies"));

  useEffect(() => {
    if (!submitAttempted) return;
    const nextMissing = getSiteInspectionMissingFields(form, siteLayout, worker);
    setError(nextMissing.length ? siteInspectionValidationMessage(nextMissing[0], siteLayout) : "");
  }, [form, siteLayout, submitAttempted, worker]);

  useEffect(() => {
    if (optionalLayoutAppliedRef.current || restoredDraftRef.current?.form) return;
    optionalLayoutAppliedRef.current = true;
    setOptionalOpen(createInitialSiteInspectionOptionalOpen(null, siteLayout));
  }, [siteLayout]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (isSiteInspectionDraftMeaningful(form, genericSchema, worker)) {
        const savedAt = writeWorkerFormDraft(worker, draftFormType, "fill_form", { form });
        setDraftSavedAt(savedAt);
        return;
      }
      clearWorkerFormDraft(worker, draftFormType, "fill_form");
      setDraftSavedAt("");
    }, DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [draftFormType, form, genericSchema, worker]);

  const updateHeader = (field, value) => {
    setForm((current) => ({
      ...current,
      header: { ...current.header, [field]: value },
    }));
  };

  const updateGenericAnswers = (answers) => {
    setForm((current) => ({
      ...current,
      answers,
    }));
  };

  const updateObservation = (field, value) => {
    setForm((current) => ({
      ...current,
      observations: { ...current.observations, [field]: value },
    }));
  };

  const updateDeficiency = (index, field, value) => {
    setForm((current) => ({
      ...current,
      noDeficiencies: false,
      deficiencies: current.deficiencies.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const addDeficiency = () => {
    setForm((current) => ({
      ...current,
      noDeficiencies: false,
      deficiencies: [...current.deficiencies, { ...EMPTY_SITE_DEFICIENCY }],
    }));
  };

  const removeDeficiency = (index) => {
    setForm((current) => ({
      ...current,
      deficiencies: current.deficiencies.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const setNoDeficiencies = (checked) => {
    setForm((current) => ({
      ...current,
      noDeficiencies: checked,
      deficiencies: checked ? [] : current.deficiencies.length ? current.deficiencies : [{ ...EMPTY_SITE_DEFICIENCY }],
    }));
  };

  const toggleOptional = (section) => {
    setOptionalOpen((current) => ({ ...current, [section]: !current[section] }));
  };

  const applyLastInspectionSetup = () => {
    setForm((current) => ({
      ...current,
      header: siteLayout.headerFields.reduce(
        (header, field) => {
          if (field.remember && hasTextValue(savedDefaults[field.key])) {
            return { ...header, [field.key]: savedDefaults[field.key] };
          }
          return header;
        },
        { ...current.header },
      ),
    }));
  };

  const startFresh = () => {
    clearWorkerFormDraft(worker, draftFormType, "fill_form");
    setForm(initialSiteInspectionForm(worker));
    setOptionalOpen(createInitialSiteInspectionOptionalOpen(null, siteLayout));
    setDraftRestored(false);
    setDraftSavedAt("");
    setError("");
    setSubmitAttempted(false);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const nextMissingFields = getSiteInspectionMissingFields(form, siteLayout, worker);
    if (nextMissingFields.length) {
      setSubmitAttempted(true);
      setError(siteInspectionValidationMessage(nextMissingFields[0], siteLayout));
      scrollToToolboxValidationTarget(validationTargetsRef.current, nextMissingFields[0]);
      return;
    }
    setError("");
    setSubmitAttempted(false);
    rememberSiteInspectionDefaults(form);
    await onSubmit(cleanSiteInspectionClientForm(form, siteLayout, genericSchema, worker));
  };

  const renderHeaderSection = () => {
    if (!siteLayout.headerFields.length) return null;
    return (
      <section
        className={templateRuntimeSectionClassName(
          "site_inspection_header",
          siteLayout.inspectionInfo,
          inspectionInfoInvalid ? "toolbox-section-invalid" : "",
        )}
      >
        <div className="toolbox-section-heading">
          <h2>{siteLayout.inspectionInfo.title || "Inspection Info"}</h2>
          {hasSavedDefaults ? (
            <button type="button" onClick={applyLastInspectionSetup}>
              Use last job
            </button>
          ) : (
            <span>{siteLayout.headerFields.some((field) => field.required) ? "Required" : "Optional"}</span>
          )}
        </div>
        {siteLayout.inspectionInfo.description ? (
          <p className="toolbox-section-description">{siteLayout.inspectionInfo.description}</p>
        ) : null}
        <div className="toolbox-field-grid">
          {siteLayout.headerFields.map((field) => {
            const fieldName = `header.${field.key}`;
            const invalid = isFieldInvalid(fieldName);
            const inputType = field.type === "date" || field.type === "time" ? field.type : "text";
            return (
              <label className={invalid ? "toolbox-field-invalid" : ""} key={field.id || field.key}>
                <span>{field.label || field.key}</span>
                <input
                  aria-invalid={invalid ? "true" : undefined}
                  ref={registerValidationTarget(fieldName)}
                  required={Boolean(field.required)}
                  type={inputType}
                  value={form.header[field.key] || ""}
                  onChange={(event) => updateHeader(field.key, event.target.value)}
                />
                {field.helperText ? <small>{field.helperText}</small> : null}
              </label>
            );
          })}
        </div>
      </section>
    );
  };

  const renderObservationSection = (section) => {
    if (!section?.fields?.length) return null;
    const open = Boolean(optionalOpen[section.id]);
    const sectionInvalid = section.fields.some((field) => isFieldInvalid(`observations.${field.key}`));
    const sectionClass = [
      templateRuntimeSectionClassName(section.id, section),
      open ? "" : "collapsed",
      sectionInvalid ? "toolbox-section-invalid" : "",
    ].filter(Boolean).join(" ");
    return (
      <section className={sectionClass} key={section.id}>
        <div className="toolbox-section-heading">
          <h2>{section.title || "Observations"}</h2>
          <button type="button" onClick={() => toggleOptional(section.id)}>
            {open ? "Hide" : `Add ${String(section.title || "observations").toLowerCase()}`}
          </button>
        </div>
        {section.description ? <p className="toolbox-section-description">{section.description}</p> : null}
        {open ? (
          section.fields.map((field) => {
            const fieldName = `observations.${field.key}`;
            const invalid = isFieldInvalid(fieldName);
            const commonProps = {
              "aria-invalid": invalid ? "true" : undefined,
              ref: registerValidationTarget(fieldName),
              required: Boolean(field.required),
              value: form.observations[field.key] || "",
              onChange: (event) => updateObservation(field.key, event.target.value),
            };
            return (
              <label className={invalid ? "toolbox-field-invalid" : ""} key={field.id || field.key}>
                <span>{field.label || field.key}</span>
                {field.type === "long_text" ? (
                  <textarea rows="3" {...commonProps} />
                ) : (
                  <input
                    type={field.type === "date" || field.type === "time" ? field.type : "text"}
                    {...commonProps}
                  />
                )}
                {field.helperText ? <small>{field.helperText}</small> : null}
              </label>
            );
          })
        ) : null}
      </section>
    );
  };

  const renderDeficienciesBlock = () => {
    if (!enabledBlockSet.has("site_deficiencies")) return null;
    const blockSettings = normalizeActionItemRowsSettings(
      siteLayout.blockSettings.site_deficiencies,
      "site_deficiencies",
    );
    return (
      <ActionItemRowsBlock
        blockInvalid={deficienciesInvalid}
        blockType="site_deficiencies"
        invalidFields={missingFieldSet}
        layoutSettings={siteLayout.blockSettings.site_deficiencies}
        noItems={form.noDeficiencies}
        registerValidationTarget={registerValidationTarget}
        rows={form.deficiencies}
        sectionId="site_deficiencies"
        settings={blockSettings}
        targetPrefix="deficiencies"
        title={siteLayout.blockLabels.site_deficiencies || "Deficiencies"}
        onAddRow={addDeficiency}
        onNoItemsChange={setNoDeficiencies}
        onRemoveRow={removeDeficiency}
        onUpdateRow={updateDeficiency}
      />
    );
  };

  const renderLayoutItem = (item) => {
    if (item.type === "header") return <Fragment key={item.id}>{renderHeaderSection()}</Fragment>;
    if (item.type === "observation") return renderObservationSection(item.section);
    if (item.type === "block" && item.blockType === "site_deficiencies") {
      return <Fragment key={item.id}>{renderDeficienciesBlock()}</Fragment>;
    }
    return null;
  };

  return (
    <form className="submission-form toolbox-talk-form site-inspection-form" noValidate onSubmit={submitForm}>
      {draftRestored || draftSavedAt ? (
        <div className="offline-draft-status">
          <div>
            <strong>{draftRestored ? "Draft restored" : "Draft saved"}</strong>
            {draftSavedAt ? <span>Saved {formatCompactTime(draftSavedAt)}</span> : null}
          </div>
          {draftRestored ? (
            <button type="button" onClick={startFresh}>
              Start fresh
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="template-runtime-section-grid">
        {siteLayout.items.map(renderLayoutItem)}
      </div>

      {genericSchema.sections.length ? (
        <TemplateRuntimeSections
          answers={form.answers || {}}
          invalidFields={missingFieldSet}
          registerValidationTarget={registerValidationTarget}
          schema={genericSchema}
          sections={genericSchema.sections}
          worker={worker}
          onUploadFile={onUploadFile}
          onChange={updateGenericAnswers}
        />
      ) : null}

      {error ? <p className="form-message error">{error}</p> : null}

      <div className="toolbox-submit-actions">
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Submitting..." : "Submit Site Inspection"}
        </button>
      </div>
    </form>
  );
}

function ActionItemRowsBlock({
  blockInvalid = false,
  blockType = "action_item_rows",
  invalidFields = new Set(),
  layoutSettings = {},
  noItems = false,
  preview = false,
  registerValidationTarget,
  rows = [],
  sectionId = "",
  settings,
  targetPrefix,
  title,
  onAddRow,
  onNoItemsChange,
  onRemoveRow,
  onUpdateRow,
}) {
  const currentSettings = settings || normalizeActionItemRowsSettings({}, blockType);
  const visibleFields = visibleActionItemRowFields(currentSettings);
  const effectiveRows = rows.length ? rows : [createEmptyActionItemRow()];
  const listedCount = noItems ? 0 : effectiveRows.length;
  const targetRef = registerValidationTarget?.(targetPrefix);
  const blockIsInvalid =
    blockInvalid ||
    invalidFields.has(targetPrefix) ||
    Array.from(invalidFields).some((field) => String(field).startsWith(`${targetPrefix}.`));
  const sectionClass = templateRuntimeSectionClassName(
    sectionId || targetPrefix,
    { settings: layoutSettings },
    blockIsInvalid ? "toolbox-section-invalid" : "",
  );
  const statusLabel = noItems ? "None" : `${listedCount} listed`;

  return (
    <section className={sectionClass} ref={targetRef}>
      <div className="toolbox-section-heading">
        <h2>{title || (blockType === "site_deficiencies" ? "Deficiencies" : "Action item rows")}</h2>
        <span>{preview ? "Special block" : statusLabel}</span>
      </div>
      <label className={blockIsInvalid ? "toolbox-confirmation toolbox-field-invalid" : "toolbox-confirmation"}>
        <input
          checked={Boolean(noItems)}
          readOnly={preview}
          type="checkbox"
          onChange={(event) => onNoItemsChange?.(event.target.checked)}
        />
        <span>{currentSettings.noneLabel}</span>
      </label>
      {!noItems ? (
        <>
          <div className="toolbox-row-list site-deficiency-list">
            {effectiveRows.map((row, index) => (
              <div className="toolbox-repeat-row site-deficiency-card" key={`${targetPrefix || "action-row"}-${index}`}>
                <div className="toolbox-section-heading site-deficiency-heading">
                  <h3>{currentSettings.rowLabel} {index + 1}</h3>
                  <button disabled={preview} type="button" onClick={() => onRemoveRow?.(index)}>
                    Remove
                  </button>
                </div>
                <div className="action-item-row-field-grid">
                  {visibleFields.map((field) => (
                    <ActionItemRowRuntimeField
                      field={field}
                      invalid={invalidFields.has(`${targetPrefix}.${index}.description`) && field.key === "description"}
                      key={field.key}
                      preview={preview}
                      row={row}
                      targetRef={field.key === "description" ? registerValidationTarget?.(`${targetPrefix}.${index}.description`) : null}
                      onChange={(value) => onUpdateRow?.(index, field.key, value)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button disabled={preview} type="button" onClick={onAddRow}>{currentSettings.addButtonLabel}</button>
        </>
      ) : null}
    </section>
  );
}

function ActionItemRowRuntimeField({ field, invalid = false, preview = false, row = {}, targetRef, onChange }) {
  const className = [
    "action-item-row-field",
    field.input === "textarea" ? "wide" : "",
    invalid ? "toolbox-field-invalid" : "",
  ].filter(Boolean).join(" ");
  const commonProps = {
    "aria-invalid": invalid ? "true" : undefined,
    disabled: preview,
    readOnly: preview,
    value: row[field.key] || (field.key === "priority" ? "medium" : ""),
  };

  if (field.input === "category") {
    return (
      <label className={className} ref={targetRef}>
        <span>{field.label}</span>
        <select
          disabled={preview}
          value={row.category || ""}
          onChange={(event) => onChange?.(event.target.value)}
        >
          <option value="">Choose category</option>
          {SITE_INSPECTION_CATEGORIES.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </label>
    );
  }
  if (field.input === "priority") {
    return (
      <label className={className} ref={targetRef}>
        <span>{field.label}</span>
        <select
          disabled={preview}
          value={row.priority || "medium"}
          onChange={(event) => onChange?.(event.target.value)}
        >
          {ACTION_ITEM_PRIORITY_OPTIONS.map((priority) => (
            <option key={priority.id} value={priority.id}>{priority.label}</option>
          ))}
        </select>
      </label>
    );
  }
  if (field.input === "textarea") {
    return (
      <label className={className} ref={targetRef}>
        <span>{field.label}</span>
        <textarea
          {...commonProps}
          rows="3"
          onChange={(event) => onChange?.(event.target.value)}
        />
      </label>
    );
  }
  return (
    <label className={className} ref={targetRef}>
      <span>{field.label}</span>
      <input
        {...commonProps}
        type={field.input === "date" ? "date" : "text"}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}

function ToolboxIncidentReviewField({ field, onChange, value }) {
  const readOnly = typeof onChange !== "function";
  if (field.input === "yes_no") {
    return (
      <div className="toolbox-composite-field toolbox-segment-field">
        <span>{field.label}</span>
        <div className="toolbox-segmented" role="group" aria-label={field.label}>
          {["no", "yes"].map((option) => (
            <button
              className={value === option ? "active" : ""}
              disabled={readOnly}
              key={option}
              type="button"
              onClick={() => onChange?.(option)}
            >
              {option === "yes" ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (field.input === "textarea") {
    return (
      <label className="toolbox-composite-field wide">
        <span>{field.label}</span>
        <textarea readOnly={readOnly} rows="4" value={value || ""} onChange={(event) => onChange?.(event.target.value)} />
      </label>
    );
  }
  return (
    <label className="toolbox-composite-field">
      <span>{field.label}</span>
      <input
        inputMode={field.input === "number" ? "numeric" : undefined}
        min={field.input === "number" ? "0" : undefined}
        readOnly={readOnly}
        type={field.input === "number" ? "number" : "text"}
        value={value || ""}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}

function ToolboxSafetyConcernField({ field, onChange, value }) {
  const readOnly = typeof onChange !== "function";
  return (
    <label className="toolbox-composite-field">
      <span>{field.label}</span>
      <input
        readOnly={readOnly}
        type={field.input === "date" ? "date" : "text"}
        value={value || ""}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}

function TemplateDrivenWorkerForm({
  formLabel,
  formTemplate,
  formType,
  onSubmit,
  onUploadFile,
  openScannedCopyPicker,
  submitting,
  templateEndpoint,
  worker,
}) {
  const validationTargetsRef = useRef({});
  const restoredDraftRef = useRef(readWorkerFormDraft(worker, formType, "fill_form"));
  const [template, setTemplate] = useState(formTemplate || null);
  const [answers, setAnswers] = useState(() => restoredDraftRef.current?.answers || {});
  const [loading, setLoading] = useState(!formTemplate);
  const [draftRestored, setDraftRestored] = useState(Boolean(restoredDraftRef.current?.answers));
  const [draftSavedAt, setDraftSavedAt] = useState(restoredDraftRef.current?.savedAt || "");
  const [error, setError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const formTypeClass = slugifyTemplateId(formType);

  const schema = useMemo(
    () => ({
      ...normalizeClientTemplateSchema(template?.publishedVersion?.schema || template?.schema),
      formType,
    }),
    [formType, template],
  );
  const invalidFields = useMemo(
    () => new Set(submitAttempted ? getTemplateMissingFields(schema, answers, worker) : []),
    [answers, schema, submitAttempted, worker],
  );

  const registerValidationTarget = (field) => (element) => {
    if (element) {
      validationTargetsRef.current[field] = element;
      return;
    }
    delete validationTargetsRef.current[field];
  };

  useEffect(() => {
    let active = true;
    const loadTemplate = async () => {
      if (formTemplate) {
        setTemplate(formTemplate);
        setLoading(false);
        setError("");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const endpoint = templateEndpoint || `/api/worker/form-templates/${formType}/published`;
        const payload = await readApiJson(
          await fetch(endpoint, {
            credentials: "include",
          }),
        );
        if (active) setTemplate(payload.template || null);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadTemplate();
    return () => {
      active = false;
    };
  }, [formTemplate, formType, templateEndpoint]);

  useEffect(() => {
    if (!submitAttempted) return;
    const nextMissing = getTemplateMissingFields(schema, answers, worker);
    setError(nextMissing.length ? templateValidationMessage(schema, nextMissing[0]) : "");
  }, [answers, schema, submitAttempted, worker]);

  useEffect(() => {
    if (loading) return undefined;
    const timeout = window.setTimeout(() => {
      if (isTemplateDraftMeaningful(schema, answers, worker)) {
        const savedAt = writeWorkerFormDraft(worker, formType, "fill_form", { answers });
        setDraftSavedAt(savedAt);
        return;
      }
      clearWorkerFormDraft(worker, formType, "fill_form");
      setDraftSavedAt("");
    }, DRAFT_SAVE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [answers, formType, loading, schema, worker]);

  const startFresh = () => {
    clearWorkerFormDraft(worker, formType, "fill_form");
    setAnswers({});
    setDraftRestored(false);
    setDraftSavedAt("");
    setError("");
    setSubmitAttempted(false);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const nextMissing = getTemplateMissingFields(schema, answers, worker);
    if (nextMissing.length) {
      setSubmitAttempted(true);
      setError(templateValidationMessage(schema, nextMissing[0]));
      scrollToToolboxValidationTarget(validationTargetsRef.current, nextMissing[0]);
      return;
    }
    setError("");
    setSubmitAttempted(false);
    rememberTemplateFieldDefaults(formType, schema, answers, worker);
    await onSubmit({
      kind: "template_submission_v1",
      templateVersionId: template?.publishedVersion?.id || "",
      answers: cleanTemplateAnswersForSubmit(schema, answers, worker),
      actionItemBlocks: cleanActionItemBlocksForSubmit(schema, answers, worker),
    });
  };

  if (loading) return <p className="empty-state">Loading {formLabel}...</p>;
  if (error && !template) return <p className="form-message error">{error}</p>;

  return (
    <>
      <div className="toolbox-fast-actions">
        <div>
          <strong>{schema.title || formLabel}</strong>
          <span>Fast mobile version</span>
        </div>
        <button type="button" onClick={openScannedCopyPicker}>
          Submit scanned copy
        </button>
      </div>
      <form
        className={[
          "submission-form",
          "toolbox-talk-form",
          "template-worker-form",
          formTypeClass ? `template-worker-form-${formTypeClass}` : "",
        ].filter(Boolean).join(" ")}
        data-form-type={formTypeClass || undefined}
        noValidate
        onSubmit={submitForm}
      >
        {draftRestored || draftSavedAt ? (
          <div className="offline-draft-status">
            <div>
              <strong>{draftRestored ? "Draft restored" : "Draft saved"}</strong>
              {draftSavedAt ? <span>Saved {formatCompactTime(draftSavedAt)}</span> : null}
            </div>
            {draftRestored ? (
              <button type="button" onClick={startFresh}>
                Start fresh
              </button>
            ) : null}
          </div>
        ) : null}

        <TemplateFormFields
          answers={answers}
          invalidFields={invalidFields}
          schema={schema}
          worker={worker}
          registerValidationTarget={registerValidationTarget}
          onUploadFile={onUploadFile}
          onChange={setAnswers}
        />

        {error ? <p className="form-message error">{error}</p> : null}

        <div className="toolbox-submit-actions">
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Submitting..." : `Submit ${schema.title || formLabel}`}
          </button>
        </div>
      </form>
    </>
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

  const openSubmission = (id) => {
    navigateTo(`/my-submissions/${id}`);
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
        </header>

        {message ? <p className="form-message error">{message}</p> : null}
        <div className="submission-history-list">
          {loading ? <p className="empty-state">Loading submissions...</p> : null}
          {!loading && !rows.length ? (
            <p className="empty-state">No submissions yet.</p>
          ) : null}
          {rows.map((row) => (
            <article
              aria-label={`View ${formTypeLabel(row.form_type)} submitted ${formatDateTime(row.submitted_at)}`}
              className="submission-history-item clickable"
              key={row.id}
              onClick={() => openSubmission(row.id)}
            >
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
                onClick={(event) => {
                  event.stopPropagation();
                  deleteSubmission(row.id);
                }}
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

export function WorkerSubmissionDetailPage({ navigateTo, routePath }) {
  const { worker } = useWorkerSession(navigateTo);
  const submissionId = routePath.split("/").filter(Boolean).pop();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const loadSubmission = async () => {
      if (!worker) return;
      setLoading(true);
      setMessage("");
      try {
        const payload = await readApiJson(
          await fetch("/api/worker/submissions", { credentials: "include" }),
        );
        const match = (payload.rows || []).find((item) => item.id === submissionId);
        if (active) {
          setRow(match || null);
          setMessage(match ? "" : "Submission was not found.");
        }
      } catch (error) {
        if (active) setMessage(error.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadSubmission();
    return () => {
      active = false;
    };
  }, [submissionId, worker]);

  if (!worker) return <WorkerFormLoadingScreen />;

  return (
    <main className="public-page form-platform-page">
      <section className="form-platform-shell">
        <header className="form-platform-header">
          <div>
            <button className="text-button" type="button" onClick={() => navigateTo("/my-submissions")}>
              Back
            </button>
            <h1>{row ? formTypeLabel(row.form_type) : "Submission"}</h1>
            <p>{worker.name} / {worker.company}</p>
          </div>
          <button type="button" onClick={() => navigateTo("/forms")}>
            New form
          </button>
        </header>

        {loading ? <p className="empty-state">Loading submission...</p> : null}
        {message ? <p className="form-message error">{message}</p> : null}
        {row ? <WorkerSubmissionReadOnlyView row={row} /> : null}
      </section>
    </main>
  );
}

function WorkerSubmissionReadOnlyView({ row }) {
  const exportSurfaceRef = useRef(null);
  const files = row.files || [];
  const digitalFormData = digitalSubmissionData(row);
  return (
    <section className="worker-submission-detail">
      <DigitalFormActions
        className="digital-form-actions worker-submission-export-actions"
        data={digitalFormData}
        exportRef={exportSurfaceRef}
        pdfScope="worker"
        row={row}
      />

      <div className="worker-submission-export-surface" ref={exportSurfaceRef}>
        <div className="worker-submission-summary">
          <dl className="staff-detail-list">
            <div><dt>Submitted</dt><dd>{formatDateTime(row.submitted_at)}</dd></div>
            <div><dt>Form type</dt><dd>{formTypeLabel(row.form_type)}</dd></div>
            <div><dt>Submission</dt><dd>{submissionModeLabel(row.submission_mode)}</dd></div>
            <div><dt>Backup</dt><dd>{backupStatusLabel(row.one_drive_backup_status)}</dd></div>
            {row.notes ? <div><dt>Summary</dt><dd>{row.notes}</dd></div> : null}
          </dl>
        </div>

        {isDigitalToolboxTalkSubmission(row) ? (
          <ToolboxTalkSubmissionDetails data={row.form_data} row={row} showActions={false} />
        ) : null}
        {isDigitalSiteInspectionSubmission(row) ? (
          <SiteInspectionSubmissionDetails data={row.form_data} row={row} showActions={false} />
        ) : null}
        {isTemplateDigitalSubmission(row) ? (
          <TemplateSubmissionDetails data={row.form_data} row={row} showActions={false} />
        ) : null}

        {isFileUploadSubmission(row) ? (
          <SubmittedFilePackage files={files} row={row} />
        ) : null}

        {!isFileUploadSubmission(row) && files.length ? (
          <div className="submission-file-list">
            <h3>Files</h3>
            {files.map((file) => (
              <div className="submission-file-row" key={file.id}>
                <span>{file.original_filename}</span>
                <small>{formatFileSize(file.size_bytes)} / {backupStatusLabel(file.backup_status)}</small>
                {file.one_drive_web_url ? (
                  <a href={file.one_drive_web_url} target="_blank" rel="noreferrer">Open backup</a>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {!isDigitalToolboxTalkSubmission(row) &&
        !isDigitalSiteInspectionSubmission(row) &&
        !isTemplateDigitalSubmission(row) &&
        !isFileUploadSubmission(row) &&
        !files.length ? (
          <p className="empty-state">No additional form details were saved for this submission.</p>
        ) : null}
      </div>
    </section>
  );
}

const CERTIFICATE_TABS = [
  { id: "approved", label: "Approved" },
  { id: "types", label: "Types" },
  { id: "providers", label: "Providers" },
];

const CERTIFICATE_UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

const EMPTY_CERTIFICATE_FORM = {
  workerName: "",
  certificateTypeId: "",
  providerId: "",
  issueDate: "",
  expiryDate: "",
  file: null,
};

function certificateFormFromCertificate(certificate = {}) {
  certificate = certificate || {};
  return {
    ...EMPTY_CERTIFICATE_FORM,
    workerName: certificate.workerName || "",
    certificateTypeId: certificate.certificateTypeId || "",
    providerId: certificate.providerId || "",
    issueDate: certificate.issueDate || "",
    expiryDate: certificate.expiryDate || "",
  };
}

function certificatePayloadFromForm(form) {
  return {
    workerName: form.workerName,
    certificateTypeId: form.certificateTypeId,
    providerId: form.providerId,
    issueDate: form.issueDate,
    expiryDate: form.expiryDate,
  };
}

function certificateFileName(file = {}) {
  return String(file.originalFilename || file.original_filename || "").trim();
}

function certificateFileExtension(file = {}) {
  const name = certificateFileName(file);
  const extension = name.includes(".") ? name.split(".").pop() : "";
  return String(extension || "").trim().toLowerCase();
}

function certificateFileKind(file = {}) {
  const mimeType = String(file.mimeType || file.mime_type || "").toLowerCase();
  const extension = certificateFileExtension(file);
  if (mimeType === "application/pdf" || extension === "pdf") return "PDF";
  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(extension)) {
    return "image";
  }
  return "file";
}

function certificateFileSideLabel(file = {}) {
  const side = String(file.sourceMetadata?.salusSide || file.source_metadata?.salusSide || "").toLowerCase();
  if (side === "front") return "Front";
  if (side === "back") return "Back";
  return "";
}

function certificateFileDisplayLabel(file = {}, index = 0, total = 1) {
  const kind = certificateFileKind(file);
  const noun = kind === "image" ? "Image" : kind === "PDF" ? "PDF" : "File";
  const side = certificateFileSideLabel(file);
  if (side) return `${side} ${noun.toLowerCase() === "pdf" ? "PDF" : noun.toLowerCase()}`;
  if (total > 1) return `${noun} ${index + 1}`;
  return kind === "file" ? "View file" : `View ${kind}`;
}

function certificateFileTitle(file = {}, index = 0, total = 1) {
  const label = certificateFileDisplayLabel(file, index, total);
  const name = certificateFileName(file);
  return name ? `${label}: ${name}` : label;
}

function CertificateFormDialog({ certificate = null, mode = "create", providers, types, onClose, onSave }) {
  const [form, setForm] = useState(() => certificateFormFromCertificate(certificate));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const activeTypes = types.filter((type) => !type.archivedAt || type.id === certificate?.certificateTypeId);
  const activeProviders = providers.filter((provider) => !provider.archivedAt || provider.id === certificate?.providerId);
  const title = mode === "edit" ? "Edit Certificate" : "Create Certificate";

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!form.workerName.trim() || !form.certificateTypeId || !form.providerId || !form.issueDate || !form.expiryDate) {
      setMessage("Worker name, certificate type, provider, issue date, and expiry date are required.");
      return;
    }
    if (form.expiryDate < form.issueDate) {
      setMessage("Expiry date cannot be before issue date.");
      return;
    }
    setSaving(true);
    try {
      await onSave(certificatePayloadFromForm(form), form.file);
    } catch (error) {
      setMessage(error.message || "Certificate could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="staff-dialog-backdrop">
      <form className="staff-detail-dialog certificate-edit-dialog" noValidate onSubmit={submit}>
        <div className="dialog-heading">
          <div>
            <p>{mode === "edit" ? certificate?.workerName || "Certificate" : "New Certificate"}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose}>X</button>
        </div>
        {message ? <p className="form-error">{message}</p> : null}
        <div className="certificate-form-grid">
          <label className="field certificate-form-wide">
            <span>Worker Name</span>
            <input autoComplete="off" value={form.workerName} onChange={(event) => update("workerName", event.target.value)} />
          </label>
          <label className="field">
            <span>Certificate Type</span>
            <select value={form.certificateTypeId} onChange={(event) => update("certificateTypeId", event.target.value)}>
              <option value="">Select type</option>
              {activeTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Provider</span>
            <select value={form.providerId} onChange={(event) => update("providerId", event.target.value)}>
              <option value="">Select provider</option>
              {activeProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Issue Date</span>
            <input type="date" value={form.issueDate} onChange={(event) => update("issueDate", event.target.value)} />
          </label>
          <label className="field">
            <span>Expiry Date</span>
            <input type="date" value={form.expiryDate} onChange={(event) => update("expiryDate", event.target.value)} />
          </label>
          <label className="field certificate-form-wide">
            <span>Media upload</span>
            <input
              accept={CERTIFICATE_UPLOAD_ACCEPT}
              type="file"
              onChange={(event) => update("file", event.target.files?.[0] || null)}
            />
          </label>
        </div>
        <div className="staff-card-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Saving..." : mode === "edit" ? "Save certificate" : "Create certificate"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CertificateOptionDialog({ item = null, kind, onClose, onSave }) {
  const [name, setName] = useState(item?.name || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const noun = kind === "types" ? "Type" : "Provider";

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!name.trim()) {
      setMessage(`${noun} name is required.`);
      return;
    }
    setSaving(true);
    try {
      await onSave({ name });
    } catch (error) {
      setMessage(error.message || `${noun} could not be saved.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="staff-dialog-backdrop">
      <form className="staff-detail-dialog certificate-option-dialog" noValidate onSubmit={submit}>
        <div className="dialog-heading">
          <div>
            <p>{item ? "Edit" : "New"}</p>
            <h2>{item ? `Edit ${noun}` : `Create ${noun}`}</h2>
          </div>
          <button type="button" onClick={onClose}>X</button>
        </div>
        {message ? <p className="form-error">{message}</p> : null}
        <label className="field">
          <span>Name</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="staff-card-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Saving..." : item ? `Save ${noun.toLowerCase()}` : `Create ${noun.toLowerCase()}`}
          </button>
        </div>
      </form>
    </div>
  );
}

function CertificateDetailsDialog({ certificate, onArchive, onClose, onEdit, onFilePreview }) {
  if (!certificate) return null;
  const files = certificate.files || [];
  const sourceLabel = certificate.source === "salus" ? "Salus import" : "Safety First";

  return (
    <div className="staff-dialog-backdrop">
      <section className="staff-detail-dialog certificate-detail-dialog" aria-modal="true" role="dialog">
        <div className="dialog-heading">
          <div>
            <p>{sourceLabel}</p>
            <h2>{certificate.workerName || "Certificate"}</h2>
          </div>
          <button type="button" onClick={onClose}>X</button>
        </div>
        <dl className="certificate-detail-grid">
          <div>
            <dt>Certificate Type</dt>
            <dd>{certificate.certificateTypeName || "-"}</dd>
          </div>
          <div>
            <dt>Provider</dt>
            <dd>{certificate.providerName || "-"}</dd>
          </div>
          <div>
            <dt>Issue Date</dt>
            <dd>{certificate.issueDate || "-"}</dd>
          </div>
          <div>
            <dt>Expiry Date</dt>
            <dd>{certificate.expiryDate || "-"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{certificate.archivedAt ? "Archived" : certificate.status || "Approved"}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{sourceLabel}</dd>
          </div>
        </dl>
        <div className="certificate-detail-files">
          <h3>Attached Files</h3>
          {files.length ? (
            <div className="certificate-file-list detail">
              {files.map((file, index) => {
                const label = certificateFileDisplayLabel(file, index, files.length);
                return (
                  <button
                    className="link-button"
                    key={file.id}
                    title={certificateFileTitle(file, index, files.length)}
                    type="button"
                    onClick={() => onFilePreview(certificate, file)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">No files attached.</p>
          )}
        </div>
        <div className="staff-card-actions">
          <button type="button" onClick={onClose}>Close</button>
          <button type="button" onClick={() => onEdit(certificate)}>Edit</button>
          {!certificate.archivedAt ? (
            <button type="button" onClick={() => onArchive(certificate)}>Archive</button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function StaffCertificatesPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const [activeTab, setActiveTab] = useState("approved");
  const [certificates, setCertificates] = useState([]);
  const [types, setTypes] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [certificateDialog, setCertificateDialog] = useState(null);
  const [detailsCertificate, setDetailsCertificate] = useState(null);
  const [optionDialog, setOptionDialog] = useState(null);
  const [showArchivedOptions, setShowArchivedOptions] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [search, setSearch] = useState("");

  const loadCertificates = async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const [certificatePayload, typePayload, providerPayload] = await Promise.all([
        fetch(`/api/staff/certificates?${params}`, { credentials: "include" }).then(readApiJson),
        fetch("/api/staff/certificates/types?includeArchived=true", { credentials: "include" }).then(readApiJson),
        fetch("/api/staff/certificates/providers?includeArchived=true", { credentials: "include" }).then(readApiJson),
      ]);
      setCertificates(certificatePayload.rows || []);
      setTypes(typePayload.rows || []);
      setProviders(providerPayload.rows || []);
    } catch (error) {
      setMessage(error.message || "Certificates could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staff) loadCertificates();
  }, [staff]);

  const activeTypes = useMemo(() => types.filter((type) => !type.archivedAt), [types]);
  const activeProviders = useMemo(() => providers.filter((provider) => !provider.archivedAt), [providers]);

  const saveCertificate = async (payload, file, certificate = null) => {
    const response = await readApiJson(
      await fetch(certificate ? `/api/staff/certificates/${certificate.id}` : "/api/staff/certificates", {
        method: certificate ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    const saved = response.certificate;
    if (file) await uploadCertificateFile(saved, file);
    setCertificateDialog(null);
    await loadCertificates();
    setMessage(certificate ? "Certificate updated." : "Certificate created.");
  };

  const uploadCertificateFile = async (certificate, selectedFile) => {
    const target = await readApiJson(
      await fetch(`/api/staff/certificates/${certificate.id}/files/upload-url`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
    const uploadResponse = await fetch(target.upload.signedUrl, {
      method: "PUT",
      body: formData,
    });
    if (!uploadResponse.ok) throw new Error("Certificate file upload failed.");
    await readApiJson(
      await fetch(`/api/staff/certificates/${certificate.id}/files`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storagePath: target.upload.storagePath,
          file: {
            originalFilename: selectedFile.name,
            mimeType: selectedFile.type || "application/octet-stream",
            sizeBytes: selectedFile.size,
          },
        }),
      }),
    );
  };

  const archiveCertificateRow = async (certificate) => {
    if (!window.confirm(`Archive certificate for ${certificate.workerName || "this worker"}?`)) return;
    setMessage("");
    try {
      await readApiJson(
        await fetch(`/api/staff/certificates/${certificate.id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      );
      await loadCertificates();
      setDetailsCertificate(null);
      setMessage("Certificate archived.");
    } catch (error) {
      setMessage(error.message || "Certificate could not be archived.");
    }
  };

  const saveOption = async (kind, item, payload) => {
    const basePath = `/api/staff/certificates/${kind}`;
    const response = await readApiJson(
      await fetch(item ? `${basePath}/${item.id}` : basePath, {
        method: item ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    setOptionDialog(null);
    await loadCertificates();
    setMessage(`${kind === "types" ? "Type" : "Provider"} ${item ? "updated" : "created"}.`);
    return response;
  };

  const archiveOption = async (kind, item) => {
    if (!window.confirm(`Archive ${item.name}? It will no longer appear for new certificates.`)) return;
    setMessage("");
    try {
      await readApiJson(
        await fetch(`/api/staff/certificates/${kind}/${item.id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      );
      await loadCertificates();
      setMessage(`${kind === "types" ? "Type" : "Provider"} archived.`);
    } catch (error) {
      setMessage(error.message || "Option could not be archived.");
    }
  };

  const openCertificateFile = async (certificate, file) => {
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/certificates/${certificate.id}/files/${file.id}/url`, {
          credentials: "include",
        }),
      );
      setFilePreview(payload);
    } catch (error) {
      setMessage(error.message || "Certificate file could not be opened.");
    }
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="certificates" contentWide navigateTo={navigateTo} staff={staff}>
      {message ? <p className="staff-message">{message}</p> : null}
      <section className="staff-table-panel certificates-panel">
        <div className="staff-panel-heading certificates-heading">
          <div>
            <p>Certificates</p>
            <h2>Safety First certificates</h2>
          </div>
          <button className="primary-button" type="button" onClick={() => setCertificateDialog({ mode: "create" })}>
            Create Certificate
          </button>
        </div>
        <div className="asset-tabs certificate-tabs" role="tablist" aria-label="Certificate sections">
          {CERTIFICATE_TABS.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "active" : ""}
              key={tab.id}
              role="tab"
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "approved" ? (
          <CertificateApprovedTab
            certificates={certificates}
            loading={loading}
            search={search}
            onArchive={archiveCertificateRow}
            onEdit={(certificate) => setCertificateDialog({ mode: "edit", certificate })}
            onFilePreview={openCertificateFile}
            onOpenDetails={setDetailsCertificate}
            onSearch={setSearch}
            onSearchSubmit={loadCertificates}
          />
        ) : null}
        {activeTab === "types" ? (
          <CertificateOptionsTab
            kind="types"
            loading={loading}
            rows={types}
            showArchived={showArchivedOptions}
            title="Certificate Types"
            onArchive={(item) => archiveOption("types", item)}
            onCreate={() => setOptionDialog({ kind: "types" })}
            onEdit={(item) => setOptionDialog({ kind: "types", item })}
            onShowArchived={setShowArchivedOptions}
          />
        ) : null}
        {activeTab === "providers" ? (
          <CertificateOptionsTab
            kind="providers"
            loading={loading}
            rows={providers}
            showArchived={showArchivedOptions}
            title="Certificate Providers"
            onArchive={(item) => archiveOption("providers", item)}
            onCreate={() => setOptionDialog({ kind: "providers" })}
            onEdit={(item) => setOptionDialog({ kind: "providers", item })}
            onShowArchived={setShowArchivedOptions}
          />
        ) : null}
      </section>
      {certificateDialog ? (
        <CertificateFormDialog
          certificate={certificateDialog.certificate || null}
          mode={certificateDialog.mode}
          providers={certificateDialog.mode === "edit" ? providers : activeProviders}
          types={certificateDialog.mode === "edit" ? types : activeTypes}
          onClose={() => setCertificateDialog(null)}
          onSave={(payload, file) => saveCertificate(payload, file, certificateDialog.certificate || null)}
        />
      ) : null}
      {detailsCertificate ? (
        <CertificateDetailsDialog
          certificate={detailsCertificate}
          onArchive={archiveCertificateRow}
          onClose={() => setDetailsCertificate(null)}
          onEdit={(certificate) => {
            setDetailsCertificate(null);
            setCertificateDialog({ mode: "edit", certificate });
          }}
          onFilePreview={openCertificateFile}
        />
      ) : null}
      {optionDialog ? (
        <CertificateOptionDialog
          item={optionDialog.item || null}
          kind={optionDialog.kind}
          onClose={() => setOptionDialog(null)}
          onSave={(payload) => saveOption(optionDialog.kind, optionDialog.item || null, payload)}
        />
      ) : null}
      {filePreview ? (
        <SubmissionFilePreviewDialog preview={filePreview} onClose={() => setFilePreview(null)} />
      ) : null}
    </StaffShell>
  );
}

function CertificateApprovedTab({
  certificates,
  loading,
  search,
  onArchive,
  onEdit,
  onFilePreview,
  onOpenDetails,
  onSearch,
  onSearchSubmit,
}) {
  return (
    <div className="certificate-tab-content">
      <div className="staff-list-controls certificate-list-controls">
        <label className="staff-search-field">
          <span>Search certificates</span>
          <input
            placeholder="Worker, type, provider"
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearchSubmit();
            }}
          />
        </label>
        <button type="button" onClick={onSearchSubmit}>Search</button>
      </div>
      <div className="staff-table-scroll">
        <table className="staff-table certificates-table">
          <thead>
            <tr>
              <th>Worker Name</th>
              <th>Certificate Type</th>
              <th>Provider</th>
              <th>Issue Date</th>
              <th>Expiry Date</th>
              <th>Attached file(s)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7">Loading certificates...</td></tr>
            ) : certificates.length ? certificates.map((certificate) => (
              <tr
                className="certificate-clickable-row"
                key={certificate.id}
                tabIndex="0"
                onClick={() => onOpenDetails(certificate)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenDetails(certificate);
                  }
                }}
              >
                <td>{certificate.workerName || "-"}</td>
                <td>{certificate.certificateTypeName || "-"}</td>
                <td>{certificate.providerName || "-"}</td>
                <td>{certificate.issueDate || "-"}</td>
                <td>{certificate.expiryDate || "-"}</td>
                <td>
                  {certificate.files?.length ? (
                    <span className="certificate-file-list">
                      {certificate.files.map((file, index) => {
                        const label = certificateFileDisplayLabel(file, index, certificate.files.length);
                        return (
                          <button
                            className="link-button"
                            key={file.id}
                            title={certificateFileTitle(file, index, certificate.files.length)}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onFilePreview(certificate, file);
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </span>
                  ) : "-"}
                </td>
                <td>
                  <span className="certificate-row-actions">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(certificate);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onArchive(certificate);
                      }}
                    >
                      Archive
                    </button>
                  </span>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="7">No certificates found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CertificateOptionsTab({
  kind,
  loading,
  rows,
  showArchived,
  title,
  onArchive,
  onCreate,
  onEdit,
  onShowArchived,
}) {
  const visibleRows = rows.filter((row) => showArchived || !row.archivedAt);
  const noun = kind === "types" ? "Type" : "Provider";

  return (
    <div className="certificate-tab-content">
      <div className="staff-panel-heading compact certificate-options-heading">
        <div>
          <p>{noun}s</p>
          <h2>{title}</h2>
        </div>
        <div className="certificate-options-actions">
          <label className="remember-worker-field certificate-archived-toggle">
            <input
              checked={showArchived}
              type="checkbox"
              onChange={(event) => onShowArchived(event.target.checked)}
            />
            <span>Show archived</span>
          </label>
          <button className="primary-button" type="button" onClick={onCreate}>Add {noun}</button>
        </div>
      </div>
      <div className="staff-table-scroll">
        <table className="staff-table certificate-options-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3">Loading {noun.toLowerCase()}s...</td></tr>
            ) : visibleRows.length ? visibleRows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>
                  <span className={row.archivedAt ? "status-pill status-open" : "status-pill status-closed"}>
                    {row.archivedAt ? "Archived" : "Active"}
                  </span>
                </td>
                <td>
                  <span className="certificate-row-actions">
                    <button type="button" onClick={() => onEdit(row)}>Edit</button>
                    {!row.archivedAt ? (
                      <button type="button" onClick={() => onArchive(row)}>Archive</button>
                    ) : null}
                  </span>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="3">No {noun.toLowerCase()}s found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const EMPTY_ASSET_FORM = {
  name: "",
  assetType: "Fall Protection",
  serialNumber: "",
  model: "",
  year: "",
  hours: "",
  kmsMiles: "",
  currentSite: "SOLO 4: Aerius",
  status: "active",
  description: "",
  notes: "",
};

const EMPTY_ASSET_ENTRY_FORM = {
  status: "active",
  site: "SOLO 4: Aerius",
  hours: "",
  kmsMiles: "",
  notes: "",
  date: "",
  performedBy: "",
};

function newAssetEntryForm(asset = {}) {
  return {
    ...EMPTY_ASSET_ENTRY_FORM,
    site: asset.currentSite || "SOLO 4: Aerius",
    hours: asset.hours ?? "",
    kmsMiles: asset.kmsMiles || "",
    date: new Date().toISOString().slice(0, 10),
  };
}

function assetFormFromAsset(asset = {}) {
  return {
    ...EMPTY_ASSET_FORM,
    name: asset.name || "",
    assetType: asset.assetType || "Fall Protection",
    serialNumber: asset.serialNumber || "",
    model: asset.model || "",
    year: asset.year || "",
    hours: asset.hours ?? "",
    kmsMiles: asset.kmsMiles || "",
    currentSite: asset.currentSite || "SOLO 4: Aerius",
    status: asset.status || "active",
    description: asset.description || "",
    notes: asset.notes || "",
  };
}

function assetPayloadFromForm(form) {
  return {
    name: form.name,
    assetType: form.assetType,
    serialNumber: form.serialNumber,
    model: form.model,
    year: form.year,
    hours: form.hours,
    kmsMiles: form.kmsMiles,
    currentSite: form.currentSite,
    status: form.status,
    description: form.description,
    notes: form.notes,
  };
}

function assetEntryPayloadFromForm(form) {
  return {
    status: form.status,
    site: form.site,
    hours: form.hours,
    kmsMiles: form.kmsMiles,
    notes: form.notes,
    date: form.date,
    performedBy: form.performedBy,
  };
}

function assetStatusLabel(status) {
  if (status === "retired") return "Retired";
  if (status === "inactive") return "Inactive";
  return "Operational";
}

function AssetFormDialog({ asset, mode, onClose, onSave }) {
  const [form, setForm] = useState(() => assetFormFromAsset(asset));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await onSave(assetPayloadFromForm(form));
    } catch (error) {
      setMessage(error.message || "Asset could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="staff-dialog-backdrop">
      <form className="staff-detail-dialog asset-edit-dialog" onSubmit={submit}>
        <div className="dialog-heading">
          <div>
            <p>{mode === "edit" ? "Edit Asset" : "New Asset"}</p>
            <h2>{mode === "edit" ? form.name || "Asset" : "Create Asset"}</h2>
          </div>
          <button type="button" onClick={onClose}>X</button>
        </div>
        {message ? <p className="form-error">{message}</p> : null}
        <div className="asset-form-grid">
          <label className="field">
            <span>Type</span>
            <input value={form.assetType} onChange={(event) => update("assetType", event.target.value)} />
          </label>
          <label className="field">
            <span>Name</span>
            <input required value={form.name} onChange={(event) => update("name", event.target.value)} />
          </label>
          <label className="field">
            <span>VIN / Serial</span>
            <input value={form.serialNumber} onChange={(event) => update("serialNumber", event.target.value)} />
          </label>
          <label className="field">
            <span>Model</span>
            <input value={form.model} onChange={(event) => update("model", event.target.value)} />
          </label>
          <label className="field">
            <span>Year</span>
            <input value={form.year} onChange={(event) => update("year", event.target.value)} />
          </label>
          <label className="field">
            <span>Hours</span>
            <input inputMode="decimal" value={form.hours} onChange={(event) => update("hours", event.target.value)} />
          </label>
          <label className="field">
            <span>Kms/Miles</span>
            <input value={form.kmsMiles} onChange={(event) => update("kmsMiles", event.target.value)} />
          </label>
          <label className="field">
            <span>Current Site</span>
            <input value={form.currentSite} onChange={(event) => update("currentSite", event.target.value)} />
          </label>
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={(event) => update("status", event.target.value)}>
              <option value="active">Operational</option>
              <option value="inactive">Inactive</option>
              <option value="retired">Retired</option>
            </select>
          </label>
          <label className="field asset-form-wide">
            <span>Description</span>
            <textarea rows="4" value={form.description} onChange={(event) => update("description", event.target.value)} />
          </label>
          <label className="field asset-form-wide">
            <span>Notes</span>
            <textarea rows="3" value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </label>
        </div>
        <div className="staff-card-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Saving..." : mode === "edit" ? "Save asset" : "Create asset"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AssetEntryDialog({ asset, mode, onClose, onSave }) {
  const [form, setForm] = useState(() => newAssetEntryForm(asset));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const title = mode === "maintenance" ? "Add Maintenance Entry" : "Add Log Entry";

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await onSave(assetEntryPayloadFromForm(form));
    } catch (error) {
      setMessage(error.message || "Entry could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="staff-dialog-backdrop">
      <form className="staff-detail-dialog asset-entry-dialog" onSubmit={submit}>
        <div className="dialog-heading">
          <div>
            <p>{asset.name}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose}>X</button>
        </div>
        {message ? <p className="form-error">{message}</p> : null}
        <div className="asset-form-grid">
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={(event) => update("status", event.target.value)}>
              <option value="active">Operational</option>
              <option value="inactive">Inactive</option>
              <option value="retired">Retired</option>
            </select>
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} />
          </label>
          <label className="field">
            <span>Site</span>
            <input value={form.site} onChange={(event) => update("site", event.target.value)} />
          </label>
          <label className="field">
            <span>Hours</span>
            <input inputMode="decimal" value={form.hours} onChange={(event) => update("hours", event.target.value)} />
          </label>
          <label className="field">
            <span>Kms/Miles</span>
            <input value={form.kmsMiles} onChange={(event) => update("kmsMiles", event.target.value)} />
          </label>
          {mode === "maintenance" ? (
            <label className="field">
              <span>Performed by</span>
              <input value={form.performedBy} onChange={(event) => update("performedBy", event.target.value)} />
            </label>
          ) : null}
          <label className="field asset-form-wide">
            <span>Notes</span>
            <textarea rows="4" value={form.notes} onChange={(event) => update("notes", event.target.value)} />
          </label>
        </div>
        <div className="staff-card-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Saving..." : "Add entry"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AssetImportDialog({
  importText,
  importing,
  message,
  onClose,
  onFileChange,
  onImport,
  onTextChange,
}) {
  return (
    <div className="staff-dialog-backdrop">
      <form className="staff-detail-dialog asset-import-dialog" onSubmit={onImport}>
        <div className="dialog-heading">
          <div>
            <p>Import</p>
            <h2>Import assets</h2>
          </div>
          <button type="button" onClick={onClose}>X</button>
        </div>
        <p className="muted">
          Upload or paste a local CSV/JSON asset export. Safety First stores its own local copy.
        </p>
        {message ? <p className="staff-message">{message}</p> : null}
        <label className="field">
          <span>CSV or JSON file</span>
          <input accept=".csv,.json,application/json,text/csv" type="file" onChange={onFileChange} />
        </label>
        <label className="field">
          <span>Import data</span>
          <textarea
            placeholder="Name, Type, Serial, Current Site, Status..."
            rows="10"
            value={importText}
            onChange={(event) => onTextChange(event.target.value)}
          />
        </label>
        <div className="staff-card-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" disabled={importing || !importText.trim()} type="submit">
            {importing ? "Importing..." : "Import assets"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function StaffAssetsPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({
    q: "",
    type: "",
    site: "",
    status: "active",
    includeArchived: false,
  });
  const [importText, setImportText] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [message, setMessage] = useState("");

  const loadAssets = async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.type) params.set("type", filters.type);
      if (filters.site) params.set("site", filters.site);
      if (filters.status && filters.status !== "all") params.set("status", filters.status);
      if (filters.includeArchived) params.set("includeArchived", "true");
      const payload = await readApiJson(
        await fetch(`/api/staff/assets?${params}`, { credentials: "include" }),
      );
      setRows(payload.rows || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staff) loadAssets();
  }, [staff]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const importAssetText = async (event) => {
    event.preventDefault();
    setImporting(true);
    setMessage("");
    setImportMessage("");
    try {
      const payload = await readApiJson(
        await fetch("/api/staff/assets/import", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: importText }),
        }),
      );
      setImportText("");
      await loadAssets();
      setMessage(`Imported ${payload.inserted || 0} new assets and updated ${payload.updated || 0}.`);
      setImportDialogOpen(false);
    } catch (error) {
      setImportMessage(error.message);
    } finally {
      setImporting(false);
    }
  };

  const importAssetFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setImportText(await file.text());
      setImportMessage(`Loaded ${file.name}. Review, then import.`);
    } catch (error) {
      setImportMessage(error.message || "Asset file could not be read.");
    }
  };

  const archiveAsset = async (asset) => {
    if (!window.confirm(`Archive ${asset.name || "this asset"}? It will no longer appear in worker pickers.`)) return;
    setMessage("");
    try {
      await readApiJson(
        await fetch(`/api/staff/assets/${asset.id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      );
      await loadAssets();
      setMessage("Asset archived.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const createAsset = async (form) => {
    const payload = await readApiJson(
      await fetch("/api/staff/assets", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      }),
    );
    setAssetDialogOpen(false);
    await loadAssets();
    setMessage(`Created ${payload.asset?.name || "asset"}.`);
  };

  const typeOptions = useMemo(() => {
    return Array.from(new Set(rows.map((asset) => asset.assetType).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [rows]);

  const siteOptions = useMemo(() => {
    return Array.from(new Set(rows.map((asset) => asset.currentSite).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [rows]);

  const openAssetDetail = (asset) => {
    if (!asset?.id) return;
    navigateTo(`/staff/assets/${asset.id}`);
  };

  const handleAssetRowClick = (event, asset) => {
    if (event.target?.closest?.("button, a, input, select, textarea")) return;
    openAssetDetail(asset);
  };

  const handleAssetRowKeyDown = (event, asset) => {
    if (event.target?.closest?.("button, a, input, select, textarea")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openAssetDetail(asset);
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="assets" contentWide navigateTo={navigateTo} staff={staff}>
      {message ? <p className="staff-message">{message}</p> : null}
      <section className="staff-assets-layout">
        <section className="staff-table-panel staff-assets-panel">
          <div className="staff-panel-heading">
            <div>
              <p>Assets</p>
              <h2>Safety First assets</h2>
            </div>
            <div className="staff-page-heading-actions">
              <button
                type="button"
                onClick={() => {
                  setImportMessage("");
                  setImportDialogOpen(true);
                }}
              >
                Import
              </button>
              <button className="primary-button" type="button" onClick={() => setAssetDialogOpen(true)}>
                Create Asset
              </button>
            </div>
          </div>
          <div className="staff-list-controls staff-assets-controls">
            <label className="staff-search-field">
              <span>Search assets</span>
              <input
                placeholder="Name, serial, type, site"
                type="search"
                value={filters.q}
                onChange={(event) => updateFilter("q", event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") loadAssets();
                }}
              />
            </label>
            <select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)}>
              <option value="">All types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select value={filters.site} onChange={(event) => updateFilter("site", event.target.value)}>
              <option value="">All sites</option>
              {siteOptions.map((site) => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="retired">Retired</option>
              <option value="all">All statuses</option>
            </select>
            <button type="button" onClick={loadAssets}>Search</button>
          </div>

          <div className="staff-table-scroll">
            <table className="staff-table staff-assets-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Serial / VIN</th>
                  <th>Hours</th>
                  <th>Site</th>
                  <th>Status</th>
                  <th>Last used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8">Loading assets...</td></tr>
                ) : rows.length ? rows.map((asset) => (
                  <tr
                    className="asset-clickable-row"
                    key={asset.id}
                    onClick={(event) => handleAssetRowClick(event, asset)}
                    onKeyDown={(event) => handleAssetRowKeyDown(event, asset)}
                    tabIndex={0}
                  >
                    <td>
                      <button
                        className="link-button asset-name-link"
                        type="button"
                        onClick={() => openAssetDetail(asset)}
                      >
                        {asset.name || "Unnamed asset"}
                      </button>
                      {asset.notes ? <small>{asset.notes}</small> : null}
                    </td>
                    <td>{asset.assetType || "-"}</td>
                    <td>{asset.serialNumber || "-"}</td>
                    <td>{asset.hours ?? "-"}</td>
                    <td>{asset.currentSite || "-"}</td>
                    <td>{asset.archivedAt ? "Archived" : assetStatusLabel(asset.status)}</td>
                    <td>{asset.lastUsedAt ? formatDateTime(asset.lastUsedAt) : "-"}</td>
                    <td>
                      {!asset.archivedAt ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            archiveAsset(asset);
                          }}
                        >
                          Archive
                        </button>
                      ) : "-"}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="8">No assets found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
      {assetDialogOpen ? (
        <AssetFormDialog mode="create" onClose={() => setAssetDialogOpen(false)} onSave={createAsset} />
      ) : null}
      {importDialogOpen ? (
        <AssetImportDialog
          importText={importText}
          importing={importing}
          message={importMessage}
          onClose={() => setImportDialogOpen(false)}
          onFileChange={importAssetFile}
          onImport={importAssetText}
          onTextChange={setImportText}
        />
      ) : null}
    </StaffShell>
  );
}

export function StaffAssetDetailPage({ assetId, navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const [asset, setAsset] = useState(null);
  const [logEntries, setLogEntries] = useState([]);
  const [maintenanceEntries, setMaintenanceEntries] = useState([]);
  const [activeTab, setActiveTab] = useState("log");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [entryDialog, setEntryDialog] = useState("");

  const loadAssetDetail = async () => {
    if (!assetId) return;
    setLoading(true);
    setMessage("");
    try {
      const [assetPayload, logPayload, maintenancePayload] = await Promise.all([
        fetch(`/api/staff/assets/${assetId}`, { credentials: "include" }).then(readApiJson),
        fetch(`/api/staff/assets/${assetId}/log-entries`, { credentials: "include" }).then(readApiJson),
        fetch(`/api/staff/assets/${assetId}/maintenance-entries`, { credentials: "include" }).then(readApiJson),
      ]);
      setAsset(assetPayload.asset || null);
      setLogEntries(logPayload.rows || []);
      setMaintenanceEntries(maintenancePayload.rows || []);
    } catch (error) {
      setMessage(error.message || "Asset could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staff) loadAssetDetail();
  }, [staff, assetId]);

  const updateAsset = async (form) => {
    const payload = await readApiJson(
      await fetch(`/api/staff/assets/${assetId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      }),
    );
    setAsset(payload.asset || null);
    setAssetDialogOpen(false);
    setMessage("Asset updated.");
  };

  const archiveAsset = async () => {
    if (!asset || !window.confirm(`Archive ${asset.name || "this asset"}? It will no longer appear in worker pickers.`)) return;
    await readApiJson(
      await fetch(`/api/staff/assets/${assetId}`, {
        method: "DELETE",
        credentials: "include",
      }),
    );
    navigateTo("/staff/assets");
  };

  const createEntry = async (mode, form) => {
    const path = mode === "maintenance" ? "maintenance-entries" : "log-entries";
    await readApiJson(
      await fetch(`/api/staff/assets/${assetId}/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      }),
    );
    setEntryDialog("");
    await loadAssetDetail();
    setMessage(mode === "maintenance" ? "Maintenance entry added." : "Log entry added.");
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="assets" contentWide navigateTo={navigateTo} staff={staff}>
      <div className="staff-page-heading asset-detail-heading">
        <button type="button" onClick={() => navigateTo("/staff/assets")}>Back to assets</button>
        <div className="staff-page-heading-actions">
          <button disabled={!asset} type="button" onClick={() => setAssetDialogOpen(true)}>Edit Asset</button>
          <button className="danger-button" disabled={!asset} type="button" onClick={archiveAsset}>Archive</button>
        </div>
      </div>
      {message ? <p className="staff-message">{message}</p> : null}
      {loading ? <p className="staff-message">Loading asset...</p> : null}
      {!loading && !asset ? <p className="empty-state">Asset not found.</p> : null}
      {asset ? (
        <>
          <section className="staff-table-panel asset-profile-card">
            <div className="asset-profile-icon" aria-hidden="true">A</div>
            <div className="asset-profile-main">
              <div className="asset-title-row">
                <div>
                  <p>{asset.assetType || "Asset"}</p>
                  <h1>{asset.name || "Unnamed asset"}</h1>
                </div>
                <span className="status-pill status-open">{assetStatusLabel(asset.status)}</span>
              </div>
              <dl className="asset-profile-grid">
                <div><dt>Model</dt><dd>{asset.model || "-"}</dd></div>
                <div><dt>VIN / Serial</dt><dd>{asset.serialNumber || "-"}</dd></div>
                <div><dt>Year</dt><dd>{asset.year || "-"}</dd></div>
                <div><dt>Hours</dt><dd>{asset.hours ?? "-"}</dd></div>
                <div><dt>Kms/Miles</dt><dd>{asset.kmsMiles || "-"}</dd></div>
                <div><dt>Current Site</dt><dd>{asset.currentSite || "-"}</dd></div>
              </dl>
              {asset.description ? <p className="asset-profile-description">{asset.description}</p> : null}
            </div>
          </section>

          <section className="staff-table-panel asset-tabs-panel">
            <div className="asset-tabs" role="tablist" aria-label="Asset details">
              <button
                aria-selected={activeTab === "log"}
                className={activeTab === "log" ? "active" : ""}
                role="tab"
                type="button"
                onClick={() => setActiveTab("log")}
              >
                Log Book
              </button>
              <button
                aria-selected={activeTab === "maintenance"}
                className={activeTab === "maintenance" ? "active" : ""}
                role="tab"
                type="button"
                onClick={() => setActiveTab("maintenance")}
              >
                Maintenance
              </button>
            </div>
            {activeTab === "log" ? (
              <AssetLogBookTab asset={asset} rows={logEntries} onAdd={() => setEntryDialog("log")} />
            ) : (
              <AssetMaintenanceTab asset={asset} rows={maintenanceEntries} onAdd={() => setEntryDialog("maintenance")} />
            )}
          </section>
        </>
      ) : null}
      {assetDialogOpen && asset ? (
        <AssetFormDialog
          asset={asset}
          mode="edit"
          onClose={() => setAssetDialogOpen(false)}
          onSave={updateAsset}
        />
      ) : null}
      {entryDialog && asset ? (
        <AssetEntryDialog
          asset={asset}
          mode={entryDialog}
          onClose={() => setEntryDialog("")}
          onSave={(form) => createEntry(entryDialog, form)}
        />
      ) : null}
    </StaffShell>
  );
}

function AssetLogBookTab({ rows, onAdd }) {
  return (
    <div className="asset-tab-content">
      <div className="staff-panel-heading compact">
        <div>
          <p>Log Book</p>
          <h2>Asset log</h2>
        </div>
        <button className="primary-button" type="button" onClick={onAdd}>Add Log Entry</button>
      </div>
      <AssetEntryTable dateField="entryDate" rows={rows} />
    </div>
  );
}

function AssetMaintenanceTab({ rows, onAdd }) {
  return (
    <div className="asset-tab-content">
      <div className="staff-panel-heading compact">
        <div>
          <p>Maintenance</p>
          <h2>Maintenance history</h2>
        </div>
        <button className="primary-button" type="button" onClick={onAdd}>Add Maintenance Entry</button>
      </div>
      {rows.length ? (
        <AssetEntryTable dateField="maintenanceDate" rows={rows} showPerformedBy />
      ) : (
        <div className="asset-empty-state">
          <div aria-hidden="true">A</div>
          <strong>No maintenance entries yet.</strong>
          <span>Add maintenance work as it happens.</span>
        </div>
      )}
    </div>
  );
}

function AssetEntryTable({ dateField, rows, showPerformedBy = false }) {
  if (!rows.length) return <p className="empty-state">No entries yet.</p>;
  return (
    <div className="staff-table-scroll">
      <table className="staff-table asset-entry-table">
        <thead>
          <tr>
            <th>Status</th>
            {showPerformedBy ? <th>Performed By</th> : null}
            <th>Site</th>
            <th>Hours</th>
            <th>Kms/Miles</th>
            <th>Notes</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><span className="status-pill status-open">{assetStatusLabel(row.status)}</span></td>
              {showPerformedBy ? <td>{row.performedBy || "-"}</td> : null}
              <td>{row.site || "-"}</td>
              <td>{row.hours ?? "-"}</td>
              <td>{row.kmsMiles || "-"}</td>
              <td>{row.notes || "-"}</td>
              <td>{row[dateField] ? formatDateTime(row[dateField]) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StaffWorkersPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const canManageWorkers = ["owner", "admin"].includes(staff?.role);
  const canCreateWorkers = Boolean(staff);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_STAFF_WORKER_FORM);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_STAFF_WORKER_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const companyOptions = useMemo(() => {
    return Array.from(new Set(rows.map((worker) => worker.company).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [rows]);

  const activeFilterCount = [
    filters.company,
    filters.active !== "all" ? filters.active : "",
    filters.sort !== EMPTY_STAFF_WORKER_FILTERS.sort ? filters.sort : "",
  ].filter(Boolean).length;

  const filteredRows = useMemo(() => {
    const visible = rows.filter((worker) => {
      if (filters.company && worker.company !== filters.company) return false;
      if (filters.active === "active" && !worker.active) return false;
      if (filters.active === "inactive" && worker.active) return false;
      return true;
    });

    return [...visible].sort((a, b) => {
      if (filters.sort === "name") {
        return String(a.name || "").localeCompare(String(b.name || ""));
      }
      if (filters.sort === "newest") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (filters.sort === "oldest") {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return (
        String(a.company || "").localeCompare(String(b.company || "")) ||
        String(a.name || "").localeCompare(String(b.name || ""))
      );
    });
  }, [filters, rows]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const startEdit = (worker) => {
    if (!canManageWorkers) return;
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
    if (editingId && !canManageWorkers) {
      setMessage("Only admins can edit worker accounts.");
      return;
    }
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

  const deleteWorker = async (worker) => {
    if (!window.confirm(`Delete worker account for ${worker.name}? Their submitted forms stay in staff records.`)) {
      return;
    }
    setMessage("");
    try {
      await readApiJson(
        await fetch(`/api/staff/workers/${worker.id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      );
      if (editingId === worker.id) resetForm();
      await loadWorkers();
      setMessage("Worker account deleted.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="workers" contentWide navigateTo={navigateTo} staff={staff}>
      {message ? <p className="staff-message">{message}</p> : null}
      <section className={canCreateWorkers ? "staff-form-admin-grid" : "staff-form-admin-grid view-only"}>
        {canCreateWorkers ? (
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
        ) : null}

        <section className="staff-table-panel">
          <div className="staff-list-controls staff-worker-list-controls">
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
            <button
              aria-controls="staff-worker-filters"
              aria-expanded={filtersOpen}
              aria-label={filtersOpen ? "Hide filters" : "Show filters"}
              className={filtersOpen ? "staff-filter-icon-button active" : "staff-filter-icon-button"}
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" />
              </svg>
            </button>
          </div>
          {filtersOpen ? (
            <section className="staff-toolbar staff-form-filter-toolbar staff-worker-filter-toolbar" id="staff-worker-filters">
              <label className="field">
                <span>Company</span>
                <select value={filters.company} onChange={(event) => updateFilter("company", event.target.value)}>
                  <option value="">All companies</option>
                  {companyOptions.map((company) => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select value={filters.active} onChange={(event) => updateFilter("active", event.target.value)}>
                  <option value="all">All workers</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>
              </label>
              <label className="field">
                <span>Sort</span>
                <select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
                  <option value="company_name">Company, then name</option>
                  <option value="name">Name</option>
                  <option value="newest">Newest created</option>
                  <option value="oldest">Oldest created</option>
                </select>
              </label>
              <button type="button" onClick={() => setFilters(EMPTY_STAFF_WORKER_FILTERS)}>
                Clear filters
              </button>
            </section>
          ) : null}
          {activeFilterCount ? (
            <p className="staff-filter-summary">
              {filteredRows.length} of {rows.length} workers shown.
            </p>
          ) : null}
          <WorkerAccountsTable
            canManage={canManageWorkers}
            loading={loading}
            rows={filteredRows}
            onDelete={deleteWorker}
            onEdit={startEdit}
            onToggleActive={toggleActive}
          />
        </section>
      </section>
    </StaffShell>
  );
}

export function StaffUsersPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const canManageStaffUsers = isAdminOrOwner(staff);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_STAFF_USER_FORM);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (role) params.set("role", role);
      if (active) params.set("active", active);
      const payload = await readApiJson(
        await fetch(`/api/staff/users?${params}`, { credentials: "include" }),
      );
      setRows(payload.rows || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staff) loadUsers();
  }, [staff]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const startEdit = (user) => {
    if (!canManageStaffUsers) return;
    setEditingId(user.id);
    setForm({
      display_name: user.display_name || "",
      email: user.email || "",
      phone: user.phone || "",
      username: user.username || "",
      password: "",
      role: user.role || "staff",
      active: user.active,
    });
  };

  const resetForm = () => {
    setEditingId("");
    setForm(EMPTY_STAFF_USER_FORM);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!canManageStaffUsers) {
      setMessage("Only admins and owners can manage staff accounts.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { ...form, id: editingId } : form;
      if (editingId && !body.password) delete body.password;
      await readApiJson(
        await fetch("/api/staff/users", {
          method,
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      resetForm();
      await loadUsers();
      setMessage(editingId ? "Staff account updated." : "Staff account created.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    if (!canManageStaffUsers) {
      setMessage("Only admins and owners can manage staff accounts.");
      return;
    }
    setMessage("");
    try {
      await readApiJson(
        await fetch("/api/staff/users", {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: user.id, active: !user.active }),
        }),
      );
      await loadUsers();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteUser = async (user) => {
    if (!canManageStaffUsers) {
      setMessage("Only admins and owners can manage staff accounts.");
      return;
    }
    if (!window.confirm(`Delete staff account for ${user.display_name || user.username}?`)) {
      return;
    }
    setMessage("");
    try {
      await readApiJson(
        await fetch(`/api/staff/users/${user.id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      );
      if (editingId === user.id) resetForm();
      await loadUsers();
      setMessage("Staff account deleted.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="users" contentWide navigateTo={navigateTo} staff={staff}>
      {message ? <p className="staff-message">{message}</p> : null}
      <section className={canManageStaffUsers ? "staff-form-admin-grid" : "staff-form-admin-grid view-only"}>
        {canManageStaffUsers ? (
          <form className="staff-admin-form" onSubmit={saveUser}>
            <h2>{editingId ? "Edit staff account" : "Create staff account"}</h2>
            <label className="field">
              <span>Name</span>
              <input required value={form.display_name} onChange={(event) => updateForm("display_name", event.target.value)} />
            </label>
            <label className="field">
              <span>Email</span>
              <input required type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} />
            </label>
            <label className="field">
              <span>Phone</span>
              <input inputMode="tel" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} />
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
            <label className="field">
              <span>Role</span>
              <select value={form.role} onChange={(event) => updateForm("role", event.target.value)}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
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
                {saving ? "Saving..." : editingId ? "Save staff" : "Create staff"}
              </button>
            </div>
          </form>
        ) : null}

        <section className="staff-table-panel">
          <div className="staff-list-controls">
            <label className="staff-search-field">
              <span>Search staff</span>
              <input placeholder="Search staff" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label className="staff-sort-select">
              <span>Role</span>
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="">All roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </label>
            <label className="staff-sort-select">
              <span>Status</span>
              <select value={active} onChange={(event) => setActive(event.target.value)}>
                <option value="all">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <button type="button" onClick={loadUsers}>Search</button>
          </div>
          <StaffUsersTable
            canManage={canManageStaffUsers}
            currentStaffId={staff.id}
            loading={loading}
            rows={rows}
            showEmail={canManageStaffUsers}
            onDelete={deleteUser}
            onEdit={startEdit}
            onToggleActive={toggleActive}
          />
        </section>
      </section>
    </StaffShell>
  );
}

export function StaffBackupsPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const canManageBackups = isAdminOrOwner(staff);
  const [queue, setQueue] = useState({ summary: {}, rows: [] });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState("");
  const [message, setMessage] = useState("");

  const loadQueue = async () => {
    setLoading(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch("/api/staff/backups", { credentials: "include" }),
      );
      setQueue(payload);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!staff) return;
    if (!canManageBackups) {
      navigateTo("/staff/home");
      return;
    }
    loadQueue();
  }, [staff, canManageBackups, navigateTo]);

  const runAction = async (action, label) => {
    setRunning(action);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/backups/${action}`, {
          method: "POST",
          credentials: "include",
        }),
      );
      setMessage(`${label} completed. ${payload.attempted || payload.retried || 0} backups checked.`);
      await loadQueue();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setRunning("");
    }
  };

  if (!staff || !canManageBackups) return <StaffLoadingScreen />;

  const summary = queue.summary || {};

  return (
    <StaffShell active="backups" contentWide navigateTo={navigateTo} staff={staff}>
      <section className="ops-page-heading">
        <div>
          <p>OneDrive readiness</p>
          <h1>Backups</h1>
          <span>Review pending, failed, backed-up, and retention-blocked form submissions.</span>
        </div>
        {canManageBackups ? (
          <div className="staff-card-actions">
            <button disabled={running === "retry-all"} type="button" onClick={() => runAction("retry-all", "Retry all failed backups")}>
              {running === "retry-all" ? "Retrying..." : "Retry failed"}
            </button>
            <button className="primary-button" disabled={running === "maintenance"} type="button" onClick={() => runAction("maintenance", "Maintenance")}>
              {running === "maintenance" ? "Running..." : "Run maintenance"}
            </button>
          </div>
        ) : null}
      </section>
      {message ? <p className="staff-message">{message}</p> : null}
      <section className="ops-metric-grid">
        <OpsMetric label="Pending" value={summary.pending} />
        <OpsMetric label="Failed" value={summary.failed} />
        <OpsMetric label="Backed up" value={summary.backedUp} />
        <OpsMetric label="Retention blocked" value={summary.retentionBlocked} />
      </section>
      <section className="staff-table-panel">
        <div className="staff-table-heading">
          <strong>{queue.rows?.length || 0} queue rows</strong>
          <span>{summary.oldestPendingAt ? `Oldest pending ${formatDateTime(summary.oldestPendingAt)}` : "No pending backups"}</span>
        </div>
        <BackupQueueTable loading={loading} rows={queue.rows || []} />
      </section>
    </StaffShell>
  );
}

export function StaffHealthPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const canViewHealth = isAdminOrOwner(staff);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadHealth = async () => {
    setLoading(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch("/api/staff/health", { credentials: "include" }),
      );
      setHealth(payload);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!staff) return;
    if (!canViewHealth) {
      navigateTo("/staff/home");
      return;
    }
    loadHealth();
  }, [staff, canViewHealth, navigateTo]);

  const updateAlert = async (alert, status) => {
    setMessage("");
    try {
      await readApiJson(
        await fetch(`/api/staff/alerts/${alert.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      );
      await loadHealth();
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!staff || !canViewHealth) return <StaffLoadingScreen />;

  const services = health?.services || {};
  const backups = health?.backups || {};
  const jobs = health?.jobs || [];
  const alerts = health?.alerts?.rows || [];

  return (
    <StaffShell active="health" contentWide navigateTo={navigateTo} staff={staff}>
      <section className="ops-page-heading">
        <div>
          <p>Operations</p>
          <h1>System Health</h1>
          <span>{loading ? "Loading..." : `Last checked ${formatDateTime(health?.generatedAt)}`}</span>
        </div>
        <button type="button" onClick={loadHealth}>Refresh</button>
      </section>
      {message ? <p className="staff-message">{message}</p> : null}
      <section className="system-status-grid ops-status-grid">
        <SystemStatus label="Database" value={services.database || "checking"} />
        <SystemStatus label="Storage" value={services.storage || "checking"} />
        <SystemStatus label="Email" value={services.email || "checking"} />
        <SystemStatus label="OneDrive" value={services.oneDriveReady ? "ready" : services.oneDrive || "checking"} />
      </section>
      <section className="ops-metric-grid">
        <OpsMetric label="Pending backups" value={backups.pending} />
        <OpsMetric label="Failed backups" value={backups.failed} />
        <OpsMetric label="Retention blocked" value={backups.retentionBlocked} />
        <OpsMetric label="Open alerts" value={health?.alerts?.open} />
      </section>
      <section className="staff-table-panel">
        <div className="staff-table-heading">
          <strong>Active alerts</strong>
          <span>{alerts.length} shown</span>
        </div>
        <AlertsTable rows={alerts} onUpdate={updateAlert} />
      </section>
      <section className="staff-table-panel">
        <div className="staff-table-heading">
          <strong>Recent jobs</strong>
          <span>Maintenance, report, and backup runs</span>
        </div>
        <JobRunsTable rows={jobs} />
      </section>
    </StaffShell>
  );
}

export function StaffAuditPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const canViewAudit = isAdminOrOwner(staff);
  const today = useMemo(todayInVancouver, []);
  const [filters, setFilters] = useState({
    from: addDaysToISODate(today, -29),
    to: today,
    action: "",
    search: "",
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadAudit = async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value),
      );
      const payload = await readApiJson(
        await fetch(`/api/staff/audit?${params}`, { credentials: "include" }),
      );
      setRows(payload.rows || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!staff) return;
    if (!canViewAudit) {
      navigateTo("/staff/home");
      return;
    }
    loadAudit();
  }, [staff, canViewAudit, navigateTo]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  if (!staff || !canViewAudit) return <StaffLoadingScreen />;

  return (
    <StaffShell active="audit" contentWide navigateTo={navigateTo} staff={staff}>
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
          <span>Action</span>
          <input value={filters.action} onChange={(event) => updateFilter("action", event.target.value)} />
        </label>
        <label className="field">
          <span>Search</span>
          <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
        </label>
        <button className="primary-button" type="button" onClick={loadAudit}>Apply</button>
      </section>
      {message ? <p className="staff-message">{message}</p> : null}
      <section className="staff-table-panel">
        <div className="staff-table-heading">
          <strong>{rows.length} audit events</strong>
          <span>Newest first</span>
        </div>
        <AuditEventsTable loading={loading} rows={rows} />
      </section>
    </StaffShell>
  );
}

export function StaffFormSubmissionsPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const canDeleteSubmissions = ["owner", "admin"].includes(staff?.role);
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [records, setRecords] = useState({ rows: [] });
  const [formOptions, setFormOptions] = useState(SAFETY_FORM_TYPES);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const visibleSubmissionIds = useMemo(
    () => records.rows.map((row) => row.id),
    [records.rows],
  );
  const allVisibleSelected =
    visibleSubmissionIds.length > 0 &&
    visibleSubmissionIds.every((id) => selectedSubmissionIds.includes(id));

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
      setSelectedSubmissionIds([]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staff) loadSubmissions();
  }, [staff]);

  useEffect(() => {
    let active = true;
    const loadFormOptions = async () => {
      if (!staff) return;
      try {
        const payload = await readApiJson(
          await fetch("/api/staff/form-templates", { credentials: "include" }),
        );
        const options = (payload.rows || []).map((row) => ({
          id: row.form_type,
          label: row.label,
        }));
        if (active && options.length) setFormOptions(options);
      } catch {
        if (active) setFormOptions(SAFETY_FORM_TYPES);
      }
    };
    loadFormOptions();
    return () => {
      active = false;
    };
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

  const toggleSubmissionSelection = (id, checked) => {
    setSelectedSubmissionIds((current) => {
      if (checked) return current.includes(id) ? current : [...current, id];
      return current.filter((currentId) => currentId !== id);
    });
  };

  const toggleAllSubmissionSelection = (checked) => {
    setSelectedSubmissionIds(checked ? visibleSubmissionIds : []);
  };

  const deleteSingleSubmission = async (row) => {
    if (!window.confirm(`Delete this ${formTypeLabel(row.form_type)} submission? This removes the app copy for staff and workers. OneDrive backups are not deleted.`)) {
      return;
    }
    setDeleting(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/submissions/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      );
      setRecords((current) => ({
        ...current,
        rows: current.rows.filter((record) => record.id !== payload.id),
      }));
      setSelectedSubmissionIds((current) => current.filter((id) => id !== payload.id));
      setMessage("Form submission deleted.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelectedSubmissions = async () => {
    const ids = selectedSubmissionIds.filter((id) => visibleSubmissionIds.includes(id));
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} selected form submission${ids.length === 1 ? "" : "s"}? This removes the app copies for staff and workers. OneDrive backups are not deleted.`)) {
      return;
    }
    setDeleting(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch("/api/staff/submissions/bulk-delete", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids }),
        }),
      );
      const deletedIds = new Set(
        (payload.results || [])
          .filter((result) => result.deleted)
          .map((result) => result.id),
      );
      setRecords((current) => ({
        ...current,
        rows: current.rows.filter((row) => !deletedIds.has(row.id)),
      }));
      setSelectedSubmissionIds([]);
      setMessage(
        payload.failed
          ? `Deleted ${payload.deleted} form submission${payload.deleted === 1 ? "" : "s"}. ${payload.failed} could not be deleted.`
          : `Deleted ${payload.deleted} form submission${payload.deleted === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const openDetails = (row) => {
    navigateTo(`/staff/forms/${row.id}`);
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="forms" contentWide navigateTo={navigateTo} staff={staff}>
      <div className="staff-filter-toggle-row">
        <button
          aria-controls="staff-form-filters"
          aria-expanded={filtersOpen}
          aria-label={filtersOpen ? "Hide filters" : "Show filters"}
          className={filtersOpen ? "staff-filter-icon-button active" : "staff-filter-icon-button"}
          type="button"
          onClick={() => setFiltersOpen((current) => !current)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" />
          </svg>
        </button>
      </div>

      {filtersOpen ? (
        <section className="staff-toolbar staff-form-filter-toolbar" id="staff-form-filters">
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
              {formOptions.map((form) => (
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
      ) : null}

      {message ? <p className="staff-message">{message}</p> : null}

      <section className="staff-table-panel">
        <div className="staff-table-heading">
          <div className="staff-table-heading-main">
            <strong>{records.rows.length} form submissions</strong>
            <span>{describeStaffFormSort(filters.sort, filters.dir)}</span>
          </div>
          {canDeleteSubmissions ? (
            <div className="staff-bulk-actions">
              <span>{selectedSubmissionIds.length} selected</span>
              <button
                className="danger-button"
                disabled={!selectedSubmissionIds.length || deleting}
                type="button"
                onClick={deleteSelectedSubmissions}
              >
                {deleting ? "Deleting..." : "Delete selected"}
              </button>
            </div>
          ) : null}
        </div>
        <FormSubmissionsTable
          allVisibleSelected={allVisibleSelected}
          canDelete={canDeleteSubmissions}
          canRetry={canDeleteSubmissions}
          deleting={deleting}
          loading={loading}
          retryingId={retryingId}
          rows={records.rows}
          selectedIds={selectedSubmissionIds}
          onDelete={deleteSingleSubmission}
          onDetails={openDetails}
          onRetry={retryBackup}
          onSelectAll={toggleAllSubmissionSelection}
          onSelectRow={toggleSubmissionSelection}
        />
      </section>

    </StaffShell>
  );
}

export function StaffSubmissionViewerPage({ navigateTo, routePath }) {
  const { staff } = useStaffSession(navigateTo);
  const submissionId = routePath.split("/").filter(Boolean).pop();
  const exportSurfaceRef = useRef(null);
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filePreview, setFilePreview] = useState(null);
  const [previewLoadingId, setPreviewLoadingId] = useState("");
  const [filePreviewMessage, setFilePreviewMessage] = useState("");
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
  const [translationInfo, setTranslationInfo] = useState(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [activeExport, setActiveExport] = useState("");
  const [exportStatus, setExportStatus] = useState("");

  const files = row?.files || [];
  const canEditSubmission = isEditableStaffSubmission(row);
  const digitalFormData = digitalSubmissionData(row);
  const filesByStoragePath = useMemo(() => {
    const map = new Map();
    files.forEach((file) => {
      if (file?.storage_path) map.set(file.storage_path, file);
    });
    return map;
  }, [files]);

  const loadSubmission = async () => {
    if (!submissionId) return;
    setLoading(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/submissions/${submissionId}`, {
          credentials: "include",
        }),
      );
      setRow(payload.submission);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staff) loadSubmission();
  }, [staff, submissionId]);

  const openFilePreview = async (file) => {
    setPreviewLoadingId(file.id);
    setFilePreviewMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/submissions/${row.id}/files/${file.id}/url`, {
          credentials: "include",
        }),
      );
      setFilePreview(payload);
    } catch (error) {
      setFilePreviewMessage(error.message);
    } finally {
      setPreviewLoadingId("");
    }
  };

  const runExport = async (type) => {
    if (!row) return;
    setActiveExport(type);
    setExportStatus("");
    setDownloadOpen(false);
    setMoreOpen(false);
    try {
      if (type === "pdf") {
        await downloadDigitalFormPdf(row, digitalFormData, exportSurfaceRef);
        setExportStatus("PDF saved.");
      } else if (type === "png") {
        await downloadDigitalFormPng(row, digitalFormData, exportSurfaceRef);
        setExportStatus("PNG saved.");
      } else {
        await printDigitalForm(row, digitalFormData, exportSurfaceRef);
        setExportStatus("Print dialog opened.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setExportStatus(error.message || "This form could not be exported.");
      }
    } finally {
      setActiveExport("");
    }
  };

  const emailFormPdf = async () => {
    if (!row) return;
    setActiveExport("email");
    setExportStatus("");
    setMoreOpen(false);
    setDownloadOpen(false);
    try {
      const result = await emailDigitalFormPdf(row, digitalFormData, exportSurfaceRef);
      setExportStatus(`PDF emailed to ${result.recipientEmail || staff.email}.`);
    } catch (error) {
      setExportStatus(error.message || "This form could not be emailed.");
    } finally {
      setActiveExport("");
    }
  };

  const openSignDialog = () => {
    setMoreOpen(false);
    setSignDialogOpen(true);
  };

  const restoreOriginalLanguage = async () => {
    setTranslationInfo(null);
    setExportStatus("Original language restored.");
    await loadSubmission();
  };

  if (!staff) return <StaffLoadingScreen />;

  return (
    <StaffShell active="forms" contentWide navigateTo={navigateTo} staff={staff}>
      <section className="submitted-viewer-shell">
        <div className="submitted-viewer-toolbar" aria-label="Submitted form actions">
          <div className="submitted-viewer-toolbar-left">
            <button className="submitted-viewer-back" type="button" onClick={() => navigateTo("/staff/forms")}>
              <ToolbarIcon type="back" />
              <span>Forms</span>
            </button>
            <div>
              <h1>{row ? formTypeLabel(row.form_type) : "Submitted Form"}</h1>
              <p>{row ? `${row.worker_name || "Worker"} / ${row.company || "Company"}` : "Loading..."}</p>
            </div>
            {row ? <span className="submitted-viewer-status">{submissionReviewStatus(row)}</span> : null}
          </div>
          <div className="submitted-viewer-toolbar-actions">
            <button disabled={!row} type="button" onClick={openSignDialog}>
              <ToolbarIcon type="review" />
              <span>Review</span>
            </button>
            <button
              disabled={!canEditSubmission}
              title={canEditSubmission ? "Edit submitted answers." : "Only filled template forms can be edited right now."}
              type="button"
              onClick={() => setEditDialogOpen(true)}
            >
              <ToolbarIcon type="edit" />
              <span>Edit</span>
            </button>
            <button disabled={!row || Boolean(activeExport)} type="button" onClick={() => setTranslateDialogOpen(true)}>
              <ToolbarIcon type="translate" />
              <span>Translate</span>
            </button>
            <div className="submitted-viewer-menu-wrap">
              <button
                aria-expanded={downloadOpen}
                disabled={!row || Boolean(activeExport)}
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  setDownloadOpen((open) => !open);
                }}
              >
                <ToolbarIcon type="download" />
                <span>{activeExport === "pdf" || activeExport === "png" ? "Saving..." : "Download"}</span>
              </button>
              {downloadOpen ? (
                <div className="submitted-viewer-menu" role="menu">
                  <button role="menuitem" type="button" onClick={() => runExport("pdf")}>PDF</button>
                  <button role="menuitem" type="button" onClick={() => runExport("png")}>PNG</button>
                </div>
              ) : null}
            </div>
            <div className="submitted-viewer-menu-wrap">
              <button
                aria-expanded={moreOpen}
                aria-label="More submitted form actions"
                disabled={!row || Boolean(activeExport)}
                type="button"
                onClick={() => {
                  setDownloadOpen(false);
                  setMoreOpen((open) => !open);
                }}
              >
                <ToolbarIcon type="more" />
              </button>
              {moreOpen ? (
                <div className="submitted-viewer-menu right" role="menu">
                  <button role="menuitem" type="button" onClick={openSignDialog}>
                    <ToolbarIcon type="sign" />
                    <span>Sign</span>
                  </button>
                  <button role="menuitem" type="button" onClick={() => runExport("print")}>
                    <ToolbarIcon type="print" />
                    <span>{activeExport === "print" ? "Opening..." : "Print"}</span>
                  </button>
                  <button disabled={activeExport === "email"} role="menuitem" type="button" onClick={emailFormPdf}>
                    <ToolbarIcon type="email" />
                    <span>{activeExport === "email" ? "Emailing..." : "Email"}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {exportStatus ? <p className="submitted-viewer-status-message">{exportStatus}</p> : null}
        {translationInfo ? (
          <div className="submitted-viewer-translation-status">
            <span>Translated to {translationInfo.languageLabel}. Review carefully.</span>
            <button type="button" onClick={restoreOriginalLanguage}>Show original</button>
          </div>
        ) : null}
        {message ? <p className="staff-message">{message}</p> : null}
        {loading ? <p className="empty-state">Loading submitted form...</p> : null}
        {!loading && row ? (
          <div className="submitted-viewer-stage">
            <SubmittedFormDocument
              exportRef={exportSurfaceRef}
              filePreviewContext={{ filesByStoragePath, openFilePreview, previewLoadingId }}
              filePreviewMessage={filePreviewMessage}
              row={row}
            />
          </div>
        ) : null}
      </section>

      {signDialogOpen && row ? (
        <SubmissionReviewSignDialog
          row={row}
          staff={staff}
          onClose={() => setSignDialogOpen(false)}
          onSaved={setRow}
        />
      ) : null}
      {editDialogOpen && row ? (
        <SubmissionEditDialog
          row={row}
          onClose={() => setEditDialogOpen(false)}
          onSaved={(updated) => {
            setRow(updated);
            setTranslationInfo(null);
            setExportStatus("Form edits saved.");
          }}
        />
      ) : null}
      {translateDialogOpen && row ? (
        <SubmissionTranslateDialog
          exportSurfaceRef={exportSurfaceRef}
          row={row}
          onClose={() => setTranslateDialogOpen(false)}
          onTranslated={(info) => {
            setTranslationInfo(info);
            setExportStatus(`Translated to ${info.languageLabel}.`);
          }}
        />
      ) : null}
      {filePreview ? (
        <SubmissionFilePreviewDialog
          preview={filePreview}
          onClose={() => setFilePreview(null)}
        />
      ) : null}
    </StaffShell>
  );
}

function SubmittedFormDocument({ exportRef, filePreviewContext, filePreviewMessage = "", row }) {
  const files = row.files || [];
  const isFileUpload = isFileUploadSubmission(row);
  return (
    <div
      className={isFileUpload
        ? "submission-export-surface submitted-form-document file-submission-document"
        : "submission-export-surface submitted-form-document"}
      ref={exportRef}
    >
      <div className="submission-export-heading">
        <p>APPIA</p>
        <h2>{formTypeLabel(row.form_type)}</h2>
        <strong>{row.worker_name} / {row.company}</strong>
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
      {isFileUpload ? (
        <SubmittedFilePackage
          filePreviewContext={filePreviewContext}
          filePreviewMessage={filePreviewMessage}
          files={files}
          row={row}
        />
      ) : null}
      {!isFileUpload && isDigitalToolboxTalkSubmission(row) ? (
        <ToolboxTalkSubmissionDetails
          data={row.form_data}
          filePreviewContext={filePreviewContext}
          row={row}
          showActions={false}
        />
      ) : null}
      {!isFileUpload && isDigitalSiteInspectionSubmission(row) ? (
        <SiteInspectionSubmissionDetails
          data={row.form_data}
          filePreviewContext={filePreviewContext}
          row={row}
          showActions={false}
        />
      ) : null}
      {!isFileUpload && isTemplateDigitalSubmission(row) ? (
        <TemplateSubmissionDetails
          data={row.form_data}
          filePreviewContext={filePreviewContext}
          row={row}
          showActions={false}
        />
      ) : null}
      {row.action_items?.length ? (
        <div className="submission-action-items">
          <h3>Linked Action Items</h3>
          {row.action_items.map((item) => (
            <div className="submission-action-item-row" key={item.id}>
              <div>
                <strong>{item.title || item.description || "Action item"}</strong>
                <span>{item.assigned_to || item.suggested_assignee || "Unassigned"}</span>
              </div>
              <StatusPill value={actionItemStatusLabel(item.status)} />
              <StatusPill value={priorityLabel(item.priority)} />
            </div>
          ))}
        </div>
      ) : null}
      {!isFileUpload && files.length ? (
        <div className="submission-file-list">
          <h3>Files</h3>
          {filePreviewMessage ? <p className="form-message error">{filePreviewMessage}</p> : null}
          {files.map((file) => (
            <div className="submission-file-row" key={file.id}>
              <button
                className="submission-file-name-button"
                disabled={filePreviewContext?.previewLoadingId === file.id}
                type="button"
                onClick={() => filePreviewContext?.openFilePreview?.(file)}
              >
                {filePreviewContext?.previewLoadingId === file.id ? "Opening..." : file.original_filename}
              </button>
              <small>{formatFileSize(file.size_bytes)} / {backupStatusLabel(file.backup_status)}</small>
              {file.one_drive_web_url ? (
                <a href={file.one_drive_web_url} target="_blank" rel="noreferrer">Open</a>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <StaffSignoffSection signoffs={row.staff_signoffs} />
    </div>
  );
}

function SubmittedFilePackage({ filePreviewContext, filePreviewMessage = "", files = [], row }) {
  const totalSize = files.reduce((sum, file) => sum + Number(file?.size_bytes || 0), 0);
  const canPreview = Boolean(filePreviewContext?.openFilePreview);

  return (
    <section className="submitted-file-package">
      <div className="submitted-file-package-heading">
        <div>
          <p>Submitted file package</p>
          <h3>{files.length ? `${files.length} uploaded ${files.length === 1 ? "file" : "files"}` : "No files uploaded"}</h3>
          <span>{formTypeLabel(row.form_type)} was submitted as an uploaded attachment package.</span>
        </div>
        <div className="submitted-file-package-badges" aria-label="File package summary">
          <span>{formatFileSize(totalSize)} total</span>
          <span>{backupStatusLabel(row.one_drive_backup_status)}</span>
        </div>
      </div>
      {filePreviewMessage ? <p className="form-message error">{filePreviewMessage}</p> : null}
      {files.length ? (
        <div className="submitted-file-card-grid">
          {files.map((file) => {
            const opening = filePreviewContext?.previewLoadingId === file.id;
            const typeLabel = mediaUploadFileTypeLabel(file);
            return (
              <article className="submitted-file-card" key={file.id}>
                <div className="submitted-file-card-icon" aria-hidden="true">
                  {submittedFileTypeInitial(typeLabel)}
                </div>
                <div className="submitted-file-card-main">
                  {canPreview ? (
                    <button
                      className="submitted-file-card-title"
                      disabled={opening}
                      type="button"
                      onClick={() => filePreviewContext.openFilePreview(file)}
                    >
                      {opening ? "Opening..." : file.original_filename || "Attachment"}
                    </button>
                  ) : (
                    <strong>{file.original_filename || "Attachment"}</strong>
                  )}
                  <span>{typeLabel} / {formatFileSize(file.size_bytes)}</span>
                  <small>Backup: {backupStatusLabel(file.backup_status)}</small>
                </div>
                <div className="submitted-file-card-actions">
                  {canPreview ? (
                    <button
                      disabled={opening}
                      type="button"
                      onClick={() => filePreviewContext.openFilePreview(file)}
                    >
                      {opening ? "Opening" : "Preview"}
                    </button>
                  ) : null}
                  {file.one_drive_web_url ? (
                    <a href={file.one_drive_web_url} target="_blank" rel="noreferrer">Open backup</a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty-state">No attachment records were saved with this submission.</p>
      )}
    </section>
  );
}

function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY || html.scrollTop || 0;
    const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
    const previous = {
      left: body.style.left,
      overflowY: body.style.overflowY,
      paddingRight: body.style.paddingRight,
      position: body.style.position,
      right: body.style.right,
      top: body.style.top,
      width: body.style.width,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflowY = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflowY = previous.overflowY;
      body.style.paddingRight = previous.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

function SubmissionEditDialog({ onClose, onSaved, row }) {
  useBodyScrollLock(true);
  const validationTargetsRef = useRef({});
  const worker = useMemo(() => staffSubmissionWorker(row), [row]);
  const schema = useMemo(() => staffSubmissionEditSchema(row), [row]);
  const [answers, setAnswers] = useState(() => staffSubmissionEditAnswers(row));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const formTypeClass = slugifyTemplateId(row?.form_type || schema.formType || "");
  const invalidFields = useMemo(
    () => new Set(submitAttempted ? getTemplateMissingFields(schema, answers, worker) : []),
    [answers, schema, submitAttempted, worker],
  );

  useEffect(() => {
    setAnswers(staffSubmissionEditAnswers(row));
    setError("");
    setSubmitAttempted(false);
  }, [row?.id]);

  useEffect(() => {
    if (!submitAttempted) return;
    const missing = getTemplateMissingFields(schema, answers, worker);
    setError(missing.length ? templateValidationMessage(schema, missing[0]) : "");
  }, [answers, schema, submitAttempted, worker]);

  const registerValidationTarget = (field) => (element) => {
    if (element) {
      validationTargetsRef.current[field] = element;
      return;
    }
    delete validationTargetsRef.current[field];
  };

  const saveEdits = async (event) => {
    event.preventDefault();
    const missing = getTemplateMissingFields(schema, answers, worker);
    if (missing.length) {
      setSubmitAttempted(true);
      setError(templateValidationMessage(schema, missing[0]));
      scrollToToolboxValidationTarget(validationTargetsRef.current, missing[0]);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/submissions/${row.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            formData: {
              kind: "template_submission_v1",
              templateVersionId: row.form_data?.templateVersionId || row.form_template_version_id || "",
              answers: cleanTemplateAnswersForSubmit(schema, answers, worker),
              actionItemBlocks: cleanActionItemBlocksForSubmit(schema, answers, worker),
            },
          }),
        }),
      );
      onSaved(payload.submission);
      onClose();
    } catch (saveError) {
      setError(saveError.message || "Form edits could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="staff-dialog-backdrop submitted-edit-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Edit Submitted Form"
        className="staff-detail-dialog submitted-edit-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <div>
            <h2>Edit Submitted Form</h2>
            <p>{formTypeLabel(row.form_type)} / {row.worker_name} / {row.company}</p>
          </div>
          <button aria-label="Close" disabled={saving} type="button" onClick={onClose}>X</button>
        </div>
        <div className="translate-dialog-notice">
          Saving edits updates the staff copy and marks backup as pending.
        </div>
        <form
          className={[
            "submission-form",
            "toolbox-talk-form",
            "template-worker-form",
            "submitted-edit-form",
            formTypeClass ? `template-worker-form-${formTypeClass}` : "",
          ].filter(Boolean).join(" ")}
          noValidate
          onSubmit={saveEdits}
        >
          <TemplateFormFields
            assetSearchEndpoint="/api/staff/assets"
            answers={answers}
            invalidFields={invalidFields}
            registerValidationTarget={registerValidationTarget}
            schema={schema}
            worker={worker}
            onChange={setAnswers}
          />
          {error ? <p className="form-message error">{error}</p> : null}
          <div className="submitted-edit-actions">
            <button disabled={saving} type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? "Saving..." : "Save edits"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SubmissionReviewSignDialog({ onClose, onSaved, row, staff }) {
  const [signature, setSignature] = useState("");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const saveSignoff = async ({ keepOpen = false } = {}) => {
    const cleanedSignature = cleanSignatureDataUrl(signature);
    if (!cleanedSignature) {
      setMessage("Staff signature is required.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/submissions/${row.id}/signoffs`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            signatureDataUrl: cleanedSignature,
            comments,
          }),
        }),
      );
      onSaved(payload.submission);
      if (keepOpen) {
        setSignature("");
        setComments("");
        setMessage("Signature saved.");
      } else {
        onClose();
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="staff-dialog-backdrop signoff-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Review & Sign Form"
        className="staff-detail-dialog signoff-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <div>
            <h2>Review &amp; Sign Form</h2>
            <p>{formTypeLabel(row.form_type)} / {row.worker_name} / {row.company}</p>
          </div>
          <button aria-label="Close" type="button" onClick={onClose}>X</button>
        </div>
        <dl className="staff-detail-list signoff-summary-list">
          <div><dt>Submitted</dt><dd>{formatDateTime(row.submitted_at)}</dd></div>
          <div><dt>Reviewing as</dt><dd>{staff?.display_name || staff?.username || "Staff"}</dd></div>
          <div><dt>Status</dt><dd>{submissionReviewStatus(row)}</dd></div>
        </dl>
        <StaffSignoffSection compact signoffs={row.staff_signoffs} />
        <SignaturePadField
          field={{
            label: "Staff Signature",
            helperText: "Draw in the box with a finger, stylus, or mouse.",
          }}
          value={signature}
          onChange={setSignature}
        />
        <label className="field signoff-comment-field">
          <span>Comments</span>
          <textarea
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            placeholder="Optional review comments"
          />
        </label>
        {message ? <p className={message === "Signature saved." ? "form-message success" : "form-message error"}>{message}</p> : null}
        <div className="signoff-dialog-actions">
          <button disabled={saving} type="button" onClick={onClose}>Cancel</button>
          <button disabled={saving} type="button" onClick={() => saveSignoff({ keepOpen: true })}>
            {saving ? "Signing..." : "Sign & Add Another Signature"}
          </button>
          <button className="primary-button" disabled={saving} type="button" onClick={() => saveSignoff()}>
            {saving ? "Signing..." : "Sign"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SubmissionTranslateDialog({ exportSurfaceRef, onClose, onTranslated, row }) {
  const [targetLanguage, setTargetLanguage] = useState("");
  const [translating, setTranslating] = useState(false);
  const [message, setMessage] = useState("");

  const translate = async (event) => {
    event.preventDefault();
    if (!targetLanguage) {
      setMessage("Choose a language.");
      return;
    }
    const root = exportSurfaceRef.current;
    const texts = collectSubmittedFormTranslationTexts(root);
    if (!texts.length) {
      setMessage("No form text was available to translate.");
      return;
    }

    setTranslating(true);
    setMessage("");
    try {
      const payload = translateSubmittedFormTexts(targetLanguage, texts);
      const translations = normalizeSubmittedFormTranslations(payload.translations);
      if (!translations.size) {
        setMessage("No phrasebook matches found for this form.");
        return;
      }
      applySubmittedFormTranslations(root, translations);
      onTranslated({
        language: payload.language || targetLanguage,
        languageLabel:
          payload.languageLabel ||
          SUBMITTED_FORM_TRANSLATION_LANGUAGES.find((item) => item.code === targetLanguage)?.label ||
          targetLanguage,
        translatedCount: translations.size,
      });
      onClose();
    } catch (error) {
      setMessage(error.message || "This form could not be translated.");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="staff-dialog-backdrop translate-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Translation: Select Output Language"
        className="staff-detail-dialog translate-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <div>
            <h2>Translation: Select Output Language</h2>
            <p>{formTypeLabel(row.form_type)} / {row.worker_name} / {row.company}</p>
          </div>
          <button aria-label="Close" type="button" onClick={onClose}>X</button>
        </div>
        <div className="translate-dialog-notice">
          Rough phrasebook translation. Unrecognized text stays original.
        </div>
        <form className="translate-dialog-form" onSubmit={translate}>
          <label className="field">
            <span>Translate To</span>
            <select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}>
              <option value="">Select language</option>
              {SUBMITTED_FORM_TRANSLATION_LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>{language.label}</option>
              ))}
            </select>
          </label>
          {message ? <p className="form-message error">{message}</p> : null}
          <div className="translate-dialog-actions">
            <button disabled={translating} type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button" disabled={!targetLanguage || translating} type="submit">
              {translating ? "Translating..." : "Translate Form"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function StaffSignoffSection({ compact = false, signoffs }) {
  const rows = normalizeStaffSignoffsForDisplay(signoffs);
  return (
    <section className={compact ? "staff-signoff-section compact" : "staff-signoff-section"}>
      <div className="staff-signoff-heading">
        <h3>Staff Sign-Off</h3>
        <span>{rows.length ? `${rows.length} signature${rows.length === 1 ? "" : "s"}` : "Not signed"}</span>
      </div>
      {rows.length ? (
        <div className="staff-signoff-list">
          {rows.map((signoff) => (
            <article className="staff-signoff-card" key={signoff.id}>
              <div>
                <strong>{signoff.staff_name || signoff.staff_username || "Staff"}</strong>
                <span>{signoff.signed_at ? formatDateTime(signoff.signed_at) : "Signed"}</span>
              </div>
              <img alt={`${signoff.staff_name || "Staff"} signature`} src={signoff.signature_data_url} />
              {signoff.comments ? <p>{signoff.comments}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <p>No staff sign-off recorded yet.</p>
      )}
    </section>
  );
}

function ToolbarIcon({ type }) {
  const paths = {
    back: "M15 18l-6-6 6-6M9 12h12",
    review: "M4 5h16v14H4zM8 9h8M8 13h5",
    edit: "M4 20h4l11-11-4-4L4 16v4zM13 7l4 4",
    translate: "M4 5h8M8 5v14M5 19h6M14 19l4-10 4 10M16 15h4",
    download: "M12 3v12M7 10l5 5 5-5M5 21h14",
    more: "M12 6h.01M12 12h.01M12 18h.01",
    sign: "M4 17c3-5 5-5 6 0 1 3 3 3 6-1 1-1 2-2 4-2",
    print: "M7 8V4h10v4M7 17H5v-7h14v7h-2M8 14h8v6H8z",
    email: "M4 6h16v12H4zM4 7l8 6 8-6",
  };
  return (
    <svg aria-hidden="true" className="toolbar-icon" viewBox="0 0 24 24">
      <path d={paths[type] || paths.more} />
    </svg>
  );
}

function patchHasKey(patch, key) {
  return Boolean(patch && Object.prototype.hasOwnProperty.call(patch, key));
}

function isLockedDefaultFormTemplate(templateOrType) {
  const formType = typeof templateOrType === "string" ? templateOrType : templateOrType?.form_type;
  return LOCKED_DEFAULT_FORM_TYPES.has(formType);
}

function isLockedFormTemplate(template) {
  return Boolean(template?.locked_at);
}

function canManageFormTemplate(template, staff) {
  if (!template || !staff) return false;
  if (isAdminOrOwner(staff)) return true;
  return Boolean(template.created_by_staff_id && template.created_by_staff_id === staff.id);
}

function canPurgeFormTemplate(template, staff) {
  return Boolean(
    template?.archived_at &&
    !isLockedDefaultFormTemplate(template) &&
    canManageFormTemplate(template, staff),
  );
}

function templateAccessLabel(template) {
  if (isLockedDefaultFormTemplate(template)) return "Protected default";
  if (template?.renderer_type !== "template") return "Special renderer";
  return "Editable";
}

function TemplateQrLinkPanel({
  copyStatus,
  onCopy,
  onDownload,
  onOpen,
  qrDataUrl,
  shareUrl,
  template,
}) {
  const unavailableReason = templateQrUnavailableReason(template);
  return (
    <section className="template-qr-panel" aria-label="Form template QR link">
      {shareUrl ? (
        <div className="template-qr-ready">
          <div className="template-qr-image">
            {qrDataUrl ? <img alt={`${template.label} QR code`} src={qrDataUrl} /> : <div className="public-qr-placeholder" />}
          </div>
          <div className="template-qr-details">
            <label>
              <span>Public QR URL</span>
              <input readOnly value={shareUrl} onFocus={(event) => event.target.select()} />
            </label>
            <div className="template-qr-actions">
              <button type="button" onClick={onCopy}>
                Copy link
              </button>
              <button type="button" onClick={onOpen}>
                Open
              </button>
              <button disabled={!qrDataUrl} type="button" onClick={onDownload}>
                Download QR
              </button>
            </div>
            {copyStatus ? <p className="template-qr-copy-status">{copyStatus}</p> : null}
          </div>
        </div>
      ) : (
        <p className="muted">{unavailableReason}</p>
      )}
    </section>
  );
}

function templateQrUnavailableReason(template) {
  if (!template) return "Select a form template to view its QR link.";
  if (template.archived_at) return "Archived forms do not have active QR links.";
  if (!template.active) return "Activate this form before assigning an active QR link.";
  if (!template.worker_visible) return "Show this form to workers before assigning an active QR link.";
  if (!template.publishedVersion) return "Publish this form before assigning an active QR link.";
  return "The server has not assigned a QR link yet. Refresh the template list after publishing or showing the form.";
}

function isStaffFillableFormTemplate(template) {
  return Boolean(
    template &&
    !template.archived_at &&
    template.active &&
    template.worker_visible &&
    template.publishedVersion &&
    template.shareLink?.urlPath
  );
}

function syncSchemaMeta(schema, patch) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return schema;
  if (!patchHasKey(patch, "label") && !patchHasKey(patch, "description")) return schema;
  return {
    ...schema,
    title: patchHasKey(patch, "label") ? String(patch.label || "") : schema.title,
    description: patchHasKey(patch, "description") ? String(patch.description || "") : schema.description,
  };
}

function syncTemplateSchemaMeta(template, patch) {
  if (!template || (!patchHasKey(patch, "label") && !patchHasKey(patch, "description"))) return template;
  const syncVersion = (version) => (
    version?.schema
      ? { ...version, schema: syncSchemaMeta(version.schema, patch) }
      : version
  );
  return {
    ...template,
    draftVersion: syncVersion(template.draftVersion),
    publishedVersion: template.draftVersion ? template.publishedVersion : syncVersion(template.publishedVersion),
    versions: Array.isArray(template.versions)
      ? template.versions.map((version) =>
          version.status === "draft" || (!template.draftVersion && version.status === "published")
            ? syncVersion(version)
            : version,
        )
      : template.versions,
  };
}

export function StaffFormTemplatesPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const canManageTemplates = Boolean(staff);
  const [rows, setRows] = useState([]);
  const [selectedFormType, setSelectedFormType] = useState("daily_hazard_assessment");
  const [draftSchema, setDraftSchema] = useState(null);
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [templateListHidden, setTemplateListHidden] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [focusedTemplateType, setFocusedTemplateType] = useState("");
  const [draggedTemplateType, setDraggedTemplateType] = useState("");
  const [dragOverTemplateType, setDragOverTemplateType] = useState("");
  const [reordering, setReordering] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrCopyStatus, setQrCopyStatus] = useState("");
  const [unlockingTemplate, setUnlockingTemplate] = useState(null);
  const templateCardRefs = useRef(new Map());
  const dragStateRef = useRef({ formType: "", moved: false, latestOrder: null });

  const currentTemplates = useMemo(() => rows.filter((row) => !row.archived_at), [rows]);
  const archivedTemplates = useMemo(() => rows.filter((row) => row.archived_at), [rows]);
  const archivedPurgeableTemplates = useMemo(
    () => archivedTemplates.filter((template) => canPurgeFormTemplate(template, staff)),
    [archivedTemplates, staff],
  );
  const selectedTemplate = useMemo(
    () => rows.find((row) => row.form_type === selectedFormType) || currentTemplates[0] || archivedTemplates[0] || null,
    [archivedTemplates, currentTemplates, rows, selectedFormType],
  );
  const selectedIsLockedDefault = isLockedDefaultFormTemplate(selectedTemplate);
  const selectedIsLocked = isLockedFormTemplate(selectedTemplate);
  const selectedCanManage = canManageFormTemplate(selectedTemplate, staff);
  const selectedCanEdit = Boolean(
    canManageTemplates &&
    selectedCanManage &&
    selectedTemplate?.renderer_type === "template" &&
    !selectedIsLockedDefault &&
    !selectedIsLocked,
  );
  const selectedCanArchive = Boolean(
    selectedCanManage &&
    selectedTemplate?.renderer_type === "template" &&
    !selectedIsLockedDefault &&
    !selectedIsLocked,
  );
  const selectedSchema = selectedIsLockedDefault
    ? selectedTemplate?.publishedVersion?.schema || selectedTemplate?.draftVersion?.schema || null
    : selectedTemplate?.draftVersion?.schema || selectedTemplate?.publishedVersion?.schema || null;
  const previousVersions = useMemo(
    () => selectedIsLockedDefault ? [] : (selectedTemplate?.versions || []).filter((version) => version.status === "archived"),
    [selectedIsLockedDefault, selectedTemplate],
  );
  const isTemplateListFocused = Boolean(focusedTemplateType && rows.some((row) => row.form_type === focusedTemplateType));
  const visibleCurrentTemplates = newFormOpen
    ? []
    : isTemplateListFocused
      ? currentTemplates.filter((template) => template.form_type === focusedTemplateType)
      : currentTemplates;
  const showArchivedTemplates = !newFormOpen && !isTemplateListFocused && archivedTemplates.length > 0;
  const canDragTemplateOrder = isAdminOrOwner(staff) && !newFormOpen && !isTemplateListFocused && visibleCurrentTemplates.length > 1;
  const selectedSharePath = selectedTemplate?.shareLink?.urlPath || "";
  const selectedShareUrl = useMemo(
    () => (selectedSharePath ? publicUrl(selectedSharePath) : ""),
    [selectedSharePath],
  );

  const registerTemplateCard = (formType) => (node) => {
    if (node) {
      templateCardRefs.current.set(formType, node);
    } else {
      templateCardRefs.current.delete(formType);
    }
  };

  const loadTemplates = async ({ preserveDraft = false } = {}) => {
    setLoading(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch("/api/staff/form-templates", { credentials: "include" }),
      );
      setRows(payload.rows || []);
      if (!preserveDraft) {
        const selected = (payload.rows || []).find((row) => row.form_type === selectedFormType) || payload.rows?.[0];
        setDraftSchema(cloneTemplateSchema(selected?.draftVersion?.schema || selected?.publishedVersion?.schema));
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (event) => {
    event.preventDefault();
    if (!canManageTemplates) return;
    if (!newFormName.trim()) {
      setMessage("Enter a form name.");
      return;
    }
    setCreating(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch("/api/staff/form-templates", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ label: newFormName.trim() }),
        }),
      );
      setRows((current) => [payload.template, ...current]);
      setSelectedFormType(payload.template.form_type);
      setFocusedTemplateType(payload.template.form_type);
      setDraftSchema(cloneTemplateSchema(payload.template.draftVersion?.schema));
      setPreviewAnswers({});
      setNewFormName("");
      setNewFormOpen(false);
      setMessage("New blank form draft created. Add fields, then save and publish.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setCreating(false);
    }
  };

  const duplicateTemplate = async (template) => {
    if (!canManageTemplates) return;
    if (!template || template.renderer_type !== "template") return;
    setSaving(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/form-templates/${template.form_type}/duplicate`, {
          method: "POST",
          credentials: "include",
        }),
      );
      setRows((current) => [payload.template, ...current]);
      setSelectedFormType(payload.template.form_type);
      setFocusedTemplateType(payload.template.form_type);
      setDraftSchema(cloneTemplateSchema(payload.template.draftVersion?.schema));
      setPreviewAnswers({});
      setMessage(`Duplicated ${template.label}. The copy is hidden from workers until published and shown.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const replaceTemplateRow = (template) => {
    if (!template?.form_type) return;
    setRows((current) => current.map((row) => (row.form_type === template.form_type ? template : row)));
  };

  const lockTemplate = async (template = selectedTemplate) => {
    if (!template || template.renderer_type !== "template") return;
    if (!canManageFormTemplate(template, staff) || isLockedDefaultFormTemplate(template)) return;
    setSaving(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/form-templates/${template.form_type}/lock`, {
          method: "POST",
          credentials: "include",
        }),
      );
      replaceTemplateRow(payload.template);
      setMessage("Template locked.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const unlockTemplate = async (password) => {
    const template = unlockingTemplate || selectedTemplate;
    if (!template || template.renderer_type !== "template") return;
    if (!canManageFormTemplate(template, staff) || isLockedDefaultFormTemplate(template)) return;
    setSaving(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/form-templates/${template.form_type}/unlock`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password }),
        }),
      );
      replaceTemplateRow(payload.template);
      setUnlockingTemplate(null);
      setMessage("Template unlocked.");
    } catch (error) {
      setMessage(error.message);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteArchivedTemplates = async () => {
    if (!canManageTemplates || !archivedPurgeableTemplates.length) return;
    const count = archivedPurgeableTemplates.length;
    if (!window.confirm(`Delete ${count} archived form template${count === 1 ? "" : "s"}? This cannot be undone.`)) {
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch("/api/staff/form-templates/archived", {
          method: "DELETE",
          credentials: "include",
        }),
      );
      const deletedTypes = new Set((payload.rows || []).map((row) => row.form_type));
      const nextRows = rows.filter((row) => !deletedTypes.has(row.form_type));
      setRows(nextRows);
      setArchivedOpen(false);
      if (deletedTypes.has(selectedTemplate?.form_type)) {
        const nextTemplate = nextRows.find((row) => !row.archived_at) || nextRows[0] || null;
        setSelectedFormType(nextTemplate?.form_type || "");
        setFocusedTemplateType("");
        setDraftSchema(cloneTemplateSchema(nextTemplate?.draftVersion?.schema || nextTemplate?.publishedVersion?.schema));
      }
      setMessage(`Deleted ${payload.deleted || 0} archived form template${payload.deleted === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateTemplateMeta = async (patch) => {
    if (!canManageTemplates) return;
    if (!selectedTemplate || selectedTemplate.renderer_type !== "template") return;
    if (!canManageFormTemplate(selectedTemplate, staff)) return;
    if (selectedTemplate.locked_at) {
      setMessage("Locked. Unlock to edit.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/form-templates/${selectedTemplate.form_type}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        }),
      );
      const nextTemplate = syncTemplateSchemaMeta(payload.template, patch);
      let nextRows = [];
      setRows((current) => {
        nextRows = current.map((row) => (row.form_type === nextTemplate.form_type ? nextTemplate : row));
        return nextRows;
      });
      if (patchHasKey(patch, "label") || patchHasKey(patch, "description")) {
        setDraftSchema((current) => syncSchemaMeta(current, patch));
      }
      if (patch.archived) {
        setFocusedTemplateType("");
        const nextActiveTemplate = nextRows.find((row) => !row.archived_at && row.form_type !== nextTemplate.form_type);
        if (nextActiveTemplate) setSelectedFormType(nextActiveTemplate.form_type);
      } else if (patch.archived === false) {
        setArchivedOpen(false);
        setSelectedFormType(nextTemplate.form_type);
      }
      setMessage(patch.archived ? "Template archived." : "Template settings saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveTemplateOrder = async (order) => {
    if (!isAdminOrOwner(staff)) return;
    if (!order?.length) return;
    setReordering(true);
    setMessage("");
    try {
      await Promise.all(
        order.map(async (item) =>
          readApiJson(
            await fetch(`/api/staff/form-templates/${item.formType}`, {
              method: "PATCH",
              credentials: "include",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ displayOrder: item.displayOrder }),
            }),
          ),
        ),
      );
      await loadTemplates({ preserveDraft: true });
      setMessage("Form order saved.");
    } catch (error) {
      setMessage(error.message);
      await loadTemplates({ preserveDraft: true });
    } finally {
      setReordering(false);
    }
  };

  const moveTemplateBeforeOrAfter = (draggedType, targetType, placement) => {
    setRows((current) => {
      const activeRows = current.filter((row) => !row.archived_at);
      const archivedRows = current.filter((row) => row.archived_at);
      const draggedIndex = activeRows.findIndex((row) => row.form_type === draggedType);
      const targetIndex = activeRows.findIndex((row) => row.form_type === targetType);
      if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return current;

      const nextActiveRows = [...activeRows];
      const [draggedRow] = nextActiveRows.splice(draggedIndex, 1);
      const remainingTargetIndex = nextActiveRows.findIndex((row) => row.form_type === targetType);
      const insertIndex = placement === "after" ? remainingTargetIndex + 1 : remainingTargetIndex;
      nextActiveRows.splice(insertIndex, 0, draggedRow);

      const orderedRows = nextActiveRows.map((row, index) => ({
        ...row,
        display_order: (index + 1) * 10,
      }));
      dragStateRef.current = {
        ...dragStateRef.current,
        moved: true,
        latestOrder: orderedRows.map((row) => ({
          formType: row.form_type,
          displayOrder: row.display_order,
        })),
      };
      return [...orderedRows, ...archivedRows];
    });
  };

  const startTemplateOrderDrag = (event, formType) => {
    if (!canDragTemplateOrder || reordering) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragStateRef.current = { formType, moved: false, latestOrder: null };
    setDraggedTemplateType(formType);
    setDragOverTemplateType(formType);

    const handleMove = (moveEvent) => {
      moveEvent.preventDefault();
      const pointerY = moveEvent.clientY;
      let closest = null;
      let closestDistance = Number.POSITIVE_INFINITY;

      templateCardRefs.current.forEach((node, targetType) => {
        if (targetType === formType) return;
        const rect = node.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const distance = Math.abs(pointerY - midpoint);
        if (distance < closestDistance) {
          closest = { rect, targetType };
          closestDistance = distance;
        }
      });

      if (!closest) return;
      const placement = pointerY > closest.rect.top + closest.rect.height / 2 ? "after" : "before";
      setDragOverTemplateType(closest.targetType);
      moveTemplateBeforeOrAfter(formType, closest.targetType, placement);
    };

    const handleEnd = () => {
      const { moved, latestOrder } = dragStateRef.current;
      setDraggedTemplateType("");
      setDragOverTemplateType("");
      dragStateRef.current = { formType: "", moved: false, latestOrder: null };
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
      if (moved) saveTemplateOrder(latestOrder);
    };

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
  };

  useEffect(() => {
    if (!staff) return;
    loadTemplates();
  }, [staff]);

  useEffect(() => {
    setDraftSchema(cloneTemplateSchema(selectedSchema));
    setPreviewAnswers({});
  }, [selectedFormType, selectedSchema]);

  useEffect(() => {
    setQrCopyStatus("");
    setQrDataUrl("");
    if (!selectedShareUrl) return undefined;
    let cancelled = false;
    const qrLabel = selectedTemplate?.label || "Form";
    QRCode.toDataURL(selectedShareUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
      width: 260,
      color: {
        dark: "#111111",
        light: "#ffffff",
      },
    }).then((dataUrl) => createLabeledQrCodeDataUrl(dataUrl, qrLabel)).then((dataUrl) => {
      if (!cancelled) setQrDataUrl(dataUrl);
    }).catch(() => {
      if (!cancelled) setQrDataUrl("");
    });
    return () => {
      cancelled = true;
    };
  }, [selectedShareUrl, selectedTemplate?.label]);

  const saveTemplateMetaForSchema = async (schema) => {
    if (!selectedCanEdit) return null;
    const nextTitle = String(schema?.title || "").trim();
    const nextDescription = String(schema?.description || "");
    const patch = {};
    if (nextTitle && nextTitle !== selectedTemplate.label) patch.label = nextTitle;
    if (nextDescription !== (selectedTemplate.description || "")) patch.description = nextDescription;
    if (!Object.keys(patch).length) return null;
    const payload = await readApiJson(
      await fetch(`/api/staff/form-templates/${selectedTemplate.form_type}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );
    return syncTemplateSchemaMeta(payload.template, patch);
  };

  const saveDraft = async () => {
    if (!selectedTemplate || selectedTemplate.renderer_type !== "template") return;
    if (!selectedCanEdit) return;
    setSaving(true);
    setMessage("");
    try {
      const schemaToSave = cloneTemplateSchema(draftSchema);
      const payload = await readApiJson(
        await fetch(`/api/staff/form-templates/${selectedTemplate.form_type}/draft`, {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ schema: schemaToSave }),
        }),
      );
      const metaTemplate = await saveTemplateMetaForSchema(schemaToSave);
      setRows((current) =>
        current.map((row) => {
          if (row.form_type !== selectedTemplate.form_type) return row;
          const base = metaTemplate ? { ...row, ...metaTemplate } : row;
          return {
            ...base,
            draftVersion: payload.draft,
            versions: mergeTemplateVersions(base.versions, payload.draft),
          };
        }),
      );
      setMessage("Draft saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const publishDraft = async () => {
    if (!selectedTemplate || selectedTemplate.renderer_type !== "template") return;
    if (!selectedCanEdit) return;
    setPublishing(true);
    setMessage("");
    try {
      const schemaToSave = cloneTemplateSchema(draftSchema);
      if (draftSchema) {
        await readApiJson(
          await fetch(`/api/staff/form-templates/${selectedTemplate.form_type}/draft`, {
            method: "PATCH",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ schema: schemaToSave }),
          }),
        );
        await saveTemplateMetaForSchema(schemaToSave);
      }
      const payload = await readApiJson(
        await fetch(`/api/staff/form-templates/${selectedTemplate.form_type}/publish`, {
          method: "POST",
          credentials: "include",
        }),
      );
      setMessage(`Published version ${payload.published.version_number}.`);
      await loadTemplates();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPublishing(false);
    }
  };

  const restoreVersion = async (version) => {
    if (!selectedTemplate || !version) return;
    if (!selectedCanEdit) return;
    setSaving(true);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/form-templates/${selectedTemplate.form_type}/restore`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ versionId: version.id }),
        }),
      );
      setDraftSchema(cloneTemplateSchema(payload.draft.schema));
      setRows((current) =>
        current.map((row) =>
          row.form_type === selectedTemplate.form_type
            ? { ...row, draftVersion: payload.draft, versions: mergeTemplateVersions(row.versions, payload.draft) }
            : row,
        ),
      );
      setMessage(`Restored version ${version.version_number} into draft.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const copySelectedShareLink = async () => {
    if (!selectedShareUrl) return;
    try {
      await navigator.clipboard.writeText(selectedShareUrl);
      setQrCopyStatus("Copied");
    } catch {
      setQrCopyStatus("Copy failed");
    }
  };

  const openSelectedShareLink = () => {
    if (!selectedShareUrl) return;
    window.open(selectedShareUrl, "_blank", "noopener,noreferrer");
  };

  const downloadSelectedQrCode = async () => {
    if (!qrDataUrl || !selectedTemplate) return;
    const fileName = `${slugifyTemplateId(selectedTemplate.form_type || selectedTemplate.label || "form")}-qr-code.png`;
    await shareOrDownloadQrCode(qrDataUrl, fileName, `${selectedTemplate.label} QR code`);
  };

  const selectTemplateForDetails = (formType) => {
    setSelectedFormType(formType);
    if (!isTemplateListFocused) setFocusedTemplateType("");
    if (window.matchMedia?.("(max-width: 820px)").matches) {
      setTemplateListHidden(true);
      window.requestAnimationFrame(() => {
        document.querySelector(".template-editor-panel")?.scrollIntoView({ block: "start" });
      });
    }
  };

  if (!staff || loading) return <StaffLoadingScreen />;

  return (
    <StaffShell active="form-templates" contentWide navigateTo={navigateTo} staff={staff}>
      {message ? <p className="staff-message">{message}</p> : null}
      <section className={templateListHidden ? "template-manager-grid menu-hidden" : "template-manager-grid"}>
        {templateListHidden ? (
          <button
            aria-label="Show form template list"
            className="template-list-restore"
            title="Show template list"
            type="button"
            onClick={() => setTemplateListHidden(false)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M5 5h14v14H5zM10 5v14M13 9l3 3-3 3" />
            </svg>
            <span>Templates</span>
          </button>
        ) : null}
        <aside className="template-card-list" aria-label="Form templates">
          <div className="template-list-toolbar">
            {canManageTemplates ? (
              <button
                className="primary-button template-new-button"
                type="button"
                onClick={() => {
                  setFocusedTemplateType("");
                  setNewFormOpen((current) => !current);
                }}
              >
                New Form
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            <button
              className="secondary-button template-fill-button"
              type="button"
              onClick={() => navigateTo("/staff/forms-to-fill-out")}
            >
              Fill Out Forms
            </button>
            <button
              aria-label="Hide form template list"
              className="template-list-toggle"
              title="Hide template list"
              type="button"
              onClick={() => setTemplateListHidden(true)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M5 5h14v14H5zM10 5v14M17 9l-3 3 3 3" />
              </svg>
            </button>
          </div>
          {newFormOpen ? (
            <form className="template-new-form" onSubmit={createTemplate}>
              <label>
                <span>Form name</span>
                <input
                  autoFocus
                  placeholder="Pre-task plan"
                  value={newFormName}
                  onChange={(event) => setNewFormName(event.target.value)}
                />
              </label>
              <div className="staff-card-actions">
                <button
                  type="button"
                  onClick={() => {
                    setNewFormName("");
                    setNewFormOpen(false);
                  }}
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={creating} type="submit">
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          ) : null}
          {isTemplateListFocused && !newFormOpen ? (
            <div className="template-focus-note">
              <span>Focused on the new form.</span>
              <button type="button" onClick={() => setFocusedTemplateType("")}>
                Show all forms
              </button>
            </div>
          ) : null}
          {visibleCurrentTemplates.map((template) => (
            <article
              className={[
                selectedTemplate?.form_type === template.form_type ? "template-card active" : "template-card",
                canDragTemplateOrder ? "has-drag-handle" : "",
                draggedTemplateType === template.form_type ? "dragging" : "",
                dragOverTemplateType === template.form_type ? "drag-over" : "",
              ].filter(Boolean).join(" ")}
              key={template.form_type}
              ref={registerTemplateCard(template.form_type)}
            >
              <button
                className="template-card-main"
                type="button"
                onClick={() => selectTemplateForDetails(template.form_type)}
              >
                <span>
                  {templateAccessLabel(template)}
                </span>
                <strong>{template.label}</strong>
                {template.draftVersion && !isLockedDefaultFormTemplate(template) ? <small>Draft ready</small> : null}
                {isLockedFormTemplate(template) && !isLockedDefaultFormTemplate(template) ? <small>Locked</small> : null}
	                <small>
	                  {template.archived_at
	                    ? "Archived"
	                    : template.active
	                      ? template.worker_visible ? "Shown to workers" : "Hidden from workers"
	                      : "Inactive"}
	                </small>
	                {template.shareLink?.urlPath ? <small>QR link ready</small> : null}
	              </button>
              {template.renderer_type === "template" && canManageTemplates ? (
                <div className="template-card-actions template-duplicate-actions">
                  <button
                    className="template-duplicate-action"
                    disabled={saving}
                    type="button"
                    onClick={() => duplicateTemplate(template)}
                  >
                    Duplicate
                  </button>
                </div>
              ) : null}
              {canDragTemplateOrder ? (
                <button
                  aria-label={`Drag ${template.label} to reorder forms`}
                  className="template-drag-handle"
                  disabled={reordering}
                  type="button"
                  onPointerDown={(event) => startTemplateOrderDrag(event, template.form_type)}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M8 6h8M8 12h8M8 18h8" />
                  </svg>
                </button>
              ) : null}
            </article>
          ))}
          {showArchivedTemplates ? (
            <section className="template-archive-list">
              <button
                aria-expanded={archivedOpen}
                className="template-archive-toggle"
                type="button"
                onClick={() => setArchivedOpen((current) => !current)}
              >
                <span>Archived</span>
                <strong>{archivedTemplates.length}</strong>
              </button>
              {canManageTemplates ? (
                <button
                  className="danger-button"
                  disabled={saving || !archivedPurgeableTemplates.length}
                  type="button"
                  onClick={deleteArchivedTemplates}
                >
                  {saving ? "Deleting..." : "Delete archived"}
                </button>
              ) : null}
              {archivedOpen ? (
                <div className="template-archive-items">
                  {archivedTemplates.map((template) => (
                    <button
                      className={selectedTemplate?.form_type === template.form_type ? "template-card archived active" : "template-card archived"}
                      key={template.form_type}
                      type="button"
                      onClick={() => selectTemplateForDetails(template.form_type)}
                    >
                      <span>
                        {templateAccessLabel(template)}
                      </span>
                      <strong>{template.label}</strong>
                      {template.draftVersion && !isLockedDefaultFormTemplate(template) ? <small>Draft ready</small> : null}
                      {isLockedFormTemplate(template) && !isLockedDefaultFormTemplate(template) ? <small>Locked</small> : null}
                      <small>Archived</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </aside>

        <section className="template-editor-panel">
          {!selectedTemplate ? (
            <p className="empty-state">No form templates found.</p>
          ) : selectedTemplate.renderer_type !== "template" ? (
            <div className="settings-section">
              <div className="settings-section-heading">
                <div>
                  <h2>{selectedTemplate.label}</h2>
                  <p>Special mobile form</p>
                </div>
              </div>
	              <p className="muted">
	                This form uses a polished custom mobile flow. Editable labels and options for this special form will be added in a later phase.
	              </p>
	              <TemplateQrLinkPanel
	                copyStatus={qrCopyStatus}
	                qrDataUrl={qrDataUrl}
	                shareUrl={selectedShareUrl}
	                template={selectedTemplate}
	                onCopy={copySelectedShareLink}
	                onDownload={downloadSelectedQrCode}
	                onOpen={openSelectedShareLink}
	              />
	            </div>
	          ) : (
	            <>
	              <div className="template-editor-heading">
                <div>
                  <p>Form template</p>
                  <h1>{draftSchema?.title || selectedTemplate.label}</h1>
                  <span>
                    Published v{selectedTemplate.publishedVersion?.version_number || "-"}
                    {selectedTemplate.draftVersion && !selectedIsLockedDefault ? " / Draft exists" : ""}
                  </span>
                </div>
                <div className="staff-card-actions">
                  {selectedIsLockedDefault ? (
                    <>
                      <span className="muted template-duplicate-note">Protected default. Duplicate to edit.</span>
                      {canManageTemplates ? (
                        <button
                          className="template-duplicate-action"
                          disabled={saving}
                          type="button"
                          onClick={() => duplicateTemplate(selectedTemplate)}
                        >
                          Duplicate
                        </button>
                      ) : null}
                    </>
                  ) : selectedCanEdit ? (
                    <>
                      {previousVersions.length ? (
                        <button type="button" onClick={() => restoreVersion(previousVersions[0])}>
                          Restore previous version
                        </button>
                      ) : null}
                      <button disabled={saving} type="button" onClick={saveDraft}>
                        {saving ? "Saving..." : "Save draft"}
                      </button>
                      <button className="primary-button" disabled={publishing} type="button" onClick={publishDraft}>
                        {publishing ? "Publishing..." : "Publish"}
                      </button>
                    </>
                  ) : selectedIsLocked ? (
                    <span className="muted">Locked. Unlock to edit.</span>
                  ) : selectedCanManage ? (
                    <span className="muted">View only</span>
                  ) : (
                    <span className="muted">View only</span>
                  )}
	                </div>
	              </div>

	              <TemplateQrLinkPanel
	                copyStatus={qrCopyStatus}
	                qrDataUrl={qrDataUrl}
	                shareUrl={selectedShareUrl}
	                template={selectedTemplate}
	                onCopy={copySelectedShareLink}
	                onDownload={downloadSelectedQrCode}
	                onOpen={openSelectedShareLink}
	              />

	              <TemplateSchemaEditorV3
                active={Boolean(selectedTemplate.active)}
                archived={Boolean(selectedTemplate.archived_at)}
                canArchive={selectedCanArchive}
                canDuplicate={canManageTemplates && selectedTemplate.renderer_type === "template"}
                canLockToggle={Boolean(
                  selectedCanManage &&
                  selectedTemplate.renderer_type === "template" &&
                  !selectedIsLockedDefault &&
                  !selectedTemplate.archived_at
                )}
                hasPublishedVersion={Boolean(selectedTemplate.publishedVersion)}
                locked={selectedIsLocked}
                lockedDefault={selectedIsLockedDefault}
                onArchiveToggle={(archived) =>
                  updateTemplateMeta(archived ? { archived: true } : { archived: false, active: true })
                }
                onChange={selectedCanEdit ? setDraftSchema : () => {}}
                onDuplicate={() => duplicateTemplate(selectedTemplate)}
                onLockToggle={() => {
                  if (selectedIsLocked) {
                    setUnlockingTemplate(selectedTemplate);
                  } else {
                    lockTemplate(selectedTemplate);
                  }
                }}
                onPreviewAnswersChange={setPreviewAnswers}
                onPublish={publishDraft}
                onRestorePrevious={previousVersions.length ? () => restoreVersion(previousVersions[0]) : null}
                onSave={saveDraft}
                onTemplateMetaChange={(patch) => updateTemplateMeta(patch)}
                onToggleWorkerVisible={() =>
                  updateTemplateMeta({ workerVisible: !selectedTemplate.worker_visible })
                }
                previewAnswers={previewAnswers}
                previewWorker={staffToPreviewWorker(staff)}
                publishing={publishing}
                readOnly={!selectedCanEdit}
                saving={saving}
                schema={draftSchema}
                selectedTemplate={selectedTemplate}
                workerVisible={Boolean(selectedTemplate.worker_visible)}
              />
            </>
          )}
        </section>
      </section>
      {unlockingTemplate ? (
        <TemplateUnlockDialog
          saving={saving}
          template={unlockingTemplate}
          onClose={() => setUnlockingTemplate(null)}
          onUnlock={unlockTemplate}
        />
      ) : null}
    </StaffShell>
  );
}

export function StaffActionItemsPage({ navigateTo }) {
  const { staff } = useStaffSession(navigateTo);
  const canManage = ["owner", "admin"].includes(staff?.role);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    company: "",
    project: "",
    assignedTo: "",
    dueFrom: "",
    dueTo: "",
    sourceFormType: "",
    search: "",
    sort: "created_at",
    dir: "desc",
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [records, setRecords] = useState({ rows: [], summary: {} });
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [sourceSubmission, setSourceSubmission] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [retryingSubmissionId, setRetryingSubmissionId] = useState("");
  const [message, setMessage] = useState("");
  const [bulk, setBulk] = useState({ assignedTo: "", dueDate: "", priority: "" });
  const visibleIds = useMemo(() => records.rows.map((row) => row.id), [records.rows]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const loadItems = async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value),
      );
      const payload = await readApiJson(
        await fetch(`/api/staff/action-items?${params}`, { credentials: "include" }),
      );
      setRecords(payload);
      setSelectedIds([]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!staff) return;
    if (!canManage) {
      navigateTo("/staff/home");
      return;
    }
    loadItems();
  }, [staff, canManage, navigateTo]);

  const updateFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const updateBulk = (field, value) => {
    setBulk((current) => ({ ...current, [field]: value }));
  };

  const changeSort = (value) => {
    const [sort, dir] = value.split(":");
    setFilters((current) => ({ ...current, sort, dir }));
  };

  const toggleSelection = (id, checked) => {
    setSelectedIds((current) => {
      if (checked) return current.includes(id) ? current : [...current, id];
      return current.filter((currentId) => currentId !== id);
    });
  };

  const toggleAll = (checked) => {
    setSelectedIds(checked ? visibleIds : []);
  };

  const replaceItem = (item) => {
    setRecords((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.id === item.id ? item : row)),
      summary: summarizeActionItemsForClient(
        current.rows.map((row) => (row.id === item.id ? item : row)),
      ),
    }));
    setSelectedItem((current) => (current?.id === item.id ? item : current));
  };

  const openDetails = async (item) => {
    setSelectedItem(item);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/action-items/${item.id}`, { credentials: "include" }),
      );
      setSelectedItem(payload.item);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const openSourceSubmission = async (item) => {
    if (!item?.source_submission_id) return;
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/submissions/${item.source_submission_id}`, {
          credentials: "include",
        }),
      );
      setSourceSubmission(payload.submission);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const retrySourceSubmissionBackup = async (id) => {
    setRetryingSubmissionId(id);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/submissions/${id}/backup-retry`, {
          method: "POST",
          credentials: "include",
        }),
      );
      setSourceSubmission((current) => (current?.id === id ? payload.submission : current));
      setMessage("Backup retry finished.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setRetryingSubmissionId("");
    }
  };

  const saveItem = async (id, updates) => {
    setSaving(id);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/action-items/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(updates),
        }),
      );
      replaceItem(payload.item);
      setMessage("Action item updated.");
    } catch (error) {
      setMessage(error.message);
      throw error;
    } finally {
      setSaving("");
    }
  };

  const addComment = async (id, body) => {
    setSaving(id);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/action-items/${id}/comments`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        }),
      );
      replaceItem(payload.item);
    } catch (error) {
      setMessage(error.message);
      throw error;
    } finally {
      setSaving("");
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete action item "${item.title}"?`)) return;
    setSaving(item.id);
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/action-items/${item.id}`, {
          method: "DELETE",
          credentials: "include",
        }),
      );
      setRecords((current) => {
        const rows = current.rows.filter((row) => row.id !== payload.id);
        return { ...current, rows, summary: summarizeActionItemsForClient(rows) };
      });
      setSelectedIds((current) => current.filter((id) => id !== payload.id));
      if (selectedItem?.id === payload.id) setSelectedItem(null);
      setMessage("Action item deleted.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving("");
    }
  };

  const runBulkUpdate = async (updates, deleteSelected = false) => {
    const ids = selectedIds.filter((id) => visibleIds.includes(id));
    if (!ids.length) return;
    if (deleteSelected && !window.confirm(`Delete ${ids.length} selected action item${ids.length === 1 ? "" : "s"}?`)) {
      return;
    }
    setSaving("bulk");
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch("/api/staff/action-items/bulk", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids, updates, delete: deleteSelected }),
        }),
      );
      setMessage(
        payload.failed
          ? `Updated ${payload.succeeded}; ${payload.failed} failed.`
          : `Updated ${payload.succeeded} action item${payload.succeeded === 1 ? "" : "s"}.`,
      );
      await loadItems();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving("");
    }
  };

  const applyBulkFields = () => {
    const updates = {};
    if (bulk.assignedTo.trim()) updates.assignedTo = bulk.assignedTo.trim();
    if (bulk.dueDate) updates.dueDate = bulk.dueDate;
    if (bulk.priority) updates.priority = bulk.priority;
    if (!Object.keys(updates).length) {
      setMessage("Choose at least one bulk field to update.");
      return;
    }
    runBulkUpdate(updates);
  };

  const uploadEvidence = async (item, selectedFile) => {
    if (!selectedFile) return;
    setSaving(item.id);
    setMessage("");
    try {
      const target = await readApiJson(
        await fetch(`/api/staff/action-items/${item.id}/files/upload-url`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
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
      const uploadResponse = await fetch(target.upload.signedUrl, {
        method: "PUT",
        body: formData,
      });
      if (!uploadResponse.ok) throw new Error("Evidence upload failed.");
      const payload = await readApiJson(
        await fetch(`/api/staff/action-items/${item.id}/files`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            storagePath: target.upload.storagePath,
            file: {
              originalFilename: selectedFile.name,
              mimeType: selectedFile.type || "application/octet-stream",
              sizeBytes: selectedFile.size,
            },
          }),
        }),
      );
      replaceItem(payload.item);
    } catch (error) {
      setMessage(error.message);
      throw error;
    } finally {
      setSaving("");
    }
  };

  const openEvidencePreview = async (item, file) => {
    setMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/action-items/${item.id}/files/${file.id}/url`, {
          credentials: "include",
        }),
      );
      setFilePreview(payload);
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!staff || !canManage) return <StaffLoadingScreen />;

  const summary = records.summary || {};

  return (
    <StaffShell active="action-items" contentWide navigateTo={navigateTo} staff={staff}>
      <div className="staff-filter-toggle-row">
        <button
          aria-controls="staff-action-filters"
          aria-expanded={filtersOpen}
          aria-label={filtersOpen ? "Hide filters" : "Show filters"}
          className={filtersOpen ? "staff-filter-icon-button active" : "staff-filter-icon-button"}
          type="button"
          onClick={() => setFiltersOpen((current) => !current)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 5h16l-6 7v5l-4 2v-7L4 5z" />
          </svg>
        </button>
      </div>

      {filtersOpen ? (
        <section className="staff-toolbar staff-form-filter-toolbar" id="staff-action-filters">
          <label className="field">
            <span>Status</span>
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">All</option>
              {ACTION_ITEM_STATUS_OPTIONS.map((status) => (
                <option key={status.id} value={status.id}>{status.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Priority</span>
            <select value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value)}>
              <option value="">All</option>
              {ACTION_ITEM_PRIORITY_OPTIONS.map((priority) => (
                <option key={priority.id} value={priority.id}>{priority.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Company</span>
            <input value={filters.company} onChange={(event) => updateFilter("company", event.target.value)} />
          </label>
          <label className="field">
            <span>Project</span>
            <input value={filters.project} onChange={(event) => updateFilter("project", event.target.value)} />
          </label>
          <label className="field">
            <span>Assigned to</span>
            <input value={filters.assignedTo} onChange={(event) => updateFilter("assignedTo", event.target.value)} />
          </label>
          <label className="field">
            <span>Due from</span>
            <input type="date" value={filters.dueFrom} onChange={(event) => updateFilter("dueFrom", event.target.value)} />
          </label>
          <label className="field">
            <span>Due to</span>
            <input type="date" value={filters.dueTo} onChange={(event) => updateFilter("dueTo", event.target.value)} />
          </label>
          <label className="field">
            <span>Source form</span>
            <select value={filters.sourceFormType} onChange={(event) => updateFilter("sourceFormType", event.target.value)}>
              <option value="">All</option>
              {SAFETY_FORM_TYPES.map((form) => (
                <option key={form.id} value={form.id}>{form.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Search</span>
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
          </label>
          <label className="field">
            <span>Sort</span>
            <select value={`${filters.sort}:${filters.dir}`} onChange={(event) => changeSort(event.target.value)}>
              <option value="created_at:desc">Newest</option>
              <option value="due_date:asc">Due soon</option>
              <option value="priority:desc">Priority</option>
              <option value="status:asc">Status</option>
              <option value="company:asc">Company</option>
              <option value="project:asc">Project</option>
            </select>
          </label>
          <button className="primary-button" type="button" onClick={loadItems}>
            Apply
          </button>
        </section>
      ) : null}

      {message ? <p className="staff-message">{message}</p> : null}

      <section className="ops-metric-grid action-item-metric-grid">
        <OpsMetric label="Drafts" value={summary.drafts} />
        <OpsMetric label="Open" value={summary.open} />
        <OpsMetric label="Overdue" value={summary.overdue} />
        <OpsMetric label="Due soon" value={summary.dueSoon} />
        <OpsMetric label="Ready" value={summary.readyForReview} />
      </section>

      <section className="staff-table-panel">
        <div className="staff-table-heading">
          <div className="staff-table-heading-main">
            <strong>{records.rows.length} action items</strong>
            <span>{describeActionItemSort(filters.sort, filters.dir)}</span>
          </div>
          {canManage ? (
            <div className="staff-bulk-actions action-bulk-actions">
              <span>{selectedIds.length} selected</span>
              <div className="action-bulk-controls">
                <input
                  aria-label="Bulk assigned to"
                  placeholder="Assign to"
                  value={bulk.assignedTo}
                  onChange={(event) => updateBulk("assignedTo", event.target.value)}
                />
                <input
                  aria-label="Bulk due date"
                  type="date"
                  value={bulk.dueDate}
                  onChange={(event) => updateBulk("dueDate", event.target.value)}
                />
                <select
                  aria-label="Bulk priority"
                  value={bulk.priority}
                  onChange={(event) => updateBulk("priority", event.target.value)}
                >
                  <option value="">Priority</option>
                  {ACTION_ITEM_PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority.id} value={priority.id}>{priority.label}</option>
                  ))}
                </select>
              </div>
              <button
                disabled={!selectedIds.length || saving === "bulk"}
                type="button"
                onClick={() => runBulkUpdate({ status: "open" })}
              >
                Activate
              </button>
              <button
                disabled={!selectedIds.length || saving === "bulk"}
                type="button"
                onClick={applyBulkFields}
              >
                Apply bulk
              </button>
              <button
                disabled={!selectedIds.length || saving === "bulk"}
                type="button"
                onClick={() => runBulkUpdate({ status: "void" })}
              >
                Void
              </button>
              <button
                className="danger-button"
                disabled={!selectedIds.length || saving === "bulk"}
                type="button"
                onClick={() => runBulkUpdate({}, true)}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
        <ActionItemsTable
          allVisibleSelected={allVisibleSelected}
          canManage={canManage}
          loading={loading}
          rows={records.rows}
          saving={saving}
          selectedIds={selectedIds}
          onDelete={deleteItem}
          onDetails={openDetails}
          onSelectAll={toggleAll}
          onSelectRow={toggleSelection}
          onUpdate={saveItem}
        />
      </section>

      {selectedItem ? (
        <ActionItemDetailsDialog
          canManage={canManage}
          item={selectedItem}
          saving={saving === selectedItem.id}
          onClose={() => setSelectedItem(null)}
          onComment={addComment}
          onDelete={deleteItem}
          onFilePreview={openEvidencePreview}
          onOpenSource={openSourceSubmission}
          onSave={saveItem}
          onUploadEvidence={uploadEvidence}
        />
      ) : null}
      {sourceSubmission ? (
        <SubmissionDetailsDialog
          canRetry={canManage}
          retryingId={retryingSubmissionId}
          row={sourceSubmission}
          onClose={() => setSourceSubmission(null)}
          onRetry={retrySourceSubmissionBackup}
        />
      ) : null}
      {filePreview ? (
        <SubmissionFilePreviewDialog
          preview={filePreview}
          onClose={() => setFilePreview(null)}
        />
      ) : null}
    </StaffShell>
  );
}

function TemplateSchemaEditorV3({
  active,
  archived,
  canArchive = false,
  canDuplicate = true,
  canLockToggle = false,
  hasPublishedVersion,
  locked = false,
  lockedDefault = false,
  onArchiveToggle,
  onChange,
  onDuplicate,
  onLockToggle,
  onPreviewAnswersChange,
  onPublish,
  onRestorePrevious,
  onSave,
  onTemplateMetaChange,
  onToggleWorkerVisible,
  previewAnswers = {},
  previewWorker,
  publishing,
  readOnly = false,
  saving,
  schema,
  selectedTemplate,
  workerVisible,
}) {
  const current = normalizeClientTemplateSchema(schema);
  const canEdit = !readOnly;
  const sections = Array.isArray(current.sections) ? current.sections : [];
  const fieldCount = collectClientTemplateFields(current).length;
  const [selected, setSelected] = useState({ kind: "header" });
  const [sidebarFocus, setSidebarFocus] = useState("template");
  const sidebarPointerFocusRef = useRef("");
  const [view, setView] = useState("editor");
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [fieldPickerTab, setFieldPickerTab] = useState("basics");
  const [optionDraft, setOptionDraft] = useState("");
  const selectedSection =
    selected.kind === "section" || selected.kind === "field"
      ? sections[selected.sectionIndex]
      : null;
  const selectedField = selected.kind === "field"
    ? selectedSection?.fields?.[selected.fieldIndex]
    : null;
  const selectedFieldIsNonAnswer = selectedField ? isTemplateNonAnswerField(selectedField) : false;
  const activeSelection =
    selected.kind === "field" && selectedField
      ? selected
      : selected.kind === "section" && selectedSection
        ? selected
        : { kind: "header" };
  const targetSectionIndex =
    activeSelection.kind === "field" || activeSelection.kind === "section"
      ? activeSelection.sectionIndex
      : Math.max(sections.length - 1, 0);
  const activeFieldGroup =
    TEMPLATE_V3_FIELD_GROUPS.find((group) => group.id === fieldPickerTab) || TEMPLATE_V3_FIELD_GROUPS[0];
  const canToggleVisibility = canEdit && hasPublishedVersion && active && !archived && !saving;
  const useToolboxTalkPreview = isToolboxTalkTemplateSchema(current, selectedTemplate);
  const useSiteInspectionPreview = isSiteInspectionTemplateSchema(current, selectedTemplate);
  const hasUnpublishedDraft = Boolean(
    !lockedDefault &&
    !locked &&
    selectedTemplate?.draftVersion &&
    selectedTemplate?.publishedVersion,
  );
  const readOnlyNote = locked
    ? "Locked. Unlock to edit."
    : lockedDefault
      ? "Protected default. Duplicate to edit."
      : "View only.";

  useEffect(() => {
    setOptionDraft("");
  }, [selectedField?.id]);

  useEffect(() => {
    if (readOnly) setFieldPickerOpen(false);
  }, [readOnly]);

  useEffect(() => {
    setSidebarFocus(activeSelection.kind === "header" ? "template" : "selected");
  }, [activeSelection.kind, activeSelection.sectionIndex, activeSelection.fieldIndex]);

  const updateSchema = (patch) => onChange({ ...current, ...patch });
  const changeView = (nextView) => {
    setView(nextView);
  };
  const updateSection = (sectionIndex, patch) => {
    if (!canEdit) return;
    onChange({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex ? { ...section, ...patch } : section,
      ),
    });
  };
  const updateField = (sectionIndex, fieldIndex, patch) => {
    if (!canEdit) return;
    onChange({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              fields: section.fields.map((field, nextIndex) =>
                nextIndex === fieldIndex ? normalizeTemplateField({ ...field, ...patch }) : field,
              ),
            }
          : section,
      ),
    });
  };
  const updateSectionSettings = (sectionIndex, patch) => {
    if (!canEdit) return;
    const section = current.sections[sectionIndex] || {};
    updateSection(sectionIndex, {
      settings: {
        ...normalizeTemplateSettings(section.settings),
        ...patch,
      },
    });
  };
  const updateSelectedFieldSettings = (patch) => {
    if (!canEdit) return;
    if (!selectedField || activeSelection.kind !== "field") return;
    updateField(activeSelection.sectionIndex, activeSelection.fieldIndex, {
      settings: {
        ...normalizeTemplateSettings(selectedField.settings),
        ...patch,
      },
    });
  };
  const updateSectionLayoutWidth = (sectionIndex, width) => {
    const section = current.sections[sectionIndex] || {};
    const layout = getTemplateSettingValue(section.settings, "layout");
    updateSectionSettings(sectionIndex, {
      layout: {
        ...(layout && typeof layout === "object" && !Array.isArray(layout) ? layout : {}),
        width,
      },
    });
  };
  const updateSelectedFieldLayoutWidth = (width) => {
    const layout = getTemplateSettingValue(selectedField?.settings, "layout");
    updateSelectedFieldSettings({
      layout: {
        ...(layout && typeof layout === "object" && !Array.isArray(layout) ? layout : {}),
        width,
      },
    });
  };
  const applyOptionPresetToSelectedField = (presetId) => {
    if (!selectedField || !TEMPLATE_OPTION_FIELD_TYPES.has(selectedField.type)) return;
    const preset = TEMPLATE_OPTION_PRESETS.find((item) => item.id === presetId) || TEMPLATE_OPTION_PRESETS[0];
    updateField(activeSelection.sectionIndex, activeSelection.fieldIndex, {
      options: preset.options ? preset.options : selectedField.options,
      settings: {
        ...normalizeTemplateSettings(selectedField.settings),
        optionPreset: preset.id,
      },
    });
  };
  const addVisibilityDriverForSection = (sectionIndex) => {
    if (!canEdit) return;
    const targetSection = current.sections[sectionIndex];
    if (!targetSection) return;
    const driverId = `visibility_driver_${Date.now()}`;
    const driverSection = createTemplateSection(sectionIndex + 1, {
      title: "Visibility",
      description: "",
    });
    driverSection.id = `${driverSection.id}_${Date.now()}`;
    driverSection.fields = [
      createTemplateField(1, "yes_no", {
        id: driverId,
        label: `Show ${targetSection.title || "this section"}?`,
      }),
    ];
    const nextSections = [...current.sections];
    const targetWithCondition = {
      ...targetSection,
      settings: {
        ...normalizeTemplateSettings(targetSection.settings),
        visibility: {
          enabled: true,
          sourceFieldId: driverId,
          operator: "equals",
          value: "yes",
        },
      },
    };
    nextSections.splice(sectionIndex, 1, driverSection, targetWithCondition);
    onChange({ ...current, sections: nextSections });
    setSelected({ kind: "section", sectionIndex: sectionIndex + 1 });
    changeView("editor");
  };
  const addVisibilityDriverForField = (sectionIndex, fieldIndex) => {
    if (!canEdit) return;
    const section = current.sections[sectionIndex];
    const targetField = section?.fields?.[fieldIndex];
    if (!section || !targetField) return;
    const driverId = `visibility_driver_${Date.now()}`;
    const driverField = createTemplateField(fieldIndex + 1, "yes_no", {
      id: driverId,
      label: `Show ${targetField.label || "this field"}?`,
    });
    const targetWithCondition = normalizeTemplateField({
      ...targetField,
      settings: {
        ...normalizeTemplateSettings(targetField.settings),
        visibility: {
          enabled: true,
          sourceFieldId: driverId,
          operator: "equals",
          value: "yes",
        },
      },
    });
    onChange({
      ...current,
      sections: current.sections.map((item, index) => {
        if (index !== sectionIndex) return item;
        const fields = [...item.fields];
        fields.splice(fieldIndex, 1, driverField, targetWithCondition);
        return { ...item, fields };
      }),
    });
    setSelected({ kind: "field", sectionIndex, fieldIndex: fieldIndex + 1 });
    changeView("editor");
  };
  const selectBlock = (nextSelection) => {
    setSelected(nextSelection);
    changeView("editor");
  };
  const addSection = () => {
    if (!canEdit) return;
    const sectionIndex = current.sections.length;
    onChange({
      ...current,
      sections: [...current.sections, createTemplateSection(sectionIndex + 1, { title: "" })],
    });
    selectBlock({ kind: "section", sectionIndex });
  };
  const removeSection = (sectionIndex) => {
    if (!canEdit) return;
    onChange({
      ...current,
      sections: current.sections.filter((_, index) => index !== sectionIndex),
    });
    setSelected({ kind: "header" });
  };
  const moveSection = (sectionIndex, direction) => {
    if (!canEdit) return;
    onChange({ ...current, sections: moveArrayItem(current.sections, sectionIndex, direction) });
    setSelected({ kind: "section", sectionIndex: sectionIndex + direction });
  };
  const addFieldFromConfig = (fieldConfig, sectionIndex = targetSectionIndex) => {
    if (!canEdit) return;
    if (!fieldConfig || fieldConfig.disabled) return;
    const hasSections = current.sections.length > 0;
    const safeSectionIndex = hasSections
      ? Math.max(0, Math.min(sectionIndex, current.sections.length - 1))
      : 0;
    const sourceSections = hasSections ? current.sections : [createTemplateSection(1, { title: "" })];
    const target = sourceSections[safeSectionIndex];
    const fieldIndex = target.fields.length;
    const field = createTemplateField(fieldIndex + 1, fieldConfig.type, {
      label: fieldConfig.label ?? "",
      required: Boolean(fieldConfig.required),
      default: fieldConfig.default || "",
      options: fieldConfig.options || (TEMPLATE_OPTION_FIELD_TYPES.has(fieldConfig.type) ? ["Option 1", "Option 2"] : []),
      settings: normalizeTemplateSettings(fieldConfig.settings),
    });
    onChange({
      ...current,
      sections: sourceSections.map((section, index) =>
        index === safeSectionIndex
          ? { ...section, fields: [...section.fields, field] }
          : section,
      ),
    });
    setSelected({ kind: "field", sectionIndex: safeSectionIndex, fieldIndex });
    changeView("editor");
    setFieldPickerOpen(false);
  };
  const duplicateField = (sectionIndex, fieldIndex) => {
    if (!canEdit) return;
    onChange({
      ...current,
      sections: current.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        const source = section.fields[fieldIndex];
        const duplicate = normalizeTemplateField({
          ...source,
          id: `${source.id || "field"}_${Date.now()}`,
          label: source.label ? `${source.label} copy` : "",
        });
        const fields = [...section.fields];
        fields.splice(fieldIndex + 1, 0, duplicate);
        return { ...section, fields };
      }),
    });
    setSelected({ kind: "field", sectionIndex, fieldIndex: fieldIndex + 1 });
  };
  const removeField = (sectionIndex, fieldIndex) => {
    if (!canEdit) return;
    onChange({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex
          ? { ...section, fields: section.fields.filter((_, nextIndex) => nextIndex !== fieldIndex) }
          : section,
      ),
    });
    setSelected({ kind: "section", sectionIndex });
  };
  const moveField = (sectionIndex, fieldIndex, direction) => {
    if (!canEdit) return;
    onChange({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex
          ? { ...section, fields: moveArrayItem(section.fields, fieldIndex, direction) }
          : section,
      ),
    });
    setSelected({ kind: "field", sectionIndex, fieldIndex: fieldIndex + direction });
  };
  const updateSelectedFieldType = (type) => {
    if (!canEdit) return;
    if (!selectedField || activeSelection.kind !== "field") return;
    updateField(activeSelection.sectionIndex, activeSelection.fieldIndex, {
      type,
      options:
        TEMPLATE_OPTION_FIELD_TYPES.has(type) && !(selectedField.options || []).length
          ? ["Option 1", "Option 2"]
          : selectedField.options,
    });
  };
  const addOptionToSelectedField = () => {
    if (!canEdit) return;
    if (!selectedField || !TEMPLATE_OPTION_FIELD_TYPES.has(selectedField.type)) return;
    const option = optionDraft.trim();
    if (!option || (selectedField.options || []).includes(option)) {
      setOptionDraft("");
      return;
    }
    updateField(activeSelection.sectionIndex, activeSelection.fieldIndex, {
      options: [...(selectedField.options || []), option],
    });
    setOptionDraft("");
  };
  const removeSelectedFieldOption = (option) => {
    if (!canEdit) return;
    if (!selectedField || !TEMPLATE_OPTION_FIELD_TYPES.has(selectedField.type)) return;
    updateField(activeSelection.sectionIndex, activeSelection.fieldIndex, {
      options: (selectedField.options || []).filter((item) => item !== option),
    });
  };
  const selectedToolboxTopicSettings = selectedField?.type === "toolbox_topics"
    ? getToolboxTopicSettings(selectedField.settings)
    : null;
  const selectedActionItemRowsSettings = selectedField && ACTION_ITEM_ROW_BLOCK_TYPES.has(selectedField.type)
    ? normalizeActionItemRowsSettings(selectedField.settings, selectedField.type)
    : null;
  const selectedToolboxCompositeSettings = selectedField && toolboxCompositeConfig(selectedField.type)
    ? normalizeToolboxCompositeSettings(selectedField.settings, selectedField.type)
    : null;
  const updateSelectedActionItemRowsSettings = (nextSettings) => {
    updateSelectedFieldSettings({ actionItemRows: serializeActionItemRowsSettings(nextSettings) });
  };
  const updateSelectedToolboxCompositeSettings = (nextSettings) => {
    if (!nextSettings?.settingsKey) return;
    updateSelectedFieldSettings({
      [nextSettings.settingsKey]: serializeToolboxCompositeSettings(nextSettings),
    });
  };
  const updateActionItemRowLabel = (key, label) => {
    if (!selectedActionItemRowsSettings) return;
    updateSelectedActionItemRowsSettings({
      ...selectedActionItemRowsSettings,
      subfields: selectedActionItemRowsSettings.subfields.map((field) =>
        field.key === key ? { ...field, label } : field,
      ),
    });
  };
  const updateActionItemRowVisibility = (key, visible) => {
    if (!selectedActionItemRowsSettings) return;
    updateSelectedActionItemRowsSettings({
      ...selectedActionItemRowsSettings,
      subfields: selectedActionItemRowsSettings.subfields.map((field) =>
        field.key === key ? { ...field, visible: field.lockedVisible ? true : visible } : field,
      ),
    });
  };
  const moveActionItemRowSubfield = (index, direction) => {
    if (!selectedActionItemRowsSettings) return;
    updateSelectedActionItemRowsSettings({
      ...selectedActionItemRowsSettings,
      subfields: moveArrayItem(selectedActionItemRowsSettings.subfields, index, direction),
    });
  };
  const updateToolboxCompositeSubfieldLabel = (key, label) => {
    if (!selectedToolboxCompositeSettings) return;
    updateSelectedToolboxCompositeSettings({
      ...selectedToolboxCompositeSettings,
      subfields: selectedToolboxCompositeSettings.subfields.map((field) =>
        field.key === key ? { ...field, label } : field,
      ),
    });
  };
  const updateToolboxCompositeSubfieldVisibility = (key, visible) => {
    if (!selectedToolboxCompositeSettings) return;
    updateSelectedToolboxCompositeSettings({
      ...selectedToolboxCompositeSettings,
      subfields: selectedToolboxCompositeSettings.subfields.map((field) =>
        field.key === key ? { ...field, visible } : field,
      ),
    });
  };
  const moveToolboxCompositeSubfield = (index, direction) => {
    if (!selectedToolboxCompositeSettings) return;
    updateSelectedToolboxCompositeSettings({
      ...selectedToolboxCompositeSettings,
      subfields: moveArrayItem(selectedToolboxCompositeSettings.subfields, index, direction),
    });
  };
  const handleSidebarCardPointerDown = (card) => {
    sidebarPointerFocusRef.current = card;
  };
  const handleSidebarCardPointerEnd = () => {
    sidebarPointerFocusRef.current = "";
  };
  const handleSidebarCardFocus = (card) => {
    if (sidebarPointerFocusRef.current !== card) setSidebarFocus(card);
  };
  return (
    <div className="template-v3-builder">
      <div className="template-v3-mobile-lock">
        <h2>Form Builder V3 is designed for laptop or desktop editing.</h2>
        <p>Please use a larger screen to build or edit form templates. Worker form filling still works on mobile.</p>
      </div>

      <div className="template-v3-workspace">
        <section className="template-v3-main">
          <div className="template-v3-toolbar">
            <div className="template-v3-tabs" role="tablist" aria-label="Builder V3 views">
              {[
                ["editor", "Editor"],
                ["preview", "Preview"],
              ].map(([id, label]) => (
                <button
                  className={view === id ? "active" : ""}
                  key={id}
                  type="button"
                  onClick={() => changeView(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="template-v3-toolbar-actions">
              {canEdit ? (
                <>
                  <button type="button" onClick={addSection}>
                    New Section +
                  </button>
                  <button className="primary-button" type="button" onClick={() => setFieldPickerOpen(true)}>
                    New Field +
                  </button>
                </>
              ) : (
                <span className="template-v3-protected-note">
                  {readOnlyNote}
                </span>
              )}
            </div>
          </div>

          {view === "preview" ? (
            <section className="template-v3-preview-page">
              <div className="template-v3-page-header">
                <span>Preview</span>
                <h2>{current.title || selectedTemplate.label}</h2>
                {current.description ? <p>{current.description}</p> : null}
              </div>
              {fieldCount ? (
                useToolboxTalkPreview ? (
                  <ToolboxTalkTemplatePreview
                    answers={previewAnswers}
                    schema={current}
                    worker={previewWorker}
                    onChange={onPreviewAnswersChange}
                  />
                ) : useSiteInspectionPreview ? (
                  <SiteInspectionTemplatePreview
                    answers={previewAnswers}
                    schema={current}
                    worker={previewWorker}
                    onChange={onPreviewAnswersChange}
                  />
                ) : (
                  <TemplateFormFields
                    assetSearchEndpoint="/api/staff/assets"
                    answers={previewAnswers}
                    schema={current}
                    worker={previewWorker}
                    onChange={onPreviewAnswersChange}
                  />
                )
              ) : (
                <div className="template-v3-empty-page">
                  <h2>No fields yet</h2>
                  <p>Add fields before previewing the worker form.</p>
                  {canEdit ? <button type="button" onClick={() => setFieldPickerOpen(true)}>New Field +</button> : null}
                </div>
              )}
            </section>
          ) : (
            <section className="template-v3-canvas" aria-label="Builder V3 canvas">
              <button
                className={activeSelection.kind === "header" ? "template-v3-form-header selected" : "template-v3-form-header"}
                type="button"
                onClick={() => selectBlock({ kind: "header" })}
              >
                <span>Form header</span>
                <strong>{current.title || selectedTemplate.label}</strong>
                <small>{current.description || "Click to edit form name and description."}</small>
              </button>

              {!sections.length ? (
                <div className="template-v3-empty-page">
                  <span>Blank template</span>
                  <h2>Start with your first section or field</h2>
                  <p>Add a section to organize the form, or add a field and we will create the first section for you.</p>
                  {canEdit ? (
                    <div className="template-v3-empty-actions">
                      <button type="button" onClick={addSection}>
                        New Section +
                      </button>
                      <button className="primary-button" type="button" onClick={() => setFieldPickerOpen(true)}>
                        New Field +
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {sections.map((section, sectionIndex) => (
                <article
                  className={
                    activeSelection.kind === "section" && activeSelection.sectionIndex === sectionIndex
                      ? "template-v3-section selected"
                      : "template-v3-section"
                  }
                  key={section.id || sectionIndex}
                >
                  <div className="template-v3-section-head">
                    <button type="button" onClick={() => selectBlock({ kind: "section", sectionIndex })}>
                      <span>Section</span>
                      <strong>{section.title || `Section ${sectionIndex + 1}`}</strong>
                      <small>
                        {section.description || `${section.fields.length} field${section.fields.length === 1 ? "" : "s"}`}
                        {normalizeTemplateVisibilitySettings(section.settings).enabled ? " / conditional" : ""}
                      </small>
                    </button>
                    {canEdit ? (
                      <div>
                        <button disabled={sectionIndex === 0} type="button" onClick={() => moveSection(sectionIndex, -1)}>Up</button>
                        <button disabled={sectionIndex === sections.length - 1} type="button" onClick={() => moveSection(sectionIndex, 1)}>Down</button>
                        <button className="danger-button" type="button" onClick={() => removeSection(sectionIndex)}>Delete</button>
                      </div>
                    ) : null}
                  </div>

                  <div className="template-v3-field-list">
                    {(section.fields || []).map((field, fieldIndex) => (
                      <article
                        className={
                          activeSelection.kind === "field" &&
                          activeSelection.sectionIndex === sectionIndex &&
                          activeSelection.fieldIndex === fieldIndex
                            ? "template-v3-field-card selected"
                            : "template-v3-field-card"
                        }
                        key={field.id || fieldIndex}
                      >
                        <button type="button" onClick={() => selectBlock({ kind: "field", sectionIndex, fieldIndex })}>
                          <span>{templateFieldTypeLabel(field.type)}</span>
                          <strong>{field.label || `Field ${fieldIndex + 1}`}</strong>
                          <small>
                            {TEMPLATE_SPECIAL_BLOCK_TYPES.has(field.type)
                              ? "Special block"
                              : (
                                  <>
                                    {templateFieldIsHidden(field) ? "Hidden" : field.required ? "Required" : "Optional"}
                                    {field.remember ? " / remembered" : ""}
                                    {normalizeTemplateVisibilitySettings(field.settings).enabled ? " / conditional" : ""}
                                  </>
                                )}
                          </small>
                        </button>
                        {canEdit ? (
                          <div className="template-v3-field-actions">
                            <button disabled={fieldIndex === 0} type="button" onClick={() => moveField(sectionIndex, fieldIndex, -1)}>Up</button>
                            <button disabled={fieldIndex === section.fields.length - 1} type="button" onClick={() => moveField(sectionIndex, fieldIndex, 1)}>Down</button>
                            <button type="button" onClick={() => duplicateField(sectionIndex, fieldIndex)}>Duplicate</button>
                            <button className="danger-button" type="button" onClick={() => removeField(sectionIndex, fieldIndex)}>Delete</button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>

                  {canEdit ? (
                    <button className="template-v3-add-row" type="button" onClick={() => setFieldPickerOpen(true)}>
                      New Field +
                    </button>
                  ) : null}
                </article>
              ))}

              {sections.length && canEdit ? (
                <button className="template-v3-add-section" type="button" onClick={addSection}>
                  New Section +
                </button>
              ) : null}
            </section>
          )}
        </section>

        <aside
          className={[
            "template-v3-sidebar",
            activeSelection.kind === "header" ? "" : "has-active-block",
            sidebarFocus === "selected" ? "focus-selected" : "focus-template",
          ].filter(Boolean).join(" ")}
          aria-label="Builder V3 settings"
        >
          <section
            className={[
              "template-v3-side-card template-v3-template-options-card",
              canLockToggle ? "has-lock-button" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => setSidebarFocus("template")}
            onFocusCapture={() => handleSidebarCardFocus("template")}
            onPointerCancel={handleSidebarCardPointerEnd}
            onPointerDown={() => handleSidebarCardPointerDown("template")}
            onPointerUp={handleSidebarCardPointerEnd}
          >
            {canLockToggle ? (
              <button
                aria-label={locked ? `Unlock ${selectedTemplate.label}` : `Lock ${selectedTemplate.label}`}
                className={locked ? "template-lock-button locked" : "template-lock-button"}
                disabled={saving}
                title={locked ? "Unlock" : "Lock"}
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onLockToggle?.();
                }}
              >
                {locked ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M7 11V8a5 5 0 0 1 9.4-2.4" />
                    <path d="M6 11h12v9H6z" />
                    <path d="M12 15v2" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    <path d="M6 11h12v9H6z" />
                    <path d="M12 15v2" />
                  </svg>
                )}
              </button>
            ) : null}
            <div className="template-v3-side-heading">
              <span>Options</span>
              <h2>Template</h2>
            </div>
            <label>
              <span>Form name</span>
              <input
                disabled={readOnly}
                value={current.title || ""}
                onChange={(event) => updateSchema({ title: event.target.value })}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                disabled={readOnly}
                rows="4"
                value={current.description || ""}
                onChange={(event) => updateSchema({ description: event.target.value })}
              />
            </label>
            <label className="settings-checkbox compact">
              <input
                checked={Boolean(active)}
                disabled={readOnly || saving || archived}
                type="checkbox"
                onChange={(event) => onTemplateMetaChange({ active: event.target.checked })}
              />
              <span>
                Active template
                <small>Inactive forms are hidden from workers.</small>
              </span>
            </label>
            <label className={canToggleVisibility ? "settings-checkbox compact" : "settings-checkbox compact disabled"}>
              <input
                checked={Boolean(workerVisible)}
                disabled={!canToggleVisibility}
                type="checkbox"
                onChange={onToggleWorkerVisible}
              />
              <span>
                Show to workers
                <small>{hasPublishedVersion ? "Workers see this only when active." : "Publish before showing."}</small>
              </span>
            </label>
            <div className="template-v3-status-grid">
              <span>{hasPublishedVersion ? "Published" : "Draft only"}</span>
              <span>{workerVisible ? "Visible" : "Hidden"}</span>
              <span>{locked ? "Locked" : lockedDefault ? "Protected" : archived ? "Archived" : active ? "Active" : "Inactive"}</span>
            </div>
            {hasUnpublishedDraft ? (
              <p className="template-v3-draft-live-note">
                Draft changes are not live yet. The Worker URL still shows published v{selectedTemplate.publishedVersion?.version_number || "-"} until you publish.
              </p>
            ) : null}
            <div className="template-v3-actions">
              {canEdit ? (
                <>
                  <button disabled={saving} type="button" onClick={onSave}>{saving ? "Saving..." : "Save draft"}</button>
                  <button className="primary-button" disabled={publishing} type="button" onClick={onPublish}>
                    {publishing ? "Publishing..." : "Publish"}
                  </button>
                </>
              ) : null}
              <button type="button" onClick={() => changeView("preview")}>Preview</button>
              {canDuplicate ? (
                <button
                  className="template-duplicate-action"
                  disabled={saving}
                  type="button"
                  onClick={onDuplicate}
                >
                  Duplicate
                </button>
              ) : null}
              {canEdit && onRestorePrevious ? <button disabled={saving} type="button" onClick={onRestorePrevious}>Restore previous</button> : null}
              {canArchive ? (
                <button
                  className={archived ? "" : "danger-button"}
                  type="button"
                  onClick={() => {
                    if (archived) {
                      onArchiveToggle(false);
                    } else if (window.confirm(`Archive ${selectedTemplate.label}? Workers will not see it.`)) {
                      onArchiveToggle(true);
                    }
                  }}
                >
                  {archived ? "Restore archived" : "Archive form"}
                </button>
              ) : null}
            </div>
            {readOnly ? (
              <p className="template-v3-help-text">
                {locked
                  ? "Locked. Unlock to edit."
                  : lockedDefault
                  ? "This default form is protected. Duplicate it to make an editable copy."
                  : "You can preview this template, but cannot edit it with your current access."}
              </p>
            ) : null}
            <p className="template-v3-worker-url">Worker URL: /forms/{selectedTemplate.form_type}</p>
          </section>

          <section
            className="template-v3-side-card template-v3-selected-block-card"
            onClick={() => setSidebarFocus("selected")}
            onFocusCapture={() => handleSidebarCardFocus("selected")}
            onPointerCancel={handleSidebarCardPointerEnd}
            onPointerDown={() => handleSidebarCardPointerDown("selected")}
            onPointerUp={handleSidebarCardPointerEnd}
          >
            <div className="template-v3-side-heading">
              <span>Selected Block</span>
              <h2>
                {activeSelection.kind === "field"
                  ? "Field"
                  : activeSelection.kind === "section"
                    ? "Section"
                    : "Form header"}
              </h2>
            </div>

            {activeSelection.kind === "header" ? (
              <p className="template-v3-help-text">
                {readOnly
                  ? locked
                    ? "Locked. Select a section or field to inspect it, or unlock the template to edit."
                    : lockedDefault
                    ? "This default form is protected. Select a section or field to inspect it, or duplicate the form to edit."
                    : "Select a section or field to inspect it."
                  : "Select a section or field on the canvas to edit its block settings."}
              </p>
            ) : null}

            {activeSelection.kind === "section" && selectedSection ? (
              <div className="template-v3-inspector-body">
                <label>
                  <span>Section title</span>
                  <input
                    disabled={readOnly}
                    value={selectedSection.title || ""}
                    onChange={(event) => updateSection(activeSelection.sectionIndex, { title: event.target.value })}
                  />
                </label>
                <label>
                  <span>Section description</span>
                  <textarea
                    disabled={readOnly}
                    rows="3"
                    value={selectedSection.description || ""}
                    onChange={(event) => updateSection(activeSelection.sectionIndex, { description: event.target.value })}
                  />
                </label>
                <label>
                  <span>Section width</span>
                  <select
                    disabled={readOnly}
                    value={normalizeTemplateLayoutWidth(selectedSection.settings)}
                    onChange={(event) => updateSectionLayoutWidth(activeSelection.sectionIndex, event.target.value)}
                  >
                    {TEMPLATE_LAYOUT_WIDTH_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="settings-checkbox compact">
                  <input
                    checked={Boolean(getTemplateSettingValue(selectedSection.settings, "defaultCollapsed"))}
                    disabled={readOnly}
                    type="checkbox"
                    onChange={(event) =>
                      updateSectionSettings(activeSelection.sectionIndex, { defaultCollapsed: event.target.checked })
                    }
                  />
                  <span>
                    Hide / collapse by default
                    <small>Workers can open this section when they need it.</small>
                  </span>
                </label>
                <TemplateVisibilitySettingsEditor
                  disabled={readOnly}
                  schema={current}
                  settings={selectedSection.settings}
                  onCreateDriver={() => addVisibilityDriverForSection(activeSelection.sectionIndex)}
                  onChange={(visibility) =>
                    updateSectionSettings(activeSelection.sectionIndex, { visibility })
                  }
                />
              </div>
            ) : null}

            {activeSelection.kind === "field" && selectedField ? (
              <div className="template-v3-inspector-body">
                <label>
                  <span>Field type</span>
                  <select disabled={readOnly} value={selectedField.type} onChange={(event) => updateSelectedFieldType(event.target.value)}>
                    {TEMPLATE_FIELD_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>
                    {selectedField.type === "instructions"
                      ? "Instruction text"
                      : TEMPLATE_SPECIAL_BLOCK_TYPES.has(selectedField.type)
                        ? "Block label"
                        : "Question label"}
                  </span>
                  {selectedField.type === "instructions" ? (
                    <textarea
                      disabled={readOnly}
                      rows="6"
                      value={selectedField.label || ""}
                      onChange={(event) =>
                        updateField(activeSelection.sectionIndex, activeSelection.fieldIndex, {
                          label: event.target.value,
                        })
                      }
                    />
                  ) : (
                    <input
                      disabled={readOnly}
                      value={selectedField.label || ""}
                      onChange={(event) =>
                        updateField(activeSelection.sectionIndex, activeSelection.fieldIndex, {
                          label: event.target.value,
                        })
                      }
                    />
                  )}
                </label>
                {selectedField.type !== "instructions" ? (
                  <label>
                    <span>Helper text</span>
                    <input
                      disabled={readOnly}
                      value={selectedField.helperText || ""}
                      onChange={(event) =>
                        updateField(activeSelection.sectionIndex, activeSelection.fieldIndex, { helperText: event.target.value })
                      }
                    />
                  </label>
                ) : null}
                <label>
                  <span>Field width</span>
                  <select
                    disabled={readOnly}
                    value={normalizeTemplateLayoutWidth(selectedField.settings)}
                    onChange={(event) => updateSelectedFieldLayoutWidth(event.target.value)}
                  >
                    {TEMPLATE_LAYOUT_WIDTH_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>
                {selectedField.type === "instructions" ? (
                  <label>
                    <span>Instruction style</span>
                    <select
                      disabled={readOnly}
                      value={normalizeTemplateInstructionStyle(selectedField)}
                      onChange={(event) => updateSelectedFieldSettings({ instructionStyle: event.target.value })}
                    >
                      {TEMPLATE_INSTRUCTION_STYLE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {selectedField.type === "number" ? (
                  <label>
                    <span>Number type</span>
                    <select
                      disabled={readOnly}
                      value={normalizeTemplateNumberMode(selectedField)}
                      onChange={(event) => updateSelectedFieldSettings({ numberMode: event.target.value })}
                    >
                      {TEMPLATE_NUMBER_MODE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <TemplateVisibilitySettingsEditor
                  disabled={readOnly}
                  excludeFieldId={selectedField.id}
                  schema={current}
                  settings={selectedField.settings}
                  onCreateDriver={() => addVisibilityDriverForField(activeSelection.sectionIndex, activeSelection.fieldIndex)}
                  onChange={(visibility) => updateSelectedFieldSettings({ visibility })}
                />
                {selectedActionItemRowsSettings ? (
                  <div className="template-action-row-settings">
                    <label>
                      <span>None checkbox label</span>
                      <input
                        disabled={readOnly}
                        value={selectedActionItemRowsSettings.noneLabel}
                        onChange={(event) =>
                          updateSelectedActionItemRowsSettings({
                            ...selectedActionItemRowsSettings,
                            noneLabel: event.target.value,
                          })
                        }
                      />
                    </label>
                    <div className="template-v3-two-column">
                      <label>
                        <span>Row title</span>
                        <input
                          disabled={readOnly}
                          value={selectedActionItemRowsSettings.rowLabel}
                          onChange={(event) =>
                            updateSelectedActionItemRowsSettings({
                              ...selectedActionItemRowsSettings,
                              rowLabel: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Add button</span>
                        <input
                          disabled={readOnly}
                          value={selectedActionItemRowsSettings.addButtonLabel}
                          onChange={(event) =>
                            updateSelectedActionItemRowsSettings({
                              ...selectedActionItemRowsSettings,
                              addButtonLabel: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="template-action-row-subfields">
                      <span>Row fields</span>
                      {selectedActionItemRowsSettings.subfields.map((subfield, index) => (
                        <div className="template-action-row-subfield" key={subfield.key}>
                          <label>
                            <span>{subfield.key}</span>
                            <input
                              disabled={readOnly}
                              value={subfield.label}
                              onChange={(event) => updateActionItemRowLabel(subfield.key, event.target.value)}
                            />
                          </label>
                          <label className={subfield.lockedVisible ? "settings-checkbox compact disabled" : "settings-checkbox compact"}>
                            <input
                              checked={subfield.visible}
                              disabled={readOnly || subfield.lockedVisible}
                              type="checkbox"
                              onChange={(event) => updateActionItemRowVisibility(subfield.key, event.target.checked)}
                            />
                            <span>{subfield.lockedVisible ? "Always visible" : "Show field"}</span>
                          </label>
                          <div>
                            {canEdit ? (
                              <>
                                <button disabled={index === 0} type="button" onClick={() => moveActionItemRowSubfield(index, -1)}>
                                  Up
                                </button>
                                <button
                                  disabled={index === selectedActionItemRowsSettings.subfields.length - 1}
                                  type="button"
                                  onClick={() => moveActionItemRowSubfield(index, 1)}
                                >
                                  Down
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedToolboxCompositeSettings ? (
                  <div className="template-action-row-settings">
                    <div className="template-v3-two-column">
                      <label>
                        <span>Show button</span>
                        <input
                          disabled={readOnly}
                          value={selectedToolboxCompositeSettings.openButtonLabel}
                          onChange={(event) =>
                            updateSelectedToolboxCompositeSettings({
                              ...selectedToolboxCompositeSettings,
                              openButtonLabel: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Hide button</span>
                        <input
                          disabled={readOnly}
                          value={selectedToolboxCompositeSettings.hideButtonLabel}
                          onChange={(event) =>
                            updateSelectedToolboxCompositeSettings({
                              ...selectedToolboxCompositeSettings,
                              hideButtonLabel: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    {selectedToolboxCompositeSettings.addRowButtonLabel ? (
                      <label>
                        <span>Add row button</span>
                        <input
                          disabled={readOnly}
                          value={selectedToolboxCompositeSettings.addRowButtonLabel}
                          onChange={(event) =>
                            updateSelectedToolboxCompositeSettings({
                              ...selectedToolboxCompositeSettings,
                              addRowButtonLabel: event.target.value,
                            })
                          }
                        />
                      </label>
                    ) : null}
                    <div className="template-action-row-subfields">
                      <span>{selectedToolboxCompositeSettings.subfieldsLabel}</span>
                      {selectedToolboxCompositeSettings.subfields.map((subfield, index) => (
                        <div className="template-action-row-subfield" key={subfield.key}>
                          <label>
                            <span>{subfield.key}</span>
                            <input
                              disabled={readOnly}
                              value={subfield.label}
                              onChange={(event) => updateToolboxCompositeSubfieldLabel(subfield.key, event.target.value)}
                            />
                          </label>
                          <label className="settings-checkbox compact">
                            <input
                              checked={subfield.visible}
                              disabled={readOnly}
                              type="checkbox"
                              onChange={(event) => updateToolboxCompositeSubfieldVisibility(subfield.key, event.target.checked)}
                            />
                            <span>Show field</span>
                          </label>
                          <div>
                            {canEdit ? (
                              <>
                                <button disabled={index === 0} type="button" onClick={() => moveToolboxCompositeSubfield(index, -1)}>
                                  Up
                                </button>
                                <button
                                  disabled={index === selectedToolboxCompositeSettings.subfields.length - 1}
                                  type="button"
                                  onClick={() => moveToolboxCompositeSubfield(index, 1)}
                                >
                                  Down
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedToolboxTopicSettings ? (
                  <div className="template-v3-topic-settings">
                    <label className="settings-checkbox compact">
                      <input
                        checked={selectedToolboxTopicSettings.showCommon}
                        disabled={readOnly}
                        type="checkbox"
                        onChange={(event) => updateSelectedFieldSettings({ showCommon: event.target.checked })}
                      />
                      <span>Show Common shortcuts</span>
                    </label>
                    <label className="settings-checkbox compact">
                      <input
                        checked={selectedToolboxTopicSettings.showSearch}
                        disabled={readOnly}
                        type="checkbox"
                        onChange={(event) => updateSelectedFieldSettings({ showSearch: event.target.checked })}
                      />
                      <span>Show Search</span>
                    </label>
                    <div className="template-v3-topic-textarea-field">
                      <div className="template-v3-setting-label-row">
                        <span>Common topics</span>
                        <button
                          disabled={readOnly || !selectedToolboxTopicSettings.commonTopicLabels.length}
                          type="button"
                          onClick={() => updateSelectedFieldSettings({ commonTopicLabels: [] })}
                        >
                          Clear
                        </button>
                      </div>
                      <textarea
                        aria-label="Common topics"
                        className="template-v3-topic-textarea"
                        disabled={readOnly}
                        rows="5"
                        value={selectedToolboxTopicSettings.commonTopicLabels.join("\n")}
                        onChange={(event) =>
                          updateSelectedFieldSettings({
                            commonTopicLabels: splitToolboxTopicLabels(event.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="template-v3-category-list">
                      <span>Visible topic categories</span>
                      {TOOLBOX_TALK_TOPIC_GROUPS.map((group) => (
                        <label className="settings-checkbox compact" key={group.id}>
                          <input
                            checked={selectedToolboxTopicSettings.enabledCategoryIds.includes(group.id)}
                            disabled={readOnly}
                            type="checkbox"
                            onChange={(event) => {
                              const currentIds = selectedToolboxTopicSettings.enabledCategoryIds;
                              const nextIds = event.target.checked
                                ? [...currentIds, group.id]
                                : currentIds.filter((id) => id !== group.id);
                              updateSelectedFieldSettings({
                                enabledCategoryIds: nextIds,
                              });
                            }}
                          />
                          <span>{group.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                {["toolbox_incident_review", "toolbox_safety_concerns"].includes(selectedField.type) ? (
                  <label className="settings-checkbox compact">
                    <input
                      checked={getTemplateSettingValue(selectedField.settings, "defaultCollapsed") !== false}
                      disabled={readOnly}
                      type="checkbox"
                      onChange={(event) => updateSelectedFieldSettings({ defaultCollapsed: event.target.checked })}
                    />
                    <span>
                      Hide / collapse by default
                      <small>Workers can open this block when needed.</small>
                    </span>
                  </label>
                ) : null}
                {!selectedFieldIsNonAnswer ? (
                  <label className="settings-checkbox compact">
                    <input
                      checked={templateFieldIsHidden(selectedField)}
                      disabled={readOnly}
                      type="checkbox"
                      onChange={(event) => updateSelectedFieldSettings({ hidden: event.target.checked })}
                    />
                    <span>
                      Hidden from workers
                      <small>Submits its default or worker value automatically.</small>
                    </span>
                  </label>
                ) : null}
                {!selectedFieldIsNonAnswer ? (
                  <label className="settings-checkbox compact">
                    <input
                      checked={Boolean(selectedField.required)}
                      disabled={readOnly}
                      type="checkbox"
                      onChange={(event) =>
                        updateField(activeSelection.sectionIndex, activeSelection.fieldIndex, { required: event.target.checked })
                      }
                    />
                    <span>Required</span>
                  </label>
                ) : null}
                {TEMPLATE_OPTION_FIELD_TYPES.has(selectedField.type) ? (
                  <div className="template-options-builder">
                    <label>
                      <span>Display style</span>
                      <select
                        disabled={readOnly}
                        value={normalizeTemplateChoiceDisplay(selectedField)}
                        onChange={(event) => updateSelectedFieldSettings({ choiceDisplay: event.target.value })}
                      >
                        {(selectedField.type === "dropdown"
                          ? TEMPLATE_DROPDOWN_DISPLAY_OPTIONS
                          : TEMPLATE_MULTI_SELECT_DISPLAY_OPTIONS
                        ).map((option) => (
                          <option key={option.id} value={option.id}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Option preset</span>
                      <select
                        disabled={readOnly}
                        value={normalizeTemplateOptionPreset(selectedField)}
                        onChange={(event) => applyOptionPresetToSelectedField(event.target.value)}
                      >
                        {TEMPLATE_OPTION_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>{preset.label}</option>
                        ))}
                      </select>
                    </label>
                    <span>Options</span>
                    <div className="template-option-chip-row">
                      {(selectedField.options || []).map((option) => (
                        <button disabled={readOnly} key={option} type="button" onClick={() => removeSelectedFieldOption(option)}>
                          <span>{option}</span>
                          <strong aria-hidden="true">x</strong>
                        </button>
                      ))}
                    </div>
                    {canEdit ? (
                      <div className="template-option-entry">
                        <input
                          placeholder="Add option"
                          value={optionDraft}
                          onChange={(event) => setOptionDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addOptionToSelectedField();
                            }
                          }}
                        />
                        <button type="button" onClick={addOptionToSelectedField}>Add</button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {selectedField.type === "media_upload" ? (
                  <TemplateMediaUploadSettingsEditor
                    disabled={readOnly}
                    field={selectedField}
                    onChange={updateSelectedFieldSettings}
                  />
                ) : null}
                {selectedField.type === "asset_picker" ? (
                  <TemplateAssetPickerSettingsEditor
                    disabled={readOnly}
                    field={selectedField}
                    onChange={updateSelectedFieldSettings}
                  />
                ) : null}
                {!selectedFieldIsNonAnswer ? (
                  <label className="settings-checkbox compact">
                    <input
                      checked={Boolean(selectedField.remember)}
                      disabled={readOnly}
                      type="checkbox"
                      onChange={(event) =>
                        updateField(activeSelection.sectionIndex, activeSelection.fieldIndex, { remember: event.target.checked })
                      }
                    />
                    <span>Remember last value</span>
                  </label>
                ) : null}
                {!selectedFieldIsNonAnswer && templateDefaultOptionsForField(selectedField).length > 1 ? (
                  <label>
                    <span>Default value</span>
                    <select
                      disabled={readOnly}
                      value={selectedField.default || ""}
                      onChange={(event) =>
                        updateField(activeSelection.sectionIndex, activeSelection.fieldIndex, { default: event.target.value })
                      }
                    >
                      {templateDefaultOptionsForField(selectedField).map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {!selectedFieldIsNonAnswer && templateSupportsStaticDefault(selectedField) ? (
                  <label>
                    <span>Static default</span>
                    <input
                      disabled={readOnly || Boolean(selectedField.default)}
                      placeholder={selectedField.default ? "Using selected worker/date default" : "Optional prefilled value"}
                      value={templateStaticDefaultValue(selectedField)}
                      onChange={(event) => updateSelectedFieldSettings({ defaultValue: event.target.value })}
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
          </section>
        </aside>
      </div>

      {canEdit && fieldPickerOpen ? (
        <div className="template-v3-modal-backdrop" role="presentation">
          <section className="template-v3-field-modal" role="dialog" aria-modal="true" aria-label="New field">
            <div className="template-v3-modal-head">
              <h2>New Field</h2>
              <button aria-label="Close new field picker" type="button" onClick={() => setFieldPickerOpen(false)}>
                X
              </button>
            </div>
            <div className="template-v3-modal-tabs" role="tablist" aria-label="Field groups">
              {TEMPLATE_V3_FIELD_GROUPS.map((group) => (
                <button
                  className={group.id === fieldPickerTab ? "active" : ""}
                  key={group.id}
                  type="button"
                  onClick={() => setFieldPickerTab(group.id)}
                >
                  {group.label}
                </button>
              ))}
            </div>
            <div className="template-v3-field-grid">
              {activeFieldGroup.fields.map((field) => (
                <button
                  className={field.disabled ? "disabled" : ""}
                  disabled={field.disabled}
                  key={`${activeFieldGroup.id}-${field.title}`}
                  type="button"
                  onClick={() => addFieldFromConfig(field)}
                >
                  <span>{field.icon}</span>
                  <strong>{field.title}</strong>
                  <small>{field.hint}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function TemplateUnlockDialog({ onClose, onUnlock, saving, template }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await onUnlock(password);
      setPassword("");
    } catch (unlockError) {
      setError(unlockError.message);
    }
  };

  return (
    <div className="staff-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Unlock form template"
        className="staff-detail-dialog template-unlock-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <div>
            <h2>Unlock Template</h2>
            <p>{template?.label || "Form template"}</p>
          </div>
          <button aria-label="Close" type="button" onClick={onClose}>X</button>
        </div>
        <p className="template-v3-help-text">
          Unlocking allows editing again and is recorded in the audit log. Deletion and permanent purge remain the irreversible actions.
        </p>
        {error ? <p className="form-message error">{error}</p> : null}
        <form className="template-unlock-form" onSubmit={submit}>
          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              autoFocus
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <div className="staff-card-actions">
            <button disabled={saving} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="primary-button" disabled={saving || !password} type="submit">
              {saving ? "Unlocking..." : "Unlock"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TemplateVisibilitySettingsEditor({
  disabled = false,
  excludeFieldId = "",
  onCreateDriver,
  onChange,
  schema,
  settings,
}) {
  const visibility = normalizeTemplateVisibilitySettings(settings);
  const sourceFields = templateVisibilitySourceFields(schema, excludeFieldId);
  const sourceField = sourceFields.find((field) => field.id === visibility.sourceFieldId) || null;
  const operatorOptions = sourceField?.type === "multi_select"
    ? TEMPLATE_VISIBILITY_OPERATORS.filter((operator) => ["contains", "not_contains"].includes(operator.id))
    : TEMPLATE_VISIBILITY_OPERATORS.filter((operator) => ["equals", "not_equals"].includes(operator.id));
  const valueOptions = templateVisibilitySourceValueOptions(sourceField);
  const updateVisibility = (patch) => {
    const next = { ...visibility, ...patch };
    if (patch.enabled === true && !next.sourceFieldId && sourceFields.length) {
      const nextSource = sourceFields[0];
      const nextOptions = templateVisibilitySourceValueOptions(nextSource);
      next.sourceFieldId = nextSource.id;
      next.operator = nextSource.type === "multi_select" ? "contains" : "equals";
      next.value = nextOptions[0]?.value ?? "";
    }
    if (patch.sourceFieldId) {
      const nextSource = sourceFields.find((field) => field.id === patch.sourceFieldId);
      const nextOptions = templateVisibilitySourceValueOptions(nextSource);
      next.operator = nextSource?.type === "multi_select" ? "contains" : "equals";
      next.value = nextOptions[0]?.value ?? "";
    }
    if (!next.enabled) {
      next.sourceFieldId = "";
      next.operator = "equals";
      next.value = "";
    }
    onChange(serializeTemplateVisibilitySettings(next));
  };

  return (
    <div className="template-conditional-settings">
      {sourceFields.length ? (
        <label className="settings-checkbox compact">
          <input
            checked={visibility.enabled}
            disabled={disabled}
            type="checkbox"
            onChange={(event) => updateVisibility({ enabled: event.target.checked })}
          />
          <span>
            Conditional visibility
            <small>Show this only when another answer matches.</small>
          </span>
        </label>
      ) : (
        <div className="template-conditional-empty">
          <div>
            <strong>No driver field yet</strong>
            <small>Conditions need a Yes / No, Boolean, Toggle, Checkbox, Dropdown, or Multi-select answer. Short answers cannot drive conditions.</small>
          </div>
          <button disabled={disabled || typeof onCreateDriver !== "function"} type="button" onClick={onCreateDriver}>
            Add Yes / No driver
          </button>
        </div>
      )}
      {visibility.enabled ? (
        <div className="template-v3-two-column">
          <label>
            <span>When field</span>
            <select
              disabled={disabled}
              value={visibility.sourceFieldId}
              onChange={(event) => updateVisibility({ sourceFieldId: event.target.value })}
            >
              <option value="">Choose field</option>
              {sourceFields.map((field) => (
                <option key={field.id} value={field.id}>{field.label || field.id}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Condition</span>
            <select
              disabled={disabled || !sourceField}
              value={operatorOptions.some((item) => item.id === visibility.operator) ? visibility.operator : operatorOptions[0]?.id || "equals"}
              onChange={(event) => updateVisibility({ operator: event.target.value })}
            >
              {operatorOptions.map((operator) => (
                <option key={operator.id} value={operator.id}>{operator.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Value</span>
            <select
              disabled={disabled || !sourceField}
              value={String(visibility.value)}
              onChange={(event) => updateVisibility({ value: event.target.value })}
            >
              {valueOptions.map((option) => (
                <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}

function TemplateMediaUploadSettingsEditor({ disabled = false, field, onChange }) {
  const acceptedKinds = mediaUploadAcceptedKinds(field);
  const toggleKind = (kind, checked) => {
    const next = checked
      ? [...acceptedKinds, kind]
      : acceptedKinds.filter((item) => item !== kind);
    onChange({
      mediaUpload: serializeMediaUploadSettings({
        mediaUpload: {
          acceptedKinds: next.length ? [...new Set(next)] : acceptedKinds,
        },
      }),
    });
  };

  return (
    <div className="template-media-kind-settings">
      <span>Accepted uploads</span>
      {DEFAULT_MEDIA_UPLOAD_KINDS.map((kind) => (
        <label className="settings-checkbox compact" key={kind}>
          <input
            checked={acceptedKinds.includes(kind)}
            disabled={disabled || (acceptedKinds.length === 1 && acceptedKinds.includes(kind))}
            type="checkbox"
            onChange={(event) => toggleKind(kind, event.target.checked)}
          />
          <span>
            {MEDIA_UPLOAD_KIND_CONFIGS[kind].label}
            <small>{MEDIA_UPLOAD_KIND_CONFIGS[kind].helper}</small>
          </span>
        </label>
      ))}
    </div>
  );
}

function TemplateAssetPickerSettingsEditor({ disabled = false, field, onChange }) {
  const settings = normalizeAssetPickerSettings(field.settings);
  const update = (patch) => {
    onChange({
      assetPicker: serializeAssetPickerSettings({
        ...settings,
        ...patch,
      }),
    });
  };

  return (
    <div className="template-asset-picker-settings">
      <span>Asset filters</span>
      <label>
        <span>Asset type</span>
        <input
          disabled={disabled}
          placeholder="Any type"
          value={settings.typeFilter}
          onChange={(event) => update({ typeFilter: event.target.value })}
        />
      </label>
      <label>
        <span>Site</span>
        <input
          disabled={disabled}
          placeholder="Any site"
          value={settings.siteFilter}
          onChange={(event) => update({ siteFilter: event.target.value })}
        />
      </label>
      <label>
        <span>Status</span>
        <select
          disabled={disabled}
          value={settings.statusFilter}
          onChange={(event) => update({ statusFilter: event.target.value })}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="retired">Retired</option>
          <option value="all">All statuses</option>
        </select>
      </label>
    </div>
  );
}

function ToolboxTalkTemplatePreview({ answers = {}, onChange = () => {}, schema, worker }) {
  const current = normalizeClientTemplateSchema(schema);
  const layout = getToolboxTalkLayout(current);
  const enabled = new Set(layout.enabledBlocks);
  const topicSettings = layout.blockSettings.toolbox_topics || getToolboxTopicSettings();
  const incidentReviewSettings = normalizeToolboxCompositeSettings(
    layout.blockSettings.toolbox_incident_review,
    "toolbox_incident_review",
  );
  const safetyConcernSettings = normalizeToolboxCompositeSettings(
    layout.blockSettings.toolbox_safety_concerns,
    "toolbox_safety_concerns",
  );
  const topicGroups = getEnabledToolboxTopicGroups(topicSettings.enabledCategoryIds);
  const genericSchema = layout.genericSchema || createGenericTemplateSchemaFromSections(current, [], current.formType);
  const headerSampleValue = (field) => templateFieldDefaultValue(field, worker, current);

  return (
    <div className="template-runtime-form toolbox-talk-template-preview">
      {current.description ? <p className="muted">{current.description}</p> : null}
      <div className="template-runtime-section-grid">
      {layout.headerFields.length ? (
        <section className={templateRuntimeSectionClassName("toolbox_meeting_info", layout.meetingInfo)}>
          <div className="toolbox-section-heading">
            <h2>{layout.meetingInfo.title || "Meeting Info"}</h2>
            {layout.headerFields.some((field) => field.required) ? <span>Required fields</span> : null}
          </div>
          {layout.meetingInfo.description ? <p className="muted">{layout.meetingInfo.description}</p> : null}
          <div className="toolbox-field-grid">
            {layout.headerFields.map((field) => (
              <label key={field.id || field.key}>
                <span>{field.label}</span>
                <input
                  readOnly
                  placeholder={field.helperText || ""}
                  type={field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
                  value={headerSampleValue(field)}
                />
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {enabled.has("toolbox_topics") ? (
        <section
          className={templateRuntimeSectionClassName(
            "toolbox_topics",
            { settings: layout.blockSettings.toolbox_topics },
          )}
        >
          <div className="toolbox-section-heading">
            <h2>{layout.blockLabels.toolbox_topics || "Topics Discussed"}</h2>
            <span>Special block</span>
          </div>
          {topicSettings.showCommon && topicSettings.commonTopicLabels.length ? (
            <div className="toolbox-topic-panel">
              <h3>Common</h3>
              <div className="toolbox-chip-row">
                {topicSettings.commonTopicLabels.slice(0, 12).map((label) => (
                  <span className="topic-chip" key={label}>{label}</span>
                ))}
              </div>
            </div>
          ) : null}
          {topicSettings.showSearch ? (
            <label>
              <span>Search topics</span>
              <input readOnly placeholder="Fall, WHMIS, access..." value="" />
            </label>
          ) : null}
          <div className="toolbox-topic-groups">
            {topicGroups.map((group) => (
              <details key={group.id}>
                <summary>{group.label}</summary>
                <div className="toolbox-chip-row">
                  {group.topics.slice(0, 8).map((label) => (
                    <span className="topic-chip" key={label}>{label}</span>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {enabled.has("toolbox_incident_review") ? (
        <section
          className={templateRuntimeSectionClassName(
            "toolbox_incident_review",
            { settings: layout.blockSettings.toolbox_incident_review },
            layout.blockSettings.toolbox_incident_review?.defaultCollapsed === false ? "" : "collapsed",
          )}
        >
          <div className="toolbox-section-heading">
            <h2>{layout.blockLabels.toolbox_incident_review || "Review Notes"}</h2>
            <button type="button">{incidentReviewSettings.openButtonLabel}</button>
          </div>
          {layout.blockSettings.toolbox_incident_review?.defaultCollapsed === false ? (
            <div className="toolbox-field-grid">
              {visibleToolboxCompositeFields(incidentReviewSettings)
                .filter((field) => !field.conditionalKey)
                .map((field) => (
                  <ToolboxIncidentReviewField field={field} key={field.key} value="" />
                ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {enabled.has("toolbox_safety_concerns") ? (
        <section
          className={templateRuntimeSectionClassName(
            "toolbox_safety_concerns",
            { settings: layout.blockSettings.toolbox_safety_concerns },
            layout.blockSettings.toolbox_safety_concerns?.defaultCollapsed === false ? "" : "collapsed",
          )}
        >
          <div className="toolbox-section-heading">
            <h2>{layout.blockLabels.toolbox_safety_concerns || "Safety Concerns"}</h2>
            <button type="button">{safetyConcernSettings.openButtonLabel}</button>
          </div>
          {layout.blockSettings.toolbox_safety_concerns?.defaultCollapsed === false ? (
            <div className="toolbox-repeat-row">
              {visibleToolboxCompositeFields(safetyConcernSettings).map((field) => (
                <ToolboxSafetyConcernField field={field} key={field.key} value="" />
              ))}
              <button type="button">Remove</button>
            </div>
          ) : null}
        </section>
      ) : null}

      {enabled.has("toolbox_attendance") ? (
        <section
          className={templateRuntimeSectionClassName(
            "toolbox_attendance",
            { settings: layout.blockSettings.toolbox_attendance },
          )}
        >
          <div className="toolbox-section-heading">
            <h2>{layout.blockLabels.toolbox_attendance || "Attendance"}</h2>
            <span>Required</span>
          </div>
          <label>
            <span>Name</span>
            <input readOnly placeholder="Worker name" value="" />
          </label>
          <div className="toolbox-attendee-chip-row">
            <span className="toolbox-attendee-chip">Garnet Bird <strong>x</strong></span>
          </div>
        </section>
      ) : null}

      {enabled.has("toolbox_final_confirmation") ? (
        <section
          className={templateRuntimeSectionClassName(
            "toolbox_final_confirmation",
            { settings: layout.blockSettings.toolbox_final_confirmation },
          )}
        >
          <div className="toolbox-section-heading">
            <h2>{layout.blockLabels.toolbox_final_confirmation || "Final Check"}</h2>
            <span>Completed by presenter</span>
          </div>
          <label className="toolbox-confirmation">
            <input readOnly checked type="checkbox" />
            <span>I confirm the listed workers participated in this toolbox talk.</span>
          </label>
        </section>
      ) : null}
      </div>
      {genericSchema.sections.length ? (
        <TemplateRuntimeSections
          assetSearchEndpoint="/api/staff/assets"
          answers={answers}
          schema={genericSchema}
          sections={genericSchema.sections}
          worker={worker}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}

function SiteInspectionTemplatePreview({ answers = {}, onChange = () => {}, schema, worker }) {
  const current = normalizeClientTemplateSchema(schema);
  const layout = getSiteInspectionLayout(current);
  const enabled = new Set(layout.enabledBlocks);
  const genericSchema = layout.genericSchema || createGenericTemplateSchemaFromSections(current, [], current.formType);
  const headerSampleValue = (field) => templateFieldDefaultValue(field, worker, current);

  const renderHeaderPreview = () => {
    if (!layout.headerFields.length) return null;
    return (
      <section className={templateRuntimeSectionClassName("site_inspection_header", layout.inspectionInfo)}>
        <div className="toolbox-section-heading">
          <h2>{layout.inspectionInfo.title || "Inspection Info"}</h2>
          {layout.headerFields.some((field) => field.required) ? <span>Required fields</span> : null}
        </div>
        {layout.inspectionInfo.description ? <p className="muted">{layout.inspectionInfo.description}</p> : null}
        <div className="toolbox-field-grid">
          {layout.headerFields.map((field) => (
            <label key={field.id || field.key}>
              <span>{field.label}</span>
              <input
                readOnly
                placeholder={field.helperText || ""}
                type={field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
                value={headerSampleValue(field)}
              />
            </label>
          ))}
        </div>
      </section>
    );
  };

  const renderObservationPreview = (section) => {
    const collapsed = section.defaultCollapsed !== false && !(section.fields || []).some((field) => field.required);
    return (
      <section
        className={templateRuntimeSectionClassName(section.id, section, collapsed ? "collapsed" : "")}
        key={section.id}
      >
        <div className="toolbox-section-heading">
          <h2>{section.title || "Observations"}</h2>
          <button type="button">{collapsed ? `Add ${String(section.title || "observations").toLowerCase()}` : "Hide"}</button>
        </div>
        {section.description ? <p className="muted">{section.description}</p> : null}
        {!collapsed ? (
          (section.fields || []).map((field) => (
            <label key={field.id || field.key}>
              <span>{field.label}</span>
              {field.type === "long_text" ? (
                <textarea readOnly rows="3" value="" />
              ) : (
                <input
                  readOnly
                  type={field.type === "date" ? "date" : field.type === "time" ? "time" : "text"}
                  value=""
                />
              )}
            </label>
          ))
        ) : null}
      </section>
    );
  };

  const renderDeficiencyPreview = () => {
    if (!enabled.has("site_deficiencies")) return null;
    const settings = normalizeActionItemRowsSettings(
      layout.blockSettings.site_deficiencies,
      "site_deficiencies",
    );
    return (
      <ActionItemRowsBlock
        blockType="site_deficiencies"
        layoutSettings={layout.blockSettings.site_deficiencies}
        noItems={false}
        preview
        rows={[createEmptyActionItemRow()]}
        sectionId="site_deficiencies"
        settings={settings}
        targetPrefix="preview.site_deficiencies"
        title={layout.blockLabels.site_deficiencies || "Deficiencies"}
      />
    );
  };

  const renderItem = (item) => {
    if (item.type === "header") return <Fragment key={item.id}>{renderHeaderPreview()}</Fragment>;
    if (item.type === "observation") return renderObservationPreview(item.section);
    if (item.type === "block" && item.blockType === "site_deficiencies") {
      return <Fragment key={item.id}>{renderDeficiencyPreview()}</Fragment>;
    }
    return null;
  };

  return (
    <div className="template-runtime-form site-inspection-template-preview">
      {current.description ? <p className="muted">{current.description}</p> : null}
      <div className="template-runtime-section-grid">
        {layout.items.map(renderItem)}
      </div>
      {genericSchema.sections.length ? (
        <TemplateRuntimeSections
          assetSearchEndpoint="/api/staff/assets"
          answers={answers}
          schema={genericSchema}
          sections={genericSchema.sections}
          worker={worker}
          onChange={onChange}
        />
      ) : null}
    </div>
  );
}

function TemplateFormFields({
  assetSearchEndpoint = "/api/worker/assets",
  answers,
  invalidFields = new Set(),
  onChange,
  onUploadFile,
  registerValidationTarget,
  schema,
  worker,
}) {
  const current = normalizeClientTemplateSchema(schema);
  return (
    <div className="template-runtime-form">
      {current.description ? <p className="muted">{current.description}</p> : null}
      <TemplateRuntimeSections
        answers={answers}
        invalidFields={invalidFields}
        registerValidationTarget={registerValidationTarget}
        schema={current}
        sections={current.sections}
        worker={worker}
        assetSearchEndpoint={assetSearchEndpoint}
        onUploadFile={onUploadFile}
        onChange={onChange}
      />
    </div>
  );
}

function normalizeComparableText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function TemplateRuntimeSections({
  assetSearchEndpoint = "/api/worker/assets",
  answers,
  invalidFields = new Set(),
  onChange,
  onUploadFile,
  registerValidationTarget,
  schema,
  sections,
  worker,
}) {
  const updateAnswer = (fieldId, value) => {
    onChange({ ...answers, [fieldId]: value });
  };
  const visibleSections = getVisibleTemplateSections({ ...schema, sections }, answers, worker);
  const sectionHasInvalidField = (section) => {
    const sectionFieldIds = new Set(
      (section.fields || []).map((field) => String(field.id || "")).filter(Boolean),
    );
    return Array.from(invalidFields || []).some((fieldId) => {
      const baseFieldId = String(fieldId || "").split(".")[0];
      return sectionFieldIds.has(baseFieldId);
    });
  };
  const registerSectionValidationTarget = (section) => (element) => {
    if (!registerValidationTarget) return;
    (section.fields || []).forEach((field) => {
      if (!field.id) return;
      registerValidationTarget(`${field.id}:section`)(element);
    });
  };
  return (
    <div className="template-runtime-section-grid">
      {visibleSections.map((section) => {
        const invalidSection = sectionHasInvalidField(section);
        return (
          <section
            className={[
              "toolbox-section",
              invalidSection ? "toolbox-section-invalid" : "",
              section.id ? `template-section-${slugifyTemplateId(section.id)}` : "",
              templateLayoutWidthClass(section),
            ].filter(Boolean).join(" ")}
            data-template-section-id={section.id || undefined}
            key={section.id}
            ref={registerSectionValidationTarget(section)}
          >
	            <div className="toolbox-section-heading">
	              <h2>{section.title}</h2>
	              {section.fields.some((field) => field.required) ? <span>Required fields</span> : null}
	            </div>
            {section.description ? <p className="muted">{section.description}</p> : null}
            <div className="toolbox-field-grid">
              {section.fields.map((field) => (
                <div
                  className={[
                    "template-runtime-field-shell",
                    field.id ? `template-field-${slugifyTemplateId(field.id)}` : "",
                    field.type ? `template-field-type-${slugifyTemplateId(field.type)}` : "",
                    templateLayoutWidthClass(field),
                  ].filter(Boolean).join(" ")}
                  data-template-field-id={field.id || undefined}
                  key={field.id}
                >
                  <TemplateRuntimeField
                    answers={answers}
                    field={field}
                    invalid={invalidFields.has(field.id)}
                    invalidFields={invalidFields}
                    registerValidationTarget={registerValidationTarget}
                    targetRef={registerValidationTarget?.(field.id)}
                    value={answers[field.id] ?? templateFieldDefaultValue(field, worker, schema)}
                    assetSearchEndpoint={assetSearchEndpoint}
                    onUploadFile={onUploadFile}
                    onChange={(value) => updateAnswer(field.id, value)}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TemplateRuntimeField({
  assetSearchEndpoint = "/api/worker/assets",
  field,
  invalid,
  invalidFields = new Set(),
  registerValidationTarget,
  targetRef,
  value,
  onChange,
  onUploadFile,
}) {
  if (field.type === "instructions") {
    return (
      <p className={["template-instructions", templateInstructionStyleClass(field)].join(" ")}>
        {field.label}
      </p>
    );
  }
  if (ACTION_ITEM_ROW_BLOCK_TYPES.has(field.type)) {
    const block = normalizeActionItemBlockValue(value);
    const settings = normalizeActionItemRowsSettings(field.settings, field.type);
    const updateRow = (index, key, nextValue) => {
      onChange({
        ...block,
        noItems: false,
        rows: block.rows.map((row, rowIndex) =>
          rowIndex === index ? { ...row, [key]: nextValue } : row,
        ),
      });
    };
    const addRow = () => {
      onChange({
        ...block,
        noItems: false,
        rows: [...block.rows, createEmptyActionItemRow()],
      });
    };
    const removeRow = (index) => {
      const nextRows = block.rows.filter((_, rowIndex) => rowIndex !== index);
      onChange({
        ...block,
        rows: nextRows.length ? nextRows : [createEmptyActionItemRow()],
      });
    };
    const setNoItems = (checked) => {
      onChange({
        noItems: checked,
        rows: checked ? [] : block.rows.length ? block.rows : [createEmptyActionItemRow()],
      });
    };
    return (
      <div className="template-action-item-runtime">
        <ActionItemRowsBlock
          blockInvalid={invalid}
          blockType={field.type}
          invalidFields={invalidFields}
          noItems={block.noItems}
          registerValidationTarget={registerValidationTarget}
          rows={block.rows}
          settings={settings}
          targetPrefix={field.id}
          title={field.label}
          onAddRow={addRow}
          onNoItemsChange={setNoItems}
          onRemoveRow={removeRow}
          onUpdateRow={updateRow}
        />
      </div>
    );
  }
  if (TEMPLATE_SPECIAL_BLOCK_TYPES.has(field.type)) {
    return (
      <div className="template-special-block-runtime" ref={targetRef}>
        <span>{templateFieldTypeLabel(field.type)}</span>
        <strong>{field.label}</strong>
        {field.helperText ? <small>{field.helperText}</small> : null}
      </div>
    );
  }
  const labelClass = invalid ? "toolbox-field-invalid" : "";
  if (isPhoneLikeTemplateField(field)) {
    return (
      <label className={labelClass} ref={targetRef}>
        <span>{field.label}</span>
        <input
          aria-invalid={invalid ? "true" : undefined}
          autoComplete="tel"
          inputMode="tel"
          placeholder={field.helperText || ""}
          type="tel"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }
  if (field.type === "long_text") {
    return (
      <label className={labelClass} ref={targetRef}>
        <span>{field.label}</span>
        <textarea
          aria-invalid={invalid ? "true" : undefined}
          placeholder={field.helperText || ""}
          rows="4"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }
  if (field.type === "number") {
    const numberMode = normalizeTemplateNumberMode(field);
    return (
      <label className={labelClass} ref={targetRef}>
        <span>{field.label}</span>
        <input
          aria-invalid={invalid ? "true" : undefined}
          inputMode={numberMode === "integer" ? "numeric" : "decimal"}
          placeholder={field.helperText || ""}
          step={numberMode === "integer" ? "1" : "any"}
          type="number"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }
  if (field.type === "date" || field.type === "time") {
    return (
      <label className={labelClass} ref={targetRef}>
        <span>{field.label}</span>
        <input
          aria-invalid={invalid ? "true" : undefined}
          type={field.type === "date" ? "date" : "time"}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }
  if (field.type === "yes_no") {
    return (
      <div className={`toolbox-segment-field ${labelClass}`} ref={targetRef}>
        <span>{field.label}</span>
        <div className="toolbox-segmented" role="group" aria-label={field.label}>
          {["yes", "no"].map((option) => (
            <button
              className={value === option ? "active" : ""}
              key={option}
              type="button"
              onClick={() => onChange(option)}
            >
              {option === "yes" ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (field.type === "boolean") {
    return (
      <label
        className={invalid ? "template-boolean-field toolbox-field-invalid" : "template-boolean-field"}
        ref={targetRef}
      >
        <span>{field.label}</span>
        <input
          checked={value === true}
          type="checkbox"
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    );
  }
  if (field.type === "toggle") {
    return (
      <label
        className={invalid ? "template-toggle-field toolbox-field-invalid" : "template-toggle-field"}
        ref={targetRef}
      >
        <span>{field.label}</span>
        <span className="template-toggle-control">
          <input
            checked={value === true}
            type="checkbox"
            onChange={(event) => onChange(event.target.checked)}
          />
          <span aria-hidden="true" className="template-toggle-track">
            <span className="template-toggle-thumb" />
          </span>
          <span className="template-toggle-state">{value === true ? "On" : "Off"}</span>
        </span>
      </label>
    );
  }
  if (field.type === "dropdown") {
    if (normalizeTemplateChoiceDisplay(field) === "radio") {
      return (
        <div className={`template-radio-choice-field ${labelClass}`} ref={targetRef}>
          <span>{field.label}</span>
          <div className="template-radio-choice-list" role="radiogroup" aria-label={field.label}>
            {(field.options || []).map((option) => (
              <button
                aria-checked={value === option}
                className={value === option ? "active" : ""}
                key={option}
                role="radio"
                type="button"
                onClick={() => onChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
          {field.helperText ? <small>{field.helperText}</small> : null}
        </div>
      );
    }
    return (
      <label className={labelClass} ref={targetRef}>
        <span>{field.label}</span>
        <select
          aria-invalid={invalid ? "true" : undefined}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Choose</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }
  if (field.type === "multi_select") {
    const values = Array.isArray(value) ? value : [];
    if (normalizeTemplateChoiceDisplay(field) === "checklist") {
      return (
        <div className={`template-checklist-field ${labelClass}`} ref={targetRef}>
          <span>{field.label}</span>
          <div className="template-checklist-options">
            {(field.options || []).map((option) => (
              <label className="settings-checkbox compact" key={option}>
                <input
                  checked={values.includes(option)}
                  type="checkbox"
                  onChange={(event) =>
                    onChange(event.target.checked
                      ? [...values, option]
                      : values.filter((item) => item !== option))
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {field.helperText ? <small>{field.helperText}</small> : null}
        </div>
      );
    }
    return (
      <div className={`template-multi-select ${labelClass}`} ref={targetRef}>
        <span>{field.label}</span>
        <div className="toolbox-chip-row">
          {(field.options || []).map((option) => (
            <button
              className={values.includes(option) ? "topic-chip active" : "topic-chip"}
              key={option}
              type="button"
              onClick={() =>
                onChange(values.includes(option)
                  ? values.filter((item) => item !== option)
                  : [...values, option])
              }
            >
              {option}
            </button>
          ))}
        </div>
        {field.helperText ? <small>{field.helperText}</small> : null}
      </div>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label
        className={invalid ? "toolbox-confirmation toolbox-field-invalid" : "toolbox-confirmation"}
        ref={targetRef}
      >
        <input checked={value === true} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
        <span>{field.label}</span>
      </label>
    );
  }
  if (field.type === "signature") {
    return (
      <SignaturePadField
        field={field}
        invalid={invalid}
        targetRef={targetRef}
        value={value}
        onChange={onChange}
      />
    );
  }
  if (field.type === "media_upload") {
    return (
      <MediaUploadRuntimeField
        field={field}
        invalid={invalid}
        targetRef={targetRef}
        value={value}
        onChange={onChange}
        onUploadFile={onUploadFile}
      />
    );
  }
  if (field.type === "asset_picker") {
    return (
      <AssetPickerRuntimeField
        assetSearchEndpoint={assetSearchEndpoint}
        field={field}
        invalid={invalid}
        targetRef={targetRef}
        value={value}
        onChange={onChange}
      />
    );
  }
  return (
    <label className={labelClass} ref={targetRef}>
      <span>{field.label}</span>
      <input
        aria-invalid={invalid ? "true" : undefined}
        placeholder={field.helperText || ""}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AssetPickerRuntimeField({ assetSearchEndpoint, field, invalid, targetRef, value, onChange }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const searchInputRef = useRef(null);
  const selected = normalizeAssetPickerAnswer(value);
  const settings = normalizeAssetPickerSettings(field.settings);
  const dialogTitleId = `${field.id || "asset"}-asset-picker-title`;

  useEffect(() => {
    if (!pickerOpen) return undefined;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setMessage("");
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (settings.typeFilter) params.set("type", settings.typeFilter);
        if (settings.siteFilter) params.set("site", settings.siteFilter);
        if (settings.statusFilter && settings.statusFilter !== "all") params.set("status", settings.statusFilter);
        params.set("limit", "25");
        const payload = await readApiJson(
          await fetch(`${assetSearchEndpoint}?${params}`, { credentials: "include" }),
        );
        if (active) setRows(payload.rows || []);
      } catch (error) {
        if (active) {
          setRows([]);
          setMessage(error.message || "Assets could not be loaded.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [assetSearchEndpoint, pickerOpen, query, settings.siteFilter, settings.statusFilter, settings.typeFilter]);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [pickerOpen]);

  const selectAsset = (asset) => {
    onChange(assetSnapshotFromAsset(asset));
    setQuery("");
    setPickerOpen(false);
  };

  const clearAsset = () => {
    onChange(null);
    setQuery("");
  };

  return (
    <div
      className={invalid ? "template-asset-picker-field toolbox-field-invalid" : "template-asset-picker-field"}
      ref={targetRef}
    >
      <div className="template-media-upload-heading">
        <div>
          <span>{field.label}</span>
          {field.helperText ? <small>{field.helperText}</small> : null}
        </div>
        {field.required ? <strong>Required</strong> : null}
      </div>
      {selected ? (
        <div className="template-asset-selected-card">
          <div>
            <strong>{selected.name || "Selected asset"}</strong>
            <small>{assetPickerDetailsText(selected) || "Asset selected"}</small>
          </div>
          <div className="template-asset-selected-actions">
            <button type="button" onClick={() => setPickerOpen(true)}>Change</button>
            <button type="button" onClick={clearAsset}>Clear</button>
          </div>
        </div>
      ) : (
        <div className="template-asset-empty-card">
          <div>
            <strong>No asset selected</strong>
            <small>{settings.typeFilter ? `Search imported ${settings.typeFilter} assets.` : "Search imported Safety First assets."}</small>
          </div>
          <button type="button" onClick={() => setPickerOpen(true)}>Select asset</button>
        </div>
      )}
      {pickerOpen ? (
        <div
          className="template-asset-picker-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPickerOpen(false);
          }}
        >
          <div
            aria-labelledby={dialogTitleId}
            aria-modal="true"
            className="template-asset-picker-dialog"
            role="dialog"
          >
            <div className="template-asset-picker-dialog-head">
              <div>
                <strong id={dialogTitleId}>Choose asset</strong>
                <small>{field.helperText || "Search imported Safety First assets."}</small>
              </div>
              <button aria-label="Close asset picker" type="button" onClick={() => setPickerOpen(false)}>
                Close
              </button>
            </div>
            <label className="template-asset-search">
              <span>Search assets</span>
              <input
                placeholder={settings.typeFilter ? `Search ${settings.typeFilter} assets` : "Search name, serial, site"}
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="template-asset-filter-summary">
              {settings.typeFilter ? <span>Type: {settings.typeFilter}</span> : null}
              {settings.siteFilter ? <span>Site: {settings.siteFilter}</span> : null}
              {settings.statusFilter && settings.statusFilter !== "all" ? <span>Status: {settings.statusFilter}</span> : null}
            </div>
            {message ? <p className="template-media-message">{message}</p> : null}
            <div className="template-asset-result-list">
              {loading ? <p className="template-media-empty">Loading assets...</p> : null}
              {!loading && rows.length ? rows.map((asset) => (
                <button
                  className={selected?.assetId === asset.id ? "template-asset-result active" : "template-asset-result"}
                  key={asset.id}
                  type="button"
                  onClick={() => selectAsset(asset)}
                >
                  <strong>{asset.name || "Unnamed asset"}</strong>
                  <small>{assetPickerListDetailsText(asset) || "No asset details"}</small>
                </button>
              )) : null}
              {!loading && !rows.length && !message ? (
                <p className="template-media-empty">No matching assets found.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MediaUploadRuntimeField({ field, invalid, targetRef, value, onChange, onUploadFile }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const files = normalizeMediaUploadAnswer(value);
  const canUpload = typeof onUploadFile === "function";

  const uploadFiles = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;
    if (!canUpload) {
      setMessage("Uploads are available on worker forms.");
      return;
    }
    const remaining = MAX_MEDIA_UPLOAD_FILES - files.length;
    if (remaining <= 0) {
      setMessage(`Remove a file before adding another. ${MAX_MEDIA_UPLOAD_FILES} files max.`);
      return;
    }
    const rejected = selected.find((file) => mediaUploadLocalFileError(file, field));
    if (rejected) {
      setMessage(mediaUploadLocalFileError(rejected, field));
      return;
    }
    const toUpload = selected.slice(0, remaining);
    setMessage(selected.length > remaining ? `${MAX_MEDIA_UPLOAD_FILES} files max. Extra files were skipped.` : "");
    setUploading(true);
    try {
      const uploaded = [];
      for (const selectedFile of toUpload) {
        const upload = await onUploadFile(selectedFile);
        uploaded.push(cleanMediaUploadAnswerFile({
          storagePath: upload?.storagePath,
          originalFilename: selectedFile.name,
          mimeType: selectedFile.type || upload?.file?.mimeType || "application/octet-stream",
          sizeBytes: selectedFile.size,
        }));
      }
      onChange([...files, ...uploaded].filter(Boolean).slice(0, MAX_MEDIA_UPLOAD_FILES));
    } catch (error) {
      setMessage(error.message || "File upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
    setMessage("");
  };

  return (
    <div
      className={invalid ? "template-media-upload-field toolbox-field-invalid" : "template-media-upload-field"}
      ref={targetRef}
    >
      <div className="template-media-upload-heading">
        <div>
          <span>{field.label}</span>
          {field.helperText ? <small>{field.helperText}</small> : null}
        </div>
        {field.required ? <strong>Required</strong> : null}
      </div>
      <div className="template-media-upload-drop">
        <label className={uploading ? "template-media-upload-select disabled" : "template-media-upload-select"}>
          <input
            accept={mediaUploadAccept(field) || MEDIA_UPLOAD_ACCEPT}
            aria-label={field.label}
            disabled={!canUpload || uploading || files.length >= MAX_MEDIA_UPLOAD_FILES}
            multiple
            type="file"
            onChange={uploadFiles}
          />
          <span>{uploading ? "Uploading..." : files.length ? "Add files" : "Choose files"}</span>
        </label>
        <small>{mediaUploadAcceptedKindsLabel(field)} / {MAX_MEDIA_UPLOAD_FILES} files max / 50 MiB each</small>
      </div>
      {files.length ? (
        <div className="template-media-file-list">
          {files.map((file, index) => (
            <div className="template-media-file-row" key={`${file.storagePath || file.originalFilename}-${index}`}>
              <div>
                <strong>{file.originalFilename || "Attachment"}</strong>
                <small>{mediaUploadFileTypeLabel(file)} / {formatFileSize(file.sizeBytes)}</small>
              </div>
              {canUpload ? (
                <button type="button" onClick={() => removeFile(index)}>
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="template-media-empty">No files uploaded yet.</p>
      )}
      {message ? <p className="template-media-message">{message}</p> : null}
    </div>
  );
}

function SignaturePadField({ field, invalid, targetRef, value, onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const valueRef = useRef(cleanSignatureDataUrl(value));

  useEffect(() => {
    valueRef.current = cleanSignatureDataUrl(value);
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const drawStoredSignature = () => {
      const context = prepareSignatureCanvas(canvas);
      const rect = canvas.getBoundingClientRect();
      context.clearRect(0, 0, rect.width, rect.height);
      const storedValue = valueRef.current;
      if (!storedValue) return;
      const image = new Image();
      image.onload = () => {
        context.clearRect(0, 0, rect.width, rect.height);
        context.drawImage(image, 0, 0, rect.width, rect.height);
      };
      image.src = storedValue;
    };

    drawStoredSignature();
    window.addEventListener("resize", drawStoredSignature);
    return () => window.removeEventListener("resize", drawStoredSignature);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || drawingRef.current) return;
    const context = prepareSignatureCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    const storedValue = cleanSignatureDataUrl(value);
    valueRef.current = storedValue;
    if (!storedValue) return;
    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, rect.width, rect.height);
      context.drawImage(image, 0, 0, rect.width, rect.height);
    };
    image.src = storedValue;
  }, [value]);

  const pointForEvent = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const nextValue = canvas.toDataURL("image/png");
    valueRef.current = nextValue;
    onChange(nextValue);
  };

  const handlePointerDown = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    drawingRef.current = true;
    const point = pointForEvent(event);
    lastPointRef.current = point;
    const context = signatureContext(canvas);
    context.beginPath();
    context.arc(point.x, point.y, 1.3, 0, Math.PI * 2);
    context.fill();
  };

  const handlePointerMove = (event) => {
    if (!drawingRef.current || !canvasRef.current) return;
    event.preventDefault();
    const previous = lastPointRef.current;
    const next = pointForEvent(event);
    if (previous) {
      const context = signatureContext(canvasRef.current);
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(next.x, next.y);
      context.stroke();
    }
    lastPointRef.current = next;
  };

  const finishDrawing = (event) => {
    if (!drawingRef.current) return;
    event.preventDefault();
    canvasRef.current?.releasePointerCapture?.(event.pointerId);
    drawingRef.current = false;
    lastPointRef.current = null;
    saveSignature();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = prepareSignatureCanvas(canvas);
    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    valueRef.current = "";
    onChange("");
  };

  return (
    <div className={invalid ? "template-signature-field toolbox-field-invalid" : "template-signature-field"} ref={targetRef}>
      <span>{field.label}</span>
      <div className="template-signature-pad">
        <canvas
          aria-label={field.label}
          className="template-signature-canvas"
          ref={canvasRef}
          onPointerCancel={finishDrawing}
          onPointerDown={handlePointerDown}
          onPointerLeave={finishDrawing}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
        />
        <div className="template-signature-toolbar">
          <small>{field.helperText || "Draw in the box with a finger, stylus, or mouse."}</small>
          <button type="button" onClick={clearSignature}>Clear</button>
        </div>
      </div>
    </div>
  );
}

function prepareSignatureCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 2.4;
  context.strokeStyle = "#17211f";
  context.fillStyle = "#17211f";
  return context;
}

function signatureContext(canvas) {
  const context = canvas.getContext("2d");
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 2.4;
  context.strokeStyle = "#17211f";
  context.fillStyle = "#17211f";
  return context;
}

function ActionItemsTable({
  allVisibleSelected,
  canManage,
  loading,
  rows,
  saving,
  selectedIds,
  onDelete,
  onDetails,
  onSelectAll,
  onSelectRow,
  onUpdate,
}) {
  if (loading) return <p className="empty-state">Loading action items...</p>;
  if (!rows.length) return <p className="empty-state">No action items found.</p>;

  return (
    <>
      <div className="action-item-mobile-list">
        {rows.map((item) => (
          <article className="action-item-card" key={`mobile-${item.id}`}>
            <div className="action-item-card-top">
              {canManage ? (
                <input
                  aria-label={`Select action item ${item.title}`}
                  checked={selectedIds.includes(item.id)}
                  type="checkbox"
                  onChange={(event) => onSelectRow(item.id, event.target.checked)}
                />
              ) : null}
              <div>
                <strong>{item.title || item.description || "Action item"}</strong>
                <span>{[item.company, item.project].filter(Boolean).join(" / ") || "-"}</span>
              </div>
            </div>
            <p>{item.description || item.recommended_action || "No deficiency description."}</p>
            <div className="action-item-card-meta">
              <StatusPill value={actionItemStatusLabel(item.status)} />
              <StatusPill value={priorityLabel(item.priority)} />
              <span>{item.due_date ? `Due ${formatDateString(item.due_date)}` : "No due date"}</span>
            </div>
            <div className="table-action-row">
              <button type="button" onClick={() => onDetails(item)}>Details</button>
              {item.status === "draft" && canManage ? (
                <button disabled={saving === item.id} type="button" onClick={() => onUpdate(item.id, { status: "open" })}>
                  Activate
                </button>
              ) : null}
              {canManage ? (
                <button className="danger-button" disabled={saving === item.id} type="button" onClick={() => onDelete(item)}>
                  Delete
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      <div className="staff-table-scroll action-item-table-scroll">
        <table className="staff-table action-items-table">
          <thead>
            <tr>
              {canManage ? (
                <th className="select-column">
                  <input
                    aria-label="Select all visible action items"
                    checked={allVisibleSelected}
                    type="checkbox"
                    onChange={(event) => onSelectAll(event.target.checked)}
                  />
                </th>
              ) : null}
              <th>Item</th>
              <th>Company</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Due</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id}>
                {canManage ? (
                  <td className="select-column">
                    <input
                      aria-label={`Select action item ${item.title}`}
                      checked={selectedIds.includes(item.id)}
                      type="checkbox"
                      onChange={(event) => onSelectRow(item.id, event.target.checked)}
                    />
                  </td>
                ) : null}
                <td>
                  <strong>{item.title || item.description || "Action item"}</strong>
                  <div className="table-subtext">{item.location || item.area || item.category || ""}</div>
                </td>
                <td>{[item.company, item.project].filter(Boolean).join(" / ") || "-"}</td>
                <td><StatusPill value={priorityLabel(item.priority)} /></td>
                <td><StatusPill value={actionItemStatusLabel(item.status)} /></td>
                <td>{item.assigned_to || item.suggested_assignee || "-"}</td>
                <td>{item.due_date ? formatDateString(item.due_date) : "-"}</td>
                <td>
                  <div className="table-action-row">
                    <button type="button" onClick={() => onDetails(item)}>Details</button>
                    {item.status === "draft" && canManage ? (
                      <button disabled={saving === item.id} type="button" onClick={() => onUpdate(item.id, { status: "open" })}>
                        Activate
                      </button>
                    ) : null}
                    {canManage ? (
                      <button className="danger-button" disabled={saving === item.id} type="button" onClick={() => onDelete(item)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ActionItemDetailsDialog({
  canManage,
  item,
  onClose,
  onComment,
  onDelete,
  onFilePreview,
  onOpenSource,
  onSave,
  onUploadEvidence,
  saving,
}) {
  const [edit, setEdit] = useState(() => actionItemEditState(item));
  const [comment, setComment] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [localMessage, setLocalMessage] = useState("");

  useEffect(() => {
    setEdit(actionItemEditState(item));
    setComment("");
    setEvidenceFile(null);
    setLocalMessage("");
  }, [item]);

  const updateEdit = (field, value) => {
    setEdit((current) => ({ ...current, [field]: value }));
  };

  const submitSave = async (event) => {
    event.preventDefault();
    setLocalMessage("");
    try {
      const updates = canManage
        ? edit
        : {
            closeoutNotes: edit.closeoutNotes,
            ...(edit.status !== item.status ? { status: edit.status } : {}),
          };
      await onSave(item.id, updates);
    } catch (error) {
      setLocalMessage(error.message);
    }
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    setLocalMessage("");
    try {
      await onComment(item.id, comment);
      setComment("");
    } catch (error) {
      setLocalMessage(error.message);
    }
  };

  const submitEvidence = async () => {
    if (!evidenceFile) return;
    setLocalMessage("");
    try {
      await onUploadEvidence(item, evidenceFile);
      setEvidenceFile(null);
    } catch (error) {
      setLocalMessage(error.message);
    }
  };

  return (
    <div className="staff-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Action item details"
        className="staff-detail-dialog action-item-detail-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-heading">
          <div>
            <h2>{item.title || "Action item"}</h2>
            <p>{[item.company, item.project].filter(Boolean).join(" / ") || "No company"}</p>
          </div>
          <button aria-label="Close" type="button" onClick={onClose}>X</button>
        </div>

        {localMessage ? <p className="form-message error">{localMessage}</p> : null}

        <dl className="staff-detail-list">
          <div>
            <dt>Source</dt>
            <dd>
              {item.source_submission_id ? (
                <button className="submission-file-name-button" type="button" onClick={() => onOpenSource(item)}>
                  Site inspection #{Number(item.source_deficiency_index ?? 0) + 1}
                </button>
              ) : (
                "Manual"
              )}
            </dd>
          </div>
          <div><dt>Status</dt><dd><StatusPill value={actionItemStatusLabel(item.status)} /></dd></div>
          <div><dt>Priority</dt><dd><StatusPill value={priorityLabel(item.priority)} /></dd></div>
          <div><dt>Due</dt><dd>{item.due_date ? formatDateString(item.due_date) : "-"}</dd></div>
          <div><dt>Assigned</dt><dd>{item.assigned_to || item.suggested_assignee || "-"}</dd></div>
          <div><dt>Location</dt><dd>{item.location || item.area || "-"}</dd></div>
        </dl>

        <form className="action-item-edit-form" onSubmit={submitSave}>
          {canManage ? (
            <>
              <div className="toolbox-field-grid compact">
                <label>
                  <span>Status</span>
                  <select value={edit.status} onChange={(event) => updateEdit("status", event.target.value)}>
                    {ACTION_ITEM_STATUS_OPTIONS.map((status) => (
                      <option key={status.id} value={status.id}>{status.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Priority</span>
                  <select value={edit.priority} onChange={(event) => updateEdit("priority", event.target.value)}>
                    {ACTION_ITEM_PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority.id} value={priority.id}>{priority.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Due date</span>
                  <input type="date" value={edit.dueDate} onChange={(event) => updateEdit("dueDate", event.target.value)} />
                </label>
              </div>
              <div className="toolbox-field-grid">
                <label>
                  <span>Assigned to</span>
                  <input value={edit.assignedTo} onChange={(event) => updateEdit("assignedTo", event.target.value)} />
                </label>
                <label>
                  <span>Title</span>
                  <input value={edit.title} onChange={(event) => updateEdit("title", event.target.value)} />
                </label>
              </div>
              <label>
                <span>Deficiency / hazard</span>
                <textarea rows="3" value={edit.description} onChange={(event) => updateEdit("description", event.target.value)} />
              </label>
              <label>
                <span>Recommended corrective action</span>
                <textarea rows="3" value={edit.recommendedAction} onChange={(event) => updateEdit("recommendedAction", event.target.value)} />
              </label>
            </>
          ) : (
            <div className="action-status-quick-row">
              <button type="button" onClick={() => updateEdit("status", "in_progress")}>In progress</button>
              <button type="button" onClick={() => updateEdit("status", "ready_for_review")}>Ready for review</button>
            </div>
          )}
          <label>
            <span>Closeout notes</span>
            <textarea rows="3" value={edit.closeoutNotes} onChange={(event) => updateEdit("closeoutNotes", event.target.value)} />
          </label>
          <div className="staff-card-actions">
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? "Saving..." : "Save action item"}
            </button>
            {canManage ? (
              <button className="danger-button" disabled={saving} type="button" onClick={() => onDelete(item)}>
                Delete
              </button>
            ) : null}
          </div>
        </form>

        <section className="action-item-comment-box">
          <h3>Comments</h3>
          <textarea
            rows="3"
            placeholder="Add a note"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          <button disabled={saving || !comment.trim()} type="button" onClick={submitComment}>
            Add comment
          </button>
        </section>

        <section className="action-item-comment-box">
          <h3>Evidence</h3>
          <label className="camera-fallback-button action-evidence-picker">
            <input
              accept={SCANNED_COPY_ACCEPT}
              type="file"
              onChange={(event) => setEvidenceFile(event.target.files?.[0] || null)}
            />
            Choose evidence file
          </label>
          {evidenceFile ? (
            <p className="selected-file">{evidenceFile.name} / {formatFileSize(evidenceFile.size)}</p>
          ) : null}
          <button disabled={saving || !evidenceFile} type="button" onClick={submitEvidence}>
            Upload evidence
          </button>
          {item.files?.length ? (
            <div className="submission-file-list">
              {item.files.map((file) => (
                <div className="submission-file-row" key={file.id}>
                  <button
                    className="submission-file-name-button"
                    type="button"
                    onClick={() => onFilePreview(item, file)}
                  >
                    {file.original_filename}
                  </button>
                  <small>{formatFileSize(file.size_bytes)}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No evidence files yet.</p>
          )}
        </section>

        <section className="action-item-timeline">
          <h3>History</h3>
          {item.events?.length ? (
            item.events.map((event) => (
              <article key={event.id}>
                <strong>{actionItemEventLabel(event.event_type)}</strong>
                <span>{formatDateTime(event.created_at)}{event.actor_username ? ` / ${event.actor_username}` : ""}</span>
                {event.body ? <p>{event.body}</p> : null}
              </article>
            ))
          ) : (
            <p className="empty-state">No history yet.</p>
          )}
        </section>
      </section>
    </div>
  );
}

function WorkerAccountsTable({ canManage, loading, rows, onDelete, onEdit, onToggleActive }) {
  if (loading) return <p className="empty-state">Loading workers...</p>;
  if (!rows.length) return <p className="empty-state">No worker accounts found.</p>;

  return (
    <div className="staff-table-scroll staff-form-table-scroll">
      <table className="staff-table worker-accounts-table">
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
              <td data-label="Name">{worker.name}</td>
              <td data-label="Company">{worker.company}</td>
              <td data-label="Phone"><a href={`tel:${phoneHref(worker.phone)}`}>{worker.phone}</a></td>
              <td data-label="Username">{worker.username}</td>
              <td data-label="Status"><StatusPill value={worker.active ? "Active" : "Inactive"} /></td>
              <td data-label="Actions">
                <div className="table-action-row">
                  {canManage ? (
                    <>
                      <button type="button" onClick={() => onEdit(worker)}>Edit</button>
                      <button type="button" onClick={() => onToggleActive(worker)}>
                        {worker.active ? "Deactivate" : "Activate"}
                      </button>
                      <button className="danger-button" type="button" onClick={() => onDelete(worker)}>
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="muted">View only</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffUsersTable({
  canManage,
  currentStaffId,
  loading,
  rows,
  showEmail,
  onDelete,
  onEdit,
  onToggleActive,
}) {
  if (loading) return <p className="empty-state">Loading staff...</p>;
  if (!rows.length) return <p className="empty-state">No staff found.</p>;

  return (
    <div className="staff-table-scroll staff-form-table-scroll">
      <table className={`staff-table worker-accounts-table staff-accounts-table${canManage ? " staff-accounts-table-actions" : ""}`}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            {showEmail ? <th>Email</th> : null}
            <th>Phone</th>
            <th>Role</th>
            <th>Status</th>
            {canManage ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((user) => (
            <tr key={user.id}>
              <td data-label="Name">{user.display_name}</td>
              <td data-label="Username">{user.username}</td>
              {showEmail ? <td data-label="Email"><a href={`mailto:${user.email}`}>{user.email}</a></td> : null}
              <td data-label="Phone">
                {user.phone ? <a href={`tel:${phoneHref(user.phone)}`}>{user.phone}</a> : <span className="muted">-</span>}
              </td>
              <td data-label="Role"><StatusPill value={roleLabel(user.role)} /></td>
              <td data-label="Status"><StatusPill value={user.active ? "Active" : "Inactive"} /></td>
              {canManage ? (
                <td data-label="Actions">
                  <div className="table-action-row">
                    <button type="button" onClick={() => onEdit(user)}>Edit</button>
                    <button
                      disabled={user.id === currentStaffId}
                      type="button"
                      onClick={() => onToggleActive(user)}
                    >
                      {user.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      className="danger-button"
                      disabled={user.id === currentStaffId}
                      type="button"
                      onClick={() => onDelete(user)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BackupQueueTable({ loading, rows }) {
  if (loading) return <p className="empty-state">Loading backup queue...</p>;
  if (!rows.length) return <p className="empty-state">No pending or retention-blocked backup rows.</p>;

  return (
    <div className="staff-table-scroll staff-form-table-scroll">
      <table className="staff-table form-submissions-table">
        <thead>
          <tr>
            <th>Submitted</th>
            <th>Company</th>
            <th>Name</th>
            <th>Form</th>
            <th>Backup</th>
            <th>Last error</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatDateTime(row.submitted_at)}</td>
              <td>{row.company}</td>
              <td>{row.worker_name}</td>
              <td>{formTypeLabel(row.form_type)}</td>
              <td><StatusPill value={backupStatusLabel(row.one_drive_backup_status)} /></td>
              <td>{row.backup_error || (row.deleted_by_worker_at ? "Worker deleted; waiting for backup." : "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertsTable({ rows, onUpdate }) {
  if (!rows.length) return <p className="empty-state">No active alerts.</p>;
  return (
    <div className="staff-table-scroll staff-form-table-scroll">
      <table className="staff-table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Alert</th>
            <th>Status</th>
            <th>Last seen</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((alert) => (
            <tr key={alert.id}>
              <td><StatusPill value={alert.severity} /></td>
              <td>
                <strong>{alert.title}</strong>
                <div className="table-subtext">{alert.body}</div>
              </td>
              <td><StatusPill value={alert.status} /></td>
              <td>{formatDateTime(alert.last_seen_at)}</td>
              <td>
                <div className="table-action-row">
                  {alert.status === "open" ? (
                    <button type="button" onClick={() => onUpdate(alert, "acknowledged")}>Acknowledge</button>
                  ) : null}
                  <button type="button" onClick={() => onUpdate(alert, "resolved")}>Resolve</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JobRunsTable({ rows }) {
  if (!rows.length) return <p className="empty-state">No operational job runs recorded yet.</p>;
  return (
    <div className="staff-table-scroll staff-form-table-scroll">
      <table className="staff-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Status</th>
            <th>Triggered by</th>
            <th>Started</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((job) => (
            <tr key={job.id}>
              <td>{job.job_name}</td>
              <td><StatusPill value={job.status} /></td>
              <td>{job.triggered_by}</td>
              <td>{formatDateTime(job.started_at)}</td>
              <td>{job.error || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditEventsTable({ loading, rows }) {
  if (loading) return <p className="empty-state">Loading audit events...</p>;
  if (!rows.length) return <p className="empty-state">No audit events found.</p>;

  return (
    <div className="staff-table-scroll staff-form-table-scroll">
      <table className="staff-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th>Summary</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatDateTime(row.created_at)}</td>
              <td>{row.actor_username || "system"}</td>
              <td>{row.action}</td>
              <td>{[row.target_type, row.target_id].filter(Boolean).join(" / ")}</td>
              <td>{row.summary}</td>
              <td>{row.ip_address || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OpsMetric({ label, value }) {
  return (
    <article className="trend-metric-card ops-metric-card">
      <span>{label}</span>
      <strong>{formatTrendNumber(value || 0)}</strong>
    </article>
  );
}

function isInteractiveTableTarget(event) {
  const target = event.target;
  return (
    target instanceof Element &&
    Boolean(target.closest("a, button, input, label, select, summary, textarea, [role='button'], [data-row-action]"))
  );
}

function FormSubmissionsTable({
  allVisibleSelected,
  canDelete,
  canRetry,
  deleting,
  loading,
  retryingId,
  rows,
  selectedIds,
  onDelete,
  onDetails,
  onRetry,
  onSelectAll,
  onSelectRow,
}) {
  if (loading) return <p className="empty-state">Loading form submissions...</p>;
  if (!rows.length) return <p className="empty-state">No form submissions found.</p>;

  return (
    <div className="staff-table-scroll staff-form-table-scroll">
      <table className="staff-table form-submissions-table">
        <thead>
          <tr>
            {canDelete ? (
              <th className="select-column">
                <input
                  aria-label="Select all visible form submissions"
                  checked={allVisibleSelected}
                  type="checkbox"
                  onChange={(event) => onSelectAll(event.target.checked)}
                />
              </th>
            ) : null}
            <th className="submitted-column">Submitted</th>
            <th className="company-column">Company</th>
            <th className="staff-mobile-hidden">Name</th>
            <th className="staff-mobile-hidden">Phone</th>
            <th className="form-column">Form</th>
            <th className="staff-mobile-hidden">Type</th>
            <th className="staff-mobile-hidden">Backup</th>
            <th className="actions-column">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              aria-label={`Open ${formTypeLabel(row.form_type)} submitted by ${row.worker_name} from ${row.company}`}
              tabIndex={0}
              onClick={(event) => {
                if (isInteractiveTableTarget(event)) return;
                onDetails(row);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                if (isInteractiveTableTarget(event)) return;
                event.preventDefault();
                onDetails(row);
              }}
            >
              {canDelete ? (
                <td className="select-column">
                  <input
                    aria-label={`Select ${formTypeLabel(row.form_type)} submitted by ${row.worker_name}`}
                    checked={selectedIds.includes(row.id)}
                    type="checkbox"
                    onChange={(event) => onSelectRow(row.id, event.target.checked)}
                  />
                </td>
              ) : null}
              <td className="submitted-column">{formatDateTime(row.submitted_at)}</td>
              <td className="company-column">{row.company}</td>
              <td className="staff-mobile-hidden">{row.worker_name}</td>
              <td className="staff-mobile-hidden"><a href={`tel:${phoneHref(row.worker_phone)}`}>{row.worker_phone}</a></td>
              <td className="form-column">{formTypeLabel(row.form_type)}</td>
              <td className="staff-mobile-hidden">{submissionModeLabel(row.submission_mode)}</td>
              <td className="staff-mobile-hidden"><StatusPill value={backupStatusLabel(row.one_drive_backup_status)} /></td>
              <td className="actions-column">
                <div className="table-action-row">
                  <button type="button" onClick={() => onDetails(row)}>Details</button>
                  {canRetry && canRetryBackup(row.one_drive_backup_status) ? (
                    <button disabled={retryingId === row.id} type="button" onClick={() => onRetry(row.id)}>
                      {retryingId === row.id ? "Retrying" : "Retry"}
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      className="danger-button"
                      disabled={deleting}
                      type="button"
                      onClick={() => onDelete(row)}
                    >
                      Delete
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

function SubmissionDetailsDialog({ canRetry = false, onClose, onRetry, retryingId, row }) {
  const files = row.files || [];
  const exportSurfaceRef = useRef(null);
  const [filePreview, setFilePreview] = useState(null);
  const [previewLoadingId, setPreviewLoadingId] = useState("");
  const [filePreviewMessage, setFilePreviewMessage] = useState("");
  const digitalFormData = digitalSubmissionData(row);
  const filesByStoragePath = useMemo(() => {
    const map = new Map();
    files.forEach((file) => {
      if (file?.storage_path) map.set(file.storage_path, file);
    });
    return map;
  }, [files]);

  const openFilePreview = async (file) => {
    setPreviewLoadingId(file.id);
    setFilePreviewMessage("");
    try {
      const payload = await readApiJson(
        await fetch(`/api/staff/submissions/${row.id}/files/${file.id}/url`, {
          credentials: "include",
        }),
      );
      setFilePreview(payload);
    } catch (error) {
      setFilePreviewMessage(error.message);
    } finally {
      setPreviewLoadingId("");
    }
  };

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
          <div className="dialog-heading-actions">
            <DigitalFormActions
              className="digital-form-actions dialog-digital-form-actions"
              data={digitalFormData}
              exportRef={exportSurfaceRef}
              row={row}
            />
            <button aria-label="Close" type="button" onClick={onClose}>X</button>
          </div>
        </div>
        <div className="submission-export-surface" ref={exportSurfaceRef}>
          <div className="submission-export-heading">
            <p>APPIA</p>
            <h2>{formTypeLabel(row.form_type)}</h2>
            <strong>{row.worker_name} / {row.company}</strong>
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
          {isDigitalToolboxTalkSubmission(row) ? (
            <ToolboxTalkSubmissionDetails
              data={row.form_data}
              filePreviewContext={{ filesByStoragePath, openFilePreview, previewLoadingId }}
              row={row}
              showActions={false}
            />
          ) : null}
          {isDigitalSiteInspectionSubmission(row) ? (
            <SiteInspectionSubmissionDetails
              data={row.form_data}
              filePreviewContext={{ filesByStoragePath, openFilePreview, previewLoadingId }}
              row={row}
              showActions={false}
            />
          ) : null}
          {isTemplateDigitalSubmission(row) ? (
            <TemplateSubmissionDetails
              data={row.form_data}
              filePreviewContext={{ filesByStoragePath, openFilePreview, previewLoadingId }}
              row={row}
              showActions={false}
            />
          ) : null}
          {row.action_items?.length ? (
            <div className="submission-action-items">
              <h3>Linked Action Items</h3>
              {row.action_items.map((item) => (
                <div className="submission-action-item-row" key={item.id}>
                  <div>
                    <strong>{item.title || item.description || "Action item"}</strong>
                    <span>{item.assigned_to || item.suggested_assignee || "Unassigned"}</span>
                  </div>
                  <StatusPill value={actionItemStatusLabel(item.status)} />
                  <StatusPill value={priorityLabel(item.priority)} />
                </div>
              ))}
            </div>
          ) : null}
          {files.length ? (
            <div className="submission-file-list">
              <h3>Files</h3>
              {filePreviewMessage ? <p className="form-message error">{filePreviewMessage}</p> : null}
              {files.map((file) => (
                <div className="submission-file-row" key={file.id}>
                  <button
                    className="submission-file-name-button"
                    disabled={previewLoadingId === file.id}
                    type="button"
                    onClick={() => openFilePreview(file)}
                  >
                    {previewLoadingId === file.id ? "Opening..." : file.original_filename}
                  </button>
                  <small>{formatFileSize(file.size_bytes)} / {backupStatusLabel(file.backup_status)}</small>
                  {file.one_drive_web_url ? (
                    <a href={file.one_drive_web_url} target="_blank" rel="noreferrer">Open</a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          <StaffSignoffSection signoffs={row.staff_signoffs} />
        </div>
        {canRetry && canRetryBackup(row.one_drive_backup_status) ? (
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
      {filePreview ? (
        <SubmissionFilePreviewDialog
          preview={filePreview}
          onClose={() => setFilePreview(null)}
        />
      ) : null}
    </div>
  );
}

function SubmissionFilePreviewDialog({ onClose, preview }) {
  const file = preview.file || {};
  const fileName = file.original_filename || "Attachment";
  const canPreview = isPreviewableImage(file) || isPreviewablePdf(file);
  const [shareStatus, setShareStatus] = useState("");
  const [sharing, setSharing] = useState(false);

  const shareOrSave = async () => {
    setSharing(true);
    setShareStatus("");
    try {
      const shared = await shareSubmissionAttachment(preview);
      if (!shared) {
        window.open(preview.downloadUrl || preview.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setShareStatus(error.message || "This device could not open the share sheet.");
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className="file-preview-backdrop"
      role="presentation"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <section
        aria-label={`${fileName} preview`}
        className="file-preview-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="file-preview-heading">
          <div>
            <h3>{fileName}</h3>
            <p>{formatFileSize(file.size_bytes)} / {file.mime_type || "File"}</p>
          </div>
          <button aria-label="Close preview" type="button" onClick={onClose}>X</button>
        </div>
        <div className="file-preview-surface">
          {isPreviewableImage(file) ? (
            <img alt={fileName} src={preview.url} />
          ) : null}
          {isPreviewablePdf(file) ? (
            <iframe title={fileName} src={preview.url} />
          ) : null}
          {!canPreview ? (
            <p>This file type cannot be previewed here. Use Save to open or download it.</p>
          ) : null}
        </div>
        <div className="file-preview-actions">
          <button disabled={sharing} type="button" onClick={shareOrSave}>
            {sharing ? "Opening..." : "Save"}
          </button>
          <button
            disabled={!canPreview}
            type="button"
            onClick={() => printSubmissionAttachment(preview)}
          >
            Print
          </button>
        </div>
        {shareStatus ? <p className="file-preview-status">{shareStatus}</p> : null}
      </section>
    </div>
  );
}

function ToolboxTalkSubmissionDetails({ data, filePreviewContext, row, showActions = true }) {
  const header = data.header || {};
  const incident = data.incidentReview || {};
  const selectedTopics = data.topics?.selected || [];
  const safetyConcerns = data.safetyConcerns || [];
  const attendance = data.attendance || [];
  const confirmation = data.confirmation || {};
  const layout = getToolboxTalkLayout(data?.schemaSnapshot || row?.form_schema_snapshot);
  const incidentReviewSettings = normalizeToolboxCompositeSettings(
    layout.blockSettings.toolbox_incident_review,
    "toolbox_incident_review",
  );
  const safetyConcernSettings = normalizeToolboxCompositeSettings(
    layout.blockSettings.toolbox_safety_concerns,
    "toolbox_safety_concerns",
  );
  const visibleIncidentFields = visibleToolboxCompositeFields(incidentReviewSettings);
  const visibleSafetyConcernFields = visibleToolboxCompositeFields(safetyConcernSettings);

  return (
    <div className="toolbox-detail">
      <section>
        <h3>Meeting Info</h3>
        <dl className="staff-detail-list">
          <div><dt>Project</dt><dd>{header.projectName || "-"}</dd></div>
          <div><dt>Address</dt><dd>{header.address || "-"}</dd></div>
          <div><dt>Date</dt><dd>{header.date ? formatDateString(header.date) : "-"}</dd></div>
          <div><dt>Time</dt><dd>{header.time || "-"}</dd></div>
          <div><dt>Presenter</dt><dd>{header.presenter || "-"}</dd></div>
          <div><dt>Supervisor</dt><dd>{header.supervisor || "-"}</dd></div>
        </dl>
      </section>

      <section>
        <h3>Topics Discussed</h3>
        {selectedTopics.length ? (
          <div className="toolbox-detail-chip-list">
            {selectedTopics.map((topic) => (
              <span key={`${topic.categoryId}-${topic.topicId}`}>
                {topic.categoryLabel}: {topic.label}
              </span>
            ))}
          </div>
        ) : null}
        {data.topics?.other ? (
          <p className="toolbox-detail-text">{data.topics.other}</p>
        ) : null}
      </section>

      <section>
        <h3>{layout.blockLabels.toolbox_incident_review || "Review Notes"}</h3>
        <dl className="staff-detail-list">
          {visibleIncidentFields
            .filter((field) => {
              if (field.conditionalKey) return incident[field.conditionalKey] === field.conditionalValue && incident[field.key];
              if (field.input === "textarea") return Boolean(incident[field.key]);
              return true;
            })
            .map((field) => (
              <div key={field.key}>
                <dt>{field.label}</dt>
                <dd>{toolboxIncidentDisplayValue(field, incident) || "-"}</dd>
              </div>
            ))}
        </dl>
      </section>

      {safetyConcerns.length ? (
        <section>
          <h3>{layout.blockLabels.toolbox_safety_concerns || "Safety Concerns"}</h3>
          <div className="toolbox-detail-table" style={toolboxDetailGridStyle(visibleSafetyConcernFields)}>
            {visibleSafetyConcernFields.map((field) => (
              <div className="header" key={`concern-header-${field.key}`}>{field.label}</div>
            ))}
            {safetyConcerns.map((row, index) => (
              <Fragment key={`concern-detail-${index}`}>
                {visibleSafetyConcernFields.map((field) => (
                  <div key={`concern-detail-${index}-${field.key}`}>
                    {toolboxSafetyConcernDisplayValue(field, row)}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3>Attendance</h3>
        <div className="toolbox-detail-chip-list">
          {attendance.map((row, index) => (
            <span key={`attendance-detail-${index}`}>{row.name}</span>
          ))}
        </div>
      </section>

      <section>
        <h3>Final Check</h3>
        <dl className="staff-detail-list">
          {data.additionalComments ? (
            <div><dt>Comments</dt><dd>{data.additionalComments}</dd></div>
          ) : null}
          <div><dt>Confirmed by</dt><dd>{confirmation.name || "-"}</dd></div>
          <div><dt>Confirmation date</dt><dd>{confirmation.date ? formatDateString(confirmation.date) : "-"}</dd></div>
          <div><dt>Participation confirmed</dt><dd>{confirmation.confirmed ? "Yes" : "No"}</dd></div>
        </dl>
      </section>

      <CustomGenericSubmissionDetails
        actionItemBlocks={data.actionItemBlocks}
        answers={data.answers}
        filePreviewContext={filePreviewContext}
        schema={getCustomGenericTemplateSchema(
          data?.schemaSnapshot || row?.form_schema_snapshot,
          isToolboxTalkConsumedTemplateField,
          "toolbox_talk",
        )}
      />

      {showActions ? <DigitalFormActions data={data} row={row} /> : null}
    </div>
  );
}

function SiteInspectionSubmissionDetails({ data, filePreviewContext, row, showActions = true }) {
  const header = data.header || {};
  const observations = data.observations || {};
  const deficiencies = Array.isArray(data.deficiencies) ? data.deficiencies : [];

  return (
    <div className="toolbox-detail site-inspection-detail">
      <section>
        <h3>Inspection Info</h3>
        <dl className="staff-detail-list">
          <div><dt>Project</dt><dd>{header.project || "-"}</dd></div>
          <div><dt>Address</dt><dd>{header.address || "-"}</dd></div>
          <div><dt>Area</dt><dd>{header.areaInspected || "-"}</dd></div>
          <div><dt>Date</dt><dd>{header.date ? formatDateString(header.date) : "-"}</dd></div>
          <div><dt>Time</dt><dd>{header.time || "-"}</dd></div>
          <div><dt>Inspector</dt><dd>{header.inspector || "-"}</dd></div>
          <div><dt>Trades</dt><dd>{header.tradesPresent || "-"}</dd></div>
          <div><dt>Reviewer</dt><dd>{header.reviewer || "-"}</dd></div>
        </dl>
      </section>

      <section>
        <h3>Observations</h3>
        <dl className="staff-detail-list">
          <div><dt>Positive</dt><dd>{observations.positive || "-"}</dd></div>
          <div><dt>High-risk work</dt><dd>{observations.highRiskWork || "-"}</dd></div>
          <div><dt>Immediate controls</dt><dd>{observations.immediateControls || "-"}</dd></div>
          <div><dt>Follow-up</dt><dd>{observations.followUpNotes || "-"}</dd></div>
        </dl>
      </section>

      <section>
        <h3>Deficiencies</h3>
        {data.noDeficiencies ? (
          <p className="toolbox-detail-text">No deficiencies found during this inspection.</p>
        ) : deficiencies.length ? (
          <div className="site-deficiency-detail-list">
            {deficiencies.map((deficiency, index) => (
              <article key={`site-deficiency-detail-${index}`}>
                <div className="toolbox-section-heading">
                  <h4>{deficiency.description || `Deficiency ${index + 1}`}</h4>
                  <StatusPill value={priorityLabel(deficiency.priority)} />
                </div>
                <dl className="staff-detail-list">
                  <div><dt>Category</dt><dd>{deficiency.category || "-"}</dd></div>
                  <div><dt>Location</dt><dd>{deficiency.location || "-"}</dd></div>
                  <div><dt>Immediate control</dt><dd>{deficiency.immediateControl || "-"}</dd></div>
                  <div><dt>Corrective action</dt><dd>{deficiency.recommendedAction || "-"}</dd></div>
                  <div><dt>Assignee</dt><dd>{deficiency.suggestedAssignee || "-"}</dd></div>
                  <div><dt>Due</dt><dd>{deficiency.dueDate ? formatDateString(deficiency.dueDate) : "-"}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No deficiencies recorded.</p>
        )}
      </section>

      <CustomGenericSubmissionDetails
        actionItemBlocks={data.actionItemBlocks}
        answers={data.answers}
        filePreviewContext={filePreviewContext}
        schema={getCustomGenericTemplateSchema(
          data?.schemaSnapshot || row?.form_schema_snapshot,
          isSiteInspectionConsumedTemplateField,
          row?.form_type || data?.formType || "site_inspection",
        )}
      />

      {showActions ? <DigitalFormActions data={data} row={row} /> : null}
    </div>
  );
}

function CustomGenericSubmissionDetails({ actionItemBlocks = {}, answers = {}, filePreviewContext, schema }) {
  const normalized = normalizeClientTemplateSchema(schema);
  const visibleSections = getVisibleTemplateSections(normalized, answers, null, { includeHiddenFields: true });
  if (!visibleSections.length) return null;
  return (
    <>
      {visibleSections.map((section) => (
        <section key={section.id}>
          <h3>{section.title}</h3>
          {section.description ? <p className="toolbox-detail-text">{section.description}</p> : null}
          <dl className="staff-detail-list template-detail-answer-list">
            {section.fields
              .filter((field) => !isTemplateNonAnswerField(field))
              .map((field) => (
                <div key={field.id}>
                  <dt>{field.label}</dt>
                  <dd>{renderTemplateAnswerDisplay(field, answers?.[field.id], filePreviewContext)}</dd>
                </div>
              ))}
          </dl>
          {section.fields
            .filter((field) => ACTION_ITEM_ROW_BLOCK_TYPES.has(field.type))
            .map((field) => (
              <ActionItemRowsSubmissionDetail
                block={actionItemBlocks?.[field.id]}
                field={field}
                key={field.id}
              />
            ))}
        </section>
      ))}
    </>
  );
}

function TemplateSubmissionDetails({ data, filePreviewContext, row, showActions = true }) {
  const schema = normalizeClientTemplateSchema(data?.schemaSnapshot || row?.form_schema_snapshot);
  const answers = data?.answers || {};
  const actionItemBlocks = data?.actionItemBlocks || {};
  const visibleSections = getVisibleTemplateSections(schema, answers, null, { includeHiddenFields: true });

  return (
    <div className="toolbox-detail template-submission-detail">
      {visibleSections.map((section) => (
        <section key={section.id}>
          <h3>{section.title}</h3>
          {section.description ? <p className="toolbox-detail-text">{section.description}</p> : null}
          <dl className="staff-detail-list template-detail-answer-list">
            {section.fields
              .filter((field) => !isTemplateNonAnswerField(field))
              .map((field) => (
                <div key={field.id}>
                  <dt>{field.label}</dt>
                  <dd>{renderTemplateAnswerDisplay(field, answers[field.id], filePreviewContext)}</dd>
                </div>
              ))}
          </dl>
          {section.fields
            .filter((field) => ACTION_ITEM_ROW_BLOCK_TYPES.has(field.type))
            .map((field) => (
              <ActionItemRowsSubmissionDetail
                block={actionItemBlocks[field.id]}
                field={field}
                key={field.id}
              />
            ))}
        </section>
      ))}

      {showActions ? <DigitalFormActions data={data} row={row} /> : null}
    </div>
  );
}

function DigitalFormActions({ className = "digital-form-actions", data, exportRef, pdfScope = "staff", row }) {
  const [exportStatus, setExportStatus] = useState("");
  const [activeExport, setActiveExport] = useState("");

  const runExport = async (type) => {
    setActiveExport(type);
    setExportStatus("");
    try {
      if (type === "pdf") {
        await downloadDigitalFormPdf(row, data, exportRef, { pdfScope });
        setExportStatus("PDF saved.");
      } else if (type === "png") {
        await downloadDigitalFormPng(row, data, exportRef);
        setExportStatus("PNG saved.");
      } else {
        await printDigitalForm(row, data, exportRef);
        setExportStatus("Print dialog opened.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setExportStatus(error.message || "This form could not be exported.");
      }
    } finally {
      setActiveExport("");
    }
  };

  return (
    <div className={className}>
      <button disabled={Boolean(activeExport)} type="button" onClick={() => runExport("pdf")}>
        {activeExport === "pdf" ? "Saving..." : "PDF"}
      </button>
      <button disabled={Boolean(activeExport)} type="button" onClick={() => runExport("png")}>
        {activeExport === "png" ? "Saving..." : "PNG"}
      </button>
      <button disabled={Boolean(activeExport)} type="button" onClick={() => runExport("print")}>
        {activeExport === "print" ? "Opening..." : "Print"}
      </button>
      {exportStatus ? <p>{exportStatus}</p> : null}
    </div>
  );
}

function ActionItemRowsSubmissionDetail({ block, field }) {
  const settings = normalizeActionItemRowsSettings(field.settings, field.type);
  const value = normalizeActionItemBlockValue(block);
  const rows = value.noItems ? [] : (Array.isArray(block?.rows) ? block.rows : []);
  const visibleFields = visibleActionItemRowFields(settings);
  if (value.noItems) {
    return <p className="toolbox-detail-text">{settings.noneLabel}</p>;
  }
  if (!rows.length) {
    return <p className="empty-state">No action items recorded.</p>;
  }
  return (
    <div className="site-deficiency-detail-list">
      {rows.map((row, index) => (
        <article key={`${field.id}-action-row-${index}`}>
          <div className="toolbox-section-heading">
            <h4>{row.description || `${settings.rowLabel} ${index + 1}`}</h4>
            <StatusPill value={priorityLabel(row.priority || "medium")} />
          </div>
          <dl className="staff-detail-list">
            {visibleFields.map((subfield) => (
              <div key={subfield.key}>
                <dt>{subfield.label}</dt>
                <dd>{formatActionItemRowFieldDisplay(subfield.key, row[subfield.key])}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}

function formatActionItemRowFieldDisplay(key, value) {
  if (key === "priority") return priorityLabel(value || "medium");
  if (key === "dueDate") return value ? formatDateString(value) : "-";
  return value || "-";
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

function CameraCaptureDialog({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [capturedFile, setCapturedFile] = useState(null);
  const [capturedUrl, setCapturedUrl] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera is not available in this browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        });
        if (!active) {
          stopCameraStream(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        if (active) {
          setCameraError("Camera permission was denied or no camera is available.");
        }
      }
    };

    startCamera();

    return () => {
      active = false;
      stopCameraStream(streamRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    };
  }, [capturedUrl]);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera is still starting. Try again in a moment.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Photo could not be captured.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Photo could not be captured.");
          return;
        }
        if (capturedUrl) URL.revokeObjectURL(capturedUrl);
        const nextFile = new File([blob], `camera-photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setCapturedFile(nextFile);
        setCapturedUrl(URL.createObjectURL(blob));
        setCameraError("");
      },
      "image/jpeg",
      0.9,
    );
  };

  const retakePhoto = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedFile(null);
    setCapturedUrl("");
    setCameraError("");
  };

  const chooseFallbackPhoto = (selectedFile) => {
    if (selectedFile) onCapture(selectedFile);
  };

  return (
    <div className="camera-dialog-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="Take photo"
        className="camera-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="camera-dialog-heading">
          <h2>Take Photo</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>

        <div className="camera-preview">
          {capturedUrl ? (
            <img alt="Captured form upload" src={capturedUrl} />
          ) : (
            <video ref={videoRef} autoPlay muted playsInline />
          )}
          {!ready && !capturedUrl && !cameraError ? (
            <span>Starting camera...</span>
          ) : null}
        </div>
        <canvas ref={canvasRef} hidden />

        {cameraError ? (
          <p className="form-message error">{cameraError}</p>
        ) : null}

        <div className="camera-dialog-actions">
          {capturedFile ? (
            <>
              <button type="button" onClick={retakePhoto}>Retake</button>
              <button
                className="primary-button"
                type="button"
                onClick={() => onCapture(capturedFile)}
              >
                Use Photo
              </button>
            </>
          ) : (
            <button
              className="primary-button"
              disabled={!ready}
              type="button"
              onClick={capturePhoto}
            >
              Capture
            </button>
          )}
          {cameraError ? (
            <label className="camera-fallback-button">
              <input
                accept="image/*"
                capture="environment"
                type="file"
                onChange={(event) => chooseFallbackPhoto(event.target.files?.[0] || null)}
              />
              Choose Photo Instead
            </label>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function stopCameraStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
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

function StaffShell({ active, children, contentWide = false, navigateTo, staff = null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileNavItems = getStaffNavItemsForRole(staff);
  const activeMobileItem =
    mobileNavItems.find((item) => item.id === active) ||
    mobileNavItems[0] ||
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
            {mobileNavItems.map((item) => (
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

function getStaffNavItemsForRole(staff) {
  return STAFF_MOBILE_NAV_ITEMS.filter((item) => !item.adminOnly || isAdminOrOwner(staff));
}

function StaffProfileSettingsCard({ form, saving, onChange, onSubmit }) {
  return (
    <SettingsSection
      description="Your staff account details."
      title="Personal Info"
    >
      <form className="staff-profile-settings-form" onSubmit={onSubmit}>
        <label>
          <span>Name</span>
          <input
            required
            autoComplete="name"
            value={form.display_name}
            onChange={(event) => onChange("display_name", event.target.value)}
          />
        </label>
        <label>
          <span>Email</span>
          <input
            required
            autoComplete="email"
            inputMode="email"
            type="email"
            value={form.email}
            onChange={(event) => onChange("email", event.target.value)}
          />
        </label>
        <label>
          <span>Phone</span>
          <input
            autoComplete="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(event) => onChange("phone", event.target.value)}
          />
        </label>
        <label>
          <span>Username</span>
          <input
            required
            autoComplete="username"
            value={form.username}
            onChange={(event) => onChange("username", event.target.value)}
          />
        </label>
        <label>
          <span>New password</span>
          <input
            autoComplete="new-password"
            placeholder="Leave blank to keep current password"
            type="password"
            value={form.password}
            onChange={(event) => onChange("password", event.target.value)}
          />
        </label>
        <div className="staff-card-actions">
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save personal info"}
          </button>
        </div>
      </form>
    </SettingsSection>
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
  const connected = ["connected", "configured", "ready"].includes(String(value).toLowerCase());
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

function CompanySummaryTable({ loading, rows, onSelectCompany }) {
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
            <tr
              key={row.company}
              tabIndex="0"
              onClick={() => onSelectCompany(row.company)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectCompany(row.company);
                }
              }}
            >
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

function CompactCompanySummaryList({ loading, rows, totalWorkers, onSelectCompany }) {
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
          <button
            className="compact-company-row"
            key={row.company}
            type="button"
            onClick={() => onSelectCompany(row.company)}
          >
            <div className="compact-person">
              <span className="row-mark" />
              <span>
                <strong>{row.company}</strong>
              </span>
            </div>
            <strong>{row.count}</strong>
          </button>
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

function useWorkerSubmissionQueue(worker) {
  const [queuedCount, setQueuedCount] = useState(0);
  const [queueMessage, setQueueMessage] = useState("");
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshQueue = () => {
    setQueuedCount(countQueuedWorkerSubmissions(worker));
  };

  const syncNow = async ({ silent = false } = {}) => {
    if (!worker || syncingRef.current) return;
    refreshQueue();
    if (!isBrowserOnline()) {
      if (!silent) setQueueMessage("Offline. Saved forms will sync when the connection returns.");
      return;
    }

    syncingRef.current = true;
    setSyncing(true);
    if (!silent) setQueueMessage("");
    try {
      const result = await syncQueuedWorkerSubmissions(worker);
      setQueuedCount(result.remaining);
      if (!silent) {
        if (result.synced) {
          setQueueMessage(`${result.synced} saved form${result.synced === 1 ? "" : "s"} synced.`);
        } else if (result.failed) {
          setQueueMessage("Saved forms could not sync yet.");
        } else {
          setQueueMessage("");
        }
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!worker) return undefined;
    refreshQueue();
    syncNow({ silent: true });

    const handleQueueChange = () => refreshQueue();
    const handleOnline = () => syncNow({ silent: true });
    window.addEventListener(WORKER_SUBMISSION_QUEUE_EVENT, handleQueueChange);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener(WORKER_SUBMISSION_QUEUE_EVENT, handleQueueChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [worker?.id]);

  return {
    queuedCount,
    queueMessage,
    refreshQueue,
    syncing,
    syncNow,
  };
}

function useWorkerSession(navigateTo) {
  const [worker, setWorker] = useState(() => readCachedWorkerSession()?.worker || null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/worker-me", { credentials: "include" })
      .then(readApiJson)
      .then((payload) => {
        if (payload.worker) writeCachedWorkerSession(payload.worker);
        if (active) setWorker(payload.worker);
      })
      .catch(() => {
        if (!active) return;
        const cached = readCachedWorkerSession();
        if (!isBrowserOnline() && cached?.worker) {
          setWorker(cached.worker);
          return;
        }
        clearCachedWorkerSession();
        navigateTo("/worker-login");
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

  return { staff, setStaff };
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

function readStaffRosterGroupFromUrl() {
  if (typeof window === "undefined") return "none";
  const group = new URLSearchParams(window.location.search).get("group");
  return group === "company" ? group : "none";
}

function readStaffRosterCompanyFromUrl() {
  if (typeof window === "undefined") return "";
  return String(new URLSearchParams(window.location.search).get("company") || "").trim();
}

function staffNavPath(path) {
  if (!path.startsWith("/staff/sign-ins")) return path;
  const date = readStaffDateFromUrl();
  const url = new URL(path, "https://safetyfirst.local");
  url.searchParams.set("date", date);
  return `${url.pathname}${url.search}`;
}

function readLoginReturnPath(fallback) {
  if (typeof window === "undefined") return fallback;
  return safeAppReturnPath(new URLSearchParams(window.location.search).get("returnTo"), fallback);
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

async function readOptionalSession(path, key) {
  const response = await fetch(path, { credentials: "include" });
  if (response.status === 401) return null;
  const payload = await readApiJson(response);
  return payload?.[key] || null;
}

function staffFormSubmitter(staff) {
  if (!staff) return null;
  return {
    id: `staff-${staff.id}`,
    name: staff.display_name || staff.username || staff.email || "Appia Staff",
    phone: staff.phone || "",
    username: staff.username || staff.email || "staff",
    user_name: staff.username || staff.email || "staff",
    company: "Appia Staff",
  };
}

function isISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
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

function isBrowserOnline() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

function readStorageJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorageJson(key, value, { throwOnError = false } = {}) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    if (throwOnError) throw error;
    return false;
  }
}

function readCachedWorkerSession() {
  const cached = readStorageJson(WORKER_SESSION_CACHE_KEY, null);
  return cached?.worker ? cached : null;
}

function writeCachedWorkerSession(worker) {
  if (!worker?.id) return;
  writeStorageJson(WORKER_SESSION_CACHE_KEY, {
    worker,
    cachedAt: new Date().toISOString(),
  });
}

function clearCachedWorkerSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WORKER_SESSION_CACHE_KEY);
}

function workerDraftKey(worker, formType, submissionMode) {
  return `${worker?.id || "unknown"}:${formType}:${submissionMode}`;
}

function readWorkerFormDraft(worker, formType, submissionMode) {
  if (!worker?.id) return null;
  const drafts = readStorageJson(WORKER_FORM_DRAFTS_KEY, {});
  return drafts[workerDraftKey(worker, formType, submissionMode)] || null;
}

function writeWorkerFormDraft(worker, formType, submissionMode, value) {
  if (!worker?.id) return "";
  const savedAt = new Date().toISOString();
  const drafts = readStorageJson(WORKER_FORM_DRAFTS_KEY, {});
  const saved = writeStorageJson(WORKER_FORM_DRAFTS_KEY, {
    ...drafts,
    [workerDraftKey(worker, formType, submissionMode)]: {
      ...value,
      savedAt,
    },
  });
  return saved ? savedAt : "";
}

function clearWorkerFormDraft(worker, formType, submissionMode) {
  if (!worker?.id) return;
  const key = workerDraftKey(worker, formType, submissionMode);
  const drafts = readStorageJson(WORKER_FORM_DRAFTS_KEY, {});
  if (!drafts[key]) return;
  const nextDrafts = { ...drafts };
  delete nextDrafts[key];
  writeStorageJson(WORKER_FORM_DRAFTS_KEY, nextDrafts);
}

function readWorkerSubmissionQueue() {
  const queue = readStorageJson(WORKER_SUBMISSION_QUEUE_KEY, []);
  return Array.isArray(queue) ? queue : [];
}

function writeWorkerSubmissionQueue(queue) {
  writeStorageJson(WORKER_SUBMISSION_QUEUE_KEY, queue, { throwOnError: true });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WORKER_SUBMISSION_QUEUE_EVENT));
  }
}

function countQueuedWorkerSubmissions(worker) {
  if (!worker?.id) return 0;
  return readWorkerSubmissionQueue().filter((item) => item.workerId === worker.id).length;
}

function queueWorkerSubmission(worker, body) {
  if (!worker?.id) throw new Error("Worker profile is not available for offline save.");
  const queued = {
    id: createLocalQueueId(),
    workerId: worker.id,
    workerName: worker.name,
    company: worker.company,
    formType: body.formType,
    submissionMode: body.submissionMode,
    body,
    queuedAt: new Date().toISOString(),
    submittedDateVancouver: todayInVancouver(),
  };
  try {
    writeWorkerSubmissionQueue([...readWorkerSubmissionQueue(), queued]);
  } catch {
    throw new Error("This device could not save the form locally. Keep this page open and try again.");
  }
  return queued;
}

async function syncQueuedWorkerSubmissions(worker) {
  const queue = readWorkerSubmissionQueue();
  const remaining = [];
  let synced = 0;
  let failed = 0;
  let stopCurrentWorker = false;

  for (const item of queue) {
    if (item.workerId !== worker?.id || stopCurrentWorker) {
      remaining.push(item);
      continue;
    }

    try {
      await readApiJson(
        await fetch("/api/worker/submissions", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(item.body),
        }),
      );
      synced += 1;
    } catch (error) {
      failed += 1;
      remaining.push({
        ...item,
        lastAttemptAt: new Date().toISOString(),
        lastError: error.message,
      });
      if (shouldQueueWorkerSubmission(error)) stopCurrentWorker = true;
    }
  }

  writeWorkerSubmissionQueue(remaining);
  return {
    synced,
    failed,
    remaining: remaining.filter((item) => item.workerId === worker?.id).length,
  };
}

function shouldQueueWorkerSubmission(error) {
  if (!isBrowserOnline()) return true;
  const message = String(error?.message || "");
  return /failed to fetch|networkerror|load failed|network request failed/i.test(message);
}

function createLocalQueueId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isToolboxTalkDraftMeaningful(form, genericSchema, worker) {
  return Boolean(
    hasTextValue(form?.header?.projectName) ||
      hasTextValue(form?.header?.address) ||
      hasTextValue(form?.header?.supervisor) ||
      form?.topics?.selected?.length ||
      hasTextValue(form?.topics?.other) ||
      Object.values(form?.incidentReview || {}).some(hasTextValue) ||
      (form?.safetyConcerns || []).some((row) => Object.values(row).some(hasTextValue)) ||
      (form?.attendance || []).some((row) => hasTextValue(row.name)) ||
      hasTextValue(form?.additionalComments) ||
      Boolean(form?.confirmation?.confirmed) ||
      isTemplateDraftMeaningful(genericSchema, form?.answers || {}, worker),
  );
}

function hasTextValue(value) {
  return Boolean(String(value || "").trim());
}

function staffExportUrl(date, format, type = "people") {
  const params = { date, format };
  if (type === "company") params.type = "company";
  return `/api/staff/signins/export?${new URLSearchParams(params)}`;
}

async function shareStaffExportFile(date, format, type = "people") {
  const normalizedFormat = format === "xml" ? "xml" : "csv";
  const normalizedType = type === "company" ? "company" : "people";
  const response = await fetch(staffExportUrl(date, normalizedFormat, normalizedType), {
    credentials: "include",
  });
  if (!response.ok) {
    throw await digitalExportResponseError(response, "This report could not be exported.");
  }
  let blob = await response.blob();
  if (!blob.size) throw new Error("This report was empty.");
  if (!blob.type) {
    blob = new Blob([blob], {
      type: normalizedFormat === "xml" ? "application/xml" : "text/csv",
    });
  }
  const fileName = fileNameFromContentDisposition(response.headers.get("content-disposition")) ||
    staffExportFileName(date, normalizedFormat, normalizedType);
  await shareOrDownloadBlob(blob, fileName, staffExportTitle(date, normalizedFormat, normalizedType), {
    shareTypes: normalizedFormat === "xml" ? ["text/xml", "text/plain"] : ["text/csv", "text/plain"],
    tryShareWhenCannotShare: normalizedFormat === "xml",
  });
}

function staffExportFileName(date, format, type = "people") {
  const prefix = type === "company" ? "worker-company-summary" : "worker-sign-ins";
  return `${prefix}-${date}.${format}`;
}

function staffExportTitle(date, format, type = "people") {
  const label = type === "company" ? "Worker company summary" : "Worker sign-ins";
  return `${label} ${date}.${format}`;
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

function writeRememberedWorkerProfile(form, options = {}) {
  if (typeof document === "undefined") return;
  const profile = normalizeRememberedWorkerProfile({
    ...form,
    groupMode: options.groupMode ?? form?.groupMode,
    groupNames: options.groupNames ?? form?.groupNames,
  });
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

function normalizeGroupNameEntries(entries) {
  const seen = new Set();
  return entries
    .flatMap((entry) =>
      String(entry || "")
        .split(",")
        .map((name) => name.trim()),
    )
    .filter((name) => {
      const key = normalizeWorkerSignInIdentity(name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeWorkerSignInIdentity(value) {
  return String(value || "").trim().toLowerCase();
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
        signOutToken: String(signIn?.signOutToken || signIn?.sign_out_token || "").trim(),
      }))
      .filter((signIn) => {
        if (!signIn.id || !signIn.signOutToken || seen.has(signIn.id)) return false;
        seen.add(signIn.id);
        return true;
      }),
  };
}

function normalizeRememberedWorkerProfile(profile) {
  const name = String(profile?.name || "").trim();
  const groupMode = Boolean(profile?.groupMode);
  const rememberedGroupNames = groupMode
    ? normalizeGroupNameEntries(
        Array.isArray(profile?.groupNames) && profile.groupNames.length
          ? profile.groupNames
          : [name],
      )
    : [];
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
    name: groupMode && rememberedGroupNames.length ? rememberedGroupNames[0] : name,
    phone: String(profile?.phone || "").trim(),
    companyName: rememberedCompany,
    otherCompanyName: rememberedOtherCompany,
    groupMode,
    groupNames: rememberedGroupNames,
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

function initialToolboxTalkForm(worker) {
  const defaults = readToolboxTalkDefaults();
  const today = todayInVancouver();
  return {
    header: {
      projectName: defaults.projectName || "",
      address: defaults.address || "",
      date: today,
      time: timeInVancouver(),
      presenter: worker?.name || "",
      supervisor: defaults.supervisor || "",
    },
    topics: {
      selected: [],
      other: "",
    },
    incidentReview: {
      firstAidCount: "",
      medicalAidCount: "",
      nearMissReviewed: "",
      nearMissDescription: "",
      lessonsLearned: "",
    },
    safetyConcerns: [{ ...EMPTY_SAFETY_CONCERN }],
    attendance: [{ ...EMPTY_ATTENDEE }],
    additionalComments: "",
    confirmation: {
      name: worker?.name || "",
      date: today,
      confirmed: false,
    },
    answers: {},
  };
}

function readToolboxTalkDefaults() {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(TOOLBOX_TALK_DEFAULTS_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function rememberToolboxTalkDefaults(form) {
  if (typeof window === "undefined") return;
  const defaults = {
    projectName: form.header.projectName.trim(),
    address: form.header.address.trim(),
    supervisor: form.header.supervisor.trim(),
  };
  window.localStorage.setItem(TOOLBOX_TALK_DEFAULTS_KEY, JSON.stringify(defaults));
}

function readToolboxTalkRecents() {
  const value = readStorageJson(TOOLBOX_TALK_RECENTS_KEY, {});
  return {
    topicLabels: Array.isArray(value.topicLabels)
      ? value.topicLabels.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
    attendeeNames: Array.isArray(value.attendeeNames)
      ? value.attendeeNames.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
  };
}

function rememberToolboxTalkRecents(form) {
  const current = readToolboxTalkRecents();
  writeStorageJson(TOOLBOX_TALK_RECENTS_KEY, {
    topicLabels: mergeRecentValues(
      form.topics.selected.map((topic) => topic.label),
      current.topicLabels,
      12,
    ),
    attendeeNames: mergeRecentValues(
      normalizeToolboxAttendanceRows(form.attendance).map((row) => row.name),
      current.attendeeNames,
      40,
    ),
  });
}

function initialSiteInspectionForm(worker) {
  const defaults = readSiteInspectionDefaults();
  return {
    header: {
      project: defaults.project || "",
      address: defaults.address || "",
      areaInspected: "",
      date: todayInVancouver(),
      time: timeInVancouver(),
      inspector: worker?.name || "",
      tradesPresent: defaults.tradesPresent || "",
      reviewer: defaults.reviewer || "",
    },
    observations: {
      positive: "",
      highRiskWork: "",
      immediateControls: "",
      followUpNotes: "",
    },
    noDeficiencies: false,
    deficiencies: [{ ...EMPTY_SITE_DEFICIENCY }],
    answers: {},
  };
}

function readSiteInspectionDefaults() {
  return readStorageJson(SITE_INSPECTION_DEFAULTS_KEY, {});
}

function rememberSiteInspectionDefaults(form) {
  writeStorageJson(SITE_INSPECTION_DEFAULTS_KEY, {
    project: String(form?.header?.project || "").trim(),
    address: String(form?.header?.address || "").trim(),
    tradesPresent: String(form?.header?.tradesPresent || "").trim(),
    reviewer: String(form?.header?.reviewer || "").trim(),
  });
}

function isSiteInspectionDraftMeaningful(form, genericSchema, worker) {
  return Boolean(
    hasTextValue(form?.header?.project) ||
      hasTextValue(form?.header?.address) ||
      hasTextValue(form?.header?.areaInspected) ||
      hasTextValue(form?.header?.tradesPresent) ||
      hasTextValue(form?.header?.reviewer) ||
      siteInspectionObservationsHaveValues(form?.observations) ||
      Boolean(form?.noDeficiencies) ||
      (form?.deficiencies || []).some((row) => Object.values(row).some(hasTextValue)) ||
      isTemplateDraftMeaningful(genericSchema, form?.answers || {}, worker),
  );
}

function siteInspectionObservationsHaveValues(observations) {
  return Object.values(observations || {}).some(hasTextValue);
}

function getSiteInspectionHeaderFieldKey(field) {
  const explicit = getTemplateSettingValue(field?.settings, "siteInspectionHeaderField");
  if (explicit && SITE_INSPECTION_HEADER_FIELD_CONFIGS.some((item) => item.key === explicit)) {
    return explicit;
  }
  const idKey = SITE_INSPECTION_HEADER_FIELD_ALIASES[slugifyTemplateId(field?.id || "")];
  if (idKey) return idKey;
  const labelKey = SITE_INSPECTION_HEADER_FIELD_ALIASES[slugifyTemplateId(field?.label || "")];
  return labelKey || "";
}

function getSiteInspectionObservationFieldKey(field) {
  const explicit = getTemplateSettingValue(field?.settings, "siteInspectionObservationField");
  if (explicit && SITE_INSPECTION_OBSERVATION_FIELD_CONFIGS.some((item) => item.key === explicit)) {
    return explicit;
  }
  const idKey = SITE_INSPECTION_OBSERVATION_FIELD_ALIASES[slugifyTemplateId(field?.id || "")];
  if (idKey) return idKey;
  const labelKey = SITE_INSPECTION_OBSERVATION_FIELD_ALIASES[slugifyTemplateId(field?.label || "")];
  return labelKey || "";
}

function createEmptyActionItemRow() {
  return { ...EMPTY_SITE_DEFICIENCY };
}

function createEmptyActionItemBlock() {
  return { noItems: false, rows: [createEmptyActionItemRow()] };
}

function normalizeActionItemBlockValue(value) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : createEmptyActionItemBlock();
  const rows = Array.isArray(source.rows)
    ? source.rows.map((row) => ({ ...EMPTY_SITE_DEFICIENCY, ...(row || {}) }))
    : [];
  return {
    noItems: Boolean(source.noItems || source.noActionItems || source.noDeficiencies),
    rows: rows.length ? rows : [createEmptyActionItemRow()],
  };
}

function actionItemRowsDefaults(blockType = "action_item_rows") {
  const siteMode = blockType === "site_deficiencies";
  return {
    noneLabel: siteMode ? "No deficiencies found during this inspection." : "No action items needed.",
    rowLabel: siteMode ? "Deficiency" : "Action item",
    addButtonLabel: siteMode ? "Add deficiency" : "Add action item",
  };
}

function defaultActionItemRowFieldLabel(config, blockType = "action_item_rows") {
  return blockType === "site_deficiencies" ? config.siteLabel : config.genericLabel;
}

function normalizeActionItemRowsSettings(settings = {}, blockType = "action_item_rows") {
  const source = getTemplateSettingValue(settings, "actionItemRows");
  const raw = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const defaults = actionItemRowsDefaults(blockType);
  const rawFields = Array.isArray(raw.subfields) ? raw.subfields : Array.isArray(raw.fields) ? raw.fields : [];
  const rawFieldMap = new Map();
  rawFields.forEach((field, index) => {
    const key = String(field?.key || "").trim();
    if (!key || rawFieldMap.has(key)) return;
    rawFieldMap.set(key, { ...field, order: Number.isFinite(Number(field?.order)) ? Number(field.order) : index });
  });
  const subfields = ACTION_ITEM_ROW_FIELD_CONFIGS.map((config, index) => {
    const override = rawFieldMap.get(config.key) || {};
    const label = String(override.label || "").trim() || defaultActionItemRowFieldLabel(config, blockType);
    return {
      key: config.key,
      label,
      input: config.input,
      visible: config.lockedVisible ? true : override.visible !== false,
      lockedVisible: Boolean(config.lockedVisible),
      order: Number.isFinite(Number(override.order)) ? Number(override.order) : index,
    };
  }).sort((a, b) => a.order - b.order);
  return {
    noneLabel: String(raw.noneLabel || "").trim() || defaults.noneLabel,
    rowLabel: String(raw.rowLabel || "").trim() || defaults.rowLabel,
    addButtonLabel: String(raw.addButtonLabel || "").trim() || defaults.addButtonLabel,
    subfields: subfields.map((field, index) => ({ ...field, order: index })),
  };
}

function serializeActionItemRowsSettings(settings) {
  return {
    noneLabel: String(settings?.noneLabel || "").trim(),
    rowLabel: String(settings?.rowLabel || "").trim(),
    addButtonLabel: String(settings?.addButtonLabel || "").trim(),
    subfields: (settings?.subfields || []).map((field, index) => ({
      key: field.key,
      label: String(field.label || "").trim(),
      visible: field.lockedVisible ? true : field.visible !== false,
      order: index,
    })),
  };
}

function visibleActionItemRowFields(settings) {
  return (settings?.subfields || []).filter((field) => field.visible || field.lockedVisible);
}

function toolboxCompositeConfig(blockType) {
  return TOOLBOX_COMPOSITE_BLOCK_CONFIGS[blockType] || null;
}

function normalizeToolboxCompositeSettings(settings = {}, blockType = "") {
  const config = toolboxCompositeConfig(blockType);
  if (!config) return null;
  const source = getTemplateSettingValue(settings, config.settingsKey);
  const raw = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const rawFields = Array.isArray(raw.subfields) ? raw.subfields : Array.isArray(raw.fields) ? raw.fields : [];
  const rawFieldMap = new Map();
  rawFields.forEach((field, index) => {
    const key = String(field?.key || "").trim();
    if (!key || rawFieldMap.has(key)) return;
    rawFieldMap.set(key, { ...field, order: Number.isFinite(Number(field?.order)) ? Number(field.order) : index });
  });
  const subfields = config.fieldConfigs.map((field, index) => {
    const override = rawFieldMap.get(field.key) || {};
    return {
      ...field,
      label: String(override.label || "").trim() || field.label,
      visible: override.visible !== false,
      order: Number.isFinite(Number(override.order)) ? Number(override.order) : index,
    };
  }).sort((a, b) => a.order - b.order);
  return {
    blockType,
    settingsKey: config.settingsKey,
    subfieldsLabel: config.subfieldsLabel,
    openButtonLabel: String(raw.openButtonLabel || "").trim() || config.openButtonLabel,
    hideButtonLabel: String(raw.hideButtonLabel || "").trim() || config.hideButtonLabel,
    addRowButtonLabel: config.addRowButtonLabel
      ? String(raw.addRowButtonLabel || "").trim() || config.addRowButtonLabel
      : "",
    subfields: subfields.map((field, index) => ({ ...field, order: index })),
  };
}

function serializeToolboxCompositeSettings(settings) {
  return {
    openButtonLabel: String(settings?.openButtonLabel || "").trim(),
    hideButtonLabel: String(settings?.hideButtonLabel || "").trim(),
    addRowButtonLabel: String(settings?.addRowButtonLabel || "").trim(),
    subfields: (settings?.subfields || []).map((field, index) => ({
      key: field.key,
      label: String(field.label || "").trim(),
      visible: field.visible !== false,
      order: index,
    })),
  };
}

function visibleToolboxCompositeFields(settings) {
  return (settings?.subfields || []).filter((field) => field.visible !== false);
}

function toolboxCompositeFieldIsVisible(settings, key) {
  return visibleToolboxCompositeFields(settings).some((field) => field.key === key);
}

function actionItemRowHasMeaningfulValue(row) {
  return Object.entries(row || {}).some(([key, value]) => {
    if (key === "priority" && value === "medium") return false;
    return hasTextValue(value);
  });
}

function createDefaultSiteInspectionLayout() {
  const observationSections = SITE_INSPECTION_OBSERVATION_FIELD_CONFIGS.map((field) => ({
    id: field.id,
    title: field.sectionTitle,
    description: "",
    defaultCollapsed: field.defaultCollapsed !== false,
    settings: {},
    fields: [
      {
        ...field,
        helperText: "",
        required: false,
        remember: false,
        default: "",
        settings: {},
      },
    ],
  }));
  return {
    headerFields: SITE_INSPECTION_HEADER_FIELD_CONFIGS.map((field) => ({ ...field })),
    observationSections,
    genericSchema: createGenericTemplateSchemaFromSections({ title: "Site Inspection", sections: [] }, [], "site_inspection"),
    enabledBlocks: ["site_deficiencies"],
    blockLabels: {
      site_deficiencies: "Deficiencies",
    },
    blockSettings: {
      site_deficiencies: {},
    },
    inspectionInfo: {
      title: "Inspection Info",
      description: "",
      settings: {},
    },
    items: [
      { type: "header", id: "site_inspection_header" },
      ...observationSections.slice(0, 3).map((section) => ({
        type: "observation",
        id: `observation.${section.id}`,
        section,
      })),
      { type: "block", id: "block.site_deficiencies", blockType: "site_deficiencies" },
      {
        type: "observation",
        id: `observation.${observationSections[3].id}`,
        section: observationSections[3],
      },
    ],
  };
}

function getSiteInspectionLayout(schema) {
  const normalized = normalizeClientTemplateSchema(schema);
  if (!normalized.sections.length) return createDefaultSiteInspectionLayout();
  const genericSchema = getCustomGenericTemplateSchema(
    normalized,
    isSiteInspectionConsumedTemplateField,
    normalized.formType || "site_inspection",
  );

  const layout = {
    ...createDefaultSiteInspectionLayout(),
    headerFields: [],
    genericSchema,
    observationSections: [],
    enabledBlocks: [],
    blockLabels: {},
    blockSettings: {},
    inspectionInfo: {
      title: "",
      description: "",
      settings: {},
    },
    items: [],
  };
  let headerItemAdded = false;
  const headerKeys = new Set();
  const observationKeys = new Set();

  normalized.sections.forEach((section) => {
    const sectionSettings = normalizeTemplateSettings(section.settings);
    const observationFields = [];

    (section.fields || []).forEach((field) => {
      const headerKey = getSiteInspectionHeaderFieldKey(field);
      if (headerKey) {
        const base = SITE_INSPECTION_HEADER_FIELD_CONFIGS.find((item) => item.key === headerKey);
        if (!base || headerKeys.has(headerKey)) return;
        headerKeys.add(headerKey);
        if (!layout.inspectionInfo.title) {
          layout.inspectionInfo = {
            title: section.title || "Inspection Info",
            description: section.description || "",
            settings: sectionSettings,
          };
        }
        layout.headerFields.push({
          ...base,
          id: field.id || base.id,
          type: field.type || base.type,
          label: field.label || base.label,
          helperText: field.helperText || "",
          required: Boolean(field.required),
          remember: Boolean(field.remember),
          default: field.default || base.default || "",
          key: headerKey,
          sectionTitle: section.title || "Inspection Info",
          sectionDescription: section.description || "",
          settings: normalizeTemplateSettings(field.settings),
        });
        if (!headerItemAdded) {
          layout.items.push({ type: "header", id: "site_inspection_header" });
          headerItemAdded = true;
        }
        return;
      }

      const observationKey = getSiteInspectionObservationFieldKey(field);
      if (observationKey) {
        const base = SITE_INSPECTION_OBSERVATION_FIELD_CONFIGS.find((item) => item.key === observationKey);
        if (!base || observationKeys.has(observationKey)) return;
        observationKeys.add(observationKey);
        observationFields.push({
          ...base,
          id: field.id || base.id,
          type: field.type || base.type,
          label: field.label || base.label,
          helperText: field.helperText || "",
          required: Boolean(field.required),
          remember: Boolean(field.remember),
          default: field.default || "",
          key: observationKey,
          settings: normalizeTemplateSettings(field.settings),
        });
        return;
      }

      if (field.type === "site_deficiencies") {
        if (!layout.enabledBlocks.includes("site_deficiencies")) {
          layout.enabledBlocks.push("site_deficiencies");
          layout.items.push({ type: "block", id: "block.site_deficiencies", blockType: "site_deficiencies" });
        }
        layout.blockLabels.site_deficiencies = field.label || "Deficiencies";
        layout.blockSettings.site_deficiencies = {
          ...sectionSettings,
          ...normalizeTemplateSettings(field.settings),
        };
      }
    });

    if (observationFields.length) {
      const firstField = observationFields[0];
      const sectionDefaultCollapsed = getTemplateSettingValue(sectionSettings, "defaultCollapsed");
      const fieldDefaultCollapsed = getTemplateSettingValue(firstField.settings, "defaultCollapsed");
      const defaultCollapsed =
        sectionDefaultCollapsed ?? fieldDefaultCollapsed ?? firstField.defaultCollapsed ?? true;
      const observationSection = {
        id: section.id || `site_observation_${layout.observationSections.length + 1}`,
        title: section.title || firstField.sectionTitle || "Observations",
        description: section.description || "",
        defaultCollapsed: defaultCollapsed !== false,
        fields: observationFields,
        settings: sectionSettings,
      };
      layout.observationSections.push(observationSection);
      layout.items.push({
        type: "observation",
        id: `observation.${observationSection.id}`,
        section: observationSection,
      });
    }
  });

  if (!layout.items.length) return layout;
  if (!layout.inspectionInfo.title && layout.headerFields.length) {
    layout.inspectionInfo = {
      title: "Inspection Info",
      description: "",
      settings: {},
    };
  }
  return layout;
}

function createInitialSiteInspectionOptionalOpen(form, layout = createDefaultSiteInspectionLayout()) {
  const open = {};
  (layout.observationSections || []).forEach((section) => {
    const fields = Array.isArray(section.fields) ? section.fields : [];
    const hasDraftValue = fields.some((field) => hasTextValue(form?.observations?.[field.key]));
    open[section.id] =
      hasDraftValue ||
      section.defaultCollapsed === false ||
      fields.some((field) => field.required);
  });
  return open;
}

function getSiteInspectionMissingFields(form, layoutOrBlocks = createDefaultSiteInspectionLayout(), worker = null) {
  const layout = layoutOrBlocks || createDefaultSiteInspectionLayout();
  const enabled = new Set(
    Array.isArray(layout.enabledBlocks) ? layout.enabledBlocks : createDefaultSiteInspectionLayout().enabledBlocks,
  );
  const deficiencySettings = normalizeActionItemRowsSettings(
    layout.blockSettings?.site_deficiencies,
    "site_deficiencies",
  );
  const header = form?.header || {};
  const observations = form?.observations || {};
  const deficiencies = Array.isArray(form?.deficiencies) ? form.deficiencies : [];
  const meaningfulDeficiencies = deficiencies
    .map((row) => cleanActionItemRowForSubmit(row, deficiencySettings))
    .filter(actionItemRowHasMeaningfulValue);
  const missing = [];

  (layout.headerFields || []).forEach((field) => {
    if (field.required && !String(header[field.key] || "").trim()) {
      missing.push(`header.${field.key}`);
    }
  });

  (layout.observationSections || []).forEach((section) => {
    (section.fields || []).forEach((field) => {
      if (field.required && !String(observations[field.key] || "").trim()) {
        missing.push(`observations.${field.key}`);
      }
    });
  });

  if (enabled.has("site_deficiencies") && !form?.noDeficiencies && !meaningfulDeficiencies.length) {
    missing.push("deficiencies");
  }

  if (enabled.has("site_deficiencies") && !form?.noDeficiencies) {
    deficiencies.forEach((row, index) => {
      const hasRowValue = actionItemRowHasMeaningfulValue(cleanActionItemRowForSubmit(row, deficiencySettings));
      if (hasRowValue && !String(row?.description || "").trim()) {
        missing.push(`deficiencies.${index}.description`);
      }
    });
  }

  if (layout.genericSchema?.sections?.length) {
    missing.push(...getTemplateMissingFields(layout.genericSchema, form?.answers || {}, worker));
  }

  return missing;
}

function siteInspectionValidationMessage(field, layout = createDefaultSiteInspectionLayout()) {
  if (layout?.genericSchema?.sections?.length) {
    const genericMessage = templateValidationMessage(layout.genericSchema, field);
    if (genericMessage !== "Complete the required field.") return genericMessage;
  }
  if (field?.startsWith("header.")) {
    const key = field.replace("header.", "");
    const headerField = (layout.headerFields || []).find((item) => item.key === key)
      || SITE_INSPECTION_HEADER_FIELD_CONFIGS.find((item) => item.key === key);
    return `${headerField?.label || "This field"} is required.`;
  }
  if (field?.startsWith("observations.")) {
    const key = field.replace("observations.", "");
    const observationField = (layout.observationSections || [])
      .flatMap((section) => section.fields || [])
      .find((item) => item.key === key)
      || SITE_INSPECTION_OBSERVATION_FIELD_CONFIGS.find((item) => item.key === key);
    return `${observationField?.label || "This field"} is required.`;
  }
  if (field === "deficiencies") return "Add a deficiency or mark no deficiencies found.";
  if (field?.startsWith("deficiencies.")) return "Deficiency / hazard description is required.";
  return "Complete the required fields.";
}

function cleanSiteInspectionClientForm(
  form,
  layout = createDefaultSiteInspectionLayout(),
  genericSchema = createGenericTemplateSchemaFromSections({ sections: [] }, [], "site_inspection"),
  worker = null,
) {
  const deficiencySettings = normalizeActionItemRowsSettings(
    layout.blockSettings?.site_deficiencies,
    "site_deficiencies",
  );
  return {
    kind: "site_inspection_v1",
    version: 1,
    header: cleanObjectStrings(form.header),
    observations: cleanObjectStrings(form.observations),
    noDeficiencies: Boolean(form.noDeficiencies),
    deficiencies: form.noDeficiencies
      ? []
      : form.deficiencies
          .map((row) => cleanActionItemRowForSubmit(row, deficiencySettings))
          .filter(actionItemRowHasMeaningfulValue),
    answers: cleanTemplateAnswersForSubmit(genericSchema, form.answers || {}, worker),
    actionItemBlocks: cleanActionItemBlocksForSubmit(genericSchema, form.answers || {}, worker),
  };
}

function mergeRecentValues(nextValues, currentValues, limit) {
  const seen = new Set();
  return [...nextValues, ...currentValues]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function splitToolboxAttendeeNames(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || "").split(/[,\n]+/);
  const seen = new Set();
  return values
    .map((name) => String(name || "").trim())
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeToolboxAttendanceRows(rows) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : [])
    .flatMap((row) => splitToolboxAttendeeNames(row?.name))
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((name) => ({ name }));
}

function addAttendeeNameToToolboxForm(form, name) {
  const names = splitToolboxAttendeeNames(name);
  if (!names.length) return form;
  const attendance = (Array.isArray(form.attendance) ? form.attendance : [])
    .flatMap((row) => splitToolboxAttendeeNames(row?.name))
    .map((value) => ({ name: value }));
  const existing = new Set(attendance.map((row) => row.name.toLowerCase()));
  const nextNames = names.filter((value) => !existing.has(value.toLowerCase()));
  if (!nextNames.length && attendance.length === (Array.isArray(form.attendance) ? form.attendance.length : 0)) {
    return form;
  }
  return {
    ...form,
    attendance: normalizeToolboxAttendanceRows([
      ...attendance,
      ...nextNames.map((value) => ({ name: value })),
    ]),
  };
}

function validateToolboxTalkForm(form) {
  const missingFields = getToolboxTalkMissingFields(form);
  return missingFields.length ? toolboxValidationMessage(missingFields[0]) : "";
}

function getToolboxTalkHeaderFieldKey(field) {
  const explicit = getTemplateSettingValue(field?.settings, "toolboxHeaderField");
  if (explicit && TOOLBOX_TALK_HEADER_FIELD_CONFIGS.some((item) => item.key === explicit)) {
    return explicit;
  }
  const idKey = TOOLBOX_TALK_HEADER_FIELD_ALIASES[slugifyTemplateId(field?.id || "")];
  if (idKey) return idKey;
  const labelKey = TOOLBOX_TALK_HEADER_FIELD_ALIASES[slugifyTemplateId(field?.label || "")];
  return labelKey || "";
}

function createDefaultToolboxTalkLayout() {
  return {
    headerFields: TOOLBOX_TALK_HEADER_FIELD_CONFIGS.map((field) => ({ ...field })),
    genericSchema: createGenericTemplateSchemaFromSections({ title: "Toolbox Talk", sections: [] }, [], "toolbox_talk"),
    enabledBlocks: TOOLBOX_TALK_SPECIAL_BLOCK_ORDER.filter((type) => type !== "toolbox_meeting_info"),
    blockLabels: {
      toolbox_topics: "Topics Discussed",
      toolbox_incident_review: "Review Notes",
      toolbox_safety_concerns: "Safety Concerns",
      toolbox_attendance: "Attendance",
      toolbox_final_confirmation: "Final Check",
    },
    blockSettings: {
      toolbox_topics: getToolboxTopicSettings(),
      toolbox_incident_review: { defaultCollapsed: true },
      toolbox_safety_concerns: { defaultCollapsed: true },
      toolbox_attendance: {},
      toolbox_final_confirmation: {},
    },
    meetingInfo: {
      title: "Meeting Info",
      description: "",
      settings: {},
    },
  };
}

function getToolboxTopicSettings(settings = {}) {
  const enabledCategorySetting = getTemplateSettingValue(settings, "enabledCategoryIds");
  const commonTopicSetting = getTemplateSettingValue(settings, "commonTopicLabels");
  const hasExplicitCategorySetting = Array.isArray(enabledCategorySetting);
  const hasExplicitCommonTopicSetting = Array.isArray(commonTopicSetting);
  const enabledCategoryIds = hasExplicitCategorySetting
    ? enabledCategorySetting.filter((id) => TOOLBOX_TALK_TOPIC_GROUP_IDS.includes(id))
    : TOOLBOX_TALK_TOPIC_GROUP_IDS;
  const commonTopicLabels = hasExplicitCommonTopicSetting
    ? commonTopicSetting
        .map((label) => String(label || "").trim())
        .filter(Boolean)
        .filter((label, index, labels) => labels.indexOf(label) === index)
    : TOOLBOX_TALK_QUICK_TOPIC_LABELS;
  return {
    showCommon: getTemplateSettingValue(settings, "showCommon") !== false,
    showSearch: getTemplateSettingValue(settings, "showSearch") !== false,
    enabledCategoryIds: hasExplicitCategorySetting ? enabledCategoryIds : TOOLBOX_TALK_TOPIC_GROUP_IDS,
    commonTopicLabels: hasExplicitCommonTopicSetting ? commonTopicLabels : TOOLBOX_TALK_QUICK_TOPIC_LABELS,
  };
}

function getToolboxTalkLayout(schema) {
  const normalized = normalizeClientTemplateSchema(schema);
  if (!normalized.sections.length) return createDefaultToolboxTalkLayout();
  const genericSchema = getCustomGenericTemplateSchema(
    normalized,
    isToolboxTalkConsumedTemplateField,
    "toolbox_talk",
  );

  const layout = {
    ...createDefaultToolboxTalkLayout(),
    headerFields: [],
    genericSchema,
    enabledBlocks: [],
    blockLabels: {},
    blockSettings: {},
    meetingInfo: {
      title: "",
      description: "",
      settings: {},
    },
  };

  normalized.sections.forEach((section) => {
    (section.fields || []).forEach((field) => {
      if (field.type === "toolbox_meeting_info") {
        if (!layout.meetingInfo.title) {
          layout.meetingInfo = {
            title: section.title || field.label || "Meeting Info",
            description: section.description || field.helperText || "",
            settings: { ...normalizeTemplateSettings(section.settings), ...normalizeTemplateSettings(field.settings) },
          };
        }
        TOOLBOX_TALK_HEADER_FIELD_CONFIGS.forEach((base) => {
          if (!layout.headerFields.some((item) => item.key === base.key)) {
            layout.headerFields.push({
              ...base,
              sectionTitle: section.title || "Meeting Info",
              sectionDescription: section.description || "",
            });
          }
        });
        return;
      }

      const headerKey = getToolboxTalkHeaderFieldKey(field);
      if (headerKey) {
        const base = TOOLBOX_TALK_HEADER_FIELD_CONFIGS.find((item) => item.key === headerKey);
        if (!base) return;
        if (!layout.meetingInfo.title) {
          layout.meetingInfo = {
            title: section.title || "Meeting Info",
            description: section.description || "",
            settings: normalizeTemplateSettings(section.settings),
          };
        }
        layout.headerFields.push({
          ...base,
          id: field.id || base.id,
          type: field.type || base.type,
          label: field.label || base.label,
          helperText: field.helperText || "",
          required: Boolean(field.required),
          remember: Boolean(field.remember),
          default: field.default || base.default || "",
          key: headerKey,
          sectionTitle: section.title || "Meeting Info",
          sectionDescription: section.description || "",
          settings: normalizeTemplateSettings(field.settings),
        });
        return;
      }

      if (TEMPLATE_SPECIAL_BLOCK_TYPES.has(field.type)) {
        if (!layout.enabledBlocks.includes(field.type)) layout.enabledBlocks.push(field.type);
        layout.blockLabels[field.type] = field.label || templateFieldTypeLabel(field.type);
        layout.blockSettings[field.type] = {
          ...normalizeTemplateSettings(section.settings),
          ...normalizeTemplateSettings(field.settings),
        };
      }
    });
  });

  layout.headerFields = layout.headerFields.filter(
    (field, index, fields) => fields.findIndex((item) => item.key === field.key) === index,
  );
  const topicBlockSettings = layout.blockSettings.toolbox_topics || {};
  layout.blockSettings.toolbox_topics = {
    ...topicBlockSettings,
    ...getToolboxTopicSettings(topicBlockSettings),
  };
  const incidentSettings = layout.blockSettings.toolbox_incident_review || {};
  layout.blockSettings.toolbox_incident_review = {
    ...incidentSettings,
    defaultCollapsed: getTemplateSettingValue(incidentSettings, "defaultCollapsed") !== false,
  };
  const concernSettings = layout.blockSettings.toolbox_safety_concerns || {};
  layout.blockSettings.toolbox_safety_concerns = {
    ...concernSettings,
    defaultCollapsed: getTemplateSettingValue(concernSettings, "defaultCollapsed") !== false,
  };
  return layout;
}

function getToolboxTalkEnabledBlocks(schema) {
  return getToolboxTalkLayout(schema).enabledBlocks;
}

function isToolboxTalkTemplateSchema(schema, template = {}) {
  const normalized = normalizeClientTemplateSchema(schema);
  if (normalized.formType === "toolbox_talk" || template?.form_type === "toolbox_talk") return true;

  const templateSignal = slugifyTemplateId(
    [
      normalized.formType,
      normalized.title,
      template?.form_type,
      template?.label,
    ].filter(Boolean).join(" "),
  );
  if (templateSignal.includes("toolbox_talk")) return true;

  const toolboxBlocks = collectClientTemplateFields(normalized).filter((field) =>
    TOOLBOX_TALK_SPECIAL_BLOCK_ORDER.includes(field.type),
  );
  const hasCoreToolboxBlock = toolboxBlocks.some((field) =>
    ["toolbox_topics", "toolbox_attendance", "toolbox_final_confirmation"].includes(field.type),
  );
  return toolboxBlocks.length >= 2 && hasCoreToolboxBlock;
}

function isSiteInspectionTemplateSchema(schema, template = {}) {
  const normalized = normalizeClientTemplateSchema(schema);
  if (normalized.formType === "site_inspection" || template?.form_type === "site_inspection") return true;

  const fields = collectClientTemplateFields(normalized);
  return fields.some((field) =>
    field.type === "site_deficiencies" ||
    Boolean(getTemplateSettingValue(field.settings, "siteInspectionHeaderField")) ||
    Boolean(getTemplateSettingValue(field.settings, "siteInspectionObservationField")),
  );
}

function isToolboxTalkConsumedTemplateField(field) {
  if (!field) return false;
  if (field.type === "toolbox_meeting_info") return true;
  if (TOOLBOX_TALK_SPECIAL_BLOCK_ORDER.includes(field.type)) return true;
  return Boolean(getToolboxTalkHeaderFieldKey(field));
}

function isSiteInspectionConsumedTemplateField(field) {
  if (!field) return false;
  if (field.type === "site_deficiencies") return true;
  return Boolean(getSiteInspectionHeaderFieldKey(field) || getSiteInspectionObservationFieldKey(field));
}

function createGenericTemplateSchemaFromSections(baseSchema, sections, formType = "") {
  const normalized = normalizeClientTemplateSchema(baseSchema);
  return {
    ...normalized,
    formType: formType || normalized.formType,
    sections: (sections || []).filter((section) => (section.fields || []).length),
  };
}

function getCustomGenericTemplateSchema(schema, consumedFieldPredicate, formType = "") {
  const normalized = normalizeClientTemplateSchema(schema);
  const sections = (normalized.sections || [])
    .map((section) => ({
      ...section,
      fields: (section.fields || []).filter((field) => !consumedFieldPredicate(field)),
    }))
    .filter((section) => section.fields.length);
  return createGenericTemplateSchemaFromSections(normalized, sections, formType || normalized.formType);
}

function getToolboxTalkMissingFields(
  form,
  pendingAttendeeName = "",
  layoutOrBlocks = TOOLBOX_TALK_SPECIAL_BLOCK_ORDER,
  worker = null,
) {
  const layout = Array.isArray(layoutOrBlocks)
    ? {
        enabledBlocks: layoutOrBlocks.length ? layoutOrBlocks : TOOLBOX_TALK_SPECIAL_BLOCK_ORDER,
        headerFields: layoutOrBlocks.includes("toolbox_meeting_info")
          ? TOOLBOX_TALK_HEADER_FIELD_CONFIGS
          : [],
      }
    : layoutOrBlocks || createDefaultToolboxTalkLayout();
  const enabled = new Set(Array.isArray(layout.enabledBlocks) ? layout.enabledBlocks : TOOLBOX_TALK_SPECIAL_BLOCK_ORDER);
  const header = form?.header || {};
  const confirmation = form?.confirmation || {};
  const topics = form?.topics || {};
  const attendance = normalizeToolboxAttendanceRows(form?.attendance);
  const missing = [];

  const headerFields = Array.isArray(layout.headerFields) ? layout.headerFields : [];
  if (headerFields.length) {
    headerFields.forEach((field) => {
      if (field.required && !String(header[field.key] || "").trim()) {
        missing.push(`header.${field.key}`);
      }
    });
  } else if (enabled.has("toolbox_meeting_info")) {
    TOOLBOX_TALK_HEADER_FIELD_CONFIGS.forEach((field) => {
      if (!String(header[field.key] || "").trim()) missing.push(`header.${field.key}`);
    });
  }

  if (
    enabled.has("toolbox_topics") &&
    !topics.selected?.length &&
    !String(topics.other || "").trim()
  ) {
    missing.push("topics");
  }

  const hasAttendance = attendance.some((row) => String(row?.name || "").trim())
    || Boolean(String(pendingAttendeeName || "").trim());
  if (enabled.has("toolbox_attendance") && !hasAttendance) {
    missing.push("attendance");
  }

  if (enabled.has("toolbox_final_confirmation")) {
    if (!String(confirmation.name || "").trim()) {
      missing.push("confirmation.name");
    }
    if (!String(confirmation.date || "").trim()) {
      missing.push("confirmation.date");
    }
    if (!confirmation.confirmed) {
      missing.push("confirmation.confirmed");
    }
  }

  if (layout.genericSchema?.sections?.length) {
    missing.push(...getTemplateMissingFields(layout.genericSchema, form?.answers || {}, worker));
  }

  return missing;
}

function toolboxValidationMessage(field, layout = null) {
  if (layout?.genericSchema?.sections?.length) {
    const genericMessage = templateValidationMessage(layout.genericSchema, field);
    if (genericMessage !== "Complete the required field.") return genericMessage;
  }
  const messages = {
    "header.projectName": "Project Name is required.",
    "header.address": "Address is required.",
    "header.date": "Date is required.",
    "header.time": "Time is required.",
    "header.presenter": "Presenter is required.",
    "header.supervisor": "Supervisor is required.",
    topics: "Select at least one topic or enter an additional topic.",
    attendance: "Add at least one attendee.",
    "confirmation.name": "Presenter / Supervisor name is required.",
    "confirmation.date": "Confirmation date is required.",
    "confirmation.confirmed": "Confirm that the listed workers participated.",
  };
  return messages[field] || "Complete the required fields.";
}

function scrollToToolboxValidationTarget(targets, field) {
  const fieldKey = String(field || "");
  const baseFieldKey = fieldKey.split(".")[0];
  const sectionTarget =
    targets?.[`${fieldKey}:section`] ||
    (baseFieldKey && baseFieldKey !== fieldKey ? targets?.[`${baseFieldKey}:section`] : null);
  const fieldTarget =
    targets?.[fieldKey] ||
    (baseFieldKey && baseFieldKey !== fieldKey ? targets?.[baseFieldKey] : null);
  const target = sectionTarget || fieldTarget;
  if (!target) return;
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusTarget = getFocusableValidationTarget(fieldTarget || target);
    if (focusTarget) {
      focusTarget.focus({ preventScroll: true });
    }
  });
}

function getFocusableValidationTarget(target) {
  if (!target) return null;
  const selector = "input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])";
  if (typeof target.focus === "function" && target.matches?.(selector)) {
    return target;
  }
  return target.querySelector?.(`[aria-invalid="true"], ${selector}`) || null;
}

function cleanToolboxIncidentReviewForSubmit(incidentReview, settings) {
  const source = incidentReview || {};
  const visible = new Set(visibleToolboxCompositeFields(settings).map((field) => field.key));
  const cleaned = TOOLBOX_INCIDENT_REVIEW_FIELD_CONFIGS.reduce((next, field) => {
    next[field.key] = visible.has(field.key) ? String(source[field.key] || "").trim() : "";
    return next;
  }, {});
  if (!visible.has("nearMissReviewed") || cleaned.nearMissReviewed !== "yes") {
    cleaned.nearMissDescription = "";
  }
  return cleaned;
}

function cleanToolboxSafetyConcernForSubmit(row, settings) {
  const source = row || {};
  const visible = new Set(visibleToolboxCompositeFields(settings).map((field) => field.key));
  return TOOLBOX_SAFETY_CONCERN_FIELD_CONFIGS.reduce((next, field) => {
    next[field.key] = visible.has(field.key) ? String(source[field.key] || "").trim() : "";
    return next;
  }, {});
}

function cleanToolboxTalkClientForm(
  form,
  genericSchema = createGenericTemplateSchemaFromSections({ sections: [] }, [], "toolbox_talk"),
  worker = null,
  layout = createDefaultToolboxTalkLayout(),
) {
  const incidentReviewSettings = normalizeToolboxCompositeSettings(
    layout.blockSettings?.toolbox_incident_review,
    "toolbox_incident_review",
  );
  const safetyConcernSettings = normalizeToolboxCompositeSettings(
    layout.blockSettings?.toolbox_safety_concerns,
    "toolbox_safety_concerns",
  );
  return {
    kind: "toolbox_talk_v1",
    version: 1,
    header: cleanObjectStrings(form.header),
    topics: {
      selected: form.topics.selected,
      other: form.topics.other.trim(),
    },
    incidentReview: cleanToolboxIncidentReviewForSubmit(form.incidentReview, incidentReviewSettings),
    safetyConcerns: form.safetyConcerns
      .map((row) => cleanToolboxSafetyConcernForSubmit(row, safetyConcernSettings))
      .filter((row) => row.concern || row.actionToTake || row.dateTaken),
    attendance: normalizeToolboxAttendanceRows(form.attendance),
    additionalComments: form.additionalComments.trim(),
    confirmation: {
      name: form.confirmation.name.trim(),
      date: form.confirmation.date,
      confirmed: Boolean(form.confirmation.confirmed),
    },
    answers: cleanTemplateAnswersForSubmit(genericSchema, form.answers || {}, worker),
    actionItemBlocks: cleanActionItemBlocksForSubmit(genericSchema, form.answers || {}, worker),
  };
}

function getEnabledToolboxTopicGroups(enabledCategoryIds = TOOLBOX_TALK_TOPIC_GROUP_IDS) {
  const ids = Array.isArray(enabledCategoryIds)
    ? enabledCategoryIds
    : TOOLBOX_TALK_TOPIC_GROUP_IDS;
  const enabled = new Set(ids);
  return TOOLBOX_TALK_TOPIC_GROUPS.filter((group) => enabled.has(group.id));
}

function splitToolboxTopicLabels(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || "").split(/\n|,/);
  const seen = new Set();
  return values
    .map((label) => String(label || "").trim())
    .filter(Boolean)
    .filter((label) => {
      const key = label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function filterToolboxTopicGroups(search, enabledCategoryIds = TOOLBOX_TALK_TOPIC_GROUP_IDS) {
  const query = String(search || "").trim().toLowerCase();
  const groups = getEnabledToolboxTopicGroups(enabledCategoryIds);
  if (!query) return groups;
  return groups.map((group) => {
    const groupMatches = group.label.toLowerCase().includes(query);
    const topics = groupMatches
      ? group.topics
      : group.topics.filter((label) => label.toLowerCase().includes(query));
    return topics.length ? { ...group, topics } : null;
  }).filter(Boolean);
}

function findToolboxTopic(label, enabledCategoryIds = TOOLBOX_TALK_TOPIC_GROUP_IDS) {
  const query = String(label || "").trim().toLowerCase();
  if (!query) return null;
  for (const group of getEnabledToolboxTopicGroups(enabledCategoryIds)) {
    const topicLabel = group.topics.find((topic) => topic.toLowerCase() === query);
    if (topicLabel) return { group, label: topicLabel };
  }
  return null;
}

function createToolboxTopic(group, label) {
  return {
    categoryId: group.id,
    categoryLabel: group.label,
    topicId: slugifyTopic(label),
    label,
  };
}

function toolboxIncidentHasValues(incidentReview) {
  return Object.values(incidentReview || {}).some(hasTextValue);
}

function toolboxConcernsHaveValues(rows) {
  return (rows || []).some((row) => Object.values(row).some(hasTextValue));
}

function cleanObjectStrings(object) {
  return Object.fromEntries(
    Object.entries(object || {}).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  );
}

function topicKey(topic) {
  return `${topic.categoryId}:${topic.topicId}`;
}

function cloneTemplateSchema(schema) {
  return normalizeClientTemplateSchema(schema ? JSON.parse(JSON.stringify(schema)) : null);
}

function normalizeTemplateSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  try {
    return JSON.parse(JSON.stringify(settings));
  } catch {
    return {};
  }
}

function getTemplateSettingValue(settings, key) {
  const source = normalizeTemplateSettings(settings);
  if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
  const normalizedKey = slugifyTemplateId(key);
  if (normalizedKey && Object.prototype.hasOwnProperty.call(source, normalizedKey)) {
    return source[normalizedKey];
  }
  return undefined;
}

function normalizeTemplateLayoutWidth(settings = {}) {
  const source = getTemplateSettingValue(settings, "layout");
  const layout = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const value = String(layout.width || getTemplateSettingValue(settings, "width") || "").trim();
  return TEMPLATE_LAYOUT_WIDTH_OPTIONS.some((option) => option.id === value) ? value : "";
}

function templateLayoutWidthClass(block) {
  const width = normalizeTemplateLayoutWidth(block?.settings);
  return width ? `template-width-${width}` : "";
}

function templateRuntimeSectionClassName(sectionId, block, ...classes) {
  return [
    "toolbox-section",
    sectionId ? `template-section-${slugifyTemplateId(sectionId)}` : "",
    templateLayoutWidthClass(block),
    ...classes,
  ].filter(Boolean).join(" ");
}

function normalizeTemplateChoiceDisplay(field) {
  const value = String(getTemplateSettingValue(field?.settings, "choiceDisplay") || "").trim();
  if (field?.type === "dropdown") {
    return TEMPLATE_DROPDOWN_DISPLAY_OPTIONS.some((option) => option.id === value) ? value : "dropdown";
  }
  if (field?.type === "multi_select") {
    return TEMPLATE_MULTI_SELECT_DISPLAY_OPTIONS.some((option) => option.id === value) ? value : "chips";
  }
  return "";
}

function normalizeTemplateInstructionStyle(field) {
  const value = String(getTemplateSettingValue(field?.settings, "instructionStyle") || "").trim();
  return TEMPLATE_INSTRUCTION_STYLE_OPTIONS.some((option) => option.id === value) ? value : "plain";
}

function templateInstructionStyleClass(field) {
  return `template-instructions-${normalizeTemplateInstructionStyle(field)}`;
}

function normalizeTemplateNumberMode(field) {
  const value = String(getTemplateSettingValue(field?.settings, "numberMode") || "").trim();
  return TEMPLATE_NUMBER_MODE_OPTIONS.some((option) => option.id === value) ? value : "decimal";
}

function isPhoneLikeTemplateField(field) {
  if (!["short_text", "number"].includes(field?.type)) return false;
  const signal = [
    field.id,
    field.label,
    field.default,
    getTemplateSettingValue(field.settings, "defaultValue"),
  ].filter(Boolean).join(" ").toLowerCase();
  return /(^|[^a-z])(phone|telephone|mobile|cell|tel)([^a-z]|$)/.test(signal) ||
    signal.includes("worker_phone");
}

function templateSupportsStaticDefault(field) {
  return ["short_text", "long_text", "number", "date", "time", "yes_no", "dropdown"].includes(field?.type);
}

function templateStaticDefaultValue(field) {
  const value = getTemplateSettingValue(field?.settings, "defaultValue");
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
  if (field?.type === "dropdown") {
    return (field.options || []).includes(text) ? text : "";
  }
  return text;
}

function normalizeTemplateOptionPreset(field) {
  const value = String(getTemplateSettingValue(field?.settings, "optionPreset") || "").trim();
  return TEMPLATE_OPTION_PRESETS.some((preset) => preset.id === value) ? value : "";
}

function normalizeTemplateVisibilitySettings(settings = {}) {
  const source = getTemplateSettingValue(settings, "visibility");
  const raw = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const sourceFieldId = slugifyTemplateId(raw.sourceFieldId || raw.fieldId || raw.source || "");
  const operator = TEMPLATE_VISIBILITY_OPERATORS.some((item) => item.id === raw.operator)
    ? raw.operator
    : "equals";
  let value = raw.value;
  if (Array.isArray(value)) value = value[0] ?? "";
  if (value === null || value === undefined) value = "";
  return {
    enabled: Boolean(raw.enabled && sourceFieldId),
    sourceFieldId,
    operator,
    value: typeof value === "boolean" ? value : String(value),
  };
}

function serializeTemplateVisibilitySettings(visibility = {}) {
  const normalized = normalizeTemplateVisibilitySettings({ visibility });
  return normalized.enabled
    ? normalized
    : { enabled: false, sourceFieldId: "", operator: "equals", value: "" };
}

function templateFieldIsHidden(field) {
  return getTemplateSettingValue(field?.settings, "hidden") === true;
}

function normalizeMediaUploadSettings(settings = {}) {
  const source = getTemplateSettingValue(settings, "mediaUpload");
  const raw = source && typeof source === "object" && !Array.isArray(source) ? source : {};
  const acceptedKinds = Array.isArray(raw.acceptedKinds)
    ? raw.acceptedKinds.filter((kind) => MEDIA_UPLOAD_KIND_CONFIGS[kind])
    : [];
  return {
    acceptedKinds: acceptedKinds.length ? [...new Set(acceptedKinds)] : DEFAULT_MEDIA_UPLOAD_KINDS,
  };
}

function serializeMediaUploadSettings(settings = {}) {
  const normalized = normalizeMediaUploadSettings(settings);
  return { acceptedKinds: normalized.acceptedKinds };
}

function mediaUploadAcceptedKinds(field) {
  return normalizeMediaUploadSettings(field?.settings).acceptedKinds;
}

function mediaUploadAccept(field) {
  return mediaUploadAcceptedKinds(field)
    .flatMap((kind) => [
      ...MEDIA_UPLOAD_KIND_CONFIGS[kind].mimeTypes,
      ...MEDIA_UPLOAD_KIND_CONFIGS[kind].extensions,
    ])
    .join(",");
}

function mediaUploadAllowedExtensions(field) {
  return new Set(mediaUploadAcceptedKinds(field).flatMap((kind) => MEDIA_UPLOAD_KIND_CONFIGS[kind].extensions));
}

function mediaUploadAllowedMimeTypes(field) {
  return new Set(mediaUploadAcceptedKinds(field).flatMap((kind) => MEDIA_UPLOAD_KIND_CONFIGS[kind].mimeTypes));
}

function mediaUploadAcceptedKindsLabel(field) {
  return mediaUploadAcceptedKinds(field)
    .map((kind) => MEDIA_UPLOAD_KIND_CONFIGS[kind].helper)
    .join(", ");
}

function templateVisibilitySourceFields(schema, excludeFieldId = "") {
  return collectClientTemplateFields(schema)
    .filter((field) => TEMPLATE_VISIBILITY_SOURCE_TYPES.has(field.type))
    .filter((field) => field.id !== excludeFieldId)
    .filter((field) => !isTemplateNonAnswerField(field) && !templateFieldIsHidden(field));
}

function templateVisibilitySourceValueOptions(field) {
  if (!field) return [];
  if (field.type === "yes_no") return [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];
  if (["boolean", "toggle", "checkbox"].includes(field.type)) return [
    { value: true, label: "Checked / On / Yes" },
    { value: false, label: "Unchecked / Off / No" },
  ];
  return (field.options || []).map((option) => ({ value: option, label: option }));
}

function normalizeTemplateVisibilityValueForField(field, value) {
  if (["boolean", "toggle", "checkbox"].includes(field?.type)) {
    if (value === true || value === false) return value;
    const text = String(value || "").trim().toLowerCase();
    return ["true", "yes", "1", "on"].includes(text);
  }
  return String(value ?? "");
}

function templateBlockConditionIsVisible(block, schema, answers = {}, worker = null) {
  const visibility = normalizeTemplateVisibilitySettings(block?.settings);
  if (!visibility.enabled) return true;
  const sourceField = collectClientTemplateFields(schema).find((field) => field.id === visibility.sourceFieldId);
  if (!sourceField) return true;
  const rawValue = answers?.[sourceField.id] ?? templateFieldDefaultValue(sourceField, worker, schema);
  const expected = normalizeTemplateVisibilityValueForField(sourceField, visibility.value);
  if (Array.isArray(rawValue)) {
    const actualValues = rawValue.map((item) => String(item));
    const expectedText = String(expected);
    const includes = actualValues.includes(expectedText);
    return visibility.operator === "not_contains" || visibility.operator === "not_equals" ? !includes : includes;
  }
  const actual = normalizeTemplateVisibilityValueForField(sourceField, rawValue);
  const matches = actual === expected;
  if (visibility.operator === "not_equals" || visibility.operator === "not_contains") return !matches;
  return matches;
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

function ensureTemplateSchemaHasStarterQuestion(schema) {
  const current = cloneTemplateSchema(schema);
  if (collectClientTemplateFields(current).length > 0) return current;
  const section = createTemplateSection(1, { title: "" });
  section.fields = [createTemplateField(1, "short_text", { label: "" })];
  return { ...current, sections: [section] };
}

function createDefaultTemplateSchema() {
  return {
    schemaVersion: 1,
    title: "Untitled form",
    description: "",
    sections: [],
  };
}

function createTemplateSection(index, { description = "", settings = {}, title, withField = false } = {}) {
  return {
    id: `section_${index}`,
    title: title === undefined ? `Section ${index}` : title,
    description,
    settings: normalizeTemplateSettings(settings),
    fields: withField ? [createTemplateField(1)] : [],
  };
}

function createTemplateField(index, type = "short_text", overrides = {}) {
  const labels = {
    instructions: "Instructions",
    short_text: "Short answer question",
    long_text: "Long answer question",
    number: "Number question",
    date: "Date",
    time: "Time",
    yes_no: "Yes / No question",
    boolean: "Boolean question",
    toggle: "Toggle setting",
    media_upload: "Media upload",
    asset_picker: "Select asset",
    dropdown: "Dropdown question",
    multi_select: "Multi-select question",
    checkbox: "Confirmation statement",
    signature: "Signature",
    toolbox_meeting_info: "Meeting Info",
    toolbox_topics: "Topics Discussed",
    toolbox_incident_review: "Incident / Review",
    toolbox_safety_concerns: "Safety Concerns",
    toolbox_attendance: "Attendance",
    toolbox_final_confirmation: "Final Confirmation",
    site_deficiencies: "Deficiencies",
    action_item_rows: "Action item rows",
  };
  return normalizeTemplateField({
    id: `field_${Date.now()}_${index}`,
    type,
    label: labels[type] || `Question ${index}`,
    required: false,
    options: TEMPLATE_OPTION_FIELD_TYPES.has(type) ? ["Option 1", "Option 2"] : [],
    ...overrides,
  });
}

function normalizeClientTemplateSchema(schema) {
  const source = schema && typeof schema === "object" && !Array.isArray(schema)
    ? schema
    : createDefaultTemplateSchema();
  const sections = Array.isArray(source.sections) ? source.sections : [];
  const normalizedSections = sections.map((section, sectionIndex) => ({
    id: slugifyTemplateId(section?.id) || `section_${sectionIndex + 1}`,
    title: section && Object.prototype.hasOwnProperty.call(section, "title")
      ? String(section.title || "")
      : `Section ${sectionIndex + 1}`,
    description: String(section?.description || ""),
    settings: normalizeTemplateSettings(section?.settings),
    fields: (Array.isArray(section?.fields) ? section.fields : [])
      .map((field, fieldIndex) => normalizeTemplateField(field, sectionIndex, fieldIndex))
      .filter(Boolean),
  }));
  return {
    schemaVersion: 1,
    formType: String(source.formType || source.form_type || "").trim(),
    title: source && Object.prototype.hasOwnProperty.call(source, "title")
      ? String(source.title || "")
      : "Form",
    description: String(source.description || ""),
    sections: normalizedSections,
  };
}

function normalizeTemplateField(field, sectionIndex = 0, fieldIndex = 0) {
  const type = TEMPLATE_FIELD_TYPES.some((item) => item.id === field?.type)
    ? field.type
    : "short_text";
  const hasLabel = field && Object.prototype.hasOwnProperty.call(field, "label");
  const label = hasLabel
    ? String(field.label || "")
    : `Field ${fieldIndex + 1}`;
  const id = slugifyTemplateId(field?.id || label) || `section_${sectionIndex + 1}_field_${fieldIndex + 1}`;
  const options = TEMPLATE_OPTION_FIELD_TYPES.has(type)
    ? (Array.isArray(field?.options) ? field.options : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .filter((item, index, items) => items.indexOf(item) === index)
    : [];
  return {
    id,
    type,
    label,
    helperText: String(field?.helperText || field?.helper_text || ""),
    required: isTemplateNonAnswerField({ type }) ? false : Boolean(field?.required),
    default: isTemplateNonAnswerField({ type }) ? "" : TEMPLATE_DEFAULT_VALUES.has(field?.default) ? field.default : "",
    remember: isTemplateNonAnswerField({ type }) ? false : Boolean(field?.remember),
    options,
    settings: normalizeTemplateSettings(field?.settings),
  };
}

function moveArrayItem(items, index, direction) {
  const next = [...(Array.isArray(items) ? items : [])];
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || index >= next.length || targetIndex >= next.length) return next;
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

function mergeTemplateVersions(versions = [], version) {
  if (!version?.id) return versions;
  const next = versions.filter((item) => item.id !== version.id);
  return [version, ...next].sort((a, b) => (b.version_number || 0) - (a.version_number || 0));
}

function staffToPreviewWorker(staff) {
  return {
    id: staff?.id || "preview",
    name: staff?.name || staff?.username || "Worker Name",
    company: "Preview Company",
  };
}

function templateFieldTypeLabel(type) {
  return TEMPLATE_FIELD_TYPES.find((item) => item.id === type)?.label || "Field";
}

function templateFieldBuilderHint(type) {
  const hints = {
    short_text: "One line text",
    long_text: "Notes or details",
    number: "Numeric entry",
    date: "Calendar field",
    time: "Time picker",
    yes_no: "Two-tap choice",
    boolean: "Checked or not checked",
    toggle: "On / off switch",
    media_upload: "Images, PDF, Excel",
    asset_picker: "Search Safety First assets",
    dropdown: "One option",
    multi_select: "Many chips",
    checkbox: "Final confirmation",
    signature: "Drawn signature",
    instructions: "Read-only text",
    toolbox_meeting_info: "Toolbox Talk header logic",
    toolbox_topics: "APPIA toolbox topic picker",
    toolbox_incident_review: "FA, medical aids, near misses",
    toolbox_safety_concerns: "Concern and action rows",
    toolbox_attendance: "Typed attendee chips",
    toolbox_final_confirmation: "Presenter confirmation",
    site_deficiencies: "Site inspection deficiency rows",
    action_item_rows: "Creates draft Action Items",
  };
  return hints[type] || "Question block";
}

function templateFieldBuilderIcon(type) {
  const icons = {
    short_text: "Ab",
    long_text: "T",
    number: "#",
    date: "D",
    time: "T",
    yes_no: "Y/N",
    boolean: "B",
    toggle: "On",
    media_upload: "Up",
    asset_picker: "A",
    dropdown: "V",
    multi_select: "+",
    checkbox: "OK",
    signature: "Sig",
    instructions: "i",
    toolbox_meeting_info: "TT",
    toolbox_topics: "T",
    toolbox_incident_review: "IR",
    toolbox_safety_concerns: "SC",
    toolbox_attendance: "A",
    toolbox_final_confirmation: "OK",
    site_deficiencies: "SI",
    action_item_rows: "AI",
  };
  return icons[type] || "+";
}

function slugifyTemplateId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function templateDefaultsKey(worker, formType) {
  return `sf_template_defaults:${worker?.id || "unknown"}:${formType}`;
}

function readTemplateFieldDefaults(worker, formType) {
  return readStorageJson(templateDefaultsKey(worker, formType), {});
}

function rememberTemplateFieldDefaults(formType, schema, answers, worker) {
  const current = readTemplateFieldDefaults(worker, formType);
  const next = { ...current };
  getVisibleTemplateSections(schema, answers, worker).flatMap((section) => section.fields || []).forEach((field) => {
    if (!field.remember) return;
    const value = answers[field.id];
    if (typeof value === "string" && value.trim()) next[field.id] = value.trim();
  });
  writeStorageJson(templateDefaultsKey(worker, formType), next);
}

function templateWorkerDefaultValue(defaultKey, worker) {
  if (defaultKey === "today") return todayInVancouver();
  if (defaultKey === "now") return timeInVancouver();
  if (defaultKey === "worker_name") return worker?.name || "";
  if (defaultKey === "worker_phone") return worker?.phone || "";
  if (defaultKey === "worker_username") return worker?.username || worker?.user_name || "";
  if (defaultKey === "worker_company") return worker?.company || "";
  if (defaultKey === "worker_address") return worker?.address || worker?.street_address || "";
  return "";
}

function templateDefaultOptionsForField(field) {
  if (isTemplateNonAnswerField(field)) return [];
  if (["multi_select", "checkbox", "yes_no", "boolean", "toggle", "media_upload", "asset_picker", "dropdown", "signature"].includes(field.type)) {
    return TEMPLATE_DEFAULT_VALUE_OPTIONS.filter((option) => option.id === "");
  }
  return TEMPLATE_DEFAULT_VALUE_OPTIONS.filter((option) => {
    if (!option.fieldTypes) return true;
    return option.fieldTypes.includes(field.type);
  });
}

function templateFieldDefaultValue(field, worker, schema) {
  const remembered = readTemplateFieldDefaults(worker, schema?.formType || "daily_hazard_assessment");
  if (field.remember && remembered[field.id]) return remembered[field.id];
  const workerDefault = templateWorkerDefaultValue(field.default, worker);
  if (workerDefault) return workerDefault;
  const staticDefault = normalizeTemplateStaticDefaultForField(field, templateStaticDefaultValue(field));
  if (staticDefault !== "") return staticDefault;
  if (field.type === "multi_select") return [];
  if (field.type === "media_upload") return [];
  if (field.type === "asset_picker") return null;
  if (field.type === "boolean" || field.type === "toggle") return false;
  if (field.type === "checkbox") return false;
  return "";
}

function collectClientTemplateFields(schema) {
  return (schema?.sections || []).flatMap((section) => section.fields || []);
}

function isTemplateNonAnswerField(field) {
  return field?.type === "instructions" || TEMPLATE_SPECIAL_BLOCK_TYPES.has(field?.type);
}

function getTemplateMissingFields(schema, answers, worker) {
  const fields = getVisibleTemplateSections(schema, answers, worker).flatMap((section) => section.fields || []);
  const missing = fields
    .filter((field) => !isTemplateNonAnswerField(field) && field.required)
    .filter((field) => isTemplateAnswerEmpty(field, answers[field.id] ?? templateFieldDefaultValue(field, worker, schema)))
    .map((field) => field.id);
  fields
    .filter((field) => ACTION_ITEM_ROW_BLOCK_TYPES.has(field.type))
    .forEach((field) => {
      missing.push(...getActionItemBlockMissingFields(field, answers[field.id]));
    });
  return missing;
}

function templateValidationMessage(schema, fieldId) {
  const field = collectClientTemplateFields(schema).find((item) => item.id === fieldId);
  if (!field && String(fieldId || "").includes(".description")) {
    const blockId = String(fieldId).split(".")[0];
    const block = collectClientTemplateFields(schema).find((item) => item.id === blockId);
    if (block && ACTION_ITEM_ROW_BLOCK_TYPES.has(block.type)) {
      const settings = normalizeActionItemRowsSettings(block.settings, block.type);
      const description = settings.subfields.find((item) => item.key === "description");
      return `${description?.label || "Action item / issue"} is required.`;
    }
  }
  if (field && ACTION_ITEM_ROW_BLOCK_TYPES.has(field.type)) {
    return `${field.label}: add a row or mark none needed.`;
  }
  return field ? `${field.label} is required.` : "Complete the required field.";
}

function getActionItemBlockMissingFields(field, value) {
  const block = normalizeActionItemBlockValue(value);
  if (block.noItems) return [];
  const missing = [];
  const meaningfulRows = block.rows.filter(actionItemRowHasMeaningfulValue);
  if (!meaningfulRows.length) {
    missing.push(field.id);
    return missing;
  }
  block.rows.forEach((row, index) => {
    if (actionItemRowHasMeaningfulValue(row) && !String(row?.description || "").trim()) {
      missing.push(`${field.id}.${index}.description`);
    }
  });
  return missing;
}

function cleanTemplateAnswersForSubmit(schema, answers, worker) {
  const cleaned = {};
  getVisibleTemplateSections(schema, answers, worker, { includeHiddenFields: true })
    .flatMap((section) => section.fields || [])
    .forEach((field) => {
      if (isTemplateNonAnswerField(field)) return;
      cleaned[field.id] = cleanTemplateAnswerForSubmit(
        field,
        answers[field.id] ?? templateFieldDefaultValue(field, worker, schema),
      );
    });
  return cleaned;
}

function cleanActionItemBlocksForSubmit(schema, answers, worker = null) {
  const blocks = {};
  getVisibleTemplateSections(schema, answers, worker)
    .flatMap((section) => section.fields || [])
    .filter((field) => ACTION_ITEM_ROW_BLOCK_TYPES.has(field.type))
    .forEach((field) => {
      const settings = normalizeActionItemRowsSettings(field.settings, field.type);
      const block = normalizeActionItemBlockValue(answers[field.id]);
      blocks[field.id] = {
        noItems: block.noItems,
        rows: block.noItems
          ? []
          : block.rows
              .map((row) => cleanActionItemRowForSubmit(row, settings))
              .filter(actionItemRowHasMeaningfulValue),
      };
    });
  return blocks;
}

function cleanActionItemRowForSubmit(row, settings) {
  const visible = new Set(visibleActionItemRowFields(settings).map((field) => field.key));
  return ACTION_ITEM_ROW_FIELD_CONFIGS.reduce((cleaned, config) => {
    if (!visible.has(config.key) && !config.lockedVisible) {
      cleaned[config.key] = config.key === "priority" ? "medium" : "";
      return cleaned;
    }
    const value = row?.[config.key];
    cleaned[config.key] = typeof value === "string" ? value.trim() : value || "";
    if (config.key === "priority" && !cleaned[config.key]) cleaned[config.key] = "medium";
    return cleaned;
  }, {});
}

function cleanTemplateAnswerForSubmit(field, value) {
  if (field.type === "boolean" || field.type === "toggle") return value === true;
  if (field.type === "checkbox") return value === true;
  if (field.type === "multi_select") return Array.isArray(value) ? value.filter(Boolean) : [];
  if (field.type === "media_upload") return normalizeMediaUploadAnswer(value);
  if (field.type === "asset_picker") return normalizeAssetPickerAnswer(value);
  if (field.type === "signature") return cleanSignatureDataUrl(value);
  if (isPhoneLikeTemplateField(field)) {
    return typeof value === "string" ? value.trim() : value || "";
  }
  if (field.type === "number") {
    if (value === "" || value === null || value === undefined) return "";
    const number = Number(value);
    if (!Number.isFinite(number)) return value;
    if (normalizeTemplateNumberMode(field) === "integer" && !Number.isInteger(number)) return value;
    return number;
  }
  return typeof value === "string" ? value.trim() : value || "";
}

function isTemplateAnswerEmpty(field, value) {
  if (field.type === "boolean" || field.type === "toggle") return false;
  if (field.type === "checkbox") return value !== true;
  if (field.type === "multi_select") return !Array.isArray(value) || value.length === 0;
  if (field.type === "media_upload") return normalizeMediaUploadAnswer(value).length === 0;
  if (field.type === "asset_picker") return !normalizeAssetPickerAnswer(value);
  return value === "" || value === null || value === undefined;
}

function isTemplateDraftMeaningful(schema, answers, worker) {
  return getVisibleTemplateSections(schema, answers, worker)
    .flatMap((section) => section.fields || [])
    .some((field) => {
    if (ACTION_ITEM_ROW_BLOCK_TYPES.has(field.type)) {
      const block = normalizeActionItemBlockValue(answers[field.id]);
      return block.noItems || block.rows.some(actionItemRowHasMeaningfulValue);
    }
    if (isTemplateNonAnswerField(field)) return false;
    const value = answers[field.id];
    const defaultValue = templateFieldDefaultValue(field, worker, schema);
    if (value === undefined || value === defaultValue) return false;
    return !isTemplateAnswerEmpty(field, value);
  });
}

function normalizeMediaUploadAnswer(value) {
  const source = Array.isArray(value)
    ? value
    : Array.isArray(value?.files)
      ? value.files
      : [];
  return source
    .map(cleanMediaUploadAnswerFile)
    .filter(Boolean)
    .slice(0, MAX_MEDIA_UPLOAD_FILES);
}

function normalizeAssetPickerSettings(settings = {}) {
  const raw = getTemplateSettingValue(settings, "assetPicker");
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const status = String(source.statusFilter || source.status || "active").trim().toLowerCase();
  return {
    typeFilter: String(source.typeFilter || source.type || "").trim(),
    siteFilter: String(source.siteFilter || source.site || "").trim(),
    statusFilter: ["active", "inactive", "retired", "all"].includes(status) ? status : "active",
  };
}

function serializeAssetPickerSettings(settings = {}) {
  const normalized = normalizeAssetPickerSettings({ assetPicker: settings });
  return {
    typeFilter: normalized.typeFilter,
    siteFilter: normalized.siteFilter,
    statusFilter: normalized.statusFilter,
  };
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
  const description = String(source.description || "").trim();
  const selectedAt = String(source.selectedAt || source.selected_at || "").trim();
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
    description,
    selectedAt,
  };
}

function assetSnapshotFromAsset(asset) {
  if (!asset || typeof asset !== "object" || Array.isArray(asset)) return null;
  return normalizeAssetPickerAnswer({
    assetId: asset.id,
    name: asset.name,
    assetType: asset.assetType,
    serialNumber: asset.serialNumber,
    currentSite: asset.currentSite,
    status: asset.status,
    model: asset.model,
    year: asset.year,
    hours: asset.hours,
    kmsMiles: asset.kmsMiles,
    description: asset.description,
    selectedAt: new Date().toISOString(),
  });
}

function assetPickerDetailsText(asset) {
  const item = normalizeAssetPickerAnswer(asset) || asset;
  if (!item || typeof item !== "object") return "";
  const pieces = [];
  if (item.assetType) pieces.push(item.assetType);
  if (item.model) pieces.push(`Model: ${item.model}`);
  if (item.serialNumber) pieces.push(`Serial/VIN: ${item.serialNumber}`);
  if (item.year) pieces.push(`Year: ${item.year}`);
  if (item.hours !== "" && item.hours !== null && item.hours !== undefined) pieces.push(`Hours: ${item.hours}`);
  if (item.kmsMiles) pieces.push(`Kms/Miles: ${item.kmsMiles}`);
  if (item.currentSite) pieces.push(`Site: ${item.currentSite}`);
  if (item.status) pieces.push(item.status);
  return pieces.join(" / ");
}

function assetPickerListDetailsText(asset) {
  const item = normalizeAssetPickerAnswer(asset) || asset;
  if (!item || typeof item !== "object") return "";
  const pieces = [];
  if (item.assetType) pieces.push(item.assetType);
  if (item.serialNumber) pieces.push(`Serial/VIN: ${item.serialNumber}`);
  if (item.currentSite) pieces.push(`Site: ${item.currentSite}`);
  if (item.status) pieces.push(item.status);
  return pieces.join(" / ");
}

function formatAssetPickerAnswer(value) {
  const asset = normalizeAssetPickerAnswer(value);
  if (!asset) return "";
  const details = assetPickerDetailsText(asset);
  return [asset.name || "Selected asset", details].filter(Boolean).join(" / ");
}

function cleanMediaUploadAnswerFile(file) {
  if (!file || typeof file !== "object" || Array.isArray(file)) return null;
  const originalFilename = String(file.originalFilename || file.original_filename || file.name || "").trim();
  const storagePath = String(file.storagePath || file.storage_path || "").trim();
  const mimeType = String(file.mimeType || file.mime_type || file.type || "").trim().toLowerCase();
  const sizeBytes = Number(file.sizeBytes || file.size_bytes || file.size || 0);
  if (!originalFilename || !storagePath) return null;
  return {
    storagePath,
    originalFilename,
    mimeType: mimeType || "application/octet-stream",
    sizeBytes: Number.isFinite(sizeBytes) && sizeBytes > 0 ? sizeBytes : 0,
  };
}

function mediaUploadLocalFileError(file, field = null) {
  const name = String(file?.name || "");
  const extension = mediaUploadFileExtension(name);
  const mimeType = String(file?.type || "").toLowerCase();
  const allowedExtensions = field ? mediaUploadAllowedExtensions(field) : MEDIA_UPLOAD_ALLOWED_EXTENSIONS;
  const allowedMimeTypes = field ? mediaUploadAllowedMimeTypes(field) : MEDIA_UPLOAD_ALLOWED_MIME_TYPES;
  if (!allowedExtensions.has(extension)) {
    return `Use ${mediaUploadAcceptedKindsLabel(field || { settings: {} })} files.`;
  }
  if (mimeType && mimeType !== "application/octet-stream" && !allowedMimeTypes.has(mimeType)) {
    return "File extension and file type do not match.";
  }
  if (!Number.isFinite(file?.size) || file.size < 1) return "File size is required.";
  if (file.size > MAX_MEDIA_UPLOAD_FILE_BYTES) return "File must be 50 MiB or smaller.";
  return "";
}

function mediaUploadFileExtension(name) {
  const value = String(name || "").trim().toLowerCase();
  const index = value.lastIndexOf(".");
  return index >= 0 ? value.slice(index) : "";
}

function mediaUploadFileTypeLabel(file) {
  const mimeType = String(file?.mimeType || file?.mime_type || "").toLowerCase();
  const extension = mediaUploadFileExtension(file?.originalFilename || file?.original_filename || "");
  if (mimeType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"].includes(extension)) {
    return "Image";
  }
  if (mimeType === "application/pdf" || extension === ".pdf") return "PDF";
  if ([".xls", ".xlsx"].includes(extension)) return "Excel";
  return "File";
}

function submittedFileTypeInitial(typeLabel) {
  if (typeLabel === "Image") return "IMG";
  if (typeLabel === "PDF") return "PDF";
  if (typeLabel === "Excel") return "XLS";
  return "FILE";
}

function slugifyTopic(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function todayInVancouver() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function timeInVancouver() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === "hour")?.value || "00";
  const minute = parts.find((part) => part.type === "minute")?.value || "00";
  return `${hour}:${minute}`;
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

function describeActionItemSort(sort, dir) {
  const label = ACTION_ITEM_SORT_LABELS[sort] || sort;
  return `Sort: ${label} ${dir}`;
}

function formTypeLabel(value) {
  return SAFETY_FORM_TYPES.find((form) => form.id === value)?.label || humanizeFormType(value);
}

function humanizeFormType(value) {
  return String(value || "Form")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function roleLabel(value) {
  if (value === "owner") return "Owner";
  if (value === "admin") return "Admin";
  return "Staff";
}

function isAdminOrOwner(staff) {
  return ["owner", "admin"].includes(staff?.role);
}

function isDigitalToolboxTalkSubmission(row) {
  return row?.submission_mode === "fill_form" && row?.form_data?.kind === "toolbox_talk_v1";
}

function isDigitalSiteInspectionSubmission(row) {
  return row?.submission_mode === "fill_form" && row?.form_data?.kind === "site_inspection_v1";
}

function isTemplateDigitalSubmission(row) {
  return row?.submission_mode === "fill_form" && row?.form_data?.kind === "template_submission_v1";
}

function digitalSubmissionData(row) {
  return isDigitalToolboxTalkSubmission(row) || isDigitalSiteInspectionSubmission(row) || isTemplateDigitalSubmission(row)
    ? row.form_data
    : null;
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

function submissionReviewStatus(row) {
  return normalizeStaffSignoffsForDisplay(row?.staff_signoffs).length ? "Reviewed" : "Pending review";
}

function isFileUploadSubmission(row) {
  return row?.submission_mode === "submit_file";
}

function isEditableStaffSubmission(row) {
  return row?.submission_mode === "fill_form" && row?.form_data?.kind === "template_submission_v1";
}

function staffSubmissionWorker(row) {
  return {
    id: row?.worker_id || "",
    name: row?.worker_name || "",
    phone: row?.worker_phone || "",
    username: row?.worker_username || "",
    user_name: row?.worker_username || "",
    company: row?.company || "",
  };
}

function staffSubmissionEditSchema(row) {
  const source = row?.form_schema_snapshot && Object.keys(row.form_schema_snapshot || {}).length
    ? row.form_schema_snapshot
    : row?.form_data?.schemaSnapshot || {};
  return normalizeClientTemplateSchema({
    ...source,
    formType: source?.formType || row?.form_type || "",
    title: source?.title || formTypeLabel(row?.form_type),
  });
}

function staffSubmissionEditAnswers(row) {
  const data = row?.form_data || {};
  return {
    ...(data.answers && typeof data.answers === "object" && !Array.isArray(data.answers) ? data.answers : {}),
    ...(data.actionItemBlocks && typeof data.actionItemBlocks === "object" && !Array.isArray(data.actionItemBlocks)
      ? data.actionItemBlocks
      : {}),
  };
}

function collectSubmittedFormTranslationTexts(root) {
  return collectSubmittedFormTextNodes(root)
    .map((node) => normalizeSubmittedFormText(node.nodeValue))
    .filter(Boolean)
    .filter((text, index, values) => values.indexOf(text) === index);
}

function applySubmittedFormTranslations(root, translations) {
  collectSubmittedFormTextNodes(root).forEach((node) => {
    const source = normalizeSubmittedFormText(node.nodeValue);
    const translated = translations.get(source);
    if (!translated) return;
    const raw = String(node.nodeValue || "");
    const leading = raw.match(/^\s*/)?.[0] || "";
    const trailing = raw.match(/\s*$/)?.[0] || "";
    node.nodeValue = `${leading}${translated}${trailing}`;
  });
}

function collectSubmittedFormTextNodes(root) {
  if (!root || typeof document === "undefined") return [];
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = normalizeSubmittedFormText(node.nodeValue);
      if (!isSubmittedFormTranslatableText(text)) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.closest("button, svg, style, script, textarea, input, select, canvas, [data-translate-ignore]")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let node = walker.nextNode();
  while (node) {
    nodes.push(node);
    node = walker.nextNode();
  }
  return nodes;
}

function normalizeSubmittedFormTranslations(value) {
  const map = new Map();
  if (!Array.isArray(value)) return map;
  value.forEach((item) => {
    const source = normalizeSubmittedFormText(item?.source);
    const translated = String(item?.text || "").trim();
    if (source && translated) map.set(source, translated);
  });
  return map;
}

function normalizeSubmittedFormText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isSubmittedFormTranslatableText(text) {
  if (!text || text.length < 2) return false;
  if (!/[A-Za-zÀ-žА-Яа-я가-힣अ-ह]/.test(text)) return false;
  if (/^[\d\s.,:;#/+()'"-]+$/.test(text)) return false;
  return true;
}

function renderTemplateAnswerDisplay(field, value, filePreviewContext) {
  if (isTemplateNonAnswerField(field)) return "-";
  if (field.type === "signature") {
    const src = cleanSignatureDataUrl(value);
    return src ? (
      <img
        alt={`${field.label || "Signature"} signature`}
        className="template-signature-answer"
        src={src}
      />
    ) : "-";
  }
  if (field.type === "media_upload") {
    const files = normalizeMediaUploadAnswer(value);
    if (!files.length) return "-";
    return (
      <span className="toolbox-detail-chip-list inline media-answer-list">
        {files.map((file, index) => {
          const savedFile = filePreviewContext?.filesByStoragePath?.get(file.storagePath);
          const label = file.originalFilename || savedFile?.original_filename || "Attachment";
          if (savedFile && filePreviewContext?.openFilePreview) {
            return (
              <button
                className="submission-file-name-button inline"
                disabled={filePreviewContext.previewLoadingId === savedFile.id}
                key={`${file.storagePath}-${index}`}
                type="button"
                onClick={() => filePreviewContext.openFilePreview(savedFile)}
              >
                {filePreviewContext.previewLoadingId === savedFile.id ? "Opening..." : label}
              </button>
            );
          }
          return <span key={`${file.storagePath || label}-${index}`}>{label}</span>;
        })}
      </span>
    );
  }
  if (field.type === "asset_picker") {
    const asset = normalizeAssetPickerAnswer(value);
    if (!asset) return "-";
    return (
      <span className="template-asset-answer">
        <strong>{asset.name || "Selected asset"}</strong>
        {assetPickerDetailsText(asset) ? <small>{assetPickerDetailsText(asset)}</small> : null}
      </span>
    );
  }
  const display = formatTemplateAnswerDisplay(field, value);
  if (Array.isArray(display)) {
    if (!display.length) return "-";
    return (
      <span className="toolbox-detail-chip-list inline">
        {display.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </span>
    );
  }
  return display || "-";
}

function formatTemplateAnswerDisplay(field, value) {
  if (isTemplateNonAnswerField(field)) return "";
  if (field.type === "boolean" || field.type === "toggle") return value ? "Yes" : "No";
  if (field.type === "checkbox") return value ? "Yes" : "No";
  if (field.type === "signature") return cleanSignatureDataUrl(value) ? "Signed" : "";
  if (field.type === "media_upload") {
    return normalizeMediaUploadAnswer(value).map((file) => file.originalFilename || "Attachment");
  }
  if (field.type === "asset_picker") return formatAssetPickerAnswer(value);
  if (field.type === "yes_no") {
    if (value === "yes") return "Yes";
    if (value === "no") return "No";
    return "";
  }
  if (field.type === "multi_select") {
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }
  if (field.type === "date" && value) return formatDateString(String(value));
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function cleanSignatureDataUrl(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > MAX_SIGNATURE_DATA_URL_LENGTH) return "";
  return SIGNATURE_DATA_URL_PATTERN.test(text) ? text : "";
}

function actionItemStatusLabel(value) {
  return ACTION_ITEM_STATUS_OPTIONS.find((status) => status.id === value)?.label || value || "Unknown";
}

function priorityLabel(value) {
  return ACTION_ITEM_PRIORITY_OPTIONS.find((priority) => priority.id === value)?.label || value || "Unknown";
}

function actionItemEventLabel(value) {
  return String(value || "event").replace(/_/g, " ");
}

function actionItemEditState(item) {
  return {
    title: item?.title || "",
    description: item?.description || "",
    status: item?.status || "draft",
    priority: item?.priority || "medium",
    dueDate: item?.due_date || "",
    assignedTo: item?.assigned_to || "",
    recommendedAction: item?.recommended_action || "",
    closeoutNotes: item?.closeout_notes || "",
  };
}

function summarizeActionItemsForClient(rows) {
  const today = todayInVancouver();
  const dueSoonDate = addDaysToISODate(today, 7);
  const activeRows = rows.filter((row) => !["closed", "void"].includes(row.status));
  return {
    drafts: rows.filter((row) => row.status === "draft").length,
    open: rows.filter((row) => ["open", "in_progress"].includes(row.status)).length,
    readyForReview: rows.filter((row) => row.status === "ready_for_review").length,
    overdue: activeRows.filter((row) => row.due_date && row.due_date < today).length,
    dueSoon: activeRows.filter((row) => row.due_date && row.due_date >= today && row.due_date <= dueSoonDate).length,
  };
}

function displayOptionalNumber(value) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function nearMissLabel(value) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "Not selected";
}

function toolboxIncidentDisplayValue(field, incident = {}) {
  if (field.key === "firstAidCount" || field.key === "medicalAidCount") {
    return displayOptionalNumber(incident[field.key]);
  }
  if (field.key === "nearMissReviewed") {
    return nearMissLabel(incident.nearMissReviewed);
  }
  return incident[field.key] || "";
}

function toolboxSafetyConcernDisplayValue(field, row = {}) {
  if (field.key === "dateTaken") return row.dateTaken ? formatDateString(row.dateTaken) : "-";
  return row[field.key] || "-";
}

function toolboxDetailGridStyle(fields) {
  const visibleFields = fields && fields.length ? fields : TOOLBOX_SAFETY_CONCERN_FIELD_CONFIGS;
  return {
    gridTemplateColumns: visibleFields
      .map((field) => (field.input === "date" ? "minmax(90px, 0.6fr)" : "minmax(0, 1.2fr)"))
      .join(" "),
  };
}

function canRetryBackup(value) {
  return ["pending", "failed"].includes(value);
}

function formatFileSize(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewableImage(file) {
  return String(file?.mime_type || "").startsWith("image/");
}

function isPreviewablePdf(file) {
  return String(file?.mime_type || "").toLowerCase() === "application/pdf";
}

async function shareSubmissionAttachment(preview) {
  const file = preview.file || {};
  const fileName = file.original_filename || "Attachment";
  if (!navigator.share) return false;

  try {
    const response = await fetch(preview.url);
    if (!response.ok) throw new Error("Attachment could not be prepared for sharing.");
    const blob = await response.blob();
    const attachment = new File([blob], fileName, {
      type: file.mime_type || blob.type || "application/octet-stream",
    });
    if (navigator.canShare?.({ files: [attachment] })) {
      await navigator.share({
        files: [attachment],
        title: fileName,
      });
      return true;
    }
  } catch (error) {
    if (error.name === "AbortError") throw error;
  }

  await navigator.share({
    title: fileName,
    url: preview.url,
  });
  return true;
}

async function shareOrDownloadQrCode(dataUrl, fileName, title) {
  const qrFile = dataUrlToFile(dataUrl, fileName);
  if (qrFile && navigator.share) {
    try {
      if (!navigator.canShare || navigator.canShare({ files: [qrFile] })) {
        await navigator.share({
          files: [qrFile],
          title,
        });
        return;
      }
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  downloadDataUrl(dataUrl, fileName);
}

async function createLabeledQrCodeDataUrl(qrDataUrl, label) {
  if (typeof document === "undefined") return qrDataUrl;
  const image = await loadImage(qrDataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return qrDataUrl;

  const width = 320;
  const qrSize = 260;
  const padding = 24;
  const labelGap = 16;
  const lineHeight = 26;
  const scale = 2;
  const maxTextWidth = width - padding * 2;
  context.font = "800 22px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const lines = wrapCanvasText(context, String(label || "Form").trim() || "Form", maxTextWidth, 2);
  const height = padding + qrSize + labelGap + lines.length * lineHeight + padding;

  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;
  context.drawImage(image, (width - qrSize) / 2, padding, qrSize, qrSize);
  context.imageSmoothingEnabled = true;
  context.fillStyle = "#111111";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "800 22px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  lines.forEach((line, index) => {
    context.fillText(line, width / 2, padding + qrSize + labelGap + lineHeight / 2 + index * lineHeight);
  });
  return canvas.toDataURL("image/png");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function wrapCanvasText(context, text, maxWidth, maxLines = 2) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (!current || context.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  if (!lines.length) lines.push("Form");
  const fitLines = lines.map((line) =>
    context.measureText(line).width > maxWidth ? ellipsizeCanvasText(context, line, maxWidth) : line,
  );
  if (fitLines.length <= maxLines) return fitLines;
  const kept = fitLines.slice(0, maxLines);
  kept[maxLines - 1] = ellipsizeCanvasText(context, kept[maxLines - 1], maxWidth);
  return kept;
}

function ellipsizeCanvasText(context, text, maxWidth) {
  const ellipsis = "...";
  let next = String(text || "");
  while (next && context.measureText(`${next}${ellipsis}`).width > maxWidth) {
    next = next.slice(0, -1).trimEnd();
  }
  return next ? `${next}${ellipsis}` : ellipsis;
}

function dataUrlToFile(dataUrl, fileName) {
  if (!dataUrl || typeof File === "undefined") return null;
  const match = String(dataUrl).match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  try {
    const binary = window.atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new File([bytes], fileName, { type: match[1] || "image/png" });
  } catch {
    return null;
  }
}

function downloadDataUrl(dataUrl, fileName) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.click();
}

function printSubmissionAttachment(preview) {
  const file = preview.file || {};
  const fileName = file.original_filename || "Attachment";
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) {
    window.open(preview.url, "_blank", "noopener,noreferrer");
    return;
  }
  const escapedUrl = escapeHtml(preview.url);
  const escapedName = escapeHtml(fileName);
  const body = isPreviewableImage(file)
    ? `<img alt="${escapedName}" src="${escapedUrl}" onload="setTimeout(() => window.print(), 250)" />`
    : `<iframe title="${escapedName}" src="${escapedUrl}" onload="setTimeout(() => window.print(), 600)"></iframe>`;
  printWindow.document.write(`<!doctype html>
    <html>
      <head>
        <title>${escapedName}</title>
        <style>
          html, body { min-height: 100%; margin: 0; font-family: Arial, sans-serif; }
          body { display: grid; gap: 12px; padding: 16px; }
          img { max-width: 100%; height: auto; align-self: start; justify-self: center; }
          iframe { width: 100%; height: 92vh; border: 0; }
          button { width: fit-content; min-height: 40px; padding: 0 14px; }
          @media print { button { display: none; } body { padding: 0; } iframe { height: 100vh; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()">Print</button>
        ${body}
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
}

async function downloadDigitalFormPng(row, data, exportTarget) {
  await withDigitalFormExportElement(row, data, exportTarget, async (element) => {
    const canvas = await captureDigitalFormElement(element);
    const blob = await canvasToBlob(canvas, "image/png");
    const fileName = digitalFormExportFileName(row, data, "png");
    await shareOrDownloadBlob(blob, fileName, digitalFormTitle(row, data));
  });
}

async function downloadDigitalFormPdf(row, data, exportTarget, options = {}) {
  const basePath = options.pdfScope === "worker" ? "/api/worker/submissions" : "/api/staff/submissions";
  const response = await fetch(`${basePath}/${row.id}/pdf`, {
    credentials: "include",
  });
  if (!response.ok) throw await digitalExportResponseError(response, "This form PDF could not be downloaded.");
  const blob = await response.blob();
  if (!blob.size) throw new Error("This form PDF was empty.");
  const fileName = fileNameFromContentDisposition(response.headers.get("content-disposition")) ||
    submittedFormPdfFileName(row);
  downloadBlob(blob, fileName);
}

async function emailDigitalFormPdf(row, data, exportTarget) {
  return await readApiJson(
    await fetch(`/api/staff/submissions/${row.id}/email`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: submittedFormPdfFileName(row) }),
    }),
  );
}

async function printDigitalForm(row, data, exportTarget) {
  await printHtmlInHiddenFrame(buildSubmittedFormPrintHtml(row, { includePrintButton: false }));
}

async function withDigitalFormExportElement(row, data, exportTarget, callback) {
  const existingElement = exportTarget?.current || exportTarget;
  if (existingElement) return await callback(existingElement);

  const temporary = createTemporaryDigitalFormExportElement(row, data);
  try {
    return await callback(temporary.element);
  } finally {
    temporary.cleanup();
  }
}

function createTemporaryDigitalFormExportElement(row, data) {
  const html = buildDigitalFormHtml(row, data);
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const wrapper = document.createElement("div");
  wrapper.className = "digital-export-temporary-root";
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.position = "absolute";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.width = "980px";
  wrapper.style.background = "#fff";
  parsed.querySelectorAll("style").forEach((style) => {
    wrapper.appendChild(style.cloneNode(true));
  });
  const element = parsed.querySelector("main") || parsed.body;
  const clone = element.cloneNode(true);
  clone.querySelectorAll(".print-actions").forEach((node) => node.remove());
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  return {
    element: clone,
    cleanup: () => wrapper.remove(),
  };
}

async function captureDigitalFormElement(element, options = {}) {
  if (!element) throw new Error("This form could not be prepared for export.");
  await document.fonts?.ready;
  await waitForExportImages(element);
  const previousWidth = element.style.width;
  if (!previousWidth && element.scrollWidth < 760) {
    element.style.width = "760px";
  }
  const requestedScale = Number(options.scale);
  const scale = Number.isFinite(requestedScale) && requestedScale > 0
    ? requestedScale
    : Math.min(2, window.devicePixelRatio || 1.5);
  try {
    return await html2canvas(element, {
      backgroundColor: "#ffffff",
      logging: false,
      scale,
      useCORS: true,
      windowHeight: element.scrollHeight,
      windowWidth: element.scrollWidth,
    });
  } finally {
    element.style.width = previousWidth;
  }
}

function waitForExportImages(element) {
  const images = [...element.querySelectorAll("img")];
  return Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    }),
  );
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("This form image could not be created."));
    }, type);
  });
}

function printHtmlInHiddenFrame(html) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    let settled = false;
    const cleanup = () => {
      window.setTimeout(() => iframe.remove(), 1500);
    };
    iframe.title = "Submitted form print";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      reject(new Error("The print frame could not be opened."));
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    window.setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        if (!settled) {
          settled = true;
          resolve();
        }
        cleanup();
      } catch (error) {
        if (!settled) {
          settled = true;
          reject(error);
        }
        cleanup();
      }
    }, 650);
  });
}

function digitalFormTitle(row, data) {
  if (data?.kind === "template_submission_v1") return digitalTemplateFormTitle(row, data);
  if (data?.kind === "site_inspection_v1") return digitalSiteInspectionTitle(row, data);
  if (data?.kind === "toolbox_talk_v1") return digitalToolboxTalkTitle(row, data);
  return genericSubmissionTitle(row);
}

function digitalFormFileName(row, data) {
  if (data?.kind === "template_submission_v1") return digitalTemplateFormFileName(row, data);
  if (data?.kind === "site_inspection_v1") return digitalSiteInspectionFileName(row, data);
  if (data?.kind === "toolbox_talk_v1") return digitalToolboxTalkFileName(row, data);
  return genericSubmissionFileName(row);
}

function digitalFormExportFileName(row, data, extension) {
  return digitalFormFileName(row, data).replace(/\.html$/i, `.${extension}`);
}

function buildDigitalFormHtml(row, data, options = {}) {
  if (data?.kind === "template_submission_v1") return buildDigitalTemplateFormHtml(row, data, options);
  if (data?.kind === "site_inspection_v1") return buildDigitalSiteInspectionHtml(row, data, options);
  if (data?.kind === "toolbox_talk_v1") return buildDigitalToolboxTalkHtml(row, data, options);
  return buildGenericSubmissionHtml(row, options);
}

function genericSubmissionTitle(row) {
  const date = row?.submitted_date_vancouver
    ? formatDateString(row.submitted_date_vancouver)
    : formatShortDate(row || {}, "submitted_date_vancouver", "submitted_at");
  return `${formTypeLabel(row?.form_type)} - ${row?.company || "Company"} - ${date}`;
}

function genericSubmissionFileName(row) {
  const rawDate = row?.submitted_date_vancouver || todayInVancouver();
  return `${slugifyFilePart(row?.company || "company")}-${slugifyFilePart(formTypeLabel(row?.form_type))}-${slugifyFilePart(rawDate)}.html`;
}

function buildGenericSubmissionHtml(row, options = {}) {
  const submitted = row?.submitted_at ? formatDateTime(row.submitted_at) : "";
  const title = genericSubmissionTitle(row);
  const formLabel = formTypeLabel(row?.form_type);
  const files = Array.isArray(row?.files) ? row.files : [];
  const totalSize = files.reduce((sum, file) => sum + Number(file?.size_bytes || 0), 0);
  const fileCards = files.length
    ? files.map((file) => {
        const typeLabel = mediaUploadFileTypeLabel(file);
        return `
          <article class="file-card">
            <div class="file-icon">${escapeHtml(submittedFileTypeInitial(typeLabel))}</div>
            <div>
              <h3>${escapeHtml(file.original_filename || "Attachment")}</h3>
              <p>${escapeHtml(typeLabel)} / ${escapeHtml(formatFileSize(file.size_bytes))}</p>
              <small>Backup: ${escapeHtml(backupStatusLabel(file.backup_status))}</small>
            </div>
            ${file.one_drive_web_url ? `<a href="${escapeHtml(file.one_drive_web_url)}">Open backup</a>` : ""}
          </article>`;
      }).join("")
    : `<p class="empty">No attachment records were saved with this submission.</p>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color: #17211f; font-family: Arial, Helvetica, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f4f7f6; color: #17211f; }
      main { max-width: 920px; margin: 0 auto; padding: 34px; background: #fff; }
      header { display: grid; gap: 6px; border-bottom: 2px solid #173b38; padding-bottom: 16px; margin-bottom: 18px; }
      .brand { color: #173b38; font-size: 0.86rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      h1 { margin: 0; font-size: 2rem; line-height: 1.1; }
      h2 { margin: 0; font-size: 1.2rem; }
      p { margin: 0; }
      dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; margin: 0; }
      dt { color: #5f6f6b; font-size: 0.76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 3px 0 0; font-weight: 750; overflow-wrap: anywhere; }
      .file-package { display: grid; gap: 16px; margin-top: 22px; border: 1px solid #d9e6e2; border-radius: 8px; padding: 18px; background: #f8fbfa; }
      .file-package-heading { display: flex; gap: 14px; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #e2ebe7; padding-bottom: 14px; }
      .file-package-heading p { color: #245f5b; font-size: 0.76rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .file-package-heading span { display: block; margin-top: 4px; color: #5f6f6b; font-weight: 750; }
      .file-badges { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
      .file-badges span { border: 1px solid #c9ddd7; border-radius: 999px; padding: 6px 10px; color: #245f5b; font-size: 0.78rem; font-weight: 900; background: #fff; white-space: nowrap; }
      .file-card { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto; gap: 12px; align-items: center; border: 1px solid #dce8e4; border-radius: 8px; padding: 12px; background: #fff; }
      .file-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 8px; color: #245f5b; font-size: 0.72rem; font-weight: 900; letter-spacing: 0.04em; background: #e9f4f1; }
      .file-card h3 { margin: 0; overflow-wrap: anywhere; font-size: 1rem; }
      .file-card p, .file-card small { display: block; margin-top: 3px; color: #5f6f6b; font-weight: 750; }
      .file-card a { color: #245f5b; font-weight: 850; text-decoration: none; }
      .empty { color: #5f6f6b; font-weight: 750; }
      .print-actions { display: flex; gap: 10px; margin-bottom: 14px; }
      .print-actions button { min-height: 40px; border: 1px solid #cbded7; border-radius: 8px; padding: 0 14px; background: #fff; font: inherit; font-weight: 750; }
      @media (max-width: 680px) { dl, .file-card { grid-template-columns: 1fr; } .file-package-heading { display: grid; } .file-badges { justify-content: flex-start; } }
      @page { size: letter portrait; margin: 0.3in; }
      @media print {
        body { background: #fff; }
        main { max-width: none; padding: 0; }
        .print-actions { display: none; }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="print-actions">
        <button onclick="window.print()">Print</button>
      </div>
      <header>
        <p class="brand">APPIA</p>
        <h1>${escapeHtml(formLabel)}</h1>
        <p>${escapeHtml([row?.worker_name, row?.company].filter(Boolean).join(" / "))}</p>
        ${submitted ? `<p>Submitted: ${escapeHtml(submitted)}</p>` : ""}
      </header>
      <dl>
        ${definitionHtml("Phone", row?.worker_phone || "-")}
        ${definitionHtml("Username", row?.worker_username || "-")}
        ${definitionHtml("Mode", submissionModeLabel(row?.submission_mode))}
        ${definitionHtml("Backup", backupStatusLabel(row?.one_drive_backup_status))}
        ${row?.notes ? definitionHtml("Notes", row.notes) : ""}
      </dl>
      <section class="file-package">
        <div class="file-package-heading">
          <div>
            <p>Submitted file package</p>
            <h2>${files.length ? `${files.length} uploaded ${files.length === 1 ? "file" : "files"}` : "No files uploaded"}</h2>
            <span>${escapeHtml(formLabel)} was submitted as an uploaded attachment package.</span>
          </div>
          <div class="file-badges">
            <span>${escapeHtml(formatFileSize(totalSize))} total</span>
            <span>${escapeHtml(backupStatusLabel(row?.one_drive_backup_status))}</span>
          </div>
        </div>
        ${fileCards}
      </section>
    </main>
    ${options.autoPrint ? "<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 250); });</script>" : ""}
  </body>
</html>`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

async function shareOrDownloadBlob(blob, fileName, title, options = {}) {
  if (blob && typeof File !== "undefined" && typeof navigator !== "undefined" && navigator.share) {
    const types = uniqueValues([
      blob.type || "application/octet-stream",
      ...(Array.isArray(options.shareTypes) ? options.shareTypes : []),
    ]);
    const candidates = types.map((type) => new File([blob], fileName, { type }));
    let fallbackCandidate = candidates[0];
    for (const file of candidates) {
      const payload = { files: [file] };
      if (!navigator.canShare || navigator.canShare(payload)) {
        fallbackCandidate = file;
        try {
          await navigator.share({
            files: [file],
            title: title || fileName,
          });
          return;
        } catch (error) {
          if (error.name === "AbortError") return;
        }
      }
    }
    if (options.tryShareWhenCannotShare && fallbackCandidate) {
      try {
        await navigator.share({
          files: [fallbackCandidate],
          title: title || fileName,
        });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
  }
  downloadBlob(blob, fileName);
}

async function digitalExportResponseError(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const payload = await response.json();
      return new Error(payload?.error || fallbackMessage);
    } catch {
      return new Error(fallbackMessage);
    }
  }
  const text = await response.text().catch(() => "");
  return new Error(text.trim().slice(0, 240) || fallbackMessage);
}

function fileNameFromContentDisposition(value) {
  const text = String(value || "");
  const utfMatch = text.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1].replace(/"/g, ""));
  const match = text.match(/filename="?([^";]+)"?/i);
  return match?.[1] || "";
}

function digitalTemplateFormTitle(row, data) {
  const schema = normalizeClientTemplateSchema(data?.schemaSnapshot || row?.form_schema_snapshot);
  const date = row?.submitted_date_vancouver
    ? formatDateString(row.submitted_date_vancouver)
    : formatShortDate(row || {}, "submitted_date_vancouver", "submitted_at");
  return `${schema.title || formTypeLabel(row?.form_type)} - ${row?.company || "Company"} - ${date}`;
}

function digitalTemplateFormFileName(row, data) {
  const schema = normalizeClientTemplateSchema(data?.schemaSnapshot || row?.form_schema_snapshot);
  const rawDate = row?.submitted_date_vancouver || todayInVancouver();
  return `${slugifyFilePart(row?.company || "company")}-${slugifyFilePart(schema.title || row?.form_type || "form")}-${slugifyFilePart(rawDate)}.html`;
}

function buildDigitalTemplateFormHtml(row, data, options = {}) {
  const schema = normalizeClientTemplateSchema(data?.schemaSnapshot || row?.form_schema_snapshot);
  const answers = data?.answers || {};
  const submitted = row?.submitted_at ? formatDateTime(row.submitted_at) : "";
  const title = digitalTemplateFormTitle(row, data);
  const sectionHtml = templateAnswerSectionsHtml(schema, answers, data?.actionItemBlocks);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color: #17211f; font-family: Arial, Helvetica, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f4f7f6; color: #17211f; }
      main { max-width: 920px; margin: 0 auto; padding: 28px; background: #fff; }
      header { display: grid; gap: 8px; border-bottom: 2px solid #173b38; padding-bottom: 16px; margin-bottom: 18px; }
      .brand { color: #173b38; font-size: 0.86rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      h1 { margin: 0; font-size: 2rem; line-height: 1.1; }
      h2 { margin: 0 0 10px; font-size: 1.15rem; }
      p { margin: 0; white-space: pre-wrap; }
      section { break-inside: avoid; display: grid; gap: 10px; border: 1px solid #d9e3de; border-radius: 8px; padding: 14px; margin: 0 0 14px; }
      .action-row { display: grid; gap: 8px; border: 1px solid #d9e3de; border-radius: 6px; padding: 10px; }
      .action-row h3 { margin: 0; font-size: 1rem; }
      dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; margin: 0; }
      dt { color: #5f6f6b; font-size: 0.76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 3px 0 0; font-weight: 750; overflow-wrap: anywhere; white-space: pre-wrap; }
      .signature-print-image { display: block; width: 100%; max-width: 360px; max-height: 130px; object-fit: contain; border: 1px solid #d9e3de; border-radius: 6px; background: #fff; }
      .print-actions { display: flex; gap: 10px; margin-bottom: 14px; }
      .print-actions button { min-height: 40px; border: 1px solid #cbded7; border-radius: 8px; padding: 0 14px; background: #fff; font: inherit; font-weight: 750; }
      footer { grid-column: 1 / -1; color: #5f6f6b; font-size: 0.78rem; border-top: 1px solid #d9e3de; padding-top: 8px; }
      @page { size: letter portrait; margin: 0.22in; }
      @media (max-width: 640px) {
        main { padding: 18px; }
        dl { grid-template-columns: 1fr; }
      }
      @media print {
        :root { font-size: 8pt; }
        body { background: #fff; }
        main {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5pt;
          max-width: none;
          padding: 0;
        }
        header {
          grid-column: 1 / -1;
          gap: 1pt;
          border-bottom-width: 1px;
          padding-bottom: 4pt;
          margin-bottom: 0;
        }
        h1 { font-size: 13pt; line-height: 1.05; }
        h2 { margin-bottom: 3pt; font-size: 8pt; line-height: 1.1; }
        p { font-size: 7pt; line-height: 1.15; }
        section {
          gap: 3pt;
          border-radius: 3pt;
          padding: 4pt;
          margin: 0;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .action-row { gap: 2pt; border-radius: 3pt; padding: 3pt; }
        .action-row h3 { font-size: 7pt; line-height: 1.1; }
        dl { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3pt 5pt; }
        dt { font-size: 5.3pt; line-height: 1.05; }
        dd { margin-top: 1pt; font-size: 6.6pt; line-height: 1.12; }
        .signature-print-image { max-height: 45pt; }
        .print-actions { display: none; }
        footer { font-size: 5.6pt; padding-top: 3pt; }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="print-actions">
        <button onclick="window.print()">Print</button>
      </div>
      <header>
        <p class="brand">APPIA</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml([row?.worker_name, row?.company].filter(Boolean).join(" / "))}</p>
        ${submitted ? `<p>Submitted: ${escapeHtml(submitted)}</p>` : ""}
      </header>
      ${sectionHtml}
      <footer>Submission ${escapeHtml(row?.id || "-")} / ${submitted ? escapeHtml(submitted) : "Not submitted"}</footer>
    </main>
    ${options.autoPrint ? "<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 250); });</script>" : ""}
  </body>
</html>`;
}

function templateAnswerSectionsHtml(schema, answers = {}, actionItemBlocks = {}) {
  const normalized = normalizeClientTemplateSchema(schema);
  const visibleSections = getVisibleTemplateSections(normalized, answers, null, { includeHiddenFields: true });
  return visibleSections.map((section) => {
    const fields = (section.fields || []).filter((field) => !isTemplateNonAnswerField(field));
    const rows = fields.map((field) => {
      if (field.type === "signature") return signatureDefinitionHtml(field.label, answers[field.id]);
      if (field.type === "media_upload") {
        const value = normalizeMediaUploadAnswer(answers[field.id])
          .map((file) => `${file.originalFilename || "Attachment"} (attached separately)`)
          .join(", ");
        return definitionHtml(field.label, value);
      }
      const display = formatTemplateAnswerDisplay(field, answers[field.id]);
      const value = Array.isArray(display) ? display.join(", ") : display;
      return definitionHtml(field.label, value);
    }).join("");
    const actionItemRowsHtml = (section.fields || [])
      .filter((field) => ACTION_ITEM_ROW_BLOCK_TYPES.has(field.type))
      .map((field) => actionItemRowsDefinitionHtml(field, actionItemBlocks?.[field.id]))
      .join("");
    return `
      <section>
        <h2>${escapeHtml(section.title)}</h2>
        ${section.description ? `<p>${escapeHtml(section.description)}</p>` : ""}
        ${rows ? `<dl>${rows}</dl>` : ""}
        ${actionItemRowsHtml || (!rows ? `<dl>${definitionHtml("Details", "-")}</dl>` : "")}
      </section>`;
  }).join("");
}

function digitalToolboxTalkTitle(row, data) {
  const header = data?.header || {};
  const project = header.projectName || row?.company || "Toolbox Talk";
  const date = header.date ? formatDateString(header.date) : formatShortDate(row || {}, "submitted_date_vancouver", "submitted_at");
  return `Toolbox Talk - ${project} - ${date}`;
}

function digitalToolboxTalkFileName(row, data) {
  const header = data?.header || {};
  const rawDate = header.date || row?.submitted_date_vancouver || todayInVancouver();
  const project = header.projectName || row?.company || "toolbox-talk";
  return `${slugifyFilePart(project)}-toolbox-talk-${slugifyFilePart(rawDate)}.html`;
}

function buildDigitalToolboxTalkHtml(row, data, options = {}) {
  const header = data?.header || {};
  const incident = data?.incidentReview || {};
  const topics = Array.isArray(data?.topics?.selected) ? data.topics.selected : [];
  const concerns = Array.isArray(data?.safetyConcerns) ? data.safetyConcerns : [];
  const attendance = Array.isArray(data?.attendance) ? data.attendance : [];
  const confirmation = data?.confirmation || {};
  const submitted = row?.submitted_at ? formatDateTime(row.submitted_at) : "";
  const title = digitalToolboxTalkTitle(row, data);
  const toolboxSchema = data?.schemaSnapshot || row?.form_schema_snapshot;
  const toolboxLayout = getToolboxTalkLayout(toolboxSchema);
  const incidentReviewSettings = normalizeToolboxCompositeSettings(
    toolboxLayout.blockSettings.toolbox_incident_review,
    "toolbox_incident_review",
  );
  const safetyConcernSettings = normalizeToolboxCompositeSettings(
    toolboxLayout.blockSettings.toolbox_safety_concerns,
    "toolbox_safety_concerns",
  );
  const visibleIncidentFields = visibleToolboxCompositeFields(incidentReviewSettings);
  const visibleSafetyConcernFields = visibleToolboxCompositeFields(safetyConcernSettings);
  const genericSectionHtml = templateAnswerSectionsHtml(
    getCustomGenericTemplateSchema(toolboxSchema, isToolboxTalkConsumedTemplateField, "toolbox_talk"),
    data?.answers || {},
    data?.actionItemBlocks || {},
  );
  const topicRows = topics.length
    ? topics.map((topic) => `
        <tr>
          <td>${escapeHtml(topic.categoryLabel || "")}</td>
          <td>${escapeHtml(topic.label || "")}</td>
        </tr>`).join("")
    : `<tr><td colspan="2">No selected topics</td></tr>`;
  const incidentRows = visibleIncidentFields
    .filter((field) => {
      if (field.conditionalKey) return incident[field.conditionalKey] === field.conditionalValue && incident[field.key];
      if (field.input === "textarea") return Boolean(incident[field.key]);
      return true;
    })
    .map((field) => definitionHtml(field.label, toolboxIncidentDisplayValue(field, incident)))
    .join("");
  const concernRows = concerns.length
    ? concerns.map((concern) => `
        <tr>
          ${visibleSafetyConcernFields.map((field) =>
            `<td>${escapeHtml(toolboxSafetyConcernDisplayValue(field, concern))}</td>`,
          ).join("")}
        </tr>`).join("")
    : `<tr><td colspan="${Math.max(visibleSafetyConcernFields.length, 1)}">No safety concerns recorded</td></tr>`;
  const attendeeRows = attendance.length
    ? attendance.map((attendee, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(attendee.name || "-")}</td>
        </tr>`).join("")
    : `<tr><td colspan="2">No attendees recorded</td></tr>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color: #17211f; font-family: Arial, Helvetica, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f4f7f6; color: #17211f; }
      main { max-width: 920px; margin: 0 auto; padding: 28px; background: #fff; }
      header { display: grid; gap: 8px; border-bottom: 2px solid #173b38; padding-bottom: 16px; margin-bottom: 18px; }
      .brand { color: #173b38; font-size: 0.86rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      h1 { margin: 0; font-size: 2rem; line-height: 1.1; }
      h2 { margin: 0 0 10px; font-size: 1.15rem; }
      p { margin: 0; }
      section { break-inside: avoid; display: grid; gap: 10px; border: 1px solid #d9e3de; border-radius: 8px; padding: 14px; margin: 0 0 14px; }
      dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; margin: 0; }
      dt { color: #5f6f6b; font-size: 0.76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 3px 0 0; font-weight: 750; overflow-wrap: anywhere; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { border: 1px solid #d9e3de; padding: 8px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
      th { background: #eef7f3; font-size: 0.78rem; text-transform: uppercase; }
      .prewrap { white-space: pre-wrap; }
      .signature-print-image { display: block; width: 100%; max-width: 360px; max-height: 130px; object-fit: contain; border: 1px solid #d9e3de; border-radius: 6px; background: #fff; }
      .print-actions { display: flex; gap: 10px; margin-bottom: 14px; }
      .print-actions button { min-height: 40px; border: 1px solid #cbded7; border-radius: 8px; padding: 0 14px; background: #fff; font: inherit; font-weight: 750; }
      footer { grid-column: 1 / -1; color: #5f6f6b; font-size: 0.78rem; border-top: 1px solid #d9e3de; padding-top: 8px; }
      @page { size: letter portrait; margin: 0.22in; }
      @media (max-width: 640px) {
        main { padding: 18px; }
        dl { grid-template-columns: 1fr; }
      }
      @media print {
        :root { font-size: 8pt; }
        body { background: #fff; }
        main {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5pt;
          max-width: none;
          padding: 0;
        }
        header {
          grid-column: 1 / -1;
          gap: 1pt;
          border-bottom-width: 1px;
          padding-bottom: 4pt;
          margin-bottom: 0;
        }
        .brand {
          font-size: 6pt;
          line-height: 1;
        }
        h1 {
          font-size: 14pt;
          line-height: 1.05;
        }
        h2 {
          margin-bottom: 3pt;
          font-size: 8pt;
          line-height: 1.1;
        }
        p {
          font-size: 7pt;
          line-height: 1.18;
        }
        section {
          gap: 3pt;
          border-radius: 3pt;
          padding: 4pt;
          margin: 0;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        dl {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 3pt 5pt;
        }
        dt {
          font-size: 5.4pt;
          line-height: 1.05;
        }
        dd {
          margin-top: 1pt;
          font-size: 7pt;
          line-height: 1.14;
        }
        table {
          font-size: 6.5pt;
          line-height: 1.12;
        }
        th,
        td {
          padding: 2pt 3pt;
        }
        th {
          font-size: 5.6pt;
        }
        .prewrap {
          font-size: 6.5pt;
          line-height: 1.14;
        }
        .signature-print-image { max-height: 45pt; }
        .print-actions { display: none; }
        footer { font-size: 5.6pt; padding-top: 3pt; }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="print-actions">
        <button onclick="window.print()">Print</button>
      </div>
      <header>
        <p class="brand">APPIA</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml([row?.worker_name, row?.company].filter(Boolean).join(" / "))}</p>
        ${submitted ? `<p>Submitted: ${escapeHtml(submitted)}</p>` : ""}
      </header>

      <section>
        <h2>Meeting Info</h2>
        <dl>
          ${definitionHtml("Project", header.projectName)}
          ${definitionHtml("Address", header.address)}
          ${definitionHtml("Date", header.date ? formatDateString(header.date) : "")}
          ${definitionHtml("Time", header.time)}
          ${definitionHtml("Presenter", header.presenter)}
          ${definitionHtml("Supervisor", header.supervisor)}
        </dl>
      </section>

      <section>
        <h2>Topics Discussed</h2>
        <table>
          <thead><tr><th>Category</th><th>Topic</th></tr></thead>
          <tbody>${topicRows}</tbody>
        </table>
        ${data?.topics?.other ? `<p class="prewrap"><strong>Additional topics:</strong><br>${escapeHtml(data.topics.other)}</p>` : ""}
      </section>

      <section>
        <h2>${escapeHtml(toolboxLayout.blockLabels.toolbox_incident_review || "Review Notes")}</h2>
        <dl>
          ${incidentRows}
        </dl>
      </section>

      <section>
        <h2>${escapeHtml(toolboxLayout.blockLabels.toolbox_safety_concerns || "Safety Concerns")}</h2>
        <table>
          <thead><tr>${visibleSafetyConcernFields.map((field) => `<th>${escapeHtml(field.label)}</th>`).join("")}</tr></thead>
          <tbody>${concernRows}</tbody>
        </table>
      </section>

      <section>
        <h2>Attendance</h2>
        <table>
          <thead><tr><th>#</th><th>Name</th></tr></thead>
          <tbody>${attendeeRows}</tbody>
        </table>
      </section>

      <section>
        <h2>Final Check</h2>
        <dl>
          ${definitionHtml("Comments", data?.additionalComments)}
          ${definitionHtml("Confirmed by", confirmation.name)}
          ${definitionHtml("Confirmation date", confirmation.date ? formatDateString(confirmation.date) : "")}
          ${definitionHtml("Participation confirmed", confirmation.confirmed ? "Yes" : "No")}
        </dl>
      </section>
      ${genericSectionHtml}
      <footer>Submission ${escapeHtml(row?.id || "-")} / ${submitted ? escapeHtml(submitted) : "Not submitted"}</footer>
    </main>
    ${options.autoPrint ? "<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 250); });</script>" : ""}
  </body>
</html>`;
}

function digitalSiteInspectionTitle(row, data) {
  const header = data?.header || {};
  const project = header.project || row?.company || "Site Inspection";
  const date = header.date ? formatDateString(header.date) : formatShortDate(row || {}, "submitted_date_vancouver", "submitted_at");
  return `Site Inspection - ${project} - ${date}`;
}

function digitalSiteInspectionFileName(row, data) {
  const header = data?.header || {};
  const rawDate = header.date || row?.submitted_date_vancouver || todayInVancouver();
  const project = header.project || row?.company || "site-inspection";
  return `${slugifyFilePart(row?.company || "company")}-${slugifyFilePart(project)}-site-inspection-${slugifyFilePart(rawDate)}.html`;
}

function buildDigitalSiteInspectionHtml(row, data, options = {}) {
  const header = data?.header || {};
  const observations = data?.observations || {};
  const deficiencies = Array.isArray(data?.deficiencies) ? data.deficiencies : [];
  const submitted = row?.submitted_at ? formatDateTime(row.submitted_at) : "";
  const title = digitalSiteInspectionTitle(row, data);
  const genericSectionHtml = templateAnswerSectionsHtml(
    getCustomGenericTemplateSchema(data?.schemaSnapshot || row?.form_schema_snapshot, isSiteInspectionConsumedTemplateField, row?.form_type || "site_inspection"),
    data?.answers || {},
    data?.actionItemBlocks || {},
  );
  const deficiencyRows = data?.noDeficiencies
    ? `<tr><td colspan="7">No deficiencies found during this inspection.</td></tr>`
    : deficiencies.length
      ? deficiencies.map((deficiency, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(deficiency.category || "-")}</td>
            <td>${escapeHtml(deficiency.location || "-")}</td>
            <td>${escapeHtml(priorityLabel(deficiency.priority))}</td>
            <td>${escapeHtml(deficiency.description || "-")}</td>
            <td>${escapeHtml(deficiency.immediateControl || "-")}</td>
            <td>${escapeHtml(deficiency.recommendedAction || "-")}</td>
          </tr>`).join("")
      : `<tr><td colspan="7">No deficiencies recorded.</td></tr>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color: #17211f; font-family: Arial, Helvetica, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #f4f7f6; color: #17211f; }
      main { max-width: 980px; margin: 0 auto; padding: 28px; background: #fff; }
      header { display: grid; gap: 8px; border-bottom: 2px solid #173b38; padding-bottom: 16px; margin-bottom: 18px; }
      .brand { color: #173b38; font-size: 0.86rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      h1 { margin: 0; font-size: 2rem; line-height: 1.1; }
      h2 { margin: 0 0 10px; font-size: 1.15rem; }
      p { margin: 0; }
      section { break-inside: avoid; display: grid; gap: 10px; border: 1px solid #d9e3de; border-radius: 8px; padding: 14px; margin: 0 0 14px; }
      dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px 16px; margin: 0; }
      dt { color: #5f6f6b; font-size: 0.76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 3px 0 0; font-weight: 750; overflow-wrap: anywhere; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th, td { border: 1px solid #d9e3de; padding: 7px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
      th { background: #eef7f3; font-size: 0.76rem; text-transform: uppercase; }
      .signature-print-image { display: block; width: 100%; max-width: 360px; max-height: 130px; object-fit: contain; border: 1px solid #d9e3de; border-radius: 6px; background: #fff; }
      .print-actions { display: flex; gap: 10px; margin-bottom: 14px; }
      .print-actions button { min-height: 40px; border: 1px solid #cbded7; border-radius: 8px; padding: 0 14px; background: #fff; font: inherit; font-weight: 750; }
      footer { grid-column: 1 / -1; color: #5f6f6b; font-size: 0.78rem; border-top: 1px solid #d9e3de; padding-top: 8px; }
      @page { size: letter portrait; margin: 0.22in; }
      @media (max-width: 640px) {
        main { padding: 18px; }
        dl { grid-template-columns: 1fr; }
      }
      @media print {
        :root { font-size: 7.6pt; }
        body { background: #fff; }
        main {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5pt;
          max-width: none;
          padding: 0;
        }
        header {
          grid-column: 1 / -1;
          gap: 1pt;
          border-bottom-width: 1px;
          padding-bottom: 4pt;
          margin-bottom: 0;
        }
        .wide { grid-column: 1 / -1; }
        h1 { font-size: 13pt; line-height: 1.05; }
        h2 { margin-bottom: 3pt; font-size: 8pt; line-height: 1.1; }
        p { font-size: 7pt; line-height: 1.15; }
        section {
          gap: 3pt;
          border-radius: 3pt;
          padding: 4pt;
          margin: 0;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        dl { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3pt 5pt; }
        dt { font-size: 5.3pt; line-height: 1.05; }
        dd { margin-top: 1pt; font-size: 6.6pt; line-height: 1.12; }
        table { font-size: 5.8pt; line-height: 1.1; }
        th, td { padding: 2pt; }
        th { font-size: 5.2pt; }
        .signature-print-image { max-height: 45pt; }
        .print-actions { display: none; }
        footer { font-size: 5.6pt; padding-top: 3pt; }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="print-actions">
        <button onclick="window.print()">Print</button>
      </div>
      <header>
        <p class="brand">APPIA</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml([row?.worker_name, row?.company].filter(Boolean).join(" / "))}</p>
        ${submitted ? `<p>Submitted: ${escapeHtml(submitted)}</p>` : ""}
      </header>

      <section>
        <h2>Inspection Info</h2>
        <dl>
          ${definitionHtml("Project", header.project)}
          ${definitionHtml("Address", header.address)}
          ${definitionHtml("Area inspected", header.areaInspected)}
          ${definitionHtml("Date", header.date ? formatDateString(header.date) : "")}
          ${definitionHtml("Time", header.time)}
          ${definitionHtml("Inspector", header.inspector)}
          ${definitionHtml("Trades present", header.tradesPresent)}
          ${definitionHtml("Reviewer", header.reviewer)}
        </dl>
      </section>

      <section>
        <h2>Observations</h2>
        <dl>
          ${definitionHtml("Positive", observations.positive)}
          ${definitionHtml("High-risk work", observations.highRiskWork)}
          ${definitionHtml("Immediate controls", observations.immediateControls)}
          ${definitionHtml("Follow-up", observations.followUpNotes)}
        </dl>
      </section>

      <section class="wide">
        <h2>Deficiencies</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Category</th>
              <th>Location</th>
              <th>Priority</th>
              <th>Description</th>
              <th>Immediate Control</th>
              <th>Corrective Action</th>
            </tr>
          </thead>
          <tbody>${deficiencyRows}</tbody>
        </table>
      </section>

      ${genericSectionHtml}
      <footer>Submission ${escapeHtml(row?.id || "-")} / ${submitted ? escapeHtml(submitted) : "Not submitted"}</footer>
    </main>
    ${options.autoPrint ? "<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 250); });</script>" : ""}
  </body>
</html>`;
}

function definitionHtml(label, value) {
  const displayValue = value === null || value === undefined || value === "" ? "-" : String(value);
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(displayValue)}</dd></div>`;
}

function actionItemRowsDefinitionHtml(field, block) {
  const settings = normalizeActionItemRowsSettings(field.settings, field.type);
  const value = normalizeActionItemBlockValue(block);
  if (value.noItems) return `<p>${escapeHtml(settings.noneLabel)}</p>`;
  const rows = Array.isArray(block?.rows) ? block.rows : [];
  if (!rows.length) return `<p>No action items recorded.</p>`;
  const visibleFields = visibleActionItemRowFields(settings);
  return rows.map((row, index) => `
    <div class="action-row">
      <h3>${escapeHtml(row.description || `${settings.rowLabel} ${index + 1}`)}</h3>
      <dl>
        ${visibleFields.map((subfield) =>
          definitionHtml(subfield.label, formatActionItemRowFieldDisplay(subfield.key, row[subfield.key])),
        ).join("")}
      </dl>
    </div>`).join("");
}

function signatureDefinitionHtml(label, value) {
  const src = cleanSignatureDataUrl(value);
  if (!src) return definitionHtml(label, "-");
  const safeLabel = escapeHtml(label || "Signature");
  return `<div><dt>${safeLabel}</dt><dd><img class="signature-print-image" alt="${safeLabel} signature" src="${src}" /></dd></div>`;
}

function slugifyFilePart(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "form";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function getCheckedInCompanyOptions(rows) {
  return [...new Set(
    rows
      .filter(isSignedIn)
      .map((row) => String(row.company || "").trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
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
