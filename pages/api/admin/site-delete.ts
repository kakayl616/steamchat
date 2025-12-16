import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {

  if (req.method !== "POST") return res.status(405).end();

  const { steam_id } = req.body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ✅ Auth cookie
  const cookie = Object.values(req.cookies).find(v => v?.includes("access_token"));
  if (!cookie) return res.status(401).end();

  const session = JSON.parse(decodeURIComponent(cookie));
  const { data } = await supabase.auth.getUser(session.access_token);

  if (!data?.user) return res.status(401).end();

  // ✅ Admin only
  const ADMIN_EMAIL = "zakitheboss21@gmail.com";
  if (data.user.email !== ADMIN_EMAIL) return res.status(403).end();

  // ✅ DELETE SITE
  await supabase
    .from("generated_sites")
    .delete()
    .eq("steam_id", steam_id);

  // ✅ ACTIVITY LOG — ADMIN DELETE
  await supabase.from("activity_logs").insert({
    actor_id: data.user.id,
    actor_role: "admin",
    action: "ADMIN_DELETE_SITE",
    target: steam_id,
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress
  });

  res.json({ success: true });
}
