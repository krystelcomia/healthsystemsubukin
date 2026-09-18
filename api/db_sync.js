import fs from "fs";
import path from "path";

// Global cache in serverless runtime
let inMemoryDb = null;
const TMP_FILE_PATH = "/tmp/bhw_shared_database.json";

function loadDatabase() {
  let db = null;
  try {
    const filePath = path.join(process.cwd(), "bhw_shared_database.json");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      db = JSON.parse(content);
    }
  } catch (e) {}

  if (!db) {
    try {
      if (fs.existsSync(TMP_FILE_PATH)) {
        const content = fs.readFileSync(TMP_FILE_PATH, "utf-8");
        db = JSON.parse(content);
      }
    } catch (e) {}
  }

  if (inMemoryDb && Object.keys(inMemoryDb).length > 0) {
    db = { ...db, ...inMemoryDb };
  }

  if (db) {
    const PURGE_KEY = "bhw_records_purged_family_and_dengue_v2";
    if (!db[PURGE_KEY]) {
      db.family_data = [];
      db.dengue_prevention = [];
      db[PURGE_KEY] = true;
      try {
        fs.writeFileSync(TMP_FILE_PATH, JSON.stringify(db), "utf-8");
      } catch (e) {}
    }
    inMemoryDb = db;
    return db;
  }

  return null;
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    const db = loadDatabase();
    if (db) {
      return res.status(200).json(db);
    }
    return res.status(200).json({});
  }

  if (req.method === "POST" || req.method === "PUT") {
    try {
      let body = req.body;
      if (Buffer.isBuffer(body)) {
        body = JSON.parse(body.toString("utf-8"));
      } else if (typeof body === "string") {
        body = JSON.parse(body);
      }
      if (body && typeof body === "object") {
        const PURGE_KEY = "bhw_records_purged_family_and_dengue_v2";
        if (!body[PURGE_KEY]) {
          body.family_data = [];
          body.dengue_prevention = [];
          body[PURGE_KEY] = true;
        }
        inMemoryDb = body;
        try {
          fs.writeFileSync(TMP_FILE_PATH, JSON.stringify(body), "utf-8");
        } catch (e) {}
        try {
          const filePath = path.join(process.cwd(), "bhw_shared_database.json");
          fs.writeFileSync(filePath, JSON.stringify(body, null, 2), "utf-8");
        } catch (e) {}
      }
      return res.status(200).json({ success: true, timestamp: Date.now() });
    } catch (e) {
      return res.status(500).json({ error: e.message || "Failed to update db" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
