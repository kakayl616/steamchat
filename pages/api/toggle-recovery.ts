import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { steam_id, enabled } = req.body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("generated_sites")
    .update({ recovery_enabled: enabled })
    .eq("steam_id", steam_id);

  if (error) return res.status(500).json({ error });

  res.json({ success: true });
}
