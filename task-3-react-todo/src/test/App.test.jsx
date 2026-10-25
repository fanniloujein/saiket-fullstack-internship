import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { ThemeProvider } from "../ThemeContext";

function setup() {
  localStorage.setItem("bloom-tasks", "[]"); // start with an empty list
  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
  return { user, input: screen.getByLabelText("Nouvelle tâche") };
}

describe("Bloom app", () => {
  it("adds a task", async () => {
    const { user, input } = setup();
    await user.type(input, "Acheter du pain{Enter}");
    expect(screen.getByText("Acheter du pain")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("shows an error for an empty title", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Écris le nom de la tâche.");
  });

  it("completes a task and grows a flower", async () => {
    const { user, input } = setup();
    await user.type(input, "Réviser React{Enter}");
    await user.click(screen.getByRole("checkbox", { name: /Réviser React/ }));
    expect(screen.getByText(/1 fleur/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("edits a task", async () => {
    const { user, input } = setup();
    await user.type(input, "Ancien titre{Enter}");
    await user.click(screen.getByRole("button", { name: "Modifier « Ancien titre »" }));
    const field = screen.getByLabelText("Modifier la tâche");
    await user.clear(field);
    await user.type(field, "Nouveau titre{Enter}");
    expect(screen.getByText("Nouveau titre")).toBeInTheDocument();
    expect(screen.queryByText("Ancien titre")).not.toBeInTheDocument();
  });

  it("deletes a task and can undo", async () => {
    const { user, input } = setup();
    await user.type(input, "À supprimer{Enter}");
    await user.click(screen.getByRole("button", { name: "Supprimer « À supprimer »" }));
    expect(screen.queryByRole("checkbox", { name: /À supprimer/ })).not.toBeInTheDocument();
    await user.click(within(screen.getByRole("status")).getByRole("button", { name: "Annuler" }));
    expect(screen.getByRole("checkbox", { name: /À supprimer/ })).toBeInTheDocument();
  });

  it("filters by status", async () => {
    const { user, input } = setup();
    await user.type(input, "Tâche A{Enter}");
    await user.type(input, "Tâche B{Enter}");
    await user.click(screen.getByRole("checkbox", { name: /Tâche A/ }));
    await user.click(screen.getByRole("tab", { name: /À faire/ }));
    expect(screen.queryByText("Tâche A")).not.toBeInTheDocument();
    expect(screen.getByText("Tâche B")).toBeInTheDocument();
  });

  it("saves tasks in localStorage", async () => {
    const { user, input } = setup();
    await user.type(input, "Persistante{Enter}");
    expect(JSON.parse(localStorage.getItem("bloom-tasks"))[0].title).toBe("Persistante");
  });
});
