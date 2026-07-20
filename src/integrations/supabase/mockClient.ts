import { Database } from './types';

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
      localStorage.setItem('supabase_mock_db', JSON.stringify(db));
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
      localStorage.setItem('supabase_mock_db', JSON.stringify(db));
      return { data: updatedData, error: null, count: updatedCount };
    }

    if (this.isDelete) {
      const initialLength = db[this.tableName].length;
      db[this.tableName] = db[this.tableName].filter((item: any) => {
        const matches = this.filters.every(filter => filter(item));
        return !matches;
      });
      const deletedCount = initialLength - db[this.tableName].length;
      localStorage.setItem('supabase_mock_db', JSON.stringify(db));
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
      if (newItem.resident_id) {
        const residents = db['residents'] || [];
        newItem.residents = residents.find((r: any) => r.id === newItem.resident_id) || null;
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

// Mock Auth system
class MockAuth {
  private listeners: Array<(event: string, session: any) => void> = [];

  async signInWithPassword({ email, password }: any) {
    seedMockDatabase();
    const dbStr = localStorage.getItem('supabase_mock_db');
    const db = dbStr ? JSON.parse(dbStr) : {};
    const users = db['auth_users'] || [];
    
    const cleanEmail = (email || "").trim().toLowerCase();
    const user = users.find((u: any) => (u.email || "").trim().toLowerCase() === cleanEmail && u.password === password);
    if (!user) {
      return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
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

    localStorage.setItem('supabase_mock_session', JSON.stringify(session));
    this.triggerListeners("SIGNED_IN", session);
    return { data: { user: session.user, session }, error: null };
  }

  async signOut() {
    localStorage.removeItem('supabase_mock_session');
    this.triggerListeners("SIGNED_OUT", null);
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
      
      localStorage.setItem('supabase_mock_db', JSON.stringify(db));
      return { data: { success: true }, error: null };
    }
    
    if (name === "scan-form") {
      return {
        data: {
          title: "Immunization and Child Health Form",
          description: "Extracted from uploaded health card photo",
          fields: [
            { label: "Child Full Name", type: "text", value: "" },
            { label: "Date of Birth", type: "date", value: "" },
            { label: "Weight (kg)", type: "number", value: "" },
            { label: "Height (cm)", type: "number", value: "" },
            { label: "Received BCG Vaccine", type: "checkbox", value: "false" },
            { label: "Received DPT Vaccine", type: "checkbox", value: "false" },
            { label: "Remarks", type: "textarea", value: "" }
          ]
        },
        error: null
      };
    }
    
    return { data: null, error: { message: `Function ${name} not mocked` } };
  }
}

// Global seeding function
export function seedMockDatabase() {
  const dbStr = localStorage.getItem('supabase_mock_db');
  let db: any = {};
  if (dbStr) {
    db = JSON.parse(dbStr);
  }

  // Ensure default tables exist
  if (!db['auth_users']) db['auth_users'] = [];
  if (!db['user_roles']) db['user_roles'] = [];
  if (!db['profiles']) db['profiles'] = [];
  if (!db['bhw_workers']) db['bhw_workers'] = [];

  const defaultUsers = [
    { id: "user-1", email: "krystelcomia@gmail.com", password: "krystel123", user_metadata: { full_name: "Krystel Comia" } },
    { id: "user-admin", email: "adminsubukin@gmail.com", password: "adminmidwife", user_metadata: { full_name: "Admin Midwife" } },
    { id: "user-cristeta", email: "cristetalanuzaBHW@gmail.com", password: "bhwcristeta", user_metadata: { full_name: "Cristeta R. Lanuza" } },
    { id: "user-evelyn", email: "evelynilaoBHW@gmail.com", password: "bhwevelyn", user_metadata: { full_name: "Evelyn T. Ilao" } },
    { id: "user-cecilia", email: "ceciliabenosaBHW@gmail.com", password: "bhwcecilia", user_metadata: { full_name: "Cecilia G. Benosa" } },
    { id: "user-merlita", email: "merlitaalonzoBHW@gmail.com", password: "bhwmerlita", user_metadata: { full_name: "Merlita R. Alonzo" } },
    { id: "user-suzette", email: "suzettelopezBHW@gmail.com", password: "bhwsuzette", user_metadata: { full_name: "Suzette B. Lopez" } },
    { id: "user-amelita", email: "amelitasayatBHW@gmail.com", password: "bhwamelita", user_metadata: { full_name: "Amelita R. Sayat" } },
    { id: "user-wilma", email: "wilmatanyagBHW@gmail.com", password: "bhwawilma", user_metadata: { full_name: "Wilma D. Tanyag" } },
    { id: "user-nenita", email: "nenitadimaculanganBHW@gmail.com", password: "bhwanenita", user_metadata: { full_name: "Nenita M. Dimaculangan" } },
    { id: "user-mercy", email: "mercyabanillaBHW@gmail.com", password: "bhwmercy", user_metadata: { full_name: "Mercy O. Abanilla" } },
    { id: "user-renchie", email: "renchieilaoBHW@gmail.com", password: "bhwrenchie", user_metadata: { full_name: "Renchie V. Ilao" } },
    { id: "user-renalyn", email: "renalynlauranteBHW@gmail.com", password: "bhwrenalyn", user_metadata: { full_name: "Renalyn D. Laurante" } },
    { id: "user-maribel", email: "maribelabayonBNS@gmail.com", password: "bnsmaribel", user_metadata: { full_name: "Maribel M. Abayon" } }
  ];

  const defaultRoles = [
    { id: "role-1", user_id: "user-1", role: "bhw" },
    { id: "role-admin", user_id: "user-admin", role: "supervisor" },
    { id: "role-cristeta", user_id: "user-cristeta", role: "supervisory" },
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
  ];

  defaultUsers.forEach(u => {
    if (!db['auth_users'].some((existing: any) => existing.email.toLowerCase() === u.email.toLowerCase())) {
      db['auth_users'].push(u);
    }
  });

  defaultRoles.forEach(r => {
    if (!db['user_roles'].some((existing: any) => existing.user_id === r.user_id)) {
      db['user_roles'].push(r);
    }
  });

  db['auth_users'] = [
    { id: "user-1", email: "krystelcomia@gmail.com", password: "krystel123", user_metadata: { full_name: "Krystel Comia" } },
    { id: "user-admin", email: "adminsubukin@gmail.com", password: "adminmidwife", user_metadata: { full_name: "Admin Midwife" } },
    { id: "user-cristeta", email: "cristetalanuzaBHW@gmail.com", password: "bhwcristeta", user_metadata: { full_name: "Cristeta R. Lanuza" } },
    { id: "user-evelyn", email: "evelynilaoBHW@gmail.com", password: "bhwevelyn", user_metadata: { full_name: "Evelyn T. Ilao" } },
    { id: "user-cecilia", email: "ceciliabenosaBHW@gmail.com", password: "bhwcecilia", user_metadata: { full_name: "Cecilia G. Benosa" } },
    { id: "user-merlita", email: "merlitaalonzoBHW@gmail.com", password: "bhwmerlita", user_metadata: { full_name: "Merlita R. Alonzo" } },
    { id: "user-suzette", email: "suzettelopezBHW@gmail.com", password: "bhwsuzette", user_metadata: { full_name: "Suzette B. Lopez" } },
    { id: "user-amelita", email: "amelitasayatBHW@gmail.com", password: "bhwamelita", user_metadata: { full_name: "Amelita R. Sayat" } },
    { id: "user-wilma", email: "wilmatanyagBHW@gmail.com", password: "bhwawilma", user_metadata: { full_name: "Wilma D. Tanyag" } },
    { id: "user-nenita", email: "nenitadimaculanganBHW@gmail.com", password: "bhwanenita", user_metadata: { full_name: "Nenita M. Dimaculangan" } },
    { id: "user-mercy", email: "mercyabanillaBHW@gmail.com", password: "bhwmercy", user_metadata: { full_name: "Mercy O. Abanilla" } },
    { id: "user-renchie", email: "renchieilaoBHW@gmail.com", password: "bhwrenchie", user_metadata: { full_name: "Renchie V. Ilao" } },
    { id: "user-renalyn", email: "renalynlauranteBHW@gmail.com", password: "bhwrenalyn", user_metadata: { full_name: "Renalyn D. Laurante" } },
    { id: "user-maribel", email: "maribelabayonBNS@gmail.com", password: "bnsmaribel", user_metadata: { full_name: "Maribel M. Abayon" } }
  ];

  db['user_roles'] = [
    { id: "role-1", user_id: "user-1", role: "bhw" },
    { id: "role-admin", user_id: "user-admin", role: "supervisor" },
    { id: "role-cristeta", user_id: "user-cristeta", role: "supervisory" },
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
  ];

  db['profiles'] = [
    { id: "profile-1", user_id: "user-1", full_name: "Krystel Comia", username: "krystel" },
    { id: "profile-admin", user_id: "user-admin", full_name: "Admin Midwife", username: "admin" },
    { id: "profile-cristeta", user_id: "user-cristeta", full_name: "Cristeta R. Lanuza", username: "Cristeta" },
    { id: "profile-evelyn", user_id: "user-evelyn", full_name: "Evelyn T. Ilao", username: "Evelyn" },
    { id: "profile-cecilia", user_id: "user-cecilia", full_name: "Cecilia G. Benosa", username: "Cecilia" },
    { id: "profile-merlita", user_id: "user-merlita", full_name: "Merlita R. Alonzo", username: "Merlita" },
    { id: "profile-suzette", user_id: "user-suzette", full_name: "Suzette B. Lopez", username: "Suzette" },
    { id: "profile-amelita", user_id: "user-amelita", full_name: "Amelita R. Sayat", username: "Amelita" },
    { id: "profile-wilma", user_id: "user-wilma", full_name: "Wilma D. Tanyag", username: "Wilma" },
    { id: "profile-nenita", user_id: "user-nenita", full_name: "Nenita M. Dimaculangan", username: "Nenita" },
    { id: "profile-mercy", user_id: "user-mercy", full_name: "Mercy O. Abanilla", username: "Mercy" },
    { id: "profile-renchie", user_id: "user-renchie", full_name: "Renchie V. Ilao", username: "Renchie" },
    { id: "profile-renalyn", user_id: "user-renalyn", full_name: "Renalyn D. Laurante", username: "Renalyn" },
    { id: "profile-maribel", user_id: "user-maribel", full_name: "Maribel M. Abayon", username: "Maribel" }
  ];

  db['bhw_workers'] = [
    { id: "worker-1", name: "Krystel Comia", age: 28, address: "Sitio Centro, Subukin", gmail: "krystelcomia@gmail.com", number: "09123456789", is_online: true, user_id: "user-1", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "worker-cristeta", name: "Cristeta R. Lanuza", age: 0, address: "", gmail: "cristetalanuzaBHW@gmail.com", number: "", is_online: false, user_id: "user-cristeta", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "worker-evelyn", name: "Evelyn T. Ilao", age: 0, address: "", gmail: "evelynilaoBHW@gmail.com", number: "", is_online: false, user_id: "user-evelyn", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "worker-cecilia", name: "Cecilia G. Benosa", age: 0, address: "", gmail: "ceciliabenosaBHW@gmail.com", number: "", is_online: false, user_id: "user-cecilia", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "worker-merlita", name: "Merlita R. Alonzo", age: 0, address: "", gmail: "merlitaalonzoBHW@gmail.com", number: "", is_online: false, user_id: "user-merlita", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "worker-suzette", name: "Suzette B. Lopez", age: 0, address: "", gmail: "suzettelopezBHW@gmail.com", number: "", is_online: false, user_id: "user-suzette", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "worker-amelita", name: "Amelita R. Sayat", age: 0, address: "", gmail: "amelitasayatBHW@gmail.com", number: "", is_online: false, user_id: "user-amelita", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "worker-wilma", name: "Wilma D. Tanyag", age: 0, address: "", gmail: "wilmatanyagBHW@gmail.com", number: "", is_online: false, user_id: "user-wilma", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "worker-nenita", name: "Nenita M. Dimaculangan", age: 0, address: "", gmail: "nenitadimaculanganBHW@gmail.com", number: "", is_online: false, user_id: "user-nenita", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "worker-mercy", name: "Mercy O. Abanilla", age: 0, address: "", gmail: "mercyabanillaBHW@gmail.com", number: "", is_online: false, user_id: "user-mercy", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "worker-renchie", name: "Renchie V. Ilao", age: 0, address: "", gmail: "renchieilaoBHW@gmail.com", number: "", is_online: false, user_id: "user-renchie", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "worker-renalyn", name: "Renalyn D. Laurante", age: 0, address: "", gmail: "renalynlauranteBHW@gmail.com", number: "", is_online: false, user_id: "user-renalyn", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: "worker-maribel", name: "Maribel M. Abayon", age: 0, address: "", gmail: "maribelabayonBNS@gmail.com", number: "", is_online: false, user_id: "user-maribel", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ];

  if (!db['residents']) {
    db['residents'] = [
      {
        id: "res-1",
        full_name: "Maria Santos",
        gender: "Female",
        age: 32,
        status: "Married",
        religion: "Roman Catholic",
        blood_type: "A+",
        nationality: "Filipino",
        sitio: "Centro",
        birthday: "1994-05-12",
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "res-2",
        full_name: "Juan dela Cruz",
        gender: "Male",
        age: 45,
        status: "Married",
        religion: "Christian",
        blood_type: "O+",
        nationality: "Filipino",
        sitio: "Ilaya",
        birthday: "1981-11-23",
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "res-3",
        full_name: "Baby Angelo Cruz",
        gender: "Male",
        age: 2,
        status: "Single",
        religion: "Roman Catholic",
        blood_type: "",
        nationality: "Filipino",
        sitio: "Ibaba",
        birthday: "2024-02-15",
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "res-4",
        full_name: "Elena Roxas",
        gender: "Female",
        age: 67,
        status: "Widowed",
        religion: "Roman Catholic",
        blood_type: "B-",
        nationality: "Filipino",
        sitio: "Centro",
        birthday: "1959-08-05",
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  if (!db['consultations']) {
    db['consultations'] = [
      {
        id: "con-1",
        resident_id: "res-1",
        birthdate: "1994-05-12",
        age: 32,
        sitio: "Centro",
        consultation_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        temperature: "36.7",
        pulse_rate: "72",
        respiration_rate: "18",
        height: "155",
        weight: "54",
        consultation_cause: "Routine prenatal checkup",
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "con-2",
        resident_id: "res-2",
        birthdate: "1981-11-23",
        age: 45,
        sitio: "Ilaya",
        consultation_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        temperature: "38.2",
        pulse_rate: "85",
        respiration_rate: "22",
        height: "170",
        weight: "68",
        consultation_cause: "Fever and cough",
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  if (!db['family_data']) {
    db['family_data'] = [
      {
        id: "fam-1",
        resident_id: "res-1",
        family_number: "FAM-001",
        num_households: 1,
        father_name: "Pedro Santos",
        mother_name: "Maria Santos",
        num_males: 1,
        num_females: 1,
        total_members: 2,
        created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  if (!db['philpen_health']) {
    db['philpen_health'] = [
      {
        id: "pen-1",
        resident_id: "res-2",
        address_sitio: "Ilaya",
        age: 45,
        birthdate: "1981-11-23",
        record_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        bp: "130/80",
        height: "170",
        weight: "68",
        bmi: "23.5",
        smokes: true,
        drinks_alcohol: true,
        high_blood_pressure: true,
        diabetes_symptoms: false,
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  if (!db['dengue_prevention']) {
    db['dengue_prevention'] = [
      {
        id: "den-1",
        resident_id: "res-1",
        household_name: "Santos Household",
        container_type: "Water Drum",
        has_larvae: false,
        action_plan: "Cover container tightly and clean weekly",
        signature: "M. Santos",
        created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  if (!db['family_planning']) {
    db['family_planning'] = [
      {
        id: "fp-1",
        resident_id: "res-1",
        method: "Pills",
        start_date: "2025-01-10",
        remarks: "Given 3 cycles",
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  if (!db['maternal_care']) {
    db['maternal_care'] = [
      {
        id: "mat-1",
        resident_id: "res-1",
        checkup_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        remarks: "Healthy pregnancy, BP normal",
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  if (!db['child_health']) {
    db['child_health'] = [
      {
        id: "ch-1",
        resident_id: "res-3",
        checkup_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        remarks: "Received basic checkup, weight and height on track",
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  if (!db['user_sessions']) db['user_sessions'] = [];
  if (!db['user_activity_logs']) db['user_activity_logs'] = [];

  localStorage.setItem('supabase_mock_db', JSON.stringify(db));
}

export const mockSupabase = {
  auth: new MockAuth(),
  from: (table: string) => new MockQueryBuilder(table),
  functions: new MockFunctions(),
} as any;
