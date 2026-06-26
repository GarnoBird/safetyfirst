import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const username = process.env.SEED_STAFF_USERNAME || "lbird";
const email = process.env.SEED_STAFF_EMAIL || "garnobird@gmail.com";
const password = process.env.SEED_STAFF_PASSWORD || "123";
const displayName = process.env.SEED_STAFF_DISPLAY_NAME || "Garnet Bird";
const role = process.env.SEED_STAFF_ROLE || "owner";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data: created, error: createError } =
  await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

let authUserId = created?.user?.id;

if (createError && !String(createError.message).includes("already registered")) {
  console.error(createError.message);
  process.exit(1);
}

if (!authUserId) {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error(listError.message);
    process.exit(1);
  }

  const existing = users.users.find((user) => user.email === email);
  if (!existing) {
    console.error(`Could not find existing staff auth user for ${email}.`);
    process.exit(1);
  }

  authUserId = existing.id;
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    authUserId,
    {
      password,
      email_confirm: true,
      user_metadata: { username },
    },
  );
  if (updateError) {
    console.error(updateError.message);
    process.exit(1);
  }
}

const { error: profileError } = await supabase.from("staff_profiles").upsert(
  {
    auth_user_id: authUserId,
    username,
    email,
    display_name: displayName,
    role,
    active: true,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "username" },
);

if (profileError) {
  console.error(profileError.message);
  process.exit(1);
}

console.log(`Seeded staff user ${username} <${email}>.`);
