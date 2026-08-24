import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

function crossBrowserDbSyncPlugin(): Plugin {
  const dbFilePath = path.resolve(__dirname, "./bhw_shared_database.json");
  const subscribers: Array<(data: string) => void> = [];

  return {
    name: "cross-browser-db-sync-plugin",
    configureServer(server) {
      server.middlewares.use("/__db_sync", (req: any, res: any, next: any) => {
        if (req.url === "/events" && req.method === "GET") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });
          res.write("event: connected\ndata: {}\n\n");
          const handler = (data: string) => {
            res.write(`event: db_update\ndata: ${data}\n\n`);
          };
          subscribers.push(handler);
          req.on("close", () => {
            const idx = subscribers.indexOf(handler);
            if (idx >= 0) subscribers.splice(idx, 1);
          });
          return;
        }

        if (req.method === "GET") {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", "*");
          if (fs.existsSync(dbFilePath)) {
            try {
              const content = fs.readFileSync(dbFilePath, "utf-8");
              res.end(content);
              return;
            } catch (e) {}
          }
          res.end(JSON.stringify({}));
          return;
        }

        if (req.method === "POST" || req.method === "PUT") {
          let body = "";
          req.on("data", (chunk: any) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              if (body) {
                fs.writeFileSync(dbFilePath, body, "utf-8");
                subscribers.forEach((cb) => cb(body));
              }
              res.setHeader("Content-Type", "application/json");
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err?.message || "Failed to save" }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), crossBrowserDbSyncPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
