import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is a supervisor
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabase.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", caller.id).maybeSingle();
    if (roleData?.role !== "supervisor") {
      return new Response(JSON.stringify({ error: "Forbidden: Only supervisors can create BHW accounts" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { name, age, address, gmail, number, username, password } = await req.json();

    if (!name || !gmail || !username || !password) {
      return new Response(JSON.stringify({ error: "Name, gmail, username, and password are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create auth user with auto-confirm
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: gmail,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = authData.user.id;

    // Assign BHW role
    await supabase.from("user_roles").insert({ user_id: userId, role: "bhw" });

    // Update profile with username
    await supabase.from("profiles").update({ username, full_name: name }).eq("user_id", userId);

    // Create bhw_workers record
    const { data: workerData, error: workerError } = await supabase.from("bhw_workers").insert({
      name,
      age: Number(age) || 0,
      address: address || "",
      gmail,
      number: number || "",
      user_id: userId,
    }).select().single();

    if (workerError) {
      return new Response(JSON.stringify({ error: workerError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, worker: workerData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
