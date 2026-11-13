import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/dashboard/RecordSkeleton";
import PackagesList from "./PackagesList";

export const metadata: Metadata = { title: "Packages" };

export default function PackagesPage() {
  return (
    <div className="p-4 sm:p-6">
      <Suspense fallback={<ListPageSkeleton padded={false} />}>
        <PackagesList />
      </Suspense>
    </div>
  );
}
