import { describe, expect, it } from "vitest";
import { passwordStrength, rules, validateFields } from "../utils/validation";
import { describeActivity } from "../utils/format";

describe("validation (same rules as the server)", () => {
  it("checks each field", () => {
    expect(rules.name("A")).toMatch(/2 et 60/);
    expect(rules.name("Amira Ben Salah")).toBe("");
    expect(rules.email("nope")).toMatch(/invalide/);
    expect(rules.age("12")).toMatch(/13 et 120/);
    expect(rules.age("25")).toBe("");
    expect(rules.password("abcdefgh")).toMatch(/lettre et un chiffre/);
    expect(rules.password("Abcdefg1")).toBe("");
  });

  it("returns only the invalid fields", () => {
    expect(validateFields({ name: "Amira", email: "x", age: "30" }, ["name", "email", "age"])).toEqual({
      email: "Adresse e-mail invalide (ex. : nom@domaine.com).",
    });
  });

  it("scores password strength", () => {
    expect(passwordStrength("abc")).toBe(0);
    expect(passwordStrength("Abcdefgh12!?xy")).toBe(4);
  });
});

describe("activity sentences", () => {
  const base = { details: {}, actorName: "Admin Orbit", targetName: "Amira" };
  it("writes readable French, with elision", () => {
    expect(describeActivity({ ...base, action: "login" }).text).toBe("Connexion d'Admin Orbit");
    expect(describeActivity({ ...base, action: "user.create" }).text).toBe("Admin Orbit a créé le compte d'Amira");
    expect(describeActivity({ ...base, action: "role.change", details: { role: "admin" } }).text).toBe("Admin Orbit a passé Amira en administrateur");
    expect(describeActivity({ ...base, action: "profile.update", details: { fields: ["name", "age"] } }).text).toBe("Admin Orbit a modifié son profil (nom, âge)");
  });

  it("keeps the name of a deleted account", () => {
    expect(describeActivity({ action: "register", actorName: null, targetName: null, details: { name: "Sami Test" } }).text).toBe("Sami Test a créé son compte");
  });
});
