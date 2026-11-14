"use client";

import { useMemo } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useQuery } from "@tanstack/react-query";
import { SelectButton } from "primereact/selectbutton";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import type Highcharts from "highcharts";
import BaseChart from "@/components/common/charts/BaseChart";
import { ChartCard, KpiCard, OpenLink } from "@/components/dashboard/insights/parts";
import PeriodPicker from "@/components/dashboard/insights/PeriodPicker";
import FiltersButton, { describeFilters } from "@/components/dashboard/filters/FiltersButton";
import { ORDER_FILTER_KEYS, PRODUCT_LABEL_KEY, useOrderItemGroup, useOrderStatusGroup } from "@/components/dashboard/admin/orderFilters";
import { PeekLink } from "@/components/dashboard/records/peek";
import { PageHeader } from "@/components/dashboard/ui";
import { adminApi } from "@/services/admin";
import { businessNow, shortDate, ugx, ugxShort } from "@/lib/format";
import { periodLabel } from "@/lib/period";

type Preset = "all" | "today" | "month" | "year" | "30d";

const PRESETS: { label: string; value: Preset }[] = [
  { label: "All time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 30 days", value: "30d" },
  { label: "This month", value: "month" },
  { label: "This year", value: "year" },
];

function rangeOf(preset: Preset): { from?: string; to?: string } {
  const t = businessNow().startOf("day");
  const iso = (d: typeof t) => d.toISODate() ?? undefined;
  switch (preset) {
    case "today": return { from: iso(t), to: iso(t) };
    case "30d": return { from: iso(t.minus({ days: 29 })), to: iso(t) };
    case "month": return { from: iso(t.startOf("month")), to: iso(t) };
    case "year": return { from: iso(t.startOf("year")), to: iso(t) };
    default: return {};
  }
}

const METHOD_LABEL: Record<string, string> = {
  mtn_mobile_money: "MTN MoMo",
  airtel_mobile_money: "Airtel Money",
  cash: "Cash",
  bank: "Bank",
};

/** The URL keys the Filters dialog writes: the order filters and the product's name for its chip. */
const FILTER_URL_KEYS = [...ORDER_FILTER_KEYS, PRODUCT_LABEL_KEY];

/** Said under a card's (i) when an order filter is in force and the card does not follow it. */
const NOT_FILTERED = "\n\nThe product and order filters do not change this card: it follows the period only.";

/**
 * The dashboard: All time by default, so it is never empty for want of a recent order (the old one forced the
 * last 30 days and showed zeros). The period and the filters live in the URL, so a reload or Back keeps them.
 * Every figure opens the list it counts, filtered the same way (the arrow at its corner), and says how it is
 * worked out behind its (i) (NICE's help overlays, the user, 14 Nov 2026).
 */
export default function DashboardHome() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const itemGroup = useOrderItemGroup();
  const statusGroup = useOrderStatusGroup();
  const filterGroups = [itemGroup, statusGroup];

  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  const preset = (params.get("preset") as Preset | null) ?? (from || to ? null : "all");
  const filters = Object.fromEntries(FILTER_URL_KEYS.map((k) => [k, params.get(k) ?? ""]));
  const filtersKey = JSON.stringify(filters);
  const filterText = describeFilters(filterGroups, filters);

  /** The address with the period and filters given, the rest kept. */
  const push = (next: { preset?: Preset | null; from?: string; to?: string; filters?: Record<string, string> }) => {
    const q = new URLSearchParams();
    const p = next.preset === undefined ? preset : next.preset;
    if (p && p !== "all") q.set("preset", p);
    const range = next.preset ? rangeOf(next.preset) : next.preset === null ? { from: next.from, to: next.to } : { from, to };
    if (range.from) q.set("from", range.from);
    if (range.to) q.set("to", range.to);
    Object.entries(next.filters ?? filters).forEach(([k, v]) => v && q.set(k, v));
    const qs = q.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const apiFilters = Object.fromEntries(ORDER_FILTER_KEYS.map((k) => [k, filters[k] || undefined]));
  const query = useQuery({
    queryKey: ["dashboard", from ?? "", to ?? "", filtersKey],
    queryFn: () => adminApi.dashboard({ from, to, ...apiFilters }),
    placeholderData: (previous) => previous,
  });
  const d = query.data;
  const loading = query.isPending;
  const refreshing = query.isPlaceholderData;
  const filtered = !!filterText;

  const periodText = from && to ? periodLabel(from, to) : "All time";
  const allTime = !from && !to;
  /**
   * The lists' own filters, so an arrow opens exactly the rows a figure counts. `orders`: the order filters go
   * too (Orders and Order payments take them); packages and customers follow the period only.
   */
  const listQuery = (extra: Record<string, string> = {}, orders = false) => {
    const q = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}), ...extra });
    if (orders) FILTER_URL_KEYS.forEach((k) => filters[k] && q.set(k, filters[k]));
    const s = q.toString();
    return s ? `?${s}` : "";
  };
  const exportSubtitle = [periodText, filterText].filter(Boolean).join(" · ");

  const monthly: Highcharts.Options = useMemo(() => ({
    chart: { type: "column" },
    xAxis: { categories: (d?.monthly ?? []).map((m) => m.month) },
    yAxis: [
      { title: { text: "Orders" }, allowDecimals: false },
      { title: { text: "UGX" }, opposite: true, labels: { formatter() { return ugxShort(Number(this.value)); } } },
    ],
    tooltip: { shared: true },
    series: [
      { type: "column", name: "Orders", data: (d?.monthly ?? []).map((m) => m.orders) },
      { type: "spline", name: "Value (UGX)", yAxis: 1, data: (d?.monthly ?? []).map((m) => m.value), tooltip: { valuePrefix: "UGX " } },
      { type: "spline", name: "Paid (UGX)", yAxis: 1, data: (d?.monthly ?? []).map((m) => m.paid), tooltip: { valuePrefix: "UGX " }, dashStyle: "ShortDash" },
    ],
  }), [d?.monthly]);

  const methods: Highcharts.Options = useMemo(() => ({
    chart: { type: "pie" },
    plotOptions: { pie: { innerSize: "60%", dataLabels: { enabled: true, format: "{point.name}: {point.percentage:.0f}%" } } },
    tooltip: { pointFormat: "<b>UGX {point.y:,.0f}</b> ({point.count} payments)" },
    series: [{ type: "pie", name: "Received", data: (d?.payments.by_method ?? []).map((m) => ({ name: METHOD_LABEL[m.method] ?? m.method, y: m.amount, count: m.count })) }],
  }), [d?.payments.by_method]);

  const topProducts: Highcharts.Options = useMemo(() => ({
    chart: { type: "bar" },
    xAxis: { categories: (d?.top_products ?? []).map((p) => p.name) },
    yAxis: { title: { text: "UGX" }, labels: { formatter() { return ugxShort(Number(this.value)); } } },
    legend: { enabled: false },
    tooltip: { formatter() { const p = d?.top_products[this.index]; return p ? `<b>${p.name}</b><br/>${ugx(p.value)} · ${p.quantity} sold` : ""; } },
    series: [{ type: "bar", name: "Sales", data: (d?.top_products ?? []).map((p) => p.value) }],
  }), [d?.top_products]);

  const delivery: Highcharts.Options = useMemo(() => ({
    chart: { type: "column" },
    xAxis: { categories: Object.keys(d?.orders.by_delivery ?? {}).map((k) => k || "not set") },
    yAxis: { title: { text: "Orders" }, allowDecimals: false },
    legend: { enabled: false },
    series: [{ type: "column", name: "Orders", colorByPoint: true, data: Object.values(d?.orders.by_delivery ?? {}) }],
  }), [d?.orders.by_delivery]);

  const productsHref = `/dashboard/products${(() => {
    const q = new URLSearchParams();
    if (filters.inventory_type) q.set("inventory_types_id", filters.inventory_type);
    if (filters.electronic_category) q.set("electronic_category_id", filters.electronic_category);
    const s = q.toString();
    return s ? `?${s}` : "";
  })()}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle={d?.data_range.last_order ? `Orders from ${shortDate(d.data_range.first_order)} to ${shortDate(d.data_range.last_order)}.` : undefined}
      />

      <div className="flex flex-wrap items-center gap-2">
        {/* Buttons from a tablet up; on a phone five buttons wrap into a jumble, so a dropdown.
            The hiding is on wrappers: PrimeReact's own display rule beats a class on the component. */}
        <div className="hidden md:block">
          <SelectButton
            value={preset}
            options={PRESETS}
            optionLabel="label"
            optionValue="value"
            allowEmpty={false}
            onChange={(e) => e.value && push({ preset: e.value })}
            aria-label="Period"
          />
        </div>
        {/* A row of its own on a phone, so "All time" is never cut to "All ti..."; Filters and Pick days go under it. */}
        <div className="w-full md:hidden">
          <Dropdown
            value={preset}
            options={preset ? PRESETS : [...PRESETS, { label: "Picked days", value: null as unknown as Preset }]}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => e.value && push({ preset: e.value })}
            aria-label="Period"
            className="w-full"
          />
        </div>
        {refreshing && <span className="inline-flex items-center gap-1 text-xs font-medium text-(--brand-ink)"><i className="pi pi-spin pi-spinner text-xs" /> Updating</span>}
        {/* Narrowing tools at the far right (the user, 14 Nov 2026): what the figures count, then which days. */}
        <div className="ml-auto flex items-center gap-2">
          <FiltersButton
            title="Filter the dashboard"
            groups={filterGroups}
            values={filters}
            chips={false}
            onApply={(v) => push({ filters: Object.fromEntries(FILTER_URL_KEYS.map((k) => [k, v[k] ?? ""])) })}
          />
          <PeriodPicker from={from ?? ""} to={to ?? ""} custom={!preset} onApply={(r) => push({ preset: null, ...r })} />
        </div>
      </div>

      {/* What the figures are narrowed to, in words, with a way back to everything. */}
      {(from || filtered) && (
        <div className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--text-secondary)">
          {from && to && <span className="inline-flex items-center gap-1.5"><i className="pi pi-calendar text-xs text-(--text-muted)" aria-hidden />{periodText}</span>}
          {filtered && (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <i className="pi pi-filter text-xs text-(--text-muted)" aria-hidden />
              Orders with <b className="font-semibold text-(--text-primary)">{filterText}</b>
              <Button label="Clear" icon="pi pi-times" text size="small" className="py-0!" onClick={() => push({ filters: {} })} />
            </span>
          )}
        </div>
      )}

      <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${refreshing ? "opacity-60" : ""}`}>
        <KpiCard label="Orders" icon="pi-shopping-cart" loading={loading} value={d?.orders.count} hint={d ? `${d.orders.cancelled} cancelled` : undefined}
          href={`/dashboard/orders${listQuery({}, true)}`}
          help={"Every order placed in the period, cancelled ones included (the line under it says how many).\n\n- Placed: when the customer sent it from the app, in Kampala time.\n- Filters: an order counts when any of its items is the product or kind picked."} />
        <KpiCard label="Order value" icon="pi-wallet" loading={loading} value={d?.orders.value} shown={d ? ugx(d.orders.value) : undefined}
          hint={d ? `${ugx(d.orders.paid)} paid` : undefined} bar={d && d.orders.value ? (d.orders.paid / d.orders.value) * 100 : null}
          href={`/dashboard/orders${listQuery({}, true)}`} openLabel="the orders"
          help={"What the period's orders were charged, cancelled orders left out.\n\n- Paid: what has been recorded against those orders so far.\n- The bar: the share of the value already paid."} />
        <KpiCard label="Balance due" icon="pi-exclamation-circle" loading={loading} value={d?.orders.balance_due} shown={d ? ugx(d.orders.balance_due) : undefined}
          hint={d ? `${d.orders.with_balance} orders still owe` : undefined} href={`/dashboard/orders${listQuery({ has_balance: "1" }, true)}`} openLabel="orders with a balance"
          help={"What customers still owe on the period's orders: charged minus paid, on orders not cancelled.\n\nThe arrow opens those orders (Balance: Still owes)."} />
        <KpiCard label="Order payments" icon="pi-money-bill" loading={loading} value={d?.payments.amount} shown={d ? ugx(d.payments.amount) : undefined}
          hint={d ? `${d.payments.count.toLocaleString("en-UG")} payments` : undefined} href={`/dashboard/payments${listQuery({}, true)}`} openLabel="the order payments"
          help={"Money received for orders in the period: every payment recorded, by the day it was recorded (not the day of the order).\n\n- Filters: payments on orders that match them."} />
        <KpiCard label="Packages" icon="pi-truck" loading={loading} value={d?.packages.count} hint={d ? `${ugx(d.packages.value)} charged` : undefined}
          href={`/dashboard/packages${listQuery()}`}
          help={`Package deliveries booked in the app in the period, cancelled ones included; the charge leaves cancelled ones out.${filtered ? NOT_FILTERED : ""}`} />
        <KpiCard label="Package balance" icon="pi-clock" loading={loading} value={d?.packages.balance_due} shown={d ? ugx(d.packages.balance_due) : undefined}
          hint={d ? `${d.packages.with_balance} packages still owe` : undefined} href={`/dashboard/packages${listQuery({ has_balance: "1" })}`} openLabel="packages with a balance"
          help={`What customers still owe on the period's packages: charged minus paid, cancelled ones left out.${filtered ? NOT_FILTERED : ""}`} />
        <KpiCard label="Package payments" icon="pi-credit-card" loading={loading} value={d?.package_payments.amount} shown={d ? ugx(d.package_payments.amount) : undefined}
          hint={d ? `${d.package_payments.count.toLocaleString("en-UG")} payments` : undefined} href={`/dashboard/package-payments${listQuery()}`} openLabel="the package payments"
          help={`Money received for package deliveries in the period, by the day it was recorded.${filtered ? NOT_FILTERED : ""}`} />
        <KpiCard label={allTime ? "Customers" : "New customers"} icon="pi-user-plus" loading={loading} value={allTime ? d?.customers.total : d?.customers.new}
          hint={d ? (allTime ? "Everyone who signed up in the app" : `${d.customers.total.toLocaleString("en-UG")} customers in all`) : undefined}
          href={`/dashboard/users${listQuery({ role: "Customer" })}`} openLabel={allTime ? "the customers" : "the new customers"}
          help={`Accounts with the Customer role${allTime ? "" : " that signed up in the period (their Joined day)"}. Staff accounts are not counted.\n\n- All time: every customer, so the arrow opens them all.\n- A period: only those who joined in it; the arrow opens Customers with the same Joined days.${filtered ? NOT_FILTERED : ""}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Orders by month" subtitle="Cancelled orders left out. Months in Kampala time." loading={loading} refreshing={refreshing} error={query.isError} empty={!d?.monthly.length}
          href={`/dashboard/orders${listQuery({}, true)}`} openLabel="the orders"
          help="Bars: how many orders were placed each month. Lines: what they were charged and what has been paid on them so far.">
          <BaseChart options={monthly} height={300} exportTitle="Orders by month" exportSubtitle={exportSubtitle} />
        </ChartCard>
        <ChartCard title="Order payments by method" loading={loading} refreshing={refreshing} error={query.isError} empty={!d?.payments.by_method.length}
          href={`/dashboard/payments${listQuery({}, true)}`} openLabel="the order payments"
          help="How the period's order payments were made, by the amount received. Hover a slice for how many payments.">
          <BaseChart options={methods} height={300} exportTitle="Order payments by method" exportSubtitle={exportSubtitle} />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Top products" subtitle="By value sold" loading={loading} refreshing={refreshing} error={query.isError} empty={!d?.top_products.length}
          href={productsHref} openLabel="the products"
          help="The five products that sold for the most in the period: price times quantity on orders not cancelled. With a product or a kind picked, only those products.">
          <BaseChart options={topProducts} height={280} exportTitle="Top products" exportSubtitle={exportSubtitle} />
        </ChartCard>
        <ChartCard title="Orders by delivery" loading={loading} refreshing={refreshing} error={query.isError} empty={!Object.keys(d?.orders.by_delivery ?? {}).length}
          help="The period's orders by where their delivery stands now, cancelled ones included.">
          <BaseChart options={delivery} height={280} exportTitle="Orders by delivery status" exportSubtitle={exportSubtitle} />
        </ChartCard>
        <ChartCard title="Top customers" subtitle="By value ordered" loading={loading} refreshing={refreshing} error={query.isError} empty={!d?.top_customers.length} height={280}
          help="The five customers whose orders in the period were charged the most, cancelled orders left out. Their name opens their details; the arrow opens their orders.">
          <ul className="divide-y divide-(--border-color)">
            {(d?.top_customers ?? []).map((c, i) => (
              <li key={c.user_id} className="group flex items-center gap-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--brand-light) text-xs font-bold text-(--brand-ink)">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <PeekLink type="user" id={c.user_id} className="block truncate text-sm">{c.name}</PeekLink>
                  <span className="block text-xs text-(--text-muted)">{c.orders} orders · {ugx(c.balance_due)} owed</span>
                </span>
                <span className="text-sm font-semibold text-(--text-primary)">{ugxShort(c.value)}</span>
                <OpenLink quiet href={`/dashboard/orders${listQuery({ customer: String(c.user_id) }, true)}`} label={`Open ${c.name}'s orders`} />
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}
