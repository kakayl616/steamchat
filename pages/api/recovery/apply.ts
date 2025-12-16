import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Invalid method" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { steamID, added_funds, refund_amount, currency } = req.body;

  // Fetch user's current totals
  const { data: existing } = await supabase
    .from("recovery_summary")
    .select("*")
    .eq("steam_id", steamID)
    .single();

  const newTotals = {
    total_added_funds:
      (existing?.total_added_funds || 0) + (added_funds || 0),
    total_refund:
      (existing?.total_refund || 0) + (refund_amount || 0),
    currency: currency || existing?.currency || "usd",
  };

  const { error } = await supabase
    .from("recovery_summary")
    .upsert({
      steam_id: steamID,
      ...newTotals,
    });

  if (error)
    return res.json({ success: false, error: error.message });

  return res.json({ success: true });
}
