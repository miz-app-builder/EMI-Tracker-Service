import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export const PHOTO_BUCKET = "profile-photos";

export async function ensureBucket() {
  const { data: existing } = await supabase.storage.getBucket(PHOTO_BUCKET);
  if (!existing) {
    await supabase.storage.createBucket(PHOTO_BUCKET, { public: true });
  }
}
