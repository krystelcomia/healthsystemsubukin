// @ts-nocheck
declare const Deno: any;

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// All 13 BHW Subukin staff accounts
const ACCOUNTS = [
  { email: "cristetalanuzaADMIN@gmail.com",    password: "adminsubukincristeta2026", username: "Cristeta",   fullName: "Cristeta R. Lanuza",      role: "supervisor" },
  { email: "evelynilaoBHW@gmail.com",           password: "bhwsubukinevelyn2026",     username: "Evelyn",     fullName: "Evelyn T. Ilao",           role: "bhw" },
  { email: "ceciliabenosaBHW@gmail.com",        password: "bhwsubukincecilia2026",    username: "Cecilia",    fullName: "Cecilia G. Benosa",        role: "bhw" },
  { email: "merlitaalonzoBHW@gmail.com",        password: "bhwsubukinmerlita2026",    username: "Merlita",    fullName: "Merlita R. Alonzo",        role: "bhw" },
  { email: "suzettelopezBHW@gmail.com",         password: "bhwsubukinsuzette2026",    username: "Suzette",    fullName: "Suzette B. Lopez",         role: "bhw" },
  { email: "amelitasayatBHW@gmail.com",         password: "bhwsubukinamelita2026",    username: "Amelita",    fullName: "Amelita R. Sayat",         role: "bhw" },
  { email: "wilmatanyagBHW@gmail.com",          password: "bhwsubukinwilma2026",      username: "Wilma",      fullName: "Wilma D. Tanyag",          role: "bhw" },
  { email: "nenitadimaculanganBHW@gmail.com",   password: "bhwsubukinnenita2026",     username: "Nenita",     fullName: "Nenita M. Dimaculangan",   role: "bhw" },
  { email: "mercyabanillaBHW@gmail.com",        password: "bhwsubukinmercy2026",      username: "Mercy",      fullName: "Mercy O. Abanilla",        role: "bhw" },
  { email: "renchieilaoBHW@gmail.com",          password: "bhwsubukinrenchie2026",    username: "Renchie",    fullName: "Renchie V. Ilao",          role: "bhw" },
  { email: "renalynlauranteBHW@gmail.com",      password: "bhwsubukinrenalyn2026",    username: "Renalyn",    fullName: "Renalyn D. Laurante",      role: "bhw" },
  { email: "maribelabayonBNS@gmail.com",        password: "bnssubukinmaribel2026",    username: "Maribel",    fullName: "Maribel M. Abayon",        role: "bns" },
  { email: "maryjanelandichoMIDWIFE@gmail.com", password: "midwifesubukinmaryjane2026", username: "Mary Jane", fullName: "Mary Jane Landicho",     role: "midwife" },
];

Deno.serve(async (_req: Request) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: any[] = [];

    // Fetch all existing users once to avoid repeated calls
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existingUsers: any[] = listData?.users || [];

    for (const account of ACCOUNTS) {
      try {
        const existing = existingUsers.find(
          (u: any) => u.email?.toLowerCase() === account.email.toLowerCase()
        );

        let userId: string;

        if (existing) {
          // Update password and ensure email is confirmed
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password: account.password,
            email_confirm: true,
          });
          userId = existing.id;
          results.push({ email: account.email, status: "updated", userId });
        } else {
          // Create brand-new user — email_confirm:true means no verification email needed
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: account.email,
            password: account.password,
            email_confirm: true,
          });
          if (error) throw error;
          userId = data.user.id;
          results.push({ email: account.email, status: "created", userId });
        }

        // Upsert role in user_roles table
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: userId, role: account.role }, { onConflict: "user_id" });

        // Upsert profile (username + full_name)
        await supabaseAdmin
          .from("profiles")
          .upsert(
            { user_id: userId, username: account.username, full_name: account.fullName },
            { onConflict: "user_id" }
          );

        // Link user_id to bhw_workers by gmail (midwife is NOT in bhw_workers)
        if (account.role !== "midwife") {
          await supabaseAdmin
            .from("bhw_workers")
            .update({ user_id: userId })
            .eq("gmail", account.email);
        }

      } catch (err: any) {
        results.push({ email: account.email, status: "error", error: err?.message || String(err) });
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    const updated = results.filter((r) => r.status === "updated").length;
    const errors  = results.filter((r) => r.status === "error");

    return new Response(
      JSON.stringify({
        success: true,
        summary: { total: ACCOUNTS.length, created, updated, errors: errors.length },
        results,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error?.message || String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

