// pages/api/recovery/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // restrict to GET
  if (req.method !== "GET") return res.status(405).end();

  // basic auth check: reuse your existing cookie/session approach
  const cookie = Object.values(req.cookies).find(v => v?.includes("access_token"));
  if (!cookie) return res.status(401).json({ error: "Not authenticated" });

  const session = JSON.parse(decodeURIComponent(cookie));
  const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await supabaseAuth.auth.getUser(session.access_token);
  if (!data?.user) return res.status(401).json({ error: "Invalid session" });

  // Use service role to read all submissions
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: rows, error } = await supabase
    .from("recovery_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, submissions: rows });
}
