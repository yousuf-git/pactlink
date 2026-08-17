import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Mail, Phone, Users, Search } from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/Shared";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { LoadingBlock, EmptyState } from "@/components/ui/Misc";
import { useAsync } from "@/hooks/useAsync";
import {
  listClients,
  listQuotes,
  createClient,
  updateClient,
  deleteClient,
} from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { clientSchema, type ClientInput } from "@/lib/schemas";
import type { Client } from "@/lib/types";

export default function Clients() {
  const { success, error } = useToast();
  const { data: clients, loading, reload } = useAsync(listClients, []);
  const { data: quotes } = useAsync(listQuotes, []);
  const [editing, setEditing] = useState<Client | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);
  const [query, setQuery] = useState("");

  const quoteCount = useMemo(() => {
    const c: Record<string, number> = {};
    for (const q of quotes ?? []) c[q.clientId] = (c[q.clientId] ?? 0) + 1;
    return c;
  }, [quotes]);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients ?? [];
    const t = query.toLowerCase();
    return (clients ?? []).filter(
      (c) =>
        c.name.toLowerCase().includes(t) ||
        c.email.toLowerCase().includes(t) ||
        (c.company ?? "").toLowerCase().includes(t)
    );
  }, [clients, query]);

  const doDelete = async () => {
    if (!confirmDelete) return;
    await deleteClient(confirmDelete._id);
    success("Client removed");
    setConfirmDelete(null);
    reload();
  };

  if (loading) return <LoadingBlock />;

  return (
    <>
      <PageHeader
        eyebrow="Clients"
        title="Clients"
        subtitle="The recipients of your quotes."
        action={
          <button onClick={() => setCreating(true)} className="group btn btn-solid btn-sm">
            <Plus size={16} /> Add client
          </button>
        }
      />

      {/* Search — sharp outlined field */}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          className="h-10 w-full rounded-none border border-ink/20 bg-surface pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="No clients yet"
          description="Add a client to start sending quotes."
          action={
            <button onClick={() => setCreating(true)} className="group btn btn-solid btn-sm">
              <Plus size={15} /> Add client
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const count = quoteCount[c._id] ?? 0;
            return (
              <Panel
                key={c._id}
                hover
                className="group p-5 transition-shadow hover:shadow-[0_14px_30px_-20px_rgba(22,24,28,0.28)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar — sharp ink square with initials */}
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-ink font-headline text-base font-bold text-paper">
                      {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-headline text-base font-semibold tracking-[-0.01em] text-ink">
                        {c.name}
                      </p>
                      {c.company && (
                        <p className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                          {c.company}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setEditing(c)}
                      className="rounded-none p-1.5 text-ink-faint transition-colors hover:bg-paper-dim hover:text-ink"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(c)}
                      className="rounded-none p-1.5 text-ink-faint transition-colors hover:bg-danger/[0.08] hover:text-danger"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <a
                    href={`mailto:${c.email}`}
                    className="flex items-center gap-2 truncate font-mono text-[12px] tracking-[0.01em] text-ink-soft transition-colors hover:text-ink"
                  >
                    <Mail size={13} className="shrink-0 text-ink-faint" /> {c.email}
                  </a>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="flex items-center gap-2 truncate font-mono text-[12px] tracking-[0.01em] text-ink-soft transition-colors hover:text-ink"
                    >
                      <Phone size={13} className="shrink-0 text-ink-faint" /> {c.phone}
                    </a>
                  )}
                </div>

                <div className="mt-4 border-t border-line pt-3">
                  <span className="inline-flex items-center border border-line bg-paper px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                    {count} quote{count === 1 ? "" : "s"}
                  </span>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Create / edit modal */}
      <ClientFormModal
        open={creating || !!editing}
        client={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          reload();
          setCreating(false);
          setEditing(null);
        }}
        onError={(m) => error("Couldn't save", m)}
        onSuccess={(m) => success(m)}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remove client?"
        size="sm"
        footer={
          <>
            <button className="group btn btn-outline btn-sm" onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
            <button
              className="btn btn-sm border border-danger bg-danger font-grotesk text-paper transition-colors hover:bg-danger/90"
              onClick={doDelete}
            >
              Remove
            </button>
          </>
        }
      >
        <p className="font-sans text-sm leading-relaxed text-ink-soft">
          Remove “{confirmDelete?.name}” from your client list? Their existing
          quotes are not deleted.
        </p>
      </Modal>
    </>
  );
}

function ClientFormModal({
  open,
  client,
  onClose,
  onSaved,
  onError,
  onSuccess,
}: {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
  onSuccess: (m: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    values: {
      name: client?.name ?? "",
      email: client?.email ?? "",
      company: client?.company ?? "",
      phone: client?.phone ?? "",
    },
  });

  const onSubmit = async (data: ClientInput) => {
    try {
      if (client) {
        await updateClient(client._id, data);
        onSuccess("Client updated");
      } else {
        await createClient(data);
        onSuccess("Client added");
      }
      reset();
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={client ? "Edit client" : "Add client"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Name" placeholder="Daniel Okonkwo" {...register("name")} error={errors.name?.message} />
        <Input label="Email" type="email" placeholder="daniel@harborviewcafe.com" {...register("email")} error={errors.email?.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Company (optional)" placeholder="Harborview Café" {...register("company")} error={errors.company?.message} />
          <Input label="Phone (optional)" placeholder="+1 (206) 555-0142" {...register("phone")} error={errors.phone?.message} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="group btn btn-outline btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="group btn btn-solid btn-sm">
            {client ? "Save changes" : "Add client"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
