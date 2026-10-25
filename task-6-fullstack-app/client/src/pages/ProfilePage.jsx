import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Api } from "../api/client";
import { useToast } from "../components/Toast";
import ActivityList from "../components/ActivityList";
import { Avatar, Field, Modal, PasswordMeter, RoleBadge, Spinner } from "../components/ui";
import { formatDate, timeAgo } from "../utils/format";
import { rules, validateFields } from "../utils/validation";

// "View" part: the profile card
function ProfileCard({ user }) {
  const filled = ["name", "email", "age", "bio"].filter((f) => String(user[f] ?? "").trim()).length;
  const completion = Math.round((filled / 4) * 100);
  return (
    <section className="card profile-card">
      <div className="profile-cover" />
      <div className="profile-main">
        <div className="profile-avatar-wrap" style={{ "--p": completion }} title={`Profil complété à ${completion} %`}>
          <Avatar user={user} size={96} />
        </div>
        <div>
          <h1>{user.name}</h1>
          <p className="muted">{user.email}</p>
          <div className="profile-tags">
            <RoleBadge role={user.role} />
            <span className="badge">{user.age} ans</span>
            <span className="badge">Profil complété à {completion} %</span>
          </div>
        </div>
      </div>
      <p className="profile-bio">{user.bio || <span className="muted">Pas encore de bio. Présentez-vous en quelques mots ci-dessous !</span>}</p>
      <dl className="profile-meta">
        <div><dt>Membre depuis</dt><dd>{formatDate(user.createdAt)}</dd></div>
        <div><dt>Dernière modification</dt><dd>{timeAgo(user.updatedAt)}</dd></div>
        <div><dt>Dernière connexion</dt><dd>{timeAgo(user.lastLoginAt)}</dd></div>
      </dl>
    </section>
  );
}

// "Update" part
function EditProfileForm({ user, onSaved }) {
  const notify = useToast();
  const [values, setValues] = useState({ name: user.name, email: user.email, age: String(user.age), bio: user.bio });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const changed = values.name !== user.name || values.email !== user.email || Number(values.age) !== user.age || values.bio !== user.bio;

  const set = (field) => (e) => {
    const value = e.target.value;
    setValues({ ...values, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: rules[field](value) || undefined });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateFields(values, ["name", "email", "age", "bio"]);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const updated = await Api.updateProfile({ ...values, age: Number(values.age) });
      onSaved(updated);
      notify("Profil mis à jour.");
    } catch (err) {
      setErrors(err.fieldErrors());
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Modifier mon profil</h2>
      <form onSubmit={handleSubmit} noValidate className="stack">
        <div className="row-2">
          <Field label="Nom complet" value={values.name} onChange={set("name")} error={errors.name} autoComplete="name" />
          <Field label="Âge" type="number" min="13" max="120" value={values.age} onChange={set("age")} error={errors.age} />
        </div>
        <Field label="Adresse e-mail" type="email" value={values.email} onChange={set("email")} error={errors.email} autoComplete="email" />
        <Field label="Bio" as="textarea" rows="3" maxLength={160} value={values.bio} onChange={set("bio")} error={errors.bio}
          hint={`${values.bio.length}/160 caractères`} />
        <div className="actions">
          <button type="button" className="btn btn-ghost" disabled={!changed || busy}
            onClick={() => { setValues({ name: user.name, email: user.email, age: String(user.age), bio: user.bio }); setErrors({}); }}>
            Annuler
          </button>
          <button className="btn btn-primary" disabled={!changed || busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </section>
  );
}

function PasswordForm() {
  const notify = useToast();
  const [values, setValues] = useState({ current: "", next: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const found = {};
    if (!values.current) found.current = "Entrez votre mot de passe actuel.";
    const nextError = rules.password(values.next);
    if (nextError) found.next = nextError;
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await Api.changePassword(values.current, values.next);
      setValues({ current: "", next: "" });
      notify("Mot de passe modifié. Vos autres appareils ont été déconnectés.");
    } catch (err) {
      setErrors(err.status === 401 ? { current: err.message } : { next: err.fieldErrors().newPassword || err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Mot de passe</h2>
      <form onSubmit={handleSubmit} noValidate className="stack">
        <Field label="Mot de passe actuel" type="password" autoComplete="current-password" value={values.current}
          onChange={(e) => setValues({ ...values, current: e.target.value })} error={errors.current} />
        <Field label="Nouveau mot de passe" type="password" autoComplete="new-password" value={values.next}
          onChange={(e) => setValues({ ...values, next: e.target.value })} error={errors.next} />
        <PasswordMeter value={values.next} />
        <div className="actions"><button className="btn btn-secondary" disabled={busy}>Changer le mot de passe</button></div>
      </form>
    </section>
  );
}

// "Delete" part, with confirmation
function DangerZone() {
  const { setUser } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirmDelete(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await Api.deleteAccount(password);
      setUser(null);
      notify("Votre compte a été supprimé. Au revoir !");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <section className="card danger">
      <h2>Supprimer mon compte</h2>
      <p className="muted">Votre profil et vos sessions seront supprimés de la base de données. Cette action est définitive.</p>
      <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>Supprimer mon compte…</button>

      <Modal open={open} onClose={() => { setOpen(false); setPassword(""); setError(""); }} title="Supprimer définitivement votre compte ?" size="sm">
        <form onSubmit={confirmDelete} className="stack">
          <p>Pour confirmer, entrez votre mot de passe.</p>
          <Field label="Mot de passe" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} error={error} />
          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Annuler</button>
            <button className="btn btn-danger" disabled={!password || busy}>{busy ? "Suppression…" : "Supprimer"}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [activity, setActivity] = useState(null);

  // Reload my history whenever my profile changes
  useEffect(() => {
    Api.myActivity().then(setActivity).catch(() => setActivity([]));
  }, [user.updatedAt]);

  return (
    <div className="page">
      <ProfileCard user={user} />
      <div className="grid-2">
        <div className="stack-lg">
          <EditProfileForm key={user.updatedAt} user={user} onSaved={setUser} />
          <PasswordForm />
          <DangerZone />
        </div>
        <section className="card">
          <h2>Mon activité</h2>
          {activity ? <ActivityList items={activity} /> : <Spinner />}
        </section>
      </div>
    </div>
  );
}
