import { useState } from "react";
import { EVENTS } from "../../data/events";
import { useRegisterStore } from "../../stores/useRegisterStore";
import QrCode from "./QrCode";

const YEARS = ["I", "II", "III", "IV", "PG"];
const DEPARTMENTS = [
  "CSE",
  "IT",
  "ECE",
  "EEE",
  "MECH",
  "CIVIL",
  "AI & DS",
  "OTHER",
];
const EMPTY_LEADER = {
  name: "",
  email: "",
  phone: "",
  college: "SRM Valliammai Engineering College",
  dept: "CSE",
  year: "II",
};
const EMPTY_MEMBER = { name: "", dept: "CSE", year: "II", phone: "" };

export default function RegForm({ type }) {
  const closeRegister = useRegisterStore((s) => s.closeRegister);
  const [leader, setLeader] = useState(EMPTY_LEADER);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState([{ ...EMPTY_MEMBER }]);
  const [events, setEvents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const setLeaderField = (key) => (e) =>
    setLeader((p) => ({ ...p, [key]: e.target.value }));
  const setMemberField = (i, key) => (e) =>
    setMembers((p) =>
      p.map((m, idx) => (idx === i ? { ...m, [key]: e.target.value } : m))
    );
  const addMember = () =>
    setMembers((p) => (p.length < 4 ? [...p, { ...EMPTY_MEMBER }] : p));
  const removeMember = (i) =>
    setMembers((p) => p.filter((_, idx) => idx !== i));
  const toggleEvent = (ev) =>
    setEvents((p) =>
      p.includes(ev) ? p.filter((x) => x !== ev) : [...p, ev]
    );

  const reset = () => {
    setResult(null);
    setError("");
    setLeader({ ...EMPTY_LEADER });
    setTeamName("");
    setMembers([{ ...EMPTY_MEMBER }]);
    setEvents([]);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          teamName: type === "group" ? teamName : undefined,
          leader,
          members: type === "group" ? members : [],
          events,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Registration failed.");
      setResult(data);
    } catch (err) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /* ── Success: the entry pass ── */
  if (result) {
    return (
      <div className="reg-success">
        <h3>Registration Complete</h3>
        <p>
          {type === "group" ? "Your team is" : "You are"} in the realm. Show
          this pass at the venue.
        </p>
        <div className="reg-success__id">{result.id}</div>
        <QrCode value={result.id} size={150} className="reg-success__qr" />
        <div className="reg-success__actions">
          <button
            type="button"
            className="reg-btn reg-btn--ghost"
            onClick={reset}
          >
            Register Another
          </button>
          <button type="button" className="reg-btn" onClick={closeRegister}>
            Done
          </button>
        </div>
      </div>
    );
  }

  /* ── The form ── */
  return (
    <form className="reg-form" onSubmit={submit}>
      {type === "group" && (
        <label className="reg-field">
          <span>Team Name *</span>
          <input
            required
            minLength={2}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Team Valyria"
          />
        </label>
      )}

      <div className="reg-grid">
        <label className="reg-field">
          <span>{type === "group" ? "Leader Name *" : "Full Name *"}</span>
          <input
            required
            value={leader.name}
            onChange={setLeaderField("name")}
            placeholder="Your name"
          />
        </label>
        <label className="reg-field">
          <span>Email *</span>
          <input
            required
            type="email"
            value={leader.email}
            onChange={setLeaderField("email")}
            placeholder="you@example.com"
          />
        </label>
        <label className="reg-field">
          <span>Phone *</span>
          <input
            required
            type="tel"
            inputMode="numeric"
            value={leader.phone}
            onChange={setLeaderField("phone")}
            placeholder="10-digit number"
          />
        </label>
        <label className="reg-field">
          <span>College</span>
          <input value={leader.college} onChange={setLeaderField("college")} />
        </label>
        <label className="reg-field">
          <span>Department</span>
          <select value={leader.dept} onChange={setLeaderField("dept")}>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="reg-field">
          <span>Year</span>
          <select value={leader.year} onChange={setLeaderField("year")}>
            {YEARS.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>

      {type === "group" && (
        <div className="reg-members">
          <div className="reg-members__head">
            <span>Team Members ({members.length}/4)</span>
            <button
              type="button"
              className="reg-btn reg-btn--ghost"
              onClick={addMember}
              disabled={members.length >= 4}
            >
              + Add Member
            </button>
          </div>
          {members.map((m, i) => (
            <div className="reg-member" key={i}>
              <div className="reg-member__row">
                <input
                  required
                  placeholder={`Member ${i + 1} name`}
                  value={m.name}
                  onChange={setMemberField(i, "name")}
                />
                <button
                  type="button"
                  className="reg-member__remove"
                  onClick={() => removeMember(i)}
                  disabled={members.length <= 1}
                  title="Remove member"
                >
                  ✕
                </button>
              </div>
              <div className="reg-member__row reg-member__row--meta">
                <select value={m.dept} onChange={setMemberField(i, "dept")}>
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                <select value={m.year} onChange={setMemberField(i, "year")}>
                  {YEARS.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
                <input
                  placeholder="Phone (optional)"
                  inputMode="numeric"
                  value={m.phone}
                  onChange={setMemberField(i, "phone")}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="reg-events">
        <span className="reg-events__label">Events (optional)</span>
        <div className="reg-events__chips">
          {EVENTS.map((ev) => (
            <button
              type="button"
              key={ev}
              className={events.includes(ev) ? "chip active" : "chip"}
              onClick={() => toggleEvent(ev)}
            >
              {ev}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="reg-error">{error}</div>}

      <button className="reg-btn reg-btn--submit" disabled={busy}>
        {busy
          ? "Forging your pass…"
          : type === "group"
            ? "Register Team"
            : "Register"}
      </button>
    </form>
  );
}