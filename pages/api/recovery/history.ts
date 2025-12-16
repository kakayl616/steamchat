import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { steamID } = req.query;

  const { data, error } = await supabase
    .from("recovery_submissions")
    .select("*")
    .eq("steam_id", steamID)
    .order("created_at", { ascending: false });

  if (error) return res.json({ success: false, error });

  return res.json({ success: true, history: data });
}
