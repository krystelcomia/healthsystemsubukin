import { supabase } from "@/integrations/supabase/client";

export function calculateAge(birthday: string | null | undefined): number {
  if (!birthday) return 0;
  const birthDate = new Date(birthday);
  if (isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

export async function ensureResidentExists(opts: {
  fullName: string;
  sitio?: string;
  gender?: string;
  age?: number | string;
  birthday?: string;
  familyNumber?: string;
  status?: string;
}): Promise<string | null> {
  const cleanName = (opts.fullName || "").trim();
  if (!cleanName) return null;

  const computedAge = opts.birthday ? calculateAge(opts.birthday) : (Number(opts.age) || 0);

  try {
    const { data: existing } = await supabase
      .from("residents")
      .select("id, full_name, sitio, age, gender, birthday, family_number, status")
      .order("created_at", { ascending: false });

    const match = existing?.find(
      (r: any) => r.full_name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (match) {
      const updates: any = {};
      if (opts.sitio) updates.sitio = opts.sitio;
      if (opts.gender) updates.gender = opts.gender;
      if (opts.status) updates.status = opts.status;
      if (opts.birthday) {
        updates.birthday = opts.birthday;
        const newAge = calculateAge(opts.birthday);
        if (newAge > 0) updates.age = newAge;
      } else if (computedAge > 0) {
        updates.age = computedAge;
      }
      if (opts.familyNumber) updates.family_number = opts.familyNumber;

      if (Object.keys(updates).length > 0) {
        await supabase.from("residents").update(updates).eq("id", match.id);
      }

      return match.id;
    }

    const newResident = {
      full_name: cleanName,
      gender: opts.gender || "Male",
      age: computedAge,
      status: opts.status || "Single",
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

export async function syncFamilyDataToResidents(): Promise<void> {
  try {
    const [famRes, resRes] = await Promise.all([
      supabase.from("family_data").select("*"),
      supabase.from("residents").select("*"),
    ]);

    const familyRecords = famRes.data || [];
    const residentRecords = resRes.data || [];

    for (const fam of familyRecords) {
      const famNum = fam.family_number;
      const sitio = fam.sitio;

      if (fam.father_name && fam.father_name.trim()) {
        const fatherMatch = residentRecords.find(
          (r) => r.full_name.trim().toLowerCase() === fam.father_name.trim().toLowerCase()
        );
        if (fatherMatch) {
          const updates: any = {};
          if (famNum && fatherMatch.family_number !== famNum) updates.family_number = famNum;
          if (sitio && !fatherMatch.sitio) updates.sitio = sitio;
          if (Object.keys(updates).length > 0) {
            await supabase.from("residents").update(updates).eq("id", fatherMatch.id);
          }
        }
      }

      if (fam.mother_name && fam.mother_name.trim()) {
        const motherMatch = residentRecords.find(
          (r) => r.full_name.trim().toLowerCase() === fam.mother_name.trim().toLowerCase()
        );
        if (motherMatch) {
          const updates: any = {};
          if (famNum && motherMatch.family_number !== famNum) updates.family_number = famNum;
          if (sitio && !motherMatch.sitio) updates.sitio = sitio;
          if (Object.keys(updates).length > 0) {
            await supabase.from("residents").update(updates).eq("id", motherMatch.id);
          }
        }
      }

      let members: any[] = [];
      if (Array.isArray(fam.members_detail)) {
        members = fam.members_detail;
      } else if (typeof fam.members_detail === "string") {
        try { members = JSON.parse(fam.members_detail); } catch (e) {}
      }

      for (const mem of members) {
        if (!mem.full_name || !mem.full_name.trim()) continue;
        const nameClean = mem.full_name.trim();
        const memMatch = residentRecords.find(
          (r) => r.full_name.trim().toLowerCase() === nameClean.toLowerCase()
        );

        const computedAge = mem.birthday ? calculateAge(mem.birthday) : (Number(mem.age) || 0);

        if (memMatch) {
          const updates: any = {};
          if (famNum && memMatch.family_number !== famNum) updates.family_number = famNum;
          if (sitio && !memMatch.sitio) updates.sitio = sitio;
          if (mem.gender && memMatch.gender !== mem.gender) updates.gender = mem.gender;
          if (mem.birthday && memMatch.birthday !== mem.birthday) {
            updates.birthday = mem.birthday;
            if (computedAge > 0) updates.age = computedAge;
          } else if (computedAge > 0 && memMatch.age !== computedAge) {
            updates.age = computedAge;
          }
          if (mem.civil_status && memMatch.status !== mem.civil_status) updates.status = mem.civil_status;

          if (Object.keys(updates).length > 0) {
            await supabase.from("residents").update(updates).eq("id", memMatch.id);
          }
        } else {
          await supabase.from("residents").insert({
            full_name: nameClean,
            gender: mem.gender || "Male",
            age: computedAge,
            status: mem.civil_status || "Single",
            religion: "",
            blood_type: "",
            nationality: "Filipino",
            sitio: sitio || "",
            birthday: mem.birthday || null,
            family_number: famNum || null,
          });
        }
      }
    }
  } catch (e) {
    console.error("Error in syncFamilyDataToResidents:", e);
  }
}
