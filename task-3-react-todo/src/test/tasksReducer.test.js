import { describe, expect, it } from "vitest";
import { createTask, tasksReducer, validateTitle } from "../state/tasksReducer";
import { describeDue } from "../utils/dates";

const a = { ...createTask({ title: "A" }), id: "a" };
const b = { ...createTask({ title: "B" }), id: "b" };
const c = { ...createTask({ title: "C" }), id: "c" };

describe("tasksReducer", () => {
  it("adds a task at the top", () => {
    expect(tasksReducer([a], { type: "add", task: b }).map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("toggles a task and records when it was done", () => {
    const [done] = tasksReducer([a], { type: "toggle", id: "a" });
    expect(done.done).toBe(true);
    expect(done.doneAt).toBeTypeOf("number");
    const [undone] = tasksReducer([done], { type: "toggle", id: "a" });
    expect(undone).toMatchObject({ done: false, doneAt: null });
  });

  it("edits a task and trims the title", () => {
    const [edited] = tasksReducer([a], { type: "edit", id: "a", changes: { title: "  New title  ", priority: "high" } });
    expect(edited).toMatchObject({ title: "New title", priority: "high" });
  });

  it("deletes and restores a task at its original position", () => {
    const after = tasksReducer([a, b, c], { type: "delete", id: "b" });
    expect(after.map((t) => t.id)).toEqual(["a", "c"]);
    const restored = tasksReducer(after, { type: "restore", task: b, index: 1 });
    expect(restored.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("clears completed tasks", () => {
    expect(tasksReducer([a, { ...b, done: true }, c], { type: "clearCompleted" }).map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("moves a task (drag & drop)", () => {
    expect(tasksReducer([a, b, c], { type: "move", fromId: "c", toId: "a" }).map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  it("does not mutate the previous state", () => {
    const state = [a, b];
    tasksReducer(state, { type: "delete", id: "a" });
    expect(state).toHaveLength(2);
  });
});

describe("validation and dates", () => {
  it("validates task titles", () => {
    expect(validateTitle("   ")).toMatch(/Écris/);
    expect(validateTitle("x")).toMatch(/2 caractères/);
    expect(validateTitle("x".repeat(121))).toMatch(/120/);
    expect(validateTitle("Faire les courses")).toBe("");
  });

  it("describes due dates", () => {
    expect(describeDue("2026-10-24", "2026-10-25").tone).toBe("late");
    expect(describeDue("2026-10-25", "2026-10-25").label).toBe("Aujourd'hui");
    expect(describeDue("2026-10-26", "2026-10-25").label).toBe("Demain");
    expect(describeDue("", "2026-10-25")).toBeNull();
  });
});
