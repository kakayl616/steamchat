import AdminLayout from "../components/AdminLayout";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { GetServerSidePropsContext } from "next";
import { useState, useEffect } from "react";

// 🇵🇭 Philippines date/time
function formatPH(dateStr: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(dateStr));
}

/* -----------------------------------------------------------
   RECOVERY ADMIN PANEL – MUST BE ABOVE the default component
------------------------------------------------------------ */
function RecoveryAdminPanel() {
  const [submissions, setSubmissions] = useState([]);

  async function load() {
    const res = await fetch("/api/recovery/list");
    const json = await res.json();
    if (json.success) setSubmissions(json.submissions);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id, newStatus, row) {
    // 1) Update submission row
    const res = await fetch("/api/recovery/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status: newStatus,
        added_funds: row.added_funds,
        refund_amount: row.refund_amount,
        currency: row.currency
      }),
    });

    const json = await res.json();
    if (!json.success) {
      alert("Failed to update: " + json.error);

      return;
    }

    // 2) Apply funds permanently if approved
    if (newStatus === "approved") {
      const res2 = await fetch("/api/recovery/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steamID: row.steam_id,
          added_funds: row.added_funds,
          refund_amount: row.refund_amount,
          currency: row.currency
        }),
      });

      const json2 = await res2.json();
      if (!json2.success) {
        alert("Failed to apply funds: " + json2.error);
        return;
      }
    }

    alert("Updated successfully!");
    load();
  }

  return (
    <div style={{ marginTop: 20 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#16222f", color: "#66c0f4" }}>
            <th style={th}>Steam ID</th>
            <th style={th}>Provider</th>
            <th style={th}>Code</th>
            <th style={th}>Status</th>
            <th style={th}>Currency</th>
            <th style={th}>Add Funds</th>
            <th style={th}>Refund</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {submissions.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #1f2933" }}>
              
              <td style={td}>{s.steam_id}</td>
              <td style={td}>{s.provider}</td>
              <td style={td}>{s.code}</td>
              <td style={td}>{s.status}</td>

              {/* Currency */}
              <td style={td}>
                <select
                  value={s.currency || "usd"}
                  onChange={(e) =>
                    setSubmissions((prev) =>
                      prev.map((x) =>
                        x.id === s.id ? { ...x, currency: e.target.value } : x
                      )
                    )
                  }
                >
                  <option value="usd">USD ($)</option>
                  <option value="eur">EUR (€)</option>
                  <option value="php">PHP (₱)</option>
                </select>
              </td>

              {/* Add funds */}
              <td style={td}>
                <input
                  type="number"
                  value={s.added_funds || 0}
                  onChange={(e) =>
                    setSubmissions((prev) =>
                      prev.map((x) =>
                        x.id === s.id
                          ? { ...x, added_funds: Number(e.target.value) }
                          : x
                      )
                    )
                  }
                />
              </td>

              {/* Refund */}
              <td style={td}>
                <input
                  type="number"
                  value={s.refund_amount || 0}
                  onChange={(e) =>
                    setSubmissions((prev) =>
                      prev.map((x) =>
                        x.id === s.id
                          ? { ...x, refund_amount: Number(e.target.value) }
                          : x
                      )
                    )
                  }
                />
              </td>

              <td style={td}>
                <button onClick={() => updateStatus(s.id, "approved", s)}>Approve</button>
                <button onClick={() => updateStatus(s.id, "rejected", s)}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


/* -----------------------------------------------------------
   MAIN ADMIN COMPONENT
------------------------------------------------------------ */
export default function AdminSites({ sites = [], logs = [] }: any) {

  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleOne(id: string) {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  }

  function toggleAll(e: any) {
    if (e.target.checked) {
      setSelected(new Set(sites.map((s: any) => s.steam_id)));
    } else setSelected(new Set());
  }

  async function bulk(enable: boolean) {
    if (selected.size === 0) return alert("No sites selected");

    await fetch("/api/admin/bulk-toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), enable }),
    });

    location.reload();
  }

  async function bulkDelete() {
    if (selected.size === 0) return alert("No sites selected");
    if (!confirm(`Delete ${selected.size} sites PERMANENTLY?`)) return;

    await fetch("/api/admin/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });

    location.reload();
  }

  async function toggleSite(steam_id: string, enable: boolean) {
    await fetch("/api/admin/site-toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steam_id, enable }),
    });
    location.reload();
  }

  async function deleteSite(steam_id: string) {
    if (!confirm(`Delete permanently?\n\n${steam_id}`)) return;

    await fetch("/api/admin/site-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steam_id }),
    });

    location.reload();
  }

  return (
    <AdminLayout>

      <h1 style={{ color: "#66c0f4" }}>Admin — Generated Websites</h1>
      <p style={{ opacity: 0.7 }}>Total: {sites.length}</p>

      {/* BULK ACTION BAR */}
      <div style={{ display: "flex", gap: "8px", margin: "15px 0" }}>
        <button onClick={() => bulk(true)}>Enable Selected</button>
        <button onClick={() => bulk(false)}>Disable Selected</button>
        <button style={{ background: "#ef4444" }} onClick={bulkDelete}>
          Delete Selected
        </button>
        <span style={{ opacity: 0.6 }}>{selected.size} selected</span>
      </div>

      {/* WEBSITE LIST */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #1f2933" }}>
          <thead>
            <tr style={{ background: "#16222f", color: "#66c0f4" }}>
              <th style={th}><input type="checkbox" onChange={toggleAll} /></th>
              <th style={th}>Steam ID</th>
              <th style={th}>Status</th>
              <th style={th}>Reports</th>
              <th style={th}>Live</th>
              <th style={th}>Created</th>
              <th style={th}>Open</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {sites.map((site: any) => (
              <tr key={site.id} style={{ borderBottom: "1px solid #1f2933" }}>
                <td style={td}>
                  <input
                    type="checkbox"
                    checked={selected.has(site.steam_id)}
                    onChange={() => toggleOne(site.steam_id)}
                  />
                </td>

                <td style={td}>{site.steam_id}</td>
                <td style={td}>{site.account_status}</td>
                <td style={td}>{site.reports}</td>

                <td style={{ ...td, color: site.is_active ? "#34d399" : "#f87171" }}>
                  {site.is_active ? "Active" : "Disabled"}
                </td>

                <td style={td}>
                  {site.created_at ? formatPH(site.created_at) : "—"}
                </td>

                <td style={td}>
                  {site.is_active ? (
                    <Link href={`/profile/${site.steam_id}`} style={{ color: "#66c0f4" }}>
                      Open
                    </Link>
                  ) : (
                    <span style={{ opacity: 0.4 }}>N/A</span>
                  )}
                </td>

                <td style={td}>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => toggleSite(site.steam_id, !site.is_active)}
                      style={{
                        background: site.is_active ? "#f59e0b" : "#22c55e",
                        border: "none",
                        padding: "5px 10px",
                        cursor: "pointer"
                      }}
                    >
                      {site.is_active ? "Disable" : "Enable"}
                    </button>

                    <button
                      onClick={() => deleteSite(site.steam_id)}
                      style={{
                        background: "#ef4444",
                        border: "none",
                        padding: "5px 10px",
                        cursor: "pointer",
                        color: "white"
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ACTIVITY LOG */}
      <hr style={{ margin: "25px 0" }} />
      <h2 style={{ color: "#66c0f4" }}>System Activity</h2>

      <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid #1f2933" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#16222f", color: "#66c0f4" }}>
              <th style={th}>Role</th>
              <th style={th}>Action</th>
              <th style={th}>Target</th>
              <th style={th}>Time (PH)</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log: any) => (
              <tr key={log.id}>
                <td style={td}>{log.actor_role}</td>
                <td style={td}>{log.action}</td>
                <td style={td}>{log.target || "—"}</td>
                <td style={td}>{formatPH(log.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RECOVERY SUBMISSIONS */}
      <hr style={{ margin: "30px 0" }} />
      <h2 style={{ color: "#66c0f4" }}>Recovery Submissions</h2>

      <RecoveryAdminPanel />

    </AdminLayout>
  );
}

/* -----------------------------------------------------------
   SERVER SIDE PROPS
------------------------------------------------------------ */
const th = { padding: "8px", textAlign: "left", borderBottom: "1px solid #1f2933" };
const td = { padding: "8px" };

export async function getServerSideProps(ctx: GetServerSidePropsContext) {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const cookie = Object.values(ctx.req.cookies).find(v => v?.includes("access_token"));
  if (!cookie) return { redirect: { destination: "/login", permanent: false } };

  const session = JSON.parse(decodeURIComponent(cookie));
  const { data } = await supabase.auth.getUser(session.access_token);
  if (!data?.user) return { redirect: { destination: "/login", permanent: false } };

  const ADMIN_EMAIL = "zakitheboss21@gmail.com";
  if (data.user.email !== ADMIN_EMAIL) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }

  const { data: sites } = await supabase
    .from("generated_sites")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return {
    props: {
      sites: sites || [],
      logs: logs || []
    }
  };
}
