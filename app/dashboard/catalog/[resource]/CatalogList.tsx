"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { useQuery } from "@tanstack/react-query";
import PrimeReactDataTable, { createAction, deleteSelectedAction, editAction, viewAction } from "@/components/dashboard/tables/PrimeReactDataTable";
import FiltersButton, { filterValuesFrom, type FilterGroup } from "@/components/dashboard/filters/FiltersButton";
import { RecordDetailsDialog, auditColumns, auditExportColumns } from "@/components/dashboard/audit";
import { PageHeader } from "@/components/dashboard/ui";
import RecordForm, { useOptions } from "@/components/dashboard/admin/RecordForm";
import { useAdminList } from "@/components/dashboard/admin/useAdminList";
import { ListSearch, Thumb, choices } from "@/components/dashboard/admin/parts";
import { create, one, update } from "@/services/admin";
import type { ExportColumn } from "@/lib/exportRows";
import { CATALOG, type Row } from "./catalog";

/**
 * One simple table (App\Admin\Catalog): search, filters as chips, sort, View, Edit, New, tick to
 * delete, Export of every page. Its columns and form come from ./catalog.
 */
export default function CatalogList({ resource }: { resource: string }) {
  const def = CATALOG[resource];
  const options = useOptions();
  const list = useAdminList<Row>({ path: resource, filterKeys: def.filters.map((f) => f.key) });
  const [editing, setEditing] = useState<{ row: Row | null } | null>(null);

  const viewing = useQuery({
    queryKey: [resource, "one", list.viewId],
    queryFn: () => one<Row>(resource, list.viewId),
    enabled: !!list.viewId,
  });

  const filterGroups: FilterGroup[] = def.filters.length
    ? [{
        title: def.title,
        fields: def.filters.map((f) => ({
          type: "select" as const,
          key: f.key,
          label: f.label,
          placeholder: `Any ${f.label.toLowerCase()}`,
          options: f.optionsKey
            ? ((options.data?.[f.optionsKey] as unknown as { id: number; name: string }[]) ?? []).map((o) => ({ label: o.name, value: String(o.id) }))
            : choices(f.values ?? []),
        })),
      }]
    : [];

  const nameOf = (r: Row) => String(r[def.nameField] ?? "");
  const columns = [
    {
      field: def.nameField,
      header: def.nameField === "question" ? "Question" : def.nameField === "title" ? "Title" : "Name",
      sortable: def.nameField !== "question",
      body: (r: Row) => (
        <div className="flex items-center gap-3">
          {def.photo && <Thumb src={r.photo_url as string | null} name={nameOf(r)} />}
          <span className="font-medium text-(--text-primary)">{nameOf(r)}</span>
        </div>
      ),
      exportValue: nameOf,
    },
    ...def.columns.map((c) => (c.field === "status" ? c : { ...c, mobile: false })),
    ...auditColumns<Row>(),
  ];

  const exportColumns: ExportColumn<Row>[] = [
    { header: "Name", value: nameOf },
    ...def.columns.map((c) => ({ header: c.header, value: (r: Row) => (c.exportValue ? c.exportValue(r) : (r[c.field] as string | number | null)) ?? "" })),
    ...auditExportColumns<Row>(),
  ];

  const shown = viewing.data ?? null;

  return (
    <div className="space-y-5">
      <PageHeader title={def.title} subtitle={def.subtitle} />
      <PrimeReactDataTable<Row>
        data={list.rows}
        columns={columns}
        {...list.table}
        emptyMessage={list.search || def.filters.some((f) => list.getParam(f.key)) ? "Nothing matches. Clear the search or filters." : `No ${def.title.toLowerCase()} yet.`}
        fileName={`Elevate Pesa ${def.title.toLowerCase()}`}
        exportAll={{ fetchPage: list.fetchPage, columns: exportColumns }}
        headerContent={
          <div className="flex flex-wrap items-center gap-2">
            <ListSearch value={list.search} onSearch={(v) => list.setFilters({ search: v })} placeholder={def.searchPlaceholder} />
            {filterGroups.length > 0 && <FiltersButton groups={filterGroups} values={filterValuesFrom(filterGroups, list.getParam)} onApply={list.setFilters} />}
          </div>
        }
        rowActions={[
          viewAction<Row>((r) => list.openView(r.id)),
          ...(def.readonly ? [] : [editAction<Row>((r) => setEditing({ row: r }))]),
        ]}
        selection={{ selected: list.selected, onChange: list.setSelected }}
        toolbarActions={[
          deleteSelectedAction<Row>(() => list.confirmDelete(def.singular, def.deleteNote)),
          ...(def.readonly ? [] : [createAction<Row>(() => setEditing({ row: null }))]),
        ]}
      />

      {!def.readonly && (
        <RecordForm<Row>
          visible={!!editing}
          onHide={() => setEditing(null)}
          record={editing?.row ?? null}
          title={def.singular}
          sections={def.sections}
          photo={def.photo}
          save={(body, id) => (id ? update<Row>(resource, id, body) : create<Row>(resource, body))}
          invalidate={[resource]}
          what={`this ${def.singular}`}
        />
      )}

      <RecordDetailsDialog
        header={shown ? nameOf(shown) : def.singular}
        visible={!!list.viewId}
        onHide={list.closeView}
        record={shown}
        loading={viewing.isPending}
        error={viewing.isError ? "This could not be loaded. It may have been deleted." : undefined}
        fields={shown ? def.view(shown) : []}
        links={shown && def.photo && shown.photo_url ? <Thumb src={shown.photo_url} name={nameOf(shown)} size="h-40 w-40" /> : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button label="Close" text onClick={list.closeView} />
            {!def.readonly && shown && <Button label="Edit" icon="pi pi-pencil" outlined onClick={() => { setEditing({ row: shown }); list.closeView(); }} />}
          </div>
        }
      />
    </div>
  );
}
