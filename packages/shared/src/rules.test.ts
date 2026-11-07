import { describe, expect, it } from "vitest";
import { allowedDecisions, assignableUsers, canManageTask, createAccountSchema, generateTempPassword } from "./index.js";
import type { FundRequest, Project, Task, User } from "./types.js";

const u = (id: string, role: User["role"], extra: Partial<User> = {}): User => ({
  id, name: id, email: `${id}@ighub.com`, role, position: "", isActive: true, joinedAt: "2026-01-01", ...extra,
});

const superAdmin = u("super", "super_admin");
const accountant = u("acct", "accountant");
const staff = u("staff", "staff");
const pm = u("pm", "project_manager");

const request = (amount: number, status: FundRequest["status"], requesterId = "staff"): FundRequest => ({
  id: "fr", requesterId, title: "t", purpose: "p", amount, category: "Equipment", neededBy: "2026-12-01",
  status, createdAt: "2026-11-01T00:00:00Z", history: [], attachments: [],
});

describe("fund request decisions", () => {
  it("lets the accountant approve below ₦50k without the super admin", () => {
    expect(allowedDecisions(request(49_999, "pending_review"), accountant)).toEqual(["approved", "forwarded", "rejected"]);
  });

  it("makes the accountant forward ₦50k and above", () => {
    expect(allowedDecisions(request(50_000, "pending_review"), accountant)).toEqual(["forwarded", "rejected"]);
  });

  it("only lets the super admin decide forwarded requests", () => {
    expect(allowedDecisions(request(200_000, "forwarded"), accountant)).toEqual([]);
    expect(allowedDecisions(request(200_000, "forwarded"), superAdmin)).toEqual(["approved", "rejected"]);
  });

  it("never lets the accountant review their own request", () => {
    expect(allowedDecisions(request(10_000, "pending_review", "acct"), accountant)).toEqual([]);
  });

  it("gives staff no review powers", () => {
    expect(allowedDecisions(request(10_000, "pending_review", "someone"), staff)).toEqual([]);
  });

  it("lets the accountant pay out approved requests", () => {
    expect(allowedDecisions(request(10_000, "approved"), accountant)).toEqual(["disbursed"]);
  });
});

describe("project manager task scope", () => {
  const projects: Project[] = [
    { id: "p1", name: "Mine", description: "", managerId: "pm", teamIds: ["staff"], startDate: "", endDate: "", budget: 0, spent: 0, status: "active", milestones: [] },
    { id: "p2", name: "Other", description: "", managerId: "other_pm", teamIds: ["outsider"], startDate: "", endDate: "", budget: 0, spent: 0, status: "active", milestones: [] },
  ];
  const users = [pm, staff, u("outsider", "staff"), superAdmin];
  const task = (projectId: string, createdBy = "someone"): Task => ({
    id: "t", title: "t", assignedTo: "staff", createdBy, dueDate: "", priority: "low", status: "pending", projectId, tags: [],
  });

  it("only offers people on the PM's projects", () => {
    expect(assignableUsers(users, projects, pm).map((x) => x.id).sort()).toEqual(["pm", "staff"]);
  });

  it("offers admins everyone active", () => {
    expect(assignableUsers(users, projects, superAdmin)).toHaveLength(4);
  });

  it("lets a PM manage tasks on their projects or that they created", () => {
    expect(canManageTask(task("p1"), projects, pm)).toBe(true);
    expect(canManageTask(task("p2"), projects, pm)).toBe(false);
    expect(canManageTask(task("p2", "pm"), projects, pm)).toBe(true);
  });

  it("never lets staff manage tasks", () => {
    expect(canManageTask(task("p1"), projects, staff)).toBe(false);
  });
});

describe("createAccountSchema", () => {
  const base = { name: "Ada Obi", email: " Ada@IGHub.com ", position: "Designer", staffType: "intern", officeLocation: "aba_hub" };

  it("accepts live roles and normalises the email", () => {
    const r = createAccountSchema.parse({ ...base, role: "accountant" });
    expect(r.email).toBe("ada@ighub.com");
  });

  it("refuses coming-soon roles", () => {
    expect(createAccountSchema.safeParse({ ...base, role: "trainer" }).success).toBe(false);
  });

  it("refuses short passwords", () => {
    expect(createAccountSchema.safeParse({ ...base, role: "staff", password: "short" }).success).toBe(false);
  });
});

describe("generateTempPassword", () => {
  it("is long enough and unambiguous", () => {
    const p = generateTempPassword();
    expect(p).toMatch(/^ighub-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(p.slice("ighub-".length)).not.toMatch(/[01ilo]/);
  });
});
