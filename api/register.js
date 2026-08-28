import {
  saveRegistration,
  validateRegistration,
  normalizeRegistration,
} from "../server/registrationStore.js";

/* Vercel serverless function: POST /api/register */
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  try {
    const body = await readBody(req);
    const error = validateRegistration(body);
    if (error) {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error }));
      return;
    }

    const record = await saveRegistration(normalizeRegistration(body));
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, id: record.id }));
  } catch (err) {
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        ok: false,
        error: err?.message || "Could not save the registration.",
      })
    );
  }
}