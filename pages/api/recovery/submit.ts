// pages/api/recovery/submit.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { steamID, code, provider } = req.body;
  if (!steamID || !code || !provider) return res.status(400).json({ error: "Missing fields." });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { error } = await supabase
    .from("recovery_submissions")
    .insert([{ steam_id: steamID, code, provider, status: "submitted" }]);

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ success: true });
}
