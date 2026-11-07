/**
 * End-to-end: the day-to-day workflows against a real MySQL test database.
 *   pnpm --filter @ighub/api test:e2e
 */
import { rm } from "node:fs/promises";
import { setup, TEST_DB } from "./helpers.js";

describe.skipIf(!TEST_DB)("workflows (e2e)", () => {
  let t: Awaited<ReturnType<typeof setup>>;
  type Client = Awaited<ReturnType<typeof t.as>>;
  let sup: Client, admin: Client, pm: Client, acct: Client, staff: Client, other: Client;
  let projectId: string;

  beforeAll(async () => {
    t = await setup();
    await t.seedUser("super@test.ighub", "super_admin");
    await t.seedUser("admin@test.ighub", "admin");
    await t.seedUser("pm@test.ighub", "project_manager");
    await t.seedUser("acct@test.ighub", "accountant");
    await t.seedUser("staff@test.ighub", "staff");
    await t.seedUser("other@test.ighub", "staff");
    [sup, admin, pm, acct, staff, other] = await Promise.all(
      ["super", "admin", "pm", "acct", "staff", "other"].map((n) => t.as(`${n}@test.ighub`)),
    );
  }, 60_000);

  afterAll(async () => {
    await t?.teardown();
    await rm("./.e2e-uploads", { recursive: true, force: true });
  });

  it("lets a PM create a project with their team", async () => {
    const res = await pm.post("/projects", {
      name: "VFD Onboarding",
      description: "KYC flow",
      managerId: admin.id, // ignored: a PM always manages their own projects
      teamIds: [staff.id],
      startDate: "2026-11-01",
      endDate: "2026-12-31",
      budget: 1_000_000,
      status: "active",
    });
    expect(res.status).toBe(201);
    expect(res.body.managerId).toBe(pm.id);
    expect(res.body.teamIds).toEqual([staff.id]);
    projectId = res.body.id;

    expect((await staff.post("/projects", { name: "x" })).status).toBe(403);
    expect((await staff.get("/projects")).body.map((p: { id: string }) => p.id)).toEqual([projectId]);
    expect((await other.get("/projects")).body).toEqual([]);
  });

  it("enforces the task rules", async () => {
    const task = { title: "Build KYC screens", assignedTo: staff.id, dueDate: "2026-11-20", priority: "high", projectId, tags: ["frontend"] };

    // PM can assign to their team, not to outsiders.
    const ok = await pm.post("/tasks", task);
    expect(ok.status).toBe(201);
    const outsider = await pm.post("/tasks", { ...task, assignedTo: other.id });
    expect(outsider.status).toBe(403);
    expect(outsider.body.code).toBe("assignee_not_allowed");

    // Staff can't create tasks, can move their own, can't move or see others'.
    expect((await staff.post("/tasks", task)).status).toBe(403);
    expect((await staff.patch(`/tasks/${ok.body.id}/status`, { status: "complete" })).status).toBe(200);
    expect((await other.patch(`/tasks/${ok.body.id}/status`, { status: "pending" })).status).toBe(403);
    expect((await other.get("/tasks")).body).toEqual([]);
    expect((await staff.delete(`/tasks/${ok.body.id}`)).status).toBe(403);

    // Completing a task shows in the activity feed.
    const feed = await admin.get("/activities");
    expect(feed.body.some((a: { message: string }) => a.message.includes("completed “Build KYC screens”"))).toBe(true);
  });

  it("keeps daily logs private except to the super admin", async () => {
    const save = await staff.put("/daily-logs/today", { entries: [{ description: "Built the selfie step", hours: 5 }] });
    expect(save.status).toBe(200);
    // Saving again updates the same log.
    await staff.put("/daily-logs/today", { entries: [{ description: "Built the selfie step", hours: 6 }], blockers: "Waiting on API keys" });

    expect((await staff.get("/daily-logs")).body).toHaveLength(1);
    expect((await other.get("/daily-logs")).body).toHaveLength(0);
    expect((await admin.get("/daily-logs")).body).toHaveLength(0);
    const all = await sup.get("/daily-logs");
    expect(all.body).toHaveLength(1);
    expect(all.body[0]).toMatchObject({ userId: staff.id, blockers: "Waiting on API keys", entries: [{ description: "Built the selfie step", hours: 6 }] });

    expect((await staff.put("/daily-logs/today", { entries: [] })).status).toBe(400);
    // The super admin reads, never writes.
    expect((await sup.put("/daily-logs/today", { entries: [{ description: "x" }] })).status).toBe(403);
  });

  it("runs a large fund request through accountant → super admin → paid, with files", async () => {
    const created = await staff
      .multipart("/fund-requests")
      .field("title", "Test phones")
      .field("purpose", "Two Android phones for QA")
      .field("amount", "320000")
      .field("category", "Equipment")
      .field("neededBy", "2026-11-30")
      .field("projectId", projectId)
      .attach("quotes", Buffer.from("%PDF-1.4 quote"), { filename: "quote.pdf", contentType: "application/pdf" });
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect(created.body).toMatchObject({ status: "pending_review", amount: 320000, attachments: [{ kind: "quote", name: "quote.pdf" }] });

    // Disallowed file types are refused.
    const bad = await staff.multipart("/fund-requests").field("title", "x").field("purpose", "x").field("amount", "10").field("category", "Equipment").field("neededBy", "2026-11-30")
      .attach("quotes", Buffer.from("MZ"), { filename: "virus.exe", contentType: "application/x-msdownload" });
    expect(bad.status).toBe(400);

    // Others can't see it; the requester can't approve it; the accountant can't approve ≥ ₦50k.
    expect((await other.get("/fund-requests")).body).toEqual([]);
    expect((await staff.post(`/fund-requests/${id}/decisions`, { decision: "approved" })).status).toBe(403);
    expect((await acct.post(`/fund-requests/${id}/decisions`, { decision: "approved" })).status).toBe(403);
    expect((await acct.post(`/fund-requests/${id}/decisions`, { decision: "rejected" })).status).toBe(400); // reason required

    expect((await acct.post(`/fund-requests/${id}/decisions`, { decision: "forwarded", note: "Within budget" })).body.status).toBe("forwarded");
    expect((await sup.post(`/fund-requests/${id}/decisions`, { decision: "approved" })).body.status).toBe("approved");
    const paid = await acct.post(`/fund-requests/${id}/decisions`, { decision: "disbursed", note: "Bank transfer" });
    expect(paid.body.status).toBe("disbursed");
    expect(paid.body.history.map((h: { action: string }) => h.action)).toEqual(["submitted", "forwarded", "approved", "disbursed"]);

    // Paying out booked the expense and the project spend.
    const tx = await acct.get("/finance/transactions");
    expect(tx.body).toEqual([expect.objectContaining({ kind: "expense", amount: 320000, category: "Equipment" })]);
    expect((await pm.get(`/projects/${projectId}`)).body.spent).toBe(320000);
    expect((await staff.get("/finance/transactions")).status).toBe(403);
    expect((await admin.get("/finance/transactions")).status).toBe(200);
    expect((await admin.post("/finance/transactions", { kind: "income", amount: 1, category: "Consulting", date: "2026-11-07", description: "x" })).status).toBe(403);

    // Receipt upload after payment, then download it back.
    const withReceipt = await staff.multipart(`/fund-requests/${id}/receipts`).attach("receipts", Buffer.from("receipt-bytes"), { filename: "receipt.png", contentType: "image/png" });
    expect(withReceipt.status).toBe(201);
    const receipt = withReceipt.body.attachments.find((a: { kind: string }) => a.kind === "receipt");
    const file = await acct.get(`/fund-requests/${id}/attachments/${receipt.id}`).buffer(true);
    expect(file.status).toBe(200);
    expect(file.body.toString()).toBe("receipt-bytes");
    expect((await other.get(`/fund-requests/${id}/attachments/${receipt.id}`)).status).toBe(404);
  });

  it("lets the accountant approve small requests alone", async () => {
    const small = await other.multipart("/fund-requests").field("title", "Data bundle").field("purpose", "Backup LTE").field("amount", "20000").field("category", "Internet").field("neededBy", "2026-11-30");
    const res = await acct.post(`/fund-requests/${small.body.id}/decisions`, { decision: "approved" });
    expect(res.body.status).toBe("approved");
  });

  it("shares and protects documents", async () => {
    const up = await staff.multipart("/documents").field("category", "reports").attach("files", Buffer.from("hello"), { filename: "report.txt", contentType: "text/plain" });
    expect(up.status).toBe(201);
    const doc = up.body[0];
    expect((await other.get(`/documents/${doc.id}/download`)).status).toBe(404);
    expect((await staff.put(`/documents/${doc.id}/shares`, { userIds: [other.id] })).status).toBe(200);
    const dl = await other.get(`/documents/${doc.id}/download`).buffer(true);
    expect(dl.status).toBe(200);
    expect(dl.text).toBe("hello");
    expect((await other.delete(`/documents/${doc.id}`)).status).toBe(403);
    expect((await staff.delete(`/documents/${doc.id}`)).status).toBe(204);
  });

  it("limits meetings and CRM to the right roles", async () => {
    const m = { title: "Stand-up", start: "2026-11-09T09:15:00+01:00", end: "2026-11-09T09:45:00+01:00", location: "HQ", participantIds: [staff.id] };
    expect((await staff.post("/meetings", m)).status).toBe(403);
    const created = await pm.post("/meetings", m);
    expect(created.status).toBe(201);
    expect(created.body.participantIds).toEqual([pm.id, staff.id]);
    expect((await staff.get("/meetings")).body).toHaveLength(1);
    expect((await other.get("/meetings")).body).toHaveLength(0);

    expect((await staff.get("/crm/contacts")).status).toBe(403);
    const c = await pm.post("/crm/contacts", { name: "Femi", email: "femi@vfd.ng", company: "VFD Bank", segment: "corporate" });
    expect(c.status).toBe(201);
    const deal = await pm.post("/crm/deals", { name: "Phase 2", contactId: c.body.id, value: 2_000_000 });
    expect((await pm.patch(`/crm/deals/${deal.body.id}/stage`, { stage: "won" })).body).toMatchObject({ stage: "won", probability: 100 });
  });
});
