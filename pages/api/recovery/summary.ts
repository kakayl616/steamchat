// pages/api/recovery/summary.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { steamID } = req.query;
  if (!steamID) return res.status(400).json({ error: "Missing steamID" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all submissions for user
  const { data, error } = await supabase
    .from("recovery_submissions")
    .select("added_funds, refund_amount, status, currency")
    .eq("steam_id", steamID);

  if (error) return res.status(500).json({ error: error.message });

  let totalFunds = 0;
  let totalRefund = 0;
  let currency = "usd";

  data.forEach((row) => {
    if (row.status === "approved" || row.status === "completed") {
      totalFunds += row.added_funds || 0;
      totalRefund += row.refund_amount || 0;
      currency = row.currency || currency;
    }
  });

  return res.json({
    success: true,
    totalFunds,
    totalRefund,
    currency,
  });
}
