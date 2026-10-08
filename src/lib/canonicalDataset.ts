export const CANONICAL_INITIAL_DATABASE: Record<string, any> = {
  bhw_records_purged_all_v3: true,
  auth_users: [
    { id: "user-1", email: "krystelcomia@gmail.com", password: "krystel123", user_metadata: { full_name: "Krystel Comia" } },
    { id: "user-cristeta", email: "cristetalanuzaADMIN@gmail.com", password: "adminsubukincristeta2026", user_metadata: { full_name: "Cristeta R. Lanuza" } },
    { id: "user-cristeta-bhw", email: "cristetalanuzaBHW@gmail.com", password: "bhwsubukincristeta2026", user_metadata: { full_name: "Cristeta R. Lanuza" } },
    { id: "user-midwife", email: "maryjanelandichoMIDWIFE@gmail.com", password: "midwifesubukinmaryjane2026", user_metadata: { full_name: "Mary Jane Landicho" } },
    { id: "user-evelyn", email: "evelynilaoBHW@gmail.com", password: "bhwsubukinevelyn2026", user_metadata: { full_name: "Evelyn T. Ilao" } },
    { id: "user-cecilia", email: "ceciliabenosaBHW@gmail.com", password: "bhwsubukincecilia2026", user_metadata: { full_name: "Cecilia G. Benosa" } },
    { id: "user-merlita", email: "merlitaalonzoBHW@gmail.com", password: "bhwsubukinmerlita2026", user_metadata: { full_name: "Merlita R. Alonzo" } },
    { id: "user-suzette", email: "suzettelopezBHW@gmail.com", password: "bhwsubukinsuzette2026", user_metadata: { full_name: "Suzette B. Lopez" } },
    { id: "user-amelita", email: "amelitasayatBHW@gmail.com", password: "bhwsubukinamelita2026", user_metadata: { full_name: "Amelita R. Sayat" } },
    { id: "user-wilma", email: "wilmatanyagBHW@gmail.com", password: "bhwsubukinwilma2026", user_metadata: { full_name: "Wilma D. Tanyag" } },
    { id: "user-nenita", email: "nenitadimaculanganBHW@gmail.com", password: "bhwsubukinnenita2026", user_metadata: { full_name: "Nenita M. Dimaculangan" } },
    { id: "user-mercy", email: "mercyabanillaBHW@gmail.com", password: "bhwsubukinmercy2026", user_metadata: { full_name: "Mercy O. Abanilla" } },
    { id: "user-renchie", email: "renchieilaoBHW@gmail.com", password: "bhwsubukinrenchie2026", user_metadata: { full_name: "Renchie V. Ilao" } },
    { id: "user-renalyn", email: "renalynlauranteBHW@gmail.com", password: "bhwsubukinrenalyn2026", user_metadata: { full_name: "Renalyn D. Laurante" } },
    { id: "user-maribel", email: "maribelabayonBNS@gmail.com", password: "bnssubukinmaribel2026", user_metadata: { full_name: "Maribel M. Abayon" } }
  ],
  user_roles: [
    { id: "role-1", user_id: "user-1", role: "bhw" },
    { id: "role-cristeta", user_id: "user-cristeta", role: "supervisor" },
    { id: "role-cristeta-bhw", user_id: "user-cristeta-bhw", role: "bhw" },
    { id: "role-midwife", user_id: "user-midwife", role: "midwife" },
    { id: "role-evelyn", user_id: "user-evelyn", role: "bhw" },
    { id: "role-cecilia", user_id: "user-cecilia", role: "bhw" },
    { id: "role-merlita", user_id: "user-merlita", role: "bhw" },
    { id: "role-suzette", user_id: "user-suzette", role: "bhw" },
    { id: "role-amelita", user_id: "user-amelita", role: "bhw" },
    { id: "role-wilma", user_id: "user-wilma", role: "bhw" },
    { id: "role-nenita", user_id: "user-nenita", role: "bhw" },
    { id: "role-mercy", user_id: "user-mercy", role: "bhw" },
    { id: "role-renchie", user_id: "user-renchie", role: "bhw" },
    { id: "role-renalyn", user_id: "user-renalyn", role: "bhw" },
    { id: "role-maribel", user_id: "user-maribel", role: "bns" }
  ],
  profiles: [
    { id: "profile-1", user_id: "user-1", full_name: "Krystel Comia", username: "krystel", assigned_sitio: "Maligaya" },
    { id: "profile-cristeta", user_id: "user-cristeta", full_name: "Cristeta R. Lanuza", username: "Cristeta", assigned_sitio: "Masigla" },
    { id: "profile-cristeta-bhw", user_id: "user-cristeta-bhw", full_name: "Cristeta R. Lanuza", username: "Cristeta", assigned_sitio: "Masigla" },
    { id: "profile-midwife", user_id: "user-midwife", full_name: "Mary Jane Landicho", username: "Mary Jane", assigned_sitio: "Subukin Main" },
    { id: "profile-evelyn", user_id: "user-evelyn", full_name: "Evelyn T. Ilao", username: "Evelyn", assigned_sitio: "Manggahan 1" },
    { id: "profile-cecilia", user_id: "user-cecilia", full_name: "Cecilia G. Benosa", username: "Cecilia", assigned_sitio: "Maligaya" },
    { id: "profile-merlita", user_id: "user-merlita", full_name: "Merlita R. Alonzo", username: "Merlita", assigned_sitio: "Matahimik / Punta" },
    { id: "profile-suzette", user_id: "user-suzette", full_name: "Suzette B. Lopez", username: "Suzette", assigned_sitio: "Makalintal 1" },
    { id: "profile-amelita", user_id: "user-amelita", full_name: "Amelita R. Sayat", username: "Amelita", assigned_sitio: "Puntor" },
    { id: "profile-wilma", user_id: "user-wilma", full_name: "Wilma D. Tanyag", username: "Wilma", assigned_sitio: "Masaya" },
    { id: "profile-nenita", user_id: "user-nenita", full_name: "Nenita M. Dimaculangan", username: "Nenita", assigned_sitio: "Manggahan 2" },
    { id: "profile-mercy", user_id: "user-mercy", full_name: "Mercy O. Abanilla", username: "Mercy", assigned_sitio: "Cama" },
    { id: "profile-renchie", user_id: "user-renchie", full_name: "Renchie V. Ilao", username: "Renchie", assigned_sitio: "Makalintal 2" },
    { id: "profile-renalyn", user_id: "user-renalyn", full_name: "Renalyn D. Laurante", username: "Renalyn", assigned_sitio: "Matahimik / Burol" },
    { id: "profile-maribel", user_id: "user-maribel", full_name: "Maribel M. Abayon", username: "Maribel", assigned_sitio: "Masigla" }
  ],
  bhw_workers: [
    { id: "worker-1", name: "Krystel Comia", age: 28, address: "Subukin", gmail: "krystelcomia@gmail.com", number: "09123456789", is_online: false, user_id: "user-1", assigned_sitio: "Maligaya", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" },
    { id: "worker-cristeta-bhw", name: "Cristeta R. Lanuza", age: 45, address: "Masigla", gmail: "cristetalanuzaBHW@gmail.com", number: "0919-6980-712", is_online: false, user_id: "user-cristeta-bhw", assigned_sitio: "Masigla", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" },
    { id: "worker-evelyn", name: "Evelyn T. Ilao", age: 42, address: "Manggahan 1", gmail: "evelynilaoBHW@gmail.com", number: "0935-5638-247", is_online: false, user_id: "user-evelyn", assigned_sitio: "Manggahan 1", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" },
    { id: "worker-cecilia", name: "Cecilia G. Benosa", age: 39, address: "Maligaya", gmail: "ceciliabenosaBHW@gmail.com", number: "0921-8509-320", is_online: false, user_id: "user-cecilia", assigned_sitio: "Maligaya", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" },
    { id: "worker-merlita", name: "Merlita R. Alonzo", age: 48, address: "Matahimik / Punta", gmail: "merlitaalonzoBHW@gmail.com", number: "0930-9085-713", is_online: false, user_id: "user-merlita", assigned_sitio: "Matahimik / Punta", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" },
    { id: "worker-suzette", name: "Suzette B. Lopez", age: 36, address: "Makalintal 1", gmail: "suzettelopezBHW@gmail.com", number: "0935-2008-942", is_online: false, user_id: "user-suzette", assigned_sitio: "Makalintal 1", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" },
    { id: "worker-amelita", name: "Amelita R. Sayat", age: 50, address: "Puntor", gmail: "amelitasayatBHW@gmail.com", number: "0931-0232-973", is_online: false, user_id: "user-amelita", assigned_sitio: "Puntor", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" },
    { id: "worker-wilma", name: "Wilma D. Tanyag", age: 47, address: "Masaya", gmail: "wilmatanyagBHW@gmail.com", number: "0997-4971-138", is_online: false, user_id: "user-wilma", assigned_sitio: "Masaya", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" },
    { id: "worker-nenita", name: "Nenita M. Dimaculangan", age: 52, address: "Manggahan 2", gmail: "nenitadimaculanganBHW@gmail.com", number: "0985-1225-857", is_online: false, user_id: "user-nenita", assigned_sitio: "Manggahan 2", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" },
    { id: "worker-mercy", name: "Mercy O. Abanilla", age: 41, address: "Cama", gmail: "mercyabanillaBHW@gmail.com", number: "0949-7768-394", is_online: false, user_id: "user-mercy", assigned_sitio: "Cama", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" },
    { id: "worker-renchie", name: "Renchie V. Ilao", age: 34, address: "Makalintal 2", gmail: "renchieilaoBHW@gmail.com", number: "0965-6627-031", is_online: false, user_id: "user-renchie", assigned_sitio: "Makalintal 2", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" },
    { id: "worker-renalyn", name: "Renalyn D. Laurante", age: 37, address: "Matahimik / Burol", gmail: "renalynlauranteBHW@gmail.com", number: "0985-1086-472", is_online: false, user_id: "user-renalyn", assigned_sitio: "Matahimik / Burol", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" },
    { id: "worker-maribel", name: "Maribel M. Abayon", age: 44, address: "Masigla", gmail: "maribelabayonBNS@gmail.com", number: "0922-6722-134", is_online: false, user_id: "user-maribel", assigned_sitio: "Masigla", created_at: "2026-08-01T08:00:00.000Z", updated_at: "2026-08-01T08:00:00.000Z" }
  ],
  family_data: [
    {
      id: "fam-badillo-1",
      resident_id: "res-badillo-errol",
      family_number: "FAM-001",
      num_households: 1,
      father_name: "BADILLO, Errol M.",
      mother_name: "BADILLO, Maria C.",
      sitio: "Masigla",
      num_males: 2,
      num_females: 1,
      total_members: 3,
      members_detail: [
        { id: "mem-1", full_name: "BADILLO, Errol M.", relationship: "Ulo ng Pamilya (Ama)", age: 46, gender: "Lalaki", civil_status: "Kasal" },
        { id: "mem-2", full_name: "BADILLO, Maria C.", relationship: "Ina / Asawa", age: 44, gender: "Babae", civil_status: "Kasal" },
        { id: "mem-3", full_name: "BADILLO, John Kevin M.", relationship: "Anak", age: 16, gender: "Lalaki", civil_status: "Walang Asawa" }
      ],
      created_at: "2026-08-15T08:30:00.000Z",
      updated_at: "2026-08-15T08:30:00.000Z"
    }
  ],
  residents: [
    {
      id: "res-badillo-errol",
      full_name: "BADILLO, Errol M.",
      age: 46,
      sex: "Lalaki",
      gender: "Lalaki",
      birthdate: "1980-04-12",
      sitio: "Masigla",
      civil_status: "Kasal",
      contact_number: "0917-882-3491",
      philhealth_number: "12-054928192-3",
      created_at: "2026-08-15T08:00:00.000Z",
      updated_at: "2026-08-15T08:00:00.000Z"
    }
  ],
  consultations: [
    {
      id: "cons-badillo-1",
      resident_id: "res-badillo-errol",
      consultation_date: "2026-09-18",
      consultation_cause: "Ubo, Sipon, at Pananakit ng Katawan (Flu Symptoms)",
      diagnosis: "Upper Respiratory Tract Infection (URTI) & Mild Hypertension",
      blood_pressure: "130/85",
      temperature: "37.8",
      pulse_rate: "78",
      respiratory_rate: "18",
      weight: "68",
      height: "168",
      treatment: "Pahinga sa kama, pag-inom ng maraming tubig, at maligamgam na tubig na may kalamansi",
      medication: "Paracetamol 500mg (1 tablet tuwing 6 na oras kung may lagnat o pananakit); Salbutamol kung may ubo; Multivitamins",
      notes: "Pinayuhan na bumalik sa Health Center pagkatapos ng 5 araw kung hindi bumaba ang lagnat.",
      created_at: "2026-09-18T09:15:00.000Z",
      updated_at: "2026-09-18T09:15:00.000Z"
    }
  ],
  philpen_health: [
    {
      id: "phil-badillo-1",
      resident_id: "res-badillo-errol",
      full_name: "BADILLO, Errol M.",
      age: 46,
      gender: "Lalaki",
      sitio: "Masigla",
      bp: "130/85",
      blood_sugar: "96 mg/dL (Normal Fasting Blood Sugar)",
      cholesterol: "Normal",
      smoking: "Hindi naninigarilyo (Non-smoker)",
      alcohol: "Paminsan-minsan / Panlipunan lamang",
      exercise: "May sapat na gawaing pisikal sa bukid at paglalakad",
      hypertension: "May banayad na hypertension (Stage 1)",
      diabetes: "Wala (Negative)",
      risk_level: "Mababa hanggang Katamtaman (Low to Moderate Risk)",
      assessment_date: "2026-08-20",
      notes: "Inirekomenda ang bawas-alat sa pagkain at regular na pagsubaybay sa blood pressure tuwing buwan.",
      created_at: "2026-08-20T10:00:00.000Z",
      updated_at: "2026-08-20T10:00:00.000Z"
    }
  ],
  dengue_prevention: [
    {
      id: "deng-badillo-1",
      resident_id: "res-badillo-errol",
      household_head: "BADILLO, Errol M.",
      sitio: "Masigla",
      inspection_date: "2026-09-05",
      larvae_found: "Negatibo / Walang kiti-kiti",
      containers_checked: 6,
      actions_taken: "Pagtakip sa mga drum ng tubig, pagtapon ng nakatenggang tubig sa mga paso at lumang gulong.",
      remarks: "Ligtas at malinis ang paligid ng tahanan sa Sitio Masigla.",
      created_at: "2026-09-05T14:00:00.000Z",
      updated_at: "2026-09-05T14:00:00.000Z"
    }
  ],
  maternal_care: [],
  child_health: [],
  family_planning: [],
  user_sessions: [],
  user_activity_logs: []
};
