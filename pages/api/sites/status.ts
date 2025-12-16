import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const steamID = req.query.steamID as string;

  if (!steamID) {
    return res.status(400).json({ success: false });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("generated_sites")
    .select("is_active, recovery_enabled")
    .eq("steam_id", steamID)
    .single();

  if (error || !data) {
    return res.json({ success: false });
  }

  return res.json({
    success: true,
    is_active: data.is_active,
    recovery_enabled: data.recovery_enabled
  });
}
