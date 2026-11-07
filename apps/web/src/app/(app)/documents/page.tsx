"use client";

import { useRef, useState } from "react";
import { BookOpen, FileSignature, FileText, FolderOpen, Lightbulb, Search, Share2, Trash2, Upload } from "lucide-react";
import { useCurrentUser } from "@/lib/auth/auth-client";
import { isAdmin } from "@ighub/shared";
import { useDb, userById } from "@/lib/store";
import type { DocumentCategory, DocumentFile } from "@ighub/shared";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, Td, Th, THead, Tr } from "@/components/ui/table";

const CATEGORIES: Record<DocumentCategory, { label: string; icon: typeof FileText }> = {
  contracts: { label: "Contracts", icon: FileSignature },
  proposals: { label: "Proposals", icon: Lightbulb },
  reports: { label: "Reports", icon: FileText },
  training: { label: "Training", icon: BookOpen },
};

function size(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export default function DocumentsPage() {
  const user = useCurrentUser();
  const { documents, users, addDocument, deleteDocument } = useDb();
  const [category, setCategory] = useState<"all" | DocumentCategory>("all");
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>("reports");
  const [q, setQ] = useState("");
  const [sharing, setSharing] = useState<DocumentFile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Staff see their own files and files shared with them; admins see everything.
  const accessible = documents.filter((d) => isAdmin(user.role) || d.ownerId === user.id || d.sharedWith.includes(user.id));
  const shown = accessible
    .filter((d) => category === "all" || d.category === category)
    .filter((d) => d.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  function onFiles(files: FileList | null) {
    // Mock upload: records metadata only. Real build: presigned upload to object storage.
    for (const f of Array.from(files ?? [])) {
      addDocument({ name: f.name, category: uploadCategory, sizeKb: Math.max(1, Math.round(f.size / 1024)), ownerId: user.id, sharedWith: [] });
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <PageHeader
        title="Documents"
        description="Contracts, proposals, reports and training material"
        actions={
          <>
            <label>
              <span className="sr-only">Upload category</span>
              <Select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)} className="h-11 w-40 rounded-full">
                {Object.entries(CATEGORIES).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </Select>
            </label>
            <Button onClick={() => fileRef.current?.click()}><Upload className="size-4" /> Upload</Button>
            <input ref={fileRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          </>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.entries(CATEGORIES) as Array<[DocumentCategory, (typeof CATEGORIES)[DocumentCategory]]>).map(([key, c]) => {
          const Icon = c.icon;
          const active = category === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(active ? "all" : key)}
              className={cn("flex items-center gap-4 rounded-3xl p-5 text-left transition-colors", active ? "bg-mint" : "bg-surface hover:bg-surface-2")}
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-canvas"><Icon className="size-5 text-primary-ink" aria-hidden /></span>
              <span>
                <span className="block font-extrabold">{c.label}</span>
                <span className="block text-sm text-muted">{accessible.filter((d) => d.category === key).length} files</span>
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-extrabold">{category === "all" ? "Recent documents" : CATEGORIES[category].label}</h2>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search documents</span>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="rounded-full bg-canvas pl-11" />
          </label>
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No documents" description="Upload a file or change the filter." />
        ) : (
          <Table>
            <THead>
              <tr><Th>Name</Th><Th>Owner</Th><Th>Version</Th><Th>Updated</Th><Th>Shared</Th><Th className="text-right">Actions</Th></tr>
            </THead>
            <tbody>
              {shown.map((d) => {
                const Icon = CATEGORIES[d.category].icon;
                const owner = userById(users, d.ownerId);
                const canEdit = isAdmin(user.role) || d.ownerId === user.id;
                return (
                  <Tr key={d.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-canvas group-hover:bg-surface"><Icon className="size-4 text-primary-ink" aria-hidden /></span>
                        <span><span className="block font-bold">{d.name}</span><span className="block text-xs text-muted">{CATEGORIES[d.category].label} · {size(d.sizeKb)}</span></span>
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{owner?.name}</Td>
                    <Td>v{d.version}</Td>
                    <Td className="whitespace-nowrap text-muted">{formatDate(d.updatedAt)}</Td>
                    <Td>
                      <div className="flex -space-x-2">
                        {d.sharedWith.slice(0, 3).map((id) => <Avatar key={id} name={userById(users, id)?.name ?? "?"} size="sm" />)}
                        {d.sharedWith.length === 0 && <span className="text-xs text-muted">Private</span>}
                      </div>
                    </Td>
                    <Td>
                      {canEdit && (
                        <div className="flex justify-end gap-1">
                          <button type="button" aria-label={`Share ${d.name}`} onClick={() => setSharing(d)} className="flex size-9 items-center justify-center rounded-full hover:bg-surface-2"><Share2 className="size-4" /></button>
                          <button type="button" aria-label={`Delete ${d.name}`} onClick={() => confirm(`Delete ${d.name}?`) && deleteDocument(d.id)} className="flex size-9 items-center justify-center rounded-full text-red-700 hover:bg-red-50"><Trash2 className="size-4" /></button>
                        </div>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={sharing !== null} onClose={() => setSharing(null)} title={`Share ${sharing?.name ?? ""}`}>
        {sharing && <ShareForm doc={sharing} onDone={() => setSharing(null)} />}
      </Modal>
    </>
  );
}

function ShareForm({ doc, onDone }: { doc: DocumentFile; onDone: () => void }) {
  const users = useDb((s) => s.users);
  const shareDocument = useDb((s) => s.shareDocument);
  const [selected, setSelected] = useState<string[]>(doc.sharedWith);
  const candidates = users.filter((u) => u.id !== doc.ownerId && u.isActive);

  function save() {
    shareDocument(doc.id, selected);
    onDone();
  }

  return (
    <div className="space-y-4">
      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {candidates.map((u) => {
          const on = selected.includes(u.id);
          return (
            <li key={u.id}>
              <button type="button" aria-pressed={on} onClick={() => setSelected((s) => (on ? s.filter((x) => x !== u.id) : [...s, u.id]))} className={cn("flex w-full items-center gap-3 rounded-2xl p-2 text-left", on ? "bg-mint" : "hover:bg-surface")}>
                <Avatar name={u.name} size="sm" />
                <span className="text-sm font-bold">{u.name}</span>
                <span className="ml-auto text-xs text-muted">{u.company ?? u.position}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Button onClick={save} className="w-full justify-center">Save sharing</Button>
    </div>
  );
}
