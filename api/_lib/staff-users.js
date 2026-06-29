import {
  getSupabaseServiceClient,
  throwIfSupabaseError,
} from "./supabase.js";

const STAFF_ROLES = ["owner", "admin", "staff"];
const STAFF_USER_SELECT =
  "id, auth_user_id, username, email, display_name, role, active, created_at, updated_at, created_by_staff_id, updated_by_staff_id, last_login_at";

export async function listStaffUsers({ search = "", role = "", active = "all" } = {}) {
  let query = getSupabaseServiceClient()
    .from("staff_profiles")
    .select(STAFF_USER_SELECT)
    .order("role", { ascending: true })
    .order("username", { ascending: true });

  if (STAFF_ROLES.includes(role)) query = query.eq("role", role);
  if (active === "true") query = query.eq("active", true);
  if (active === "false") query = query.eq("active", false);

  let rows = throwIfSupabaseError(await query, "Staff users could not be loaded.");
  const normalizedSearch = String(search || "").trim().toLowerCase();
  if (normalizedSearch) {
    rows = rows.filter((row) =>
      [row.username, row.email, row.display_name, row.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }
  return rows.map(publicStaffUser);
}

export async function createStaffUser(body, actor) {
  const cleaned = cleanStaffUserInput(body, { requirePassword: true });
  assertActorCanManageRole(actor, cleaned.role);

  const { data, error } = await getSupabaseServiceClient().auth.admin.createUser({
    email: cleaned.email,
    password: String(body.password),
    email_confirm: true,
    user_metadata: {
      username: cleaned.username,
      display_name: cleaned.display_name,
    },
  });
  if (error) throwAuthError(error, "Staff auth user could not be created.");

  try {
    const row = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("staff_profiles")
        .insert({
          auth_user_id: data.user.id,
          username: cleaned.username,
          email: cleaned.email,
          display_name: cleaned.display_name,
          role: cleaned.role,
          active: cleaned.active,
          created_by_staff_id: actor.id,
          updated_by_staff_id: actor.id,
        })
        .select(STAFF_USER_SELECT)
        .single(),
      "Staff profile could not be created.",
    );
    return publicStaffUser(row);
  } catch (error) {
    await getSupabaseServiceClient().auth.admin.deleteUser(data.user.id);
    throw error;
  }
}

export async function updateStaffUser(body, actor) {
  const id = cleanUuid(body?.id, "Staff user id is not valid.");
  const existing = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("staff_profiles")
      .select(STAFF_USER_SELECT)
      .eq("id", id)
      .maybeSingle(),
    "Staff user could not be loaded.",
  );
  if (!existing) {
    const error = new Error("Staff user was not found.");
    error.statusCode = 404;
    throw error;
  }

  if (existing.role === "owner" && actor.role !== "owner" && actor.id !== existing.id) {
    throwForbidden("Only an owner can change another owner account.");
  }

  const update = {};
  if (body?.username !== undefined) update.username = cleanUsername(body.username);
  if (body?.email !== undefined) update.email = cleanEmail(body.email);
  if (body?.display_name !== undefined) {
    update.display_name = cleanDisplayName(body.display_name, update.username || existing.username);
  }
  if (body?.role !== undefined) {
    update.role = cleanRole(body.role);
    assertActorCanManageRole(actor, update.role);
  }
  if (body?.active !== undefined) {
    update.active = Boolean(body.active);
    if (existing.id === actor.id && !update.active) {
      throwBadRequest("You cannot deactivate your own staff account.");
    }
  }

  const nextRole = update.role || existing.role;
  const nextActive = update.active === undefined ? existing.active : update.active;
  if (existing.role === "owner" && (nextRole !== "owner" || !nextActive)) {
    await assertAnotherActiveOwner(existing.id);
  }

  if (body?.password) {
    const password = String(body.password);
    if (password.length < 3) throwBadRequest("Password must be at least 3 characters.");
    const { error } = await getSupabaseServiceClient().auth.admin.updateUserById(
      existing.auth_user_id,
      { password },
    );
    if (error) throwAuthError(error, "Staff password could not be reset.");
  }

  const authUpdate = {};
  if (update.email && update.email !== existing.email) {
    authUpdate.email = update.email;
    authUpdate.email_confirm = true;
  }
  if (update.username || update.display_name) {
    authUpdate.user_metadata = {
      username: update.username || existing.username,
      display_name: update.display_name || existing.display_name || existing.username,
    };
  }
  if (Object.keys(authUpdate).length) {
    const { error } = await getSupabaseServiceClient().auth.admin.updateUserById(
      existing.auth_user_id,
      authUpdate,
    );
    if (error) throwAuthError(error, "Staff auth user could not be updated.");
  }

  if (!Object.keys(update).length) return publicStaffUser(existing);
  const row = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("staff_profiles")
      .update({
        ...update,
        updated_at: new Date().toISOString(),
        updated_by_staff_id: actor.id,
      })
      .eq("id", id)
      .select(STAFF_USER_SELECT)
      .single(),
    "Staff user could not be updated.",
  );
  return publicStaffUser(row);
}

export async function updateOwnStaffProfile(body, actor) {
  const existing = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("staff_profiles")
      .select(STAFF_USER_SELECT)
      .eq("id", actor.id)
      .maybeSingle(),
    "Staff profile could not be loaded.",
  );
  if (!existing) {
    const error = new Error("Staff profile was not found.");
    error.statusCode = 404;
    throw error;
  }

  const update = {};
  if (body?.username !== undefined) update.username = cleanUsername(body.username);
  if (body?.email !== undefined) update.email = cleanEmail(body.email);
  if (body?.display_name !== undefined) {
    update.display_name = cleanDisplayName(body.display_name, update.username || existing.username);
  }

  if (update.username && update.username !== existing.username) {
    const duplicate = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("staff_profiles")
        .select("id")
        .eq("username", update.username)
        .neq("id", existing.id)
        .maybeSingle(),
      "Staff username could not be checked.",
    );
    if (duplicate) throwConflict("That username is already in use.");
  }

  if (update.email && update.email !== existing.email) {
    const duplicate = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("staff_profiles")
        .select("id")
        .eq("email", update.email)
        .neq("id", existing.id)
        .maybeSingle(),
      "Staff email could not be checked.",
    );
    if (duplicate) throwConflict("That email is already in use.");
  }

  if (body?.password) {
    const password = String(body.password);
    if (password.length < 3) throwBadRequest("Password must be at least 3 characters.");
    const { error } = await getSupabaseServiceClient().auth.admin.updateUserById(
      existing.auth_user_id,
      { password },
    );
    if (error) throwAuthError(error, "Staff password could not be updated.");
  }

  const authUpdate = {};
  if (update.email && update.email !== existing.email) {
    authUpdate.email = update.email;
    authUpdate.email_confirm = true;
  }
  if (update.username || update.display_name) {
    authUpdate.user_metadata = {
      username: update.username || existing.username,
      display_name: update.display_name || existing.display_name || existing.username,
    };
  }
  if (Object.keys(authUpdate).length) {
    const { error } = await getSupabaseServiceClient().auth.admin.updateUserById(
      existing.auth_user_id,
      authUpdate,
    );
    if (error) throwAuthError(error, "Staff auth profile could not be updated.");
  }

  let row = existing;
  if (Object.keys(update).length) {
    row = throwIfSupabaseError(
      await getSupabaseServiceClient()
        .from("staff_profiles")
        .update({
          ...update,
          updated_at: new Date().toISOString(),
          updated_by_staff_id: actor.id,
        })
        .eq("id", existing.id)
        .select(STAFF_USER_SELECT)
        .single(),
      "Staff profile could not be updated.",
    );
  }
  return publicStaffUser(row);
}

function publicStaffUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    display_name: row.display_name || row.username,
    role: row.role,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_login_at: row.last_login_at,
  };
}

function cleanStaffUserInput(body, { requirePassword = false } = {}) {
  const username = cleanUsername(body?.username);
  const email = cleanEmail(body?.email);
  const displayName = cleanDisplayName(body?.display_name || body?.displayName, username);
  const password = String(body?.password || "");
  if (requirePassword && password.length < 3) {
    throwBadRequest("Password must be at least 3 characters.");
  }
  return {
    username,
    email,
    display_name: displayName,
    role: cleanRole(body?.role || "staff"),
    active: body?.active === undefined ? true : Boolean(body.active),
  };
}

function assertActorCanManageRole(actor, role) {
  if (role !== "owner") return;
  if (actor?.role === "owner") return;
  throwForbidden("Only an owner can create or assign owner accounts.");
}

async function assertAnotherActiveOwner(currentOwnerId) {
  const rows = throwIfSupabaseError(
    await getSupabaseServiceClient()
      .from("staff_profiles")
      .select("id")
      .eq("role", "owner")
      .eq("active", true),
    "Owner accounts could not be checked.",
  );
  if (rows.some((row) => row.id !== currentOwnerId)) return;
  throwBadRequest("At least one active owner account is required.");
}

function cleanUsername(value) {
  const username = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,64}$/.test(username)) {
    throwBadRequest("Username can use letters, numbers, dots, dashes, and underscores.");
  }
  return username;
}

function cleanEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throwBadRequest("Email address is not valid.");
  }
  return email;
}

function cleanDisplayName(value, fallback) {
  const displayName = String(value || fallback || "").trim();
  if (!displayName) throwBadRequest("Display name is required.");
  if (displayName.length > 120) throwBadRequest("Display name must be 120 characters or less.");
  return displayName;
}

function cleanRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (!STAFF_ROLES.includes(role)) throwBadRequest("Staff role is not valid.");
  return role;
}

function cleanUuid(value, message) {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
  return id;
}

function throwAuthError(error, fallbackMessage) {
  const next = new Error(error?.message || fallbackMessage);
  next.statusCode = /already|registered|exists/i.test(error?.message || "") ? 409 : 400;
  next.exposeMessage = true;
  throw next;
}

function throwBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.exposeMessage = true;
  throw error;
}

function throwForbidden(message) {
  const error = new Error(message);
  error.statusCode = 403;
  error.exposeMessage = true;
  throw error;
}

function throwConflict(message) {
  const error = new Error(message);
  error.statusCode = 409;
  error.exposeMessage = true;
  throw error;
}
