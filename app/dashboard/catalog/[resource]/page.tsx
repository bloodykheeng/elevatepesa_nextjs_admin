import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import { CATALOG } from "./catalog";
import CatalogList from "./CatalogList";

/** The twelve simple tables are known up front, so each page is prerendered. */
export function generateStaticParams() {
  return Object.keys(CATALOG).map((resource) => ({ resource }));
}

export async function generateMetadata({ params }: { params: Promise<{ resource: string }> }): Promise<Metadata> {
  const { resource } = await params;
  return { title: CATALOG[resource]?.title ?? "Not found" };
}

/** Reads the URL inside the Suspense boundary, so the page shell (and its skeleton) shows at once. */
async function CatalogResource({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!CATALOG[resource]) notFound();
  return <CatalogList resource={resource} />;
}

export default function CatalogPage({ params }: { params: Promise<{ resource: string }> }) {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <CatalogResource params={params} />
      </Suspense>
    </div>
  );
}
