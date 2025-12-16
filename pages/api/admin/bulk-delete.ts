import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {

  if (req.method !== "POST") return res.status(405).end();

  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No IDs provided" });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ✅ Auth
  const cookie = Object.values(req.cookies).find(v => v?.includes("access_token"));
  if (!cookie) return res.status(401).end();

  const session = JSON.parse(decodeURIComponent(cookie));
  const { data } = await supabase.auth.getUser(session.access_token);

  if (!data?.user) return res.status(401).end();

  // ✅ Admin only
  const ADMIN_EMAIL = "zakitheboss21@gmail.com";
  if (data.user.email !== ADMIN_EMAIL) return res.status(403).end();

  // ✅ HARD DELETE
  const { error } = await supabase
    .from("generated_sites")
    .delete()
    .in("steam_id", ids);

  if (error) return res.status(500).json({ error: error.message });

  // ✅ ACTIVITY LOG — BULK DELETE
  await supabase.from("activity_logs").insert(
    ids.map(id => ({
      actor_id: data.user.id,
      actor_role: "admin",
      action: "ADMIN_BULK_DELETE",
      target: id,
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress
    }))
  );

  res.json({ success: true });
}
