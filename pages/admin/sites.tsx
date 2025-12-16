import AdminLayout from "../../components/AdminLayout";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { GetServerSidePropsContext } from "next";

export default function AdminSites({ sites }: any) {
  return (
    <AdminLayout>
      <h1 style={{ color: "#66c0f4" }}>Generated Sites</h1>

      <table style={{ width: "100%", marginTop: "2rem", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#16222f", color: "#66c0f4" }}>
            <th>Steam ID</th>
            <th>Status</th>
            <th>Reports</th>
            <th>Active</th>
            <th>Created</th>
            <th>Open</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site: any) => (
            <tr key={site.id}>
              <td>{site.steam_id}</td>
              <td>{site.account_status}</td>
              <td>{site.reports}</td>
              <td>{site.is_active ? "Active" : "Deleted"}</td>
              <td>{new Date(site.created_at).toLocaleString()}</td>
              <td>
                {site.is_active ? (
                  <Link href={`/profile/${site.steam_id}`} style={{ color: "#66c0f4" }}>
                    Open
                  </Link>
                ) : "N/A"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminLayout>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ✅ Find auth cookie
  const cookie = Object.values(ctx.req.cookies)
    .find(v => v?.includes("access_token"));

  if (!cookie) {
    return {
      redirect: { destination: "/login", permanent: false }
    };
  }

  const session = JSON.parse(decodeURIComponent(cookie));
  const token = session.access_token;

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  // ✅ Admin only
  const ADMIN_EMAIL = "YOUR_EMAIL_HERE";

  if (data.user.email !== ADMIN_EMAIL) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }

  // ✅ Fetch sites
  const { data: sites, error: dbError } = await supabase
    .from("generated_sites")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    props: { sites: sites || [] }
  };
}
