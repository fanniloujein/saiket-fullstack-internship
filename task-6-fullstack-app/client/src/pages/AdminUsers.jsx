import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import { Avatar, EmptyState, Field, Modal, PasswordMeter, RoleBadge, Spinner } from "../components/ui";
import { timeAgo } from "../utils/format";
import { validateFields } from "../utils/validation";

const EMPTY = { name: "", email: "", age: "", bio: "", role: "user", password: "" };

// Create / edit form shown in a modal
function UserForm({ initial, isSelf, onCancel, onSaved }) {
  const notify = useToast();
  const editing = Boolean(initial);
  const [values, setValues] = useState(initial ? { ...initial, age: String(initial.age), password: "" } : EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => {
    setValues({ ...values, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: undefined });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const fields = ["name", "email", "age", "bio"];
    if (!editing || values.password) fields.push("password");
    const found = validateFields(values, fields);
    setErrors(found);
    if (Object.keys(found).length) return;

    const body = { name: values.name, email: values.email, age: Number(values.age), bio: values.bio };
    if (!isSelf) body.role = values.role;
    if (values.password) body.password = values.password;

    setBusy(true);
    try {
      const saved = editing ? await Api.updateUser(initial.id, body) : await Api.createUser(body);
      notify(editing ? `Profil de ${saved.name} mis à jour.` : `Compte de ${saved.name} créé.`);
      onSaved(saved);
    } catch (err) {
      setErrors(err.fieldErrors());
      if (!err.details.length) notify(err.message, "error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="stack">
      <div className="row-2">
        <Field label="Nom complet" value={values.name} onChange={set("name")} error={errors.name} />
        <Field label="Âge" type="number" min="13" max="120" value={values.age} onChange={set("age")} error={errors.age} />
      </div>
      <Field label="Adresse e-mail" type="email" value={values.email} onChange={set("email")} error={errors.email} />
      <Field label="Bio" as="textarea" rows="2" maxLength={160} value={values.bio} onChange={set("bio")} error={errors.bio} />
      <Field label="Rôle">
        <div className="segmented" role="radiogroup" aria-label="Rôle">
          {["user", "admin"].map((r) => (
            <label key={r} className={values.role === r ? "active" : ""}>
              <input type="radio" name="role" value={r} checked={values.role === r} disabled={isSelf} onChange={set("role")} />
              {r === "admin" ? "🛡️ Administrateur" : "🙂 Utilisateur"}
            </label>
          ))}
        </div>
        {isSelf && <small className="hint">Vous ne pouvez pas changer votre propre rôle.</small>}
      </Field>
      <Field label={editing ? "Nouveau mot de passe (facultatif)" : "Mot de passe"} type="password" autoComplete="new-password"
        value={values.password} onChange={set("password")} error={errors.password}
        hint={editing ? "Laissez vide pour ne pas le changer. S'il change, l'utilisateur est déconnecté." : undefined} />
      {(!editing || values.password) && <PasswordMeter value={values.password} />}
      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Annuler</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Enregistrement…" : editing ? "Enregistrer" : "Créer le compte"}</button>
      </div>
    </form>
  );
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const notify = useToast();
  // Filters live in the URL (?search=&role=&sort=&page=), so they survive a reload and can be shared
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const role = params.get("role") || "";
  const sort = params.get("sort") || "-createdAt";
  const page = Number(params.get("page") || 1);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState(search);
  const [editing, setEditing] = useState(null); // null | "new" | user
  const [deleting, setDeleting] = useState(null);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) (v ? next.set(k, v) : next.delete(k));
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  };

  const load = useCallback(() => {
    const q = { search, sort, page, limit: 8 };
    if (role) q.role = role;
    Api.listUsers(q).then(setResult).catch((err) => setError(err.message));
  }, [search, role, sort, page]);

  useEffect(load, [load]);

  // Search as you type, with a small delay (debounce)
  useEffect(() => {
    const t = setTimeout(() => { if (query !== search) update({ search: query.trim() }); }, 300);
    return () => clearTimeout(t);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  async function confirmDelete() {
    try {
      await Api.deleteUser(deleting.id);
      notify(`Le compte de ${deleting.name} a été supprimé.`);
      setDeleting(null);
      load();
    } catch (err) {
      notify(err.message, "error");
      setDeleting(null);
    }
  }

  const sortButton = (field, label) => {
    const active = sort.replace("-", "") === field;
    const desc = sort.startsWith("-");
    return (
      <button type="button" className={`th-sort ${active ? "active" : ""}`} onClick={() => update({ sort: active && !desc ? `-${field}` : field })}
        aria-label={`Trier par ${label}`}>
        {label} {active ? (desc ? "↓" : "↑") : ""}
      </button>
    );
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Utilisateurs</h1>
          <p className="muted">{result ? `${result.meta.total} compte${result.meta.total > 1 ? "s" : ""} dans la base de données` : "…"}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>+ Ajouter un utilisateur</button>
      </header>

      <section className="card">
        <div className="toolbar">
          <input type="search" className="input" placeholder="Rechercher un nom ou un e-mail…" aria-label="Rechercher"
            value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="segmented small" role="group" aria-label="Filtrer par rôle">
            {[["", "Tous"], ["admin", "Admins"], ["user", "Utilisateurs"]].map(([value, label]) => (
              <button key={label} type="button" className={role === value ? "active" : ""} aria-pressed={role === value} onClick={() => update({ role: value })}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        {!result ? <Spinner /> : result.data.length === 0 ? (
          <EmptyState icon="🔭" title="Aucun utilisateur trouvé">
            <button type="button" className="btn btn-ghost" onClick={() => { setQuery(""); update({ search: "", role: "" }); }}>Effacer les filtres</button>
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>{sortButton("name", "Utilisateur")}</th>
                  <th>{sortButton("age", "Âge")}</th>
                  <th>Rôle</th>
                  <th>{sortButton("lastLoginAt", "Dernière connexion")}</th>
                  <th>{sortButton("createdAt", "Inscrit")}</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <Avatar user={u} size={36} />
                        <div><strong>{u.name}{u.id === me.id && <span className="you"> (vous)</span>}</strong><small>{u.email}</small></div>
                      </div>
                    </td>
                    <td>{u.age}</td>
                    <td><RoleBadge role={u.role} /></td>
                    <td className="muted">{timeAgo(u.lastLoginAt)}</td>
                    <td className="muted">{timeAgo(u.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="icon-btn" onClick={() => setEditing(u)} aria-label={`Modifier ${u.name}`} title="Modifier">✎</button>
                        <button type="button" className="icon-btn danger" onClick={() => setDeleting(u)} disabled={u.id === me.id}
                          aria-label={`Supprimer ${u.name}`} title={u.id === me.id ? "Utilisez « Mon profil »" : "Supprimer"}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && result.meta.pages > 1 && (
          <nav className="pagination" aria-label="Pagination">
            <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>← Précédent</button>
            <span>Page {page} / {result.meta.pages}</span>
            <button type="button" className="btn btn-ghost" disabled={page >= result.meta.pages} onClick={() => update({ page: String(page + 1) })}>Suivant →</button>
          </nav>
        )}
      </section>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === "new" ? "Nouvel utilisateur" : `Modifier ${editing?.name ?? ""}`}>
        {editing && (
          <UserForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            isSelf={editing !== "new" && editing.id === me.id}
            onCancel={() => setEditing(null)}
            onSaved={() => { setEditing(null); load(); }}
          />
        )}
      </Modal>

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Supprimer ce compte ?" size="sm">
        {deleting && (
          <div className="stack">
            <div className="user-cell"><Avatar user={deleting} size={44} /><div><strong>{deleting.name}</strong><small>{deleting.email}</small></div></div>
            <p>Le profil et les sessions de cet utilisateur seront supprimés de la base de données. Cette action est définitive.</p>
            <div className="actions">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>Annuler</button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>Supprimer</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
