import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";
import {
  saveRegistration,
  listRegistrations,
  validateRegistration,
  normalizeRegistration,
  ADMIN_KEY,
} from "./server/registrationStore.js";

// Local development API — mirrors the /api serverless functions
// (api/register.js + api/registrations.js) used in production on Vercel.
function zyverseLocalApi() {
  return {
    name: "zyverse-local-api",
    configureServer(server) {
      const json = (res, status, payload) => {
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(payload));
      };

      server.middlewares.use("/api/registrations", (req, res) => {
        const url = new URL(req.url, "http://localhost");
        if (url.searchParams.get("key") !== ADMIN_KEY) {
          json(res, 401, { ok: false, error: "Unauthorized" });
          return;
        }
        listRegistrations()
          .then((registrations) =>
            json(res, 200, {
              ok: true,
              count: registrations.length,
              registrations,
            })
          )
          .catch(() =>
            json(res, 500, { ok: false, error: "Could not load data." })
          );
      });

      server.middlewares.use("/api/register", (req, res) => {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body || "{}");
            const error = validateRegistration(payload);
            if (error) {
              json(res, 400, { ok: false, error });
              return;
            }
            saveRegistration(normalizeRegistration(payload))
              .then((record) => json(res, 200, { ok: true, id: record.id }))
              .catch(() =>
                json(res, 500, {
                  ok: false,
                  error: "Could not save the registration.",
                })
              );
          } catch {
            json(res, 400, { ok: false, error: "Invalid JSON body." });
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), glsl(), zyverseLocalApi()],
  server: {
    port: 2026, // Zyverse 2K26 ⚔️
    host: true,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          drei: ["@react-three/drei", "@react-three/fiber"],
          vendor: ["react", "react-dom", "gsap", "zustand"],
        },
      },
    },
  },
});
