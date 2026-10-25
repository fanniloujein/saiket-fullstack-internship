import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import { Field, PasswordMeter } from "../components/ui";
import { Logo } from "../components/Layout";
import { validateFields } from "../utils/validation";

// Left: the form. Right: an animated "orbit" of users around the planet.
function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth">
      <section className="auth-form">
        <Logo />
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
      </section>
      <section className="auth-visual" aria-hidden="true">
        <div className="orbit-system">
          <div className="planet" />
          {[1, 2, 3].map((ring) => (
            <div key={ring} className={`ring ring-${ring}`}>
              {Array.from({ length: ring + 1 }).map((_, i) => (
                <span key={i} className="moon" style={{ "--i": i, "--n": ring + 1 }} />
              ))}
            </div>
          ))}
        </div>
        <p className="auth-tagline">Tous vos utilisateurs,<br /><strong>en orbite autour d'un seul endroit.</strong></p>
        <p className="auth-stack">React · Express · PostgreSQL</p>
      </section>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!values.email.trim() || !values.password) return setError("Entrez votre e-mail et votre mot de passe.");
    setBusy(true);
    setError("");
    try {
      const user = await login(values.email, values.password);
      notify(`Bonjour ${user.name.split(" ")[0]} 👋`);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const fillDemo = (email) => setValues({ email, password: "Demo1234" });

  return (
    <AuthLayout title="Connexion" subtitle="Bon retour parmi nous ! Connectez-vous pour gérer votre profil.">
      <form onSubmit={handleSubmit} noValidate className="stack">
        <Field label="Adresse e-mail" type="email" autoComplete="email" value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })} />
        <Field label="Mot de passe" type="password" autoComplete="current-password" value={values.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
      </form>
      <p className="muted center">Pas encore de compte ? <Link to="/register">Créer un compte</Link></p>

      <div className="demo-box">
        <p><strong>Comptes de démonstration</strong> (mot de passe <code>Demo1234</code>)</p>
        <div className="demo-buttons">
          <button type="button" className="chip" onClick={() => fillDemo("admin@orbit.demo")}>🛡️ Administrateur</button>
          <button type="button" className="chip" onClick={() => fillDemo("amira@orbit.demo")}>🙂 Utilisateur</button>
        </div>
      </div>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: "", email: "", age: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => {
    setValues({ ...values, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateFields(values, ["name", "email", "age", "password"]);
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const user = await register({ ...values, age: Number(values.age) });
      notify(`Bienvenue sur Orbit, ${user.name.split(" ")[0]} !`);
      navigate("/", { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors?.() || {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Créer un compte" subtitle="Ajoutez votre profil en moins d'une minute.">
      <form onSubmit={handleSubmit} noValidate className="stack">
        <Field label="Nom complet" autoComplete="name" value={values.name} onChange={set("name")} error={errors.name} />
        <div className="row-2">
          <Field label="Adresse e-mail" type="email" autoComplete="email" value={values.email} onChange={set("email")} error={errors.email} />
          <Field label="Âge" type="number" inputMode="numeric" min="13" max="120" value={values.age} onChange={set("age")} error={errors.age} />
        </div>
        <Field label="Mot de passe" type="password" autoComplete="new-password" value={values.password} onChange={set("password")} error={errors.password} />
        <PasswordMeter value={values.password} />
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Création…" : "Créer mon compte"}</button>
      </form>
      <p className="muted center">Déjà inscrit·e ? <Link to="/login">Se connecter</Link></p>
    </AuthLayout>
  );
}
