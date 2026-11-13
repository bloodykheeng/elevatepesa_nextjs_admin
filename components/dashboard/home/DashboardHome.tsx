"use client";

import { useMemo } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useQuery } from "@tanstack/react-query";
import { SelectButton } from "primereact/selectbutton";
import { Dropdown } from "primereact/dropdown";
import type Highcharts from "highcharts";
import BaseChart from "@/components/common/charts/BaseChart";
import { ChartCard, KpiCard, OpenLink } from "@/components/dashboard/insights/parts";
import PeriodPicker from "@/components/dashboard/insights/PeriodPicker";
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

/**
 * The dashboard: All time by default, so it is never empty for want of a recent order (the old
 * one forced the last 30 days and showed zeros). The period lives in the URL, so a reload or
 * Back keeps it. Every figure opens the list it counts, filtered the same way.
 */
export default function DashboardHome() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  const preset = (params.get("preset") as Preset | null) ?? (from || to ? null : "all");

  const setPeriod = (next: { preset?: Preset; from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (next.preset && next.preset !== "all") q.set("preset", next.preset);
    const range = next.preset ? rangeOf(next.preset) : { from: next.from, to: next.to };
    if (range.from) q.set("from", range.from);
    if (range.to) q.set("to", range.to);
    const qs = q.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const query = useQuery({
    queryKey: ["dashboard", from ?? "", to ?? ""],
    queryFn: () => adminApi.dashboard({ from, to }),
    placeholderData: (previous) => previous,
  });
  const d = query.data;
  const loading = query.isPending;
  const refreshing = query.isPlaceholderData;

  const periodText = from && to ? periodLabel(from, to) : "All time";
  // The lists' own filters, so an arrow opens exactly the rows a figure counts.
  const listQuery = (extra: Record<string, string> = {}) => {
    const q = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}), ...extra });
    const s = q.toString();
    return s ? `?${s}` : "";
  };

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
            onChange={(e) => e.value && setPeriod({ preset: e.value })}
            aria-label="Period"
          />
        </div>
        <div className="min-w-0 flex-1 md:hidden">
          <Dropdown
            value={preset}
            options={preset ? PRESETS : [...PRESETS, { label: "Picked days", value: null as unknown as Preset }]}
            optionLabel="label"
            optionValue="value"
            onChange={(e) => e.value && setPeriod({ preset: e.value })}
            aria-label="Period"
            className="w-full"
          />
        </div>
        <PeriodPicker from={from ?? ""} to={to ?? ""} custom={!preset} onApply={(r) => setPeriod(r)} />
        {/* The days a preset covers ("1 Nov to 14 Nov 2026"); All time needs no second label. */}
        {(from || refreshing) && (
          <span className="flex basis-full items-center gap-2 text-sm text-(--text-secondary) md:basis-auto md:pl-2">
            {from && to && <><i className="pi pi-calendar text-xs text-(--text-muted)" aria-hidden />{periodText}</>}
            {refreshing && <span className="inline-flex items-center gap-1 text-xs font-medium text-(--brand-ink)"><i className="pi pi-spin pi-spinner text-xs" /> Updating</span>}
          </span>
        )}
      </div>

      <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${refreshing ? "opacity-60" : ""}`}>
        <KpiCard label="Orders" icon="pi-shopping-cart" loading={loading} value={d?.orders.count} hint={d ? `${d.orders.cancelled} cancelled` : undefined} href={`/dashboard/orders${listQuery()}`} />
        <KpiCard label="Order value" icon="pi-wallet" loading={loading} value={d?.orders.value} shown={d ? ugx(d.orders.value) : undefined} hint={d ? `${ugx(d.orders.paid)} paid` : undefined} bar={d && d.orders.value ? (d.orders.paid / d.orders.value) * 100 : null} />
        <KpiCard label="Balance due" icon="pi-exclamation-circle" loading={loading} value={d?.orders.balance_due} shown={d ? ugx(d.orders.balance_due) : undefined} hint={d ? `${d.orders.with_balance} orders still owe` : undefined} href={`/dashboard/orders${listQuery({ has_balance: "1" })}`} openLabel="orders with a balance" />
        <KpiCard label="Payments received" icon="pi-money-bill" loading={loading} value={d?.payments.amount} shown={d ? ugx(d.payments.amount) : undefined} hint={d ? `${d.payments.count} payments` : undefined} href={`/dashboard/payments${listQuery()}`} />
        <KpiCard label="Packages" icon="pi-truck" loading={loading} value={d?.packages.count} hint={d ? `${ugx(d.packages.value)} charged` : undefined} href={`/dashboard/packages${listQuery()}`} />
        <KpiCard label="Package balance" icon="pi-clock" loading={loading} value={d?.packages.balance_due} shown={d ? ugx(d.packages.balance_due) : undefined} hint={d ? `${ugx(d.packages.paid)} paid` : undefined} />
        <KpiCard label="New customers" icon="pi-user-plus" loading={loading} value={d?.customers.new} hint={d ? `${d.customers.total.toLocaleString("en-UG")} customers in all` : undefined} href={`/dashboard/users${listQuery({ role: "Customer" })}`} openLabel="the customers" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Orders by month" subtitle="Cancelled orders left out. Months in Kampala time." loading={loading} refreshing={refreshing} error={query.isError} empty={!d?.monthly.length} help="Bars: how many orders were placed. Lines: what they were charged and what has been paid on them.">
          <BaseChart options={monthly} height={300} exportTitle="Orders by month" exportSubtitle={periodText} />
        </ChartCard>
        <ChartCard title="Payments by method" loading={loading} refreshing={refreshing} error={query.isError} empty={!d?.payments.by_method.length} href={`/dashboard/payments${listQuery()}`} openLabel="the payments">
          <BaseChart options={methods} height={300} exportTitle="Payments by method" exportSubtitle={periodText} />
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Top products" subtitle="By value sold" loading={loading} refreshing={refreshing} error={query.isError} empty={!d?.top_products.length} href="/dashboard/products" openLabel="the products">
          <BaseChart options={topProducts} height={280} exportTitle="Top products" exportSubtitle={periodText} />
        </ChartCard>
        <ChartCard title="Orders by delivery" loading={loading} refreshing={refreshing} error={query.isError} empty={!Object.keys(d?.orders.by_delivery ?? {}).length}>
          <BaseChart options={delivery} height={280} exportTitle="Orders by delivery status" exportSubtitle={periodText} />
        </ChartCard>
        <ChartCard title="Top customers" subtitle="By value ordered" loading={loading} refreshing={refreshing} error={query.isError} empty={!d?.top_customers.length} height={280}>
          <ul className="divide-y divide-(--border-color)">
            {(d?.top_customers ?? []).map((c, i) => (
              <li key={c.user_id} className="group flex items-center gap-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--brand-light) text-xs font-bold text-(--brand-ink)">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-(--text-primary)">{c.name}</span>
                  <span className="block text-xs text-(--text-muted)">{c.orders} orders · {ugx(c.balance_due)} owed</span>
                </span>
                <span className="text-sm font-semibold text-(--text-primary)">{ugxShort(c.value)}</span>
                <OpenLink quiet href={`/dashboard/orders${listQuery({ customer: String(c.user_id) })}`} label={`Open ${c.name}'s orders`} />
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}
