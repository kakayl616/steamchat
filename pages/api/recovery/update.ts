// pages/api/recovery/update.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    id,
    status,
    added_funds = 0,
    refund_amount = 0,
    currency = "usd"
  } = req.body;

  if (!id || !status) return res.status(400).json({ error: "Missing fields." });

  // authenticate admin (reuse cookie)
  const cookie = Object.values(req.cookies).find(v => v?.includes("access_token"));
  if (!cookie) return res.status(401).json({ error: "Not authenticated" });
  const session = JSON.parse(decodeURIComponent(cookie));
  const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await supabaseAuth.auth.getUser(session.access_token);
  if (!data?.user) return res.status(401).json({ error: "Invalid session" });
  const adminId = data.user.id;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {

    // Fetch BEFORE state (FOR AUDIT LOG)
const { data: beforeRow, error: beforeError } = await supabase
  .from("recovery_submissions")
  .select("*")
  .eq("id", id)
  .single();

if (beforeError || !beforeRow) {
  return res.status(500).json({ error: "Failed to fetch recovery before state." });
}


    // Apply update
const { data: afterRow, error: updateError } = await supabase
  .from("recovery_submissions")
  .update({
    status,
    added_funds,
    refund_amount,
    currency,
    admin_id: adminId
  })
  .eq("id", id)
  .select()
  .single();

if (updateError || !afterRow) {
  return res.status(500).json({ error: updateError?.message || "Update failed" });
}

// Write audit log
await supabase.from("admin_audit_logs").insert({
  admin_id: adminId,
  admin_email: data.user.email,
  action: `RECOVERY_${status.toUpperCase()}`,
  entity_type: "recovery_submission",
  entity_id: id,
  before_state: beforeRow,
  after_state: afterRow
});



    // If approved/completed, apply funds to the generated_sites (increment balance)
    if (status === "approved" || status === "completed") {
      // fetch the submission to learn steam_id
      const { data: subRows, error: fetchErr } = await supabase
        .from("recovery_submissions")
        .select("steam_id, added_funds, refund_amount")
        .eq("id", id)
        .single();

      if (fetchErr) {
        console.error("FETCH SUB ERROR:", fetchErr);
      } else {
        const steamId = subRows?.steam_id;
        const addAmount = Number(subRows?.added_funds || 0);
        const refundAmount = Number(subRows?.refund_amount || 0);
        // fetch current site row
        const { data: siteRow, error: siteErr } = await supabase
          .from("generated_sites")
          .select("id, balance")
          .eq("steam_id", steamId)
          .eq("is_active", true)
          .single();

        if (siteErr) {
          console.error("FETCH SITE ERROR:", siteErr);
        } else {
          // compute new balance (add added_funds and subtract refund if you want)
          const currentBalance = Number(siteRow.balance || 0);
          const newBalance = currentBalance + addAmount - refundAmount;

          const { error: siteUpdateErr } = await supabase
            .from("generated_sites")
            .update({ balance: newBalance })
            .eq("id", siteRow.id);

          if (siteUpdateErr) {
            console.error("SITE UPDATE ERROR:", siteUpdateErr);
          } else {
            console.log(`Applied funds to site ${steamId}: +${addAmount} -${refundAmount}, newBalance=${newBalance}`);
          }
        }
      }
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("UNEXPECTED ERROR:", err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
