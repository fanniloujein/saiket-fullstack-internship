// Demo accounts for a brand-new database. Passwords are hashed like real ones.
import { hashPassword } from "../services/passwords.js";

export const DEMO_PASSWORD = "Demo1234";
export const DEMO_ACCOUNTS = [
  { name: "Admin Orbit", email: "admin@orbit.demo", age: 30, role: "admin", bio: "Compte administrateur de démonstration." },
  { name: "Amira Ben Salah", email: "amira@orbit.demo", age: 24, role: "user", bio: "Développeuse front-end à Tunis. React et café ☕" },
  { name: "Youssef Trabelsi", email: "youssef@orbit.demo", age: 31, role: "user", bio: "Chef de projet, passionné de randonnée." },
  { name: "Salma Gharbi", email: "salma@orbit.demo", age: 19, role: "user", bio: "Étudiante en informatique à Sfax." },
  { name: "Karim Haddad", email: "karim@orbit.demo", age: 45, role: "admin", bio: "Responsable de l'équipe support." },
  { name: "Ines Jaziri", email: "ines@orbit.demo", age: 28, role: "user", bio: "" },
  { name: "Mehdi Ayari", email: "mehdi@orbit.demo", age: 36, role: "user", bio: "Photographe et designer UI." },
  { name: "Nour Chaabane", email: "nour@orbit.demo", age: 22, role: "user", bio: "" },
];

export async function seedDemo(db, { log = console.log } = {}) {
  const hash = await hashPassword(DEMO_PASSWORD);
  let inserted = 0;
  for (const [i, u] of DEMO_ACCOUNTS.entries()) {
    // Spread the creation dates over the last days so the sign-up chart has something to show
    const { rowCount } = await db.query(
      `INSERT INTO users (name, email, age, bio, role, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now() - make_interval(days => $7), now() - make_interval(days => $7))
       ON CONFLICT (email) DO NOTHING`,
      [u.name, u.email, u.age, u.bio, u.role, hash, [12, 10, 9, 7, 5, 3, 2, 0][i] ?? 0]
    );
    inserted += rowCount;
  }
  log(`✓ demo: ${inserted} account(s) created (password: ${DEMO_PASSWORD})`);
}

export async function seedDemoIfEmpty(db, options) {
  const { rows } = await db.query("SELECT COUNT(*)::int AS n FROM users");
  if (rows[0].n === 0) await seedDemo(db, options);
}
