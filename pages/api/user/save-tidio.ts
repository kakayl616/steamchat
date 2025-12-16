import { createClient } from "@supabase/supabase-js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { tidio } = req.body

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ✅ Get auth cookie
  const cookie = Object.values(req.cookies)
    .find(v => v?.includes("access_token"))

  if (!cookie) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  const session = JSON.parse(decodeURIComponent(cookie))
  const accessToken = session.access_token

  // ✅ Get user
  const { data: userData, error } = await supabase.auth.getUser(accessToken)

  if (error || !userData?.user) {
    return res.status(401).json({ error: "Invalid session" })
  }

  const user = userData.user

  // ✅ Validate ID
  if (!/^[a-z0-9]{20,40}$/i.test(tidio)) {
    return res.status(400).json({ error: "Invalid Tidio ID" })
  }

  // ✅ Save ID
  await supabase
    .from("profiles")
    .update({ tidio_id: tidio })
    .eq("id", user.id)

  res.json({ success: true })
}
