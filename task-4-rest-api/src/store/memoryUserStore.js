// In-memory data store for users.
// Every method is async on purpose: in Task 5 this file is replaced by a SQL store
// with exactly the same methods, so the routes do not need to change.
import { randomUUID } from "node:crypto";

export const SEED_USERS = [
  { name: "Amira Ben Salah", email: "amira.bensalah@example.tn", age: 24 },
  { name: "Youssef Trabelsi", email: "youssef.trabelsi@example.tn", age: 31 },
  { name: "Salma Gharbi", email: "salma.gharbi@example.tn", age: 19 },
  { name: "Karim Haddad", email: "karim.haddad@example.tn", age: 45 },
  { name: "Ines Jaziri", email: "ines.jaziri@example.tn", age: 28 },
];

export function createMemoryUserStore({ seed = SEED_USERS } = {}) {
  const users = new Map();

  function insert(data) {
    const now = new Date().toISOString();
    const user = { id: randomUUID(), ...data, createdAt: now, updatedAt: now };
    users.set(user.id, user);
    return { ...user };
  }

  function reset() {
    users.clear();
    seed.forEach(insert);
  }
  reset();

  return {
    async findAll({ search = "", minAge, maxAge, sort = "createdAt", order = "asc", page = 1, limit = 10 } = {}) {
      let list = [...users.values()];
      if (search) list = list.filter((u) => u.name.toLowerCase().includes(search) || u.email.includes(search));
      if (minAge !== undefined) list = list.filter((u) => u.age >= minAge);
      if (maxAge !== undefined) list = list.filter((u) => u.age <= maxAge);

      const dir = order === "desc" ? -1 : 1;
      list.sort((a, b) => {
        const x = a[sort], y = b[sort];
        return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "fr")) * dir;
      });

      const total = list.length;
      const items = list.slice((page - 1) * limit, page * limit).map((u) => ({ ...u }));
      return { items, total };
    },

    async findById(id) {
      const user = users.get(id);
      return user ? { ...user } : null;
    },

    async findByEmail(email) {
      for (const user of users.values()) if (user.email === email) return { ...user };
      return null;
    },

    async create(data) {
      return insert(data);
    },

    async update(id, data) {
      const user = users.get(id);
      if (!user) return null;
      const updated = { ...user, ...data, updatedAt: new Date().toISOString() };
      users.set(id, updated);
      return { ...updated };
    },

    async remove(id) {
      return users.delete(id);
    },

    async reset() {
      reset();
    },
  };
}
