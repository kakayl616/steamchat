import { createClient } from "@supabase/supabase-js";
import { GetServerSidePropsContext } from "next";

export async function requireAuth(
  ctx: GetServerSidePropsContext,
  requireAdmin = false
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find Supabase cookie
  const supabaseCookie = Object.values(ctx.req.cookies)
    .find(v => v?.includes("access_token"));

  if (!supabaseCookie) {
    return { redirect: "/login" };
  }

  // Decode JSON cookie
  const session = JSON.parse(decodeURIComponent(supabaseCookie));
  const accessToken = session.access_token;

  // Validate user
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data?.user) {
    return { redirect: "/login" };
  }

  // Admin-only check
  const ADMIN_EMAIL = "zakitheboss21@example.com";

  if (requireAdmin && data.user.email !== ADMIN_EMAIL) {
    return { redirect: "/dashboard" };
  }

  return { user: data.user };
}
