import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthContext";
import { ErrorBox } from "../components/ui";
import { errMsg } from "../utils/format";
import { Brand, Icon } from "../components/Icon";

type LoginRole = "ADMIN" | "TEACHER" | "STUDENT";
const REMEMBER_EMAIL_KEY = "kawsay_last_email";

// Cuentas públicas de la DEMOSTRACIÓN. No usar en una instalación con datos reales.
const DEMO_ACCOUNTS: Record<LoginRole, { email: string; password: string; label: string }> = {
  ADMIN: { email: "admin@demo.pe", password: "Kawsay-Demo-Local-2026", label: "administrador" },
  TEACHER: { email: "maestra@demo.pe", password: "Aula-Multigrado-2026!", label: "docente" },
  STUDENT: { email: "estudiante@demo.pe", password: "Kawsay-Aula-2026!", label: "estudiante" },
};

function storedEmail(): string {
  try { return localStorage.getItem(REMEMBER_EMAIL_KEY) ?? ""; } catch { return ""; }
}

/** Acceso único: personal con correo/contraseña; estudiantes con correo o código/PIN. */
export function Login() {
  const { login, loginStudent, loginStudentEmail } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState<LoginRole>("ADMIN");
  const [email, setEmail] = useState(storedEmail);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [studentMethod, setStudentMethod] = useState<"email" | "code">("email");
  const [rememberEmail, setRememberEmail] = useState(() => !!storedEmail());
  const [helpOpen, setHelpOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState<LoginRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const student = role === "STUDENT";
  const codeMode = student && studentMethod === "code";
  const anyBusy = busy || demoBusy !== null;

  const chooseRole = (next: LoginRole) => {
    if (anyBusy) return;
    setRole(next);
    setErr(null);
    setPassword("");
    setShowPassword(false);
    setHelpOpen(false);
  };

  const enterDemo = async (kind: LoginRole) => {
    if (anyBusy) return;
    setDemoBusy(kind); setErr(null);
    try {
      const account = DEMO_ACCOUNTS[kind];
      if (kind === "STUDENT") {
        await loginStudentEmail(account.email, account.password);
        nav("/estudiante", { replace: true });
      } else {
        await login(account.email, account.password);
        nav("/", { replace: true });
      }
    } catch (reason) { setErr(errMsg(reason)); }
    finally { setDemoBusy(null); }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      if (student) {
        if (studentMethod === "email") await loginStudentEmail(email.trim(), password);
        else await loginStudent(code.trim(), password);
        nav("/estudiante", { replace: true });
      } else {
        await login(email.trim(), password);
        nav("/", { replace: true });
      }
      // Recordar únicamente el correo, NUNCA la contraseña o un token de autenticación.
      try {
        if (rememberEmail && !codeMode) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
        else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      } catch { /* Modo privado: no persistir preferencias. */ }
    } catch (reason) { setErr(errMsg(reason)); }
    finally { setBusy(false); }
  };

  return <main id="kawsay-login" className="login-layout login-reimagined">
    <img
      className="login-scene-art"
      src="/kawsay-fondo-responsive-20261028.webp?v=full-bleed-20261028"
      alt=""
      aria-hidden="true"
      decoding="async"
      onError={(event) => {
        if (event.currentTarget.dataset.fallback !== "yes") {
          event.currentTarget.dataset.fallback = "yes";
          event.currentTarget.src = "/kawsay-fondo-final.jpg?v=background-fallback-20261028";
        }
      }}
    />
    <section className="login-story" aria-label="Bienvenida a KAWSAY AI">
      <Brand />
      <div className="login-story-copy">
        <h1><span className="login-heading-line">Más educación</span><span className="login-heading-line">para más</span><span className="login-heading-line login-highlight">comunidades.</span></h1>
        <p>Acceso para docentes, estudiantes e instituciones del Perú.</p>
      </div>
    </section>

    <section className="login-form-panel" aria-label="Acceso a la plataforma">
      <div className="login" role="region" aria-labelledby="login-title">
        <div className="login-card-head">
          <span className="login-symbol" aria-hidden="true"><img className="login-brand-emblem" src="/kawsay-brand-icon.webp?v=logo-20261028" alt="" width={52} height={52} decoding="async" onError={event => { event.currentTarget.style.display = "none"; }} /></span>
          <h2 id="login-title">Bienvenido</h2>
          <p className="muted login-description">Ingresa a tu cuenta</p>
        </div>

        <div className="login-role-tabs" role="group" aria-label="Tipo de usuario">
          {(["ADMIN", "TEACHER", "STUDENT"] as const).map((kind) =>
            <button type="button" key={kind} onClick={() => chooseRole(kind)}
              className={role === kind ? "active" : ""}
              aria-pressed={role === kind} disabled={anyBusy}>
              {kind === "ADMIN" ? "Administrador" : kind === "TEACHER" ? "Docente" : "Estudiante"}
            </button>
          )}
        </div>

        <div className="student-login-method" role="group" aria-label="Método de acceso">
          <button type="button" className={!codeMode ? "active" : ""}
            aria-pressed={!codeMode} disabled={anyBusy}
            onClick={() => { setStudentMethod("email"); setErr(null); setPassword(""); }}>
            Correo y contraseña
          </button>
          <button type="button" className={codeMode ? "active" : ""}
            aria-pressed={codeMode} disabled={anyBusy}
            onClick={() => { if (!student) chooseRole("STUDENT"); setStudentMethod("code"); setErr(null); setPassword(""); }}>
            Código y PIN
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="stack login-access-form">
          <div className="kawsay-login-field">
            <label htmlFor="login-identity" className="login-field-label">{codeMode ? "Código de estudiante" : student ? "Correo electrónico" : "Correo"}</label>
            <div className="login-input-wrap">
              <Icon name={codeMode ? "shield" : "mail"}/>
              <input id="login-identity"
                type={codeMode ? "text" : "email"}
                value={codeMode ? code : email}
                onChange={(e) => codeMode ? setCode(e.target.value) : setEmail(e.target.value)}
                autoComplete="username"
                placeholder={codeMode ? "Código entregado por tu docente" : "Correo electrónico"}
                required/>
            </div>
          </div>

          <div className="kawsay-login-field">
            <label htmlFor="password" className="login-field-label">{codeMode ? "PIN" : "Contraseña"}</label>
            <div className="login-input-wrap password-field">
              <Icon name="lock"/>
              <input id="password" type={showPassword ? "text" : "password"}
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" placeholder={codeMode ? "Tu PIN de acceso" : "Tu contraseña"} required/>
              <button type="button" className="password-toggle"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                <Icon name={showPassword ? "eye-off" : "eye"}/>
              </button>
            </div>
          </div>

          <div className="login-preferences">
            <label className="login-remember">
              <input type="checkbox" checked={rememberEmail} onChange={(e) => setRememberEmail(e.target.checked)}/>
              <span>Recordarme</span>
            </label>
            <button type="button" className="login-forgot" aria-expanded={helpOpen}
              onClick={() => setHelpOpen(!helpOpen)}>¿Olvidaste tu contraseña?</button>
          </div>
          {helpOpen && <p className="login-recovery" role="status">
            {student ? "Solicita a tu docente que restablezca la contraseña o el PIN de tu cuenta." :
              "Solicita a la administración de tu institución que restablezca tu acceso."}
            {" "}Este formulario no envía correos automáticos.
          </p>}
          <ErrorBox message={err}/>
          <button type="submit" className="login-submit" disabled={anyBusy}>
            {busy ? "Ingresando…" : "Ingresar"} <Icon name="arrow"/>
          </button>
        </form>

        <div className="login-demo" role="group" aria-label="Acceso rápido de demostración">
          <p className="login-demo-label">Acceso rápido DEMO</p>
          <div className="login-demo-grid">
            {(["ADMIN", "TEACHER", "STUDENT"] as const).map((kind) => (
              <button type="button" key={kind} className="login-demo-option"
                aria-label={`Entrar como ${DEMO_ACCOUNTS[kind].label} con la cuenta de demostración`}
                onClick={() => void enterDemo(kind)} disabled={anyBusy}>
                <Icon name={kind === "ADMIN" ? "shield" : kind === "TEACHER" ? "graduation" : "students"}/>
                <span aria-hidden="true">{kind === "ADMIN" ? "Administrador" : kind === "TEACHER" ? "Docente" : "Estudiante"}</span>
                <small aria-hidden="true">{demoBusy === kind ? "Entrando…" : "Demo"}</small>
              </button>
            ))}
          </div>
          <p className="login-demo-note">Entra a los tres módulos sin escribir credenciales. Datos ficticios.</p>
        </div>

        <p className="login-help">¿Necesitas acceso? Contacta a la administración de tu institución.</p>
      </div>
    </section>
  </main>;
}
