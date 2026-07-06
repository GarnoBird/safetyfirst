export const STAFF_PASSWORD_MIN_LENGTH = 12;
export const WORKER_PASSWORD_MIN_LENGTH = 8;

export function validateStaffPassword(password) {
  validatePassword(password, STAFF_PASSWORD_MIN_LENGTH, "Staff password");
}

export function validateWorkerPassword(password) {
  validatePassword(password, WORKER_PASSWORD_MIN_LENGTH, "Worker password");
}

function validatePassword(password, minLength, label) {
  const value = String(password || "");
  if (!value.trim() || value.length < minLength) {
    const error = new Error(`${label} must be at least ${minLength} characters.`);
    error.statusCode = 400;
    error.exposeMessage = true;
    throw error;
  }
}
