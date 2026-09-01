import fs from "fs";
import path from "path";

// Global cache in serverless runtime
let inMemoryDb = null;

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    res.setHeader("Content-Type", "application/json");
    if (inMemoryDb) {
      return res.status(200).json(inMemoryDb);
    }
    try {
      const filePath = path.join(process.cwd(), "bhw_shared_database.json");
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        inMemoryDb = JSON.parse(content);
        return res.status(200).json(inMemoryDb);
      }
    } catch (e) {}

    return res.status(200).json({});
  }

  if (req.method === "POST" || req.method === "PUT") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (body && typeof body === "object") {
        inMemoryDb = body;
      }
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message || "Failed to update db" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
