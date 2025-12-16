import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {

  if (req.method !== "POST") return res.status(405).end();

  const { steam_id } = req.body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ✅ Find auth cookie
  const cookie = Object.values(req.cookies)
    .find(v => v?.includes("access_token"));

  if (!cookie) return res.status(401).json({ error: "Not authenticated" });

  const session = JSON.parse(decodeURIComponent(cookie));
  const accessToken = session.access_token;

  // ✅ Validate user
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid session" });
  }

  const user = data.user;

  // ✅ Disable ONLY user's site
  const { error: dbError } = await supabase
    .from("generated_sites")
    .update({ is_active: false })
    .eq("steam_id", steam_id)
    .eq("owner_id", user.id)
    .eq("is_active", true);

  if (dbError) {
    return res.status(500).json({ error: dbError.message });
  }

  // ✅ ACTIVITY LOG — USER DISABLE
  await supabase.from("activity_logs").insert({
    actor_id: user.id,
    actor_role: "user",
    action: "DISABLE_SITE",
    target: steam_id,
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress
  });

  res.json({ success: true });
}
