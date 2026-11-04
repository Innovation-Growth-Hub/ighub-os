/**
 * Mock seed data. Deterministic (seeded PRNG) so every browser starts from the
 * same state. Replaced by the API + Postgres seeders once the backend exists.
 */
import type {
  Activity,
  Attendance,
  AttendanceStatus,
  Communication,
  Contact,
  Course,
  Deal,
  DocumentFile,
  Enrollment,
  Invoice,
  LateRequest,
  Meeting,
  OfficeLocation,
  Project,
  SocialAccount,
  SocialPost,
  Task,
  Transaction,
  User,
} from "@/lib/types";

export const OFFICES: Record<OfficeLocation, string> = {
  umuahia_hq: "Umuahia HQ",
  aba_hub: "Aba Hub",
};

/** Demo password for every seeded account (PRD §10.3). */
export const DEMO_PASSWORD = "password";

// ---------- Users ----------

export const seedUsers: User[] = [
  { id: "u_super", name: "Chidi Okafor", email: "superadmin@ighub.com", role: "super_admin", position: "Hub Director", staffType: "core_team", officeLocation: "umuahia_hq", isActive: true, joinedAt: "2022-01-10", phone: "+234 803 111 0001" },
  { id: "u_admin", name: "Ngozi Eze", email: "admin@ighub.com", role: "admin", position: "Operations Lead", staffType: "core_team", officeLocation: "umuahia_hq", isActive: true, joinedAt: "2022-03-02", phone: "+234 803 111 0002" },
  { id: "u_staff", name: "Emeka Nwosu", email: "staff@ighub.com", role: "staff", position: "Frontend Developer", staffType: "core_team", officeLocation: "umuahia_hq", isActive: true, joinedAt: "2023-06-12", phone: "+234 803 111 0003" },
  { id: "u_pm", name: "Adaeze Uche", email: "pm@ighub.com", role: "project_manager", position: "Project Manager", staffType: "core_team", officeLocation: "aba_hub", isActive: true, joinedAt: "2023-02-20", phone: "+234 803 111 0004" },
  { id: "u_social", name: "Tobi Adeyemi", email: "social@ighub.com", role: "social_media_manager", position: "Social Media Manager", staffType: "core_team", officeLocation: "umuahia_hq", isActive: true, joinedAt: "2024-01-08", phone: "+234 803 111 0005" },
  { id: "u_trainer", name: "Ifeanyi Obi", email: "trainer@ighub.com", role: "trainer", position: "Lead Trainer", staffType: "core_team", officeLocation: "aba_hub", isActive: true, joinedAt: "2023-09-01", phone: "+234 803 111 0006" },
  { id: "u_s2", name: "Blessing Okoro", email: "blessing@ighub.com", role: "staff", position: "Backend Developer", staffType: "core_team", officeLocation: "umuahia_hq", isActive: true, joinedAt: "2023-11-15" },
  { id: "u_s3", name: "Kelechi Amadi", email: "kelechi@ighub.com", role: "staff", position: "UI/UX Designer", staffType: "corper", officeLocation: "umuahia_hq", isActive: true, joinedAt: "2026-03-04" },
  { id: "u_s4", name: "Amaka Ibe", email: "amaka@ighub.com", role: "staff", position: "Community Manager", staffType: "corper", officeLocation: "aba_hub", isActive: true, joinedAt: "2026-03-04" },
  { id: "u_s5", name: "Somto Eke", email: "somto@ighub.com", role: "staff", position: "Data Analyst", staffType: "intern", officeLocation: "umuahia_hq", isActive: true, joinedAt: "2026-07-01" },
  { id: "u_s6", name: "Chioma Nnadi", email: "chioma@ighub.com", role: "staff", position: "Mobile Developer", staffType: "intern", officeLocation: "aba_hub", isActive: true, joinedAt: "2026-07-01" },
  { id: "u_s7", name: "Uchenna Ogbu", email: "uchenna@ighub.com", role: "staff", position: "IT Support", staffType: "core_team", officeLocation: "aba_hub", isActive: false, joinedAt: "2022-08-19" },
  { id: "u_client", name: "Femi Bakare", email: "client@partner.com", role: "client", position: "Head of Digital", company: "VFD Bank", isActive: true, joinedAt: "2025-10-01" },
  { id: "u_client2", name: "Halima Musa", email: "halima@abiastate.gov.ng", role: "client", position: "ICT Director", company: "Abia State Govt", isActive: true, joinedAt: "2025-05-14" },
  { id: "u_student", name: "David Okonkwo", email: "student@ighub.com", role: "student", position: "Bootcamp Student", isActive: true, joinedAt: "2026-09-01" },
  { id: "u_st2", name: "Precious Udo", email: "precious@ighub.com", role: "student", position: "Bootcamp Student", isActive: true, joinedAt: "2026-09-01" },
  { id: "u_st3", name: "Joy Anyanwu", email: "joy@ighub.com", role: "student", position: "Bootcamp Student", isActive: true, joinedAt: "2026-09-01" },
];

// ---------- Attendance (generated) ----------

function prng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function isoAt(dateKey: string, h: number, m: number) {
  return `${dateKey}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function weekdaysBetween(start: string, end: string) {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (d <= last) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      out.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      );
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function generateAttendance(): Attendance[] {
  const rand = prng(42);
  const workers = seedUsers.filter(
    (u) => u.isActive && u.officeLocation && !["client", "student"].includes(u.role),
  );
  // Six weeks of history up to yesterday (seed "today" is 2026-11-04).
  const days = weekdaysBetween("2026-09-21", "2026-11-03");
  const rows: Attendance[] = [];
  for (const date of days) {
    for (const u of workers) {
      // Emeka (staff demo) runs late often, so the penalty flow has data.
      const lateBias = u.id === "u_staff" || u.id === "u_s5" ? 0.4 : 0.12;
      const r = rand();
      let status: AttendanceStatus = "on_time";
      if (r < 0.05) status = "absent";
      else if (r < 0.05 + lateBias) status = "late";

      if (status === "absent") {
        rows.push({ id: `att_${u.id}_${date}`, userId: u.id, date, officeLocation: u.officeLocation!, status });
        continue;
      }
      const inH = status === "late" ? 9 : 8;
      const inM = status === "late" ? 5 + Math.floor(rand() * 50) : 10 + Math.floor(rand() * 49);
      rows.push({
        id: `att_${u.id}_${date}`,
        userId: u.id,
        date,
        clockIn: isoAt(date, inH, inM),
        clockOut: isoAt(date, 17, Math.floor(rand() * 45)),
        officeLocation: u.officeLocation!,
        status,
      });
    }
  }
  return rows;
}

export const seedAttendance: Attendance[] = generateAttendance();

export const seedLateRequests: LateRequest[] = [
  { id: "lr_1", userId: "u_staff", date: "2026-11-03", reason: "Traffic gridlock on Aba road after the rain.", status: "pending", createdAt: "2026-11-03T08:40:00" },
  { id: "lr_2", userId: "u_s5", date: "2026-11-02", reason: "Hospital appointment in the morning.", status: "pending", createdAt: "2026-11-01T18:10:00" },
  { id: "lr_3", userId: "u_s3", date: "2026-10-28", reason: "NYSC CDS meeting ran over.", status: "approved", createdAt: "2026-10-27T16:00:00" },
  { id: "lr_4", userId: "u_staff", date: "2026-10-21", reason: "Overslept.", status: "rejected", createdAt: "2026-10-21T09:30:00" },
];

// ---------- Tasks ----------

export const seedTasks: Task[] = [
  { id: "t_1", title: "Build VFD onboarding screens", description: "Implement the KYC steps from the Figma file.", assignedTo: "u_staff", createdBy: "u_pm", dueDate: "2026-11-06", priority: "high", status: "in_progress", projectId: "p_vfd", tags: ["frontend", "vfd"] },
  { id: "t_2", title: "Set up payment webhook handler", assignedTo: "u_s2", createdBy: "u_pm", dueDate: "2026-11-09", priority: "high", status: "pending", projectId: "p_vfd", tags: ["backend"] },
  { id: "t_3", title: "Design Kids Code Camp certificates", assignedTo: "u_s3", createdBy: "u_admin", dueDate: "2026-11-12", priority: "medium", status: "pending", projectId: "p_kids", tags: ["design"] },
  { id: "t_4", title: "Weekly community newsletter", assignedTo: "u_s4", createdBy: "u_admin", dueDate: "2026-11-05", priority: "medium", status: "in_progress", tags: ["community"] },
  { id: "t_5", title: "Attendance analysis for Q3", assignedTo: "u_s5", createdBy: "u_admin", dueDate: "2026-11-02", priority: "low", status: "complete", tags: ["data"] },
  { id: "t_6", title: "Fix Android build for e-Gov app", assignedTo: "u_s6", createdBy: "u_pm", dueDate: "2026-11-07", priority: "high", status: "in_progress", projectId: "p_egov", tags: ["mobile"] },
  { id: "t_7", title: "Schedule November IG content", assignedTo: "u_social", createdBy: "u_admin", dueDate: "2026-11-05", priority: "medium", status: "complete", tags: ["social"] },
  { id: "t_8", title: "Prepare Week 9 bootcamp slides", assignedTo: "u_trainer", createdBy: "u_admin", dueDate: "2026-11-08", priority: "medium", status: "pending", tags: ["lms"] },
  { id: "t_9", title: "Write API docs for e-Gov portal", assignedTo: "u_staff", createdBy: "u_pm", dueDate: "2026-11-13", priority: "low", status: "pending", projectId: "p_egov", tags: ["docs"] },
  { id: "t_10", title: "Expansion proposal budget sheet", assignedTo: "u_admin", createdBy: "u_super", dueDate: "2026-11-10", priority: "high", status: "in_progress", tags: ["finance"] },
];

// ---------- Projects ----------

export const seedProjects: Project[] = [
  {
    id: "p_vfd", name: "VFD Bank Mobile Onboarding", description: "Customer onboarding and KYC flow for VFD Bank's new mobile app, integrated with their core banking API.",
    clientId: "u_client", managerId: "u_pm", teamIds: ["u_staff", "u_s2", "u_s3"], startDate: "2026-09-01", endDate: "2026-12-15",
    budget: 4_500_000, spent: 2_350_000, status: "active",
    milestones: [
      { id: "m1", title: "Discovery & UX", dueDate: "2026-09-20", done: true },
      { id: "m2", title: "API integration", dueDate: "2026-10-25", done: true },
      { id: "m3", title: "Onboarding screens", dueDate: "2026-11-15", done: false },
      { id: "m4", title: "UAT & launch", dueDate: "2026-12-10", done: false },
    ],
  },
  {
    id: "p_egov", name: "Abia e-Gov Service Portal", description: "Citizen services portal for Abia State ministries: permits, payments and status tracking.",
    clientId: "u_client2", managerId: "u_pm", teamIds: ["u_staff", "u_s6", "u_s5"], startDate: "2026-07-15", endDate: "2027-02-28",
    budget: 9_800_000, spent: 3_100_000, status: "active",
    milestones: [
      { id: "m1", title: "Requirements sign-off", dueDate: "2026-08-10", done: true },
      { id: "m2", title: "Permits module", dueDate: "2026-11-30", done: false },
      { id: "m3", title: "Payments module", dueDate: "2027-01-15", done: false },
      { id: "m4", title: "Go-live", dueDate: "2027-02-28", done: false },
    ],
  },
  {
    id: "p_kids", name: "Kids Code Camp 2026", description: "December coding camp for 8–14 year-olds across Umuahia and Aba.",
    managerId: "u_admin", teamIds: ["u_trainer", "u_s3", "u_s4"], startDate: "2026-10-01", endDate: "2026-12-20",
    budget: 1_200_000, spent: 420_000, status: "planning",
    milestones: [
      { id: "m1", title: "Curriculum final", dueDate: "2026-10-20", done: true },
      { id: "m2", title: "Registrations open", dueDate: "2026-11-10", done: false },
      { id: "m3", title: "Camp week", dueDate: "2026-12-14", done: false },
    ],
  },
  {
    id: "p_web", name: "IGHub Website Refresh", description: "New marketing site with programme listings and online applications.",
    managerId: "u_pm", teamIds: ["u_s3", "u_s2"], startDate: "2026-04-01", endDate: "2026-06-30",
    budget: 800_000, spent: 760_000, status: "completed",
    milestones: [
      { id: "m1", title: "Design", dueDate: "2026-04-30", done: true },
      { id: "m2", title: "Build", dueDate: "2026-06-10", done: true },
      { id: "m3", title: "Launch", dueDate: "2026-06-30", done: true },
    ],
  },
];

// ---------- CRM ----------

export const seedContacts: Contact[] = [
  { id: "c_1", name: "Femi Bakare", email: "client@partner.com", phone: "+234 802 555 0101", company: "VFD Bank", position: "Head of Digital", segment: "corporate", lastContactedAt: "2026-11-02T10:00:00" },
  { id: "c_2", name: "Halima Musa", email: "halima@abiastate.gov.ng", phone: "+234 802 555 0102", company: "Abia State Govt", position: "ICT Director", segment: "government", lastContactedAt: "2026-10-30T14:00:00" },
  { id: "c_3", name: "Obinna Ike", email: "obinna@aba-leather.co", phone: "+234 802 555 0103", company: "Aba Leather Co-op", position: "Chairman", segment: "corporate", lastContactedAt: "2026-10-22T11:30:00" },
  { id: "c_4", name: "Zainab Bello", email: "zainab@techfund.africa", phone: "+234 802 555 0104", company: "TechFund Africa", position: "Programme Officer", segment: "ngo", lastContactedAt: "2026-10-28T09:00:00" },
  { id: "c_5", name: "Kunle Ajayi", email: "kunle@paystackish.io", phone: "+234 802 555 0105", company: "Swiftpay", position: "CTO", segment: "startup", lastContactedAt: "2026-10-15T16:45:00" },
  { id: "c_6", name: "Grace Ekpo", email: "grace@unicef-ng.org", phone: "+234 802 555 0106", company: "Youth Skills Initiative", position: "Partnerships", segment: "ngo", lastContactedAt: "2026-10-05T13:00:00" },
];

export const seedDeals: Deal[] = [
  { id: "d_1", name: "VFD Phase 2: Merchant app", contactId: "c_1", stage: "proposal", value: 6_000_000, probability: 60 },
  { id: "d_2", name: "e-Gov payments extension", contactId: "c_2", stage: "negotiation", value: 3_500_000, probability: 75 },
  { id: "d_3", name: "Leather co-op e-commerce site", contactId: "c_3", stage: "qualified", value: 1_800_000, probability: 40 },
  { id: "d_4", name: "Women in Tech bootcamp grant", contactId: "c_4", stage: "lead", value: 5_000_000, probability: 20 },
  { id: "d_5", name: "Swiftpay dev team training", contactId: "c_5", stage: "won", value: 2_200_000, probability: 100 },
  { id: "d_6", name: "Digital skills for 500 youths", contactId: "c_6", stage: "lead", value: 7_500_000, probability: 15 },
  { id: "d_7", name: "Corporate Excel training", contactId: "c_3", stage: "lost", value: 400_000, probability: 0 },
];

export const seedCommunications: Communication[] = [
  { id: "cm_1", contactId: "c_1", type: "meeting", summary: "Reviewed Phase 2 scope; they want merchant QR payments.", at: "2026-11-02T10:00:00" },
  { id: "cm_2", contactId: "c_1", type: "email", summary: "Sent revised onboarding timeline.", at: "2026-10-26T15:20:00" },
  { id: "cm_3", contactId: "c_2", type: "call", summary: "Discussed payment gateway options for permits.", at: "2026-10-30T14:00:00" },
  { id: "cm_4", contactId: "c_4", type: "email", summary: "Shared grant concept note.", at: "2026-10-28T09:00:00" },
];

// ---------- LMS ----------

export const seedCourses: Course[] = [
  {
    id: "co_web", title: "Full-Stack Web Development", description: "12-week bootcamp: HTML/CSS, JavaScript, React and Node.js.", trainerId: "u_trainer",
    startDate: "2026-09-07", endDate: "2026-11-27", category: "Development",
    lessons: [
      { id: "l1", title: "HTML & semantic markup", durationMin: 90 },
      { id: "l2", title: "Modern CSS & layout", durationMin: 120 },
      { id: "l3", title: "JavaScript fundamentals", durationMin: 150 },
      { id: "l4", title: "DOM & events", durationMin: 120 },
      { id: "l5", title: "React basics", durationMin: 150 },
      { id: "l6", title: "State & data fetching", durationMin: 150 },
      { id: "l7", title: "Node.js & REST APIs", durationMin: 150 },
      { id: "l8", title: "Databases & auth", durationMin: 150 },
    ],
  },
  {
    id: "co_design", title: "Product Design Essentials", description: "Design thinking, Figma and usability testing.", trainerId: "u_trainer",
    startDate: "2026-10-05", endDate: "2026-12-11", category: "Design",
    lessons: [
      { id: "l1", title: "Design thinking", durationMin: 60 },
      { id: "l2", title: "Figma foundations", durationMin: 120 },
      { id: "l3", title: "Wireframes to prototypes", durationMin: 120 },
      { id: "l4", title: "Usability testing", durationMin: 90 },
    ],
  },
  {
    id: "co_kids", title: "Kids Code Camp: Scratch", description: "Playful intro to programming for ages 8–14.", trainerId: "u_trainer",
    startDate: "2026-12-07", endDate: "2026-12-18", category: "Kids",
    lessons: [
      { id: "l1", title: "Meet Scratch", durationMin: 45 },
      { id: "l2", title: "Loops & animation", durationMin: 45 },
      { id: "l3", title: "Build a game", durationMin: 90 },
    ],
  },
];

export const seedEnrollments: Enrollment[] = [
  { id: "e_1", userId: "u_student", courseId: "co_web", enrolledAt: "2026-09-01", completedLessonIds: ["l1", "l2", "l3", "l4", "l5"], grade: 82 },
  { id: "e_2", userId: "u_st2", courseId: "co_web", enrolledAt: "2026-09-01", completedLessonIds: ["l1", "l2", "l3", "l4", "l5", "l6", "l7"], grade: 91 },
  { id: "e_3", userId: "u_st3", courseId: "co_web", enrolledAt: "2026-09-02", completedLessonIds: ["l1", "l2", "l3"], grade: 68 },
  { id: "e_4", userId: "u_student", courseId: "co_design", enrolledAt: "2026-10-01", completedLessonIds: ["l1"] },
  { id: "e_5", userId: "u_st3", courseId: "co_design", enrolledAt: "2026-10-01", completedLessonIds: ["l1", "l2"] },
];

// ---------- Finance ----------
// Totals match PRD §7.7: revenue ₦8.4M, expenses ₦3.2M.

export const INCOME_SOURCES = ["Training Programs", "Web Development", "Consulting", "Other Services"];
export const EXPENSE_CATEGORIES = ["Salaries & stipends", "Rent & utilities", "Internet", "Equipment", "Events", "Marketing"];

export const seedTransactions: Transaction[] = [
  { id: "tx_1", kind: "income", amount: 1_400_000, category: "Training Programs", date: "2026-06-12", description: "Bootcamp cohort 3 fees" },
  { id: "tx_2", kind: "income", amount: 900_000, category: "Web Development", date: "2026-06-30", description: "IGHub site partner sponsorship" },
  { id: "tx_3", kind: "income", amount: 500_000, category: "Consulting", date: "2026-07-14", description: "Digital strategy workshop: Aba Leather" },
  { id: "tx_4", kind: "income", amount: 1_100_000, category: "Training Programs", date: "2026-08-05", description: "Corporate training: Swiftpay" },
  { id: "tx_5", kind: "income", amount: 1_200_000, category: "Web Development", date: "2026-09-02", description: "VFD Bank: milestone 1" },
  { id: "tx_6", kind: "income", amount: 840_000, category: "Other Services", date: "2026-09-20", description: "Co-working memberships (Q3)" },
  { id: "tx_7", kind: "income", amount: 692_000, category: "Training Programs", date: "2026-10-03", description: "Bootcamp cohort 4 deposits" },
  { id: "tx_8", kind: "income", amount: 668_000, category: "Web Development", date: "2026-10-25", description: "VFD Bank: milestone 2" },
  { id: "tx_9", kind: "income", amount: 1_096_000, category: "Consulting", date: "2026-10-30", description: "e-Gov advisory retainer" },
  { id: "tx_10", kind: "expense", amount: 1_450_000, category: "Salaries & stipends", date: "2026-10-28", description: "October stipends & salaries" },
  { id: "tx_11", kind: "expense", amount: 600_000, category: "Rent & utilities", date: "2026-10-01", description: "Q4 rent: Umuahia HQ" },
  { id: "tx_12", kind: "expense", amount: 280_000, category: "Internet", date: "2026-10-05", description: "Fibre + backup LTE" },
  { id: "tx_13", kind: "expense", amount: 420_000, category: "Equipment", date: "2026-09-18", description: "6 laptops for training lab" },
  { id: "tx_14", kind: "expense", amount: 300_000, category: "Events", date: "2026-08-22", description: "Abia Tech Meetup" },
  { id: "tx_15", kind: "expense", amount: 150_000, category: "Marketing", date: "2026-10-12", description: "Bootcamp ads" },
];

export const seedInvoices: Invoice[] = [
  { id: "inv_1", number: "IGH-2026-031", clientId: "u_client", amount: 1_200_000, issuedAt: "2026-08-25", dueAt: "2026-09-08", status: "paid" },
  { id: "inv_2", number: "IGH-2026-038", clientId: "u_client", amount: 668_000, issuedAt: "2026-10-15", dueAt: "2026-10-29", status: "paid" },
  { id: "inv_3", number: "IGH-2026-041", clientId: "u_client2", amount: 2_400_000, issuedAt: "2026-10-10", dueAt: "2026-10-31", status: "overdue" },
  { id: "inv_4", number: "IGH-2026-044", clientId: "u_client", amount: 1_100_000, issuedAt: "2026-11-02", dueAt: "2026-11-16", status: "sent" },
  { id: "inv_5", number: "IGH-2026-045", clientId: "u_client2", amount: 900_000, issuedAt: "2026-11-04", dueAt: "2026-11-25", status: "draft" },
];

// ---------- Documents ----------

export const seedDocuments: DocumentFile[] = [
  { id: "doc_1", name: "VFD Bank API Agreement.pdf", category: "contracts", sizeKb: 842, ownerId: "u_admin", updatedAt: "2026-10-29T11:00:00", version: 3, sharedWith: ["u_pm", "u_client"] },
  { id: "doc_2", name: "Kids Code Camp Curriculum.docx", category: "training", sizeKb: 312, ownerId: "u_trainer", updatedAt: "2026-10-20T09:15:00", version: 2, sharedWith: ["u_admin"] },
  { id: "doc_3", name: "Q1 2026 Financial Report.xlsx", category: "reports", sizeKb: 1290, ownerId: "u_admin", updatedAt: "2026-04-08T16:40:00", version: 1, sharedWith: ["u_super"] },
  { id: "doc_4", name: "Tech Hub Expansion Proposal.pdf", category: "proposals", sizeKb: 2210, ownerId: "u_super", updatedAt: "2026-11-01T13:05:00", version: 4, sharedWith: ["u_admin"] },
  { id: "doc_5", name: "e-Gov Portal SOW.pdf", category: "contracts", sizeKb: 640, ownerId: "u_pm", updatedAt: "2026-07-18T10:00:00", version: 2, sharedWith: ["u_client2"] },
  { id: "doc_6", name: "Bootcamp Week 8 Assessment.pdf", category: "training", sizeKb: 188, ownerId: "u_trainer", updatedAt: "2026-10-31T17:20:00", version: 1, sharedWith: [] },
  { id: "doc_7", name: "Women in Tech Grant Concept.docx", category: "proposals", sizeKb: 274, ownerId: "u_admin", updatedAt: "2026-10-28T08:50:00", version: 1, sharedWith: [] },
  { id: "doc_8", name: "Q3 Attendance Summary.pdf", category: "reports", sizeKb: 420, ownerId: "u_s5", updatedAt: "2026-11-02T12:00:00", version: 1, sharedWith: ["u_admin"] },
];

// ---------- Meetings ----------

export const seedMeetings: Meeting[] = [
  { id: "mt_1", title: "Monday stand-up", description: "Weekly priorities and blockers.", start: "2026-11-02T09:15:00", end: "2026-11-02T09:45:00", location: "Umuahia HQ: Boardroom", participantIds: ["u_admin", "u_staff", "u_s2", "u_s3", "u_pm"], agenda: ["Last week wins", "This week focus", "Blockers"], status: "completed" },
  { id: "mt_2", title: "VFD Phase 2 scoping", description: "Merchant app requirements with VFD.", start: "2026-11-05T11:00:00", end: "2026-11-05T12:00:00", location: "Google Meet", participantIds: ["u_pm", "u_staff", "u_admin"], agenda: ["Merchant QR flow", "Timeline", "Pricing"], status: "scheduled" },
  { id: "mt_3", title: "Kids Code Camp logistics", description: "Venues, laptops, volunteers.", start: "2026-11-06T14:00:00", end: "2026-11-06T15:00:00", location: "Aba Hub: Room 2", participantIds: ["u_admin", "u_trainer", "u_s4"], agenda: ["Venue", "Volunteers", "Registration"], status: "scheduled" },
  { id: "mt_4", title: "Monthly finance review", description: "October numbers.", start: "2026-11-09T10:00:00", end: "2026-11-09T11:00:00", location: "Umuahia HQ: Boardroom", participantIds: ["u_super", "u_admin"], agenda: ["Revenue", "Expenses", "Overdue invoices"], status: "scheduled" },
  { id: "mt_5", title: "Design critique", description: "Review onboarding screens.", start: "2026-10-30T15:00:00", end: "2026-10-30T16:00:00", location: "Umuahia HQ: Lab", participantIds: ["u_s3", "u_staff", "u_pm"], agenda: ["Onboarding", "Empty states"], status: "cancelled" },
];

// ---------- Social ----------

export const seedSocialAccounts: SocialAccount[] = [
  { id: "sa_ig", platform: "instagram", handle: "@ighubabia", followers: 12400 },
  { id: "sa_x", platform: "x", handle: "@ighub_ng", followers: 8900 },
  { id: "sa_li", platform: "linkedin", handle: "Innovation Growth Hub", followers: 15200 },
  { id: "sa_fb", platform: "facebook", handle: "IGHub Abia", followers: 6100 },
];

export const seedSocialPosts: SocialPost[] = [
  { id: "sp_1", accountId: "sa_ig", content: "Cohort 4 is building real products 🚀 Swipe to see week 8 demos.", scheduledAt: "2026-10-31T12:00:00", publishedAt: "2026-10-31T12:00:00", likes: 842, shares: 61 },
  { id: "sp_2", accountId: "sa_li", content: "We're proud to partner with VFD Bank on their new onboarding experience.", scheduledAt: "2026-10-28T09:00:00", publishedAt: "2026-10-28T09:00:00", likes: 1290, shares: 144 },
  { id: "sp_3", accountId: "sa_x", content: "Kids Code Camp registrations open 10 Nov. Ages 8–14, Umuahia & Aba.", scheduledAt: "2026-11-10T08:00:00" },
  { id: "sp_4", accountId: "sa_ig", content: "Meet the team: our NYSC corpers share what they've learned.", scheduledAt: "2026-11-06T17:00:00" },
  { id: "sp_5", accountId: "sa_fb", content: "Abia Tech Meetup recap + photos.", scheduledAt: "2026-10-25T15:00:00", publishedAt: "2026-10-25T15:00:00", likes: 310, shares: 22 },
  { id: "sp_6", accountId: "sa_li", content: "Hiring: Backend developer (Node.js) for our Umuahia studio.", scheduledAt: "2026-11-08T10:00:00" },
];

// ---------- Activity ----------

export const seedActivities: Activity[] = [
  { id: "a_1", actorId: "u_s5", message: "completed “Attendance analysis for Q3”", at: "2026-11-04T08:55:00" },
  { id: "a_2", actorId: "u_staff", message: "submitted a late request for 3 Nov", at: "2026-11-03T08:40:00" },
  { id: "a_3", actorId: "u_admin", message: "uploaded Tech Hub Expansion Proposal v4", at: "2026-11-01T13:05:00" },
  { id: "a_4", actorId: "u_pm", message: "marked “API integration” milestone done on VFD", at: "2026-10-25T17:10:00" },
  { id: "a_5", actorId: "u_social", message: "published a LinkedIn post (1.2K likes)", at: "2026-10-28T09:00:00" },
  { id: "a_6", actorId: "u_trainer", message: "graded Week 8 assessments", at: "2026-10-31T17:20:00" },
];
