import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Reorder, useDragControls } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  Tag,
  Layers,
  ArrowLeft,
  Save,
  FileDown,
  Check,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { PageHeader, Panel, CARD_SHADOW } from "@/components/dashboard/Shared";
import { Select } from "@/components/ui/Input";
import { SelectMenu } from "@/components/ui/SelectMenu";
import { LoadingBlock } from "@/components/ui/Misc";
import { Mark } from "@/components/ui/Logo";
import { useQuoteBuilder, selectTotals } from "@/store/quoteBuilder";
import { useAsync } from "@/hooks/useAsync";
import { listClients, createQuote, updateQuote, getQuote } from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { openQuotePrintView } from "@/lib/printQuote";
import { quoteBuilderSchema } from "@/lib/schemas";
import { cn, formatMoney } from "@/lib/utils";
import type { LineItem, LineItemType } from "@/lib/types";

export default function QuoteBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = !!id;
  const { success, error } = useToast();
  const { user } = useAuth();
  const { data: clients } = useAsync(listClients, []);

  const businessName = user?.brand.businessName || "Your business";

  const state = useQuoteBuilder();
  const [saving, setSaving] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(editing);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing quote into the store when editing; reset on unmount.
  useEffect(() => {
    if (editing && id) {
      getQuote(id)
        .then((q) => state.loadFromQuote(q))
        .catch(() => error("Couldn't load quote"))
        .finally(() => setLoadingQuote(false));
    } else {
      state.reset();
    }
    return () => state.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Derive totals from the store (memoized over the deps that affect them).
  const totals = useMemo(
    () => selectTotals(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.lineItems, state.depositType, state.depositValue]
  );

  const tierGroups = useMemo(() => {
    const set = new Set<string>();
    for (const li of state.lineItems) if (li.tierGroup) set.add(li.tierGroup);
    return [...set];
  }, [state.lineItems]);

  // Preview projection: standard + optional items in order, with each tierGroup
  // collapsed into a single block of its member options (client picks one).
  const previewBlocks = useMemo(() => {
    type Block =
      | { kind: "item"; item: LineItem }
      | { kind: "tier"; group: string; items: LineItem[] };
    const blocks: Block[] = [];
    const seen = new Set<string>();
    for (const li of state.lineItems) {
      if (li.type === "tiered" && li.tierGroup) {
        if (seen.has(li.tierGroup)) continue;
        seen.add(li.tierGroup);
        blocks.push({
          kind: "tier",
          group: li.tierGroup,
          items: state.lineItems.filter(
            (x) => x.type === "tiered" && x.tierGroup === li.tierGroup
          ),
        });
      } else {
        blocks.push({ kind: "item", item: li });
      }
    }
    return blocks;
  }, [state.lineItems]);

  const validateAndSave = async () => {
    const payload = {
      title: state.title,
      clientId: state.clientId,
      currency: state.currency,
      depositType: state.depositType,
      depositValue: state.depositValue,
      lineItems: state.lineItems,
    };
    const result = quoteBuilderSchema.safeParse(payload);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        errs[issue.path.join(".") || "form"] = issue.message;
      }
      setErrors(errs);
      error("Check the form", result.error.issues[0]?.message);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (editing && id) {
        await updateQuote(id, result.data);
        success("Quote updated");
      } else {
        await createQuote(result.data);
        success("Quote created", "Saved as a draft.");
      }
      navigate("/dashboard/quotes");
    } catch (e) {
      error("Couldn't save", e instanceof Error ? e.message : "");
    } finally {
      setSaving(false);
    }
  };

  const selectedClient = (clients ?? []).find((c) => c._id === state.clientId);

  const openPdf = () => {
    openQuotePrintView({
      title: state.title || "Untitled quote",
      businessName,
      clientName: selectedClient?.name,
      currency: state.currency,
      lineItems: state.lineItems,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      total: totals.total,
      depositAmount: totals.depositAmount,
      balanceAmount: totals.balanceAmount,
    });
  };

  if (loadingQuote) return <LoadingBlock label="Loading quote…" />;

  return (
    <>
      <button
        onClick={() => navigate("/dashboard/quotes")}
        className="mb-5 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink"
      >
        <ArrowLeft size={14} /> Back to quotes
      </button>

      <PageHeader
        eyebrow={editing ? "Edit quote" : "New quote"}
        title={editing ? "Edit quote" : "New quote"}
        subtitle="Add line items, tax, and optional or tiered choices the client can toggle."
        action={
          <button onClick={validateAndSave} disabled={saving} className="group btn btn-solid btn-sm">
            <Save size={15} /> {editing ? "Save changes" : "Save draft"}
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* ── Form pane ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Title + client */}
          <Panel className="p-6">
            <SectionLabel>Quote details</SectionLabel>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field label="Quote title" error={errors.title}>
                <input
                  placeholder="Kitchen Remodel"
                  value={state.title}
                  onChange={(e) => state.setField("title", e.target.value)}
                  aria-invalid={!!errors.title}
                  className={fieldClass}
                />
              </Field>
              <Field label="Client" error={errors.clientId}>
                <Select
                  value={state.clientId}
                  onChange={(e) => state.setField("clientId", e.target.value)}
                  aria-invalid={!!errors.clientId}
                  className={cn(selectClass, errors.clientId && "border-danger")}
                >
                  <option value="">Select a client…</option>
                  {(clients ?? []).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                      {c.company ? ` · ${c.company}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Panel>

          {/* Line items */}
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
              <h3 className="font-headline text-lg font-bold tracking-[-0.01em] text-ink">
                Line items
              </h3>
              <div className="flex flex-wrap gap-2">
                <AddButton icon={<Plus size={13} />} onClick={() => state.addLineItem("standard")}>
                  Item
                </AddButton>
                <AddButton icon={<Tag size={13} />} onClick={() => state.addLineItem("optional")}>
                  Optional
                </AddButton>
                <AddButton icon={<Layers size={13} />} onClick={() => state.addLineItem("tiered")}>
                  Tiered
                </AddButton>
              </div>
            </div>

            {errors.lineItems && (
              <p className="border-b border-line px-6 pt-3 pb-3 font-mono text-[11px] tracking-[0.02em] text-danger">
                {errors.lineItems}
              </p>
            )}

            {state.lineItems.length === 0 ? (
              <EmptyItems
                onAdd={state.addLineItem}
              />
            ) : (
              <Reorder.Group
                axis="y"
                values={state.lineItems}
                onReorder={state.setLineItems}
                className="divide-y divide-line"
              >
                {state.lineItems.map((li, i) => {
                  const tieredRun =
                    li.type === "tiered" && !!li.tierGroup
                      ? {
                          first:
                            i === 0 ||
                            state.lineItems[i - 1]?.tierGroup !== li.tierGroup,
                          last:
                            i === state.lineItems.length - 1 ||
                            state.lineItems[i + 1]?.tierGroup !== li.tierGroup,
                        }
                      : null;
                  return (
                    <LineItemRow
                      key={li._id}
                      item={li}
                      currency={state.currency}
                      tieredRun={tieredRun}
                      onUpdate={(patch) => state.updateLineItem(li._id, patch)}
                      onRemove={() => state.removeLineItem(li._id)}
                    />
                  );
                })}
              </Reorder.Group>
            )}

            {/* Always-available "add more" affordance below the list */}
            <div className="border-t border-line px-6 py-4">
              <button
                onClick={() => state.addLineItem("standard")}
                className="btn btn-outline btn-sm w-full justify-center"
              >
                <Plus size={14} /> Add item
              </button>
            </div>
          </Panel>

          {/* Deposit config */}
          <Panel className="p-6">
            <SectionLabel>Deposit</SectionLabel>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field label="Deposit type">
                <SelectMenu
                  value={DEPOSIT_LABELS[state.depositType]}
                  options={Object.values(DEPOSIT_LABELS)}
                  onChange={(label) =>
                    state.setDeposit(labelToDepositType(label), state.depositValue)
                  }
                />
              </Field>
              {state.depositType === "percent" ? (
                <Field label="Percent" hint="0–100">
                  <input
                    type="number"
                    value={state.depositValue}
                    onChange={(e) => state.setDeposit("percent", Number(e.target.value))}
                    className={cn(fieldClass, "text-right font-mono tabular-nums")}
                  />
                </Field>
              ) : (
                <Field label="Fixed amount">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-faint">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={(state.depositValue / 100).toString()}
                      onChange={(e) =>
                        state.setDeposit("fixed", Math.round(Number(e.target.value || 0) * 100))
                      }
                      className={cn(fieldClass, "pl-7 text-right font-mono tabular-nums")}
                    />
                  </div>
                </Field>
              )}
            </div>
            {tierGroups.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  Tier groups
                </span>
                {tierGroups.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center border border-glow/50 bg-glow/[0.06] px-2 py-0.5 font-mono text-[11px] lowercase tracking-[0.04em] text-[#8a6a2e]"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* ── Live preview pane (faithful client-approval card) ──────── */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          <div className="mb-3 flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              Live client preview
            </span>
            <span className="inline-flex items-center gap-1.5 border border-glow/50 bg-glow/[0.06] px-2 py-0.5 font-mono text-[10px] lowercase tracking-[0.04em] text-[#8a6a2e]">
              <span className="h-1.5 w-1.5 rounded-full bg-glow" />
              recomputed live
            </span>
          </div>

          <div className="border border-line bg-paper" style={{ boxShadow: CARD_SHADOW }}>
            {/* Editorial ink-slab header — mirrors the hosted approval page */}
            <header className="relative isolate overflow-hidden bg-ink px-5 py-5 text-paper">
              <div className="pointer-events-none absolute inset-0 ink-panel-grid opacity-60" />
              <div className="relative flex items-center gap-3">
                <Mark size={32} tone="paper" />
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55">Quote from</p>
                  <p className="truncate font-headline text-base font-semibold leading-tight text-paper">
                    {businessName}
                  </p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1.5 border border-paper/25 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-paper/70">
                  <ShieldCheck size={11} /> Secure approval
                </span>
              </div>
            </header>

            {/* The quote "paper" */}
            <div className="px-5 py-5">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
                Prepared for {selectedClient?.name ?? "your client"}
              </p>
              <h2 className="mt-1.5 font-headline text-xl font-bold tracking-[-0.02em] text-ink">
                {state.title || "Untitled quote"}
              </h2>

              <div className="mt-4 space-y-2">
                {previewBlocks.map((block) =>
                  block.kind === "tier" ? (
                    <PreviewTierGroup
                      key={`tier:${block.group}`}
                      group={block.group}
                      items={block.items}
                      currency={state.currency}
                      onSelect={(id) => state.selectTier(block.group, id)}
                    />
                  ) : (
                    <PreviewLineItem
                      key={block.item._id}
                      item={block.item}
                      currency={state.currency}
                      onToggle={() => state.toggleSelected(block.item._id)}
                    />
                  )
                )}
              </div>

              <div className="mt-4 space-y-2 border-t border-line pt-4">
                <PreviewRow label="Subtotal" value={formatMoney(totals.subtotal, state.currency)} muted />
                <PreviewRow label="Tax" value={formatMoney(totals.taxTotal, state.currency)} muted />
                <PreviewRow label="Total" value={formatMoney(totals.total, state.currency)} bold />
              </div>

              {/* Deposit highlight — the single permitted glow accent */}
              <div className="mt-4 border border-glow/40 bg-glow/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a6a2e]">
                    Deposit due today (
                    {state.depositType === "percent" ? `${state.depositValue}%` : "fixed"})
                  </span>
                  <span className="font-headline text-2xl font-bold tabular-nums text-ink">
                    {formatMoney(totals.depositAmount, state.currency)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                  Balance {formatMoney(totals.balanceAmount, state.currency)} invoiced after.
                </p>
              </div>

              <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                <Lock size={10} /> Totals recomputed and verified on the server.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-line p-4">
              <button onClick={validateAndSave} disabled={saving} className="group btn btn-solid btn-sm flex-1">
                <Save size={15} /> {editing ? "Save changes" : "Save draft"}
              </button>
              <button
                className="btn btn-outline btn-sm"
                title="PDF preview"
                onClick={openPdf}
              >
                <FileDown size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Shared field primitives (outlined sharp ink, mono uppercase labels) ─────
const fieldClass =
  "h-10 w-full border border-ink/20 bg-surface px-3 text-sm text-ink placeholder:text-ink-faint/70 transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink aria-[invalid=true]:border-danger";

const selectClass =
  "h-10 w-full rounded-none border-ink/20 bg-surface px-3 text-sm text-ink focus:border-ink focus:ring-1 focus:ring-ink";

// Deposit type ↔ human label mapping for the custom SelectMenu (string-based).
const DEPOSIT_LABELS: Record<"percent" | "fixed", string> = {
  percent: "Percentage of total",
  fixed: "Fixed amount",
};
function labelToDepositType(label: string): "percent" | "fixed" {
  return label === DEPOSIT_LABELS.fixed ? "fixed" : "percent";
}

// ── Empty state for the line-items area ─────────────────────────────────────
function EmptyItems({ onAdd }: { onAdd: (type: LineItemType) => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center border border-line text-ink-faint">
        <Plus size={20} />
      </span>
      <p className="mt-4 font-headline text-base font-bold tracking-[-0.01em] text-ink">
        Add your first item
      </p>
      <p className="mt-1 max-w-xs font-sans text-[13px] text-ink-soft">
        Build the quote line by line. Mark items optional or tiered to let the
        client choose what they want.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <AddButton icon={<Plus size={13} />} onClick={() => onAdd("standard")}>
          Item
        </AddButton>
        <AddButton icon={<Tag size={13} />} onClick={() => onAdd("optional")}>
          Optional
        </AddButton>
        <AddButton icon={<Layers size={13} />} onClick={() => onAdd("tiered")}>
          Tiered
        </AddButton>
      </div>
    </div>
  );
}

// ── A single draggable, editable line-item row (builder) ────────────────────
function LineItemRow({
  item: li,
  currency,
  tieredRun,
  onUpdate,
  onRemove,
}: {
  item: LineItem;
  currency: string;
  tieredRun: { first: boolean; last: boolean } | null;
  onUpdate: (patch: Partial<LineItem>) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={li}
      dragListener={false}
      dragControls={controls}
      className={cn(
        "bg-paper px-6 py-5",
        // Visually bind tiered rows of the same group into one bordered block.
        tieredRun && "mx-6 border-x border-glow/40 bg-glow/[0.04] px-4",
        tieredRun?.first && "mt-2 border-t",
        tieredRun?.last && "mb-2 border-b"
      )}
    >
      {tieredRun?.first && (
        <div className="-mt-1 mb-3 flex items-center gap-2">
          <Layers size={12} className="text-[#8a6a2e]" />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6a2e]">
            Tier group · client picks one
          </span>
        </div>
      )}
      <div className="flex items-start gap-2.5">
        <GripVertical
          size={16}
          onPointerDown={(e) => controls.start(e)}
          className="mt-2.5 shrink-0 cursor-grab text-ink-faint/60 transition-colors hover:text-ink active:cursor-grabbing"
          aria-label="Drag to reorder"
        />
        <div className="flex-1 space-y-3.5">
          <div className="flex items-center gap-2.5">
            <input
              value={li.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="Item name"
              className={cn(fieldClass, "flex-1 font-medium")}
            />
            <TypeBadge type={li.type} />
            <button
              onClick={onRemove}
              className="border border-transparent p-2 text-ink-faint transition-colors hover:border-danger/30 hover:text-danger"
              aria-label="Remove"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <input
            value={li.description ?? ""}
            onChange={(e) => onUpdate({ description: e.target.value || null })}
            placeholder="Description (optional)"
            className={cn(fieldClass, "h-9 text-[13px] text-ink-soft")}
          />

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <NumField label="Qty" value={li.qty} onChange={(v) => onUpdate({ qty: v })} />
            <MoneyField
              label="Unit price"
              minor={li.unitPrice}
              onChange={(v) => onUpdate({ unitPrice: v })}
            />
            <NumField
              label="Tax %"
              value={li.taxRate}
              step={0.25}
              onChange={(v) => onUpdate({ taxRate: v })}
            />
            <div>
              <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Line total
              </span>
              <div className="flex h-10 items-center justify-end border border-line bg-paper-dim/50 px-3 font-mono text-sm tabular-nums text-ink">
                {formatMoney(li.qty * li.unitPrice, currency)}
              </div>
            </div>
          </div>

          {li.type === "tiered" && (
            <Field
              label="Tier group"
              hint="Rows sharing this exact name become one mutually-exclusive group."
            >
              <input
                value={li.tierGroup ?? ""}
                onChange={(e) => onUpdate({ tierGroup: e.target.value })}
                className={cn(fieldClass, "font-mono")}
              />
            </Field>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
}

// ── Preview: a standard/optional item the client sees ───────────────────────
function PreviewLineItem({
  item: li,
  currency,
  onToggle,
}: {
  item: LineItem;
  currency: string;
  onToggle: () => void;
}) {
  const on = li.selected;
  const optional = li.type === "optional";
  const Wrapper = optional ? "button" : "div";
  return (
    <Wrapper
      {...(optional ? { type: "button" as const, onClick: onToggle } : {})}
      className={cn(
        "flex w-full items-start justify-between gap-3 py-2.5 text-left",
        optional && "transition-colors"
      )}
    >
      <span className="flex min-w-0 items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border",
            on ? "border-ink bg-ink text-paper" : "border-line text-transparent",
            optional && "cursor-pointer"
          )}
        >
          <Check size={10} strokeWidth={3} />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={cn("text-sm font-medium", on ? "text-ink" : "text-ink-faint line-through")}>
              {li.label || "Untitled item"}
            </span>
            {optional && (
              <span className="inline-flex items-center border border-glow/50 bg-glow/[0.06] px-1.5 font-mono text-[9px] lowercase tracking-[0.04em] text-[#8a6a2e]">
                optional
              </span>
            )}
          </span>
          {li.description && (
            <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">
              {li.description}
            </span>
          )}
          <span className="mt-0.5 block font-mono text-[10px] text-ink-faint">
            {li.qty} × {formatMoney(li.unitPrice, currency)}
            {li.taxRate > 0 && ` · ${li.taxRate}% tax`}
          </span>
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 font-mono text-sm tabular-nums",
          on ? "text-ink" : "text-ink-faint line-through"
        )}
      >
        {formatMoney(li.qty * li.unitPrice, currency)}
      </span>
    </Wrapper>
  );
}

// ── Preview: a tier group rendered as radio-style exclusive options ─────────
function PreviewTierGroup({
  group,
  items,
  currency,
  onSelect,
}: {
  group: string;
  items: LineItem[];
  currency: string;
  onSelect: (id: string) => void;
}) {
  const none = !items.some((li) => li.selected);
  return (
    <div className="my-3 border border-line bg-paper-dim/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a6a2e]">
          <Layers size={11} /> {group}
        </span>
        <span
          className={cn(
            "font-mono text-[9px] uppercase tracking-[0.12em]",
            none ? "text-danger" : "text-ink-faint"
          )}
        >
          Choose one
        </span>
      </div>
      <div className="mt-2 space-y-1">
        {items.map((li) => {
          const on = li.selected;
          return (
            <button
              key={li._id}
              type="button"
              onClick={() => onSelect(li._id)}
              className="flex w-full items-start justify-between gap-3 border border-transparent px-1.5 py-1.5 text-left transition-colors hover:border-line"
            >
              <span className="flex min-w-0 items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    on ? "border-ink" : "border-line"
                  )}
                >
                  {on && <span className="h-2 w-2 rounded-full bg-ink" />}
                </span>
                <span className="min-w-0">
                  <span className={cn("text-sm font-medium", on ? "text-ink" : "text-ink-soft")}>
                    {li.label || "Untitled tier"}
                  </span>
                  {li.description && (
                    <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">
                      {li.description}
                    </span>
                  )}
                  <span className="mt-0.5 block font-mono text-[10px] text-ink-faint">
                    {li.qty} × {formatMoney(li.unitPrice, currency)}
                    {li.taxRate > 0 && ` · ${li.taxRate}% tax`}
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 font-mono text-sm tabular-nums",
                  on ? "text-ink" : "text-ink-faint"
                )}
              >
                {formatMoney(li.qty * li.unitPrice, currency)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
      {children}
    </span>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block font-mono text-[11px] tracking-[0.02em] text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">{hint}</span>
      ) : null}
    </label>
  );
}

function AddButton({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="btn btn-outline btn-sm">
      {icon}
      {children}
    </button>
  );
}

function TypeBadge({ type }: { type: LineItemType }) {
  if (type === "standard") return null;
  return (
    <span className="inline-flex shrink-0 items-center border border-glow/50 bg-glow/[0.06] px-2 py-0.5 font-mono text-[10px] lowercase tracking-[0.04em] text-[#8a6a2e]">
      {type === "optional" ? "optional" : "tiered"}
    </span>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{label}</span>
      <input
        type="number"
        step={step}
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(fieldClass, "text-right font-mono tabular-nums")}
      />
    </label>
  );
}

function MoneyField({
  label,
  minor,
  onChange,
}: {
  label: string;
  minor: number;
  onChange: (minor: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-faint">$</span>
        <input
          type="number"
          step={0.01}
          min={0}
          value={(minor / 100).toString()}
          onChange={(e) => onChange(Math.round(Number(e.target.value || 0) * 100))}
          className={cn(fieldClass, "pl-6 pr-2 text-right font-mono tabular-nums")}
        />
      </div>
    </label>
  );
}

function PreviewRow({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={cn(
          bold ? "font-headline text-base font-bold text-ink" : "text-sm",
          muted && "text-ink-soft"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular-nums",
          bold ? "text-base font-bold text-ink" : "text-sm",
          muted ? "text-ink-soft" : "text-ink"
        )}
      >
        {value}
      </span>
    </div>
  );
}
