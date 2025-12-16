import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { steamID, accountStatus, reports } = req.body;

  if (!steamID || !accountStatus)
    return res.status(400).json({ error: "Missing fields." });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // FETCH AUTH COOKIE
  const cookie = Object.values(req.cookies).find(v => v?.includes("access_token"));
  if (!cookie) return res.status(401).json({ error: "Not logged in." });

  const session = JSON.parse(decodeURIComponent(cookie));
  const { data: authData } = await supabase.auth.getUser(session.access_token);

  if (!authData?.user) {
    return res.status(401).json({ error: "Invalid session." });
  }

  const user = authData.user;

  // Fetch tidio
  const { data: profile } = await supabase
    .from("profiles")
    .select("tidio_id")
    .eq("id", user.id)
    .single();

  // INSERT NEW SITE
  const { data: inserted, error: dbError } = await supabase
    .from("generated_sites")
    .insert([
      {
        steam_id: steamID,
        account_status: accountStatus,
        reports: Number(reports),
        owner_id: user.id,
        tidio_id: profile?.tidio_id || null,
        is_active: true,
        recovery_enabled: false // default = OFF
      }
    ])
    .select()
    .single(); // <- important! returns back the created row

  if (dbError) {
    if (dbError.code === "23505") {
      return res.status(409).json({ error: "Steam ID already registered." });
    }
    return res.status(500).json({ error: dbError.message });
  }

  // LOG ACTIVITY
  await supabase.from("activity_logs").insert({
    actor_id: user.id,
    actor_role: "user",
    action: "CREATE_SITE",
    target: steamID,
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress
  });

  return res.json({ success: true, site: inserted });
}
