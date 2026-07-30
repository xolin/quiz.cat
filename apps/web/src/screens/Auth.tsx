import { useState } from "react";
import { api, setToken } from "../api.js";
import { Mascot } from "../components/Mascot.js";
import { Icon } from "../components/Icon.js";

export function Auth(props: { onLogged: () => void }) {
  const [mode, setMode] = useState<"guest" | "login" | "register">("guest");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const { token } = await api<{ token: string }>(path, { method: "POST", body });
      setToken(token);
      props.onLogged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="qc-screen" style={{ maxWidth: 420 }}>
      {/* Portada: el gat presenta i l'única acció que compta és entrar a jugar. */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--qc-4)", marginBottom: "var(--qc-6)" }}>
        <Mascot size={72} mood="neutre" />
        <div>
          <h1 style={{ fontSize: "2.25rem", fontStretch: "70%", letterSpacing: "-0.02em" }}>quiz.cat</h1>
          <p style={{ margin: 0, color: "var(--qc-ink-dim)", fontSize: "var(--qc-t-small)" }}>
            Trivia en català. Mai saps què ve després.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gap: "var(--qc-3)" }}>
        <label className="qc-label" htmlFor="qc-name">Nom per mostrar (opcional)</label>
        <input id="qc-name" placeholder="Com vols que et diguin" value={displayName}
          onChange={(e) => setDisplayName(e.target.value)} style={{ marginTop: "calc(var(--qc-2) * -1)" }} />
        <button className="qc-btn qc-btn--primary qc-btn--block" disabled={busy} onClick={() => go("/auth/guest", { displayName })}>
          <Icon name="play" size={18} /> Juga ara
        </button>

        <div style={{ borderTop: "1px solid var(--qc-hairline)", paddingTop: "var(--qc-4)" }}>
          {mode !== "guest" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                go(mode === "login" ? "/auth/login" : "/auth/register", { email, password, displayName });
              }}
              style={{ display: "grid", gap: "var(--qc-2)" }}
            >
              <label className="qc-label" htmlFor="qc-email">Email</label>
              <input id="qc-email" type="email" required autoComplete="email" placeholder="tu@exemple.cat"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <label className="qc-label" htmlFor="qc-pass">Contrasenya</label>
              <input id="qc-pass" type="password" required minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="mínim 6 caràcters" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button className="qc-btn qc-btn--block" type="submit" disabled={busy}>
                {mode === "login" ? "Entra" : "Registra't"}
              </button>
              <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === "login" ? "register" : "login"); }}
                style={{ fontSize: "var(--qc-t-small)" }}>
                {mode === "login" ? "No tens compte? Registra't" : "Ja tens compte? Entra"}
              </a>
            </form>
          ) : (
            <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); }} style={{ fontSize: "var(--qc-t-small)" }}>
              Tinc un compte o vull registrar-me
            </a>
          )}
        </div>
        {error && (
          <p className="qc-panel" style={{ color: "var(--qc-live)", borderColor: "var(--qc-live)" }}>{error}</p>
        )}
      </div>
    </div>
  );
}
