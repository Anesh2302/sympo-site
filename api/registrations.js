import { listRegistrations, ADMIN_KEY } from "../server/registrationStore.js";

/* Vercel serverless function: GET /api/registrations?key=<ADMIN_KEY> */
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const key =
    (req.query && req.query.key) ||
    new URL(req.url, "http://localhost").searchParams.get("key");

  if (key !== ADMIN_KEY) {
    res.statusCode = 401;
    res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
    return;
  }

  try {
    const registrations = await listRegistrations();
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        count: registrations.length,
        registrations,
      })
    );
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: "Could not load data." }));
  }
}