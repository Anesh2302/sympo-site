import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/* ═══════════════════════════════════════════════════════════════
   Zyverse 2K26 — registration store.

   Two storage modes, chosen automatically:
   1. Supabase (production): used when SUPABASE_URL + SUPABASE_SERVICE_KEY
      env vars are set (see database/schema.sql for the table).
   2. Local JSON file (development fallback): data/registrations.json,
      created automatically next to the project root.

   The same module is used by:
   - the /api/* serverless functions (Vercel production), and
   - the local dev middleware in vite.config.js.
   ═══════════════════════════════════════════════════════════════ */

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "registrations.json");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "";

const useSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

/* ── Local JSON helpers ── */
function readLocal() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeLocal(rows) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2));
}

/* ── IDs like ZY26-7K2XQ (no ambiguous characters) ── */
export function generateRegistrationId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += alphabet[crypto.randomInt(alphabet.length)];
  }
  return `ZY26-${code}`;
}

/* ── Validation: returns an error string or null when valid ── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(p = {}) {
  if (!p || (p.type !== "solo" && p.type !== "group")) {
    return "Invalid registration type.";
  }
  if (p.type === "group" && String(p.teamName || "").trim().length < 2) {
    return "Team name is required for group registration.";
  }
  const leader = p.leader || {};
  if (String(leader.name || "").trim().length < 2) {
    return "Name is required.";
  }
  if (!EMAIL_RE.test(String(leader.email || ""))) {
    return "A valid email is required.";
  }
  const digits = String(leader.phone || "").replace(/\D/g, "");
  if (digits.length < 10) {
    return "A valid 10-digit phone number is required.";
  }
  const members = Array.isArray(p.members) ? p.members : [];
  if (p.type === "group" && members.length < 1) {
    return "Add at least one team member.";
  }
  if (members.length > 4) {
    return "A team can have at most 4 members (plus the leader).";
  }
  for (const m of members) {
    if (String(m?.name || "").trim().length < 2) {
      return "Every team member needs a name.";
    }
  }
  return null;
}

/* ── Keep only known fields, normalised ── */
const str = (v) => String(v ?? "").trim();
const digits10 = (v) => str(v).replace(/\D/g, "").slice(-10);

export function normalizeRegistration(p = {}) {
  return {
    type: p.type,
    teamName: str(p.teamName) || null,
    leader: {
      name: str(p.leader?.name),
      email: str(p.leader?.email).toLowerCase(),
      phone: digits10(p.leader?.phone),
      college: str(p.leader?.college) || null,
      dept: str(p.leader?.dept) || null,
      year: str(p.leader?.year) || null,
    },
    members: (Array.isArray(p.members) ? p.members : []).map((m) => ({
      name: str(m?.name),
      dept: str(m?.dept) || null,
      year: str(m?.year) || null,
      phone: m?.phone ? digits10(m.phone) : null,
    })),
    events: (Array.isArray(p.events) ? p.events : [])
      .map((ev) => str(ev))
      .filter(Boolean),
  };
}

/* ── Save one registration; returns the stored record ── */
export async function saveRegistration(clean) {
  const record = {
    id: generateRegistrationId(),
    ...clean,
    created_at: new Date().toISOString(),
  };

  if (useSupabase) {
    // Flattened mapping for the SQL table in database/schema.sql
    const row = {
      id: record.id,
      type: record.type,
      team_name: record.teamName,
      leader_name: record.leader.name,
      email: record.leader.email,
      phone: record.leader.phone,
      college: record.leader.college,
      dept: record.leader.dept,
      year: record.leader.year,
      events: record.events,
      members: record.members,
      created_at: record.created_at,
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/registrations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      throw new Error(`Supabase error ${res.status}`);
    }
  } else {
    if (process.env.VERCEL) {
      // Serverless filesystems are ephemeral — a real database is
      // required in production (see database/schema.sql).
      throw new Error(
        "Database not configured: set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables (see database/schema.sql)."
      );
    }
    const rows = readLocal();
    rows.push(record);
    writeLocal(rows);
  }

  return record;
}

/* ── List all registrations (newest first) ── */
export async function listRegistrations() {
  if (useSupabase) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?select=*&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) {
      throw new Error(`Supabase error ${res.status}`);
    }
    return res.json();
  }
  return readLocal().sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1
  );
}

export const ADMIN_KEY = process.env.ADMIN_KEY || "zyverse2026";