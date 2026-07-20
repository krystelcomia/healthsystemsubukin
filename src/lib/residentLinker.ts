import { supabase } from "@/integrations/supabase/client";

export async function ensureResidentExists(opts: {
  fullName: string;
  sitio?: string;
  gender?: string;
  age?: number | string;
  birthday?: string;
  familyNumber?: string;
}): Promise<string | null> {
  const cleanName = (opts.fullName || "").trim();
  if (!cleanName) return null;

  try {
    // Check if resident already exists in residents table by full_name (case insensitive)
    const { data: existing } = await supabase
      .from("residents")
      .select("id, full_name, sitio, age, gender, birthday, family_number")
      .order("created_at", { ascending: false });

    const match = existing?.find(
      (r: any) => r.full_name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (match) {
      // Update missing or family number fields if provided
      const updates: any = {};
      if (opts.sitio && !match.sitio) updates.sitio = opts.sitio;
      if (opts.gender && !match.gender) updates.gender = opts.gender;
      if (opts.age && (!match.age || match.age === 0)) updates.age = Number(opts.age) || 0;
      if (opts.birthday && !match.birthday) updates.birthday = opts.birthday;
      if (opts.familyNumber) updates.family_number = opts.familyNumber;

      if (Object.keys(updates).length > 0) {
        await supabase.from("residents").update(updates).eq("id", match.id);
      }

      return match.id;
    }

    // Insert new resident into residents table
    const newResident = {
      full_name: cleanName,
      gender: opts.gender || "Male",
      age: Number(opts.age) || 0,
      status: "Single",
      religion: "",
      blood_type: "",
      nationality: "Filipino",
      sitio: opts.sitio || "",
      birthday: opts.birthday || null,
      family_number: opts.familyNumber || null,
    };

    const { data: inserted, error } = await supabase
      .from("residents")
      .insert(newResident)
      .select("id")
      .maybeSingle();

    if (error) {
      console.warn("Failed to auto-insert resident:", error);
      return null;
    }

    return inserted?.id || null;
  } catch (e) {
    console.error("Error in ensureResidentExists:", e);
    return null;
  }
}
