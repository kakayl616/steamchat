import Link from "next/link";
import { GetServerSidePropsContext } from "next";
import { createClient } from "@supabase/supabase-js";
import { useState } from "react";

function formatPH(dateStr: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(new Date(dateStr));
}

export default function Dashboard({ user, sites, tidio_id, logs = [] }: any) {

  const [tidio, setTidio] = useState(tidio_id || "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string>("");

  async function saveTidio() {
    setStatus("");
    if (!/^[a-z0-9]{20,40}$/i.test(tidio)) {
      setStatus("❌ Invalid Tidio widget ID");
      return;
    }

    setSaving(true);
    await fetch("/api/user/save-tidio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tidio })
    });
    setSaving(false);
    setStatus("✅ Chat connected");
  }

  async function toggleSite(steam_id: string, enable: boolean) {
    await fetch("/api/sites/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steam_id, enable })
    });
    location.reload();
  }

  async function toggleRecovery(steam_id: string, enabled: boolean) {
    await fetch("/api/toggle-recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steam_id, enabled })
    });
    location.reload();
  }

  async function logout() {
    await fetch("/api/user/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const total = sites.length;
  const active = sites.filter((s: any) => s.is_active).length;
  const disabled = total - active;

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 1000, margin: "auto" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>Dashboard</h1>
            <p style={{ opacity: .7 }}>Signed in as <strong>{user.email}</strong></p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/admin"><button>Admin</button></Link>
            <button onClick={logout}>Logout</button>
          </div>
        </div>

        <hr style={{ margin: "18px 0" }} />

        {/* STATS */}
        <section>
          <h2>Overview</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
            marginTop: 8
          }}>
            <div className="card">Total Sites<br /><strong>{total}</strong></div>
            <div className="card">Active<br /><strong style={{ color: "#34d399" }}>{active}</strong></div>
            <div className="card">Disabled<br /><strong style={{ color: "#f87171" }}>{disabled}</strong></div>
          </div>
        </section>

        <hr style={{ margin: "22px 0" }} />

        {/* CHAT */}
        <section>
          <h2>Chat System</h2>
          <p style={{ opacity: .7 }}>Connect your Tidio widget.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={tidio}
              onChange={e => setTidio(e.target.value)}
              placeholder="Tidio Widget ID"
              style={{ flex: 1 }}
            />
            <button disabled={saving} onClick={saveTidio}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          {status &&
            <p style={{ marginTop: 6, color: status.includes("✅") ? "#34d399" : "#f87171" }}>
              {status}
            </p>
          }
        </section>

        <hr style={{ margin: "22px 0" }} />

        {/* WEBSITES */}
        <section>
          <h2>Your Websites</h2>

          {sites.length === 0 && <p style={{ opacity: .6 }}>No sites yet.</p>}

          <div style={{ display: "grid", gap: 10 }}>
            {sites.map((site: any) => (
              <div key={site.id} style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto auto",
                alignItems: "center",
                gap: 12,
                border: "1px solid #1f2933",
                borderRadius: 6,
                padding: 10
              }}>

                <Link href={`/profile/${site.steam_id}`}>{site.steam_id}</Link>

                <small style={{ opacity: .7 }}>
                  {site.created_at ? formatPH(site.created_at) : "—"}
                </small>

                <span>{site.is_active ? "🟢 Active" : "🔴 Disabled"}</span>

                <button onClick={() => toggleSite(site.steam_id, !site.is_active)}>
                  {site.is_active ? "Disable" : "Enable"}
                </button>

                {/* RECOVERY TOGGLE BUTTON */}
                <button
                  onClick={() => toggleRecovery(site.steam_id, !site.recovery_enabled)}
                  style={{
                    background: site.recovery_enabled ? "#f87171" : "#34d399",
                    color: "white",
                    padding: "6px 10px",
                    borderRadius: "6px"
                  }}
                >
                  {site.recovery_enabled ? "Disable Recovery" : "Enable Recovery"}
                </button>

              </div>
            ))}
          </div>
        </section>

        <hr style={{ margin: "22px 0" }} />

        {/* ACTIVITY LOG */}
        <section>
          <h2>Activity Log</h2>
          {logs.length === 0 && <p style={{ opacity: .6 }}>No activity yet.</p>}

          <ul style={{ marginLeft: 16 }}>
            {logs.map((l: any) => (
              <li key={l.id}>
                <strong>{l.action}</strong> — {l.target || ""} <em>({formatPH(l.created_at)})</em>
              </li>
            ))}
          </ul>
        </section>

      </div>
    </div>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const cookie = Object.values(ctx.req.cookies).find(val => val?.includes("access_token"));
  if (!cookie) return { redirect: { destination: "/login", permanent: false } };

  const session = JSON.parse(decodeURIComponent(cookie));
  const { data } = await supabase.auth.getUser(session.access_token);
  if (!data?.user) return { redirect: { destination: "/login", permanent: false } };

  const user = data.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tidio_id")
    .eq("id", user.id)
    .single();

  // ⭐ IMPORTANT: INCLUDE recovery_enabled
  const { data: sites } = await supabase
    .from("generated_sites")
    .select("*, recovery_enabled")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  return {
    props: {
      user,
      sites: sites || [],
      tidio_id: profile?.tidio_id || "",
      logs: logs || []
    }
  };
}
