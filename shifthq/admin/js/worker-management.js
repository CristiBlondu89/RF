import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const origin = Deno.env.get("APP_ORIGIN") ?? "https://rusticflight.com";
const cors = { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const companyId = String(body.company_id ?? "");
    const action = String(body.action ?? "");
    const { data: membership, error: membershipError } = await userClient.from("company_members").select("role,active").eq("company_id", companyId).eq("user_id", user.id).maybeSingle();
    if (membershipError) {
      console.error("Membership lookup failed:", membershipError);
      return json({ error: `Could not verify admin membership: ${membershipError.message}` }, 403);
    }
    if (!membership || membership.role !== "admin" || membership.active !== true) return json({ error: "You are not an active admin of this company" }, 403);

    if (action === "list") {
      const result = await admin.from("invitations").select("id,email,full_name,created_at,expires_at").eq("company_id", companyId).is("accepted_at", null).order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return json({ invitations: result.data });
    }

    if (action === "cancel") {
      const id = String(body.invitation_id ?? "");
      const result = await admin.from("invitations").delete().eq("id", id).eq("company_id", companyId).is("accepted_at", null).select("id").maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return json({ error: "Pending invitation not found" }, 404);
      // Deliberately do not delete auth.users: the address may own another company membership.
      return json({ success: true });
    }

    if (action === "resend") {
      const id = String(body.invitation_id ?? "");
      const found = await admin.from("invitations").select("id,email,full_name").eq("id", id).eq("company_id", companyId).is("accepted_at", null).maybeSingle();
      if (found.error) throw found.error;
      if (!found.data) return json({ error: "Pending invitation not found" }, 404);
      const removedOld = await admin.from("invitations").delete().eq("id", id).eq("company_id", companyId).is("accepted_at", null);
      if (removedOld.error) throw removedOld.error;
      const created = await userClient.rpc("create_worker_invitation", {
        p_company_id: companyId, p_email: found.data.email, p_full_name: found.data.full_name
      });
      if (created.error) throw created.error;
      const redirectTo = `${origin}/shifthq/worker/?invite=${encodeURIComponent(created.data)}`;
      const mailClient = createClient(url, anon, { auth: { persistSession: false } });
      const sent = await mailClient.auth.signInWithOtp({ email: found.data.email, options: { emailRedirectTo: redirectTo, shouldCreateUser: true, data: { full_name: found.data.full_name, company_id: companyId } } });
      if (sent.error) {
        return json({ error: sent.error.message }, 429);
      }
      return json({ success: true });
    }

    if (action === "remove") {
      const workerId = String(body.user_id ?? "");
      const removed = await userClient.rpc("admin_remove_worker", { p_company_id: companyId, p_user_id: workerId });
      if (removed.error) return json({ error: removed.error.message }, 409);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : JSON.stringify(error);
    return json({ error: message || "Unexpected server error" }, 500);
  }
});
