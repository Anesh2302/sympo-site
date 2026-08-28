import { useEffect, useState } from "react";
import "./RegisterOverlay.scss";
import { useRegisterStore } from "../../stores/useRegisterStore";
import RegForm from "./RegForm";
import QrCode from "./QrCode";

/* ═══════════════════════════════════════════════════════════════
   Registration overlay — solo + group, with a scan-to-register
   QR so attendees can open it on their own phone.
   Opens automatically on /register (that's what the QR points to).
   ═══════════════════════════════════════════════════════════════ */
export default function RegisterOverlay() {
  const isRegisterOpen = useRegisterStore((s) => s.isRegisterOpen);
  const closeRegister = useRegisterStore((s) => s.closeRegister);
  const [tab, setTab] = useState("solo");

  useEffect(() => {
    if (!isRegisterOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeRegister();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isRegisterOpen, closeRegister]);

  useEffect(() => {
    document.body.style.overflow = isRegisterOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isRegisterOpen]);

  if (!isRegisterOpen) return null;

  return (
    <div
      className="reg-overlay"
      onMouseDown={(e) => {
        if (!e.target.closest(".reg-panel")) closeRegister();
      }}
    >
      <div className="reg-panel">
        <button className="reg-close" onClick={closeRegister} aria-label="Close">
          ✕
        </button>

        <header className="reg-head">
          <h2>Register</h2>
          <p>ZYVERSE 2K26 — National Level Technical Symposium</p>
        </header>

        <div className="reg-tabs">
          <button
            type="button"
            className={tab === "solo" ? "active" : ""}
            onClick={() => setTab("solo")}
          >
            Solo
          </button>
          <button
            type="button"
            className={tab === "group" ? "active" : ""}
            onClick={() => setTab("group")}
          >
            Group
          </button>
        </div>

        <RegForm key={tab} type={tab} />

        <footer className="reg-scan">
          <QrCode value={`${window.location.origin}/register`} size={104} />
          <div className="reg-scan__text">
            <strong>Scan to Register</strong>
            <span>Opens this page on your phone</span>
          </div>
        </footer>
      </div>
    </div>
  );
}