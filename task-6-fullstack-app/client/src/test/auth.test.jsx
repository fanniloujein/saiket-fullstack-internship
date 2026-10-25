import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import App from "../App";
import { AuthProvider } from "../auth/AuthContext";
import { ToastProvider } from "../components/Toast";

const amira = { id: "1", name: "Amira Ben Salah", email: "amira@orbit.demo", age: 24, bio: "", role: "user", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: null };
const json = (status, body) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

// A fake server: answers like the Express API would
function fakeServer({ loggedIn = false } = {}) {
  let user = loggedIn ? amira : null;
  return vi.spyOn(globalThis, "fetch").mockImplementation((url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : {};
    if (url === "/api/auth/me") return json(200, { data: user });
    if (url === "/api/auth/login") {
      if (body.password !== "Demo1234") return json(401, { error: { message: "E-mail ou mot de passe incorrect." } });
      user = amira;
      return json(200, { data: amira });
    }
    if (url === "/api/me/activity") return json(200, { data: [] });
    if (url === "/api/auth/register") return json(409, { error: { message: "Certains champs sont invalides.", details: [{ field: "email", message: "Cette adresse e-mail est déjà utilisée." }] } });
    return json(404, { error: { message: "not found" } });
  });
}

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider>
    </MemoryRouter>
  );
}

describe("authentication flow", () => {
  it("redirects visitors to the login page", async () => {
    fakeServer();
    renderApp("/profile");
    expect(await screen.findByRole("heading", { name: "Connexion" })).toBeInTheDocument();
  });

  it("shows the server error for a wrong password, then logs in", async () => {
    fakeServer();
    const user = userEvent.setup();
    renderApp("/login");
    await user.type(await screen.findByLabelText("Adresse e-mail"), "amira@orbit.demo");
    await user.type(screen.getByLabelText("Mot de passe"), "wrong");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou mot de passe incorrect.");

    await user.clear(screen.getByLabelText("Mot de passe"));
    await user.type(screen.getByLabelText("Mot de passe"), "Demo1234");
    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(await screen.findByRole("heading", { name: "Amira Ben Salah" })).toBeInTheDocument(); // profile page
  });

  it("validates the sign-up form in the browser, then shows server field errors", async () => {
    fakeServer();
    const user = userEvent.setup();
    renderApp("/register");
    await user.click(await screen.findByRole("button", { name: "Créer mon compte" }));
    expect(screen.getByText("Le nom est obligatoire.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nom complet"), "Amira");
    await user.type(screen.getByLabelText("Adresse e-mail"), "amira@orbit.demo");
    await user.type(screen.getByLabelText("Âge"), "24");
    await user.type(screen.getByLabelText("Mot de passe"), "Secret123");
    await user.click(screen.getByRole("button", { name: "Créer mon compte" }));
    expect(await screen.findByText("Cette adresse e-mail est déjà utilisée.")).toBeInTheDocument();
  });

  it("keeps regular users out of the admin pages", async () => {
    fakeServer({ loggedIn: true });
    renderApp("/admin/users");
    expect(await screen.findByRole("heading", { name: "Amira Ben Salah" })).toBeInTheDocument();
    expect(screen.queryByText("Utilisateurs", { selector: "h1" })).not.toBeInTheDocument();
  });
});
