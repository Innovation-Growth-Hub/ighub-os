"use client";

/**
 * Data hooks over the NestJS API (TanStack Query). Each `useX()` returns the
 * collection (empty while loading), so pages read like the old mock store:
 *   const tasks = useTasks();
 * `useActions()` returns the mutations; each refreshes the affected lists and
 * shows a toast on failure, resolving to `undefined` instead of throwing.
 */
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type {
  Activity,
  Communication,
  Contact,
  CreateAccountInput,
  CreateCommunicationInput,
  CreateContactInput,
  CreateDealInput,
  CreateMeetingInput,
  CreateProjectInput,
  CreateTaskInput,
  CreateTransactionInput,
  DailyLog,
  Deal,
  DealStage,
  DocumentCategory,
  DocumentFile,
  FundRequest,
  FundRequestDecision,
  Invoice,
  Meeting,
  MeetingStatus,
  Project,
  SaveDailyLogInput,
  Task,
  TaskStatus,
  Transaction,
  UpdateAccountInput,
  User,
} from "@ighub/shared";
import { api } from "./client";
import { toast } from "./toast";

export type Account = User & { mustChangePassword: boolean };

const EMPTY: never[] = [];

function useList<T>(key: string, path: string, enabled = true): T[] {
  const { data } = useQuery({ queryKey: [key], queryFn: () => api.get<T[]>(path), enabled });
  return (data as T[] | undefined) ?? (EMPTY as T[]);
}

/** Whether a list has loaded at least once (for empty-state vs loading). */
export function useLoaded(key: string) {
  const qc = useQueryClient();
  return qc.getQueryState([key])?.status === "success";
}

export const useUsers = () => useList<Account>("directory", "/directory");
export const useAccounts = () => useList<Account>("accounts", "/accounts");
export const useProjects = () => useList<Project>("projects", "/projects");
export const useTasks = () => useList<Task>("tasks", "/tasks");
export const useDailyLogs = () => useList<DailyLog>("daily-logs", "/daily-logs");
export const useFundRequests = () => useList<FundRequest>("fund-requests", "/fund-requests");
export const useTransactions = (enabled = true) => useList<Transaction>("transactions", "/finance/transactions", enabled);
export const useInvoices = (enabled = true) => useList<Invoice>("invoices", "/finance/invoices", enabled);
export const useDocuments = () => useList<DocumentFile>("documents", "/documents");
export const useMeetings = () => useList<Meeting>("meetings", "/meetings");
export const useContacts = () => useList<Contact>("contacts", "/crm/contacts");
export const useDeals = () => useList<Deal>("deals", "/crm/deals");
export const useCommunications = () => useList<Communication>("communications", "/crm/communications");
export const useActivities = () => useList<Activity>("activities", "/activities");

export function useActions() {
  const qc = useQueryClient();

  /** Run a mutation, refresh `keys`, toast on error. Resolves to undefined on failure. */
  async function run<T>(fn: () => Promise<T>, keys: string[], success?: string): Promise<T | undefined> {
    try {
      const result = await fn();
      await Promise.all([...keys, "activities"].map((k) => qc.invalidateQueries({ queryKey: [k] as QueryKey })));
      if (success) toast.success(success);
      return result;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
      return undefined;
    }
  }

  return {
    // accounts (super admin)
    createAccount: (input: CreateAccountInput) =>
      run(() => api.post<{ account: Account; temporaryPassword: string }>("/accounts", input), ["accounts", "directory"]),
    updateAccount: (id: string, patch: UpdateAccountInput) => run(() => api.patch<Account>(`/accounts/${id}`, patch), ["accounts", "directory"], "Saved"),
    setAccountActive: (id: string, active: boolean) =>
      run(() => api.patch<Account>(`/accounts/${id}/status`, { active }), ["accounts", "directory"], active ? "Account reactivated" : "Account deactivated"),
    resetPassword: (id: string) => run(() => api.post<{ temporaryPassword: string }>(`/accounts/${id}/reset-password`), ["accounts"]),
    updateMyProfile: (patch: { name?: string; phone?: string }) => run(() => api.patch<Account>("/me", patch), ["accounts", "directory"], "Profile saved"),

    // projects
    addProject: (p: CreateProjectInput) => run(() => api.post<Project>("/projects", p), ["projects"]),
    toggleMilestone: (projectId: string, milestoneId: string) =>
      run(() => api.patch<Project>(`/projects/${projectId}/milestones/${milestoneId}/toggle`), ["projects"]),
    addMilestone: (projectId: string, m: { title: string; dueDate: string }) => run(() => api.post<Project>(`/projects/${projectId}/milestones`, m), ["projects"]),

    // tasks
    addTask: (t: CreateTaskInput) => run(() => api.post<Task>("/tasks", t), ["tasks"], "Task created"),
    moveTask: (id: string, status: TaskStatus) => {
      // Optimistic: move the card now, roll back if the API refuses.
      const prev = qc.getQueryData<Task[]>(["tasks"]);
      qc.setQueryData<Task[]>(["tasks"], (ts) => ts?.map((t) => (t.id === id ? { ...t, status } : t)));
      return run(() => api.patch<Task>(`/tasks/${id}/status`, { status }), ["tasks"]).then((r) => {
        if (!r) qc.setQueryData(["tasks"], prev);
        return r;
      });
    },
    deleteTask: (id: string) => run(() => api.delete<void>(`/tasks/${id}`), ["tasks"]),

    // daily logs
    saveDailyLog: (input: SaveDailyLogInput) => run(() => api.put<DailyLog>("/daily-logs/today", input), ["daily-logs"]),

    // fund requests (form = multipart with fields + `quotes`)
    submitFundRequest: (form: FormData) => run(() => api.post<FundRequest>("/fund-requests", form), ["fund-requests"], "Sent to the accountant"),
    decideFundRequest: (id: string, decision: FundRequestDecision, note?: string) =>
      run(() => api.post<FundRequest>(`/fund-requests/${id}/decisions`, { decision, note }), ["fund-requests", "transactions", "projects"]),
    addReceipts: (id: string, files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append("receipts", f));
      return run(() => api.post<FundRequest>(`/fund-requests/${id}/receipts`, form), ["fund-requests"], "Receipt uploaded");
    },

    // finance
    addTransaction: (t: CreateTransactionInput) => run(() => api.post<Transaction>("/finance/transactions", t), ["transactions"], "Recorded"),

    // documents
    uploadDocuments: (category: DocumentCategory, files: File[]) => {
      const form = new FormData();
      form.append("category", category);
      files.forEach((f) => form.append("files", f));
      return run(() => api.post<DocumentFile[]>("/documents", form), ["documents"], files.length === 1 ? "Uploaded" : `${files.length} files uploaded`);
    },
    deleteDocument: (id: string) => run(() => api.delete<void>(`/documents/${id}`), ["documents"]),
    shareDocument: (id: string, userIds: string[]) => run(() => api.put<DocumentFile>(`/documents/${id}/shares`, { userIds }), ["documents"], "Sharing updated"),

    // meetings
    addMeeting: (m: CreateMeetingInput) => run(() => api.post<Meeting>("/meetings", m), ["meetings"], "Meeting scheduled"),
    setMeetingStatus: (id: string, status: MeetingStatus) => run(() => api.patch<Meeting>(`/meetings/${id}/status`, { status }), ["meetings"]),

    // CRM
    addContact: (c: CreateContactInput) => run(() => api.post<Contact>("/crm/contacts", c), ["contacts"], "Contact added"),
    addDeal: (d: CreateDealInput) => run(() => api.post<Deal>("/crm/deals", d), ["deals"], "Deal added"),
    moveDeal: (id: string, stage: DealStage) => {
      const prev = qc.getQueryData<Deal[]>(["deals"]);
      qc.setQueryData<Deal[]>(["deals"], (ds) => ds?.map((d) => (d.id === id ? { ...d, stage } : d)));
      return run(() => api.patch<Deal>(`/crm/deals/${id}/stage`, { stage }), ["deals"]).then((r) => {
        if (!r) qc.setQueryData(["deals"], prev);
        return r;
      });
    },
    addCommunication: (c: CreateCommunicationInput) => run(() => api.post<Communication>("/crm/communications", c), ["communications", "contacts"]),
  };
}
