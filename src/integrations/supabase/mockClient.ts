import { Database } from './types';
import { CANONICAL_INITIAL_DATABASE } from '@/lib/canonicalDataset';

let isCrossBrowserSyncStarted = false;

export function saveAndBroadcastMockDb(db: any) {
  try {
    const serialized = JSON.stringify(db);
    localStorage.setItem('supabase_mock_db', serialized);

    // 1. Post to local Vite dev server sync endpoint so other browsers (Chrome, Firefox, Edge) get it
    if (typeof fetch === 'function') {
      fetch('/__db_sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialized,
      }).catch(() => {});
    }

    // 2. Broadcast across tabs of current browser
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('bhw_db_cross_tab_sync');
        bc.postMessage({ type: 'db_update', timestamp: Date.now() });
        bc.close();
      } catch {}
    }

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('bhw-db-updated', { detail: db }));
  } catch (e) {
    console.error('Failed to save mock db:', e);
  }
}

export function initCrossBrowserSync() {
  if (isCrossBrowserSyncStarted || typeof window === 'undefined') return;
  isCrossBrowserSyncStarted = true;

  // 1. Initial pull from shared backend file if available
  if (typeof fetch === 'function') {
    fetch('/__db_sync')
      .then((res) => res.json())
      .then((remoteDb) => {
        if (remoteDb && remoteDb.is_initialized) {
          localStorage.setItem('supabase_mock_db', JSON.stringify(remoteDb));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('bhw-db-updated', { detail: remoteDb }));
          window.dispatchEvent(new CustomEvent('bhw-worker-status-changed', { detail: {} }));
        }
      })
      .catch(() => {});
  }

  // 2. Realtime SSE push from other browsers (Chrome <-> Firefox <-> Edge)
  if (typeof EventSource !== 'undefined') {
    try {
      const evtSource = new EventSource('/__db_sync/events');
      evtSource.addEventListener('db_update', (event: any) => {
        if (event.data) {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed && parsed.is_initialized) {
              localStorage.setItem('supabase_mock_db', event.data);
              window.dispatchEvent(new Event('storage'));
              window.dispatchEvent(new CustomEvent('bhw-db-updated', { detail: parsed }));
              window.dispatchEvent(new CustomEvent('bhw-worker-status-changed', { detail: {} }));
            }
          } catch {}
        }
      });
    } catch {}
  }

  // 3. BroadcastChannel listener for local browser tabs
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('bhw_db_cross_tab_sync');
      bc.onmessage = () => {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('bhw-worker-status-changed', { detail: {} }));
      };
    } catch {}
  }
}

// Mock Query Builder mimicking Supabase's JS library behavior
class MockQueryBuilder {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  private orderCol: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private isDelete: boolean = false;
  private isUpdate: boolean = false;
  private updateData: any = null;
  private isInsert: boolean = false;
  private insertData: any = null;
  private isUpsert: boolean = false;
  private upsertData: any = null;
  private onConflictCol: string = 'id';
  private countOption: string | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string, options?: { count?: string; head?: boolean }) {
    if (options?.count) {
      this.countOption = options.count;
    }
    return this;
  }

  insert(data: any) {
    this.isInsert = true;
    this.insertData = data;
    return this;
  }

  upsert(data: any, options?: { onConflict?: string }) {
    this.isUpsert = true;
    this.upsertData = data;
    if (options?.onConflict) {
      this.onConflictCol = options.onConflict;
    }
    return this;
  }

  update(data: any) {
    this.isUpdate = true;
    this.updateData = data;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push(item => item[column] === value);
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push(item => item[column] !== value);
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push(item => {
      const itemVal = item[column];
      return itemVal !== undefined && itemVal !== null && itemVal <= value;
    });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push(item => {
      const itemVal = item[column];
      return itemVal !== undefined && itemVal !== null && itemVal >= value;
    });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push(item => values.includes(item[column]));
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderCol = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  // Support thenable for async/await resolution
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = await this.execute();
      if (onfulfilled) return onfulfilled(res);
      return res;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  private async execute() {
    const dbStr = localStorage.getItem('supabase_mock_db');
    const db = dbStr ? JSON.parse(dbStr) : {};
    
    if (!db[this.tableName]) {
      db[this.tableName] = [];
    }

    let tableData = [...db[this.tableName]];

    if (this.isUpsert) {
      const itemsToUpsert = Array.isArray(this.upsertData) ? this.upsertData : [this.upsertData];
      const conflictKey = this.onConflictCol || 'id';
      const results = itemsToUpsert.map(item => {
        const existingIdx = db[this.tableName].findIndex((existing: any) => existing[conflictKey] === item[conflictKey]);
        if (existingIdx >= 0) {
          const updatedItem = {
            ...db[this.tableName][existingIdx],
            ...item,
            updated_at: new Date().toISOString()
          };
          db[this.tableName][existingIdx] = updatedItem;
          return updatedItem;
        } else {
          const newItem = {
            id: item.id || crypto.randomUUID(),
            created_at: item.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...item
          };
          db[this.tableName].push(newItem);
          return newItem;
        }
      });
      saveAndBroadcastMockDb(db);
      return { data: Array.isArray(this.upsertData) ? results : results[0], error: null };
    }

    if (this.isInsert) {
      const itemsToInsert = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
      const inserted = itemsToInsert.map(item => {
        const newItem = {
          id: item.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...item
        };
        db[this.tableName].push(newItem);
        return newItem;
      });
      saveAndBroadcastMockDb(db);
      return { data: Array.isArray(this.insertData) ? inserted : inserted[0], error: null };
    }

    if (this.isUpdate) {
      let updatedCount = 0;
      const updatedData: any[] = [];
      db[this.tableName] = db[this.tableName].map((item: any) => {
        const matches = this.filters.every(filter => filter(item));
        if (matches) {
          const updatedItem = {
            ...item,
            ...this.updateData,
            updated_at: new Date().toISOString()
          };
          updatedCount++;
          updatedData.push(updatedItem);
          return updatedItem;
        }
        return item;
      });
      saveAndBroadcastMockDb(db);
      return { data: updatedData, error: null, count: updatedCount };
    }

    if (this.isDelete) {
      const initialLength = db[this.tableName].length;
      db[this.tableName] = db[this.tableName].filter((item: any) => {
        const matches = this.filters.every(filter => filter(item));
        return !matches;
      });
      const deletedCount = initialLength - db[this.tableName].length;
      saveAndBroadcastMockDb(db);
      return { data: null, error: null, count: deletedCount };
    }

    // SELECT
    let filtered = tableData.filter(item => this.filters.every(filter => filter(item)));

    if (this.orderCol) {
      filtered.sort((a, b) => {
        const valA = a[this.orderCol!];
        const valB = b[this.orderCol!];
        if (valA === valB) return 0;
        if (valA < valB) return this.orderAsc ? -1 : 1;
        return this.orderAsc ? 1 : -1;
      });
    }

    if (this.limitCount !== null) {
      filtered = filtered.slice(0, this.limitCount);
    }

    const totalCount = filtered.length;

    // Handle relations (residents, profiles, etc.)
    filtered = filtered.map(item => {
      const newItem = { ...item };
      const residents = db['residents'] || [];
      if (newItem.resident_id) {
        newItem.residents = residents.find((r: any) => r.id === newItem.resident_id) || null;
      }
      if (!newItem.residents) {
        const nameToMatch = (newItem.full_name || newItem.patient_name || newItem.child_name || newItem.father_name || newItem.household_name || `${newItem.first_name || ""} ${newItem.surname || ""}`).trim().toLowerCase();
        if (nameToMatch) {
          newItem.residents = residents.find((r: any) => r.full_name && r.full_name.trim().toLowerCase() === nameToMatch) || null;
        }
      }
      if (newItem.user_id) {
        const profiles = db['profiles'] || [];
        newItem.profiles = profiles.find((p: any) => p.user_id === newItem.user_id) || null;
      }
      return newItem;
    });

    if (this.isSingle) {
      if (filtered.length === 0) {
        return { data: null, error: { message: "Row not found" }, count: totalCount };
      }
      return { data: filtered[0], error: null, count: totalCount };
    }

    if (this.isMaybeSingle) {
      return { data: filtered.length > 0 ? filtered[0] : null, error: null, count: totalCount };
    }

    return { data: filtered, error: null, count: totalCount };
  }
}

export const KNOWN_DEFAULT_CREDENTIALS: Record<string, string[]> = {
  "krystelcomia@gmail.com": ["krystel123"],
  "maryjanelandichoadmin@gmail.com": ["adminsubukinmaryjane2026"],
  "adminsubukin@gmail.com": ["adminsubukinmaryjane2026", "adminmidwife"],
  "cristetalanuzabhw@gmail.com": ["bhwsubukincristeta2026", "bhwcristeta"],
  "evelynilaobhw@gmail.com": ["bhwsubukinevelyn2026", "bhwevelyn"],
  "ceciliabenosabhw@gmail.com": ["bhwsubukincecilia2026", "bhwcecilia"],
  "merlitaalonzobhw@gmail.com": ["bhwsubukinmerlita2026", "bhwmerlita"],
  "suzettelopezbhw@gmail.com": ["bhwsubukinsuzette2026", "bhwsuzette"],
  "amelitasayatbhw@gmail.com": ["bhwsubukinamelita2026", "bhwamelita"],
  "wilmatanyagbhw@gmail.com": ["bhwsubukinwilma2026", "bhwawilma", "bhwwilma"],
  "nenitadimaculanganbhw@gmail.com": ["bhwsubukinnenita2026", "bhwanenita", "bhwnenita"],
  "mercyabanillabhw@gmail.com": ["bhwsubukinmercy2026", "bhwmercy"],
  "renchieilaobhw@gmail.com": ["bhwsubukinrenchie2026", "bhwrenchie"],
  "renalynlaurantebhw@gmail.com": ["bhwsubukinrenalyn2026", "bhwrenalyn"],
  "maribelabayonbns@gmail.com": ["bnssubukinmaribel2026", "bnsmaribel"]
};

// Mock Auth system
class MockAuth {
  private listeners: Array<(event: string, session: any) => void> = [];

  async signInWithPassword({ email, password }: any) {
    seedMockDatabase();
    const dbStr = localStorage.getItem('supabase_mock_db');
    const db = dbStr ? JSON.parse(dbStr) : {};
    const users = db['auth_users'] || [];
    const workers = db['bhw_workers'] || [];
    const roles = db['user_roles'] || [];
    
    const cleanInput = (email || "").trim().toLowerCase();
    const profiles = db['profiles'] || [];

    // Find matching profile by username
    const profileMatch = profiles.find((p: any) => (p.username || "").trim().toLowerCase() === cleanInput);

    // Find user by email or by profile's user_id
    const userWithEmail = users.find((u: any) => 
      (u.email || "").trim().toLowerCase() === cleanInput || 
      (profileMatch && u.id === profileMatch.user_id)
    );

    // Find worker by email, by user_id, or by worker name/username match
    const workerWithEmail = workers.find((w: any) => 
      (w.gmail || "").trim().toLowerCase() === cleanInput ||
      (userWithEmail && (w.user_id === userWithEmail.id || w.id === userWithEmail.id)) ||
      (profileMatch && (w.user_id === profileMatch.user_id || w.name?.toLowerCase().includes(cleanInput))) ||
      (w.name || "").toLowerCase().split(" ")[0] === cleanInput
    );

    const cleanEmail = (workerWithEmail?.gmail || userWithEmail?.email || cleanInput).toLowerCase().trim();

    // 1. If user email is not found in the database and not part of BHW
    if (!userWithEmail && !workerWithEmail) {
      return {
        data: { user: null, session: null },
        error: {
          message: "User not found."
        }
      };
    }

    // 2. If user exists in auth_users but worker account was deleted from active bhw_workers
    const isSupervisor = cleanEmail.includes("admin") || cleanEmail.includes("maryjanelandicho") ||
      roles.some((r: any) => r.user_id === userWithEmail?.id && r.role === "supervisor");

    if (!isSupervisor && !workerWithEmail) {
      return {
        data: { user: null, session: null },
        error: {
          message: "User not found."
        }
      };
    }

    // 3. Verify password with support for stored password, known defaults, and standard prefixes
    const validPasswords = KNOWN_DEFAULT_CREDENTIALS[cleanEmail] || [];
    const firstName = workerWithEmail?.name?.split(" ")[0]?.toLowerCase() || "";
    const computedBhwPass = firstName ? `bhw${firstName}` : "";
    const computedBnsPass = firstName ? `bns${firstName}` : "";

    const isPasswordValid = 
      (userWithEmail && userWithEmail.password === password) ||
      validPasswords.includes(password) ||
      (computedBhwPass && password.toLowerCase() === computedBhwPass) ||
      (computedBnsPass && password.toLowerCase() === computedBnsPass);

    if (!isPasswordValid) {
      return {
        data: { user: null, session: null },
        error: { message: "Incorrect password. Please verify your password and try again." }
      };
    }

    // Re-instate / sync user object in auth_users if missing
    let user = userWithEmail;
    if (!user && workerWithEmail) {
      user = {
        id: workerWithEmail.user_id || `user-${workerWithEmail.id}`,
        email: cleanEmail,
        password: password,
        user_metadata: { full_name: workerWithEmail.name }
      };
      users.push(user);
      db['auth_users'] = users;
      saveAndBroadcastMockDb(db);
    } else if (user && user.password !== password) {
      user.password = password;
      saveAndBroadcastMockDb(db);
    }

    const session = {
      access_token: "fake-jwt-token",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "fake-refresh-token",
      user: {
        id: user.id,
        email: user.email,
        role: "authenticated",
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: user.user_metadata || {},
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    // Mark worker as online immediately in database
    if (db['bhw_workers']) {
      const now = new Date().toISOString();
      db['bhw_workers'] = db['bhw_workers'].map((w: any) => {
        if ((w.gmail && w.gmail.toLowerCase().trim() === cleanEmail) || (w.user_id === user.id)) {
          return { ...w, is_online: true, last_seen: now, user_id: user.id };
        }
        return w;
      });
      saveAndBroadcastMockDb(db);
    }

    localStorage.setItem('supabase_mock_session', JSON.stringify(session));
    this.triggerListeners("SIGNED_IN", session);
    window.dispatchEvent(new CustomEvent("bhw-worker-status-changed", { detail: { email: cleanEmail, userId: user.id, isOnline: true } }));
    window.dispatchEvent(new Event("storage"));
    return { data: { user: session.user, session }, error: null };
  }

  async signOut() {
    let emailToSignOut = "";
    let userIdToSignOut = "";
    try {
      const sessionStr = localStorage.getItem('supabase_mock_session');
      if (sessionStr) {
        const sess = JSON.parse(sessionStr);
        emailToSignOut = (sess?.user?.email || "").toLowerCase().trim();
        userIdToSignOut = sess?.user?.id || "";
      }
    } catch {}

    localStorage.removeItem('supabase_mock_session');

    const dbStr = localStorage.getItem('supabase_mock_db');
    if (dbStr) {
      try {
        const db = JSON.parse(dbStr);
        if (db['bhw_workers']) {
          const now = new Date().toISOString();
          db['bhw_workers'] = db['bhw_workers'].map((w: any) => {
            if ((emailToSignOut && w.gmail && w.gmail.toLowerCase().trim() === emailToSignOut) || (userIdToSignOut && w.user_id === userIdToSignOut)) {
              return { ...w, is_online: false, last_seen: now };
            }
            return w;
          });
          saveAndBroadcastMockDb(db);
        }
      } catch {}
    }

    this.triggerListeners("SIGNED_OUT", null);
    window.dispatchEvent(new CustomEvent("bhw-worker-status-changed", { detail: { email: emailToSignOut, userId: userIdToSignOut, isOnline: false } }));
    window.dispatchEvent(new Event("storage"));
    return { error: null };
  }

  async getSession() {
    const sessionStr = localStorage.getItem('supabase_mock_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    return { data: { session }, error: null };
  }

  async getUser() {
    const sessionStr = localStorage.getItem('supabase_mock_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    return { data: { user: session ? session.user : null }, error: null };
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.listeners.push(callback);
    const sessionStr = localStorage.getItem('supabase_mock_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    setTimeout(() => {
      callback(session ? "SIGNED_IN" : "SIGNED_OUT", session);
    }, 0);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter(l => l !== callback);
          }
        }
      }
    };
  }

  async resetPasswordForEmail(email: string, options?: any) {
    return { data: {}, error: null };
  }

  private triggerListeners(event: string, session: any) {
    this.listeners.forEach(callback => callback(event, session));
  }
}

// Mock Functions system
class MockFunctions {
  async invoke(name: string, options?: { body: any }) {
    console.log(`[Mock Functions] Invoking "${name}" with body:`, options?.body);
    
    if (name === "create-bhw-account") {
      const { name: workerName, age, address, gmail, number, username, password } = options?.body || {};
      
      const dbStr = localStorage.getItem('supabase_mock_db');
      const db = dbStr ? JSON.parse(dbStr) : {};
      
      const users = db['auth_users'] || [];
      if (users.some((u: any) => u.email === gmail)) {
        return { data: { error: "User already exists with this email" }, error: null };
      }
      
      const newUserId = crypto.randomUUID();
      const newWorkerId = crypto.randomUUID();
      
      // Add auth user
      users.push({
        id: newUserId,
        email: gmail,
        password: password,
        user_metadata: { full_name: workerName }
      });
      db['auth_users'] = users;
      
      // Add user role
      if (!db['user_roles']) db['user_roles'] = [];
      db['user_roles'].push({
        id: crypto.randomUUID(),
        user_id: newUserId,
        role: "bhw"
      });
      
      // Add profile
      if (!db['profiles']) db['profiles'] = [];
      db['profiles'].push({
        id: crypto.randomUUID(),
        user_id: newUserId,
        full_name: workerName,
        username: username || gmail.split('@')[0]
      });
      
      // Add BHW worker details
      if (!db['bhw_workers']) db['bhw_workers'] = [];
      db['bhw_workers'].push({
        id: newWorkerId,
        name: workerName,
        age: Number(age) || 0,
        address: address || "",
        gmail: gmail,
        number: number || "",
        is_online: false,
        user_id: newUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      saveAndBroadcastMockDb(db);
      return { data: { success: true }, error: null };
    }
    
    if (name === "scan-form") {
      try {
        const lovableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const { image, hint } = options?.body || {};

        if (!image) return { data: { error: "Missing image" }, error: null };
        if (!lovableKey) {
          return { data: { error: "Missing VITE_SUPABASE_PUBLISHABLE_KEY in environment variables." }, error: null };
        }

        const systemPrompt = `You are an OCR + form extraction assistant for a Barangay Health Worker (BHW) system. You will be given a photo of a paper health form (Filipino / English). Extract the form's title and every visible field.

Return STRICT JSON with this shape:
{
  "title": "string (short title of the form)",
  "description": "string (one sentence describing the form)",
  "fields": [
    { "label": "Field label", "type": "text|number|date|textarea|checkbox", "value": "value written on the paper or empty string", "section": "section name or omit if no sections" }
  ]
}

Rules:
- Replicate everything from the uploaded form exactly—including the layout, field positioning, and specific text—to create the digital version.
- Use lines instead of boxes for fields.
- Use "date" for date fields, "number" for numeric-only, "checkbox" for yes/no boxes, "textarea" for long remarks, else "text".
- Restrict input so that letters cannot be entered when only numbers are required, and vice versa, unless both are needed.
- If a field is blank on the paper, still include it with an empty "value".
- Group fields into sections using the "section" property when the form has labeled sections.
- Do NOT include commentary. Output ONLY the JSON.`;

        const userText = hint ? `Additional hint from BHW: ${hint}` : "Extract all fields from this form.";

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: userText },
                  { type: "image_url", image_url: { url: image } },
                ],
              },
            ],
          }),
        });

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          if (aiResp.status === 429) return { data: { error: "Rate limit reached. Please try again later." }, error: null };
          if (aiResp.status === 402) return { data: { error: "AI credits exhausted. Please add credits." }, error: null };
          return { data: { error: `Conversion error (${aiResp.status}): ${errText}` }, error: null };
        }

        const aiJson = await aiResp.json();
        const content: string = aiJson?.choices?.[0]?.message?.content ?? "";

        // Strip markdown fences if present
        const cleaned = content
          .trim()
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/, "")
          .replace(/```$/, "")
          .trim();

        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          const start = cleaned.indexOf("{");
          const end = cleaned.lastIndexOf("}");
          if (start >= 0 && end > start) {
            parsed = JSON.parse(cleaned.slice(start, end + 1));
          } else {
            throw new Error("Model did not return valid JSON");
          }
        }

        return { data: parsed, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e?.message || e?.error || "Unknown error" } };
      }
    }
    
    return { data: null, error: { message: `Function ${name} not mocked` } };
  }
}

// Global seeding function
export function seedMockDatabase() {
  initCrossBrowserSync();

  const dbStr = localStorage.getItem('supabase_mock_db');
  let db: any = {};
  if (dbStr) {
    try {
      db = JSON.parse(dbStr);
    } catch {
      db = {};
    }
  }

  // If not initialized or missing core tables, populate with canonical dataset
  if (!db['is_initialized'] || !db['family_data'] || db['family_data'].length === 0) {
    db = JSON.parse(JSON.stringify(CANONICAL_INITIAL_DATABASE));
    db['is_initialized'] = true;
  }

  // Ensure default table arrays exist
  if (!db['auth_users']) db['auth_users'] = [];
  if (!db['user_roles']) db['user_roles'] = [];
  if (!db['profiles']) db['profiles'] = [];
  if (!db['bhw_workers']) db['bhw_workers'] = [];
  if (!db['residents']) db['residents'] = [];
  if (!db['consultations']) db['consultations'] = [];
  if (!db['family_data']) db['family_data'] = [];
  if (!db['philpen_health']) db['philpen_health'] = [];
  if (!db['dengue_prevention']) db['dengue_prevention'] = [];
  if (!db['maternal_care']) db['maternal_care'] = [];
  if (!db['child_health']) db['child_health'] = [];
  if (!db['family_planning']) db['family_planning'] = [];
  if (!db['user_sessions']) db['user_sessions'] = [];
  if (!db['user_activity_logs']) db['user_activity_logs'] = [];

  // Upsert canonical default accounts, passwords, and workers into active db
  const canonicalUsers = CANONICAL_INITIAL_DATABASE.auth_users || [];
  const canonicalRoles = CANONICAL_INITIAL_DATABASE.user_roles || [];
  const canonicalProfiles = CANONICAL_INITIAL_DATABASE.profiles || [];
  const canonicalWorkers = CANONICAL_INITIAL_DATABASE.bhw_workers || [];

  for (const cu of canonicalUsers) {
    const existingIndex = db['auth_users'].findIndex((u: any) => 
      (u.email || "").toLowerCase().trim() === cu.email.toLowerCase().trim() || u.id === cu.id
    );
    if (existingIndex >= 0) {
      db['auth_users'][existingIndex] = { ...db['auth_users'][existingIndex], ...cu };
    } else {
      db['auth_users'].push(cu);
    }
  }

  for (const cr of canonicalRoles) {
    const existingIndex = db['user_roles'].findIndex((r: any) => r.user_id === cr.user_id || r.id === cr.id);
    if (existingIndex >= 0) {
      db['user_roles'][existingIndex] = { ...db['user_roles'][existingIndex], ...cr };
    } else {
      db['user_roles'].push(cr);
    }
  }

  for (const cp of canonicalProfiles) {
    const existingIndex = db['profiles'].findIndex((p: any) => p.user_id === cp.user_id || p.id === cp.id);
    if (existingIndex >= 0) {
      db['profiles'][existingIndex] = { ...db['profiles'][existingIndex], ...cp };
    } else {
      db['profiles'].push(cp);
    }
  }

  for (const cw of canonicalWorkers) {
    const existingIndex = db['bhw_workers'].findIndex((w: any) => 
      (w.gmail || "").toLowerCase().trim() === cw.gmail.toLowerCase().trim() || w.id === cw.id
    );
    if (existingIndex >= 0) {
      db['bhw_workers'][existingIndex] = { 
        ...db['bhw_workers'][existingIndex], 
        name: cw.name, 
        gmail: cw.gmail, 
        assigned_sitio: cw.assigned_sitio, 
        number: cw.number, 
        user_id: cw.user_id 
      };
    } else {
      db['bhw_workers'].push(cw);
    }
  }

  // Sync online status for any worker currently signed in or present
  if (db['bhw_workers']) {
    let currentEmail = "";
    let currentUserId = "";
    try {
      const sessionStr = localStorage.getItem('supabase_mock_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        currentEmail = (session?.user?.email || "").toLowerCase().trim();
        currentUserId = session?.user?.id || "";
      }
    } catch {}

    let presences: Record<string, any> = {};
    try {
      const pStr = localStorage.getItem('bhw_active_presence');
      if (pStr) presences = JSON.parse(pStr);
    } catch {}

    const now = Date.now();
    const THRESHOLD = 60 * 1000;

    db['bhw_workers'] = db['bhw_workers'].map((w: any) => {
      const email = (w.gmail || "").toLowerCase().trim();
      const uid = w.user_id;

      const isSessMatch = (currentEmail && email === currentEmail) || (currentUserId && uid === currentUserId);
      const isPresenceMatch = 
        (email && presences[email] && presences[email].isOnline && (now - new Date(presences[email].lastSeen).getTime() < THRESHOLD)) ||
        (uid && presences[uid] && presences[uid].isOnline && (now - new Date(presences[uid].lastSeen).getTime() < THRESHOLD));

      const isOnline = Boolean(isSessMatch || isPresenceMatch);

      return {
        ...w,
        is_online: isOnline,
        last_seen: isOnline ? new Date().toISOString() : w.last_seen
      };
    });
  }

  saveAndBroadcastMockDb(db);
}

class MockRealtimeChannel {
  private topic: string;

  constructor(topic: string) {
    this.topic = topic;
  }

  on(_type: string, _filter: any, _callback: (payload: any) => void) {
    return this;
  }

  subscribe(callback?: (status: string) => void) {
    if (callback) {
      setTimeout(() => callback("SUBSCRIBED"), 0);
    }
    return this;
  }

  unsubscribe() {
    return Promise.resolve("ok");
  }
}

class MockStorageBucket {
  private bucketName: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
  }

  async upload(path: string, file: File | Blob | any, _options?: any) {
    try {
      let dataUrl = "";
      if (file instanceof Blob || (typeof File !== "undefined" && file instanceof File)) {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else if (typeof file === "string") {
        dataUrl = file;
      }
      
      const storageKey = `mock_storage_${this.bucketName}_${path}`;
      try {
        localStorage.setItem(storageKey, dataUrl);
      } catch (e) {
        console.warn("Storage quota warning:", e);
      }
      return { data: { path }, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  getPublicUrl(path: string) {
    const storageKey = `mock_storage_${this.bucketName}_${path}`;
    const stored = localStorage.getItem(storageKey);
    return {
      data: {
        publicUrl: stored || (path.startsWith("data:") || path.startsWith("http") ? path : "")
      }
    };
  }

  async remove(paths: string[]) {
    paths.forEach(p => {
      localStorage.removeItem(`mock_storage_${this.bucketName}_${p}`);
    });
    return { data: paths, error: null };
  }

  async createSignedUrl(path: string) {
    return { data: { signedUrl: this.getPublicUrl(path).data.publicUrl }, error: null };
  }

  async list() {
    return { data: [], error: null };
  }
}

class MockStorage {
  from(bucketName: string) {
    return new MockStorageBucket(bucketName);
  }
}

export const mockSupabase = {
  auth: new MockAuth(),
  from: (table: string) => new MockQueryBuilder(table),
  storage: new MockStorage(),
  functions: new MockFunctions(),
  channel: (topic: string) => new MockRealtimeChannel(topic),
  removeChannel: (_channel: any) => Promise.resolve("ok"),
  removeAllChannels: () => Promise.resolve([]),
} as any;
