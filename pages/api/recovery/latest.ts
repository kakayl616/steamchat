import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { steamID } = req.query;

  if (!steamID) {
    return res.status(400).json({ success: false, error: "Missing steamID" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("recovery_submissions")
    .select("*")
    .eq("steam_id", steamID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.json({
    success: true,
    submission: data || null
  });
}
