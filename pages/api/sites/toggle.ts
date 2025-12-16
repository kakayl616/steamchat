import { createClient } from "@supabase/supabase-js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()
  const { steam_id, enable } = req.body

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cookie = Object.values(req.cookies).find(v => v?.includes("access_token"))
  if (!cookie) return res.status(401).end()

  const session = JSON.parse(decodeURIComponent(cookie))
  const { data } = await supabase.auth.getUser(session.access_token)
  if (!data?.user) return res.status(401).end()

  await supabase
    .from("generated_sites")
    .update({ is_active: enable })
    .eq("steam_id", steam_id)
    .eq("owner_id", data.user.id)

  // log
  await supabase.from("activity_logs").insert({
    user_id: data.user.id,
    action: enable ? "ENABLE_SITE" : "DISABLE_SITE",
    target: steam_id
  })

  res.json({ success: true })
}
